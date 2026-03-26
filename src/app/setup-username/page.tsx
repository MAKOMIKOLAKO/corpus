import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import SetupUsernameClient from './SetupUsernameClient';

export default async function SetupUsernamePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { username: true }
  });

  if (!user) redirect('/api/auth/clear-session');

  // If user already has username, redirect to library
  // This handles the case where the token was stale but user has since set username
  if (user?.username) {
    redirect('/library');
  }

  return <SetupUsernameClient />;
}
