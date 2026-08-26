import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { computeAvailability } from '@/lib/availability';
import { isLoanOverdue } from '@/lib/state-machines/loan';
import { CreateLoanRequestSchema } from '@/lib/validators/loan';
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
    const overdueOnly = searchParams.get('overdueOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};

    // Non-admin can only view their own loans (PRD §4)
    if (user.baseRole !== 'ADMIN') {
      where.requesterId = user.id;
    } else {
      const requesterId = searchParams.get('requesterId');
      if (requesterId) where.requesterId = requesterId;
    }

    if (status && [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'ACTIVE',
      'RETURNED',
      'PARTIALLY_RETURNED',
    ].includes(status)) {
      where.status = status;
    }

    if (overdueOnly) {
      where.status = { in: ['ACTIVE', 'PARTIALLY_RETURNED'] };
      where.expectedReturnDate = { lt: new Date() };
    }

    if (search) {
      where.OR = [
        { purpose: { contains: search, mode: 'insensitive' } },
        { requester: { fullName: { contains: search, mode: 'insensitive' } } },
        { items: { some: { device: { assetTag: { contains: search, mode: 'insensitive' } } } } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [total, loans] = await Promise.all([
      prisma.loanRequest.count({ where }),
      prisma.loanRequest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          requester: { select: { id: true, fullName: true, email: true, department: true } },
          approver: { select: { id: true, fullName: true, email: true } },
          items: {
            include: {
              device: {
                select: { id: true, assetTag: true, brand: true, model: true, category: true, location: true },
              },
            },
          },
        },
      }),
    ]);

    const mapped = loans.map((l) => ({
      id: l.id,
      purpose: l.purpose,
      startDate: l.startDate,
      expectedReturnDate: l.expectedReturnDate,
      notes: l.notes,
      status: l.status,
      isOverdue: isLoanOverdue(l.expectedReturnDate, l.status),
      requester: l.requester,
      approver: l.approver,
      approvedAt: l.approvedAt,
      rejectionReason: l.rejectionReason,
      itemCount: l.items.length,
      items: l.items,
      createdAt: l.createdAt,
    }));

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
    console.error('Error fetching loans:', error);
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
    if (!user || !hasPermission(user, 'CREATE_LOAN_REQUEST')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateLoanRequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid loan request parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const startDate = new Date(data.startDate);
    const expectedReturnDate = new Date(data.expectedReturnDate);

    // BR-004: Validate dates
    if (expectedReturnDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: 'Expected return date cannot be earlier than start date (BR-004)',
          },
        },
        { status: 400 }
      );
    }

    // BR-005: Verify that all requested devices are currently available for loan
    const requestedDevices = await prisma.device.findMany({
      where: { id: { in: data.deviceIds } },
      include: {
        loanItems: {
          where: { itemStatus: { in: ['APPROVED', 'ACTIVE'] } },
        },
      },
    });

    if (requestedDevices.length !== data.deviceIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_DEVICE', message: 'One or more selected devices do not exist' },
        },
        { status: 400 }
      );
    }

    const unavailableDevices: string[] = [];
    for (const d of requestedDevices) {
      const isAvail = computeAvailability({
        status: d.status,
        condition: d.condition,
        activeLoanItemCount: d.loanItems.length,
      });
      if (!isAvail) {
        unavailableDevices.push(`${d.assetTag} (${d.status})`);
      }
    }

    if (unavailableDevices.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DEVICE_NOT_AVAILABLE',
            message: `The following equipment is currently unavailable for borrowing (BR-005): ${unavailableDevices.join(
              ', '
            )}`,
          },
        },
        { status: 409 }
      );
    }

    // Create Loan Request with items in transaction
    const newLoan = await prisma.$transaction(async (tx) => {
      const loan = await tx.loanRequest.create({
        data: {
          requesterId: user.id,
          purpose: data.purpose,
          startDate,
          expectedReturnDate,
          notes: data.notes || null,
          status: 'PENDING_APPROVAL',
          items: {
            create: data.deviceIds.map((deviceId) => ({
              deviceId,
              itemStatus: 'PENDING',
            })),
          },
        },
        include: {
          items: {
            include: { device: { select: { assetTag: true, brand: true, model: true } } },
          },
          requester: { select: { fullName: true, email: true } },
        },
      });

      return loan;
    });

    await createAuditLog({
      actorId: user.id,
      action: 'LOAN_REQUESTED',
      targetType: 'LoanRequest',
      targetId: newLoan.id,
      newValue: {
        purpose: newLoan.purpose,
        startDate: newLoan.startDate,
        expectedReturnDate: newLoan.expectedReturnDate,
        itemCount: newLoan.items.length,
        devices: newLoan.items.map((i) => i.device.assetTag),
      },
    });

    return NextResponse.json({ success: true, data: newLoan }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating loan request:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
