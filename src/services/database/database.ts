import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

const DATABASE_NAME = 'homemaintenance.db';

let db: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  // Return existing database if already initialized
  if (db) {
    return db;
  }

  // If initialization is in progress, wait for it (prevents race condition)
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization with mutex lock
  initializationPromise = (async () => {
    try {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(database);
      db = database;
      return database;
    } catch (error) {
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  // Enable foreign keys
  await database.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await database.execAsync(CREATE_TABLES_SQL);

  // Run migrations
  await runMigrations(database);

  // Set schema version
  await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Run all migrations within a transaction for data integrity
  await database.execAsync('BEGIN TRANSACTION');

  try {
    // Migration: Add encrypt_exports column if it doesn't exist
    const tableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(app_settings)"
    );
    const hasEncryptExports = tableInfo.some(col => col.name === 'encrypt_exports');

    if (!hasEncryptExports) {
      await database.execAsync(
        'ALTER TABLE app_settings ADD COLUMN encrypt_exports INTEGER NOT NULL DEFAULT 0'
      );
    }

    // Migration V3: Add assigned_worker_id and is_active to maintenance_tasks
    const maintenanceTableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(maintenance_tasks)"
    );
    const hasAssignedWorkerId = maintenanceTableInfo.some(col => col.name === 'assigned_worker_id');
    const hasIsActive = maintenanceTableInfo.some(col => col.name === 'is_active');

    if (!hasAssignedWorkerId) {
      await database.execAsync(
        'ALTER TABLE maintenance_tasks ADD COLUMN assigned_worker_id TEXT'
      );
    }

    if (!hasIsActive) {
      await database.execAsync(
        'ALTER TABLE maintenance_tasks ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1'
      );
    }

    // Migration V3: Create maintenance_completions table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS maintenance_completions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        worker_id TEXT,
        completed_date TEXT NOT NULL,
        notes TEXT,
        cost REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_maintenance_completions_task ON maintenance_completions(task_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_completions_worker ON maintenance_completions(worker_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_completions_date ON maintenance_completions(completed_date);
    `);

    // Migration V4: Add typical_payment_day to recurring_templates
    const recurringTableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(recurring_templates)"
    );
    const hasTypicalPaymentDay = recurringTableInfo.some(col => col.name === 'typical_payment_day');

    if (!hasTypicalPaymentDay) {
      await database.execAsync(
        'ALTER TABLE recurring_templates ADD COLUMN typical_payment_day TEXT'
      );
    }

    // Migration V4: Create recurring_payment_history table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_payment_history (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        amount REAL NOT NULL,
        paid_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_recurring_payment_history_template ON recurring_payment_history(template_id);
      CREATE INDEX IF NOT EXISTS idx_recurring_payment_history_date ON recurring_payment_history(paid_date);
    `);

    await database.execAsync('COMMIT');
  } catch (error) {
    await database.execAsync('ROLLBACK');
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    initializationPromise = null;
  }
}

// Generic query helpers
export async function queryAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const database = await getDatabase();
  return database.getAllAsync<T>(sql, params);
}

export async function queryFirst<T>(sql: string, params: any[] = []): Promise<T | null> {
  const database = await getDatabase();
  return database.getFirstAsync<T>(sql, params);
}

export async function execute(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
  const database = await getDatabase();
  return database.runAsync(sql, params);
}

export async function executeMany(sql: string, paramsArray: any[][]): Promise<void> {
  const database = await getDatabase();
  for (const params of paramsArray) {
    await database.runAsync(sql, params);
  }
}
