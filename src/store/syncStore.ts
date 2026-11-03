import {create} from 'zustand';
import {SyncService} from '@features/sync/SyncService';

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncStatus: string | null;
  initializeSync: () => Promise<void>;
  forceSync: () => Promise<void>;
  updateSyncStatus: (status: any) => void;
  getPendingCount: () => Promise<number>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  pendingCount: 0,
  lastSyncStatus: null,

  initializeSync: async () => {
    const syncService = SyncService.getInstance();
    await syncService.initialize();
    
    syncService.subscribeToSyncStatus((status) => {
      get().updateSyncStatus(status);
    });
    
    const pendingCount = await syncService.getPendingSyncCount();
    set({pendingCount});
  },

  forceSync: async () => {
    const syncService = SyncService.getInstance();
    await syncService.forceSync();
  },

  updateSyncStatus: (status: any) => {
    set({
      isSyncing: status.status === 'SYNCING',
      pendingCount: status.pendingCount,
      lastSyncStatus: status.status
    });
  },

  getPendingCount: async () => {
    const syncService = SyncService.getInstance();
    const count = await syncService.getPendingSyncCount();
    set({pendingCount: count});
    return count;
  }
}));