"use client";

interface PersonJsonLdProps {
  name: string;
  url: string;
  description?: string;
  jobTitle?: string;
  knowsAbout?: string[];
}

export default function PersonJsonLd({
  name,
  url,
  description,
  jobTitle,
  knowsAbout,
}: PersonJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    ...(description && { description }),
    ...(jobTitle && { jobTitle }),
    ...(knowsAbout && { knowsAbout }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
