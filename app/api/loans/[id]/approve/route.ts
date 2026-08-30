import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionLoanRequestStatus } from '@/lib/state-machines/loan';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'APPROVE_REJECT_LOAN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Cannot approve loans' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const loan = await prisma.loanRequest.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Loan request not found' } },
        { status: 404 }
      );
    }

    if (!canTransitionLoanRequestStatus(loan.status, 'APPROVED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot approve loan with status '${loan.status}'`,
          },
        },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.loanItem.updateMany({
        where: { loanRequestId: id },
        data: { itemStatus: 'APPROVED' },
      });

      const res = await tx.loanRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: user.id,
          approvedAt: new Date(),
        },
        include: {
          requester: { select: { fullName: true, email: true } },
          approver: { select: { fullName: true } },
        },
      });

      return res;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'LOAN_APPROVED',
      targetType: 'LoanRequest',
      targetId: id,
      previousValue: { status: loan.status },
      newValue: { status: 'APPROVED', approverId: user.id },
    });

    // Notify borrower (Phase 10)
    await createNotification({
      userId: loan.requesterId,
      type: 'LOAN_STATUS',
      title: 'Loan Request Approved',
      message: `Your equipment loan request for "${loan.purpose}" has been approved. Please proceed to the lab for handover.`,
      link: `/loans/${loan.id}`,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}
