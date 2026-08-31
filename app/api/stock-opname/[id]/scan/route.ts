import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ScanRecordSchema } from '@/lib/validators/stock-opname';
import { createAuditLog } from '@/lib/audit';

export async function POST(
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

    const { id: sessionId } = await params;

    // Fix #3: Fetch session first to get assignedVerifierId for proper authorization check
    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id: sessionId },
      select: { id: true, assignedVerifierId: true, status: true },
    });

    if (!opnameSession) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Stock opname session not found' } },
        { status: 404 }
      );
    }

    // Fix #3: Only Admin or the specifically assigned verifier may scan (not any technician)
    if (!hasPermission(user, 'VERIFY_STOCK_OPNAME', { assignedVerifierId: opnameSession.assignedVerifierId })) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You are not the assigned verifier for this session' } },
        { status: 403 }
      );
    }

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

    // Fix #2: Validate that the recordId belongs to this session before updating.
    // Prevents a user from updating records of a different session by supplying a foreign recordId.
    const verifiedRecord = await prisma.stockOpnameRecord.findFirst({
      where: { id: targetRecordId, sessionId },
    });

    if (!verifiedRecord) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Record not found in this session' } },
        { status: 404 }
      );
    }

    // Update the record and advance session to IN_PROGRESS if currently OPEN
    const updatedRecord = await prisma.$transaction(async (tx) => {
      const rec = await tx.stockOpnameRecord.update({
        where: { id: verifiedRecord.id },
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
    return handleApiError(error);
  }
}
