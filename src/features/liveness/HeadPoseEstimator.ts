import type {HeadPose} from './LivenessTypes';

export interface HeadPoseLandmarks {
  noseTip: {x: number; y: number};
  leftEyeCorner: {x: number; y: number};
  rightEyeCorner: {x: number; y: number};
  mouthLeft: {x: number; y: number};
  mouthRight: {x: number; y: number};
}

export class HeadPoseEstimator {
  private static readonly HEAD_TURN_THRESH = 25;
  private static readonly HEAD_NOD_THRESH = 20;
  private static readonly HEAD_TILT_THRESH = 30;
  
  private yawHistory: number[] = [];
  private pitchHistory: number[] = [];
  private rollHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;

  calculateHeadPose(landmarks: HeadPoseLandmarks): HeadPose {
    const nose = landmarks.noseTip;
    const leftEye = landmarks.leftEyeCorner;
    const rightEye = landmarks.rightEyeCorner;
    const mouthLeft = landmarks.mouthLeft;
    const mouthRight = landmarks.mouthRight;

    const horizontalDisplacement = (rightEye.x - leftEye.x) / 100;
    const yaw = this.calculateYaw(landmarks);
    const pitch = this.calculatePitch(landmarks);
    const roll = this.calculateRoll(landmarks);

    this.updateHistory('yaw', yaw);
    this.updateHistory('pitch', pitch);
    this.updateHistory('roll', roll);

    const smoothedYaw = this.getSmoothedValue(this.yawHistory);
    const smoothedPitch = this.getSmoothedValue(this.pitchHistory);
    const smoothedRoll = this.getSmoothedValue(this.rollHistory);

    return {
      yaw: smoothedYaw,
      pitch: smoothedPitch,
      roll: smoothedRoll,
      isValid: this.validatePose(smoothedYaw, smoothedPitch, smoothedRoll)
    };
  }

  private calculateYaw(landmarks: HeadPoseLandmarks): number {
    const leftEye = landmarks.leftEyeCorner;
    const rightEye = landmarks.rightEyeCorner;
    const nose = landmarks.noseTip;
    
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const horizontalOffset = nose.x - eyeCenterX;
    const faceWidth = Math.abs(rightEye.x - leftEye.x);
    
    if (faceWidth === 0) return 0;
    
    const yawAngle = (horizontalOffset / faceWidth) * 60;
    return Math.max(-45, Math.min(45, yawAngle));
  }

  private calculatePitch(landmarks: HeadPoseLandmarks): number {
    const nose = landmarks.noseTip;
    const leftEye = landmarks.leftEyeCorner;
    const rightEye = landmarks.rightEyeCorner;
    
    const eyeCenterY = (leftEye.y + rightEye.y) / 2;
    const verticalOffset = nose.y - eyeCenterY;
    const faceHeight = Math.abs(eyeCenterY - nose.y) * 2;
    
    if (faceHeight === 0) return 0;
    
    const pitchAngle = (verticalOffset / faceHeight) * 50;
    return Math.max(-35, Math.min(35, pitchAngle));
  }

  private calculateRoll(landmarks: HeadPoseLandmarks): number {
    const leftEye = landmarks.leftEyeCorner;
    const rightEye = landmarks.rightEyeCorner;
    
    const dy = rightEye.y - leftEye.y;
    const dx = rightEye.x - leftEye.x;
    
    if (dx === 0) return 0;
    
    const rollAngle = Math.atan2(dy, dx) * 180 / Math.PI;
    return Math.max(-40, Math.min(40, rollAngle));
  }

  private updateHistory(type: 'yaw' | 'pitch' | 'roll', value: number): void {
    let history: number[];
    switch (type) {
      case 'yaw':
        history = this.yawHistory;
        break;
      case 'pitch':
        history = this.pitchHistory;
        break;
      case 'roll':
        history = this.rollHistory;
        break;
      default:
        return;
    }
    
    history.push(value);
    if (history.length > this.HISTORY_SIZE) {
      history.shift();
    }
  }

  private getSmoothedValue(history: number[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((a, b) => a + b, 0);
    return sum / history.length;
  }

  private validatePose(yaw: number, pitch: number, roll: number): boolean {
    return Math.abs(yaw) <= 45 &&
           Math.abs(pitch) <= 35 &&
           Math.abs(roll) <= 40;
  }

  detectHeadTurn(yaw: number): 'LEFT' | 'RIGHT' | 'CENTER' {
    if (yaw <= -this.HEAD_TURN_THRESH) return 'LEFT';
    if (yaw >= this.HEAD_TURN_THRESH) return 'RIGHT';
    return 'CENTER';
  }

  detectHeadNod(pitch: number): 'UP' | 'DOWN' | 'CENTER' {
    if (pitch <= -this.HEAD_NOD_THRESH) return 'UP';
    if (pitch >= this.HEAD_NOD_THRESH) return 'DOWN';
    return 'CENTER';
  }

  detectHeadTilt(roll: number): 'LEFT' | 'RIGHT' | 'CENTER' {
    if (roll <= -this.HEAD_TILT_THRESH) return 'LEFT';
    if (roll >= this.HEAD_TILT_THRESH) return 'RIGHT';
    return 'CENTER';
  }

  isHeadFacingCamera(yaw: number, pitch: number, roll: number): boolean {
    return Math.abs(yaw) <= 15 && Math.abs(pitch) <= 15 && Math.abs(roll) <= 15;
  }

  reset(): void {
    this.yawHistory = [];
    this.pitchHistory = [];
    this.rollHistory = [];
  }

  getHeadPoseScore(yaw: number, pitch: number, roll: number): number {
    let score = 1.0;
    score -= Math.min(0.4, Math.abs(yaw) / 112.5);
    score -= Math.min(0.3, Math.abs(pitch) / 116.7);
    score -= Math.min(0.3, Math.abs(roll) / 133.3);
    return Math.max(0, Math.min(1, score));
  }
}