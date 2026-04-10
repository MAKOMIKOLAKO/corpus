/**
 * In-process k-means clustering for the Research Feed diversity system.
 * No external dependencies — pure JavaScript.
 * Optimized for up to 100 papers at a time.
 */

import { cosineSimilarity, computeCentroid } from './embeddings'

export interface ClusterResult {
  clusterIndex: number
  centroid: number[]
  paperIds: string[]
}

export interface PaperWithEmbedding {
  id: string
  embedding: number[]
}

/**
 * Run k-means clustering. Uses cosine distance (1 - cosine similarity).
 * Initializes centroids with k-means++ for better convergence.
 * Max iterations: 50.
 */
export function kMeans(
  papers: PaperWithEmbedding[],
  k: number
): ClusterResult[] {
  if (papers.length === 0) return []
  if (papers.length <= k) {
    // Trivial case: each paper is its own cluster
    return papers.map((p, i) => ({
      clusterIndex: i,
      centroid: p.embedding,
      paperIds: [p.id],
    }))
  }

  const embeddings = papers.map((p) => p.embedding)

  // Initialize centroids with k-means++
  let centroids = initCentroidsKMeansPlusPlus(embeddings, k)

  let assignments = new Array<number>(papers.length).fill(0)
  const MAX_ITER = 50

  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Assignment step: assign each point to nearest centroid
    const newAssignments = embeddings.map((emb) =>
      nearestCentroid(emb, centroids)
    )

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i])
    assignments = newAssignments

    if (!changed) break

    // Update step: recompute centroids
    const newCentroids: number[][] = Array.from({ length: k }, () => [])
    const counts = new Array<number>(k).fill(0)

    for (let i = 0; i < embeddings.length; i++) {
      const c = assignments[i]
      counts[c]++
      if (newCentroids[c].length === 0) {
        newCentroids[c] = [...embeddings[i]]
      } else {
        for (let d = 0; d < embeddings[i].length; d++) {
          newCentroids[c][d] += embeddings[i][d]
        }
      }
    }

    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < newCentroids[c].length; d++) {
          newCentroids[c][d] /= counts[c]
        }
        centroids[c] = newCentroids[c]
      }
      // If a centroid got no points, reinitialize it randomly
      else {
        const randIdx = Math.floor(Math.random() * papers.length)
        centroids[c] = [...embeddings[randIdx]]
      }
    }
  }

  // Build cluster results
  const clusters: ClusterResult[] = Array.from({ length: k }, (_, i) => ({
    clusterIndex: i,
    centroid: centroids[i],
    paperIds: [],
  }))

  for (let i = 0; i < papers.length; i++) {
    clusters[assignments[i]].paperIds.push(papers[i].id)
  }

  // Remove empty clusters and re-index
  return clusters
    .filter((c) => c.paperIds.length > 0)
    .map((c, i) => ({ ...c, clusterIndex: i }))
}

/**
 * k-means++ initialization: selects first centroid randomly,
 * then each subsequent centroid with probability proportional to
 * squared distance from nearest existing centroid.
 */
function initCentroidsKMeansPlusPlus(
  embeddings: number[][],
  k: number
): number[][] {
  const centroids: number[][] = []
  // First centroid: random
  const firstIdx = Math.floor(Math.random() * embeddings.length)
  centroids.push([...embeddings[firstIdx]])

  for (let c = 1; c < k; c++) {
    // Compute distance to nearest existing centroid for each point
    const distances = embeddings.map((emb) => {
      let minDist = Infinity
      for (const centroid of centroids) {
        const dist = 1 - cosineSimilarity(emb, centroid)
        if (dist < minDist) minDist = dist
      }
      return minDist * minDist // squared distance
    })

    // Sample proportional to squared distance
    const totalDist = distances.reduce((a, b) => a + b, 0)
    let r = Math.random() * totalDist
    let chosen = 0
    for (let i = 0; i < distances.length; i++) {
      r -= distances[i]
      if (r <= 0) {
        chosen = i
        break
      }
    }
    centroids.push([...embeddings[chosen]])
  }

  return centroids
}

