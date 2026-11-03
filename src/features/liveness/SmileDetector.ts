import type {SmileMetrics} from './LivenessTypes';

export class SmileDetector {
  private static readonly MOUTH_AR_THRESH = 0.45;
  private static readonly SMILE_INTENSITY_MAX = 0.65;
  private static readonly SMILE_INTENSITY_MIN = 0.35;
  
  private smileFrameCount: number = 0;
  private isSmiling: boolean = false;
  private smileIntensity: number = 0;

  calculateMouthAspectRatio(
    mouthTop: {x: number; y: number},
    mouthBottom: {x: number; y: number},
    mouthLeft: {x: number; y: number},
    mouthRight: {x: number; y: number}
  ): number {
    const verticalDistance = this.euclideanDistance(mouthTop, mouthBottom);
    const horizontalDistance = this.euclideanDistance(mouthLeft, mouthRight);
    
    if (horizontalDistance === 0) {
      return 0;
    }
    
    return verticalDistance / horizontalDistance;
  }

  private euclideanDistance(p1: {x: number; y: number}, p2: {x: number; y: number}): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  processSmileDetection(
    mouthTop: {x: number; y: number},
    mouthBottom: {x: number; y: number},
    mouthLeft: {x: number; y: number},
    mouthRight: {x: number; y: number}
  ): SmileMetrics {
    const mouthAspectRatio = this.calculateMouthAspectRatio(
      mouthTop,
      mouthBottom,
      mouthLeft,
      mouthRight
    );

    const isSmiling = mouthAspectRatio > SmileDetector.MOUTH_AR_THRESH;
    
    let smileIntensity = 0;
    if (isSmiling) {
      if (mouthAspectRatio <= SmileDetector.SMILE_INTENSITY_MIN) {
        smileIntensity = 0.3;
      } else if (mouthAspectRatio >= SmileDetector.SMILE_INTENSITY_MAX) {
        smileIntensity = 1.0;
      } else {
        smileIntensity = (mouthAspectRatio - SmileDetector.SMILE_INTENSITY_MIN) /
          (SmileDetector.SMILE_INTENSITY_MAX - SmileDetector.SMILE_INTENSITY_MIN);
      }
    }

    if (isSmiling) {
      this.smileFrameCount++;
    } else {
      if (this.smileFrameCount >= 5) {
        this.smileFrameCount = 0;
      }
      this.smileFrameCount = 0;
    }

    this.isSmiling = isSmiling;
    this.smileIntensity = smileIntensity;

    return {
      mouthAspectRatio,
      isSmiling,
      smileIntensity
    };
  }

  reset(): void {
    this.smileFrameCount = 0;
    this.isSmiling = false;
    this.smileIntensity = 0;
  }

  getSmileStatus(): {isSmiling: boolean; intensity: number} {
    return {
      isSmiling: this.isSmiling,
      intensity: this.smileIntensity
    };
  }

  validateSmileEvent(smileMetrics: SmileMetrics, requiredIntensity: number = 0.6): boolean {
    return smileMetrics.isSmiling && smileMetrics.smileIntensity >= requiredIntensity;
  }

  getNormalizedMar(mar: number): number {
    const min = 0.2;
    const max = 0.7;
    if (mar <= min) return 0;
    if (mar >= max) return 1;
    return (mar - min) / (max - min);
  }
}