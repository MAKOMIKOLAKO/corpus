import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';
import { researchInterestsUpdateSchema } from '@/lib/validation';
import { RESEARCH_INTERESTS } from '@/lib/researchInterests';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = researchInterestsUpdateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { selectedInterests } = parseResult.data;

    // Validate that all selected interest IDs exist
    const validInterestIds = new Set(RESEARCH_INTERESTS.map((i) => i.id));
    const invalidInterests = selectedInterests.filter((id) => !validInterestIds.has(id));
    if (invalidInterests.length > 0) {
      return NextResponse.json(
        { error: 'Invalid interest IDs', invalidInterests },
        { status: 400 }
      );
    }

    // Update domainWeights in UserResearchProfile
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/user/research-interests] PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
