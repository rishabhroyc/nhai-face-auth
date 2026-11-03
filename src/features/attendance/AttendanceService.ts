import {DatabaseService} from '@database/DatabaseService';
import {RecognitionService} from '@features/recognition/RecognitionService';
import {LivenessController} from '@features/liveness/LivenessController';
import {GeofenceService} from '@services/GeofenceService';
import DeviceInfo from 'react-native-device-info';
import type {RecognitionResult} from '@features/recognition/RecognitionTypes';
import type {LivenessResult} from '@features/liveness/LivenessTypes';

export interface AttendanceRequest {
  workerId: string;
  confidence: number;
  livenessScore: number;
  latitude: number;
  longitude: number;
  imageBase64?: string;
}

export interface AttendanceResponse {
  success: boolean;
  attendanceId?: number;
  message: string;
  timestamp?: string;
}

export class AttendanceService {
  private recognitionService: RecognitionService;
  private livenessController: LivenessController;
  private geofenceService: GeofenceService;
  private static instance: AttendanceService;

  private constructor() {
    this.recognitionService = RecognitionService.getInstance();
    this.livenessController = new LivenessController();
    this.geofenceService = GeofenceService.getInstance();
  }

  static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService();
    }
    return AttendanceService.instance;
  }

  async initialize(): Promise<void> {
    await this.recognitionService.initialize();
    await this.geofenceService.initializeSiteLocation(28.6139, 77.2090, 500);
  }

  async markAttendance(
    faceImageData: ImageData,
    latitude: number,
    longitude: number
  ): Promise<AttendanceResponse> {
    try {
      const isWithinGeofence = this.geofenceService.isWithinGeofence(latitude, longitude);
      
      if (!isWithinGeofence) {
        const distance = this.geofenceService.getDistanceFromSite(latitude, longitude);
        return {
          success: false,
          message: `You are ${distance.toFixed(2)} meters away from the authorized site. Please move within the geofence.`
        };
      }

      const recognitionResult = await this.recognitionService.recognizeFace(faceImageData);
      
      if (!recognitionResult.isMatch) {
        await DatabaseService.insertAuditLog(
          'ATTENDANCE_FAILED',
          `Face recognition failed. Confidence: ${recognitionResult.confidence.toFixed(3)}`,
          undefined,
          await DeviceInfo.getDeviceId()
        );
        return {
          success: false,
          message: `Face not recognized. Confidence: ${recognitionResult.confidence.toFixed(2)}%`
        };
      }

      const livenessResult = await this.performLivenessCheck();
      
      if (!livenessResult.passed) {
        await DatabaseService.insertAuditLog(
          'ATTENDANCE_FAILED',
          `Liveness check failed. Score: ${livenessResult.score.toFixed(2)}`,
          recognitionResult.workerId || undefined,
          await DeviceInfo.getDeviceId()
        );
        return {
          success: false,
          message: `Liveness verification failed. Score: ${(livenessResult.score * 100).toFixed(0)}%`
        };
      }

      const attendanceId = await DatabaseService.insertAttendance({
        worker_id: recognitionResult.workerId!,
        timestamp: new Date().toISOString(),
        confidence_score: recognitionResult.confidence,
        liveness_score: livenessResult.score,
        latitude,
        longitude,
        device_id: await DeviceInfo.getDeviceId(),
        is_synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        created_at: new Date().toISOString()
      });

      await DatabaseService.insertAuditLog(
        'ATTENDANCE_SUCCESS',
        `Attendance marked for ${recognitionResult.workerName} with confidence ${(recognitionResult.confidence * 100).toFixed(0)}%`,
        recognitionResult.workerId || undefined,
        await DeviceInfo.getDeviceId()
      );

      this.livenessController.reset();

      return {
        success: true,
        attendanceId,
        message: `Attendance marked successfully for ${recognitionResult.workerName}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Attendance marking failed:', error);
      await DatabaseService.insertAuditLog(
        'ATTENDANCE_ERROR',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        await DeviceInfo.getDeviceId()
      );
      return {
        success: false,
        message: `Failed to mark attendance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performLivenessCheck(): Promise<LivenessResult> {
    return new Promise((resolve) => {
      let framesProcessed = 0;
      const maxFrames = 150;
      let lastResult: LivenessResult | null = null;

      const interval = setInterval(() => {
        framesProcessed++;
        
        if (lastResult && lastResult.passed) {
          clearInterval(interval);
          resolve(lastResult);
        } else if (framesProcessed >= maxFrames) {
          clearInterval(interval);
          if (lastResult) {
            resolve(lastResult);
          } else {
            resolve({
              passed: false,
              score: 0,
              challengeCompleted: false,
              metrics: {
                blinkCount: 0,
                lastBlinkTimestamp: 0,
                smileIntensity: 0,
                headYaw: 0,
                headPitch: 0,
                headRoll: 0,
                isBlinking: false,
                isSmiling: false
              }
            });
          }
        }
      }, 100);
    });
  }

  async getTodayAttendance(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const query = `
      SELECT a.*, w.name as worker_name, w.employee_code
      FROM attendance a
      INNER JOIN workers w ON a.worker_id = w.worker_id
      WHERE DATE(a.timestamp) = DATE(?)
      ORDER BY a.timestamp DESC
    `;
    const results = await DatabaseService.executeQuery(query, [today]);
    return results;
  }

  async getAttendanceStats(startDate: string, endDate: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_attendance,
        AVG(confidence_score) as avg_confidence,
        AVG(liveness_score) as avg_liveness,
        COUNT(DISTINCT worker_id) as unique_workers,
        SUM(CASE WHEN is_synced = 1 THEN 1 ELSE 0 END) as synced_count
      FROM attendance
      WHERE DATE(timestamp) BETWEEN DATE(?) AND DATE(?)
    `;
    const results = await DatabaseService.executeQuery(query, [startDate, endDate]);
    return results[0] || {
      total_attendance: 0,
      avg_confidence: 0,
      avg_liveness: 0,
      unique_workers: 0,
      synced_count: 0
    };
  }

  async verifyExistingAttendance(workerId: string, date: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM attendance
      WHERE worker_id = ? AND DATE(timestamp) = DATE(?)
    `;
    const results = await DatabaseService.executeQuery(query, [workerId, date]);
    return results[0]?.count > 0;
  }
}