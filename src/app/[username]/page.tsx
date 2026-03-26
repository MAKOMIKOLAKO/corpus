import { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: { name: true, username: true, bio: true }
  });

  if (!user) return { title: "User Not Found" };

  return {
    title: `${user.name || user.username} - Corpus Profile`,
    description: user.bio || `View ${user.name || user.username}'s research profile on Corpus`
  };
}

export default async function ProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { username: params.username },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      createdAt: true,
      _count: {
        select: {
          sentConnections: true,
          receivedConnections: true
        }
      }
    }
  });

  if (!user) notFound();

  // Count total connections (both sent and received that are accepted)
  const totalConnections = await prisma.connection.count({
    where: {
      OR: [
        { requesterId: user.id, status: 'ACCEPTED' },
        { receiverId: user.id, status: 'ACCEPTED' }
      ]
    }
  });

  return (
    <ProfileClient
      user={{
        ...user,
        createdAt: user.createdAt.toISOString()
      }}
      totalConnections={totalConnections}
    />
  );
}
