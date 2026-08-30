import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionIncidentStatus } from '@/lib/state-machines/incident';
import { ResolveIncidentSchema } from '@/lib/validators/incident';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'VERIFY_INCIDENT') && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Technician or Admin to resolve incidents' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { device: true },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Incident not found' } },
        { status: 404 }
      );
    }

    if (!canTransitionIncidentStatus(incident.status, 'RESOLVED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot resolve incident with status '${incident.status}'`,
          },
        },
        { status: 422 }
      );
    }

    const body = await request.json();
    const validated = ResolveIncidentSchema.safeParse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const inc = await tx.incident.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          notes: validated.data?.notes
            ? `${incident.notes ? incident.notes + '\n' : ''}Resolution Note: ${validated.data.notes}`
            : incident.notes,
        },
        include: {
          device: true,
          reporter: { select: { fullName: true, email: true } },
          verifiedBy: { select: { fullName: true } },
        },
      });

      // BR-012: If device was UNDER_MAINTENANCE and no other open incidents exist, reset to AVAILABLE if condition is acceptable
      if (incident.device.status === 'UNDER_MAINTENANCE') {
        const otherOpenIncidents = await tx.incident.count({
          where: {
            deviceId: incident.deviceId,
            id: { not: id },
            status: { not: 'RESOLVED' },
          },
        });

        if (otherOpenIncidents === 0) {
          await tx.device.update({
            where: { id: incident.deviceId },
            data: { status: 'AVAILABLE' },
          });
        }
      }

      return inc;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'INCIDENT_RESOLVED',
      targetType: 'Incident',
      targetId: id,
      newValue: { status: 'RESOLVED' },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Incident marked as resolved',
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
