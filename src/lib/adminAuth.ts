import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export function isAdminUser(userId: string): boolean {
  try {
    if (!userId) {
      return false;
    }

    const adminUserIds = process.env.ADMIN_USER_IDS;

    if (!adminUserIds) {
      return false;
    }

    const allowedIds = adminUserIds
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedIds.length === 0) {
      return false;
    }

    return allowedIds.includes(userId);
  } catch {
    return false;
  }
}

export async function requireAdminSession() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return null;
    }

    if (!isAdminUser(session.user.id)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
