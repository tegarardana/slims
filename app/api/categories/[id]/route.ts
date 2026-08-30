import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { UpdateCategorySchema } from '@/lib/validators/master-data';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'VIEW_INVENTORY')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        devices: {
          select: { id: true, assetTag: true, brand: true, model: true, status: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_CATEGORY_LOCATION')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = UpdateCategorySchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_CATEGORY',
              message: `A category named '${data.name}' already exists`,
            },
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: data.status ? `CATEGORY_${data.status}` : 'CATEGORY_UPDATED',
      targetType: 'Category',
      targetId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_CATEGORY_LOCATION')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { devices: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } },
        { status: 404 }
      );
    }

    // Business Rule BR-015 Enforcement
    if (category._count.devices > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_WITH_DEPENDENCIES',
            message: `Cannot delete category '${category.name}' because it has ${category._count.devices} linked device(s). Please archive the category instead to preserve historical integrity.`,
            deviceCount: category._count.devices,
          },
        },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'CATEGORY_DELETED',
      targetType: 'Category',
      targetId: id,
      previousValue: category,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Category '${category.name}' deleted successfully` },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
