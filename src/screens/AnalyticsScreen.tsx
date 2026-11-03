import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import {DatabaseService} from '@database/DatabaseService';
import {useSyncStore} from '@store/syncStore';

interface AnalyticsScreenProps {
  navigation: any;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({navigation}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const {pendingCount, lastSyncStatus} = useSyncStore();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    
    const totalWorkers = await DatabaseService.executeQuery(
      'SELECT COUNT(*) as count FROM workers WHERE is_active = 1'
    );
    
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await DatabaseService.executeQuery(
      'SELECT COUNT(*) as count FROM attendance WHERE DATE(timestamp) = DATE(?)',
      [today]
    );
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weeklyAttendance = await DatabaseService.executeQuery(
      'SELECT COUNT(*) as count FROM attendance WHERE DATE(timestamp) >= DATE(?)',
      [thisWeek.toISOString().split('T')[0]]
    );
    
    const avgConfidence = await DatabaseService.executeQuery(
      'SELECT AVG(confidence_score) as avg FROM attendance'
    );
    
    const avgLiveness = await DatabaseService.executeQuery(
      'SELECT AVG(liveness_score) as avg FROM attendance'
    );
    
    const syncHealth = await DatabaseService.executeQuery(
      "SELECT COUNT(*) as pending FROM pending_sync WHERE retry_count < 5"
    );
    
    setAnalytics({
      totalWorkers: totalWorkers[0]?.count || 0,
      todayAttendance: todayAttendance[0]?.count || 0,
      weeklyAttendance: weeklyAttendance[0]?.count || 0,
      avgConfidence: (avgConfidence[0]?.avg || 0) * 100,
      avgLiveness: (avgLiveness[0]?.avg || 0) * 100,
      pendingSync: syncHealth[0]?.pending || 0
    });
    
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.todayAttendance}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.weeklyAttendance}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analytics.totalWorkers}</Text>
            <Text style={styles.statLabel}>Total Workers</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quality Metrics</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.avgConfidence.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>Avg Recognition</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${analytics.avgConfidence}%`}]} />
            </View>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{analytics.avgLiveness.toFixed(0)}%</Text>
            <Text style={styles.metricLabel}>Avg Liveness</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {width: `${analytics.avgLiveness}%`}]} />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync Status</Text>
        <View style={styles.syncStatus}>
          <Text style={styles.syncLabel}>Pending Records:</Text>
          <Text style={styles.syncValue}>{pendingCount}</Text>
        </View>
        <View style={styles.syncStatus}>
          <Text style={styles.syncLabel}>Sync Status:</Text>
          <Text style={[
            styles.syncStatusText,
            lastSyncStatus === 'IDLE' ? styles.syncIdle :
            lastSyncStatus === 'SYNCING' ? styles.syncSyncing :
            styles.syncOffline
          ]}>
            {lastSyncStatus || 'Unknown'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2980b9'
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4
  },
  metricsContainer: {
    gap: 16
  },
  metricItem: {
    marginBottom: 16
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4
  },
  syncStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  syncLabel: {
    fontSize: 14,
    color: '#7f8c8d'
  },
  syncValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50'
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '500'
  },
  syncIdle: {
    color: '#27ae60'
  },
  syncSyncing: {
    color: '#2980b9'
  },
  syncOffline: {
    color: '#e67e22'
  }
});