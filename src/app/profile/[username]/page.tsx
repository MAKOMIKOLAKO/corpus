import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import ProfilePageClient from './ProfilePageClient';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);
  return <ProfilePageClient username={params.username} currentUserId={(session?.user as any)?.id ?? null} />;
}
