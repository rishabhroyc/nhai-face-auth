import SQLite from 'react-native-sqlite-storage';
import {DatabaseService} from './DatabaseService';

const db = SQLite.openDatabase(
  {
    name: 'nhai_face_auth.db',
    location: 'default'
  },
  () => {},
  error => {
    console.error('Database opening error:', error);
  }
);

export const initializeDatabase = async (): Promise<void> => {
  try {
    await DatabaseService.createTables();
    await DatabaseService.runMigrations();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

export {db};