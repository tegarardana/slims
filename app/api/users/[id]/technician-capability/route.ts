import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user || !hasPermission(session.user as any, 'MANAGE_USERS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enable } = body;

    if (typeof enable !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Field "enable" must be a boolean' },
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isTechnician: enable },
      select: {
        id: true,
        fullName: true,
        email: true,
        baseRole: true,
        isTechnician: true,
        status: true,
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'USER_TECHNICIAN_CAPABILITY_CHANGED',
      targetType: 'User',
      targetId: id,
      previousValue: { isTechnician: user.isTechnician },
      newValue: { isTechnician: updatedUser.isTechnician },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return handleApiError(error);
  }
}
