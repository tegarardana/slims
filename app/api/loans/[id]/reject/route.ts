import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { canTransitionLoanRequestStatus } from '@/lib/state-machines/loan';
import { RejectLoanSchema } from '@/lib/validators/loan';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'APPROVE_REJECT_LOAN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Cannot reject loans' } },
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

    if (!canTransitionLoanRequestStatus(loan.status, 'REJECTED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot reject loan with status '${loan.status}'`,
          },
        },
        { status: 422 }
      );
    }

    const body = await request.json();
    const validated = RejectLoanSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rejection reason is required',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.loanItem.updateMany({
        where: { loanRequestId: id },
        data: { itemStatus: 'REJECTED' },
      });

      const res = await tx.loanRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: user.id,
          rejectionReason: validated.data.rejectionReason,
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
      action: 'LOAN_REJECTED',
      targetType: 'LoanRequest',
      targetId: id,
      previousValue: { status: loan.status },
      newValue: { status: 'REJECTED', reason: validated.data.rejectionReason },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}
