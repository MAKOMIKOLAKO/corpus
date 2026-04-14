"use client";

interface SoftwareApplicationJsonLdProps {
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: {
    ratingValue?: number;
    ratingCount?: number;
  };
}

export default function SoftwareApplicationJsonLd({
  name = "Corpus",
  description = "Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.",
  url = "https://usecorpus.app",
  applicationCategory = "EducationalApplication",
  operatingSystem = "Web",
  offers = {
    price: "7",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  aggregateRating,
}: SoftwareApplicationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    url,
    applicationCategory,
    operatingSystem,
    offers,
    ...(aggregateRating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: aggregateRating.ratingValue,
        ratingCount: aggregateRating.ratingCount,
        bestRating: "5",
        worstRating: "1",
      },
    }),
    author: {
      "@type": "Person",
      "name": "Corpus Team"
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
