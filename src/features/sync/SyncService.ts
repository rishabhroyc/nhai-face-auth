import {SyncQueue} from './SyncQueue';
import NetInfo from '@react-native-community/netinfo';
import {DatabaseService} from '@database/DatabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SyncService {
  private syncQueue: SyncQueue;
  private static instance: SyncService;
  private isInitialized: boolean = false;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.syncQueue = new SyncQueue();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.setupNetworkListener();
    this.syncQueue.start();
    
    const lastSyncTimestamp = await AsyncStorage.getItem('last_sync_timestamp');
    if (!lastSyncTimestamp) {
      await this.syncQueue.processQueue();
    }
    
    this.isInitialized = true;
    console.log('Sync service initialized');
  }

  private async setupNetworkListener(): Promise<void> {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('Network connected, triggering sync');
        this.syncQueue.processQueue();
      } else {
        console.log('Network disconnected');
      }
    });
  }

  async forceSync(): Promise<void> {
    await this.syncQueue.processQueue();
  }

  async getPendingSyncCount(): Promise<number> {
    return this.syncQueue.getQueueSize();
  }

  async clearLocalData(): Promise<void> {
    await DatabaseService.deleteAllData();
    await AsyncStorage.removeItem('last_sync_timestamp');
  }

  async addToSyncQueue(
    recordType: string,
    recordId: number,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<void> {
    await DatabaseService.addToPendingSync(recordType, recordId, operation, payload);
  }

  subscribeToSyncStatus(callback: (status: any) => void): () => void {
    return this.syncQueue.addListener(callback);
  }

  async getSyncHealth(): Promise<{
    pendingCount: number;
    lastSuccessfulSync: string | null;
    networkStatus: string;
  }> {
    const pendingCount = await this.getPendingSyncCount();
    const lastSyncTimestamp = await AsyncStorage.getItem('last_sync_timestamp');
    const netInfo = await NetInfo.fetch();
    
    return {
      pendingCount,
      lastSuccessfulSync: lastSyncTimestamp,
      networkStatus: netInfo.isConnected && netInfo.isInternetReachable ? 'ONLINE' : 'OFFLINE'
    };
  }

  async cleanup(): Promise<void> {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    this.syncQueue.stop();
  }
}