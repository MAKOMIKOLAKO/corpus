# Corpus

A private personal knowledge indexing system built with Next.js 14, TypeScript, PostgreSQL, Prisma, and Tailwind CSS. Corpus allows you to save and organize articles, research papers, books, blog posts, essays, and other media as structured metadata with automatic keyword and topic extraction.

## Project Overview

Corpus is your personal knowledge management system that helps you:
- **Auto-fetch metadata** from DOI, URL, and ISBN sources
- **Extract keywords and topics** automatically using OpenAI
- **Search and filter** through your entire library with full-text search
- **Organize entries** into custom collections
- **Visualize connections** between entries with an interactive knowledge graph
- **Access anywhere** with web-based interface and Chrome extension companion

### Key Features
- 📚 **DOI, URL, and ISBN metadata auto-fetch** via CrossRef and Open Library APIs
- 🤖 **LLM-powered keyword and topic extraction** using OpenAI gpt-4o-mini
- 🔍 **Full text search and advanced filtering** by content type, reading status, and more
- 📁 **Collections for grouping entries** by topic, project, or any criteria
- 🕸️ **Interactive knowledge graph** showing connections between entries
- 📖 **Book support** via Open Library API integration
- 🌐 **Chrome extension companion** (Corpus Web Clipper) for saving content from anywhere
- 🔐 **Authentication** with both credentials and Google OAuth options

## Tech Stack

- **Next.js 14** (App Router) - React framework with server-side rendering
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Robust relational database
- **Prisma ORM** - Modern database toolkit and query engine
- **Tailwind CSS** - Utility-first CSS framework
- **NextAuth.js v4** - Complete authentication solution
- **OpenAI API** (gpt-4o-mini) - AI-powered content analysis
- **CrossRef API** - Academic metadata retrieval
- **Open Library API** - Book information and covers
- **Neon** - PostgreSQL hosting (free tier available)
- **Vercel** - Deployment platform

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Git** for version control
- A **Neon account** (free) for the PostgreSQL database
- An **OpenAI API key** for AI-powered features
- A **Google Cloud project** with OAuth credentials (for Google sign-in)

## Environment Variables

Create a `.env` file in the root of your project and add the following variables. **Never commit this file to version control.**

```env
# Database connection (get from Neon)
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"

# OpenAI API key for AI features (get from platform.openai.com)
OPENAI_API_KEY="sk-..."

# Secret API key for your API endpoints
API_KEY="your-secret-api-key"

# NextAuth configuration
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Admin credentials for initial setup
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-password"

# Google OAuth (optional - for Google sign-in)
ALLOWED_GOOGLE_EMAIL="your-email@example.com"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Where to get these values:

- **DATABASE_URL**: Create a free Neon account and create a new PostgreSQL project
- **OPENAI_API_KEY**: Get from OpenAI platform after creating an account
- **API_KEY**: Generate your own secure random string
- **NEXTAUTH_SECRET**: Generate a random string (e.g., `openssl rand -base64 32`)
- **GOOGLE_CLIENT_ID/SECRET**: See Google OAuth Setup section below

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/corpus.git
   cd corpus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploying to Vercel

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial deploy"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" and connect your GitHub repository
   - Import the Corpus repository

3. **Configure environment variables**
   In Vercel project settings, add all environment variables from your `.env` file

4. **Deploy**
   Click "Deploy" - Vercel will automatically build and deploy your application

5. **Apply database migrations**
   ```bash
   npx prisma migrate deploy
   ```

6. **Update NEXTAUTH_URL**
   Change `NEXTAUTH_URL` to your live Vercel URL (e.g., `https://your-app.vercel.app`) and redeploy

## Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable APIs**
   - Enable "Google+ API" (or "People API" for newer versions)

3. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" and configure the required fields
   - Add your email as a test user

4. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"

5. **Add authorized redirect URIs**
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-vercel-url.vercel.app/api/auth/callback/google`

6. **Copy credentials**
   - Copy the Client ID and Client Secret to your `.env` file

## Chrome Extension

Corpus includes a companion Chrome extension (Corpus Web Clipper) for saving content from anywhere on the web.

**Note**: The Chrome extension lives in a separate repository.

### Loading the Extension Locally

1. **Clone the extension repository**
   ```bash
   git clone https://github.com/your-username/corpus-web-clipper.git
   cd corpus-web-clipper
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions`
   - Enable "Developer mode" in the top right

3. **Load the extension**
   - Click "Load unpacked"
   - Select the extension folder

4. **Configure**
   - Set the API URL to `http://localhost:3000` for development
   - Add your API key for authentication

## Project Structure

```
corpus/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints (auth, entries, collections, etc.)
│   ├── collections/       # Collection pages
│   ├── entries/           # Individual entry pages
│   ├── login/             # Authentication pages
│   └── page.tsx           # Main library page
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (buttons, cards, etc.)
│   ├── EntryCard.tsx     # Entry display component
│   ├── HomePageClient.tsx # Main page client logic
│   └── ...               # Other components
├── lib/                   # Utility functions and shared logic
│   ├── prisma.ts         # Prisma client configuration
│   ├── session.ts        # Authentication utilities
│   └── ...               # Other utilities
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema definition
│   └── migrations/       # Database migration files
├── public/               # Static assets
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## Support

If you encounter any issues or have questions, please open an issue on GitHub or check the documentation.
