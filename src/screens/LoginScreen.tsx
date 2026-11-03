import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {useFaceRecognitionStore} from '@store/faceRecognitionStore';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {embeddingCount} = useFaceRecognitionStore();

  const handleLogin = async () => {
    if (!employeeCode || !password) {
      Alert.alert('Error', 'Please enter employee code and password');
      return;
    }

    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      if (employeeCode === 'admin' && password === 'admin') {
        navigation.replace('Main');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials');
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>NHAI Face Auth</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>System Status:</Text>
          <Text style={styles.infoValue}>
            {embeddingCount > 0 ? `${embeddingCount} workers enrolled` : 'No workers enrolled'}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Employee Code"
          placeholderTextColor="#999"
          value={employeeCode}
          onChangeText={setEmployeeCode}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoButton}
          onPress={() => navigation.replace('Main')}
        >
          <Text style={styles.demoButtonText}>Continue as Demo User</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 40
  },
  infoCard: {
    backgroundColor: '#e8f4f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center'
  },
  infoText: {
    fontSize: 14,
    color: '#2980b9'
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 4
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  button: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600'
  },
  demoButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center'
  },
  demoButtonText: {
    color: '#2980b9',
    fontSize: 14
  }
});