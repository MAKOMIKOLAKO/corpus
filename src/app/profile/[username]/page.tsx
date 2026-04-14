import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import ProfilePageClient from './ProfilePageClient';
import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import PersonJsonLd from '@/components/PersonJsonLd';

export const revalidate = 3600; // Revalidate every hour (profiles can be updated)

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { id: true, name: true, username: true, bio: true }
  });

  if (!user) {
    return {
      title: 'User Not Found | Corpus',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const connectionCount = await prisma.connection.count({
    where: {
      OR: [
        { requesterId: user.id, status: 'ACCEPTED' },
        { receiverId: user.id, status: 'ACCEPTED' }
      ]
    }
  });

  return {
    title: `${user.name || user.username} (@${user.username}) — Corpus`,
    description: user.bio || `${user.name || user.username} is a researcher on Corpus with ${connectionCount} connections.`,
    alternates: {
      canonical: `https://usecorpus.app/profile/${user.username}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { name: true, username: true, bio: true }
  });

  if (!user) {
    return <ProfilePageClient username={params.username} currentUserId={(session?.user as any)?.id ?? null} />;
  }

  return (
    <>
      <PersonJsonLd
        name={user.name || user.username || "Researcher"}
        url={`https://usecorpus.app/profile/${user.username}`}
        description={user.bio || `${user.name || user.username || "Researcher"} is a researcher on Corpus.`}
        jobTitle="Researcher"
      />
      <ProfilePageClient username={params.username} currentUserId={(session?.user as any)?.id ?? null} />
    </>
  );
}
