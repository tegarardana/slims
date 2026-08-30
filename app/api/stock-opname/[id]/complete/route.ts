import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Only Admins can close audit sessions' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id },
      include: { records: true },
    });

    if (!opnameSession) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Stock opname session not found' } },
        { status: 404 }
      );
    }

    if (opnameSession.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: { code: 'ALREADY_COMPLETED', message: 'This session is already completed' } },
        { status: 400 }
      );
    }

    const updated = await prisma.stockOpnameSession.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    await createAuditLog({
      actorId: user.id,
      action: 'STOCK_OPNAME_COMPLETED',
      targetType: 'StockOpnameSession',
      targetId: id,
      newValue: {
        sessionName: opnameSession.sessionName,
        totalAudited: opnameSession.records.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Stock opname session '${opnameSession.sessionName}' successfully closed.`,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
