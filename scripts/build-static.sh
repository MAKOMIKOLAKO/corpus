#!/bin/bash

# Build static SEO pages for production
echo "🚀 Building static SEO pages..."

# First, generate the seed data if needed
echo "📝 Checking seed data..."
node dist/seed-seo-content.js

# Build the Next.js application
echo "🔨 Building Next.js app..."
npm run build

echo "✅ Build complete!"
echo "📊 Static pages generated:"
echo "   - /papers (index of all papers)"
echo "   - /topics (index of all topics)"
echo "   - /paper/[slug] (individual paper pages)"
echo "   - /topics/[slug] (topic pages)"
echo "   - /top/[topic] (top papers by topic)"
echo ""
echo "🌐 Sitemap and robots.txt configured for SEO"
