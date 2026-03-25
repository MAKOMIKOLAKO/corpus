import { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicCollectionClient from "./PublicCollectionClient";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/collections/public/${params.slug}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        title: 'Collection Not Found | Corpus',
        description: 'The requested public collection could not be found.'
      };
    }

    const collection = await response.json();
    
    return {
      title: `${collection.name} - Public Collection | Corpus`,
      description: collection.publicDescription || `View ${collection.entryCount} research papers in this public collection by ${collection.owner.name}`,
      openGraph: {
        title: `${collection.name} - Public Collection`,
        description: collection.publicDescription || `View ${collection.entryCount} research papers in this public collection by ${collection.owner.name}`,
        type: 'website',
        url: `/c/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${collection.name} - Public Collection`,
        description: collection.publicDescription || `View ${collection.entryCount} research papers in this public collection by ${collection.owner.name}`,
      }
    };
  } catch (error) {
    return {
      title: 'Public Collection | Corpus',
      description: 'View this public research collection on Corpus.'
    };
  }
}

export default async function PublicCollectionPage({ params }: PageProps) {
  // Fetch the collection data
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/collections/public/${params.slug}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    notFound();
  }

  const collection = await response.json();

  return <PublicCollectionClient initialCollection={collection} />;
}
