import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { computeAvailability } from '@/lib/availability';
import { canTransitionDeviceStatus, canTransitionDeviceCondition } from '@/lib/state-machines/device';
import { UpdateDeviceSchema } from '@/lib/validators/device';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'VIEW_DEVICE_DETAIL')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;

    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        currentCustodian: {
          select: { id: true, fullName: true, email: true, department: true, contact: true },
        },
        loanItems: {
          orderBy: { loanRequest: { startDate: 'desc' } },
          include: {
            loanRequest: {
              include: {
                requester: { select: { id: true, fullName: true, email: true } },
                approver: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        incidents: {
          orderBy: { reportDate: 'desc' },
          include: {
            reporter: { select: { id: true, fullName: true, email: true } },
            verifiedBy: { select: { id: true, fullName: true } },
          },
        },
        maintenances: {
          orderBy: { startDate: 'desc' },
          include: {
            technician: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    // Fetch related Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'Device', targetId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        actor: { select: { id: true, fullName: true, email: true, baseRole: true } },
      },
    });

    const activeLoans = device.loanItems.filter((i) =>
      ['APPROVED', 'ACTIVE'].includes(i.itemStatus)
    );

    const isAvailableForLoan = computeAvailability({
      status: device.status,
      condition: device.condition,
      activeLoanItemCount: activeLoans.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...device,
        isAvailableForLoan,
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching device detail:', error);
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
    if (!user || (!hasPermission(user, 'CRUD_DEVICE') && !hasPermission(user, 'CHANGE_DEVICE_STATUS_CONDITION'))) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = UpdateDeviceSchema.safeParse(body);

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

    // Validate State Machine for Status Transition (PRD §3.1)
    if (data.status && data.status !== existing.status) {
      if (!canTransitionDeviceStatus(existing.status, data.status)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_STATUS_TRANSITION',
              message: `Cannot transition device status from '${existing.status}' to '${data.status}' according to system rules.`,
            },
          },
          { status: 422 }
        );
      }
    }

    // Check unique assetTag if updated
    if (data.assetTag && data.assetTag !== existing.assetTag) {
      const duplicateTag = await prisma.device.findUnique({ where: { assetTag: data.assetTag } });
      if (duplicateTag) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'DUPLICATE_ASSET_TAG', message: `Asset Tag '${data.assetTag}' is already taken` },
          },
          { status: 409 }
        );
      }
    }

    const updateData: any = { ...data };
    if (data.acquisitionDate) updateData.acquisitionDate = new Date(data.acquisitionDate);

    // If status is changed away from BORROWED, clear custodian
    if (data.status && data.status !== 'BORROWED' && existing.status === 'BORROWED') {
      updateData.currentCustodianUserId = null;
    }

    const updated = await prisma.device.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        location: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: data.status && data.status !== existing.status ? 'DEVICE_STATUS_CHANGED' : 'DEVICE_UPDATED',
      targetType: 'Device',
      targetId: id,
      previousValue: {
        status: existing.status,
        condition: existing.condition,
        locationId: existing.locationId,
        brand: existing.brand,
        model: existing.model,
      },
      newValue: {
        status: updated.status,
        condition: updated.condition,
        locationId: updated.locationId,
        brand: updated.brand,
        model: updated.model,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_DEVICE')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            loanItems: true,
            incidents: true,
            maintenances: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    // Business Rule BR-015 & BR-013: Preserve historical dependencies
    const hasHistory =
      device._count.loanItems > 0 ||
      device._count.incidents > 0 ||
      device._count.maintenances > 0;

    if (hasHistory) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_HISTORICAL_RECORD',
            message: `Cannot permanently delete device '${device.assetTag}' because it has active/historical loan, incident, or maintenance records. Please change its status to 'RETIRED' or 'DISPOSED' instead.`,
            historyCounts: device._count,
          },
        },
        { status: 409 }
      );
    }

    await prisma.device.delete({ where: { id } });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'DEVICE_DELETED',
      targetType: 'Device',
      targetId: id,
      previousValue: device,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Device '${device.assetTag}' deleted successfully` },
    });
  } catch (error: any) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
