import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { ImportUserRowSchema } from '@/lib/validators/user';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

    const existingUsers = await prisma.user.findMany({
      select: { email: true, username: true, studentOrEmployeeId: true },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const existingUsernames = new Set(
      existingUsers.map((u) => u.username?.toLowerCase()).filter(Boolean)
    );

    const validRows: any[] = [];
    const errors: Array<{ row: number; data: any; reason: string }> = [];
    let duplicateCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const parsed = ImportUserRowSchema.safeParse(rawRow);

      if (!parsed.success) {
        errors.push({
          row: i + 1,
          data: rawRow,
          reason: parsed.error.issues.map((issue) => issue.message).join(', '),
        });
        continue;
      }

      const row = parsed.data;

      // Duplicate email check
      if (existingEmails.has(row.email.toLowerCase())) {
        duplicateCount++;
        errors.push({
          row: i + 1,
          data: rawRow,
          reason: `Duplicate email '${row.email}' already exists`,
        });
        continue;
      }

      // Duplicate username check
      if (row.username && existingUsernames.has(row.username.toLowerCase())) {
        duplicateCount++;
        errors.push({
          row: i + 1,
          data: rawRow,
          reason: `Duplicate username '${row.username}' already exists`,
        });
        continue;
      }

      // Track in-batch duplicates
      existingEmails.add(row.email.toLowerCase());
      if (row.username) existingUsernames.add(row.username.toLowerCase());

      validRows.push(row);
    }

    // If dry run, return preview summary only
    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          totalRows: rows.length,
          validCount: validRows.length,
          errorCount: errors.length,
          duplicateCount,
          errors,
          preview: validRows.slice(0, 10),
        },
      });
    }

    // Process insertion
    const createdUsers: any[] = [];
    const generatedPasswords: Array<{ email: string; password?: string }> = [];

    for (const validRow of validRows) {
      const isRandomPassword = !validRow.password;
      const rawPassword = validRow.password || crypto.randomBytes(8).toString('hex');
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const user = await prisma.user.create({
        data: {
          fullName: validRow.fullName,
          email: validRow.email,
          username: validRow.username || null,
          studentOrEmployeeId: validRow.studentOrEmployeeId || null,
          baseRole: validRow.baseRole,
          isTechnician: validRow.isTechnician,
          department: validRow.department || null,
          contact: validRow.contact || null,
          passwordHash,
          mustChangePassword: isRandomPassword,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          baseRole: true,
          isTechnician: true,
        },
      });
      createdUsers.push(user);
      
      if (isRandomPassword) {
        generatedPasswords.push({ email: validRow.email, password: rawPassword });
      }
    }

    // Generate a one-time export token for passwords
    let exportToken = null;
    if (generatedPasswords.length > 0) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.exportToken.create({
        data: {
          token,
          payload: generatedPasswords,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry
        }
      });
      exportToken = token;
    }

    await createAuditLog({
      actorId: (session.user as any).id,
      action: 'USER_IMPORT_COMPLETED',
      targetType: 'User',
      targetId: 'IMPORT',
      context: {
        totalRows: rows.length,
        createdCount: createdUsers.length,
        failedCount: errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProcessed: rows.length,
        successCount: createdUsers.length,
        failedCount: errors.length,
        errors,
        exportToken, // Instead of passwords, return a token to download CSV once
      },
    });
  } catch (error: any) {
    console.error('Error importing users:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}
