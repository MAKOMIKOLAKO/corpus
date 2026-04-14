# Corpus: User-Facing Features Overview

## Product Positioning

**Corpus** is an automated research feed and knowledge management system designed for researchers, academics, and knowledge workers. The platform automatically tracks new research papers from your favorite journals and sources, delivering a daily feed with AI-generated summaries so you never miss important research in your field.

---

## Core Features

### 1. Automated Research Feed

**Stop searching for papers. New research appears automatically—summarized, deduplicated, and ready to save.**

- **Smart Source Tracking**: Add topics, journals, or RSS feeds and Corpus continuously monitors them for new publications
- **Daily Briefs**: Receive personalized daily recommendations based on your research interests and reading history
- **AI-Powered Ranking**: Papers are scored using semantic similarity, domain relevance, novelty indicators, citation patterns, and your engagement history
- **Deduplication**: Automatically merges preprints with published versions, eliminating duplicate content
- **Multi-Source Aggregation**: Supports arXiv, Semantic Scholar, Crossref, Open Library, custom RSS feeds, and URL-based content discovery

### 2. Knowledge Library

**Browse and search your personal knowledge base with powerful filtering and organization tools.**

- **Unified Entry Management**: Save papers, books, articles, blog posts, essays, and policy reports in one place
- **Advanced Search**: Full-text search across titles, authors, abstracts, and user notes
- **Smart Filtering**: Filter by reading status (Unread, In Progress, Completed), year, topic, and collection
- **Flexible Sorting**: Sort by newest, oldest, title, or most-saved
- **Reading Status Tracking**: Track progress through Unread → In Progress → Completed workflow
- **Duplicate Detection**: Automatic duplicate detection when adding new entries prevents redundancy

### 3. Collections & Organization

**Save papers to custom collections. Organize your thinking seamlessly.**

- **Personal Collections**: Create unlimited collections to organize entries by project, topic, or research area
- **Shared Collections**: Collaborate with others through shared collections with role-based permissions (Viewer, Contributor, Admin)
- **Collection Management**: Add/remove entries, manage members, and control access
- **Public Collections**: Make collections public with custom descriptions and track view counts
- **Batch Operations**: Add multiple entries to collections at once (Pro feature)

### 4. Smart Alerts & Watch Queries

**Set up automated queries that continuously scan for matching research.**

- **Query-Based Monitoring**: Create watch queries with specific search terms, keywords, or phrases
- **Collection-Specific Alerts**: Link alerts to specific collections for targeted research tracking
- **Daily Alert Digest**: Receive scheduled email alerts at your preferred time
- **Alert Management**: Review, approve, or dismiss alert-suggested papers
- **Max Results Control**: Configure how many papers each alert returns (default: 5)

### 5. AI-Powered Research Assistance

**Every paper is instantly summarized. Skim hours of research in minutes.**

- **AI Summaries**: Automatic plain-language and technical summaries for all papers
- **Reading Assistant**: Chat with an AI that has read the full paper, asking questions about methodology, results, and implications
- **Methodology Breakdown**: One-click detailed explanation of research methods and experimental design
- **Semantic Search**: Discover related papers using natural language queries across the entire corpus
- **Why Explanations**: Understand why each paper was recommended to you with personalized explanations

### 6. Research Reading System

**Deep-dive into papers with an AI-powered reading workspace.**

- **Paper Discovery Tab**: Pro feature that searches the full research corpus with semantic ranking
- **Workspace Tab**: Dedicated reading environment for saved papers with AI assistance
- **Reading Sessions**: Persistent chat sessions with paper-specific context and message history
- **Section-Aware AI**: The assistant references specific paper sections when answering questions
- **Session History**: Resume previous reading sessions and review past Q&A

### 7. Bibliography Generation

**Generate perfectly formatted citations in seconds.**

- **Multiple Citation Styles**: APA, MLA, and Chicago citation formats
- **Flexible Ordering**: Alphabetical by author, chronological, or order of selection
- **Group by Type**: Option to group citations by content type (papers, books, articles)
- **Related Work Paragraph**: AI-generated "Related Work" section summarizing the selected papers
- **Duplicate Handling**: Automatic deduplication of citations
- **Missing Field Warnings**: Alerts for entries missing required citation fields
- **Export Options**: Copy to clipboard or save for later use

### 8. Collaboration & Sharing

**Share research with colleagues and build collective knowledge.**

- **Entry Sharing**: Share individual papers with specific users via username or email search
- **Connection System**: Send and accept connection requests to build your research network
- **Shared Collections**: Create collaborative collections with role-based access control
- **Collection Invites**: Invite users to collections with Viewer, Contributor, or Admin roles
- **Reference Requests**: Request full-text PDFs or additional materials from other users
- **Public Profiles**: Customizable usernames and public profile pages

### 9. RSS Feed Management

**Subscribe to any RSS feed and integrate it into your research workflow.**

- **Custom RSS Feeds**: Add any RSS feed URL to track blogs, journals, and news sources
- **Default Feed Catalog**: Browse and subscribe to curated feeds across categories
- **Feed Discovery**: Discover new feeds by domain or category
- **Real-Time Updates**: Feeds are polled continuously for new content
- **One-Click Save**: Add feed entries directly to your library with metadata extraction

