import { PrismaClient } from '@prisma/client'

// Mock Prisma Client for testing
export const createMockPrisma = () => {
  return {
    userEntry: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    globalEntry: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userEntryCollection: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    collection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    sharedEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    signal: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any
}

// Factory for creating test GlobalEntry data
export const createTestGlobalEntry = (overrides = {}) => ({
  id: 'global-entry-1',
  title: 'Test Paper',
  authors: ['Author One', 'Author Two'],
  year: 2024,
  abstract: 'Test abstract',
  doi: '10.1000/test',
  url: 'https://example.com/paper',
  source: 'MANUAL',
  contentType: 'PAPER',
  metadata: {},
  saveCount: 1,
  normalizedTitle: 'test-paper',
  normalizedFirstAuthor: 'author-one',
  publicationYear: 2024,
  canonicalUrl: 'https://example.com/paper',
  contentHash: 'hash123',
  addedVia: 'manual',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Factory for creating test UserEntry data
export const createTestUserEntry = (overrides = {}) => ({
  id: 'user-entry-1',
  userId: 'user-1',
  globalEntryId: 'global-entry-1',
  readingStatus: 'UNREAD',
  addedVia: 'manual',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastViewedAt: new Date(),
  globalEntry: createTestGlobalEntry(),
  collections: [],
  ...overrides,
})

// Factory for creating test Entry data (flat structure for frontend)
export const createTestEntry = (overrides = {}) => ({
  id: 'user-entry-1',
  title: 'Test Paper',
  authors: ['Author One', 'Author Two'],
  year: 2024,
  abstract: 'Test abstract',
  doi: '10.1000/test',
  url: 'https://example.com/paper',
  source: 'MANUAL',
  contentType: 'PAPER',
  metadata: {},
  readingStatus: 'UNREAD',
  createdAt: new Date(),
  saveCount: 1,
  collections: [],
  ...overrides,
})

// Factory for creating test Collection data
export const createTestCollection = (overrides = {}) => ({
  id: 'collection-1',
  userId: 'user-1',
  name: 'Test Collection',
  description: 'Test description',
  isShared: false,
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Factory for creating test User data
export const createTestUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  plan: 'FREE',
  entriesCount: 10,
  personalCollectionsCount: 5,
  ...overrides,
})
