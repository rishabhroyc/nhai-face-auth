import {create} from 'zustand';
import {RecognitionService} from '@features/recognition/RecognitionService';
import {EmbeddingService} from '@features/recognition/EmbeddingService';

interface FaceRecognitionState {
  isInitialized: boolean;
  isModelLoaded: boolean;
  embeddingCount: number;
  recentMatches: Array<{workerId: string; confidence: number; timestamp: number}>;
  initializeModels: () => Promise<void>;
  setModelLoaded: (loaded: boolean) => void;
  addRecentMatch: (workerId: string, confidence: number) => void;
  getEmbeddingCount: () => Promise<number>;
}

export const useFaceRecognitionStore = create<FaceRecognitionState>((set, get) => ({
  isInitialized: false,
  isModelLoaded: false,
  embeddingCount: 0,
  recentMatches: [],

  initializeModels: async () => {
    const recognitionService = RecognitionService.getInstance();
    await recognitionService.initialize();
    const embeddingService = EmbeddingService.getInstance();
    await embeddingService.loadModel();
    const count = await recognitionService.getEmbeddingCount();
    set({
      isInitialized: true,
      isModelLoaded: true,
      embeddingCount: count
    });
  },

  setModelLoaded: (loaded: boolean) => set({isModelLoaded: loaded}),

  addRecentMatch: (workerId: string, confidence: number) => {
    const recentMatches = get().recentMatches;
    const newMatch = {workerId, confidence, timestamp: Date.now()};
    const updatedMatches = [newMatch, ...recentMatches].slice(0, 10);
    set({recentMatches: updatedMatches});
  },

  getEmbeddingCount: async () => {
    const recognitionService = RecognitionService.getInstance();
    const count = await recognitionService.getEmbeddingCount();
    set({embeddingCount: count});
    return count;
  }
}));