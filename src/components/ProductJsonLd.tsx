"use client";

interface Offer {
  price: string;
  priceCurrency: string;
  availability?: string;
}

interface ProductJsonLdProps {
  name: string;
  description: string;
  url: string;
  offers: Offer[];
}

export default function ProductJsonLd({ name, description, url, offers }: ProductJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    offers: offers.map((offer) => ({
      "@type": "Offer",
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      availability: offer.availability || "https://schema.org/InStock",
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
