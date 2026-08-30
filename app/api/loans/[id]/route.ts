import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isLoanOverdue } from '@/lib/state-machines/loan';

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

    const loan = await prisma.loanRequest.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, baseRole: true, department: true, contact: true },
        },
        approver: {
          select: { id: true, fullName: true, email: true },
        },
        items: {
          include: {
            device: {
              include: {
                category: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Loan request not found' } },
        { status: 404 }
      );
    }

    // Authorization check (non-admin can only view their own loan)
    if (user.baseRole !== 'ADMIN' && loan.requesterId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Fetch related Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'LoanRequest', targetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, baseRole: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...loan,
        isOverdue: isLoanOverdue(loan.expectedReturnDate, loan.status),
        auditLogs,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
