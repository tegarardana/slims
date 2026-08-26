import { NextRequest, NextResponse } from 'next/server';
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

      // 2. Update all referenced devices: status -> BORROWED, currentCustodianUserId -> loan.requesterId
      for (const item of loan.items) {
        await tx.device.update({
          where: { id: item.deviceId },
          data: {
            status: 'BORROWED',
            currentCustodianUserId: loan.requesterId,
          },
        });
      }

      // 3. Update loan request status -> ACTIVE
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
    console.error('Error during equipment handover:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
