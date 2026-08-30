import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeAvailability } from '@/lib/availability';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const qr = searchParams.get('qr');
    const assetTag = searchParams.get('assetTag');

    if (!qr && !assetTag) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter "qr" or "assetTag" is required' } },
        { status: 400 }
      );
    }

    const where: any = {};
    if (qr) where.qrCodeValue = qr;
    if (assetTag) where.assetTag = assetTag;

    const device = await prisma.device.findFirst({
      where,
      include: {
        category: true,
        location: true,
        currentCustodian: { select: { id: true, fullName: true, email: true } },
        loanItems: {
          where: { itemStatus: { in: ['APPROVED', 'ACTIVE'] } },
          select: { id: true, itemStatus: true },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    const isAvailableForLoan = computeAvailability({
      status: device.status,
      condition: device.condition,
      activeLoanItemCount: device.loanItems.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...device,
        isAvailableForLoan,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
