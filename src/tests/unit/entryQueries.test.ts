import { buildSearchWhere, flattenUserEntry, userEntryWithGlobal } from '@/lib/entryQueries'
import { createTestUserEntry, createTestGlobalEntry } from '../utils/testFactories'

describe('entryQueries', () => {
  describe('buildSearchWhere', () => {
    it('should build basic where clause with userId', () => {
      // Act
      const result = buildSearchWhere('user-1', {})

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
      })
    })

    it('should include search query in OR clause', () => {
      // Act
      const result = buildSearchWhere('user-1', { q: 'test query' })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
        globalEntry: {
          OR: [
            { title: { contains: 'test query', mode: 'insensitive' } },
            { abstract: { contains: 'test query', mode: 'insensitive' } },
            { source: { contains: 'test query', mode: 'insensitive' } },
            { authors: { hasSome: ['test query'] } },
          ],
        },
      })
    })

    it('should include reading status filter', () => {
      // Act
      const result = buildSearchWhere('user-1', { readingStatus: 'COMPLETED' })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
        readingStatus: 'COMPLETED',
      })
    })

    it('should include year filter', () => {
      // Act
      const result = buildSearchWhere('user-1', { year: 2024 })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
        globalEntry: { year: 2024 },
      })
    })

    it('should include collection filter', () => {
      // Act
      const result = buildSearchWhere('user-1', { collectionId: 'collection-1' })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
        collections: {
          some: {
            collectionId: 'collection-1',
          },
        },
      })
    })

    it('should combine multiple filters', () => {
      // Act
      const result = buildSearchWhere('user-1', {
        q: 'machine learning',
        readingStatus: 'UNREAD',
        year: 2023,
        collectionId: 'ml-papers',
      })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
        readingStatus: 'UNREAD',
        collections: {
          some: {
            collectionId: 'ml-papers',
          },
        },
        globalEntry: {
          OR: [
            { title: { contains: 'machine learning', mode: 'insensitive' } },
            { abstract: { contains: 'machine learning', mode: 'insensitive' } },
            { source: { contains: 'machine learning', mode: 'insensitive' } },
            { authors: { hasSome: ['machine learning'] } },
          ],
          year: 2023,
        },
      })
    })

    it('should handle empty search query', () => {
      // Act
      const result = buildSearchWhere('user-1', { q: '' })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
      })
    })

    it('should handle null/undefined values', () => {
      // Act
      const result = buildSearchWhere('user-1', {
        q: null as any,
        readingStatus: undefined,
        year: null as any,
        collectionId: undefined,
      })

      // Assert
      expect(result).toEqual({
        userId: 'user-1',
      })
    })
  })

  describe('flattenUserEntry', () => {
    it('should flatten UserEntry with GlobalEntry into Entry shape', () => {
      // Arrange
      const globalEntry = createTestGlobalEntry({
        id: 'global-1',
        title: 'Test Paper',
        authors: ['Author One', 'Author Two'],
        year: 2024,
        abstract: 'Test abstract',
        url: 'https://example.com',
        doi: '10.1000/test',
        source: 'MANUAL',
        contentType: 'PAPER',
        metadata: { openAccessUrl: 'https://example.com/open' },
        saveCount: 5,
      })

      const userEntry = createTestUserEntry({
        id: 'user-1',
        userId: 'user-123',
        globalEntryId: 'global-1',
        readingStatus: 'COMPLETED',
        addedVia: 'manual',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastViewedAt: new Date('2024-01-03'),
        globalEntry,
        collections: [
          {
            collectionId: 'collection-1',
            collection: {
              name: 'My Collection',
            },
            addedAt: new Date('2024-01-01'),
          },
        ],
      })

      // Act
      const result = flattenUserEntry(userEntry)

      // Assert
      expect(result).toEqual({
        id: 'user-1',
        userId: 'user-123',
        globalEntryId: 'global-1',
        title: 'Test Paper',
        authors: ['Author One', 'Author Two'],
        year: 2024,
        abstract: 'Test abstract',
        url: 'https://example.com',
        doi: '10.1000/test',
        isbn: undefined,
        source: 'MANUAL',
        contentType: 'PAPER',
        metadata: { openAccessUrl: 'https://example.com/open' },
        readingStatus: 'COMPLETED',
        addedVia: 'manual',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        lastViewedAt: new Date('2024-01-03'),
        saveCount: 5,
        collections: [
          {
            collectionId: 'collection-1',
            name: 'My Collection',
            addedAt: new Date('2024-01-01'),
          },
        ],
      })
    })

    it('should handle empty collections array', () => {
      // Arrange
      const userEntry = createTestUserEntry({
        globalEntry: createTestGlobalEntry(),
        collections: [],
      })

      // Act
      const result = flattenUserEntry(userEntry)

      // Assert
      expect(result.collections).toEqual([])
    })

    it('should handle null metadata', () => {
      // Arrange
      const userEntry = createTestUserEntry({
        globalEntry: createTestGlobalEntry({ metadata: null }),
      })

      // Act
      const result = flattenUserEntry(userEntry)

      // Assert
      expect(result.metadata).toBeNull()
    })

    it('should handle undefined optional fields', () => {
      // Arrange
      const userEntry = createTestUserEntry({
        globalEntry: createTestGlobalEntry({
          year: null,
          abstract: null,
          url: null,
          doi: null,
        }),
      })

      // Act
      const result = flattenUserEntry(userEntry)

      // Assert
      expect(result.year).toBeNull()
      expect(result.abstract).toBeNull()
      expect(result.url).toBeNull()
      expect(result.doi).toBeNull()
    })
  })

  describe('userEntryWithGlobal', () => {
    it('should have the correct select structure', () => {
      // Assert
      expect(userEntryWithGlobal).toEqual({
        id: true,
        userId: true,
        globalEntryId: true,
        readingStatus: true,
        addedVia: true,
        addedByQueryId: true,
        createdAt: true,
        updatedAt: true,
        lastViewedAt: true,
        globalEntry: {
          select: {
            id: true,
            title: true,
            authors: true,
            year: true,
            abstract: true,
            source: true,
            url: true,
            doi: true,
            isbn: true,
            canonicalUrl: true,
            metadata: true,
            saveCount: true,
            addedVia: true,
            createdAt: true,
          },
        },
        collections: {
          select: {
            collectionId: true,
            addedAt: true,
            collection: {
              select: { id: true, name: true },
            },
          },
        },
      })
    })
  })
})
