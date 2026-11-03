import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSyncStore} from '@store/syncStore';
import {DatabaseService} from '@database/DatabaseService';
import {RecognitionService} from '@features/recognition/RecognitionService';
import {EmbeddingService} from '@features/recognition/EmbeddingService';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const [autoSync, setAutoSync] = useState(true);
  const [threshold, setThreshold] = useState(0.65);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [isClearing, setIsClearing] = useState(false);
  const {forceSync, pendingCount} = useSyncStore();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedAutoSync = await AsyncStorage.getItem('auto_sync');
    const savedThreshold = await AsyncStorage.getItem('recognition_threshold');
    const savedRadius = await AsyncStorage.getItem('geofence_radius');
    
    if (savedAutoSync !== null) setAutoSync(savedAutoSync === 'true');
    if (savedThreshold !== null) setThreshold(parseFloat(savedThreshold));
    if (savedRadius !== null) setGeofenceRadius(parseInt(savedRadius));
  };

  const saveSettings = async (key: string, value: any) => {
    await AsyncStorage.setItem(key, value.toString());
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all workers, embeddings, and attendance records. This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            await DatabaseService.deleteAllData();
            const recognitionService = RecognitionService.getInstance();
            recognitionService.clearCache();
            const embeddingService = EmbeddingService.getInstance();
            embeddingService.clearCache();
            setIsClearing(false);
            Alert.alert('Success', 'All data has been cleared');
          }
        }
      ]
    );
  };

  const handleForceSync = async () => {
    await forceSync();
    Alert.alert('Sync Started', 'Synchronization has been initiated');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto Sync</Text>
          <Switch
            value={autoSync}
            onValueChange={async (value) => {
              setAutoSync(value);
              await saveSettings('auto_sync', value);
            }}
          />
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Recognition Threshold</Text>
          <Text style={styles.settingValue}>{threshold.toFixed(2)}</Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Geofence Radius</Text>
          <Text style={styles.settingValue}>{geofenceRadius} meters</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Pending Records</Text>
          <Text style={styles.settingValue}>{pendingCount}</Text>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={handleForceSync}>
          <Text style={styles.actionButtonText}>Force Sync Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={handleClearData}>
          <Text style={[styles.actionButtonText, styles.clearButtonText]}>
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>NHAI Face Authentication System</Text>
        <Text style={styles.aboutSubtext}>Version 1.0.0</Text>
        <Text style={styles.aboutSubtext}>Built for NHAI Hackathon 7.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 14,
    color: '#2c3e50'
  },
  settingValue: {
    fontSize: 14,
    color: '#2980b9',
    fontWeight: '500'
  },
  actionButton: {
    backgroundColor: '#2980b9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  clearButton: {
    backgroundColor: '#e74c3c'
  },
  clearButtonText: {
    color: '#ffffff'
  },
  aboutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4
  },
  aboutSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2
  }
});