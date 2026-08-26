import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ScanRecordSchema } from '@/lib/validators/stock-opname';
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Verifier or Admin to scan records' } },
        { status: 403 }
      );
    }

    const { id: sessionId } = await params;
    const body = await request.json();
    const validated = ScanRecordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid scan parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { recordId, scannedTagOrQr, verificationResult, physicalLocationId, physicalCondition } = validated.data;

    let targetRecordId = recordId;

    // If recordId is not supplied directly, find it by scanned tag or QR payload (BR-019)
    if (!targetRecordId && scannedTagOrQr) {
      const trimmed = scannedTagOrQr.trim();
      const matchedDevice = await prisma.device.findFirst({
        where: {
          OR: [
            { assetTag: { equals: trimmed, mode: 'insensitive' } },
            { qrCodeValue: { equals: trimmed, mode: 'insensitive' } },
            { serialNumber: { equals: trimmed, mode: 'insensitive' } },
          ],
        },
        select: { id: true, assetTag: true },
      });

      if (!matchedDevice) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: `No equipment matches tag/QR '${trimmed}'`,
            },
          },
          { status: 404 }
        );
      }

      const rec = await prisma.stockOpnameRecord.findFirst({
        where: { sessionId, deviceId: matchedDevice.id },
      });

      if (!rec) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'OUT_OF_SCOPE',
              message: `Device ${matchedDevice.assetTag} was found, but is not part of this session's scope.`,
            },
          },
          { status: 400 }
        );
      }

      targetRecordId = rec.id;
    }

    if (!targetRecordId) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_PARAM', message: 'recordId or scannedTagOrQr is required' } },
        { status: 400 }
      );
    }

    // Update the record and advance session to IN_PROGRESS if currently OPEN
    const updatedRecord = await prisma.$transaction(async (tx) => {
      const rec = await tx.stockOpnameRecord.update({
        where: { id: targetRecordId },
        data: {
          verificationResult,
          physicalLocationId: physicalLocationId || null,
          physicalCondition: physicalCondition || null,
        },
        include: {
          device: true,
          physicalLocation: true,
        },
      });

      await tx.stockOpnameSession.update({
        where: { id: sessionId },
        data: { status: 'IN_PROGRESS' },
      });

      return rec;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'STOCK_OPNAME_SCANNED',
      targetType: 'StockOpnameSession',
      targetId: sessionId,
      context: {
        deviceTag: updatedRecord.device.assetTag,
        result: verificationResult,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: `Device ${updatedRecord.device.assetTag} marked as ${verificationResult}`,
    });
  } catch (error: any) {
    console.error('Error recording stock opname scan:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
