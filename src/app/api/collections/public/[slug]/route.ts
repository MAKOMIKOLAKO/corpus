import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Find the public collection
    const collection = await prisma.collection.findUnique({
      where: {
        publicSlug: params.slug,
        isPublic: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        },
        entries: {
          include: {
            entry: true
          },
          orderBy: {
            addedAt: 'desc'
          }
        },
        _count: {
          select: {
            entries: true
          }
        }
      }
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Increment view count using raw query to avoid race conditions
    await prisma.$executeRaw`UPDATE "Collection" SET "publicViewCount" = "publicViewCount" + 1 WHERE id = ${collection.id}`;

    // Format the response
    const formattedCollection = {
      id: collection.id,
      name: collection.name,
      publicDescription: collection.publicDescription,
      publicViewCount: collection.publicViewCount + 1, // Include the incremented view
      createdAt: collection.createdAt,
      owner: collection.user,
      entryCount: collection._count.entries,
      entries: collection.entries.map(ec => ({
        id: ec.entry.id,
        title: ec.entry.title,
        authors: ec.entry.authors,
        year: ec.entry.year,
        contentType: ec.entry.contentType,
        source: ec.entry.source,
        url: ec.entry.url,
        doi: ec.entry.doi,
        addedAt: ec.addedAt
      }))
    };

    return NextResponse.json(formattedCollection);
  } catch (error) {
    console.error("Error fetching public collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await request.json();

    if (!entryId) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }

    // Find the public collection
    const collection = await prisma.collection.findUnique({
      where: {
        publicSlug: params.slug,
        isPublic: true
      },
      include: {
        entries: {
          include: {
            entry: true
          }
        }
      }
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    // Find the entry in the collection
    const collectionEntry = collection.entries.find(ec => ec.entryId === entryId);
    if (!collectionEntry) {
      return NextResponse.json({ error: "Entry not found in this collection" }, { status: 404 });
    }

    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a copy of the entry for the user
    const entryData = collectionEntry.entry;
    const newEntry = await prisma.entry.create({
      data: {
        title: entryData.title,
        authors: entryData.authors,
        year: entryData.year,
        contentType: entryData.contentType,
        url: entryData.url,
        doi: entryData.doi,
        source: entryData.source,
        abstract: entryData.abstract,
        publishers: entryData.publishers,
        publishDate: entryData.publishDate,
        numberOfPages: entryData.numberOfPages,
        description: entryData.description,
        isbn13: entryData.isbn13,
        cover: entryData.cover,
        autoKeywords: entryData.autoKeywords,
        userId: user.id
      }
    });

    // Trigger embedding generation asynchronously
    try {
      fetch(`${process.env.NEXTAUTH_URL}/api/entries/${newEntry.id}/generate-embedding`, {
        method: 'POST'
      }).catch(err => console.error('Failed to generate embedding:', err));
    } catch (error) {
      // Fire-and-forget embedding generation
      console.error("Failed to trigger embedding generation:", error);
    }

    return NextResponse.json({
      success: true,
      newEntryId: newEntry.id
    });
  } catch (error) {
    console.error("Error saving entry from public collection:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
