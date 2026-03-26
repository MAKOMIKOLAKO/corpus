import { Metadata } from 'next'
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { Search, FileText, Users, Calendar, Filter, ArrowRight } from 'lucide-react'
import PapersClient from './PapersClient'

const prisma = new PrismaClient()

export const metadata: Metadata = {
  title: 'Research Papers | Corpus',
  description: 'Browse and explore research papers with comprehensive summaries, key contributions, and related topics. Find papers in computer science, biology, engineering, and more.',
  openGraph: {
    title: 'Research Papers | Corpus',
    description: 'Browse and explore research papers with comprehensive summaries and key contributions.',
    type: 'website',
    url: 'https://corpus.app/papers',
  },
  alternates: {
    canonical: 'https://corpus.app/papers'
  }
}

async function getPapers() {
  const papers = await prisma.entry.findMany({
    where: {
      contentType: 'PAPER',
      slug: { not: null }
    },
    orderBy: [
      { year: 'desc' },
      { createdAt: 'desc' }
    ],
    select: {
      id: true,
      title: true,
      slug: true,
      authors: true,
      year: true,
      summary: true,
      abstract: true,
      doi: true
    }
  })

  return papers
}

export default async function PapersPage() {
  const papers = await getPapers()

  return (
    <PapersClient
      initialPapers={papers}
      allTopics={[]}
    />
  )
}
