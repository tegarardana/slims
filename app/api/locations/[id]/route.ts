import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { UpdateLocationSchema } from '@/lib/validators/master-data';
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
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        parentLocation: true,
        childLocations: true,
        devices: {
          select: { id: true, assetTag: true, brand: true, model: true, status: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: location });
  } catch (error: any) {
    console.error('Error fetching location:', error);
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
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_CATEGORY_LOCATION')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = UpdateLocationSchema.safeParse(body);

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

    // Duplicate name check
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.location.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_LOCATION',
              message: `A location named '${data.name}' already exists`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Prevent cyclic parent reference
    if (data.parentLocationId && data.parentLocationId === id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARENT',
            message: 'A location cannot be its own parent',
          },
        },
        { status: 400 }
      );
    }

    const updated = await prisma.location.update({
      where: { id },
      data,
      include: {
        parentLocation: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: data.status ? `LOCATION_${data.status}` : 'LOCATION_UPDATED',
      targetType: 'Location',
      targetId: id,
      previousValue: existing,
      newValue: updated,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
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
    const location = await prisma.location.findUnique({
      where: { id },
      include: {
        _count: {
          select: { devices: true, childLocations: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Location not found' } },
        { status: 404 }
      );
    }

    // Business Rule BR-015 Enforcement
    if (location._count.devices > 0 || location._count.childLocations > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CANNOT_DELETE_WITH_DEPENDENCIES',
            message: `Cannot delete location '${location.name}' because it has ${location._count.devices} device(s) and ${location._count.childLocations} sub-location(s) attached. Please archive it instead.`,
            deviceCount: location._count.devices,
            childCount: location._count.childLocations,
          },
        },
        { status: 409 }
      );
    }

    await prisma.location.delete({ where: { id } });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'LOCATION_DELETED',
      targetType: 'Location',
      targetId: id,
      previousValue: location,
    });

    return NextResponse.json({
      success: true,
      data: { message: `Location '${location.name}' deleted successfully` },
    });
  } catch (error: any) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
