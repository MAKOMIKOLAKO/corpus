# AGENTS.md

Guidance for AI coding agents working in `knowledge-indexer`.

## 1) Repository Snapshot

- **Framework**: Next.js App Router (`next@14`) + React 18 + TypeScript (`strict: true`)
- **Backend/Data**: Next.js route handlers + Prisma ORM + PostgreSQL
- **Auth**: NextAuth (Google OAuth + Credentials)
- **Styling/UI**: Tailwind CSS + CSS variables + Base UI/shadcn-style component patterns
- **Validation**: Zod schemas in `src/lib/validation.ts`
- **Testing**: Jest + Testing Library (`jsdom`)

## 2) Folder Structure (high-value paths)

- `src/app/`: App Router pages, layouts, and API route handlers under `src/app/api/**/route.ts`
- `src/components/`: Reusable React components (`ui/` contains base UI primitives)
- `src/lib/`: Shared server/client utilities (auth, Prisma, validation, research, alerts, etc.)
- `src/tests/`: Unit and integration tests
- `prisma/schema.prisma`: Data model and enums
- `scripts/`: One-off maintenance/backfill scripts
- `DESIGN.md`: Source-of-truth design system and UI direction

## 3) Required Commands

Use npm scripts already defined in `package.json`:

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint checks (Next ESLint config)
- `npm run test` - Jest tests
- `npm run test:watch` - Jest watch mode
- `npm run test:coverage` - coverage report
- `npm run test:ci` - CI-style test run

When changing Prisma schema:

- `npx prisma generate`

## 4) Coding Patterns To Follow

### TypeScript and imports

- Keep TypeScript strictness intact; avoid `any` unless absolutely unavoidable.
- Prefer alias imports with `@/*` for app code (`@/lib/...`, `@/components/...`).
- Follow existing file style (many files use semicolons and single quotes in API routes; preserve local style in touched file).

### API routes

- Use App Router route handlers in `src/app/api/**/route.ts`.
- Return responses via `NextResponse.json(...)` with clear status codes.
- For authenticated routes, use `getServerSession(authOptions)` and fail fast on unauthorized users.
- Validate request payloads with Zod schemas (typically `safeParse`) from `src/lib/validation.ts`.

### Database/Prisma

- Prefer shared Prisma clients from `@/lib/prisma` or `@/lib/prismaWithRetry` (do not instantiate new clients per file).
- Reuse existing retry/error-handling patterns when touching sensitive auth or networked DB operations.
- Keep schema updates in `prisma/schema.prisma`; ensure app code matches enum/model changes.

### Validation and security

- Prefer centralized schemas/utilities in `src/lib/validation.ts` instead of ad hoc checks.
- Preserve existing security patterns (timing-safe auth responses, token generation with `crypto.randomBytes`, etc.).
- Never hardcode secrets/API keys; always use env vars.

## 5) Preferred Libraries and Utilities

Prefer existing repo dependencies over introducing new ones:

- **UI primitives**: `@base-ui/react`, existing `src/components/ui/*`
- **Class composition**: `class-variance-authority` + `clsx` + `tailwind-merge` via `cn(...)`
- **Validation**: `zod`
- **Dates**: `date-fns`
- **Icons**: `lucide-react`
- **Animation**: `framer-motion` where already used
- **Auth/DB**: `next-auth`, `@prisma/client`

Before adding a new dependency, check if equivalent functionality already exists in the codebase.

## 6) UI and Design Rules (Important)

- **Always read and follow `DESIGN.md` before making UI changes.**
- Preserve the existing warm Claude-inspired design language:
  - warm neutral palette and terracotta accent
  - serif/sans typographic hierarchy
  - ring-shadow style and soft radii
  - CSS variable-driven theming in `src/app/globals.css` and `tailwind.config.ts`
- Reuse design tokens/variables; do not introduce conflicting ad hoc colors/typography.
- Ensure responsive behavior and accessibility are maintained (`focus-visible`, reduced motion, skip links).

## 7) Testing and Verification Expectations

After code changes, run the most targeted checks first, then broader ones:

1. Related tests (`npm run test -- <pattern>` when practical)
2. `npm run lint`
3. `npm run test` (or `npm run test:ci` for broader confidence)
4. `npm run build` for significant routing/build-impacting changes

Do not fix unrelated failing tests/issues unless explicitly asked.

## 8) Scope and Change Discipline

- Keep changes focused and minimal.
- Do not rename/move files unless required for the task.
- Do not revert user changes you did not make.
- Prefer extending existing patterns over introducing parallel architectures.
