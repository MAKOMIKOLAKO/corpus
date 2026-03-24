/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doi]` on the table `Entry` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Entry" ADD COLUMN     "cover" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isbn13" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "numberOfPages" INTEGER,
ADD COLUMN     "publishDate" TEXT,
ADD COLUMN     "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Entry_url_key" ON "Entry"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_doi_key" ON "Entry"("doi");
