import { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicCollectionClient from "./PublicCollectionClient";
import CollectionPageJsonLd from "@/components/CollectionPageJsonLd";

interface PageProps {
  params: { slug: string };
}

export const revalidate = 3600; // Revalidate every hour (collections can be updated)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/collections/public/${params.slug}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return {
        title: 'Collection Not Found | Corpus',
        description: 'The requested public collection could not be found.',
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const collection = await response.json();

    return {
      title: `${collection.name} — Corpus`,
      description: collection.publicDescription || `A curated research collection with ${collection.entryCount} papers on ${collection.name}. Explore on Corpus.`,
      openGraph: {
        title: `${collection.name} — Corpus`,
        description: collection.publicDescription || `A curated research collection with ${collection.entryCount} papers on ${collection.name}. Explore on Corpus.`,
        type: 'website',
        url: `https://usecorpus.app/c/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${collection.name} — Corpus`,
        description: collection.publicDescription || `A curated research collection with ${collection.entryCount} papers on ${collection.name}. Explore on Corpus.`,
      },
      alternates: {
        canonical: `https://usecorpus.app/c/${params.slug}`,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    return {
      title: 'Public Collection | Corpus',
      description: 'View this public research collection on Corpus.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

export default async function PublicCollectionPage({ params }: PageProps) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/collections/public/${params.slug}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    notFound();
  }

  const collection = await response.json();

  return (
    <>
      <CollectionPageJsonLd
        name={collection.name}
        description={collection.publicDescription || `A curated research collection with ${collection.entryCount} papers.`}
        url={`https://usecorpus.app/c/${collection.publicSlug}`}
        creatorName={collection.owner.name || collection.owner.username}
        numberOfItems={collection.entryCount}
      />
      <PublicCollectionClient initialCollection={collection} />
    </>
  );
}
