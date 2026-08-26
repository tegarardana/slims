import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousValue?: unknown;
  newValue?: unknown;
  context?: unknown;
}

export async function createAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  previousValue,
  newValue,
  context,
}: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType,
        targetId,
        previousValue: previousValue ? (previousValue as Prisma.InputJsonValue) : Prisma.DbNull,
        newValue: newValue ? (newValue as Prisma.InputJsonValue) : Prisma.DbNull,
        context: context ? (context as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
