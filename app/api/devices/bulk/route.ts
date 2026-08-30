import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { DeviceStatus, DeviceCondition } from '@prisma/client';

const BulkDeviceActionSchema = z.object({
  deviceIds: z.array(z.string()).min(1, 'At least one device must be selected'),
  action: z.enum([
    'CHANGE_LOCATION',
    'CHANGE_STATUS',
    'CHANGE_CONDITION',
    'CHANGE_CATEGORY',
    'RETIRE',
  ]),
  payload: z
    .object({
      locationId: z.string().optional(),
      categoryId: z.string().optional(),
      status: z.enum(['AVAILABLE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST', 'DISPOSED']).optional(),
      condition: z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL']).optional(),
    })
    .optional(),
  dryRun: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'BULK_ACTIONS')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = BulkDeviceActionSchema.safeParse(body);

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

    const { deviceIds, action, payload, dryRun } = validated.data;

    // Fetch existing devices to inspect
    const devices = await prisma.device.findMany({
      where: { id: { in: deviceIds } },
      select: { id: true, assetTag: true, status: true, condition: true, locationId: true, categoryId: true },
    });

    if (devices.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No matching devices found' } },
        { status: 404 }
      );
    }

    let updateData: any = {};
    let targetName = '';

    switch (action) {
      case 'CHANGE_LOCATION':
        if (!payload?.locationId) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'locationId is required' } },
            { status: 400 }
          );
        }
        const loc = await prisma.location.findUnique({ where: { id: payload.locationId } });
        if (!loc) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Target location not found' } },
            { status: 404 }
          );
        }
        updateData = { locationId: payload.locationId };
        targetName = `Location to ${loc.name}`;
        break;

      case 'CHANGE_CATEGORY':
        if (!payload?.categoryId) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'categoryId is required' } },
            { status: 400 }
          );
        }
        const cat = await prisma.category.findUnique({ where: { id: payload.categoryId } });
        if (!cat) {
          return NextResponse.json(
            { success: false, error: { code: 'NOT_FOUND', message: 'Target category not found' } },
            { status: 404 }
          );
        }
        updateData = { categoryId: payload.categoryId };
        targetName = `Category to ${cat.name}`;
        break;

      case 'CHANGE_STATUS':
        if (!payload?.status) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'status is required' } },
            { status: 400 }
          );
        }
        updateData = { status: payload.status };
        targetName = `Status to ${payload.status}`;
        break;

      case 'CHANGE_CONDITION':
        if (!payload?.condition) {
          return NextResponse.json(
            { success: false, error: { code: 'MISSING_PARAM', message: 'condition is required' } },
            { status: 400 }
          );
        }
        updateData = { condition: payload.condition };
        targetName = `Condition to ${payload.condition}`;
        break;

      case 'RETIRE':
        updateData = { status: 'RETIRED' };
        targetName = 'Status to RETIRED';
        break;

      default:
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_ACTION', message: 'Unknown action' } },
          { status: 400 }
        );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          affectedCount: devices.length,
          previewDevices: devices.map((d) => ({
            id: d.id,
            assetTag: d.assetTag,
            current: { status: d.status, condition: d.condition, locationId: d.locationId },
            after: { ...updateData },
          })),
        },
      });
    }

    // Execute bulk update
    const result = await prisma.device.updateMany({
      where: { id: { in: deviceIds } },
      data: updateData,
    });

    await createAuditLog({
      actorId: (session.user as any).id,
      action: `DEVICE_BULK_${action}`,
      targetType: 'Device',
      targetId: 'BULK',
      context: {
        affectedCount: result.count,
        deviceIds,
        action,
        changes: updateData,
        description: `Updated ${result.count} devices: ${targetName}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count,
        message: `Successfully updated ${result.count} device(s)`,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
