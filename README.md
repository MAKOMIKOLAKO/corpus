# Knowledge Indexer MVP

A private personal knowledge indexing web application built with Next.js 14, Tailwind CSS, Prisma, and PostgreSQL.

## Features
- **Library Grid**: View all indexed papers, books, and articles with real-time filtering and search.
- **Auto-Fetch Metadata**: Import entry details automatically via CrossRef (DOI) or scraping (URL).
- **AI Keywords**: Automatically generate concise keywords using OpenAI (`gpt-4o-mini`).
- **Notes & Status Tracking**: Keep track of what you're reading and add timestamped notes.

## Setup Instructions

### 1. Install Dependencies
Make sure you have Node.js installed. Navigate to the project directory and run:
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory based on `.env.example`:
```env
# Your PostgreSQL connection string (local, Supabase, Neon, etc.)
DATABASE_URL="postgresql://user:password@localhost:5432/knowledge_indexer"

# Your OpenAI API key for keyword generation
OPENAI_API_KEY="sk-..."
```

### 3. Initialize Database
Run Prisma migrations to create the database schema:
```bash
npx prisma migrate dev --name init
```

### 4. Seed the Database
Populate the database with a few example entries:
```bash
npx prisma db seed
```
*(Note: Requires adding `"prisma": { "seed": "ts-node prisma/seed.ts" }` to your `package.json` if using ts-node, or running it via other typescript runners. If it fails, you can skip seeding and add entries manually).*

### 5. Run the Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
