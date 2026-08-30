import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

// In-memory / file-persisted settings configuration default
let systemSettings = {
  institutionName: 'SMK Negeri 1 Rekayasa Teknologi',
  labName: 'Laboratorium Jaringan Komputer & Telekomunikasi (TKJ)',
  defaultLoanDurationDays: 3,
  maxDevicesPerLoan: 5,
  overdueWarningDays: 1,
  allowSelfIncidentReporting: true,
  requireApprovalForTeachers: false,
  autoArchiveCompletedAudits: false,
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: systemSettings,
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (!user || user.baseRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: Must be Administrator to update system settings' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const previous = { ...systemSettings };
    systemSettings = {
      ...systemSettings,
      ...body,
    };

    await createAuditLog({
      actorId: user.id,
      action: 'SYSTEM_SETTINGS_UPDATED',
      targetType: 'SystemSettings',
      targetId: 'global',
      previousValue: previous,
      newValue: systemSettings,
    });

    return NextResponse.json({
      success: true,
      data: systemSettings,
      message: 'System settings successfully updated.',
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}
