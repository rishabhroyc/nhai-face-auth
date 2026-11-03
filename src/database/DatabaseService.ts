import SQLite from 'react-native-sqlite-storage';
import {db} from './DatabaseInitializer';

export interface Worker {
  id: number;
  worker_id: string;
  name: string;
  employee_code: string;
  department: string;
  designation: string;
  enrollment_date: string;
  is_active: boolean;
  face_count: number;
}

export interface Embedding {
  id: number;
  worker_id: string;
  embedding_vector: string;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface AttendanceRecord {
  id: number;
  worker_id: string;
  timestamp: string;
  confidence_score: number;
  liveness_score: number;
  latitude: number;
  longitude: number;
  device_id: string;
  is_synced: boolean;
  sync_attempts: number;
  last_sync_attempt: string | null;
  created_at: string;
}

export interface PendingSync {
  id: number;
  record_type: string;
  record_id: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string;
  created_at: string;
  retry_count: number;
  last_retry: string | null;
}

export interface AuditLog {
  id: number;
  worker_id: string;
  action: string;
  details: string;
  ip_address: string;
  device_info: string;
  created_at: string;
}

export class DatabaseService {
  static async createTables(): Promise<void> {
    const queries = [
      `CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        employee_code TEXT UNIQUE NOT NULL,
        department TEXT,
        designation TEXT,
        enrollment_date TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        face_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT NOT NULL,
        embedding_vector TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
        UNIQUE(worker_id, version)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_embeddings_worker ON embeddings(worker_id)`,
      `CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        liveness_score REAL NOT NULL,
        latitude REAL,
        longitude REAL,
        device_id TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        sync_attempts INTEGER DEFAULT 0,
        last_sync_attempt TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_worker ON attendance(worker_id)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_attendance_synced ON attendance(is_synced)`,
      `CREATE TABLE IF NOT EXISTS pending_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_type TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0,
        last_retry TEXT,
        UNIQUE(record_type, record_id, operation)
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        device_info TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_audit_worker ON audit_logs(worker_id)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at)`
    ];

    for (const query of queries) {
      await this.executeQuery(query);
    }
  }

  static async runMigrations(): Promise<void> {
    const currentVersion = await this.getDatabaseVersion();
    const migrations = [
      {version: 1, query: `ALTER TABLE attendance ADD COLUMN geo_hash TEXT`}
    ];

    for (const migration of migrations) {
      if (currentVersion < migration.version) {
        await this.executeQuery(migration.query);
        await this.setDatabaseVersion(migration.version);
      }
    }
  }

  private static async getDatabaseVersion(): Promise<number> {
    try {
      const results = await this.executeQuery(
        "SELECT value FROM app_settings WHERE key = 'db_version'"
      );
      if (results && results.length > 0) {
        return parseInt(results[0].value, 10);
      }
    } catch (error) {
      await this.executeQuery(
        "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)"
      );
    }
    return 0;
  }

  private static async setDatabaseVersion(version: number): Promise<void> {
    await this.executeQuery(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('db_version', ?)",
      [version.toString()]
    );
  }

