import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isPublic, publicDescription } = await request.json();

    // Find the collection and verify ownership
    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: { user: true }
    });

    if (!collection) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.user?.email !== session.user.email) {
      return NextResponse.json({ error: "Only the collection owner can change visibility" }, { status: 403 });
    }

    // Generate a unique publicSlug if making public and none exists
    let publicSlug = collection.publicSlug;
    if (isPublic && !publicSlug) {
      const baseSlug = collection.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);

      // Generate a random 4-character suffix
      const suffix = Math.random().toString(36).substring(2, 6);
      publicSlug = `${baseSlug}-${suffix}`;

      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 10) {
        const existing = await prisma.collection.findUnique({
          where: { publicSlug }
        });
        if (!existing) break;

        const newSuffix = Math.random().toString(36).substring(2, 6);
        publicSlug = `${baseSlug}-${newSuffix}`;
        attempts++;
      }
    }

    // Update the collection
    const updatedCollection = await prisma.collection.update({
      where: { id: params.id },
      data: {
        isPublic,
        publicDescription: isPublic ? publicDescription : null,
        publicSlug: isPublic ? publicSlug : null
      }
    });

    // Create signal if making public
    if (isPublic && !collection.isPublic) {
      try {
        await prisma.signal.create({
          data: {
            userId: session.user.id,
            type: "COLLECTION_MADE_PUBLIC",
            collectionId: collection.id,
            metadata: {
              collectionName: collection.name,
              publicSlug: publicSlug
            }
          }
        });
      } catch (error) {
        // Fire-and-forget signal creation
        console.error("Failed to create signal:", error);
      }
    }

    return NextResponse.json(updatedCollection);
  } catch (error) {
    console.error("Error updating collection visibility:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
