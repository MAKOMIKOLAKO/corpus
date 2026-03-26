"use client";

interface SoftwareApplicationJsonLdProps {
  url?: string;
  description?: string;
}

export default function SoftwareApplicationJsonLd({ 
  url = "https://corpus-lemon.vercel.app", 
  description = "Collaborative research platform for saving and sharing papers" 
}: SoftwareApplicationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Corpus",
    "url": url,
    "description": description,
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "author": {
      "@type": "Person",
      "name": "Corpus Team"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
