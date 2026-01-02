import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME } from '../utils/constants';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or create the database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await runMigrations(db);
  return db;
}

/**
 * Run database migrations
 */
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Check if we need to migrate from old schema (single address field) to new schema (split fields)
  const tableInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(clients)"
  );
  const hasOldAddressColumn = tableInfo.some(col => col.name === 'address');
  const hasNewStreetColumn = tableInfo.some(col => col.name === 'street');

  // If old schema exists, drop tables to recreate with new schema
  if (hasOldAddressColumn && !hasNewStreetColumn) {
    await database.execAsync('DROP TABLE IF EXISTS active_timer;');
    await database.execAsync('DROP TABLE IF EXISTS invoices;');
    await database.execAsync('DROP TABLE IF EXISTS time_sessions;');
    await database.execAsync('DROP TABLE IF EXISTS clients;');
  }

  // Create clients table with split address fields
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      street TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip_code TEXT NOT NULL,
      email TEXT NOT NULL,
      hourly_rate REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create time_sessions table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS time_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);

  // Create invoices table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      total_hours REAL NOT NULL,
      total_amount REAL NOT NULL,
      sent_date TEXT,
      send_method TEXT,
      session_ids TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );
  `);

  // Create materials table for tracking job expenses
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      cost REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);

  // Create active_timer table (singleton for persistence)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS active_timer (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      client_id INTEGER,
      session_id INTEGER,
      start_time TEXT,
      is_running INTEGER DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (session_id) REFERENCES time_sessions(id)
    );
  `);

  // Ensure there's always one row in active_timer
  await database.runAsync(`
    INSERT OR IGNORE INTO active_timer (id, is_running) VALUES (1, 0);
  `);

  // Create user_settings table (singleton for app preferences)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT,
      business_phone TEXT,
      business_email TEXT,
      business_street TEXT,
      business_city TEXT,
      business_state TEXT,
      business_zip TEXT,
      logo_uri TEXT,
      primary_color TEXT DEFAULT '#2563EB',
      accent_color TEXT DEFAULT '#2563EB',
      updated_at TEXT
    );
  `);

  // Ensure there's always one row in user_settings
  await database.runAsync(`
    INSERT OR IGNORE INTO user_settings (id, primary_color, accent_color) VALUES (1, '#2563EB', '#2563EB');
  `);

  // Create indexes for common queries
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON time_sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON time_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON time_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_materials_client_id ON materials(client_id);
  `);
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Reset database (for testing/development)
 */
export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DROP TABLE IF EXISTS user_settings;');
  await database.execAsync('DROP TABLE IF EXISTS active_timer;');
  await database.execAsync('DROP TABLE IF EXISTS materials;');
  await database.execAsync('DROP TABLE IF EXISTS invoices;');
  await database.execAsync('DROP TABLE IF EXISTS time_sessions;');
  await database.execAsync('DROP TABLE IF EXISTS clients;');
  await runMigrations(database);
}
