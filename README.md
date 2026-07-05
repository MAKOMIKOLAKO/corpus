# Corpus

Corpus is a collaborative research knowledge-management platform for academics and researchers. Build a personal library of scholarly content (papers, books, articles, blogs, essays, policy reports), get a daily AI-ranked research feed personalized to your interests, run smart alerts against arXiv/Semantic Scholar, read papers with an AI reading assistant, organize work into personal/shared/public collections, generate bibliographies, and connect with other researchers.

Built with Next.js 14 (App Router), PostgreSQL (Neon) via Prisma, and Google Gemini for AI features.

## Tech stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript (strict)
- **Database:** PostgreSQL (Neon), via Prisma ORM
- **Auth:** NextAuth (Google OAuth + email/password credentials)
- **AI:** Google Gemini (summarization, reading assistant, embeddings/feed ranking)
- **Billing:** Stripe (checkout, portal, webhooks)
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Testing:** Jest + Testing Library

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (this project targets [Neon](https://neon.tech), but any Postgres instance with SSL will work)

### Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   See [Environment variables](#environment-variables) below for what's required vs. optional.

3. Run database migrations and generate the Prisma client:

   ```bash
   npx prisma migrate dev
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Start the production server (after `build`) |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Jest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Environment variables

All variables are documented with placeholder values in [`.env.example`](.env.example). At minimum, you'll need:

- `DATABASE_URL` — Postgres connection string (`sslmode=require`)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — NextAuth session config
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials (optional if you only want email/password auth)
- `GOOGLE_AI_API_KEY` (or `GEMINI_API_KEY`) — required for AI features (summarization, reading assistant, research feed ranking); the app runs without it but AI-dependent features will be disabled

Optional integrations (Stripe billing, Resend email, Semantic Scholar, Upstash rate limiting) are only needed if you're using those specific features — see comments in `.env.example`.

**Never commit your `.env` file.** It's already covered by `.gitignore`.

## Project structure

```
knowledge-indexer/
├── prisma/              # Database schema and migrations
├── scripts/             # One-off maintenance scripts
├── src/
│   ├── middleware.ts     # Edge auth + rate limiting + routing
│   ├── app/
│   │   ├── api/          # Route handlers (REST-style, one route.ts per endpoint)
│   │   └── ...           # Pages (library, research, workspace, collections, etc.)
│   ├── components/       # React components
│   ├── lib/              # Shared services (database, auth, AI client, business logic)
│   ├── hooks/             # React hooks
│   ├── types/             # Shared TypeScript types
│   └── tests/             # Jest test suites
```

## Testing

```bash
npm test
```

Test coverage currently focuses on core business logic (plans, bibliography generation, entry queries/dedup) and a handful of integration tests. Contributions that expand coverage — especially around auth, billing, and the research feed pipeline — are welcome.

## License

See [LICENSE](LICENSE) (add one if this repo doesn't have it yet — MIT is a reasonable default for an open-sourced Next.js app).
