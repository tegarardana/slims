import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionIncidentStatus } from '@/lib/state-machines/incident';
import { VerifyIncidentSchema } from '@/lib/validators/incident';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'VERIFY_INCIDENT')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Technician or Admin to verify incidents' } },
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

    if (!canTransitionIncidentStatus(incident.status, 'VERIFIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot verify incident with status '${incident.status}'`,
          },
        },
        { status: 422 }
      );
    }

    const body = await request.json();
    const validated = VerifyIncidentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid verification parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { verificationOutcome, notes } = validated.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update incident
      const updatedIncident = await tx.incident.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          verificationOutcome,
          verifiedById: user.id,
          verifiedAt: new Date(),
          notes: notes ? `${incident.notes ? incident.notes + '\n' : ''}Verification Note: ${notes}` : incident.notes,
        },
        include: {
          device: true,
          reporter: { select: { fullName: true, email: true } },
          verifiedBy: { select: { fullName: true } },
        },
      });

      // 2. Business Rule BR-011: If maintenance is required, route device status to UNDER_MAINTENANCE
      if (
        verificationOutcome === 'MAINTENANCE_REQUIRED' ||
        verificationOutcome === 'REPLACEMENT_REQUIRED'
      ) {
        await tx.device.update({
          where: { id: incident.deviceId },
          data: {
            status: 'UNDER_MAINTENANCE',
            condition: verificationOutcome === 'REPLACEMENT_REQUIRED' ? 'CRITICAL' : 'DAMAGED',
          },
        });
      }

      return updatedIncident;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'INCIDENT_VERIFIED',
      targetType: 'Incident',
      targetId: id,
      newValue: {
        outcome: verificationOutcome,
        verifiedBy: user.name,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Incident verified with outcome: ${verificationOutcome.replace('_', ' ')}`,
    });
  } catch (error: any) {
    console.error('Error verifying incident:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
