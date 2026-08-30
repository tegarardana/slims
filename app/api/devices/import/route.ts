import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'IMPORT_DATA')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rows, dryRun } = body;

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Rows must be an array' } },
        { status: 400 }
      );
    }

    // Pre-fetch categories and locations for quick lookup
    const [allCategories, allLocations, existingDevices] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, name: true } }),
      prisma.device.findMany({ select: { assetTag: true, serialNumber: true } }),
    ]);

    const categoryMap = new Map<string, string>();
    allCategories.forEach((c) => {
      categoryMap.set(c.name.toLowerCase(), c.id);
      categoryMap.set(c.id, c.id);
    });

    const locationMap = new Map<string, string>();
    allLocations.forEach((l) => {
      locationMap.set(l.name.toLowerCase(), l.id);
      locationMap.set(l.id, l.id);
    });

    const existingTags = new Set(existingDevices.map((d) => d.assetTag.toUpperCase()));
    const existingSerials = new Set(
      existingDevices
        .map((d) => d.serialNumber?.toUpperCase())
        .filter((s): s is string => Boolean(s))
    );

    const validRows: any[] = [];
    const errors: Array<{ row: number; data: any; reason: string }> = [];
    let duplicateCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const rowNum = i + 1;

      const assetTag = (raw.assetTag || raw['Asset Tag'] || '').toString().trim().toUpperCase();
      const brand = (raw.brand || raw['Brand'] || '').toString().trim();
      const model = (raw.model || raw['Model'] || '').toString().trim();
      const deviceType = (raw.deviceType || raw['Device Type'] || raw.type || 'Equipment').toString().trim();
      const rawCategory = (raw.category || raw.categoryId || raw['Category'] || '').toString().trim();
      const rawLocation = (raw.location || raw.locationId || raw['Location'] || '').toString().trim();
      const serialNumber = (raw.serialNumber || raw['Serial Number'] || '').toString().trim();
      const rawYear = raw.yearAcquired || raw['Year Acquired'];
      const yearAcquired = rawYear ? parseInt(rawYear.toString(), 10) : undefined;
      const rawStatus = (raw.status || raw['Status'] || 'AVAILABLE').toString().trim().toUpperCase();
      const rawCondition = (raw.condition || raw['Condition'] || 'GOOD').toString().trim().toUpperCase();
      const description = (raw.description || raw['Description'] || '').toString().trim();

      // Check required fields
      if (!assetTag) {
        errors.push({ row: rowNum, data: raw, reason: 'Asset Tag is required' });
        continue;
      }
      if (!brand || !model) {
        errors.push({ row: rowNum, data: raw, reason: 'Brand and Model are required' });
        continue;
      }

      // Check duplicate Asset Tag
      if (existingTags.has(assetTag)) {
        duplicateCount++;
        errors.push({ row: rowNum, data: raw, reason: `Asset Tag '${assetTag}' already exists` });
        continue;
      }

      // Check duplicate Serial Number
      if (serialNumber && existingSerials.has(serialNumber.toUpperCase())) {
        duplicateCount++;
        errors.push({ row: rowNum, data: raw, reason: `Serial Number '${serialNumber}' already exists` });
        continue;
      }

      // Resolve Category ID
      let categoryId = categoryMap.get(rawCategory.toLowerCase());
      if (!categoryId && rawCategory) {
        // Fallback: If not found, use first category or match partially
        const found = allCategories.find((c) =>
          c.name.toLowerCase().includes(rawCategory.toLowerCase())
        );
        categoryId = found ? found.id : allCategories[0]?.id;
      }
      if (!categoryId) categoryId = allCategories[0]?.id;

      // Resolve Location ID
      let locationId = locationMap.get(rawLocation.toLowerCase());
      if (!locationId && rawLocation) {
        const found = allLocations.find((l) =>
          l.name.toLowerCase().includes(rawLocation.toLowerCase())
        );
        locationId = found ? found.id : allLocations[0]?.id;
      }
      if (!locationId) locationId = allLocations[0]?.id;

      // Status & Condition normalization
      const status = [
        'AVAILABLE',
        'BORROWED',
        'UNDER_MAINTENANCE',
        'LOST',
        'RETIRED',
        'DISPOSED',
      ].includes(rawStatus)
        ? rawStatus
        : 'AVAILABLE';

      const condition = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'CRITICAL'].includes(
        rawCondition
      )
        ? rawCondition
        : 'GOOD';

      // Track in-batch unique keys
      existingTags.add(assetTag);
      if (serialNumber) existingSerials.add(serialNumber.toUpperCase());

      validRows.push({
        assetTag,
        serialNumber: serialNumber || null,
        deviceType,
        brand,
        model,
        categoryId,
        locationId,
        yearAcquired: !isNaN(yearAcquired!) ? yearAcquired : null,
        status,
        condition,
        description: description || null,
      });
    }

    // If dry run, return preview summary
    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          totalRows: rows.length,
          validCount: validRows.length,
          errorCount: errors.length,
          duplicateCount,
          errors,
          preview: validRows.slice(0, 15).map((r) => ({
            ...r,
            categoryName: allCategories.find((c) => c.id === r.categoryId)?.name,
            locationName: allLocations.find((l) => l.id === r.locationId)?.name,
          })),
        },
      });
    }

    // Execute real creation
    const createdDevices: any[] = [];
    for (const item of validRows) {
      const qrCodeValue = `SLIMS-${item.assetTag}-${Date.now().toString(36).toUpperCase()}`;
      const d = await prisma.device.create({
        data: {
          ...item,
          qrCodeValue,
        },
        select: {
          id: true,
          assetTag: true,
          brand: true,
          model: true,
          status: true,
          condition: true,
        },
      });
      createdDevices.push(d);
    }

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'DEVICE_IMPORT_COMPLETED',
      targetType: 'Device',
      targetId: 'IMPORT',
      context: {
        totalRows: rows.length,
        createdCount: createdDevices.length,
        failedCount: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProcessed: rows.length,
        successCount: createdDevices.length,
        failedCount: errors.length,
        errors,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
