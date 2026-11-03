import type {BlinkMetrics} from './LivenessTypes';

export class BlinkDetector {
  private static readonly EYE_AR_THRESH = 0.2;
  private static readonly EYE_AR_CONSEC_FRAMES = 3;
  private static readonly EAR_MIN = 0.15;
  private static readonly EAR_MAX = 0.35;
  
  private blinkCounter: number = 0;
  private totalBlinks: number = 0;
  private eyeOpen: boolean = true;
  private frameCounter: number = 0;

  calculateEyeAspectRatio(eyeLandmarks: {x: number; y: number}[]): number {
    if (eyeLandmarks.length < 6) {
      return 0;
    }

    const p1 = eyeLandmarks[1];
    const p5 = eyeLandmarks[5];
    const p2 = eyeLandmarks[2];
    const p4 = eyeLandmarks[4];
    const p0 = eyeLandmarks[0];
    const p3 = eyeLandmarks[3];

    const vertical1 = this.euclideanDistance(p2, p4);
    const vertical2 = this.euclideanDistance(p1, p5);
    const horizontal = this.euclideanDistance(p0, p3);

    if (horizontal === 0) {
      return 0;
    }

    return (vertical1 + vertical2) / (2.0 * horizontal);
  }

  private euclideanDistance(p1: {x: number; y: number}, p2: {x: number; y: number}): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  processBlinkDetection(
    leftEyeLandmarks: {x: number; y: number}[],
    rightEyeLandmarks: {x: number; y: number}[]
  ): BlinkMetrics {
    const leftEAR = this.calculateEyeAspectRatio(leftEyeLandmarks);
    const rightEAR = this.calculateEyeAspectRatio(rightEyeLandmarks);
    const ear = (leftEAR + rightEAR) / 2.0;

    let isBlinking = false;
    let blinkCount = this.totalBlinks;

    if (ear < BlinkDetector.EYE_AR_THRESH) {
      this.blinkCounter++;
    } else {
      if (this.blinkCounter >= BlinkDetector.EYE_AR_CONSEC_FRAMES) {
        this.totalBlinks++;
        blinkCount = this.totalBlinks;
      }
      this.blinkCounter = 0;
    }

    isBlinking = ear < BlinkDetector.EYE_AR_THRESH;

    this.eyeOpen = !isBlinking;

    return {
      eyeAspectRatio: ear,
      isBlinking,
      blinkCount
    };
  }

  reset(): void {
    this.blinkCounter = 0;
    this.totalBlinks = 0;
    this.eyeOpen = true;
    this.frameCounter = 0;
  }

  getBlinkStatus(): {blinkCount: number; isBlinking: boolean} {
    return {
      blinkCount: this.totalBlinks,
      isBlinking: !this.eyeOpen
    };
  }

  validateBlinkEvent(blinkMetrics: BlinkMetrics): boolean {
    return blinkMetrics.isBlinking && blinkMetrics.eyeAspectRatio < this.EYE_AR_THRESH;
  }

  getNormalizedEAR(ear: number): number {
    if (ear <= this.EAR_MIN) return 0;
    if (ear >= this.EAR_MAX) return 1;
    return (ear - this.EAR_MIN) / (this.EAR_MAX - this.EAR_MIN);
  }
}