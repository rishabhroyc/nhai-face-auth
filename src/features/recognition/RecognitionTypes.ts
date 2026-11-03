export interface FaceDetection {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: FaceLandmarks;
  confidence: number;
}

export interface FaceLandmarks {
  leftEye: {x: number; y: number}[];
  rightEye: {x: number; y: number}[];
  nose: {x: number; y: number};
  mouth: {x: number; y: number}[];
  faceOval: {x: number; y: number}[];
  leftEyebrow: {x: number; y: number}[];
  rightEyebrow: {x: number; y: number}[];
}

export interface FaceEmbedding {
  vector: Float32Array;
  confidence: number;
  timestamp: number;
}

export interface RecognitionResult {
  workerId: string | null;
  workerName: string | null;
  confidence: number;
  similarity: number;
  isMatch: boolean;
  matchedEmbedding?: FaceEmbedding;
}

export interface EnrollmentResult {
  workerId: string;
  success: boolean;
  embeddingCount: number;
  message: string;
}

export interface MatchingThreshold {
  high: number;
  medium: number;
  low: number;
  current: number;
}

export const DEFAULT_THRESHOLDS: MatchingThreshold = {
  high: 0.75,
  medium: 0.65,
  low: 0.55,
  current: 0.65
};