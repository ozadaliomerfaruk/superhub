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

    // Migration V5: Add expense_type to renovations
    const renovationsTableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(renovations)"
    );
    const hasExpenseType = renovationsTableInfo.some(col => col.name === 'expense_type');
    if (!hasExpenseType) {
      await database.execAsync('ALTER TABLE renovations ADD COLUMN expense_type TEXT');
    }

    // Migration V5: Add reminder columns to notes
    const notesTableInfo = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(notes)"
    );
    const hasReminderDate = notesTableInfo.some(col => col.name === 'reminder_date');
    if (!hasReminderDate) {
      await database.execAsync('ALTER TABLE notes ADD COLUMN reminder_date TEXT');
      await database.execAsync('ALTER TABLE notes ADD COLUMN reminder_notification_id TEXT');
    }
    // Create notes reminder index (after column exists)
    await database.execAsync('CREATE INDEX IF NOT EXISTS idx_notes_reminder ON notes(reminder_date)');

    // Migration V5: Create renovation_workers table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS renovation_workers (
        id TEXT PRIMARY KEY,
        renovation_id TEXT NOT NULL,
        worker_id TEXT NOT NULL,
        role TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (renovation_id) REFERENCES renovations(id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_renovation_workers_renovation ON renovation_workers(renovation_id);
      CREATE INDEX IF NOT EXISTS idx_renovation_workers_worker ON renovation_workers(worker_id);
    `);

    // Migration V5: Create renovation_assets table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS renovation_assets (
        id TEXT PRIMARY KEY,
        renovation_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (renovation_id) REFERENCES renovations(id) ON DELETE CASCADE,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_renovation_assets_renovation ON renovation_assets(renovation_id);
      CREATE INDEX IF NOT EXISTS idx_renovation_assets_asset ON renovation_assets(asset_id);
    `);

    // Migration V5: Create renovation_costs table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS renovation_costs (
        id TEXT PRIMARY KEY,
        renovation_id TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT,
        date TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (renovation_id) REFERENCES renovations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_renovation_costs_renovation ON renovation_costs(renovation_id);
    `);

    // Migration V5: Create worker_notes table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS worker_notes (
        id TEXT PRIMARY KEY,
        worker_id TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_worker_notes_worker ON worker_notes(worker_id);
    `);


    // Migration V6: Create custom_categories table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS custom_categories (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_custom_categories_type ON custom_categories(type);
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

// Transaction helpers for data consistency
export async function beginTransaction(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('BEGIN TRANSACTION');
}

export async function commitTransaction(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('COMMIT');
}

export async function rollbackTransaction(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('ROLLBACK');
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  await beginTransaction();
  try {
    const result = await fn();
    await commitTransaction();
    return result;
  } catch (error) {
    await rollbackTransaction();
    throw error;
  }
}
