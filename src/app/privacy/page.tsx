import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: {
    index: true,
    follow: false,
  },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8">
          Corpus Web Clipper — Privacy Policy
        </h1>
        
        <p className="text-sm text-muted-foreground mb-8">
          Last updated: March 24, 2026
        </p>

        <div className="space-y-6 text-foreground leading-relaxed">
          <p>
            Corpus Web Clipper does not collect, store, transmit, or share any personal data 
            or browsing history with any third party.
          </p>

          <p>
            The extension reads the URL and title of the current browser tab solely to save 
            that information to the user&apos;s own Corpus instance. This data is transmitted only 
            to the Corpus server configured by the user and nowhere else.
          </p>

          <p>
            No analytics, tracking, or telemetry of any kind is used.
          </p>

          <div className="pt-8 border-t border-border">
            <p className="font-semibold">Contact: reachmaako@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
