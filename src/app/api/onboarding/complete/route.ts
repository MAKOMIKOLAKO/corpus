import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { subscribeToDefaultFeed } from '@/lib/rssSubscriptions';
import { onboardingCompleteSchema } from '@/lib/validation';
import { RESEARCH_INTERESTS } from '@/lib/researchInterests';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, onboardingCompleted: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.onboardingCompleted) {
      // Idempotent: already completed, just return success so the client can navigate forward
      return NextResponse.json({ success: true });
    }

    const body = await request.json();
    const parseResult = onboardingCompleteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { selectedInterests, selectedFeedIds } = parseResult.data;

    // Validate that all selected interest IDs exist
    const validInterestIds = new Set(RESEARCH_INTERESTS.map((i) => i.id));
    const invalidInterests = selectedInterests.filter((id) => !validInterestIds.has(id));
    if (invalidInterests.length > 0) {
      return NextResponse.json(
        { error: 'Invalid interest IDs', invalidInterests },
        { status: 400 }
      );
    }

    // Validate that all selected feed IDs exist in DefaultFeed
    if (selectedFeedIds.length > 0) {
      const defaultFeeds = await prisma.defaultFeed.findMany({
        where: { id: { in: selectedFeedIds }, isActive: true },
        select: { id: true },
      });
      const validFeedIds = new Set(defaultFeeds.map((f) => f.id));
      const invalidFeeds = selectedFeedIds.filter((id) => !validFeedIds.has(id));
      if (invalidFeeds.length > 0) {
        return NextResponse.json(
          { error: 'Invalid feed IDs', invalidFeeds },
          { status: 400 }
        );
      }
    }

    // Upsert UserResearchProfile with domainWeights
    const weight = 1.0 / selectedInterests.length;
    const domainWeights: Record<string, number> = {};
    for (const interestId of selectedInterests) {
      domainWeights[interestId] = weight;
    }

    await prisma.userResearchProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        domainWeights: domainWeights as any,
        dismissedPaperIds: [],
        preferredDailyCount: 5,
      },
      update: {
        domainWeights: domainWeights as any,
      },
    });

    // Subscribe to selected default feeds (skip duplicates silently)
    for (const feedId of selectedFeedIds) {
      try {
        await subscribeToDefaultFeed({ userId: user.id, defaultFeedId: feedId });
      } catch (error) {
        // Skip errors for individual feed subscriptions (e.g., already subscribed, limit reached)
        console.error(`Failed to subscribe to feed ${feedId}:`, error);
      }
    }

    // Mark onboarding as complete
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      },
      select: { onboardingCompleted: true, onboardingCompletedAt: true }
    } as any);

    console.log('[api/onboarding/complete] Updated user:', updatedUser);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/onboarding/complete] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
