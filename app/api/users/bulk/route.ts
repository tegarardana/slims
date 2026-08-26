import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { BulkUserActionSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'MANAGE_USERS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = BulkUserActionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk action payload',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { userIds, action } = validated.data;
    let updateData: any = {};

    switch (action) {
      case 'ACTIVATE':
        updateData = { status: 'ACTIVE' };
        break;
      case 'DEACTIVATE':
        updateData = { status: 'INACTIVE' };
        break;
      case 'SET_TECHNICIAN':
        updateData = { isTechnician: true };
        break;
      case 'UNSET_TECHNICIAN':
        updateData = { isTechnician: false };
        break;
      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action' } },
          { status: 400 }
        );
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: updateData,
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: `USER_BULK_${action}`,
      targetType: 'User',
      targetId: 'BULK',
      context: { count: result.count, userIds, action },
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
    });
  } catch (error: any) {
    console.error('Error executing bulk user action:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
