import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateCategorySchema } from '@/lib/validators/master-data';
import { createAuditLog } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'VIEW_INVENTORY')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (status && ['ACTIVE', 'ARCHIVED'].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        deviceCount: c._count.devices,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_CATEGORY_LOCATION')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid category data',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name } = validated.data;

    // Check unique category name
    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_CATEGORY',
            message: `A category named '${name}' already exists`,
          },
        },
        { status: 409 }
      );
    }

    const newCategory = await prisma.category.create({
      data: { name },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'CATEGORY_CREATED',
      targetType: 'Category',
      targetId: newCategory.id,
      newValue: newCategory,
    });

    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
