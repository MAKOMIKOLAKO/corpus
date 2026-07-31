import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { getStripe } from '@/lib/stripe';
import { accountDeleteSchema } from '@/lib/validation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const raw = await request.json().catch(() => ({}));
  const parsed = accountDeleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (user.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: 'Password is required to delete your account' }, { status: 400 });
    }
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });
    }
  }

  if (user.stripeCustomerId) {
    const stripe = getStripe();
    if (!stripe) {
      console.error('[api/user/delete] Stripe customer present but STRIPE_SECRET_KEY is not configured', { userId });
      return NextResponse.json(
        { error: 'Unable to process billing cancellation right now. Please contact support.' },
        { status: 502 }
      );
    }
    try {
      if (user.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      }
      await stripe.customers.del(user.stripeCustomerId);
    } catch (e: unknown) {
      console.error('[api/user/delete] Stripe cancellation failed', e);
      return NextResponse.json(
        { error: 'Unable to cancel your subscription right now. Please contact support before retrying deletion.' },
        { status: 502 }
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Shared collections the user owns: transfer to another active member if one exists,
      // otherwise delete the collection outright (no one left to hand it to).
      const ownedSharedCollections = await tx.collection.findMany({
        where: { userId, isShared: true },
        select: { id: true },
      });
      for (const col of ownedSharedCollections) {
        const nextOwner =
          (await tx.collectionMember.findFirst({
            where: { collectionId: col.id, userId: { not: userId }, status: 'ACCEPTED', role: 'ADMIN' },
            orderBy: { acceptedAt: 'asc' },
          })) ??
          (await tx.collectionMember.findFirst({
            where: { collectionId: col.id, userId: { not: userId }, status: 'ACCEPTED', role: 'CONTRIBUTOR' },
            orderBy: { acceptedAt: 'asc' },
          })) ??
          (await tx.collectionMember.findFirst({
            where: { collectionId: col.id, userId: { not: userId }, status: 'ACCEPTED' },
            orderBy: { acceptedAt: 'asc' },
          }));

        if (nextOwner) {
          await tx.collection.update({ where: { id: col.id }, data: { userId: nextOwner.userId } });
        } else {
          await tx.alertContainer.deleteMany({ where: { collectionId: col.id } });
          await tx.collection.delete({ where: { id: col.id } });
        }
      }

      // 2. Personal (non-shared) collections the user owns: delete outright.
      const ownedPersonalCollections = await tx.collection.findMany({
        where: { userId, isShared: false },
        select: { id: true },
      });
      for (const col of ownedPersonalCollections) {
        await tx.alertContainer.deleteMany({ where: { collectionId: col.id } });
        await tx.collection.delete({ where: { id: col.id } });
      }

      // 3. CollectionMember.invitedBy has a RESTRICT constraint — any membership the deleting
      // user invited (in a collection that still exists, i.e. wasn't deleted above) must be
      // reassigned before the User row can be removed. Fall back to the invited member's own id
      // if the collection has no resolvable owner.
      const invitedByRows = await tx.collectionMember.findMany({
        where: { invitedBy: userId, userId: { not: userId } },
        select: { id: true, userId: true, collectionId: true },
      });
      if (invitedByRows.length > 0) {
        const remainingCollections = await tx.collection.findMany({
          where: { id: { in: Array.from(new Set(invitedByRows.map((r) => r.collectionId))) } },
          select: { id: true, userId: true },
        });
        const ownerMap = new Map(remainingCollections.map((c) => [c.id, c.userId]));
        for (const row of invitedByRows) {
          const newInviter = ownerMap.get(row.collectionId) ?? row.userId;
          await tx.collectionMember.update({ where: { id: row.id }, data: { invitedBy: newInviter } });
        }
      }

      // 4. SharedEntry has RESTRICT on both senderId and receiverId — remove any share record
      // involving this user in either direction. The other party keeps their own entries/collections.
      await tx.sharedEntry.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });

      // 5. Entry rows owned by the user. Children (EntryCollection, ReferenceRequest, SharedEntry,
      // Signal) cascade or SetNull automatically per their own onDelete rules.
      await tx.entry.deleteMany({ where: { userId } });

      // 6. Everything else tied to userId cascades automatically via onDelete: Cascade
      // (WatchQuery, AlertContainer, CollectionMember, Connection, ReferenceRequest, Signal,
      // QueueItem, Notification, UserEntry, GeneratedBibliography, UserSource,
      // UserResearchProfile, DailyPaperScore, DailyBrief, PaperReadingSession,
      // PaperWorkspaceSession, PasswordResetToken, EmailVerificationToken), or SetNull
      // (AnalyticsEvent, Feedback, PromoCode.usedBy, GeminiApiCall) once the User row is deleted.
      await tx.user.delete({ where: { id: userId } });

      // 7. Minimal, short-retention audit trail — no PII beyond a one-way hash of the userId.
      await tx.accountDeletionLog.create({
        data: { userIdHash: crypto.createHash('sha256').update(userId).digest('hex') },
      });
    });
  } catch (e: unknown) {
    console.error('[api/user/delete] Deletion transaction failed', e);
    return NextResponse.json(
      { error: 'Failed to delete account. No data was changed — please try again or contact support.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
