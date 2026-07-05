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

export function canAssignAdmin(): boolean {
  return true;
}
