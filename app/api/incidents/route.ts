import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { CreateIncidentSchema } from '@/lib/validators/incident';
import { createAuditLog } from '@/lib/audit';

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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const deviceId = searchParams.get('deviceId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const where: any = {};

    // Non-admin & non-technician can only view incidents they reported (PRD §4)
    if (user.baseRole !== 'ADMIN' && !user.isTechnician) {
      where.reporterId = user.id;
    } else {
      const reporterId = searchParams.get('reporterId');
      if (reporterId) where.reporterId = reporterId;
    }

    if (status && ['REPORTED', 'UNDER_REVIEW', 'VERIFIED', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      where.status = status;
    }

    if (severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      where.severity = severity;
    }

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { device: { assetTag: { contains: search, mode: 'insensitive' } } },
        { device: { brand: { contains: search, mode: 'insensitive' } } },
        { device: { model: { contains: search, mode: 'insensitive' } } },
        { reporter: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [total, incidents] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { reportDate: 'desc' },
        include: {
          device: {
            select: { id: true, assetTag: true, brand: true, model: true, category: true, location: true },
          },
          reporter: { select: { id: true, fullName: true, email: true, baseRole: true } },
          verifiedBy: { select: { id: true, fullName: true, email: true } },
          location: { select: { id: true, name: true } },
          _count: { select: { maintenances: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents,
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
    const user = session?.user as any;
    if (!user || !hasPermission(user, 'REPORT_INCIDENT')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateIncidentSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid incident report parameters',
            fields: validated.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const data = validated.data;

    // Verify device exists
    const device = await prisma.device.findUnique({ where: { id: data.deviceId } });
    if (!device) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Device not found' } },
        { status: 404 }
      );
    }

    const newIncident = await prisma.incident.create({
      data: {
        deviceId: data.deviceId,
        reporterId: user.id,
        description: data.description,
        severity: data.severity,
        locationId: data.locationId || device.locationId,
        photoUrl: data.photoUrl || null,
        notes: data.notes || null,
        status: 'REPORTED',
      },
      include: {
        device: { select: { assetTag: true, brand: true, model: true } },
        reporter: { select: { fullName: true, email: true } },
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: 'INCIDENT_REPORTED',
      targetType: 'Incident',
      targetId: newIncident.id,
      newValue: {
        deviceTag: newIncident.device.assetTag,
        severity: newIncident.severity,
        description: newIncident.description,
      },
    });

    return NextResponse.json({ success: true, data: newIncident }, { status: 201 });
  } catch (error: any) {
    return handleApiError(error);
  }
}
