import { Collection, CollectionMember, User, CollectionRole } from '@prisma/client';

type CollectionWithMembers = Collection & {
  members?: CollectionMember[];
};

export function canViewCollection(
  userId: string,
  collection: CollectionWithMembers,
  members?: CollectionMember[]
): boolean {
  if (collection.userId === userId) return true;
  
  const membersList = members || collection.members || [];
  return membersList.some(
    (m) => m.userId === userId && m.status === 'ACCEPTED'
  );
}

export function canAddEntries(
  userId: string,
  collection: CollectionWithMembers,
  members?: CollectionMember[]
): boolean {
  if (collection.userId === userId) return true;
  
  const membersList = members || collection.members || [];
  return membersList.some(
    (m) =>
      m.userId === userId &&
      m.status === 'ACCEPTED' &&
      (m.role === 'CONTRIBUTOR' || m.role === 'ADMIN')
  );
}

export function canManageCollection(
  userId: string,
  collection: CollectionWithMembers,
  members?: CollectionMember[]
): boolean {
  if (collection.userId === userId) return true;
  
  const membersList = members || collection.members || [];
  return membersList.some(
    (m) => m.userId === userId && m.status === 'ACCEPTED' && m.role === 'ADMIN'
  );
}

export function canAssignAdmin(
  inviterUser: User | { plan: 'FREE' | 'PRO' | 'LIFETIME_PRO' },
  targetUser: User | { plan: 'FREE' | 'PRO' | 'LIFETIME_PRO' }
): boolean {
  const inviterIsPro = inviterUser.plan === 'PRO' || inviterUser.plan === 'LIFETIME_PRO';
  const targetIsPro = targetUser.plan === 'PRO' || targetUser.plan === 'LIFETIME_PRO';
  return inviterIsPro && targetIsPro;
}

export function canShareCollection(
  user: User | { plan: 'FREE' | 'PRO' | 'LIFETIME_PRO' },
  currentSharedCollectionCount: number
): boolean {
  if (user.plan === 'PRO' || user.plan === 'LIFETIME_PRO') {
    return true;
  }
  return currentSharedCollectionCount < 3;
}
