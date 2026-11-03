import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import {DatabaseService} from '@database/DatabaseService';

interface HistoryScreenProps {
  navigation: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({navigation}) => {
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const history = await DatabaseService.getAttendanceHistory(100);
    setAttendanceHistory(history);
    
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const statsData = await DatabaseService.executeQuery(
      `SELECT 
        COUNT(*) as total,
        AVG(confidence_score) as avg_confidence,
        AVG(liveness_score) as avg_liveness,
        COUNT(DISTINCT worker_id) as unique_workers
       FROM attendance 
       WHERE DATE(timestamp) >= DATE(?)`,
      [thirtyDaysAgo.toISOString().split('T')[0]]
    );
    setStats(statsData[0]);
    setIsLoading(false);
  };

  const renderItem = ({item}: {item: any}) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.workerName}>{item.worker_name}</Text>
        <Text style={[
          styles.confidenceBadge,
          item.confidence_score > 0.8 ? styles.highConfidence :
          item.confidence_score > 0.65 ? styles.mediumConfidence : styles.lowConfidence
        ]}>
          {(item.confidence_score * 100).toFixed(0)}%
        </Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.livenessText}>
          Liveness: {(item.liveness_score * 100).toFixed(0)}%
        </Text>
        {item.is_synced ? (
          <Text style={styles.syncedText}>✓ Synced</Text>
        ) : (
          <Text style={styles.pendingText}>⌛ Pending</Text>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2980b9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(stats.avg_confidence * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Avg Conf</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{(stats.avg_liveness * 100).toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Avg Live</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.unique_workers}</Text>
            <Text style={styles.statLabel}>Workers</Text>
          </View>
        </View>
      )}

      <FlatList
        data={attendanceHistory}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No attendance records found</Text>
          </View>
        }
      />
    </View>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8
  },
  statCard: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4
  },
  listContent: {
    padding: 16
  },
  historyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50'
  },
  confidenceBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden'
  },
  highConfidence: {
    backgroundColor: '#d5f5e3',
    color: '#27ae60'
  },
  mediumConfidence: {
    backgroundColor: '#fdebd0',
    color: '#e67e22'
  },
  lowConfidence: {
    backgroundColor: '#fadbd8',
    color: '#e74c3c'
  },
  timestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  livenessText: {
    fontSize: 12,
    color: '#7f8c8d'
  },
  syncedText: {
    fontSize: 12,
    color: '#27ae60'
  },
  pendingText: {
    fontSize: 12,
    color: '#e67e22'
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40
  }
});