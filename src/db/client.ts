// src/db/client.ts
// Local SQLite client via expo-sqlite and Drizzle ORM.
// Change listeners are enabled for useLiveQuery reactivity.

import { Platform } from 'react-native';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const DATABASE_NAME = 'pennywick.db';

function createDbClient(): {
  expoDb: SQLiteDatabase;
  db: ReturnType<typeof drizzle>;
} {
  if (Platform.OS === 'web') {
    // In web preview or Jest/Node SSR, expo-sqlite native storage is unavailable.
    const mockExpoDb = {} as SQLiteDatabase;
    const mockDb = {} as ReturnType<typeof drizzle>;
    return { expoDb: mockExpoDb, db: mockDb };
  }

  const expoDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
  // Enable foreign keys
  expoDb.execSync('PRAGMA foreign_keys = ON;');
  const db = drizzle(expoDb, { schema });
  return { expoDb, db };
}

const client = createDbClient();
export const expoDb = client.expoDb;
export const db = client.db;

export type Database = typeof db;
