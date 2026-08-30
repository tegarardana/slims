import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user as any, 'IMPORT_DATA')) {
      return new NextResponse('Access denied', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new NextResponse('Token is required', { status: 400 });
    }

    const exportToken = await prisma.exportToken.findUnique({
      where: { token }
    });

    if (!exportToken || exportToken.used || exportToken.expiresAt < new Date()) {
      return new NextResponse('Token is invalid, expired, or has already been used', { status: 403 });
    }

    // Mark token as used instantly (One-Time Use)
    await prisma.exportToken.update({
      where: { id: exportToken.id },
      data: { used: true }
    });

    const passwords = exportToken.payload as Array<{ email: string; password?: string }>;

    // Generate basic CSV (safe for just email and alphanumeric passwords)
    const csvRows = ['email,password'];
    passwords.forEach(p => {
      csvRows.push(`${p.email},${p.password}`);
    });
    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="imported-users-passwords.csv"',
      },
    });
  } catch (error) {
    console.error('Error exporting passwords:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