### 10. Entry Addition

**Add papers, books, and URLs from anywhere with intelligent metadata extraction.**

- **Paper Search**: Search Semantic Scholar and Open Library databases by title, author, or DOI
- **Book Search**: Find books with ISBN lookup and Open Library integration
- **URL Import**: Add any URL with automatic content extraction and metadata parsing
- **Queue Processing**: Background queue handles large batches with status tracking
- **Duplicate Prevention**: Automatic duplicate detection before adding
- **AI Metadata Extraction**: Automatic extraction of authors, abstracts, publication dates, and more

### 11. Notifications

**Stay informed about activity relevant to your research.**

- **Smart Alert Notifications**: Notifications for new papers matching your watch queries
- **Connection Requests**: Notifications when someone sends you a connection request
- **Shared Entries**: Notifications when someone shares a paper with you
- **Collection Invites**: Notifications when invited to join a shared collection
- **Notification Center**: Centralized notification dropdown with unread indicators
- **Mark as Read**: Bulk mark notifications as read

### 12. User Account & Profile

**Personalize your research experience with customizable settings.**

- **Authentication**: Sign up with Google OAuth or email/password
- **Username System**: Custom username for profile URLs and sharing
- **Profile Customization**: Add bio and customize your public profile
- **Timezone Sync**: View dates and times in your local timezone
- **Email Verification**: Secure email verification for account security
- **Password Reset**: Self-service password recovery via email

---

## Pricing Tiers

### Free Plan

**Perfect for getting started with personal research management.**

- 50 saved entries
- 1 personal collection
- Join shared collections as viewer
- Paper and book search
- AI metadata extraction
- Full-text search
- Chrome extension
- Research connections and labs

### Pro Plan ($7/month or $60/year)

**For serious researchers who need unlimited power.**

**Everything in Free, plus:**
- Unlimited saved entries
- Unlimited personal collections
- Create shared collections with role-based permissions
- Contribute to shared collections
- Batch entry actions
- Priority queue processing
- Research Reading System (Paper Discovery tab)
- Early access to new features

### Lifetime Pro

**One-time payment for permanent Pro access.**

- All Pro features
- No recurring subscription
- Priority support

---

## Technical Features

### Data Management

- **Global Entry Database**: Shared knowledge base with deduplication across all users
- **User-Specific State**: Per-user reading status, notes, and collection memberships
- **Content Hashing**: SHA-256 hashing for robust deduplication
- **Multiple Deduplication Keys**: DOI, ISBN, normalized title/author/year, and canonical URL

### Integration

- **Chrome Extension**: Browser extension for quick entry addition from any webpage
- **API Access**: RESTful API for programmatic access to all features
- **RSS Export**: Generate RSS feeds for collections and research queries
- **Semantic Scholar Integration**: Direct access to paper metadata and citations
- **Open Library Integration**: Book metadata and cover images

### Security & Privacy

- **Secure Authentication**: NextAuth with Google OAuth and credential-based login
- **Email Verification**: Required email verification for account security
- **API Key Authentication**: Secure API key system for external integrations
- **Role-Based Access Control**: Granular permissions for collections and shared resources
- **Data Encryption**: Secure storage of sensitive data (passwords, tokens)

---

## User Experience

### Design Philosophy

Corpus features a warm, Claude-inspired design language with:
- Parchment-toned canvas evoking premium paper
- Anthropic Serif typography for headlines with gravitas
- Terracotta brand accent for primary actions
- Warm neutral palette with yellow-brown undertones
- Organic, hand-drawn-feeling illustrations
- Ring-shadow depth system for subtle elevation
- Generous whitespace and editorial pacing

### Responsive Design

- Mobile-first responsive layout
- Touch-friendly interface with 44px minimum touch targets
- Collapsible navigation on mobile
- Optimized card grids for all screen sizes

### Accessibility

- Focus-visible states for keyboard navigation
- Skip links for screen readers
- Semantic HTML structure
- ARIA labels and roles
- Reduced motion support
- High contrast color ratios

---

## Coming Soon

Based on the codebase, the following features are noted as in development:

- **Workspace Tab Enhancement**: "We're rebuilding the paper workspace experience. For now, use Discover and RSS while we finish the next version."
- Additional research tools and integrations are continuously being developed

---

## Use Cases

### For Academics
- Track publications in your field across multiple journals
- Maintain a comprehensive bibliography for literature reviews
- Collaborate with co-authors on shared reading lists
- Generate citations for papers in your preferred format

### For Researchers
- Stay current with daily AI-curated paper recommendations
- Deep-dive into complex papers with AI reading assistant
- Organize research by project or hypothesis
- Discover related work through semantic search

### For Students
- Build a personal knowledge base for thesis work
- Get AI help understanding dense academic papers
- Organize sources by course or topic
- Generate bibliographies for assignments

### For Knowledge Workers
- Curate industry news and thought leadership
- Track competitor research and publications
- Share insights with team members
- Maintain a searchable archive of important reads
