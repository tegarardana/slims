import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { computeAvailability } from '@/lib/availability';
import { CreateDeviceSchema } from '@/lib/validators/device';
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
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId');
    const locationId = searchParams.get('locationId');
    const brand = searchParams.get('brand');
    const model = searchParams.get('model');
    const status = searchParams.get('status');
    const condition = searchParams.get('condition');
    const yearAcquired = searchParams.get('yearAcquired');
    const availableOnly = searchParams.get('availableOnly') === 'true';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (search) {
      where.OR = [
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { deviceType: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (model) where.model = { contains: model, mode: 'insensitive' };
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (yearAcquired) where.yearAcquired = parseInt(yearAcquired, 10);

    if (availableOnly) {
      where.status = 'AVAILABLE';
      where.loanItems = {
        none: {
          itemStatus: { in: ['APPROVED', 'ACTIVE'] },
        },
      };
    }

    const skip = (page - 1) * pageSize;
    const [total, devices] = await Promise.all([
      prisma.device.count({ where }),
      prisma.device.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortDir },
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          currentCustodian: { select: { id: true, fullName: true, email: true } },
          loanItems: {
            where: { itemStatus: { in: ['APPROVED', 'ACTIVE'] } },
            select: { id: true, itemStatus: true },
          },
        },
      }),
    ]);

    const mapped = devices.map((d) => ({
      id: d.id,
      assetTag: d.assetTag,
      serialNumber: d.serialNumber,
      qrCodeValue: d.qrCodeValue,
      deviceType: d.deviceType,
      brand: d.brand,
      model: d.model,
      category: d.category,
      location: d.location,
      status: d.status,
      condition: d.condition,
      yearAcquired: d.yearAcquired,
      acquisitionDate: d.acquisitionDate,
      purchasePrice: d.purchasePrice,
      warrantyInfo: d.warrantyInfo,
      currentCustodian: d.currentCustodian,
      description: d.description,
      notes: d.notes,
      photoUrl: d.photoUrl,
      isAvailableForLoan: computeAvailability({
        status: d.status,
        condition: d.condition,
        activeLoanItemCount: d.loanItems.length,
      }),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'CRUD_DEVICE')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateDeviceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid device parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Check unique Asset Tag
    const existingAssetTag = await prisma.device.findUnique({
      where: { assetTag: data.assetTag },
    });
    if (existingAssetTag) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE_ASSET_TAG',
            message: `Asset tag '${data.assetTag}' is already registered`,
            fields: { assetTag: ['Asset Tag must be unique'] },
          },
        },
        { status: 409 }
      );
    }

    // Check unique Serial Number if provided
    if (data.serialNumber) {
      const existingSerial = await prisma.device.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (existingSerial) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_SERIAL_NUMBER',
              message: `Serial number '${data.serialNumber}' is already registered`,
              fields: { serialNumber: ['Serial number must be unique'] },
            },
          },
          { status: 409 }
        );
      }
    }

    // Generate immutable QR Code value (BR-020)
    const qrCodeValue = `SLIMS-${data.assetTag}-${Date.now().toString(36).toUpperCase()}`;

    const newDevice = await prisma.device.create({
      data: {
        assetTag: data.assetTag,
        serialNumber: data.serialNumber || null,
        qrCodeValue,
        categoryId: data.categoryId,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        locationId: data.locationId,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
        yearAcquired: data.yearAcquired || null,
        acquisitionSource: data.acquisitionSource || null,
        purchasePrice: data.purchasePrice || null,
        warrantyInfo: data.warrantyInfo || null,
        status: data.status,
        condition: data.condition,
        description: data.description || null,
        notes: data.notes || null,
        photoUrl: data.photoUrl || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'DEVICE_CREATED',
      targetType: 'Device',
      targetId: newDevice.id,
      newValue: newDevice,
    });

    return NextResponse.json({ success: true, data: newDevice }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
