import {create} from 'zustand';
import {AttendanceService} from '@features/attendance/AttendanceService';
import {GeofenceService} from '@services/GeofenceService';

interface AttendanceState {
  isMarking: boolean;
  lastAttendance: any | null;
  todayStats: any | null;
  geofenceStatus: {isWithin: boolean; distance: number; radius: number} | null;
  markAttendance: (imageData: ImageData, latitude: number, longitude: number) => Promise<any>;
  getTodayStats: () => Promise<void>;
  checkGeofence: (latitude: number, longitude: number) => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  isMarking: false,
  lastAttendance: null,
  todayStats: null,
  geofenceStatus: null,

  markAttendance: async (imageData: ImageData, latitude: number, longitude: number) => {
    set({isMarking: true});
    const attendanceService = AttendanceService.getInstance();
    const result = await attendanceService.markAttendance(imageData, latitude, longitude);
    set({
      isMarking: false,
      lastAttendance: result
    });
    await get().getTodayStats();
    return result;
  },

  getTodayStats: async () => {
    const attendanceService = AttendanceService.getInstance();
    const stats = await attendanceService.getTodayAttendance();
    set({todayStats: stats});
  },

  checkGeofence: (latitude: number, longitude: number) => {
    const geofenceService = GeofenceService.getInstance();
    const status = geofenceService.getGeofenceStatus(latitude, longitude);
    set({geofenceStatus: status});
  },

  reset: () => {
    set({
      isMarking: false,
      lastAttendance: null,
      todayStats: null,
      geofenceStatus: null
    });
  }
}));