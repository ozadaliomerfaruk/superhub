// Database Schema Definitions
// All tables use UUID as primary keys for future data merge scenarios

export const SCHEMA_VERSION = 4;

export const CREATE_TABLES_SQL = `
-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'home',
  image_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  image_uri TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date TEXT,
  purchase_price REAL,
  warranty_end_date TEXT,
  notes TEXT,
  image_uri TEXT,
  manual_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Workers table
CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  specialty TEXT NOT NULL DEFAULT '[]',
  rating REAL,
  notes TEXT,
  image_uri TEXT,
  total_paid REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Recurring templates table (renamed to recurring payments conceptually)
CREATE TABLE IF NOT EXISTS recurring_templates (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_amount REAL,
  frequency TEXT NOT NULL,
  typical_payment_day TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Recurring payment history table (tracks actual payments made)
CREATE TABLE IF NOT EXISTS recurring_payment_history (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES recurring_templates(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  asset_id TEXT,
  worker_id TEXT,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_uri TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurring_template_id TEXT,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
  FOREIGN KEY (recurring_template_id) REFERENCES recurring_templates(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  asset_id TEXT,
  worker_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Maintenance tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  asset_id TEXT,
  assigned_worker_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  last_completed_date TEXT,
  next_due_date TEXT NOT NULL,
  reminder_days_before INTEGER NOT NULL DEFAULT 7,
  is_completed INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- Maintenance completions table (history of task completions)
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

-- Paint codes table
CREATE TABLE IF NOT EXISTS paint_codes (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  location TEXT NOT NULL,
  brand TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_code TEXT NOT NULL,
  finish TEXT,
  image_uri TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Emergency shutoffs table
CREATE TABLE IF NOT EXISTS emergency_shutoffs (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  instructions TEXT,
  image_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  asset_id TEXT,
  name TEXT NOT NULL,
  width REAL,
  height REAL,
  depth REAL,
  unit TEXT NOT NULL DEFAULT 'in',
  notes TEXT,
  image_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

-- Storage boxes table
CREATE TABLE IF NOT EXISTS storage_boxes (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  contents TEXT NOT NULL,
  image_uri TEXT,
  qr_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- WiFi info table
CREATE TABLE IF NOT EXISTS wifi_info (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  network_name TEXT NOT NULL,
  password TEXT NOT NULL,
  is_guest INTEGER NOT NULL DEFAULT 0,
  qr_code_uri TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Renovations table (before/after gallery)
CREATE TABLE IF NOT EXISTS renovations (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  room_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  before_image_uri TEXT NOT NULL,
  after_image_uri TEXT,
  completed_date TEXT,
  cost REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  property_id TEXT,
  room_id TEXT,
  asset_id TEXT,
  worker_id TEXT,
  content TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  theme TEXT NOT NULL DEFAULT 'system',
  currency TEXT NOT NULL DEFAULT 'USD',
  date_format TEXT NOT NULL DEFAULT 'MM/dd/yyyy',
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  photo_quality TEXT NOT NULL DEFAULT 'high',
  encrypt_exports INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Expense-Asset junction table for tracking multiple assets per expense
CREATE TABLE IF NOT EXISTS expense_assets (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_assets_property ON assets(property_id);
CREATE INDEX IF NOT EXISTS idx_assets_room ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_maintenance_property ON maintenance_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_due ON maintenance_tasks(next_due_date);
CREATE INDEX IF NOT EXISTS idx_documents_property ON documents(property_id);
CREATE INDEX IF NOT EXISTS idx_notes_property ON notes(property_id);
CREATE INDEX IF NOT EXISTS idx_renovations_property ON renovations(property_id);
CREATE INDEX IF NOT EXISTS idx_expense_assets_expense ON expense_assets(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_assets_asset ON expense_assets(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_task ON maintenance_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_worker ON maintenance_completions(worker_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_date ON maintenance_completions(completed_date);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_history_template ON recurring_payment_history(template_id);
CREATE INDEX IF NOT EXISTS idx_recurring_payment_history_date ON recurring_payment_history(paid_date);
`;

export const DROP_TABLES_SQL = `
DROP TABLE IF EXISTS recurring_payment_history;
DROP TABLE IF EXISTS maintenance_completions;
DROP TABLE IF EXISTS expense_assets;
DROP TABLE IF EXISTS renovations;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS wifi_info;
DROP TABLE IF EXISTS storage_boxes;
DROP TABLE IF EXISTS measurements;
DROP TABLE IF EXISTS emergency_shutoffs;
DROP TABLE IF EXISTS paint_codes;
DROP TABLE IF EXISTS maintenance_tasks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS recurring_templates;
DROP TABLE IF EXISTS workers;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS app_settings;
`;

// Migration SQL for updating from version 2 to version 3
export const MIGRATION_V2_TO_V3 = `
-- Add new columns to maintenance_tasks
ALTER TABLE maintenance_tasks ADD COLUMN assigned_worker_id TEXT REFERENCES workers(id) ON DELETE SET NULL;
ALTER TABLE maintenance_tasks ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- Create maintenance_completions table
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

-- Create indexes for maintenance_completions
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_task ON maintenance_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_worker ON maintenance_completions(worker_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_completions_date ON maintenance_completions(completed_date);
`;
