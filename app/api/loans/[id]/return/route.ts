import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ReturnLoanItemSchema } from '@/lib/validators/loan';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (user.baseRole !== 'ADMIN' && !user.isTechnician)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Admin or Technician to process equipment return' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = ReturnLoanItemSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid return parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { loanItemId, returnCondition, returnNotes } = validated.data;

    const loan = await prisma.loanRequest.findUnique({
      where: { id },
      include: {
        items: { include: { device: true } },
        requester: true,
      },
    });

    if (!loan) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Loan request not found' } },
        { status: 404 }
      );
    }

    const targetItem = loan.items.find((i) => i.id === loanItemId);
    if (!targetItem) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Item not found in this loan' } },
        { status: 404 }
      );
    }

    if (targetItem.itemStatus === 'RETURNED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_RETURNED', message: 'This item has already been marked as returned' } },
        { status: 400 }
      );
    }

    // Process return in transaction (BR-007, BR-008)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update loan item
      const updatedItem = await tx.loanItem.update({
        where: { id: loanItemId },
        data: {
          itemStatus: 'RETURNED',
          returnedAt: new Date(),
          returnCondition,
          returnNotes: returnNotes || null,
        },
      });

      // 2. Update device status & condition
      const isDamaged = returnCondition === 'DAMAGED' || returnCondition === 'CRITICAL';
      const newDeviceStatus = isDamaged ? 'UNDER_MAINTENANCE' : 'AVAILABLE';

      await tx.device.update({
        where: { id: targetItem.deviceId },
        data: {
          status: newDeviceStatus,
          condition: returnCondition,
          currentCustodianUserId: null, // clear borrower custodian (BR-007)
        },
      });

      // 3. Check remaining items in loan to determine LoanRequest status (BR-008)
      const allItems = await tx.loanItem.findMany({
        where: { loanRequestId: id },
      });

      const unreturnedItems = allItems.filter((i) => i.itemStatus !== 'RETURNED');
      const newLoanStatus = unreturnedItems.length === 0 ? 'RETURNED' : 'PARTIALLY_RETURNED';

      const updatedLoan = await tx.loanRequest.update({
        where: { id },
        data: { status: newLoanStatus },
        include: {
          items: { include: { device: true } },
          requester: { select: { fullName: true, email: true } },
        },
      });

      return { updatedLoan, updatedItem, newDeviceStatus };
    });

    await createAuditLog({
      actorId: user.id,
      action: 'LOAN_ITEM_RETURNED',
      targetType: 'LoanRequest',
      targetId: id,
      context: {
        deviceTag: targetItem.device.assetTag,
        returnCondition,
        newLoanStatus: result.updatedLoan.status,
        deviceStatusSetTo: result.newDeviceStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.updatedLoan,
      message: `Device ${targetItem.device.assetTag} successfully returned in ${returnCondition} condition.`,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
