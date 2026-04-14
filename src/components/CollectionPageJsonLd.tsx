"use client";

interface CollectionPageJsonLdProps {
  name: string;
  description: string;
  url: string;
  creatorName?: string;
  numberOfItems?: number;
}

export default function CollectionPageJsonLd({
  name,
  description,
  url,
  creatorName,
  numberOfItems,
}: CollectionPageJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    ...(creatorName && {
      creator: {
        "@type": "Person",
        name: creatorName,
      },
    }),
    ...(numberOfItems && {
      numberOfItems,
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
