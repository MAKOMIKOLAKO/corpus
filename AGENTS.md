# AGENTS.md

Guidance for AI coding agents working in `knowledge-indexer` (product name: **Corpus**).

---

## 1. Project Overview

**Corpus** is a collaborative research knowledge management platform for academics and researchers. Core capabilities:

- **Knowledge Library** — personal library of entries (papers, books, articles, blogs, essays, policy reports) with search, filtering, reading status, and notes
- **Automated Research Feed** — daily AI-ranked paper briefings sourced from arXiv and Semantic Scholar, personalized to the user's interest profile
- **Smart Alerts / Watch Queries** — automated saved searches that scan for matching research and surface results as grouped alert containers
- **Collections** — personal and shared collections with role-based access (VIEWER, CONTRIBUTOR, ADMIN); public collections via slug URL
- **AI Reading Assistant & Workspace** — section-aware chat over papers, methodology breakdowns, Q&A (powered by Google Gemini)
- **Bibliography Generation** — APA, MLA, Chicago citation export
- **RSS Feed Management** — subscribe to custom RSS feeds or curated default feeds by category
- **Social Layer** — user connections, entry sharing, reference requests, signals/activity feed
- **Freemium Billing** — FREE vs. PRO vs. LIFETIME_PRO tiers via Stripe

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript (`strict: true`) |
| Database | PostgreSQL via Neon (SSL required) |
| ORM | Prisma 5.22 |
| Auth | NextAuth 4.24 (Google OAuth + Credentials) |
| AI/LLM | Google Gemini (`@google/genai`) |
| Billing | Stripe 20 |
| Email | Resend 6 + `@react-email/render` |
| Rate Limiting | Upstash Redis + `@upstash/ratelimit` (in-memory fallback) |
| Validation | Zod 4 |
| Styling | Tailwind CSS 3.4 + CSS variables |
| UI Primitives | `@base-ui/react`, `@radix-ui/*` |
| Icons | `lucide-react` |
| Animation | `framer-motion` |
| Dates | `date-fns` |
| Charts | `recharts`, `d3` |
| Testing | Jest 30 + Testing Library |

---

## 3. Folder Structure

