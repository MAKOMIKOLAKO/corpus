import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/entries/route'
import { GET as GetEntry, PATCH as PatchEntry, DELETE as DeleteEntry } from '@/app/api/entries/[id]/route'
import { POST as BatchPost } from '@/app/api/entries/batch/route'
import { getCurrentUserId } from '@/lib/session'
import { createMockPrisma, createTestEntry, createTestUser, createTestUserEntry, createTestGlobalEntry } from '../utils/testFactories'

// Mock dependencies
jest.mock('@/lib/session')
const mockGetCurrentUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  default: createMockPrisma(),
}))

import prisma from '@/lib/prisma'

describe('/api/entries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentUserId.mockResolvedValue('user-1')
  })

  describe('GET /api/entries', () => {
    it('should return user entries with pagination', async () => {
      // Arrange
      const mockEntries = [
        createTestUserEntry({ id: 'entry-1' }),
        createTestUserEntry({ id: 'entry-2' }),
      ]

      prisma.userEntry.findMany.mockResolvedValue(mockEntries)
      prisma.userEntry.count.mockResolvedValue(2)

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/entries?page=1&limit=10')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.entries).toHaveLength(2)
      expect(data.totalCount).toBe(2)
      expect(data.currentPage).toBe(1)
      expect(data.totalPages).toBe(1)
    })

    it('should filter by search query', async () => {
      // Arrange
      prisma.userEntry.findMany.mockResolvedValue([])
      prisma.userEntry.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/entries?q=machine+learning')

      // Act
      await GET(request)

      // Assert
      expect(prisma.userEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            globalEntry: {
              OR: [
                { title: { contains: 'machine learning', mode: 'insensitive' } },
                { abstract: { contains: 'machine learning', mode: 'insensitive' } },
                { authors: { hasSome: ['machine learning'] } },
              ],
            },
          }),
        })
      )
    })

    it('should filter by reading status', async () => {
      // Arrange
      prisma.userEntry.findMany.mockResolvedValue([])
      prisma.userEntry.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/entries?readingStatus=COMPLETED')

      // Act
      await GET(request)

      // Assert
      expect(prisma.userEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readingStatus: 'COMPLETED',
          }),
        })
      )
    })

    it('should return 401 for unauthenticated users', async () => {
      // Arrange
      mockGetCurrentUserId.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/entries')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/entries', () => {
    it('should create a new entry', async () => {
      // Arrange
      const newEntry = createTestEntry({
        title: 'New Paper',
        authors: ['Author One'],
        contentType: 'PAPER',
      })

      const mockGlobalEntry = createTestGlobalEntry()
      const mockUserEntry = createTestUserEntry()

      prisma.globalEntry.findFirst.mockResolvedValue(null)
      prisma.globalEntry.create.mockResolvedValue(mockGlobalEntry)
      prisma.userEntry.findUnique.mockResolvedValue(null)
      prisma.userEntry.create.mockResolvedValue(mockUserEntry)
      prisma.user.update.mockResolvedValue({} as any)
      prisma.signal.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: JSON.stringify(newEntry),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.id).toBe(mockUserEntry.id)
      expect(data.title).toBe(newEntry.title)
    })

    it('should return duplicate entry if already exists', async () => {
      // Arrange
      const existingEntry = createTestEntry({ title: 'Existing Paper' })
      const mockUserEntry = createTestUserEntry({ title: 'Existing Paper' })

      prisma.userEntry.findUnique.mockResolvedValue(mockUserEntry)

      const request = new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: JSON.stringify(existingEntry),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(409)
      const data = await response.json()
      expect(data.error).toContain('already exists')
    })

    it('should validate required fields', async () => {
      // Arrange
      const invalidEntry = { title: '' } // Missing required fields

      const request = new NextRequest('http://localhost:3000/api/entries', {
        method: 'POST',
        body: JSON.stringify(invalidEntry),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid input')
    })
  })
})

