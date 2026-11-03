import {DatabaseService, type Worker, type Embedding} from '@database/DatabaseService';
import {EmbeddingService} from './EmbeddingService';
import {SimilarityEngine} from './SimilarityEngine';
import type {RecognitionResult, FaceEmbedding} from './RecognitionTypes';

export class RecognitionService {
  private embeddingService: EmbeddingService;
  private embeddingsCache: Map<string, Float32Array> = new Map();
  private static instance: RecognitionService;

  private constructor() {
    this.embeddingService = EmbeddingService.getInstance();
  }

  static getInstance(): RecognitionService {
    if (!RecognitionService.instance) {
      RecognitionService.instance = new RecognitionService();
    }
    return RecognitionService.instance;
  }

  async initialize(): Promise<void> {
    await this.embeddingService.loadModel();
    await this.loadEmbeddingsIntoCache();
  }

  private async loadEmbeddingsIntoCache(): Promise<void> {
    const embeddings = await DatabaseService.getAllEmbeddings();
    for (const embedding of embeddings) {
      const vector = this.deserializeEmbedding(embedding.embedding_vector);
      this.embeddingsCache.set(embedding.worker_id, vector);
    }
    console.log(`Loaded ${this.embeddingsCache.size} embeddings into cache`);
  }

  private serializeEmbedding(vector: Float32Array): string {
    return JSON.stringify(Array.from(vector));
  }

  private deserializeEmbedding(serialized: string): Float32Array {
    return new Float32Array(JSON.parse(serialized));
  }

  async recognizeFace(imageData: ImageData, threshold: number = 0.65): Promise<RecognitionResult> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(imageData);
    
    if (!queryEmbedding) {
      return {
        workerId: null,
        workerName: null,
        confidence: 0,
        similarity: 0,
        isMatch: false
      };
    }

    let bestMatch: string | null = null;
    let bestSimilarity = 0;

    for (const [workerId, embedding] of this.embeddingsCache.entries()) {
      const similarity = SimilarityEngine.cosineSimilarity(queryEmbedding.vector, embedding);
      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = workerId;
      }
    }

    let workerName = null;
    if (bestMatch) {
      const worker = await DatabaseService.getWorkerByWorkerId(bestMatch);
      workerName = worker?.name || null;
    }

    return {
      workerId: bestMatch,
      workerName,
      confidence: bestSimilarity,
      similarity: bestSimilarity,
      isMatch: bestMatch !== null && bestSimilarity >= threshold
    };
  }

  async enrollFace(
    imageDataList: ImageData[],
    worker: Omit<Worker, 'id'>
  ): Promise<{success: boolean; message: string}> {
    try {
      const embeddings = await this.embeddingService.generateMultipleEmbeddings(
        imageDataList,
        worker.worker_id
      );

      if (embeddings.length === 0) {
        return {
          success: false,
          message: 'No valid face detected in the images'
        };
      }

      const averageEmbedding = this.embeddingService.averageEmbeddings(embeddings);
      const serializedEmbedding = this.serializeEmbedding(averageEmbedding.vector);

      await DatabaseService.insertWorker(worker);
      await DatabaseService.insertEmbedding({
        worker_id: worker.worker_id,
        embedding_vector: serializedEmbedding,
        version: 1
      });

      this.embeddingsCache.set(worker.worker_id, averageEmbedding.vector);

      return {
        success: true,
        message: `Successfully enrolled ${worker.name} with ${embeddings.length} face samples`
      };
    } catch (error) {
      console.error('Enrollment failed:', error);
      return {
        success: false,
        message: `Enrollment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateEmbedding(workerId: string, newImageDataList: ImageData[]): Promise<boolean> {
    try {
      const existingWorker = await DatabaseService.getWorkerByWorkerId(workerId);
      if (!existingWorker) {
        console.error(`Worker ${workerId} not found`);
        return false;
      }

      const embeddings = await this.embeddingService.generateMultipleEmbeddings(
        newImageDataList,
        workerId
      );

      if (embeddings.length === 0) {
        return false;
      }

      const existingEmbedding = this.embeddingsCache.get(workerId);
      let finalEmbedding: FaceEmbedding;
      
      if (existingEmbedding) {
        const existing: FaceEmbedding = {
          vector: existingEmbedding,
          confidence: 0.9,
          timestamp: Date.now()
        };
        embeddings.push(existing);
        finalEmbedding = this.embeddingService.averageEmbeddings(embeddings);
      } else {
        finalEmbedding = this.embeddingService.averageEmbeddings(embeddings);
      }

      const serializedEmbedding = this.serializeEmbedding(finalEmbedding.vector);
      await DatabaseService.insertEmbedding({
        worker_id: workerId,
        embedding_vector: serializedEmbedding,
        version: Date.now()
      });

      this.embeddingsCache.set(workerId, finalEmbedding.vector);

      return true;
    } catch (error) {
      console.error('Failed to update embedding:', error);
      return false;
    }
  }

  async removeWorker(workerId: string): Promise<boolean> {
    try {
      await DatabaseService.executeQuery('DELETE FROM workers WHERE worker_id = ?', [workerId]);
      await DatabaseService.executeQuery('DELETE FROM embeddings WHERE worker_id = ?', [workerId]);
      this.embeddingsCache.delete(workerId);
      return true;
    } catch (error) {
      console.error('Failed to remove worker:', error);
      return false;
    }
  }

  async getAllRegisteredWorkers(): Promise<Worker[]> {
    return await DatabaseService.getAllWorkers();
  }

  async getEmbeddingCount(): Promise<number> {
    return this.embeddingsCache.size;
  }

  clearCache(): void {
    this.embeddingsCache.clear();
  }

  async getEmbedding(workerId: string): Promise<Float32Array | undefined> {
    return this.embeddingsCache.get(workerId);
  }
}