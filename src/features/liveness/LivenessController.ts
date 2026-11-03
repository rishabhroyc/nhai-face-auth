import {BlinkDetector} from './BlinkDetector';
import {SmileDetector} from './SmileDetector';
import {HeadPoseEstimator} from './HeadPoseEstimator';
import type {
  LivenessResult,
  LivenessMetrics,
  LivenessChallenge,
  HeadPoseLandmarks
} from './LivenessTypes';

export class LivenessController {
  private blinkDetector: BlinkDetector;
  private smileDetector: SmileDetector;
  private headPoseEstimator: HeadPoseEstimator;
  private currentChallenge: LivenessChallenge | null = null;
  private challengeSequence: LivenessChallenge[] = [];
  private challengeIndex: number = 0;
  private livenessScore: number = 0;
  private frameProcessingCount: number = 0;

  constructor() {
    this.blinkDetector = new BlinkDetector();
    this.smileDetector = new SmileDetector();
    this.headPoseEstimator = new HeadPoseEstimator();
  }

  initializeChallengeSequence(): void {
    this.challengeSequence = [
      {
        type: 'BLINK',
        instruction: 'Please blink your eyes',
        expectedAction: 'blink detected',
        threshold: 0.7,
        completed: false,
        startedAt: Date.now()
      },
      {
        type: 'HEAD_TURN_LEFT',
        instruction: 'Please turn your head to the left',
        expectedAction: 'head turned left',
        threshold: 25,
        completed: false,
        startedAt: Date.now()
      },
      {
        type: 'HEAD_TURN_RIGHT',
        instruction: 'Please turn your head to the right',
        expectedAction: 'head turned right',
        threshold: 25,
        completed: false,
        startedAt: Date.now()
      },
      {
        type: 'SMILE',
        instruction: 'Please smile',
        expectedAction: 'smile detected',
        threshold: 0.6,
        completed: false,
        startedAt: Date.now()
      }
    ];
    this.challengeIndex = 0;
    this.currentChallenge = this.challengeSequence[0];
    this.livenessScore = 0;
  }

  processFrame(
    leftEyeLandmarks: {x: number; y: number}[],
    rightEyeLandmarks: {x: number; y: number}[],
    mouthTop: {x: number; y: number},
    mouthBottom: {x: number; y: number},
    mouthLeft: {x: number; y: number},
    mouthRight: {x: number; y: number},
    headPoseLandmarks: HeadPoseLandmarks
  ): LivenessResult {
    this.frameProcessingCount++;

    const blinkMetrics = this.blinkDetector.processBlinkDetection(
      leftEyeLandmarks,
      rightEyeLandmarks
    );

    const smileMetrics = this.smileDetector.processSmileDetection(
      mouthTop,
      mouthBottom,
      mouthLeft,
      mouthRight
    );

    const headPose = this.headPoseEstimator.calculateHeadPose(headPoseLandmarks);

    const metrics: LivenessMetrics = {
      blinkCount: blinkMetrics.blinkCount,
      lastBlinkTimestamp: Date.now(),
      smileIntensity: smileMetrics.smileIntensity,
      headYaw: headPose.yaw,
      headPitch: headPose.pitch,
      headRoll: headPose.roll,
      isBlinking: blinkMetrics.isBlinking,
      isSmiling: smileMetrics.isSmiling
    };

    let challengeCompleted = false;
    if (this.currentChallenge && !this.currentChallenge.completed) {
      challengeCompleted = this.evaluateChallenge(
        this.currentChallenge,
        blinkMetrics,
        smileMetrics,
        headPose
      );
      
      if (challengeCompleted) {
        this.currentChallenge.completed = true;
        this.currentChallenge.completedAt = Date.now();
        this.challengeIndex++;
        
        if (this.challengeIndex < this.challengeSequence.length) {
          this.currentChallenge = this.challengeSequence[this.challengeIndex];
        } else {
          this.currentChallenge = null;
        }
      }
    }

    const allChallengesCompleted = this.challengeIndex >= this.challengeSequence.length;
    
    if (allChallengesCompleted) {
      this.livenessScore = this.calculateOverallScore(metrics);
    } else if (this.currentChallenge) {
      this.livenessScore = this.calculateProgressScore();
    }

    return {
      passed: allChallengesCompleted && this.livenessScore >= 0.7,
      score: this.livenessScore,
      challengeCompleted: challengeCompleted,
      currentChallenge: this.currentChallenge || undefined,
      metrics
    };
  }

  private evaluateChallenge(
    challenge: LivenessChallenge,
    blinkMetrics: any,
    smileMetrics: any,
    headPose: any
  ): boolean {
    switch (challenge.type) {
      case 'BLINK':
        return this.blinkDetector.validateBlinkEvent(blinkMetrics);
      case 'SMILE':
        return this.smileDetector.validateSmileEvent(smileMetrics, challenge.threshold);
      case 'HEAD_TURN_LEFT':
        return headPose.yaw <= -challenge.threshold;
      case 'HEAD_TURN_RIGHT':
        return headPose.yaw >= challenge.threshold;
      default:
        return false;
    }
  }

  private calculateOverallScore(metrics: LivenessMetrics): number {
    let score = 0;
    
    if (metrics.blinkCount >= 2) score += 0.25;
    else if (metrics.blinkCount >= 1) score += 0.15;
    
    if (metrics.smileIntensity >= 0.6) score += 0.25;
    else if (metrics.smileIntensity >= 0.4) score += 0.15;
    
    const headPoseScore = this.headPoseEstimator.getHeadPoseScore(
      metrics.headYaw,
      metrics.headPitch,
      metrics.headRoll
    );
    score += headPoseScore * 0.5;
    
    return Math.min(1.0, score);
  }

  private calculateProgressScore(): number {
    const completed = this.challengeSequence.filter(c => c.completed).length;
    const total = this.challengeSequence.length;
    return completed / total;
  }

  reset(): void {
    this.blinkDetector.reset();
    this.smileDetector.reset();
    this.headPoseEstimator.reset();
    this.currentChallenge = null;
    this.challengeSequence = [];
    this.challengeIndex = 0;
    this.livenessScore = 0;
    this.frameProcessingCount = 0;
  }

  getCurrentChallenge(): LivenessChallenge | null {
    return this.currentChallenge;
  }

  getChallengeProgress(): {completed: number; total: number} {
    return {
      completed: this.challengeSequence.filter(c => c.completed).length,
      total: this.challengeSequence.length
    };
  }

  isLivenessComplete(): boolean {
    return this.challengeIndex >= this.challengeSequence.length;
  }
}