describe('/api/entries/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentUserId.mockResolvedValue('user-1')
  })

  describe('GET /api/entries/[id]', () => {
    it('should return a specific entry', async () => {
      // Arrange
      const mockUserEntry = createTestUserEntry({ id: 'entry-1' })
      prisma.userEntry.findFirst.mockResolvedValue(mockUserEntry)

      const request = new NextRequest('http://localhost:3000/api/entries/entry-1')
      const params = { id: 'entry-1' }

      // Act
      const response = await GetEntry(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe('entry-1')
      expect(prisma.userEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { lastViewedAt: expect.any(Date) },
      })
    })

    it('should return 404 for non-existent entry', async () => {
      // Arrange
      prisma.userEntry.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/entries/non-existent')
      const params = { id: 'non-existent' }

      // Act
      const response = await GetEntry(request, { params })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should return 401 for unauthenticated users', async () => {
      // Arrange
      mockGetCurrentUserId.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/entries/entry-1')
      const params = { id: 'entry-1' }

      // Act
      const response = await GetEntry(request, { params })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/entries/[id]', () => {
    it('should update entry reading status', async () => {
      // Arrange
      const mockUserEntry = createTestUserEntry({ id: 'entry-1', readingStatus: 'UNREAD' })
      const updatedEntry = { ...mockUserEntry, readingStatus: 'COMPLETED' }

      prisma.userEntry.findFirst.mockResolvedValue(mockUserEntry)
      prisma.userEntry.update.mockResolvedValue(updatedEntry)

      const request = new NextRequest('http://localhost:3000/api/entries/entry-1', {
        method: 'PATCH',
        body: JSON.stringify({ readingStatus: 'COMPLETED' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = { id: 'entry-1' }

      // Act
      const response = await PatchEntry(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.userEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: { readingStatus: 'COMPLETED', updatedAt: expect.any(Date) },
      })
    })

    it('should append notes to metadata', async () => {
      // Arrange
      const mockUserEntry = createTestUserEntry({ id: 'entry-1' })
      const mockGlobalEntry = createTestGlobalEntry({
        metadata: { notes: [{ text: 'Existing note', createdAt: '2024-01-01' }] },
      })

      prisma.userEntry.findFirst.mockResolvedValue(mockUserEntry)
      prisma.globalEntry.findUnique.mockResolvedValue(mockGlobalEntry)
      prisma.globalEntry.update.mockResolvedValue(mockGlobalEntry)
      prisma.userEntry.findUnique.mockResolvedValue(mockUserEntry)

      const request = new NextRequest('http://localhost:3000/api/entries/entry-1', {
        method: 'PATCH',
        body: JSON.stringify({
          notes: { text: 'New note' },
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = { id: 'entry-1' }

      // Act
      const response = await PatchEntry(request, { params })

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.globalEntry.update).toHaveBeenCalledWith({
        where: { id: mockUserEntry.globalEntryId },
        data: {
          metadata: {
            ...mockGlobalEntry.metadata,
            notes: [
              { text: 'Existing note', createdAt: '2024-01-01' },
              { text: 'New note', createdAt: expect.any(String) },
            ],
          },
        },
      })
    })
  })

  describe('DELETE /api/entries/[id]', () => {
    it('should delete an entry', async () => {
      // Arrange
      const mockUserEntry = createTestUserEntry({ id: 'entry-1' })

      prisma.userEntry.findFirst.mockResolvedValue(mockUserEntry)
      prisma.userEntry.delete.mockResolvedValue({} as any)
      prisma.globalEntry.update.mockResolvedValue({} as any)
      prisma.user.update.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/entries/entry-1', {
        method: 'DELETE',
      })
      const params = { id: 'entry-1' }

      // Act
      const response = await DeleteEntry(request, { params })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.userEntry.delete).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
      })
    })
  })
})

describe('/api/entries/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentUserId.mockResolvedValue('user-1')
  })

  describe('POST /api/entries/batch', () => {
    it('should delete multiple entries', async () => {
      // Arrange
      const mockUserEntries = [
        createTestUserEntry({ id: 'entry-1' }),
        createTestUserEntry({ id: 'entry-2' }),
      ]

      prisma.userEntry.findMany.mockResolvedValue(mockUserEntries)
      prisma.userEntry.delete.mockResolvedValue({} as any)
      prisma.globalEntry.update.mockResolvedValue({} as any)
      prisma.user.update.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/entries/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'DELETE',
          userEntryIds: ['entry-1', 'entry-2'],
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await BatchPost(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.deleted).toBe(2)
    })

    it('should update reading status for multiple entries', async () => {
      // Arrange
      const mockUserEntries = [
        createTestUserEntry({ id: 'entry-1', readingStatus: 'UNREAD' }),
        createTestUserEntry({ id: 'entry-2', readingStatus: 'UNREAD' }),
      ]

      prisma.userEntry.findMany.mockResolvedValue(mockUserEntries)
      prisma.userEntry.updateMany.mockResolvedValue({ count: 2 })

      const request = new NextRequest('http://localhost:3000/api/entries/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          userEntryIds: ['entry-1', 'entry-2'],
          readingStatus: 'COMPLETED',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await BatchPost(request)

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.userEntry.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['entry-1', 'entry-2'] } },
        data: { readingStatus: 'COMPLETED' },
      })
    })

    it('should add entries to collection', async () => {
      // Arrange
      const mockUserEntries = [
        createTestUserEntry({ id: 'entry-1' }),
        createTestUserEntry({ id: 'entry-2' }),
      ]

      prisma.userEntry.findMany.mockResolvedValue(mockUserEntries)
      prisma.collection.findUnique.mockResolvedValue({ userId: 'user-1' } as any)
      prisma.userEntryCollection.createMany.mockResolvedValue({ count: 2 })
      prisma.signal.create.mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost:3000/api/entries/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'ADD_TO_COLLECTION',
          userEntryIds: ['entry-1', 'entry-2'],
          collectionId: 'collection-1',
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      // Act
      const response = await BatchPost(request)

      // Assert
      expect(response.status).toBe(200)
      expect(prisma.userEntryCollection.createMany).toHaveBeenCalledWith({
        data: [
          { userEntryId: 'entry-1', collectionId: 'collection-1' },
          { userEntryId: 'entry-2', collectionId: 'collection-1' },
        ],
        skipDuplicates: true,
      })
    })
  })
})
