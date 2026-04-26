import { saveEntryForUser, removeEntryForUser } from '@/lib/globalEntryService'
import { getDeduplicationKeys, findExistingGlobalEntry } from '@/lib/entryDedup'
import { createMockPrisma, createTestGlobalEntry, createTestUserEntry } from '../utils/testFactories'

type TransactionCallback = (tx: ReturnType<typeof createMockPrisma>) => Promise<unknown> | unknown

// Mock the entryDedup module
jest.mock('@/lib/entryDedup')
const mockGetDeduplicationKeys = getDeduplicationKeys as jest.MockedFunction<typeof getDeduplicationKeys>
const mockFindExistingGlobalEntry = findExistingGlobalEntry as jest.MockedFunction<typeof findExistingGlobalEntry>

describe('globalEntryService', () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>
  const testUserId = 'user-1'

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrisma = createMockPrisma()
  })

  describe('saveEntryForUser', () => {
    it('should create new GlobalEntry and UserEntry when none exist', async () => {
      // Arrange
      const input = {
        title: 'New Paper',
        authors: ['Author One'],
        year: 2024,
        url: 'https://example.com',
      }
      const keys = {
        doi: null,
        isbn: null,
        normalizedTitle: 'new-paper',
        normalizedFirstAuthor: 'author-one',
        publicationYear: 2024,
        canonicalUrl: 'https://example.com',
        contentHash: 'hash123',
      }

      mockGetDeduplicationKeys.mockReturnValue(keys)
      mockFindExistingGlobalEntry.mockResolvedValue(null)

      const newGlobalEntry = createTestGlobalEntry({ id: 'new-global' })
      const newUserEntry = createTestUserEntry({ id: 'new-user', globalEntryId: 'new-global' })

      mockPrisma.globalEntry.create.mockResolvedValue(newGlobalEntry)
      mockPrisma.userEntry.findUnique.mockResolvedValue(null)
      mockPrisma.userEntry.create.mockResolvedValue(newUserEntry)

      // Mock the transaction
      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback(mockPrisma)
      })

      // Act
      const result = await saveEntryForUser(testUserId, input)

      // Assert
      expect(mockGetDeduplicationKeys).toHaveBeenNthCalledWith(1, {
        doi: undefined,
        isbn: undefined,
        title: input.title,
        authors: input.authors,
        year: input.year,
        url: input.url,
      })

      expect(mockFindExistingGlobalEntry).toHaveBeenCalledWith(mockPrisma, keys)
      expect(mockPrisma.globalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: input.title,
          authors: input.authors,
          year: input.year,
          url: input.url,
          saveCount: 0,
        }),
      })

      expect(mockPrisma.userEntry.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          globalEntryId: 'new-global',
          readingStatus: 'UNREAD',
          addedVia: 'manual',
          addedByQueryId: null,
        },
      })

      expect(result).toEqual({
        userEntryId: 'new-user',
        globalEntryId: 'new-global',
        wasGlobalNew: true,
        wasUserEntryNew: true,
        isDuplicate: false,
      })
    })

    it('should reuse existing GlobalEntry and create new UserEntry', async () => {
      // Arrange
      const input = {
        title: 'Existing Paper',
        authors: ['Author One'],
        year: 2024,
      }
      const existingGlobalEntry = createTestGlobalEntry({ id: 'existing-global' })
      const keys = { doi: null, isbn: null, normalizedTitle: 'existing-paper' } as any

      mockGetDeduplicationKeys.mockReturnValue(keys)
      mockFindExistingGlobalEntry.mockResolvedValue(existingGlobalEntry.id)

      const newUserEntry = createTestUserEntry({ id: 'new-user', globalEntryId: 'existing-global' })
      mockPrisma.userEntry.findUnique.mockResolvedValue(null)
      mockPrisma.userEntry.create.mockResolvedValue(newUserEntry)

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback(mockPrisma)
      })

      // Act
      const result = await saveEntryForUser(testUserId, input)

      // Assert
      expect(mockPrisma.globalEntry.create).not.toHaveBeenCalled()
      expect(mockPrisma.userEntry.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          globalEntryId: 'existing-global',
          readingStatus: 'UNREAD',
          addedVia: 'manual',
          addedByQueryId: null,
        },
      })

      expect(result).toEqual({
        userEntryId: 'new-user',
        globalEntryId: 'existing-global',
        wasGlobalNew: false,
        wasUserEntryNew: true,
        isDuplicate: false,
      })
    })

    it('should return existing UserEntry when user already has the entry', async () => {
      // Arrange
      const input = {
        title: 'User\'s Paper',
        authors: ['Author One'],
      }
      const existingGlobalEntry = createTestGlobalEntry({ id: 'existing-global' })
      const existingUserEntry = createTestUserEntry({ id: 'existing-user', globalEntryId: 'existing-global' })
      const keys = { doi: null, isbn: null, normalizedTitle: 'users-paper' } as any

      mockGetDeduplicationKeys.mockReturnValue(keys)
      mockFindExistingGlobalEntry.mockResolvedValue(existingGlobalEntry.id)
      mockPrisma.userEntry.findUnique.mockResolvedValue(existingUserEntry)

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback(mockPrisma)
      })

      // Act
      const result = await saveEntryForUser(testUserId, input)

      // Assert
      expect(mockPrisma.userEntry.create).not.toHaveBeenCalled()
      expect(result).toEqual({
        userEntryId: 'existing-user',
        globalEntryId: 'existing-global',
        wasGlobalNew: false,
        wasUserEntryNew: false,
        isDuplicate: true,
      })
    })

    it('should handle ISBN array correctly', async () => {
      // Arrange
      const input = {
        title: 'Book with ISBN',
        authors: ['Author One'],
        isbn: ['978-0-123456-78-9', '978-0-123456-80-2'],
      }
      const keys = { doi: null, isbn: '978-0-123456-78-9' } as any

      mockGetDeduplicationKeys.mockReturnValue(keys)
      mockFindExistingGlobalEntry.mockResolvedValue(null)

      const newGlobalEntry = createTestGlobalEntry()
      const newUserEntry = createTestUserEntry()

      mockPrisma.globalEntry.create.mockResolvedValue(newGlobalEntry)
      mockPrisma.userEntry.findUnique.mockResolvedValue(null)
      mockPrisma.userEntry.create.mockResolvedValue(newUserEntry)

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback(mockPrisma)
      })

      // Act
      await saveEntryForUser(testUserId, input)

      // Assert
      expect(mockGetDeduplicationKeys).toHaveBeenCalledWith({
        doi: undefined,
        isbn: '978-0-123456-78-9', // First ISBN used for deduplication
        title: input.title,
        authors: input.authors,
        year: undefined,
        url: undefined,
      })
    })

    it('should add to collection when collectionId is provided', async () => {
      // Arrange
      const input = {
        title: 'Paper for Collection',
        authors: ['Author One'],
      }
      const collectionId = 'collection-1'
      const keys = { doi: null, isbn: null, normalizedTitle: 'paper-for-collection' } as any

      mockGetDeduplicationKeys.mockReturnValue(keys)
      mockFindExistingGlobalEntry.mockResolvedValue(null)

      const newGlobalEntry = createTestGlobalEntry()
      const newUserEntry = createTestUserEntry()

      mockPrisma.globalEntry.create.mockResolvedValue(newGlobalEntry)
      mockPrisma.userEntry.findUnique.mockResolvedValue(null)
      mockPrisma.userEntry.create.mockResolvedValue(newUserEntry)
      mockPrisma.userEntryCollection.create.mockResolvedValue({} as any)

      mockPrisma.$transaction.mockImplementation(async (callback: TransactionCallback) => {
        return callback(mockPrisma)
      })

      // Act
      await saveEntryForUser(testUserId, input, { collectionId })

      // Assert
      expect(mockPrisma.userEntryCollection.create).toHaveBeenCalledWith({
        data: {
          userEntryId: newUserEntry.id,
          collectionId,
        },
      })
    })
  })

  describe('removeEntryForUser', () => {
    it('should delete UserEntry and decrement counts', async () => {
      // Arrange
      const userEntry = createTestUserEntry({ id: 'user-entry-1', globalEntryId: 'global-1' })

      mockPrisma.userEntry.findFirst.mockResolvedValue(userEntry)
      mockPrisma.userEntry.delete.mockResolvedValue({} as any)
      mockPrisma.globalEntry.update.mockResolvedValue({} as any)
      mockPrisma.user.update.mockResolvedValue({} as any)

      // Act
      await removeEntryForUser(testUserId, 'user-entry-1')

      // Assert
      expect(mockPrisma.userEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-entry-1', userId: testUserId },
        select: { id: true, globalEntryId: true }
      })

      expect(mockPrisma.userEntry.delete).toHaveBeenCalledWith({
        where: { id: 'user-entry-1' }
      })

      expect(mockPrisma.globalEntry.update).toHaveBeenCalledWith({
        where: { id: 'global-1' },
        data: { saveCount: { decrement: 1 } }
      })

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { entriesCount: { decrement: 1 } }
      })
    })

    it('should throw error when UserEntry not found', async () => {
      // Arrange
      mockPrisma.userEntry.findFirst.mockResolvedValue(null)

      // Act & Assert
      await expect(removeEntryForUser(testUserId, 'non-existent'))
        .rejects.toThrow('UserEntry not found or does not belong to user')
    })
  })
})
