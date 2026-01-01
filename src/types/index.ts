// UUID type for all primary keys
export type UUID = string;

// Property Types
export interface Property {
  id: UUID;
  name: string;
  address: string;
  type: 'home' | 'vacation' | 'office' | 'rental' | 'other';
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Room Types
export interface Room {
  id: UUID;
  propertyId: UUID;
  name: string;
  type: RoomType;
  imageUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RoomType =
  | 'living_room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'garage'
  | 'basement'
  | 'attic'
  | 'office'
  | 'laundry'
  | 'dining'
  | 'outdoor'
  | 'utility'
  | 'storage'
  | 'other';

// Asset Types
export interface Asset {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  name: string;
  category: AssetCategory;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyEndDate?: string;
  notes?: string;
  imageUri?: string;
  manualUri?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssetCategory =
  | 'appliance'
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'furniture'
  | 'electronics'
  | 'outdoor'
  | 'structural'
  | 'other';

// Expense Types
export interface Expense {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  assetId?: UUID;
  workerId?: UUID;
  type: ExpenseType;
  category: string;
  amount: number;
  date: string;
  description: string;
  receiptUri?: string;
  isRecurring: boolean;
  recurringTemplateId?: UUID;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export type ExpenseType = 'repair' | 'bill' | 'maintenance' | 'purchase' | 'other';

// Recurring Payment Template
export interface RecurringTemplate {
  id: UUID;
  propertyId: UUID;
  name: string;
  category: string;
  estimatedAmount?: number; // Optional - user may not know the amount
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  typicalPaymentDay?: string; // e.g., "15th", "End of month", "1st week"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Recurring Payment History (tracks when payments were actually made)
export interface RecurringPaymentHistory {
  id: UUID;
  templateId: UUID;
  amount: number;
  paidDate: string;
  notes?: string;
  createdAt: string;
}

// Recurring Payment with history count for display
export interface RecurringTemplateWithHistory extends RecurringTemplate {
  paymentCount: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

// Worker Types
export interface Worker {
  id: UUID;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  specialty: string[];
  rating?: number;
  notes?: string;
  imageUri?: string;
  totalPaid: number;
  createdAt: string;
  updatedAt: string;
}

// Document Types
export interface Document {
  id: UUID;
  propertyId?: UUID;
  assetId?: UUID;
  workerId?: UUID;
  name: string;
  type: 'manual' | 'warranty' | 'receipt' | 'contract' | 'photo' | 'other';
  fileUri: string;
  fileType: 'pdf' | 'image';
  createdAt: string;
  updatedAt: string;
}

// Maintenance Types
export interface MaintenanceTask {
  id: UUID;
  propertyId: UUID;
  assetId?: UUID;
  assignedWorkerId?: UUID; // Default worker for this task
  title: string;
  description?: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';
  lastCompletedDate?: string;
  nextDueDate: string;
  reminderDaysBefore: number;
  isCompleted: boolean;
  isActive: boolean; // Task stays in list, can be deactivated
  createdAt: string;
  updatedAt: string;
}

// Maintenance Task with worker details for display
export interface MaintenanceTaskWithWorker extends MaintenanceTask {
  assignedWorkerName?: string;
  lastCompletionWorkerName?: string;
}

// Maintenance Completion History
export interface MaintenanceCompletion {
  id: UUID;
  taskId: UUID;
  workerId?: UUID; // Who completed the task
  completedDate: string;
  notes?: string;
  cost?: number;
  createdAt: string;
}

// Maintenance Completion with worker details for display
export interface MaintenanceCompletionWithWorker extends MaintenanceCompletion {
  workerName?: string;
  taskTitle?: string;
}

// Paint & Decor Codes
export interface PaintCode {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  location: string;
  brand: string;
  colorName: string;
  colorCode: string;
  finish?: string;
  imageUri?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Emergency Shutoff
export interface EmergencyShutoff {
  id: UUID;
  propertyId: UUID;
  type: 'water' | 'gas' | 'electrical' | 'hvac';
  location: string;
  instructions?: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Measurement
export interface Measurement {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  assetId?: UUID;
  name: string;
  width?: number;
  height?: number;
  depth?: number;
  unit: 'in' | 'ft' | 'cm' | 'm';
  notes?: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Storage Box
export interface StorageBox {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  name: string;
  location: string;
  contents: string;
  imageUri?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

// WiFi Info
export interface WiFiInfo {
  id: UUID;
  propertyId: UUID;
  networkName: string;
  password: string;
  isGuest: boolean;
  qrCodeUri?: string;
  createdAt: string;
  updatedAt: string;
}

// Renovation Before/After
export interface Renovation {
  id: UUID;
  propertyId: UUID;
  roomId?: UUID;
  title: string;
  description?: string;
  beforeImageUri: string;
  afterImageUri?: string;
  completedDate?: string;
  cost?: number;
  createdAt: string;
  updatedAt: string;
}

// Timeline Entry (for unified timeline view)
export interface TimelineEntry {
  id: UUID;
  propertyId: UUID;
  type: 'expense' | 'maintenance' | 'asset' | 'document' | 'note';
  referenceId: UUID;
  date: string;
  title: string;
  description?: string;
  amount?: number;
  imageUri?: string;
}

// Note
export interface Note {
  id: UUID;
  propertyId?: UUID;
  roomId?: UUID;
  assetId?: UUID;
  workerId?: UUID;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// App Settings
export interface AppSettings {
  id: UUID;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  biometricEnabled: boolean;
  photoQuality: 'original' | 'high' | 'medium' | 'low';
  encryptExports: boolean;
  createdAt: string;
  updatedAt: string;
}

// Expense-Asset junction for tracking costs per asset
export interface ExpenseAsset {
  id: UUID;
  expenseId: UUID;
  assetId: UUID;
  amount: number;
  notes?: string;
  createdAt: string;
}

// ExpenseAsset with asset details for display
export interface ExpenseAssetWithDetails extends ExpenseAsset {
  assetName: string;
  assetCategory: AssetCategory;
  assetBrand?: string;
  assetModel?: string;
}

// Navigation Types
export type RootStackParamList = {
  Main: undefined;
  PropertyDetail: { propertyId: UUID };
  RoomDetail: { roomId: UUID };
  AssetDetail: { assetId: UUID };
  WorkerDetail: { workerId: UUID };
  ExpenseDetail: { expenseId: UUID };
  AddProperty: undefined;
  AddRoom: { propertyId: UUID };
  AddAsset: { propertyId: UUID; roomId?: UUID };
  AddExpense: { propertyId: UUID; roomId?: UUID; assetId?: UUID };
  AddWorker: undefined;
  Emergency: { propertyId: UUID };
  Settings: undefined;
  Search: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Timeline: undefined;
  QuickAdd: undefined;
  Workers: undefined;
  Settings: undefined;
};
