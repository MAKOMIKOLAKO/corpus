# Lint Error Fixes - Admin Dashboard

## Issue Summary
The TypeScript linter was showing errors about `AnalyticsEvent` not existing on the Prisma client.

## Root Cause
Prisma generates model names in camelCase for the client API, even though the model is defined in PascalCase in the schema.

## Fix Applied
Changed all references from:
```typescript
prisma.AnalyticsEvent
```
To:
```typescript
prisma.analyticsEvent
```

## Files Changed
1. `/src/app/api/admin/metrics/route.ts` - Updated all 12 references
2. `/src/lib/analytics.ts` - Already correct (used lowercase)

## Verification
- Ran `npm run build` - ✅ Build succeeded
- All TypeScript errors resolved
- Admin dashboard functionality preserved

## Note
This is Prisma's standard naming convention:
- Schema: `AnalyticsEvent` (PascalCase)
- Client API: `analyticsEvent` (camelCase)
