CREATE TABLE "GeneratedBibliography" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT,
  "entryIds" TEXT[],
  "citationStyle" TEXT NOT NULL,
  "ordering" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "relatedWorkParagraph" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GeneratedBibliography_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GeneratedBibliography_userId_idx" ON "GeneratedBibliography"("userId");
CREATE INDEX "GeneratedBibliography_createdAt_idx" ON "GeneratedBibliography"("createdAt");

ALTER TABLE "GeneratedBibliography"
ADD CONSTRAINT "GeneratedBibliography_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
