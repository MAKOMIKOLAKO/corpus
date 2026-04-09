import {
  buildRelatedWorkPrompt,
  deduplicateEntries,
  formatCitation,
  formatBibliography,
  sortEntries,
} from '@/lib/bibliography'

describe('bibliography library', () => {
  it('formats APA citations with DOI normalization', () => {
    const citation = formatCitation(
      {
        userEntryId: 'u1',
        title: 'A STUDY OF TESTS',
        authors: ['Smith, John', 'Jane Doe'],
        year: 2024,
        source: 'Journal of Testing',
        doi: 'https://doi.org/10.1000/xyz123',
      },
      'APA'
    )

    expect(citation.citation).toContain('Smith, J.')
    expect(citation.citation).toContain('(2024).')
    expect(citation.citation).toContain('https://doi.org/10.1000/xyz123')
  })

  it('deduplicates by DOI and merges missing fields', () => {
    const deduped = deduplicateEntries([
      {
        userEntryId: 'u1',
        title: 'Paper One',
        authors: ['John Smith'],
        year: 2022,
        doi: '10.1234/test.1',
        source: null,
      },
      {
        userEntryId: 'u2',
        title: 'Paper One',
        authors: ['Smith, John'],
        year: 2022,
        doi: 'https://doi.org/10.1234/test.1',
        source: 'Test Journal',
      },
    ])

    expect(deduped.entries).toHaveLength(1)
    expect(deduped.removedEntryIds).toEqual(['u2'])
    expect(deduped.entries[0].source).toBe('Test Journal')
  })

  it('sorts chronological entries with undated entries at end', () => {
    const sorted = sortEntries(
      [
        { userEntryId: 'u1', title: 'A', authors: ['Jane Doe'], year: null },
        { userEntryId: 'u2', title: 'B', authors: ['John Smith'], year: 2020 },
        { userEntryId: 'u3', title: 'C', authors: ['John Smith'], year: 2019 },
      ],
      'CHRONOLOGICAL',
      ['u1', 'u2', 'u3']
    )

    expect(sorted.map((entry) => entry.userEntryId)).toEqual(['u3', 'u2', 'u1'])
  })

  it('formats grouped bibliography sections', () => {
    const result = formatBibliography({
      entries: [
        {
          userEntryId: 'u1',
          title: 'Web source',
          authors: ['A Writer'],
          year: 2021,
          url: 'https://example.com/article?utm_source=test',
          source: 'Example',
        },
        {
          userEntryId: 'u2',
          title: 'Journal source',
          authors: ['B Writer'],
          year: 2022,
          doi: '10.1000/abc2',
          source: 'Journal Name',
        },
      ],
      style: 'MLA',
      ordering: 'ALPHABETICAL',
      selectionOrder: ['u1', 'u2'],
      groupByType: true,
    })

    expect(result.groupedSections).not.toBeNull()
    expect(result.bibliography).toContain('Web Articles')
    expect(result.bibliography).toContain('Journal Articles')
  })

  it('builds related-work prompt from entry abstracts', () => {
    const prompt = buildRelatedWorkPrompt([
      {
        userEntryId: 'u1',
        title: 'Test title',
        abstract: 'This is an abstract',
      },
    ])

    expect(prompt).toContain('Identify 3-5 major themes')
    expect(prompt).toContain('Title: Test title')
    expect(prompt).toContain('Abstract: This is an abstract')
  })

  it('uses title-first fallback for MLA when authors are missing', () => {
    const citation = formatCitation(
      {
        userEntryId: 'u3',
        title: 'untitled style test',
        authors: [],
        year: null,
        source: null,
        url: 'https://example.org/source',
      },
      'MLA'
    )

    expect(citation.citation).toContain('"Untitled Style Test"')
    expect(citation.citation).toContain('n.d.')
  })

  it('uses organization/domain fallback for Chicago when authors are missing', () => {
    const citation = formatCitation(
      {
        userEntryId: 'u4',
        title: 'organization fallback',
        authors: [],
        year: 2021,
        source: '',
        url: 'https://news.example.org/post',
      },
      'CHICAGO'
    )

    expect(citation.citation.toLowerCase()).toContain('news.example.org')
    expect(citation.citation).toContain('2021.')
  })

  it('preserves explicit selection ordering', () => {
    const sorted = sortEntries(
      [
        { userEntryId: 'u1', title: 'First', authors: ['A One'], year: 2020 },
        { userEntryId: 'u2', title: 'Second', authors: ['B Two'], year: 2021 },
        { userEntryId: 'u3', title: 'Third', authors: ['C Three'], year: 2022 },
      ],
      'SELECTION',
      ['u3', 'u1', 'u2']
    )

    expect(sorted.map((item) => item.userEntryId)).toEqual(['u3', 'u1', 'u2'])
  })
})
