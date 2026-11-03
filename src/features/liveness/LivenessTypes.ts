export interface LivenessResult {
  passed: boolean;
  score: number;
  challengeCompleted: boolean;
  currentChallenge?: LivenessChallenge;
  metrics: LivenessMetrics;
}

export interface LivenessMetrics {
  blinkCount: number;
  lastBlinkTimestamp: number;
  smileIntensity: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  isBlinking: boolean;
  isSmiling: boolean;
}

export interface LivenessChallenge {
  type: 'BLINK' | 'SMILE' | 'HEAD_TURN_LEFT' | 'HEAD_TURN_RIGHT';
  instruction: string;
  expectedAction: string;
  threshold: number;
  completed: boolean;
  startedAt: number;
  completedAt?: number;
}

export interface BlinkMetrics {
  eyeAspectRatio: number;
  isBlinking: boolean;
  blinkCount: number;
}

export interface SmileMetrics {
  mouthAspectRatio: number;
  isSmiling: boolean;
  smileIntensity: number;
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
  isValid: boolean;
}

export interface LandmarkIndices {
  LEFT_EYE_START: number;
  LEFT_EYE_END: number;
  RIGHT_EYE_START: number;
  RIGHT_EYE_END: number;
  NOSE_TIP: number;
  MOUTH_LEFT: number;
  MOUTH_RIGHT: number;
  MOUTH_TOP: number;
  MOUTH_BOTTOM: number;
  LEFT_EYE_CORNER: number;
  RIGHT_EYE_CORNER: number;
}

export const LANDMARK_INDICES: LandmarkIndices = {
  LEFT_EYE_START: 33,
  LEFT_EYE_END: 42,
  RIGHT_EYE_START: 263,
  RIGHT_EYE_END: 272,
  NOSE_TIP: 1,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  LEFT_EYE_CORNER: 133,
  RIGHT_EYE_CORNER: 362
};