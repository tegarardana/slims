import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
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

    const maintenances = await prisma.maintenance.findMany({
      include: {
        device: { select: { assetTag: true, brand: true, model: true } },
        technician: { select: { fullName: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const totalJobs = maintenances.length;
    const completedJobs = maintenances.filter((m) => m.status === 'COMPLETED').length;
    const inProgressJobs = maintenances.filter((m) => m.status === 'IN_PROGRESS' || m.status === 'WAITING_PARTS').length;

    const totalCost = maintenances.reduce(
      (sum, m) => sum + (m.cost ? Number(m.cost) : 0),
      0
    );

    const byType = {
      CORRECTIVE: maintenances.filter((m) => m.maintenanceType === 'CORRECTIVE').length,
      PREVENTIVE: maintenances.filter((m) => m.maintenanceType === 'PREVENTIVE').length,
      CALIBRATION: maintenances.filter((m) => m.maintenanceType === 'CALIBRATION').length,
      UPGRADE: maintenances.filter((m) => m.maintenanceType === 'UPGRADE').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          completedJobs,
          inProgressJobs,
          totalCost,
          byType,
        },
        jobs: maintenances.map((m) => ({
          id: m.id,
          deviceTag: m.device.assetTag,
          equipment: `${m.device.brand} ${m.device.model}`,
          maintenanceType: m.maintenanceType,
          problem: m.problem,
          actionTaken: m.actionTaken || '—',
          partsReplaced: m.partsReplaced || '—',
          cost: m.cost ? Number(m.cost) : 0,
          technician: m.technician.fullName,
          startDate: m.startDate,
          status: m.status,
        })),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
