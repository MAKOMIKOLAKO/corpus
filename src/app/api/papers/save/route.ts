import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/session';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await request.json();

        if (!data.title || typeof data.title !== 'string') {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Check entry limit for free users
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { plan: true }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            // Check entry count for free users
            if (user.plan === 'FREE') {
                const entryCount = await prisma.entry.count({
                    where: { userId }
                });

                if (entryCount >= 100) {
                    return NextResponse.json(
                        { error: 'You\'ve reached the 100 entry limit on the free plan. Upgrade to Pro for unlimited entries.' },
                        { status: 403 }
                    );
                }
            }
        } catch (error) {
            console.error('Plan check error:', error);
        }

        // Create the entry
        const entry = await prisma.entry.create({
            data: {
                title: data.title,
                authors: data.authors || [],
                year: data.year || null,
                abstract: data.abstract || null,
                source: data.source || null,
                doi: data.doi || null,
                url: data.url || null,
                contentType: 'PAPER',
                userId,
                readingStatus: data.readingStatus || 'UNREAD',
                autoKeywords: [],
                topics: [],
                notes: [],
                userKeywords: data.userKeywords ? data.userKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []
            },
            select: {
                id: true,
                title: true,
                createdAt: true
            }
        });

        // Update user's entry count - removed as field doesn't exist in schema

        // Fire and forget enrichment
        (async () => {
            try {
                let keywords: string[] = [];
                let topics: string[] = [];

                // Generate keywords and topics with Gemini
                if (process.env.GEMINI_API_KEY && (data.abstract || data.title)) {
                    const ai = new GoogleGenAI({
                        apiKey: process.env.GEMINI_API_KEY,
                    });

                    const textToAnalyze = data.abstract || data.title;

                    try {
                        const keywordCompletion = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `Extract 5 to 8 concise, specific keywords from the following text. Return only a JSON array of strings, no explanation.\n\nText: ${textToAnalyze}`,
                            config: {
                                responseMimeType: 'application/json',
                            }
                        });
                        const keywordResult = keywordCompletion.text || '[]';
                        keywords = JSON.parse(keywordResult);
                        keywords = Array.isArray(keywords) ? keywords.slice(0, 8) : [];
                    } catch (error) {
                        console.error('Keyword generation error:', error);
                    }

                    try {
                        const topicCompletion = await ai.models.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: `Extract 3 to 5 broad academic topics or fields from the following text. Return only a JSON array of strings, no explanation.\n\nText: ${textToAnalyze}`,
                            config: {
                                responseMimeType: 'application/json',
                            }
                        });
                        const topicResult = topicCompletion.text || '[]';
                        topics = JSON.parse(topicResult);
                        topics = Array.isArray(topics) ? topics.slice(0, 5) : [];
                    } catch (error) {
                        console.error('Topic generation error:', error);
                    }
                }

                // Embedding generation removed as OpenAI is not installed and embedding field doesn't exist

                // Update entry with enrichment data (embedding removed)
                await prisma.entry.update({
                    where: { id: entry.id },
                    data: {
                        autoKeywords: keywords,
                        topics
                    }
                });

            } catch (error) {
                console.error('Enrichment error:', error);
            } finally {
                await prisma.$disconnect();
            }
        })();

        return NextResponse.json(entry);

    } catch (error) {
        console.error('Save paper error:', error);
        return NextResponse.json(
            { error: 'Failed to save paper' },
            { status: 500 }
        );
    }
}