/** Index of the centroid closest to this embedding (by cosine similarity). */
function nearestCentroid(embedding: number[], centroids: number[][]): number {
  let best = 0
  let bestSim = -Infinity
  for (let i = 0; i < centroids.length; i++) {
    const sim = cosineSimilarity(embedding, centroids[i])
    if (sim > bestSim) {
      bestSim = sim
      best = i
    }
  }
  return best
}

/**
 * Silhouette score for a clustering.
 * Returns a value in [-1, 1]. Higher is better.
 * Approximated using centroid distances for speed (O(n*k) not O(n²)).
 */
export function silhouetteScore(
  papers: PaperWithEmbedding[],
  clusters: ClusterResult[]
): number {
  if (clusters.length <= 1) return 0

  const paperCluster = new Map<string, number>()
  for (const cluster of clusters) {
    for (const paperId of cluster.paperIds) {
      paperCluster.set(paperId, cluster.clusterIndex)
    }
  }

  let totalScore = 0
  let count = 0

  for (const paper of papers) {
    const myClusterIdx = paperCluster.get(paper.id)
    if (myClusterIdx === undefined) continue

    const myCluster = clusters[myClusterIdx]
    if (!myCluster || myCluster.paperIds.length === 1) continue

    // a(i) = mean distance to other points in same cluster (approximated by centroid distance)
    const a = 1 - cosineSimilarity(paper.embedding, myCluster.centroid)

    // b(i) = min mean distance to any other cluster
    let b = Infinity
    for (const cluster of clusters) {
      if (cluster.clusterIndex === myClusterIdx) continue
      const dist = 1 - cosineSimilarity(paper.embedding, cluster.centroid)
      if (dist < b) b = dist
    }

    if (b === Infinity) continue

    const s = (b - a) / Math.max(a, b)
    totalScore += s
    count++
  }

  return count === 0 ? 0 : totalScore / count
}

/**
 * Select optimal k in [minK, maxK] by maximizing silhouette score.
 * Runs multiple clustering attempts and picks the best k.
 */
export function selectOptimalK(
  papers: PaperWithEmbedding[],
  minK: number = 8,
  maxK: number = 12
): number {
  if (papers.length <= minK) return Math.max(2, papers.length - 1)

  let bestK = minK
  let bestScore = -Infinity
  const clampedMax = Math.min(maxK, Math.floor(papers.length / 2))

  for (let k = minK; k <= clampedMax; k++) {
    try {
      const clusters = kMeans(papers, k)
      const score = silhouetteScore(papers, clusters)
      if (score > bestScore) {
        bestScore = score
        bestK = k
      }
    } catch {
      // Skip failed k values
    }
  }

  return bestK
}

/**
 * Full clustering pipeline: select k, run k-means, return results.
 */
export function clusterPapers(
  papers: PaperWithEmbedding[],
  minK: number = 8,
  maxK: number = 12
): ClusterResult[] {
  if (papers.length === 0) return []
  if (papers.length === 1) {
    return [{ clusterIndex: 0, centroid: papers[0].embedding, paperIds: [papers[0].id] }]
  }

  const k = selectOptimalK(papers, minK, maxK)
  return kMeans(papers, k)
}

/**
 * For a cluster, find the N papers closest to the centroid.
 * Used to get representative papers for cluster labeling.
 */
export function getPapersNearestToCentroid(
  papers: PaperWithEmbedding[],
  centroid: number[],
  n: number
): PaperWithEmbedding[] {
  return [...papers]
    .sort((a, b) => {
      const simA = cosineSimilarity(a.embedding, centroid)
      const simB = cosineSimilarity(b.embedding, centroid)
      return simB - simA
    })
    .slice(0, n)
}
