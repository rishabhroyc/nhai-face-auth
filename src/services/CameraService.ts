import {Camera, useCameraDevice, useFrameProcessor} from 'react-native-vision-camera';
import {runOnJS} from 'react-native-reanimated';
import type {Frame} from 'react-native-vision-camera';

export class CameraService {
  private static instance: CameraService;
  private isActive: boolean = false;
  private frameProcessorActive: boolean = false;

  static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  async requestCameraPermission(): Promise<boolean> {
    const status = await Camera.requestCameraPermission();
    return status === 'authorized';
  }

  getCameraDevice(type: 'front' | 'back' = 'front') {
    const devices = Camera.getAvailableCameraDevices();
    return devices.find(device => device.position === type);
  }

  getFrameProcessor(onFrame: (frame: Frame) => void) {
    return useFrameProcessor((frame) => {
      if (!this.frameProcessorActive) return;
      runOnJS(onFrame)(frame);
    }, []);
  }

  startFrameProcessing(): void {
    this.frameProcessorActive = true;
  }

  stopFrameProcessing(): void {
    this.frameProcessorActive = false;
  }
}