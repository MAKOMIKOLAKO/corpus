# SEO Verification Checklist

This checklist verifies that all SEO optimizations have been implemented correctly.

## Part 1: Metadata Completeness ✅

- [x] Root layout metadata updated (description truncated, category, authors URL, canonical URL, Google verification placeholder removed)
- [x] Landing page has canonical URL and proper metadata
- [x] Pricing page has canonical URL, correct title format, and robots directive
- [x] Privacy page has canonical URL, correct title format, and robots directive
- [x] Public collection page has dynamic generateMetadata with canonical, robots, and proper title format
- [x] Public profile page has dynamic generateMetadata with canonical, robots, and proper title format
- [x] Old `/[username]` route has noindex and canonical pointing to `/profile/[username]`
- [x] All authenticated routes have noindex metadata
- [x] All auth routes have noindex metadata
- [x] Server component wrappers created for client pages needing metadata

**Verification Steps:**
1. Visit each public page and check the `<head>` section for metadata
2. Verify canonical URLs are correct on each page
3. Check that noindex is only applied to authenticated/auth routes
4. Use a browser extension to view page metadata

## Part 2: Structured Data (JSON-LD) ✅

- [x] SoftwareApplicationJsonLd component created with correct URL and complete schema
- [x] WebSiteJsonLd component created
- [x] OrganizationJsonLd component created
- [x] FAQPageJsonLd component created
- [x] ProductJsonLd component created
- [x] CollectionPageJsonLd component created
- [x] PersonJsonLd component created
- [x] Landing page has WebSite and Organization JSON-LD
- [x] Pricing page has FAQPage and Product JSON-LD
- [x] Public collection page has CollectionPage JSON-LD
- [x] Public profile page has Person JSON-LD

**Verification Steps:**
1. Use [Google Rich Results Test](https://search.google.com/test/rich-results) to validate JSON-LD
2. Check each page's source for `<script type="application/ld+json">` tags
3. Validate JSON structure using [Schema.org Validator](https://validator.schema.org/)

## Part 3: Sitemap with Dynamic Routes ✅

- [x] Sitemap includes static pages (/, /pricing, /privacy)
- [x] Sitemap includes dynamic public collections
- [x] Sitemap includes dynamic public profiles
- [x] Sitemap has proper priority values
- [x] Sitemap uses createdAt for lastModified

**Verification Steps:**
1. Visit `https://usecorpus.app/sitemap.xml` and verify it loads
2. Check that all static pages are included
3. Verify dynamic routes are included (collections, profiles)
4. Validate sitemap using [Google Search Console](https://search.google.com/search-console/sitemap)

## Part 4: Robots.txt Updates ✅

- [x] Robots.txt disallows all authenticated routes
- [x] Robots.txt disallows all auth routes
- [x] Robots.txt disallows admin routes
- [x] Robots.txt allows public pages
- [x] Sitemap reference included

**Verification Steps:**
1. Visit `https://usecorpus.app/robots.txt` and verify it loads
2. Check that authenticated routes are properly disallowed
3. Verify sitemap reference is correct

## Part 5: Canonical URLs ✅

- [x] Root layout has canonical URL
- [x] Landing page has canonical URL
- [x] Pricing page has canonical URL
- [x] Privacy page has canonical URL
- [x] Public collection page has canonical URL
- [x] Public profile page has canonical URL
- [x] Old `/[username]` route has canonical pointing to `/profile/[username]`

**Verification Steps:**
1. Check each page for `<link rel="canonical">` tag
2. Verify canonical URLs match the actual page URLs
3. Ensure no canonical loops or self-references

## Part 6: Open Graph and Social Sharing ✅

- [x] Root layout has OG metadata
- [x] Static OG image exists at `/og-image.png`
- [x] OG metadata includes title, description, type, images

**Verification Steps:**
1. Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to test OG tags
2. Use [Twitter Card Validator](https://cards-dev.twitter.com/validator) to test Twitter cards
3. Check that OG images load correctly

## Part 7: Technical SEO and Performance ✅

- [x] Viewport meta tag added
- [x] Theme-color meta tag added (light and dark mode)
- [x] Preconnect hints for Google Fonts added
- [x] Font loading strategy using next/font/google

**Verification Steps:**
1. Run Lighthouse audit and check performance score
2. Verify viewport meta tag is present
3. Check that fonts load efficiently
4. Verify theme-color is correct in both light and dark modes

## Part 8: Content SEO ✅

- [x] Heading hierarchy is correct on landing page
- [x] Heading hierarchy is correct on pricing page
- [x] Internal links exist between related pages

**Verification Steps:**
1. Check heading hierarchy using browser extension or manual inspection
2. Verify internal links work correctly
3. Check that alt text is present on images (if any)

## Part 11: Page Speed and Rendering (SSR, ISR) ✅

- [x] Landing page has revalidate (3600s)
- [x] Pricing page has revalidate (86400s)
- [x] Privacy page has revalidate (604800s)
- [x] Public collection page has revalidate (3600s)
- [x] Public profile page has revalidate (3600s)

**Verification Steps:**
1. Check that pages load quickly
2. Verify that ISR is working by checking response headers
3. Run Lighthouse audit to measure performance

## Final Verification Steps

### Automated Checks
1. Run Lighthouse audit on all public pages
2. Use Google Rich Results Test for JSON-LD validation
3. Validate sitemap.xml using Search Console
4. Check robots.txt accessibility

### Manual Checks
1. Visit each public page and verify metadata
2. Check canonical URLs
3. Verify noindex is only on authenticated routes
4. Test social sharing previews
5. Check mobile responsiveness

### Tools to Use
- [Google Search Console](https://search.google.com/search-console)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Post-Implementation Actions

1. Submit sitemap to Google Search Console
2. Monitor Search Console for crawl errors
3. Track indexing status of new pages
4. Monitor Core Web Vitals
5. Set up Google Analytics (if not already done)
