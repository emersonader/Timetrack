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
      primary_color TEXT DEFAULT '#059669',
      accent_color TEXT DEFAULT '#059669',
      updated_at TEXT
    );
  `);

  // Ensure there's always one row in user_settings
  await database.runAsync(`
    INSERT OR IGNORE INTO user_settings (id, primary_color, accent_color) VALUES (1, '#059669', '#059669');
  `);

  // Create indexes for common queries
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON time_sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON time_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON time_sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_materials_client_id ON materials(client_id);
  `);

  // Migration: Add notes column to time_sessions if it doesn't exist
  const sessionTableInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(time_sessions)"
  );
  const hasNotesColumn = sessionTableInfo.some(col => col.name === 'notes');
  if (!hasNotesColumn) {
    await database.execAsync('ALTER TABLE time_sessions ADD COLUMN notes TEXT;');
  }

  // Migration: Add first_launch_date for trial period tracking
  const settingsTableInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(user_settings)"
  );
  const hasFirstLaunchColumn = settingsTableInfo.some(col => col.name === 'first_launch_date');
  if (!hasFirstLaunchColumn) {
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN first_launch_date TEXT;');
    // Set first launch date to now for existing users
    await database.runAsync(
      'UPDATE user_settings SET first_launch_date = ? WHERE id = 1 AND first_launch_date IS NULL',
      [new Date().toISOString()]
    );
  }

  // Migration: Add payment method columns to user_settings if they don't exist
  const hasPaypalColumn = settingsTableInfo.some(col => col.name === 'paypal_enabled');
  if (!hasPaypalColumn) {
    // Add all payment columns
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN paypal_enabled INTEGER DEFAULT 0;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN paypal_username TEXT;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN venmo_enabled INTEGER DEFAULT 0;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN venmo_username TEXT;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN zelle_enabled INTEGER DEFAULT 0;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN zelle_id TEXT;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN cashapp_enabled INTEGER DEFAULT 0;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN cashapp_tag TEXT;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN stripe_enabled INTEGER DEFAULT 0;');
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN stripe_payment_link TEXT;');
  }

  // Migration: Add onboarding_completed column to user_settings
  const hasOnboardingColumn = settingsTableInfo.some(col => col.name === 'onboarding_completed');
  if (!hasOnboardingColumn) {
    await database.execAsync('ALTER TABLE user_settings ADD COLUMN onboarding_completed INTEGER DEFAULT 0;');
    // For existing users (who already have data), mark as completed
    await database.runAsync(
      'UPDATE user_settings SET onboarding_completed = 1 WHERE id = 1 AND first_launch_date IS NOT NULL'
    );
  }

  // Migration: Add tags and session_tags tables
  const existingTables = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tags'"
  );
  if (existingTables.length === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#6B7280',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS session_tags (
        session_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (session_id, tag_id),
        FOREIGN KEY (session_id) REFERENCES time_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_session_tags_session ON session_tags(session_id);
      CREATE INDEX IF NOT EXISTS idx_session_tags_tag ON session_tags(tag_id);
    `);

    // Insert default tags
    await database.execAsync(`
      INSERT OR IGNORE INTO tags (name, color) VALUES
        ('Installation', '#059669'),
        ('Repair', '#F59E0B'),
        ('Consultation', '#6366F1'),
        ('Maintenance', '#3B82F6'),
        ('Travel', '#8B5CF6'),
        ('Other', '#6B7280');
    `);
  }

  // Migration: Add additional performance indexes
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_clients_updated_at ON clients(updated_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON time_sessions(start_time);
  `);

  // Migration: Add currency column to clients table
  const clientTableInfo2 = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(clients)"
  );
  const hasCurrencyOnClients = clientTableInfo2.some(col => col.name === 'currency');
  if (!hasCurrencyOnClients) {
    await database.execAsync("ALTER TABLE clients ADD COLUMN currency TEXT DEFAULT 'USD';");
  }

  // Migration: Add currency column to invoices table
  const invoiceTableInfo = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(invoices)"
  );
  const hasCurrencyOnInvoices = invoiceTableInfo.some(col => col.name === 'currency');
  if (!hasCurrencyOnInvoices) {
    await database.execAsync("ALTER TABLE invoices ADD COLUMN currency TEXT DEFAULT 'USD';");
  }

  // Migration: Add default_currency to user_settings
  const settingsInfo2 = await database.getAllAsync<{ name: string }>(
    "PRAGMA table_info(user_settings)"
  );
  const hasDefaultCurrency = settingsInfo2.some(col => col.name === 'default_currency');
  if (!hasDefaultCurrency) {
    await database.execAsync("ALTER TABLE user_settings ADD COLUMN default_currency TEXT DEFAULT 'USD';");
  }

  // Migration: Add photos table for session photo attachments
  const photosTableExists = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='photos'"
  );
  if (photosTableExists.length === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES time_sessions(id) ON DELETE CASCADE
      );
    `);
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_photos_session_id ON photos(session_id);
    `);
  }
  // Migration: Add recurring_jobs and recurring_job_occurrences tables
  const recurringJobsTableExists = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='recurring_jobs'"
  );
  if (recurringJobsTableExists.length === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
        duration_seconds INTEGER NOT NULL,
        notes TEXT,
        auto_invoice INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        start_date TEXT NOT NULL,
        end_date TEXT,
        last_generated_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      );
    `);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_job_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recurring_job_id INTEGER NOT NULL,
        scheduled_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
        session_id INTEGER,
        invoice_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recurring_job_id) REFERENCES recurring_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES time_sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
      );
    `);

    await database.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_occurrence_job_date ON recurring_job_occurrences(recurring_job_id, scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_recurring_jobs_client ON recurring_jobs(client_id);
      CREATE INDEX IF NOT EXISTS idx_occurrences_status ON recurring_job_occurrences(status);
    `);
  }

  // Migration: Add voice_notes table for session audio attachments
  const voiceNotesTableExists = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='voice_notes'"
  );
  if (voiceNotesTableExists.length === 0) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS voice_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        recorded_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES time_sessions(id) ON DELETE CASCADE
      );
    `);
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_voice_notes_session_id ON voice_notes(session_id);
    `);
  }
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
  await database.execAsync('DROP TABLE IF EXISTS voice_notes;');
  await database.execAsync('DROP TABLE IF EXISTS recurring_job_occurrences;');
  await database.execAsync('DROP TABLE IF EXISTS recurring_jobs;');
  await database.execAsync('DROP TABLE IF EXISTS photos;');
  await database.execAsync('DROP TABLE IF EXISTS session_tags;');
  await database.execAsync('DROP TABLE IF EXISTS tags;');
  await database.execAsync('DROP TABLE IF EXISTS user_settings;');
  await database.execAsync('DROP TABLE IF EXISTS active_timer;');
  await database.execAsync('DROP TABLE IF EXISTS materials;');
  await database.execAsync('DROP TABLE IF EXISTS invoices;');
  await database.execAsync('DROP TABLE IF EXISTS time_sessions;');
  await database.execAsync('DROP TABLE IF EXISTS clients;');
  await runMigrations(database);
}
