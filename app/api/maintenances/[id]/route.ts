import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionMaintenanceStatus } from '@/lib/state-machines/maintenance';
import { UpdateMaintenanceSchema } from '@/lib/validators/maintenance';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        device: {
          include: {
            category: true,
            location: true,
          },
        },
        technician: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        relatedIncident: {
          include: {
            reporter: { select: { fullName: true } },
          },
        },
      },
    });

    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Maintenance record not found' } },
        { status: 404 }
      );
    }

    // Fetch related Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'Maintenance', targetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, baseRole: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...maintenance,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching maintenance record:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'MANAGE_MAINTENANCE') && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const maintenance = await prisma.maintenance.findUnique({ where: { id } });

    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Maintenance record not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = UpdateMaintenanceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Check status transition if provided
    if (data.status && !canTransitionMaintenanceStatus(maintenance.status, data.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition maintenance from '${maintenance.status}' to '${data.status}'`,
          },
        },
        { status: 422 }
      );
    }

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.technicianId) updateData.technicianId = data.technicianId;
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;
    if (data.actionTaken !== undefined) updateData.actionTaken = data.actionTaken;
    if (data.partsReplaced !== undefined) updateData.partsReplaced = data.partsReplaced;
    if (data.cost !== undefined) updateData.cost = data.cost;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.result !== undefined) updateData.result = data.result;

    const updated = await prisma.maintenance.update({
      where: { id },
      data: updateData,
      include: {
        device: true,
        technician: { select: { fullName: true } },
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: 'MAINTENANCE_UPDATED',
      targetType: 'Maintenance',
      targetId: id,
      newValue: data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating maintenance job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
