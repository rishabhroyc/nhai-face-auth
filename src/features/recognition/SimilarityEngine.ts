export class SimilarityEngine {
  static cosineSimilarity(embedding1: Float32Array, embedding2: Float32Array): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return (similarity + 1) / 2;
  }

  static euclideanDistance(embedding1: Float32Array, embedding2: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  static manhattanDistance(embedding1: Float32Array, embedding2: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      sum += Math.abs(embedding1[i] - embedding2[i]);
    }
    return sum;
  }

  static findBestMatch(
    queryEmbedding: Float32Array,
    embeddings: Map<string, Float32Array>,
    threshold: number = 0.65
  ): {workerId: string | null; similarity: number} {
    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    for (const [workerId, embedding] of embeddings.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = workerId;
      }
    }

    return {workerId: bestMatch, similarity: bestSimilarity};
  }

  static verifyFace(
    embedding1: Float32Array,
    embedding2: Float32Array,
    threshold: number = 0.65
  ): {isMatch: boolean; similarity: number} {
    const similarity = this.cosineSimilarity(embedding1, embedding2);
    return {
      isMatch: similarity >= threshold,
      similarity
    };
  }

  static normalizeEmbedding(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm === 0) {
      return embedding;
    }
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm;
    }
    return normalized;
  }
}