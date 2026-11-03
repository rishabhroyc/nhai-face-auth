import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground
} from 'react-native';
import {useFaceRecognitionStore} from '@store/faceRecognitionStore';
import {useAttendanceStore} from '@store/attendanceStore';

interface SplashScreenProps {
  navigation: any;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({navigation}) => {
  const {isInitialized} = useFaceRecognitionStore();
  const {getTodayStats} = useAttendanceStore();

  useEffect(() => {
    const initialize = async () => {
      await getTodayStats();
      setTimeout(() => {
        if (isInitialized) {
          navigation.replace('Login');
        }
      }, 2000);
    };
    initialize();
  }, [isInitialized, getTodayStats, navigation]);

  return (
    <ImageBackground
      source={require('../../assets/splash_bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.title}>NHAI</Text>
        <Text style={styles.subtitle}>Face Authentication System</Text>
        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 40
  },
  loader: {
    marginTop: 20
  },
  version: {
    position: 'absolute',
    bottom: 30,
    color: '#ffffff80',
    fontSize: 12
  }
});