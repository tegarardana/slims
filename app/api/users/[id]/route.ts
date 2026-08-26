import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { UpdateUserSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (
      !session?.user ||
      (!hasPermission(session.user as any, 'MANAGE_USERS') &&
        (session.user as any).id !== id)
    ) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        studentOrEmployeeId: true,
        baseRole: true,
        isTechnician: true,
        department: true,
        contact: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('Error fetching user detail:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = UpdateUserSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    const updateData: any = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username || null;
    if (data.studentOrEmployeeId !== undefined)
      updateData.studentOrEmployeeId = data.studentOrEmployeeId || null;
    if (data.baseRole !== undefined) updateData.baseRole = data.baseRole;
    if (data.isTechnician !== undefined) updateData.isTechnician = data.isTechnician;
    if (data.department !== undefined) updateData.department = data.department || null;
    if (data.contact !== undefined) updateData.contact = data.contact || null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        studentOrEmployeeId: true,
        baseRole: true,
        isTechnician: true,
        department: true,
        contact: true,
        status: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'USER_UPDATED',
      targetType: 'User',
      targetId: id,
      previousValue: {
        fullName: existingUser.fullName,
        email: existingUser.email,
        baseRole: existingUser.baseRole,
        isTechnician: existingUser.isTechnician,
        status: existingUser.status,
      },
      newValue: updatedUser,
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
