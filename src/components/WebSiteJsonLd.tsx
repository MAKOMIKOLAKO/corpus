"use client";

interface WebSiteJsonLdProps {
  name?: string;
  url?: string;
  description?: string;
}

export default function WebSiteJsonLd({
  name = "Corpus",
  url = "https://usecorpus.app",
  description = "Corpus automatically tracks new research papers from your favorite journals. Get a daily feed with summaries so you never miss important research in your field.",
}: WebSiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://usecorpus.app/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
