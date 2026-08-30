import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateUserSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'MANAGE_USERS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const isTechnician = searchParams.get('isTechnician');
    const department = searchParams.get('department');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { studentOrEmployeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && ['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) {
      where.baseRole = role;
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
      where.status = status;
    }

    if (isTechnician !== null && isTechnician !== undefined && isTechnician !== '') {
      where.isTechnician = isTechnician === 'true';
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' };
    }

    const skip = (page - 1) * pageSize;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortDir },
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
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

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
    const validated = CreateUserSchema.safeParse(body);

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

    // Check unique email
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_EMAIL',
            message: 'A user with this email already exists',
            fields: { email: ['Email already in use'] },
          },
        },
        { status: 409 }
      );
    }

    // Check unique username if provided
    if (data.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username: data.username },
      });
      if (existingUsername) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_USERNAME',
              message: 'A user with this username already exists',
              fields: { username: ['Username already in use'] },
            },
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        username: data.username || null,
        studentOrEmployeeId: data.studentOrEmployeeId || null,
        baseRole: data.baseRole,
        isTechnician: data.isTechnician,
        department: data.department || null,
        contact: data.contact || null,
        passwordHash,
      },
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
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: newUser.id,
      newValue: newUser,
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
