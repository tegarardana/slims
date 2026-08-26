import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'VIEW_REPORTS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Cannot view reports' } },
        { status: 403 }
      );
    }

    const [devices, categories, locations] = await Promise.all([
      prisma.device.findMany({
        include: {
          category: { select: { name: true } },
          location: { select: { name: true } },
        },
      }),
      prisma.category.findMany({
        include: { _count: { select: { devices: true } } },
      }),
      prisma.location.findMany({
        include: { _count: { select: { devices: true } } },
      }),
    ]);

    const totalDevices = devices.length;
    const totalValuation = devices.reduce(
      (sum, d) => sum + (d.purchasePrice ? Number(d.purchasePrice) : 0),
      0
    );

    const byStatus = {
      AVAILABLE: devices.filter((d) => d.status === 'AVAILABLE').length,
      BORROWED: devices.filter((d) => d.status === 'BORROWED').length,
      UNDER_MAINTENANCE: devices.filter((d) => d.status === 'UNDER_MAINTENANCE').length,
      LOST: devices.filter((d) => d.status === 'LOST').length,
      RETIRED: devices.filter((d) => d.status === 'RETIRED').length,
      DISPOSED: devices.filter((d) => d.status === 'DISPOSED').length,
    };

    const byCondition = {
      EXCELLENT: devices.filter((d) => d.condition === 'EXCELLENT').length,
      GOOD: devices.filter((d) => d.condition === 'GOOD').length,
      FAIR: devices.filter((d) => d.condition === 'FAIR').length,
      DAMAGED: devices.filter((d) => d.condition === 'DAMAGED').length,
      CRITICAL: devices.filter((d) => d.condition === 'CRITICAL').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDevices,
          totalValuation,
          byStatus,
          byCondition,
        },
        categoryBreakdown: categories.map((c) => ({
          id: c.id,
          name: c.name,
          deviceCount: c._count.devices,
        })),
        locationBreakdown: locations.map((l) => ({
          id: l.id,
          name: l.name,
          deviceCount: l._count.devices,
        })),
        devices: devices.map((d) => ({
          assetTag: d.assetTag,
          brand: d.brand,
          model: d.model,
          category: d.category.name,
          location: d.location.name,
          status: d.status,
          condition: d.condition,
          purchasePrice: d.purchasePrice ? Number(d.purchasePrice) : 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error generating inventory report:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
