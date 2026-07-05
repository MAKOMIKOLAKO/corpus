-- Minimal audit trail for account deletions (no PII beyond a hashed userId)
CREATE TABLE "AccountDeletionLog" (
    "id" TEXT NOT NULL,
    "userIdHash" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountDeletionLog_deletedAt_idx" ON "AccountDeletionLog"("deletedAt");
