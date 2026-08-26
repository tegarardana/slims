import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { searchParams } = new URL(request.url);
    const filterResult = searchParams.get('result');

    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id },
      include: {
        assignedVerifier: { select: { id: true, fullName: true, email: true } },
        records: {
          include: {
            device: {
              include: {
                category: true,
                location: true,
              },
            },
            physicalLocation: true,
            reconciledBy: { select: { fullName: true } },
          },
          orderBy: { device: { assetTag: 'asc' } },
        },
      },
    });

    if (!opnameSession) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Stock opname session not found' } },
        { status: 404 }
      );
    }

    const allRecords = opnameSession.records;
    const totalCount = allRecords.length;
    const verifiedCount = allRecords.filter((r) => r.verificationResult !== 'UNVERIFIED').length;
    const foundCount = allRecords.filter((r) => r.verificationResult === 'FOUND').length;
    const missingCount = allRecords.filter((r) => r.verificationResult === 'MISSING').length;
    const wrongLocationCount = allRecords.filter((r) => r.verificationResult === 'WRONG_LOCATION').length;
    const damagedCount = allRecords.filter((r) => r.verificationResult === 'DAMAGED').length;
    const unverifiedCount = allRecords.filter((r) => r.verificationResult === 'UNVERIFIED').length;
    const discrepancyCount = missingCount + wrongLocationCount + damagedCount;
    const reconciledCount = allRecords.filter((r) => r.reconciled).length;
    const progressPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

    let filteredRecords = allRecords;
    if (filterResult && ['FOUND', 'MISSING', 'WRONG_LOCATION', 'DAMAGED', 'UNVERIFIED'].includes(filterResult)) {
      filteredRecords = allRecords.filter((r) => r.verificationResult === filterResult);
    }

    // Fetch related Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'StockOpnameSession', targetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, baseRole: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...opnameSession,
        records: filteredRecords,
        metrics: {
          totalCount,
          verifiedCount,
          unverifiedCount,
          foundCount,
          missingCount,
          wrongLocationCount,
          damagedCount,
          discrepancyCount,
          reconciledCount,
          progressPercent,
        },
        auditLogs,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock opname detail:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
