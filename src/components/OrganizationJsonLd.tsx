"use client";

interface OrganizationJsonLdProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

export default function OrganizationJsonLd({
  name = "Corpus",
  url = "https://usecorpus.app",
  logo = "https://usecorpus.app/logo.png",
  description = "Corpus is a collaborative research platform that helps academics discover, organize, and understand academic work.",
  sameAs = [],
}: OrganizationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    description,
    ...(sameAs.length > 0 && { sameAs }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
