import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Corpus collects, uses, and protects your data.",
  alternates: {
    canonical: "https://www.usecorpus.app/privacy",
  },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-serif font-medium text-content-primary mt-10 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-[1.7] text-content-secondary mb-4">{children}</p>;
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto mb-6 border border-border/60 rounded-lg">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-warm-sand">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium text-content-primary border-b border-border/60">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/40 last:border-b-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 align-top text-content-secondary leading-[1.6]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-serif font-medium text-content-primary tracking-tight mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-content-tertiary mb-10">Last updated: 05/07/2026</p>

      <H2>1. Who we are</H2>
      <P>
        Corpus (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) is a personal library and reading-tracking
        application available at usecorpus.app.
      </P>
      <P>
        <strong className="font-medium text-content-primary">Contact:</strong> reachmaako@gmail.com
        <br />
        <strong className="font-medium text-content-primary">Data controller:</strong> Maako, reachmaako@gmail.com
      </P>

      <H2>2. What we collect</H2>
      <Table
        headers={["Category", "Examples", "Why"]}
        rows={[
          ["Account info", "Email, name, username, bio, password (hashed)", "Create and secure your account"],
          ["Library content", "Entries, collections, notes, reading sessions, bibliographies you create", "Core app functionality"],
          ["Research profile data", "Interest vectors, paper scores, reading history used for recommendations", "To generate personalized recommendations"],
          ["Usage/product data", "Feedback, notifications, queue items, connections with other users", "App functionality"],
          ["AI processing logs", "Records of content sent to Google Gemini for AI features, and associated usage/cost", "To provide AI-powered features and manage usage"],
          ["Technical data", "IP address (via hosting logs), timestamps", "Security, debugging"],
        ]}
      />

      <H2>3. How we use your data</H2>
      <ul className="list-disc pl-5 mb-4 text-[15px] leading-[1.7] text-content-secondary space-y-1">
        <li>To provide the app&apos;s core features (library, collections, recommendations)</li>
        <li>To generate AI-assisted features (via Google Gemini &mdash; see Section 11)</li>
        <li>To pull reference data from Semantic Scholar for papers you look up</li>
        <li>To send account-related emails (via Resend)</li>
        <li>To sign you in via Google, if you choose that option</li>
      </ul>
      <P>We do not use your data for advertising. We do not currently run any analytics or tracking tools.</P>

      <H2>4. Legal basis for processing (GDPR)</H2>
      <P>
        Because Corpus may be used by people in the EEA/UK regardless of where the app is based, GDPR can apply to
        any EU user&apos;s data. Our legal bases:
      </P>
      <ul className="list-disc pl-5 mb-4 text-[15px] leading-[1.7] text-content-secondary space-y-1">
        <li><strong className="font-medium text-content-primary">Contract</strong>: providing the service you signed up for</li>
        <li><strong className="font-medium text-content-primary">Legitimate interest</strong>: security, debugging, improving the app</li>
        <li><strong className="font-medium text-content-primary">Consent</strong>: where you opt into specific features (e.g. Google sign-in)</li>
      </ul>

      <H2>5. Data sharing &mdash; third parties we use</H2>
      <Table
        headers={["Service", "Purpose", "What it receives"]}
        rows={[
          ["Vercel", "Hosting", "Request/traffic data, logs"],
          ["Neon (PostgreSQL)", "Database", "All stored account/library data"],
          ["Google (OAuth)", "Sign-in", "Email, name, if you use Google sign-in"],
          ["Google Gemini", "AI features", "Content you submit for AI-assisted processing"],
          ["Resend", "Transactional email", "Your email address"],
          ["Semantic Scholar", "Paper/reference lookup", "Search queries you make"],
          ["Upstash Redis", "Rate limiting", "Request metadata (not content)"],
        ]}
      />
      <P>We do not sell personal data.</P>

      <H2>6. Data retention</H2>
      <P>
        We do not currently have automated data retention or deletion schedules. Data is retained indefinitely on
        our servers until you request deletion (see Section 7). Password reset and email verification tokens are
        time-limited for use but are not automatically purged after expiry.
      </P>

      <H2>7. Your rights</H2>
      <P>
        You may have rights under GDPR/CCPA to access, correct, delete, or export your data, and to object to
        certain processing.
      </P>
      <P>
        <strong className="font-medium text-content-primary">Account deletion:</strong> You can permanently delete
        your account and all associated data at any time from Account Settings. This action is immediate and
        irreversible, and removes your library content, collections, research profile, and account information
        from our systems, other than a minimal internal log (retained 30 days) confirming a deletion occurred,
        used only for support/debugging purposes.
      </P>
      <P>
        <strong className="font-medium text-content-primary">Data export:</strong> Corpus does not yet have a
        self-service data export feature. If you&apos;d like a copy of your data, contact us at
        reachmaako@gmail.com and we&apos;ll provide it manually while we build automated export.
      </P>
      <P>
        <strong className="font-medium text-content-primary">California residents (CCPA/CPRA):</strong> the same
        deletion and export rights apply as described above.
      </P>

      <H2>8. Data security</H2>
      <P>Passwords are hashed using bcrypt and are never stored in plaintext. No system is 100% secure.</P>

      <H2>9. Children&apos;s privacy</H2>
      <P>
        Corpus is not directed at children under 13 (16 in the EEA). We do not currently verify age at signup. If
        you believe a child has provided us data, contact reachmaako@gmail.com.
      </P>

      <H2>10. Cookies</H2>
      <P>
        We use a session cookie required for you to stay logged in. This is strictly functional &mdash; we do not
        use analytics or advertising cookies, and no consent banner is currently needed for this reason. If
        analytics tools are added later, this section and a consent mechanism will need to be added at that time.
      </P>

      <H2>11. AI features</H2>
      <P>
        Some features send your content (e.g. entries, queries) to Google&apos;s Gemini API for AI-assisted
        processing. This content is subject to{" "}
        <a
          href="https://ai.google.dev/gemini-api/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-content-primary underline hover:opacity-80"
        >
          Google&apos;s API terms/privacy policy
        </a>
        . We log usage of these features for cost/usage tracking tied to your account.
      </P>

      <H2>12. International data transfers</H2>
      <P>
        Our infrastructure is hosted on AWS in the US East region. If you are located outside the United States,
        your data will be transferred to and processed in the US. For users in the EEA/UK, this means data leaves
        the EEA/UK; we rely on our subprocessors&apos; (Vercel, Neon) own data protection agreements and safeguards
        to help ensure adequate protection.
      </P>

      <H2>13. Changes to this policy</H2>
      <P>
        We&apos;ll update the &ldquo;Last updated&rdquo; date and notify users of material changes via email/in-app
        notice.
      </P>

      <H2>14. Contact</H2>
      <P>
        <a href="mailto:reachmaako@gmail.com" className="text-content-primary underline hover:opacity-80">
          reachmaako@gmail.com
        </a>
      </P>

      <div className="mt-12 pt-6 border-t border-border/50">
        <Link href="/" className="text-sm text-content-tertiary hover:text-content-primary transition-colors">
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