```
knowledge-indexer/
├── prisma/
│   ├── schema.prisma          # All models, enums, and indexes — source of truth
│   └── migrations/            # Auto-generated migration history
├── scripts/                   # One-off maintenance/backfill scripts (Node.js)
├── src/
│   ├── app/                   # Next.js App Router — pages and API routes
│   │   ├── layout.tsx         # Root layout (providers, fonts, globals)
│   │   ├── globals.css        # CSS custom properties (design tokens)
│   │   ├── api/               # Route handlers: src/app/api/**/route.ts
│   │   │   ├── auth/          # NextAuth + username/email/password flows
│   │   │   ├── entries/       # CRUD + sharing + duplicate detection
│   │   │   ├── collections/   # Collections, members, invites, visibility
│   │   │   ├── connections/   # User-to-user connection requests
│   │   │   ├── watch-queries/ # Smart alert query management
│   │   │   ├── alert-containers/ # Grouped alert results
│   │   │   ├── research/      # Feed, reading sessions, preferences, profiles
│   │   │   ├── workspace/     # Full-text paper workspace sessions and AI chat
│   │   │   ├── rss/           # RSS subscriptions + default feeds
│   │   │   ├── add/           # Paper (Semantic Scholar) and book (Open Library) addition
│   │   │   ├── bibliography/  # Citation generation and saved bibliographies
│   │   │   ├── notifications/ # Notification list + unread count
│   │   │   ├── stripe/        # Checkout, portal, webhook, subscription sync
│   │   │   ├── admin/         # Metrics, costs, feedback, promo codes (admin only)
│   │   │   └── cron/          # Scheduled background jobs (CRON_SECRET required)
│   │   ├── library/           # Main library page
│   │   ├── research/          # Research dashboard and paper reading view
│   │   ├── workspace/         # Advanced reading workspace
│   │   ├── collections/       # Collections dashboard and detail pages
│   │   ├── entries/           # Entry detail pages
│   │   ├── alerts/            # Watch query / alert management
│   │   ├── connections/       # Connections dashboard
│   │   ├── notifications/     # Notification center
│   │   ├── admin/             # Admin dashboard pages
│   │   ├── [username]/        # Public profile short URL
│   │   └── c/[slug]/          # Public collection view
│   ├── components/
│   │   ├── ui/                # Base UI primitives (Button, Card, Input, Dialog, etc.)
│   │   ├── research/          # Research-specific components (ReadingAssistant, etc.)
│   │   ├── alerts/            # Alert management UI
│   │   ├── admin/             # Admin dashboard components
│   │   └── AppShell.tsx       # Main authenticated layout (nav, sidebar, notifications)
│   ├── lib/                   # Shared server and client utilities
│   │   ├── authOptions.ts     # NextAuth configuration
│   │   ├── session.ts         # getCurrentUserId() helper
│   │   ├── prisma.ts          # Singleton Prisma client
│   │   ├── prismaWithRetry.ts # Prisma with retry logic — prefer this in API routes
│   │   ├── validation.ts      # All Zod schemas — reuse before writing new ones
│   │   ├── plans.ts           # Plan limits and feature gate functions
│   │   ├── globalEntryService.ts # Save/deduplicate entries across users
│   │   ├── entryQueries.ts    # Reusable UserEntry/GlobalEntry query builders
│   │   ├── geminiClient.ts    # Google Gemini API wrapper
│   │   ├── geminiCost.ts      # Cost tracking for Gemini calls
│   │   ├── email.ts           # Send emails via Resend
│   │   ├── stripe.ts          # Stripe client and helpers
│   │   ├── adminAuth.ts       # Admin authorization checks
│   │   ├── rateLimit.ts       # In-memory rate limiting
│   │   ├── corsHeaders.ts     # CORS response headers
│   │   ├── utils.ts           # cn() class merger + misc helpers
│   │   ├── dateUtils.ts       # Date formatting helpers
│   │   ├── urlUtils.ts        # URL parsing and normalization
│   │   ├── collectionPermissions.ts # Collection RBAC helpers
│   │   ├── alertProcessor.ts  # Process watch query results
│   │   ├── bibliography.ts    # Citation formatting
│   │   └── research/          # Research pipeline (scoring, embeddings, clustering, feed)
│   ├── types/
│   │   ├── entry.ts           # FlatEntry interface (library display)
│   │   └── next-auth.d.ts     # Session type augmentation
│   ├── tests/                 # Jest unit and integration tests
│   └── middleware.ts          # Auth, rate limiting, redirect logic for all requests
├── DESIGN.md                  # Design system — read before any UI change
├── AGENTS.md                  # This file
└── tailwind.config.ts         # Design token definitions
```

---

## 4. Environment Variables

All secrets must come from environment variables — never hardcode.

### Database
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon, must include `sslmode=require`) |
| `DIRECT_URL` | Direct connection for Prisma migrations (optional) |

### Authentication
| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | JWT signing secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App origin, e.g. `https://usecorpus.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ALLOWED_GOOGLE_EMAIL` | Allowlist a single Google email for dev/testing (optional) |
| `ADMIN_USER_IDS` | Comma-separated user IDs with admin access |

### AI
| Variable | Purpose |
|---|---|
| `GOOGLE_AI_API_KEY` | Google Gemini API key |
| `GEMINI_API_KEY` | Fallback alias for `GOOGLE_AI_API_KEY` |

### External APIs
| Variable | Purpose |
|---|---|
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar paper search |
| `OPENALEX_API_KEY` | OpenAlex paper search (optional) |
| `YOUTUBE_API_KEY` | YouTube video metadata (optional) |

### Email
| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend email service |
| `EMAIL_FROM` | Sender address, e.g. `noreply@usecorpus.app` |