  static executeQuery(
    query: string,
    params: any[] = []
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const rows: any[] = [];
            if (results.rows && results.rows.length > 0) {
              for (let i = 0; i < results.rows.length; i++) {
                rows.push(results.rows.item(i));
              }
            }
            resolve(rows);
          },
          error => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async insertWorker(worker: Omit<Worker, 'id'>): Promise<number> {
    const query = `
      INSERT INTO workers (worker_id, name, employee_code, department, designation, enrollment_date, is_active, face_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.executeQuery(query, [
      worker.worker_id,
      worker.name,
      worker.employee_code,
      worker.department || null,
      worker.designation || null,
      worker.enrollment_date,
      worker.is_active ? 1 : 0,
      worker.face_count || 0
    ]);
    const results = await this.executeQuery('SELECT last_insert_rowid() as id');
    return results[0]?.id || 0;
  }

  static async getWorkerByWorkerId(workerId: string): Promise<Worker | null> {
    const query = 'SELECT * FROM workers WHERE worker_id = ?';
    const results = await this.executeQuery(query, [workerId]);
    return results.length > 0 ? (results[0] as Worker) : null;
  }

  static async getAllWorkers(): Promise<Worker[]> {
    const query = 'SELECT * FROM workers WHERE is_active = 1 ORDER BY name';
    const results = await this.executeQuery(query);
    return results as Worker[];
  }

  static async insertEmbedding(embedding: Omit<Embedding, 'id'>): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO embeddings (worker_id, embedding_vector, version, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    await this.executeQuery(query, [
      embedding.worker_id,
      embedding.embedding_vector,
      embedding.version || 1
    ]);
    await this.executeQuery(
      'UPDATE workers SET face_count = face_count + 1, updated_at = CURRENT_TIMESTAMP WHERE worker_id = ?',
      [embedding.worker_id]
    );
  }

  static async getEmbeddingByWorkerId(workerId: string): Promise<Embedding | null> {
    const query = 'SELECT * FROM embeddings WHERE worker_id = ? ORDER BY version DESC LIMIT 1';
    const results = await this.executeQuery(query, [workerId]);
    return results.length > 0 ? (results[0] as Embedding) : null;
  }

  static async getAllEmbeddings(): Promise<Embedding[]> {
    const query = `
      SELECT e.* FROM embeddings e
      INNER JOIN workers w ON e.worker_id = w.worker_id
      WHERE w.is_active = 1
    `;
    const results = await this.executeQuery(query);
    return results as Embedding[];
  }

  static async insertAttendance(attendance: Omit<AttendanceRecord, 'id'>): Promise<number> {
    const query = `
      INSERT INTO attendance (worker_id, timestamp, confidence_score, liveness_score, latitude, longitude, device_id, is_synced, sync_attempts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.executeQuery(query, [
      attendance.worker_id,
      attendance.timestamp,
      attendance.confidence_score,
      attendance.liveness_score,
      attendance.latitude || null,
      attendance.longitude || null,
      attendance.device_id,
      attendance.is_synced ? 1 : 0,
      attendance.sync_attempts || 0
    ]);
    const results = await this.executeQuery('SELECT last_insert_rowid() as id');
    const recordId = results[0]?.id || 0;
    
    await this.addToPendingSync('attendance', recordId, 'INSERT', attendance);
    
    return recordId;
  }

  static async getAttendanceHistory(
    limit: number = 100,
    offset: number = 0
  ): Promise<(AttendanceRecord & {worker_name: string})[]> {
    const query = `
      SELECT a.*, w.name as worker_name
      FROM attendance a
      INNER JOIN workers w ON a.worker_id = w.worker_id
      ORDER BY a.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const results = await this.executeQuery(query, [limit, offset]);
    return results as (AttendanceRecord & {worker_name: string})[];
  }

  static async addToPendingSync(
    recordType: string,
    recordId: number,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: any
  ): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO pending_sync (record_type, record_id, operation, payload, retry_count)
      VALUES (?, ?, ?, ?, 0)
    `;
    await this.executeQuery(query, [
      recordType,
      recordId,
      operation,
      JSON.stringify(payload)
    ]);
  }

  static async getPendingSyncRecords(): Promise<PendingSync[]> {
    const query = 'SELECT * FROM pending_sync ORDER BY created_at';
    const results = await this.executeQuery(query);
    return results as PendingSync[];
  }

  static async removePendingSyncRecord(id: number): Promise<void> {
    const query = 'DELETE FROM pending_sync WHERE id = ?';
    await this.executeQuery(query, [id]);
  }

  static async updatePendingSyncRetry(id: number): Promise<void> {
    const query = `
      UPDATE pending_sync 
      SET retry_count = retry_count + 1, last_retry = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await this.executeQuery(query, [id]);
  }

  static async markAttendanceSynced(attendanceId: number): Promise<void> {
    const query = `
      UPDATE attendance 
      SET is_synced = 1, last_sync_attempt = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    await this.executeQuery(query, [attendanceId]);
  }

  static async insertAuditLog(
    action: string,
    details: string,
    workerId?: string,
    deviceInfo?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (worker_id, action, details, device_info)
      VALUES (?, ?, ?, ?)
    `;
    await this.executeQuery(query, [
      workerId || null,
      action,
      details,
      deviceInfo || 'React Native App'
    ]);
  }

  static async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    const query = 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?';
    const results = await this.executeQuery(query, [limit]);
    return results as AuditLog[];
  }

  static async deleteAllData(): Promise<void> {
    const queries = [
      'DELETE FROM attendance',
      'DELETE FROM embeddings',
      'DELETE FROM workers',
      'DELETE FROM pending_sync',
      'DELETE FROM audit_logs'
    ];
    for (const query of queries) {
      await this.executeQuery(query);
    }
  }
}