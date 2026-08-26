import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CompleteMaintenanceSchema } from '@/lib/validators/maintenance';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'MANAGE_MAINTENANCE') && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Admin or Technician to complete maintenance' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { device: true, relatedIncident: true },
    });

    if (!maintenance) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Maintenance record not found' } },
        { status: 404 }
      );
    }

    if (maintenance.status === 'COMPLETED' || maintenance.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_FINISHED', message: `Maintenance is already ${maintenance.status}` } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = CompleteMaintenanceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid completion details',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const isRepaired = data.deviceNewCondition !== 'DAMAGED' && data.deviceNewCondition !== 'CRITICAL';
    const newDeviceStatus = isRepaired ? 'AVAILABLE' : 'UNDER_MAINTENANCE';

    // Complete maintenance, restore device, and auto-resolve incident in transaction (BR-014)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Complete maintenance job
      const completedJob = await tx.maintenance.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completionDate: new Date(),
          diagnosis: data.diagnosis || maintenance.diagnosis,
          actionTaken: data.actionTaken,
          partsReplaced: data.partsReplaced || maintenance.partsReplaced,
          cost: data.cost ?? maintenance.cost,
          result: data.result || 'REPAIRED_SUCCESSFULLY',
          notes: data.notes || maintenance.notes,
        },
        include: {
          device: true,
          technician: { select: { fullName: true } },
        },
      });

      // 2. Restore device status and update condition grade
      await tx.device.update({
        where: { id: maintenance.deviceId },
        data: {
          status: newDeviceStatus,
          condition: data.deviceNewCondition,
        },
      });

      // 3. Auto-resolve linked incident if exists (BR-014)
      if (maintenance.relatedIncidentId) {
        await tx.incident.update({
          where: { id: maintenance.relatedIncidentId },
          data: {
            status: 'RESOLVED',
            notes: `Resolved via Maintenance Job #${maintenance.id.slice(-6).toUpperCase()}: ${data.actionTaken}`,
          },
        });
      }

      return completedJob;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'MAINTENANCE_COMPLETED',
      targetType: 'Maintenance',
      targetId: id,
      newValue: {
        deviceTag: result.device.assetTag,
        actionTaken: data.actionTaken,
        deviceCondition: data.deviceNewCondition,
        deviceStatusSetTo: newDeviceStatus,
        autoResolvedIncident: maintenance.relatedIncidentId || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Maintenance completed. Device ${result.device.assetTag} is now ${newDeviceStatus} (${data.deviceNewCondition}).`,
    });
  } catch (error: any) {
    console.error('Error completing maintenance job:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