### Stripe
| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side publishable key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_MONTHLY_PRICE_ID` | Monthly subscription price ID |
| `STRIPE_ANNUAL_PRICE_ID` | Annual subscription price ID |

### App Config
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `CORS_ORIGIN` | Override CORS Allow-Origin header (optional) |
| `CRON_SECRET` | Bearer token required by all `/api/cron/*` routes |

### Rate Limiting (optional)
| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

---

## 5. Data Architecture

### Dual-Entry System (important)

The codebase is mid-migration from a single `Entry` model to a split architecture:

- **`GlobalEntry`** — shared, deduplicated metadata stored once per unique piece of content. Deduplicated by DOI, ISBN, canonical URL, or content hash. Tracks aggregate save counts.
- **`UserEntry`** — per-user state: reading status, notes, which collections it belongs to, timestamps. References a `GlobalEntry`.
- **`Entry`** (legacy) — the old monolithic model still referenced in some routes. Being phased out via migration scripts.

When adding new entry-related features, use `UserEntry`/`GlobalEntry` patterns. Use `src/lib/globalEntryService.ts` to save/deduplicate, and `src/lib/entryQueries.ts` for query builders.

### Key Prisma Models

| Model | Purpose |
|---|---|
| `User` | Account with plan, subscription fields, username, profile |
| `GlobalEntry` | Shared deduplicated entry metadata |
| `UserEntry` | Per-user entry state (reading status, notes) |
| `Collection` | Personal, shared, or public collection |
| `CollectionMember` | Member + role for shared collections |
| `WatchQuery` | Automated saved search query |
| `AlertContainer` | Grouped results from a WatchQuery run |
| `AlertEntry` | Individual paper suggestion within an alert |
| `Connection` | User-to-user connection (PENDING / ACCEPTED / DECLINED / BLOCKED) |
| `SharedEntry` | Entry shared from one user to another |
| `CandidatePaper` | Paper indexed for the research feed (with embeddings) |
| `UserResearchProfile` | User's interest vector and domain weights |
| `DailyBrief` | Daily ranked paper selection per user |
| `PaperWorkspaceSession` | Advanced reading workspace session |
| `WorkspaceMessage` | Chat history within a workspace |
| `Notification` | In-app notifications (alerts, connections, shares, invites) |
| `GeminiApiCall` | Cost tracking for each Gemini API call |
| `QueueItem` | Async background processing queue |

### Key Enums

| Enum | Values |
|---|---|
| `Plan` | `FREE`, `PRO`, `LIFETIME_PRO` |
| `ContentType` | `PAPER`, `BOOK`, `ARTICLE`, `BLOG`, `ESSAY`, `POLICY_REPORT`, `OTHER` |
| `ReadingStatus` | `UNREAD`, `READING`, `READ`, `BACKLOG`, `IN_PROGRESS`, `COMPLETED`, `DROPPED` |
| `CollectionRole` | `VIEWER`, `CONTRIBUTOR`, `ADMIN` |
| `ConnectionStatus` | `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED` |

---

## 6. Authentication and Sessions

### Providers
- **Google OAuth** — `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Users are upserted on every login (auto-creates username on first login).
- **Credentials** — email + bcryptjs-hashed password (12 rounds). Signup sends a verification email asynchronously.

### JWT Strategy
- 30-day max session age, 24-hour refresh window.
- Session tokens include: `userId`, `plan`, `username`, `emailVerified`, `isAdmin`.
- User data is re-fetched from DB on every session refresh to keep plan/subscription current.
- Admin status is derived from `ADMIN_USER_IDS` env variable.

### Middleware (`src/middleware.ts`)
Request flow (in order):
1. OPTIONS passthrough (CORS preflight)
2. Skip JWT parsing for `/api/cron/*` and `/api/test-cron` (use Bearer token auth instead)
3. Rate limit auth endpoints: 10 requests / 15 min per IP
4. Rate limit API endpoints: 100 requests / min per userId or IP
5. Allow public pages: `/`, `/login`, `/signup`, `/pricing`, `/privacy`, `/forgot-password`, `/setup-username`, `/reset-password/*`, `/verify-email/*`, `/c/*`, `/profile/*`, single-segment paths (treated as `/:username` public profiles)
6. Allow public API paths: `/api/auth/*`, `/api/stripe/webhook`, `/api/profile/*`, `/api/cron/*`
7. Redirect authenticated users away from `/login` and `/signup` to `/library`
8. Require valid JWT for all other routes

### Authenticating in Route Handlers
```ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const userId = session.user.id
```

Or use the helper from `src/lib/session.ts`:
```ts
import { getCurrentUserId } from '@/lib/session'
const userId = await getCurrentUserId() // throws if unauthenticated
```

---

## 7. Plan / Feature Gate System

All plan checks live in `src/lib/plans.ts`. **Always use these functions** — never inline plan comparisons.

```ts
import { getUserLimits, canAddEntry, isPro, canUseResearchFeed } from '@/lib/plans'

// Check a boolean feature
const { allowed, reason } = canUseResearchFeed(user.plan)
if (!allowed) return NextResponse.json({ error: reason }, { status: 403 })

// Check a count-based limit
const { allowed } = canAddEntry(user.plan, currentCount)

// Quick PRO check
if (!isPro(user.plan)) { /* restrict */ }
```

### Plan Feature Matrix

| Feature | FREE | PRO / LIFETIME_PRO |
|---|---|---|
| Max entries | 50 | Unlimited |
| Max personal collections | 1 | Unlimited |
| Max RSS feeds | 1 | Unlimited |
| Shared collections (create/contribute) | No | Yes |
| Batch actions | No | Yes |
| Advanced search | No | Yes |
| Bibliography generation | No | Yes |
| Research feed | No | Yes |
| Reading assistant (feed) | No | Yes |
| Paper comparison | No | Yes |

---

## 8. API Route Conventions

### File location
Every route is a `route.ts` file under `src/app/api/**/route.ts`. Export named functions (`GET`, `POST`, `PATCH`, `DELETE`) — no default exports.

### Standard handler pattern
```ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { prisma } from '@/lib/prismaWithRetry'
import { mySchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = mySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
  }

  // ... business logic using `prisma`

  return NextResponse.json({ result })
}
```

### Key conventions
- Use `@/lib/prismaWithRetry` (not `@/lib/prisma` directly) for resilience in networked DB calls.
- Validate all request bodies with Zod (`safeParse`) using schemas from `src/lib/validation.ts`. Add new schemas there rather than inline.
- Return `NextResponse.json(...)` with explicit status codes (200, 201, 400, 401, 403, 404, 409, 500).
- Apply CORS headers where needed via `src/lib/corsHeaders.ts`.
- Never expose internal error messages or stack traces to the client.

### Cron route authentication
All `/api/cron/*` routes require a `CRON_SECRET` Bearer token (set by Vercel cron or the caller):
```ts
const authHeader = req.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Admin route authentication
Use `src/lib/adminAuth.ts`:
```ts
import { requireAdmin } from '@/lib/adminAuth'
await requireAdmin(session) // throws/returns error response if not admin
```

---

## 9. Key Utilities to Reuse

Before writing new utilities, check these existing ones:

| Utility | Location | Use for |
|---|---|---|
| `prisma` (with retry) | `@/lib/prismaWithRetry` | All DB queries in API routes |
| `getCurrentUserId()` | `@/lib/session` | Get authenticated user ID |
| Zod schemas | `@/lib/validation` | Input validation — add new schemas here |
| `getUserLimits()`, `isPro()`, `canUse*()` | `@/lib/plans` | Feature gates |
| `globalEntryService` | `@/lib/globalEntryService` | Save/deduplicate entries |
| `entryQueries` | `@/lib/entryQueries` | UserEntry/GlobalEntry query builders |
| `cn(...)` | `@/lib/utils` | Tailwind class merging |
| `corsHeaders` | `@/lib/corsHeaders` | CORS response headers |
| `requireAdmin()` | `@/lib/adminAuth` | Admin-only route guard |
| `sendEmail()` | `@/lib/email` | Send transactional email via Resend |
| `trackGeminiCost()` | `@/lib/geminiCost` | Log AI API costs to DB |
| `collectionPermissions` | `@/lib/collectionPermissions` | Check RBAC for collections |
| `formatDate()`, etc. | `@/lib/dateUtils` | Date formatting |
| `normalizeUrl()`, etc. | `@/lib/urlUtils` | URL parsing and normalization |

---

## 10. Preferred Libraries

Use existing dependencies — do not introduce new packages without clear justification.

| Need | Use |
|---|---|
| UI components | `src/components/ui/*`, `@base-ui/react`, `@radix-ui/*` |
| Class composition | `cn()` from `@/lib/utils` (uses `clsx` + `tailwind-merge`) |
| Variant styles | `class-variance-authority` |
| Validation | `zod` |
| Date handling | `date-fns` |
| Icons | `lucide-react` |
| Animation | `framer-motion` (where already used) |
| Toast notifications | `sonner` |
| Charts | `recharts` or `d3` |
| Auth | `next-auth` |
| DB | `@prisma/client` |
| AI | `@google/genai` |
| Email | `resend` + `@react-email/render` |

---

## 11. UI and Design Rules

**Always read `DESIGN.md` before making any UI changes.**

Key principles:
- Warm Claude-inspired aesthetic: parchment canvas (`#f5f4ed`), terracotta accent (`#c96442`), warm-toned neutrals throughout — no cool blue-grays except Focus Blue for accessibility.
- Serif/sans typographic hierarchy: serif headings (`font-serif`), sans-serif UI text (`font-sans`).
- Ring-based shadow system (`0px 0px 0px 1px`) instead of heavy drop shadows.
- All design tokens are CSS custom properties in `src/app/globals.css` and mapped in `tailwind.config.ts`. Use Tailwind utility classes rather than arbitrary values.
- Dark mode is supported — use `dark:` variants, not hardcoded colors.
- Maintain accessibility: `focus-visible`, `aria-*` attributes, reduced motion support, skip links.
- Components in `src/components/ui/` follow the existing patterns — extend them rather than creating parallel implementations.

---

## 12. Cron Jobs

All cron routes live in `src/app/api/cron/` and require `Authorization: Bearer ${CRON_SECRET}`.

| Route | Purpose | Typical Schedule |
|---|---|---|
| `/api/cron/smart-alerts` | Process all active WatchQueries and create AlertContainers | Daily |
| `/api/cron/research-feeds` | Generate personalized DailyBrief for each PRO user | Daily |
| `/api/cron/research-index` | Index new CandidatePapers from arXiv/sources | Daily |
| `/api/cron/research-ingest` | Ingest paper metadata into the candidate pool | Daily |
| `/api/cron/research-profiles` | Update UserResearchProfile interest vectors | Daily |
| `/api/cron/daily-metrics-snapshot` | Snapshot user/engagement metrics | Daily |
| `/api/cron/cost-snapshot` | Snapshot Gemini API costs by user/feature | Daily |

---

## 13. Required Commands

```bash
npm run dev           # Start local development server (port 3000)
npm run build         # Production build
npm run start         # Run production server
npm run lint          # ESLint (Next config)
npm run test          # Jest tests
npm run test:watch    # Jest watch mode
npm run test:coverage # Coverage report
npm run test:ci       # CI-style (no watch, with coverage)
```

After any `prisma/schema.prisma` change:
```bash
npx prisma generate   # Regenerate Prisma client types
npx prisma migrate dev --name <description>  # Apply migration in dev
```

One-off maintenance scripts (in `scripts/`):
```bash
npm run backfill-owner           # Backfill entry owners
npm run backfill-research-papers # Ingest arXiv papers
npm run migrate-legacy-entries   # Migrate Entry → UserEntry/GlobalEntry
npm run add-keywords             # Backfill keywords on existing entries
```

---

## 14. Testing and Verification

After code changes, run checks in order:

1. **Targeted tests**: `npm run test -- <pattern>` (match test file name or describe block)
2. **Lint**: `npm run lint`
3. **Full test suite**: `npm run test` (or `npm run test:ci`)
4. **Build check**: `npm run build` — run this for routing changes, new API routes, or anything that affects the Next.js build

Tests live in `src/tests/`. Follow existing patterns (Jest + Testing Library, `jsdom` environment). Do not fix unrelated failing tests unless explicitly asked.

> **Note:** `package.json` documents that `npm audit` may report high severity in `next@14`. Do not run `npm audit fix --force` — review advisories first.

---

## 15. Scope and Change Discipline

- Keep changes minimal and focused on the task.
- Prefer extending existing patterns over creating parallel architectures.
- Do not rename or move files unless the task explicitly requires it.
- Do not revert or modify code you did not write.
- Do not add dependencies without checking if equivalent functionality exists in the repo.
- Do not add comments explaining what code does — only add them when the *why* is non-obvious.
- TypeScript: maintain `strict: true`; avoid `any` unless absolutely unavoidable.
- Use `@/*` path aliases for all imports within `src/`.
- Preserve the local style of each file (semicolons, quotes, spacing) when editing.
