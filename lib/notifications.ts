import { prisma } from '@/lib/prisma';

export interface CreateNotificationParams {
  userId: string;
  type: 'LOAN_STATUS' | 'LOAN_OVERDUE' | 'INCIDENT_ALERT' | 'MAINTENANCE_UPDATE' | 'STOCK_OPNAME' | 'SYSTEM';
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        payload: {
          title: params.title,
          message: params.message,
          link: params.link || null,
          metadata: params.metadata || {},
        },
        isRead: false,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function notifyAdmins(params: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const admins = await prisma.user.findMany({
      where: { baseRole: 'ADMIN' },
      select: { id: true },
    });

    for (const admin of admins) {
      await createNotification({ ...params, userId: admin.id });
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}
