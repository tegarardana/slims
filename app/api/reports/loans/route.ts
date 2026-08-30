import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { isLoanOverdue } from '@/lib/state-machines/loan';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'VIEW_REPORTS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Cannot view reports' } },
        { status: 403 }
      );
    }

    const loans = await prisma.loanRequest.findMany({
      include: {
        requester: { select: { fullName: true, department: true, email: true } },
        items: {
          include: {
            device: { select: { assetTag: true, brand: true, model: true, category: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalLoans = loans.length;
    const activeLoans = loans.filter((l) => l.status === 'ACTIVE' || l.status === 'PARTIALLY_RETURNED').length;
    const completedLoans = loans.filter((l) => l.status === 'RETURNED').length;
    const rejectedLoans = loans.filter((l) => l.status === 'REJECTED').length;
    const overdueLoans = loans.filter((l) => isLoanOverdue(l.expectedReturnDate, l.status)).length;

    // Calculate top borrowed devices
    const deviceBorrowCount = new Map<string, { tag: string; brand: string; model: string; count: number }>();
    loans.forEach((l) => {
      l.items.forEach((item) => {
        const key = item.device.assetTag;
        const existing = deviceBorrowCount.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          deviceBorrowCount.set(key, {
            tag: item.device.assetTag,
            brand: item.device.brand,
            model: item.device.model,
            count: 1,
          });
        }
      });
    });

    const topBorrowedEquipment = Array.from(deviceBorrowCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalLoans,
          activeLoans,
          completedLoans,
          rejectedLoans,
          overdueLoans,
          onTimeRate: completedLoans > 0 ? Math.round((completedLoans / (completedLoans + overdueLoans)) * 100) : 100,
        },
        topBorrowedEquipment,
        recentLoans: loans.slice(0, 20).map((l) => ({
          id: l.id,
          purpose: l.purpose,
          borrower: l.requester.fullName,
          department: l.requester.department,
          startDate: l.startDate,
          expectedReturnDate: l.expectedReturnDate,
          status: l.status,
          isOverdue: isLoanOverdue(l.expectedReturnDate, l.status),
          itemCount: l.items.length,
          deviceTags: l.items.map((i) => i.device.assetTag).join(', '),
        })),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
