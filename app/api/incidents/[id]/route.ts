import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

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
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        device: {
          include: {
            category: true,
            location: true,
          },
        },
        reporter: {
          select: { id: true, fullName: true, email: true, baseRole: true, department: true },
        },
        verifiedBy: {
          select: { id: true, fullName: true, email: true },
        },
        location: true,
        maintenances: {
          include: {
            technician: { select: { fullName: true, email: true } },
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Incident not found' } },
        { status: 404 }
      );
    }

    // Permission check (Students and regular teachers can only view incidents they reported)
    if (user.baseRole !== 'ADMIN' && !user.isTechnician && incident.reporterId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Fetch related Audit Logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { targetType: 'Incident', targetId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { fullName: true, email: true, baseRole: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...incident,
        auditLogs,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
