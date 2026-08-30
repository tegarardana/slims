import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/api-error';
import { createAuditLog } from '@/lib/audit';

const SettingsSchema = z.object({
  organizationName: z.string().min(2).max(100),
  defaultLanguage: z.enum(['id', 'en']),
  maintenanceAlertDays: z.number().int().min(1).max(90),
  maxLoanDurationDays: z.number().int().min(1).max(365),
  enableEmailNotifications: z.boolean(),
  autoApproveLowValueLoans: z.boolean(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 });
    }

    const records = await prisma.systemSetting.findMany();
    const settings = records.reduce((acc, record) => {
      acc[record.key] = record.value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'MANAGE_SETTINGS')) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const body = await request.json();
    const validated = SettingsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validated.error.issues.map((e: any) => e.message).join(', ') } },
        { status: 400 }
      );
    }

    // Save to database
    for (const [key, value] of Object.entries(validated.data)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as any, updatedBy: (session.user as any).id },
        create: { key, value: value as any, updatedBy: (session.user as any).id }
      });
    }

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'Settings',
      targetId: 'SYSTEM',
      newValue: validated.data,
    });

    return NextResponse.json({ success: true, data: validated.data });
  } catch (error) {
    return handleApiError(error);
  }
}
