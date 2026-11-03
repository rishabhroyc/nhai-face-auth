import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {RecognitionService} from '@features/recognition/RecognitionService';
import {CameraService} from '@services/CameraService';
import type {Worker} from '@database/DatabaseService';

interface EnrollmentScreenProps {
  navigation: any;
}

export const EnrollmentScreen: React.FC<EnrollmentScreenProps> = ({navigation}) => {
  const [step, setStep] = useState<'info' | 'capture' | 'processing'>('info');
  const [capturedImages, setCapturedImages] = useState<ImageData[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: '',
    name: '',
    employee_code: '',
    department: '',
    designation: ''
  });

  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const cameraService = CameraService.getInstance();

  const captureImage = async () => {
    if (!cameraRef.current) return;
    
    const photo = await cameraRef.current.takePhoto({
      qualityPrioritization: 'quality'
    });
    
    const imageData = await convertPhotoToImageData(photo);
    setCapturedImages(prev => [...prev, imageData]);
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

  const handleEnroll = async () => {
    if (!formData.worker_id || !formData.name || !formData.employee_code) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (capturedImages.length < 3) {
      Alert.alert('Error', 'Please capture at least 3 face images');
      return;
    }

    setIsEnrolling(true);
    setStep('processing');

    try {
      const recognitionService = RecognitionService.getInstance();
      const worker: Omit<Worker, 'id'> = {
        worker_id: formData.worker_id,
        name: formData.name,
        employee_code: formData.employee_code,
        department: formData.department,
        designation: formData.designation,
        enrollment_date: new Date().toISOString(),
        is_active: true,
        face_count: capturedImages.length
      };

      const result = await recognitionService.enrollFace(capturedImages, worker);

      if (result.success) {
        Alert.alert('Success', result.message, [
          {text: 'OK', onPress: () => navigation.goBack()}
        ]);
      } else {
        Alert.alert('Error', result.message);
        setStep('capture');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll worker');
      setStep('capture');
    } finally {
      setIsEnrolling(false);
    }
  };

  const renderInfoStep = () => (
    <ScrollView style={styles.formContainer}>
      <Text style={styles.label}>Worker ID *</Text>
      <TextInput
        style={styles.input}
        value={formData.worker_id}
        onChangeText={text => setFormData({...formData, worker_id: text})}
        placeholder="Enter worker ID"
      />

      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={text => setFormData({...formData, name: text})}
        placeholder="Enter full name"
      />

      <Text style={styles.label}>Employee Code *</Text>
      <TextInput
        style={styles.input}
        value={formData.employee_code}
        onChangeText={text => setFormData({...formData, employee_code: text})}
        placeholder="Enter employee code"
      />

      <Text style={styles.label}>Department</Text>
      <TextInput
        style={styles.input}
        value={formData.department}
        onChangeText={text => setFormData({...formData, department: text})}
        placeholder="Enter department"
      />

      <Text style={styles.label}>Designation</Text>
      <TextInput
        style={styles.input}
        value={formData.designation}
        onChangeText={text => setFormData({...formData, designation: text})}
        placeholder="Enter designation"
      />

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => setStep('capture')}
      >
        <Text style={styles.nextButtonText}>Next →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCaptureStep = () => (
    <View style={styles.captureContainer}>
      {device ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          photo={true}
        />
      ) : (
        <View style={styles.noCameraContainer}>
          <Text>No camera available</Text>
        </View>
      )}

      <View style={styles.captureControls}>
        <View style={styles.captureCount}>
          <Text style={styles.captureCountText}>
            Captured: {capturedImages.length}/5
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.captureButton,
            capturedImages.length >= 5 && styles.captureButtonDisabled
          ]}
          onPress={captureImage}
          disabled={capturedImages.length >= 5}
        >
          <Text style={styles.captureButtonText}>📸 Capture</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('info')}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.enrollButton,
              capturedImages.length < 3 && styles.enrollButtonDisabled
            ]}
            onPress={handleEnroll}
            disabled={capturedImages.length < 3}
          >
            <Text style={styles.enrollButtonText}>Enroll</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#2980b9" />
      <Text style={styles.processingText}>
        Processing face images and generating embeddings...
      </Text>
      <Text style={styles.processingSubtext}>This may take a few seconds</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enroll Worker</Text>
        <View style={{width: 40}} />
      </View>

      {step === 'info' && renderInfoStep()}
      {step === 'capture' && renderCaptureStep()}
      {step === 'processing' && renderProcessingStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  backIcon: {
    fontSize: 24,
    color: '#2980b9'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50'
  },
  formContainer: {
    flex: 1,
    padding: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 12
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  nextButton: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  captureContainer: {
    flex: 1
  },
  camera: {
    flex: 1
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  captureControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20
  },
  captureCount: {
    alignItems: 'center',
    marginBottom: 12
  },
  captureCountText: {
    color: '#ffffff',
    fontSize: 14
  },
  captureButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  captureButtonDisabled: {
    opacity: 0.5
  },
  captureButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  backButton: {
    flex: 1,
    backgroundColor: '#7f8c8d',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 8
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  enrollButton: {
    flex: 2,
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8
  },
  enrollButtonDisabled: {
    opacity: 0.5
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  processingText: {
    fontSize: 16,
    color: '#2c3e50',
    marginTop: 20,
    textAlign: 'center'
  },
  processingSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center'
  }
});