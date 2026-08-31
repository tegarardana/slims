import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionLoanRequestStatus } from '@/lib/state-machines/loan';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'APPROVE_REJECT_LOAN') && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Admin or Technician to handover equipment' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const loan = await prisma.loanRequest.findUnique({
      where: { id },
      include: { items: { include: { device: true } }, requester: true },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Loan request not found' } },
        { status: 404 }
      );
    }

    if (!canTransitionLoanRequestStatus(loan.status, 'ACTIVE')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot handover equipment for loan with status '${loan.status}'. Must be APPROVED first.`,
          },
        },
        { status: 422 }
      );
    }

    // Handover in transaction (BR-006)
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update loan items to ACTIVE
      await tx.loanItem.updateMany({
        where: { loanRequestId: id },
        data: { itemStatus: 'ACTIVE' },
      });

      // 2. Fix #4: Re-validate device availability inside transaction to prevent race conditions.
      // Two overlapping approved loans could cause a conflict at handover time — the second
      // handover should fail with DEVICE_CONFLICT, not silently overwrite the first.
      for (const item of loan.items) {
        const deviceCheck = await tx.device.findUnique({
          where: { id: item.deviceId },
          select: { id: true, status: true, assetTag: true },
        });

        if (!deviceCheck || deviceCheck.status !== 'AVAILABLE') {
          throw new Error(`DEVICE_CONFLICT:${deviceCheck?.assetTag ?? item.deviceId}`);
        }
      }

      // 3. Update all referenced devices: status -> BORROWED, currentCustodianUserId -> loan.requesterId
      for (const item of loan.items) {
        await tx.device.update({
          where: { id: item.deviceId },
          data: {
            status: 'BORROWED',
            currentCustodianUserId: loan.requesterId,
          },
        });
      }

      // 4. Update loan request status -> ACTIVE
      const res = await tx.loanRequest.update({
        where: { id },
        data: { status: 'ACTIVE' },
        include: {
          items: { include: { device: true } },
          requester: { select: { fullName: true, email: true } },
        },
      });

      return res;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'LOAN_HANDOVER_COMPLETED',
      targetType: 'LoanRequest',
      targetId: id,
      context: {
        borrower: loan.requester.fullName,
        deviceTags: loan.items.map((i) => i.device.assetTag),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Equipment successfully handed over to ${loan.requester.fullName}`,
    });
  } catch (error: any) {
    // Fix #4: Handle the device conflict error thrown from inside the transaction
    if (error?.message?.startsWith('DEVICE_CONFLICT:')) {
      const assetTag = error.message.split('DEVICE_CONFLICT:')[1];
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DEVICE_NOT_AVAILABLE',
            message: `Device '${assetTag}' is no longer available for handover. It may have already been handed over in another loan.`,
          },
        },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
