import { Metadata } from "next";
import { notFound } from "next/navigation";
import LabPageClient from "./LabPageClient";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/labs/${params.slug}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return {
        title: 'Lab Not Found | Corpus',
        description: 'The requested lab could not be found.'
      };
    }

    const lab = await response.json();
    
    return {
      title: `${lab.name} - Research Lab | Corpus`,
      description: lab.description || `Join ${lab.name} at ${lab.institution.name}`,
      openGraph: {
        title: `${lab.name} - Research Lab`,
        description: lab.description || `Join ${lab.name} at ${lab.institution.name}`,
        type: 'website',
        url: `/labs/${params.slug}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${lab.name} - Research Lab`,
        description: lab.description || `Join ${lab.name} at ${lab.institution.name}`,
      }
    };
  } catch (error) {
    return {
      title: 'Research Lab | Corpus',
      description: 'View this research lab on Corpus.'
    };
  }
}

export default async function LabPage({ params }: PageProps) {
  // Fetch the lab data
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/labs/${params.slug}`, {
    cache: 'no-store'
  });

  if (!response.ok) {
    notFound();
  }

  const lab = await response.json();

  return <LabPageClient initialLab={lab} />;
}
