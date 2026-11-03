import {loadTensorflowModel, type TensorflowModel} from 'react-native-fast-tflite';
import {FaceAlignment} from './FaceAlignment';
import type {FaceEmbedding} from './RecognitionTypes';

export class EmbeddingService {
  private model: TensorflowModel | null = null;
  private modelLoaded: boolean = false;
  private embeddingCache: Map<string, Float32Array> = new Map();
  private static instance: EmbeddingService;

  private constructor() {}

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async loadModel(): Promise<void> {
    if (this.modelLoaded) return;

    try {
      this.model = await loadTensorflowModel(
        require('../../assets/models/mobilefacenet.tflite')
      );
      this.modelLoaded = true;
      console.log('MobileFaceNet model loaded successfully');
    } catch (error) {
      console.error('Failed to load MobileFaceNet model:', error);
      throw error;
    }
  }

  async generateEmbedding(imageData: ImageData): Promise<FaceEmbedding | null> {
    if (!this.modelLoaded) {
      await this.loadModel();
    }

    try {
      const preprocessed = FaceAlignment.preprocessForTFLite(imageData);
      const outputs = await this.model!.run([preprocessed]);
      const embedding = new Float32Array(outputs[0]);
      const normalizedEmbedding = this.normalize(embedding);
      
      return {
        vector: normalizedEmbedding,
        confidence: 0.95,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  private normalize(embedding: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < embedding.length; i++) {
      norm += embedding[i] * embedding[i];
    }
    norm = Math.sqrt(norm);
    
    if (norm === 0) return embedding;
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm;
    }
    return normalized;
  }

  async generateMultipleEmbeddings(
    imageDataList: ImageData[],
    workerId: string
  ): Promise<FaceEmbedding[]> {
    const embeddings: FaceEmbedding[] = [];
    
    for (const imageData of imageDataList) {
      const embedding = await this.generateEmbedding(imageData);
      if (embedding) {
        embeddings.push(embedding);
      }
    }
    
    if (embeddings.length > 0) {
      const averagedEmbedding = this.averageEmbeddings(embeddings);
      this.cacheEmbedding(workerId, averagedEmbedding.vector);
    }
    
    return embeddings;
  }

  averageEmbeddings(embeddings: FaceEmbedding[]): FaceEmbedding {
    const sum = new Float32Array(embeddings[0].vector.length);
    let totalConfidence = 0;
    
    for (const embedding of embeddings) {
      for (let i = 0; i < embedding.vector.length; i++) {
        sum[i] += embedding.vector[i];
      }
      totalConfidence += embedding.confidence;
    }
    
    for (let i = 0; i < sum.length; i++) {
      sum[i] /= embeddings.length;
    }
    
    return {
      vector: sum,
      confidence: totalConfidence / embeddings.length,
      timestamp: Date.now()
    };
  }

  cacheEmbedding(workerId: string, embedding: Float32Array): void {
    this.embeddingCache.set(workerId, embedding);
  }

  getCachedEmbedding(workerId: string): Float32Array | undefined {
    return this.embeddingCache.get(workerId);
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  async unloadModel(): Promise<void> {
    if (this.model) {
      this.model = null;
      this.modelLoaded = false;
      this.clearCache();
    }
  }
}