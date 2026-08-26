import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isLoanOverdue } from '@/lib/state-machines/loan';

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

    const isAdmin = user.baseRole === 'ADMIN';
    const isTechnician = Boolean(user.isTechnician);

    if (isAdmin || isTechnician) {
      // Admin / Technician Dashboard Aggregations
      const [
        totalDevices,
        availableDevices,
        borrowedDevices,
        maintenanceDevices,
        retiredDevices,
        lostDevices,
        pendingLoans,
        activeLoans,
        openIncidents,
        criticalIncidents,
        activeMaintenances,
        activeOpnames,
        categories,
        locations,
        recentLoans,
        recentIncidents,
        recentAuditLogs,
      ] = await Promise.all([
        prisma.device.count(),
        prisma.device.count({ where: { status: 'AVAILABLE' } }),
        prisma.device.count({ where: { status: 'BORROWED' } }),
        prisma.device.count({ where: { status: 'UNDER_MAINTENANCE' } }),
        prisma.device.count({ where: { status: 'RETIRED' } }),
        prisma.device.count({ where: { status: 'LOST' } }),
        prisma.loanRequest.count({ where: { status: 'PENDING_APPROVAL' } }),
        prisma.loanRequest.findMany({
          where: { status: { in: ['ACTIVE', 'PARTIALLY_RETURNED'] } },
          select: { id: true, expectedReturnDate: true, status: true },
        }),
        prisma.incident.count({ where: { status: { in: ['REPORTED', 'UNDER_REVIEW', 'VERIFIED', 'IN_PROGRESS'] } } }),
        prisma.incident.count({ where: { severity: 'CRITICAL', status: { not: 'RESOLVED' } } }),
        prisma.maintenance.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS'] } } }),
        prisma.stockOpnameSession.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
        prisma.category.findMany({
          select: { id: true, name: true, _count: { select: { devices: true } } },
        }),
        prisma.location.findMany({
          select: { id: true, name: true, _count: { select: { devices: true } } },
        }),
        prisma.loanRequest.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            requester: { select: { fullName: true } },
            items: { include: { device: { select: { assetTag: true } } } },
          },
        }),
        prisma.incident.findMany({
          take: 5,
          orderBy: { reportDate: 'desc' },
          include: {
            device: { select: { assetTag: true, brand: true, model: true } },
            reporter: { select: { fullName: true } },
          },
        }),
        prisma.auditLog.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { fullName: true, baseRole: true } },
          },
        }),
      ]);

      const overdueCount = activeLoans.filter((l) => isLoanOverdue(l.expectedReturnDate, l.status)).length;

      // Condition health distribution
      const [condExcellent, condGood, condFair, condDamaged, condCritical] = await Promise.all([
        prisma.device.count({ where: { condition: 'EXCELLENT' } }),
        prisma.device.count({ where: { condition: 'GOOD' } }),
        prisma.device.count({ where: { condition: 'FAIR' } }),
        prisma.device.count({ where: { condition: 'DAMAGED' } }),
        prisma.device.count({ where: { condition: 'CRITICAL' } }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          role: 'ADMIN',
          kpis: {
            totalDevices,
            availableDevices,
            borrowedDevices,
            maintenanceDevices,
            retiredDevices,
            lostDevices,
            pendingLoans,
            activeLoansCount: activeLoans.length,
            overdueCount,
            openIncidents,
            criticalIncidents,
            activeMaintenances,
            activeOpnames,
          },
          conditionHealth: {
            EXCELLENT: condExcellent,
            GOOD: condGood,
            FAIR: condFair,
            DAMAGED: condDamaged,
            CRITICAL: condCritical,
          },
          categoryDistribution: categories.map((c) => ({
            name: c.name,
            count: c._count.devices,
          })),
          locationDistribution: locations.map((l) => ({
            name: l.name,
            count: l._count.devices,
          })),
          recentLoans,
          recentIncidents,
          recentAuditLogs,
        },
      });
    } else {
      // Student / Teacher Dashboard Aggregations
      const [myLoans, myIncidents] = await Promise.all([
        prisma.loanRequest.findMany({
          where: { requesterId: user.id },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { device: { select: { assetTag: true, brand: true, model: true } } },
            },
          },
        }),
        prisma.incident.findMany({
          where: { reporterId: user.id },
          orderBy: { reportDate: 'desc' },
          include: {
            device: { select: { assetTag: true, brand: true, model: true } },
          },
        }),
      ]);

      const myActiveLoans = myLoans.filter((l) => l.status === 'ACTIVE' || l.status === 'PARTIALLY_RETURNED');
      const myPendingLoans = myLoans.filter((l) => l.status === 'PENDING_APPROVAL');
      const myOverdueLoans = myActiveLoans.filter((l) => isLoanOverdue(l.expectedReturnDate, l.status));

      return NextResponse.json({
        success: true,
        data: {
          role: user.baseRole,
          kpis: {
            myTotalLoans: myLoans.length,
            myActiveLoansCount: myActiveLoans.length,
            myPendingLoansCount: myPendingLoans.length,
            myOverdueLoansCount: myOverdueLoans.length,
            myReportedIncidents: myIncidents.length,
          },
          myActiveLoans,
          myPendingLoans,
          myIncidents,
        },
      });
    }
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
