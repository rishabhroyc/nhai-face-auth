import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import Geolocation from 'react-native-geolocation-service';
import {useAttendanceStore} from '@store/attendanceStore';
import {useFaceRecognitionStore} from '@store/faceRecognitionStore';
import {LivenessController} from '@features/liveness/LivenessController';
import {CameraService} from '@services/CameraService';

interface AttendanceScreenProps {
  navigation: any;
}

export const AttendanceScreen: React.FC<AttendanceScreenProps> = ({navigation}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [instructions, setInstructions] = useState('Position your face in the oval');
  const {markAttendance, isMarking, geofenceStatus, checkGeofence} = useAttendanceStore();
  const {embeddingCount} = useFaceRecognitionStore();
  
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const livenessController = useRef(new LivenessController());

  useEffect(() => {
    requestLocation();
    livenessController.current.initializeChallengeSequence();
  }, []);

  const requestLocation = async () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude} = position.coords;
        setLocation({lat: latitude, lng: longitude});
        checkGeofence(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Please enable location services');
      },
      {enableHighAccuracy: true, timeout: 15000}
    );
  };

  const captureAndMark = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not available');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Unable to get location');
      return;
    }

    if (!geofenceStatus?.isWithin) {
      Alert.alert(
        'Out of Geofence',
        `You are ${geofenceStatus?.distance?.toFixed(0)} meters away from the authorized site. Please move within ${geofenceStatus?.radius} meters.`
      );
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality'
      });

      const imageData = await convertPhotoToImageData(photo);
      
      const currentChallenge = livenessController.current.getCurrentChallenge();
      if (currentChallenge) {
        setInstructions(currentChallenge.instruction);
      }

      const result = await markAttendance(imageData, location.lat, location.lng);

      if (result.success) {
        Alert.alert('Success', result.message);
        livenessController.current.reset();
        livenessController.current.initializeChallengeSequence();
        setInstructions('Position your face in the oval');
      } else {
        Alert.alert('Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture or process face');
    } finally {
      setIsCapturing(false);
    }
  };

  const convertPhotoToImageData = async (photo: any): Promise<ImageData> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 112;
        canvas.height = 112;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, 112, 112);
        resolve(ctx?.getImageData(0, 0, 112, 112)!);
      };
      img.src = `file://${photo.path}`;
    });
  };

  if (!device) {
    return (
      <View style={styles.noCameraContainer}>
        <Text>No camera available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        photo={true}
      />

      <View style={styles.overlay}>
        <View style={styles.faceOval} />

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>{instructions}</Text>
        </View>

        {geofenceStatus && (
          <View style={styles.locationStatus}>
            <Text style={[
              styles.locationText,
              geofenceStatus.isWithin ? styles.withinLocation : styles.outsideLocation
            ]}>
              {geofenceStatus.isWithin ? '📍 Within Site' : `⚠️ ${geofenceStatus.distance.toFixed(0)}m away`}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.captureButton,
            (isCapturing || isMarking || !geofenceStatus?.isWithin || embeddingCount === 0) &&
              styles.captureButtonDisabled
          ]}
          onPress={captureAndMark}
          disabled={isCapturing || isMarking || !geofenceStatus?.isWithin || embeddingCount === 0}
        >
          {isCapturing || isMarking ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.captureButtonText}>Mark Attendance</Text>
          )}
        </TouchableOpacity>

        {embeddingCount === 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              No workers enrolled. Please enroll workers first.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  camera: {
    flex: 1
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60
  },
  faceOval: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderStyle: 'dashed',
    opacity: 0.8
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  instructionsText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center'
  },
  locationStatus: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  locationText: {
    fontSize: 14
  },
  withinLocation: {
    color: '#27ae60'
  },
  outsideLocation: {
    color: '#e74c3c'
  },
  captureButton: {
    backgroundColor: '#2980b9',
    borderRadius: 30,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 40
  },
  captureButtonDisabled: {
    opacity: 0.5
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  warningContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20
  },
  warningText: {
    color: '#ffffff',
    fontSize: 12
  }
});