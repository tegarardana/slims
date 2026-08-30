import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateMaintenanceSchema } from '@/lib/validators/maintenance';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const deviceId = searchParams.get('deviceId');
    const technicianId = searchParams.get('technicianId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};

    if (status && ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    if (type && ['CORRECTIVE', 'PREVENTIVE', 'CALIBRATION', 'UPGRADE'].includes(type)) {
      where.maintenanceType = type;
    }

    if (deviceId) where.deviceId = deviceId;
    if (technicianId) where.technicianId = technicianId;

    if (search) {
      where.OR = [
        { problem: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } },
        { actionTaken: { contains: search, mode: 'insensitive' } },
        { device: { assetTag: { contains: search, mode: 'insensitive' } } },
        { device: { brand: { contains: search, mode: 'insensitive' } } },
        { device: { model: { contains: search, mode: 'insensitive' } } },
        { technician: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [total, maintenances] = await Promise.all([
      prisma.maintenance.count({ where }),
      prisma.maintenance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: 'desc' },
        include: {
          device: {
            select: { id: true, assetTag: true, brand: true, model: true, category: true, location: true },
          },
          technician: { select: { id: true, fullName: true, email: true } },
          relatedIncident: { select: { id: true, description: true, severity: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: maintenances,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'MANAGE_MAINTENANCE') && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Admin or Technician to create maintenance jobs' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateMaintenanceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid maintenance parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const startDate = new Date(data.startDate);

    const device = await prisma.device.findUnique({ where: { id: data.deviceId } });
    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    // Create maintenance job and update device status in transaction (BR-013)
    const result = await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenance.create({
        data: {
          deviceId: data.deviceId,
          technicianId: data.technicianId || user.id,
          maintenanceType: data.maintenanceType,
          problem: data.problem,
          startDate,
          relatedIncidentId: data.relatedIncidentId || null,
          notes: data.notes || null,
          cost: data.cost || null,
          status: data.status,
        },
        include: {
          device: true,
          technician: { select: { fullName: true } },
        },
      });

      // Update device status to UNDER_MAINTENANCE if starting or scheduled (BR-013)
      await tx.device.update({
        where: { id: data.deviceId },
        data: { status: 'UNDER_MAINTENANCE' },
      });

      // If linked to an incident, advance incident status to IN_PROGRESS
      if (data.relatedIncidentId) {
        await tx.incident.update({
          where: { id: data.relatedIncidentId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return maintenance;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'MAINTENANCE_CREATED',
      targetType: 'Maintenance',
      targetId: result.id,
      newValue: {
        deviceTag: result.device.assetTag,
        type: result.maintenanceType,
        problem: result.problem,
      },
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
