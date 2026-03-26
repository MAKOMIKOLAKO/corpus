/**
 * Fallback mechanisms for metadata generation
 * Provides basic topic and keyword extraction when Gemini API fails
 */

/**
 * Extract basic keywords using simple text processing
 */
export function extractBasicKeywords(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  // Common academic and research terms to look for
  const academicTerms = [
    'algorithm', 'analysis', 'approach', 'artificial intelligence', 'ai',
    'classification', 'clustering', 'data', 'deep learning', 'detection',
    'framework', 'learning', 'machine learning', 'ml', 'method', 'model',
    'neural network', 'optimization', 'prediction', 'recognition', 'regression',
    'research', 'study', 'system', 'technique', 'technology'
  ];

  // Extract words that are 4+ characters long
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4)
    .filter(word => !isCommonWord(word));

  // Prioritize academic terms
  const academicMatches = words.filter(word => 
    academicTerms.some(term => term.includes(word) || word.includes(term))
  );

  // Get word frequency
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // Sort by frequency and length, then take top 8
  const sortedWords = Array.from(wordFreq.entries())
    .sort((a, b) => {
      // Prioritize academic terms
      const aIsAcademic = academicMatches.includes(a[0]);
      const bIsAcademic = academicMatches.includes(b[0]);
      if (aIsAcademic && !bIsAcademic) return -1;
      if (!aIsAcademic && bIsAcademic) return 1;
      
      // Then by frequency
      if (b[1] !== a[1]) return b[1] - a[1];
      
      // Then by length (longer words might be more specific)
      return b[0].length - a[0].length;
    })
    .slice(0, 8)
    .map(([word]) => word);

  return sortedWords;
}

/**
 * Extract basic topics based on text patterns
 */
export function extractBasicTopics(text: string): string[] {
  if (!text || typeof text !== 'string') return [];

  const textLower = text.toLowerCase();
  const topics: string[] = [];

  // Topic detection patterns
  const topicPatterns = [
    { keywords: ['machine learning', 'artificial intelligence', 'neural network', 'deep learning'], topic: 'Machine Learning' },
    { keywords: ['computer vision', 'image processing', 'object detection', 'image recognition'], topic: 'Computer Vision' },
    { keywords: ['natural language processing', 'nlp', 'text mining', 'language model'], topic: 'Natural Language Processing' },
    { keywords: ['robotics', 'robot', 'autonomous', 'control'], topic: 'Robotics' },
    { keywords: ['biology', 'biological', 'genomics', 'protein', 'dna'], topic: 'Biology' },
    { keywords: ['medicine', 'medical', 'healthcare', 'clinical'], topic: 'Medicine' },
    { keywords: ['physics', 'quantum', 'particle', 'energy'], topic: 'Physics' },
    { keywords: ['chemistry', 'chemical', 'molecular', 'reaction'], topic: 'Chemistry' },
    { keywords: ['economics', 'economic', 'finance', 'market'], topic: 'Economics' },
    { keywords: ['psychology', 'cognitive', 'behavior', 'mental'], topic: 'Psychology' },
    { keywords: ['sociology', 'social', 'culture', 'society'], topic: 'Sociology' },
    { keywords: ['computer science', 'computing', 'algorithm', 'software'], topic: 'Computer Science' },
    { keywords: ['mathematics', 'mathematical', 'statistics', 'statistical'], topic: 'Mathematics' },
    { keywords: ['engineering', 'electrical', 'mechanical', 'civil'], topic: 'Engineering' },
    { keywords: ['climate', 'environment', 'environmental', 'sustainability'], topic: 'Environmental Science' }
  ];

  // Find matching topics
  topicPatterns.forEach(({ keywords, topic }) => {
    const matchCount = keywords.filter(keyword => textLower.includes(keyword)).length;
    if (matchCount >= 2 || (matchCount === 1 && keywords.some(k => k.length > 10 && textLower.includes(k)))) {
      topics.push(topic);
    }
  });

  // If no topics found, try to infer from title/first sentence
  if (topics.length === 0) {
    const firstSentence = text.split('.')[0] + text.split('.')[1];
    const keywords = extractBasicKeywords(firstSentence).slice(0, 3);
    
    // Try to categorize based on keywords
    if (keywords.some(k => k.includes('learn') || k.includes('neural') || k.includes('model'))) {
      topics.push('Machine Learning');
    } else if (keywords.some(k => k.includes('image') || k.includes('vision') || k.includes('detect'))) {
      topics.push('Computer Vision');
    } else if (keywords.some(k => k.includes('text') || k.includes('language') || k.includes('word'))) {
      topics.push('Natural Language Processing');
    } else {
      // Generic fallback
      topics.push('Research');
    }
  }

  return topics.slice(0, 3);
}

/**
 * Check if word is too common to be useful
 */
function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    'that', 'this', 'with', 'have', 'from', 'they', 'been', 'their', 'said',
    'each', 'which', 'were', 'them', 'some', 'there', 'would', 'could',
    'should', 'will', 'just', 'than', 'when', 'make', 'time', 'very',
    'what', 'into', 'more', 'also', 'other', 'only', 'most', 'even',
    'after', 'many', 'such', 'well', 'these', 'work', 'back', 'way',
    'then', 'made', 'those', 'does', 'must', 'still', 'another', 'come',
    'study', 'paper', 'article', 'research', 'analysis', 'approach',
    'method', 'results', 'conclusion', 'introduction', 'abstract'
  ]);
  
  return commonWords.has(word.toLowerCase());
}

/**
 * Generate fallback metadata when API fails
 */
export function generateFallbackMetadata(text: string): { topics: string[]; keywords: string[] } {
  const topics = extractBasicTopics(text);
  const keywords = extractBasicKeywords(text);
  
  return {
    topics: topics.length > 0 ? topics : ['Research'],
    keywords: keywords.length > 0 ? keywords : ['study', 'analysis']
  };
}
