import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateLocationSchema } from '@/lib/validators/master-data';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'VIEW_INVENTORY')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status && ['ACTIVE', 'ARCHIVED'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        parentLocation: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            devices: true,
            childLocations: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: locations.map((l) => ({
        id: l.id,
        name: l.name,
        parentLocationId: l.parentLocationId,
        parentLocation: l.parentLocation,
        status: l.status,
        deviceCount: l._count.devices,
        childLocationCount: l._count.childLocations,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching locations:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_CATEGORY_LOCATION')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateLocationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid location data',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name, parentLocationId } = validated.data;

    // Check unique location name
    const existing = await prisma.location.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_LOCATION',
            message: `A location named '${name}' already exists`,
          },
        },
        { status: 409 }
      );
    }

    // Verify parentLocationId if provided
    if (parentLocationId) {
      const parent = await prisma.location.findUnique({ where: { id: parentLocationId } });
      if (!parent) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Parent location not found' },
          },
          { status: 404 }
        );
      }
    }

    const newLocation = await prisma.location.create({
      data: {
        name,
        parentLocationId: parentLocationId || null,
      },
      include: {
        parentLocation: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'LOCATION_CREATED',
      targetType: 'Location',
      targetId: newLocation.id,
      newValue: newLocation,
    });

    return NextResponse.json({ success: true, data: newLocation }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating location:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
