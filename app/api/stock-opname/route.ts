import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateStockOpnameSessionSchema } from '@/lib/validators/stock-opname';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};
    if (status && ['OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.sessionName = { contains: search, mode: 'insensitive' };
    }

    const skip = (page - 1) * pageSize;
    const [total, sessions] = await Promise.all([
      prisma.stockOpnameSession.count({ where }),
      prisma.stockOpnameSession.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { startDate: 'desc' },
        include: {
          assignedVerifier: { select: { id: true, fullName: true, email: true } },
          records: {
            select: {
              id: true,
              verificationResult: true,
              reconciled: true,
            },
          },
        },
      }),
    ]);

    const mapped = sessions.map((s) => {
      const totalCount = s.records.length;
      const verifiedCount = s.records.filter((r) => r.verificationResult !== 'UNVERIFIED').length;
      const foundCount = s.records.filter((r) => r.verificationResult === 'FOUND').length;
      const missingCount = s.records.filter((r) => r.verificationResult === 'MISSING').length;
      const wrongLocationCount = s.records.filter((r) => r.verificationResult === 'WRONG_LOCATION').length;
      const damagedCount = s.records.filter((r) => r.verificationResult === 'DAMAGED').length;
      const discrepancyCount = missingCount + wrongLocationCount + damagedCount;
      const unreconciledDiscrepancies = s.records.filter(
        (r) =>
          (r.verificationResult === 'MISSING' ||
            r.verificationResult === 'WRONG_LOCATION' ||
            r.verificationResult === 'DAMAGED') &&
          !r.reconciled
      ).length;

      const progressPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

      return {
        id: s.id,
        sessionName: s.sessionName,
        locationScope: s.locationScope,
        categoryScope: s.categoryScope,
        startDate: s.startDate,
        status: s.status,
        notes: s.notes,
        assignedVerifier: s.assignedVerifier,
        metrics: {
          totalCount,
          verifiedCount,
          foundCount,
          missingCount,
          wrongLocationCount,
          damagedCount,
          discrepancyCount,
          unreconciledDiscrepancies,
          progressPercent,
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stock opname sessions:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || (!hasPermission(user, 'CREATE_STOCK_OPNAME') && user.baseRole !== 'ADMIN')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Admin to create audit sessions' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateStockOpnameSessionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid session parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const startDate = new Date(data.startDate);

    // Build filter for matching devices
    const deviceWhere: any = {
      status: { notIn: ['DISPOSED', 'RETIRED'] },
    };

    if (data.locationScope && data.locationScope.length > 0) {
      deviceWhere.locationId = { in: data.locationScope };
    }

    if (data.categoryScope && data.categoryScope.length > 0) {
      deviceWhere.categoryId = { in: data.categoryScope };
    }

    // Fetch all matching devices (BR-018)
    const matchingDevices = await prisma.device.findMany({
      where: deviceWhere,
      select: { id: true, assetTag: true, locationId: true, condition: true },
    });

    if (matchingDevices.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_DEVICES_FOUND',
            message: 'No active devices match the selected location and category scope.',
          },
        },
        { status: 400 }
      );
    }

    // Create session & populate records in transaction (BR-018)
    const createdSession = await prisma.$transaction(async (tx) => {
      const opnameSession = await tx.stockOpnameSession.create({
        data: {
          sessionName: data.sessionName,
          locationScope: data.locationScope,
          categoryScope: data.categoryScope,
          startDate,
          assignedVerifierId: data.assignedVerifierId,
          notes: data.notes || null,
          status: 'OPEN',
          records: {
            create: matchingDevices.map((d) => ({
              deviceId: d.id,
              verificationResult: 'UNVERIFIED',
            })),
          },
        },
        include: {
          assignedVerifier: { select: { fullName: true } },
          records: true,
        },
      });

      return opnameSession;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'STOCK_OPNAME_CREATED',
      targetType: 'StockOpnameSession',
      targetId: createdSession.id,
      newValue: {
        sessionName: createdSession.sessionName,
        totalItemsPopulated: createdSession.records.length,
        verifier: createdSession.assignedVerifier.fullName,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: createdSession,
        message: `Stock opname session created with ${createdSession.records.length} items to audit.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating stock opname session:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
