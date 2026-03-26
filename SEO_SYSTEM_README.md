# Corpus SEO Content System

This document describes the SEO-friendly content system built for Corpus to attract organic search traffic from researchers, students, and academics.

## Overview

The system generates programmatic, indexable pages that rank for queries like:
- "paper summary [paper title]"
- "what is [research topic]"
- "top papers on [topic]"
- "[doi] summary"
- "[paper title] explained"

## Architecture

### Database Schema

#### Entry Model (Extended)
- `slug`: URL-friendly identifier for papers
- `metaDescription`: SEO-optimized meta description
- Existing fields: title, authors, year, abstract, topics, summary, etc.

#### Topic Model (New)
- `slug`: URL-friendly identifier
- `name`: Display name
- `description`: Short description for meta tags
- `explanation`: Detailed explanation (2-3 paragraphs)
- `keyConcepts`: Array of important concepts

### Routes

1. **`/paper/[slug]`** - Individual paper summary pages
   - Full paper metadata
   - Abstract and summary
   - Key contributions
   - Related topics and papers
   - JSON-LD structured data (ScholarlyArticle)

2. **`/topics/[slug]`** - Topic overview pages
   - Plain-language explanation
   - Key concepts
   - Related papers
   - Internal linking to similar topics
   - JSON-LD structured data (Article)

3. **`/top/[topic]`** - Curated paper lists by topic
   - Ranked list of papers
   - One-line summaries
   - Navigation to related topics
   - JSON-LD structured data (CollectionPage)

4. **`/papers`** - Browse all papers
   - Search and filter functionality
   - Topic-based filtering
   - Sort options

5. **`/topics`** - Browse all topics
   - Topic cards with paper counts
   - Key concepts preview

## SEO Features

### Metadata
- Dynamic `<title>` tags
- Meta descriptions
- OpenGraph tags
- Canonical URLs
- Breadcrumb navigation

### Structured Data (JSON-LD)
- ScholarlyArticle schema for papers
- Article/DefinedTerm for topics
- CollectionPage for top papers lists

### Internal Linking
- Every paper links to 3-5 topics
- Every paper links to 3-5 similar papers
- Every topic links to multiple papers
- Strong internal linking graph

### Technical SEO
- Static generation with `generateStaticParams`
- Sitemap.xml with all pages
- Robots.txt configuration
- Fast load times
- Mobile-responsive design

## Content Generation

### Seed Data Script
Location: `scripts/seed-seo-content.ts`

Generates:
- 10 real academic papers (Transformer, BERT, GPT-3, etc.)
- 90 synthetic papers across various fields
- 10 comprehensive topics

### Running the Seed Script
```bash
npx tsc scripts/seed-seo-content.ts --outDir dist
node dist/seed-seo-content.js
```

## Styling

The pages use:
- Minimal, academic aesthetic
- Clean typography
- Tailwind CSS for styling
- Lucide React icons
- No heavy UI components

## Performance

- Static generation preferred
- Efficient database queries
- Optimized images
- Minimal JavaScript

## Future Enhancements

1. **Automated Content Updates**
   - Periodic paper additions
   - Topic expansion
   - Trending research areas

2. **Advanced Search**
   - Full-text search
   - Faceted search
   - Search analytics

3. **User Engagement**
   - Paper ratings
   - Reading lists
   - Citation tracking

4. **Content Expansion**
   - More research fields
   - Video summaries
   - Interactive visualizations

## Monitoring

Track these metrics:
- Organic traffic growth
- Keyword rankings
- Page load times
- User engagement
- Conversion to sign-ups

## Best Practices

1. **Content Quality**
   - Accurate summaries
   - Proper citations
   - Academic tone
   - No marketing fluff

2. **SEO Guidelines**
   - Unique meta descriptions
   - Proper header hierarchy
   - Alt text for images
   - Descriptive anchor text

3. **User Experience**
   - Fast page loads
   - Mobile-friendly
   - Clear navigation
   - Accessible design

## Deployment

The system is designed for:
- Vercel (recommended)
- Netlify
- Any Next.js compatible platform

Build command:
```bash
npm run build
```

The static generation will pre-build all pages at deploy time for optimal performance.
