import {DatabaseService, type PendingSync} from '@database/DatabaseService';
import NetInfo from '@react-native-community/netinfo';

export class SyncQueue {
  private isProcessing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30000;
  private listeners: ((status: SyncStatus) => void)[] = [];

  start(): void {
    if (this.syncInterval) {
      this.stop();
    }
    this.syncInterval = setInterval(() => this.processQueue(), this.SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected || !netInfo.isInternetReachable) {
      this.notifyListeners({status: 'OFFLINE', pendingCount: await this.getQueueSize()});
      return;
    }

    this.isProcessing = true;
    
    try {
      const pendingRecords = await DatabaseService.getPendingSyncRecords();
      
      if (pendingRecords.length === 0) {
        this.notifyListeners({status: 'IDLE', pendingCount: 0});
        this.isProcessing = false;
        return;
      }

      this.notifyListeners({
        status: 'SYNCING',
        pendingCount: pendingRecords.length,
        currentIndex: 0
      });

      for (let i = 0; i < pendingRecords.length; i++) {
        const record = pendingRecords[i];
        this.notifyListeners({
          status: 'SYNCING',
          pendingCount: pendingRecords.length,
          currentIndex: i + 1
        });

        const success = await this.syncRecord(record);
        
        if (success) {
          await DatabaseService.removePendingSyncRecord(record.id);
        } else {
          await DatabaseService.updatePendingSyncRetry(record.id);
          
          if (record.retry_count >= 5) {
            await DatabaseService.insertAuditLog(
              'SYNC_FAILED',
              `Failed to sync ${record.record_type} ${record.record_id} after ${record.retry_count} attempts`,
              undefined,
              'SyncQueue'
            );
          }
        }
      }

      const remainingCount = await this.getQueueSize();
      this.notifyListeners({
        status: remainingCount === 0 ? 'IDLE' : 'ERROR',
        pendingCount: remainingCount
      });
    } catch (error) {
      console.error('Sync queue processing error:', error);
      this.notifyListeners({
        status: 'ERROR',
        pendingCount: await this.getQueueSize(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async syncRecord(record: PendingSync): Promise<boolean> {
    try {
      const payload = JSON.parse(record.payload);
      const endpoint = this.getEndpointForRecordType(record.record_type);
      
      const response = await fetch(endpoint, {
        method: record.operation === 'DELETE' ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': await this.getDeviceId()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        if (record.record_type === 'attendance') {
          await DatabaseService.markAttendanceSynced(record.record_id);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to sync record ${record.id}:`, error);
      return false;
    }
  }

  private getEndpointForRecordType(recordType: string): string {
    switch (recordType) {
      case 'attendance':
        return 'https://mock-api.nhai.com/v1/attendance/sync';
      case 'worker':
        return 'https://mock-api.nhai.com/v1/workers/sync';
      case 'embedding':
        return 'https://mock-api.nhai.com/v1/embeddings/sync';
      default:
        return 'https://mock-api.nhai.com/v1/sync';
    }
  }

  private async getDeviceId(): Promise<string> {
    const DeviceInfo = require('react-native-device-info').default;
    return DeviceInfo.getDeviceId();
  }

  async getQueueSize(): Promise<number> {
    const records = await DatabaseService.getPendingSyncRecords();
    return records.length;
  }

  addListener(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach(listener => listener(status));
  }
}

export interface SyncStatus {
  status: 'IDLE' | 'SYNCING' | 'OFFLINE' | 'ERROR';
  pendingCount: number;
  currentIndex?: number;
  error?: string;
}