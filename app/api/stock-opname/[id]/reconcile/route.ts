import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ReconcileRecordSchema } from '@/lib/validators/stock-opname';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || user.baseRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Only Administrators can reconcile audit discrepancies (BR-020)' } },
        { status: 403 }
      );
    }

    const { id: sessionId } = await params;
    const body = await request.json();
    const validated = ReconcileRecordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid reconciliation parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { recordIds } = validated.data;

    const records = await prisma.stockOpnameRecord.findMany({
      where: { id: { in: recordIds }, sessionId },
      include: { device: true },
    });

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching records found to reconcile' } },
        { status: 404 }
      );
    }

    // Process reconciliation in transaction (BR-020)
    let reconciledCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const rec of records) {
        if (rec.reconciled) continue;

        // Apply physical findings to Core Inventory Device
        if (rec.verificationResult === 'WRONG_LOCATION' && rec.physicalLocationId) {
          await tx.device.update({
            where: { id: rec.deviceId },
            data: { locationId: rec.physicalLocationId },
          });
        } else if (rec.verificationResult === 'DAMAGED') {
          await tx.device.update({
            where: { id: rec.deviceId },
            data: {
              condition: rec.physicalCondition || 'DAMAGED',
              status: 'UNDER_MAINTENANCE',
            },
          });
        } else if (rec.verificationResult === 'MISSING') {
          await tx.device.update({
            where: { id: rec.deviceId },
            data: { status: 'LOST' },
          });
        }

        // Mark record as reconciled
        await tx.stockOpnameRecord.update({
          where: { id: rec.id },
          data: {
            reconciled: true,
            reconciledById: user.id,
            reconciledAt: new Date(),
          },
        });

        reconciledCount++;
      }
    });

    await createAuditLog({
      actorId: user.id,
      action: 'STOCK_OPNAME_RECONCILED',
      targetType: 'StockOpnameSession',
      targetId: sessionId,
      context: {
        reconciledCount,
        reconciledRecordIds: recordIds,
      },
    });

    return NextResponse.json({
      success: true,
      data: { reconciledCount },
      message: `Successfully reconciled ${reconciledCount} audit discrepancy record(s) into core inventory database.`,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
