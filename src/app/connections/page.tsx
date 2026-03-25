import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import ConnectionsPageClient from './ConnectionsPageClient';

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  return <ConnectionsPageClient />;
}
