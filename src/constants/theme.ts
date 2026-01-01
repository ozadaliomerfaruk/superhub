// Design System Constants
// This file defines the visual language for the entire app

export const COLORS = {
  // Primary - Fresh green for positive actions and home theme
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Secondary - Warm amber for accents
  secondary: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Neutral slate
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    150: '#e9eef4',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172033',
    900: '#0f172a',
    950: '#020617',
  },

  // Category colors - distinct and accessible
  categories: {
    expense: '#ef4444',
    income: '#22c55e',
    repair: '#f97316',
    bill: '#8b5cf6',
    asset: '#06b6d4',
    worker: '#ec4899',
    document: '#6366f1',
    maintenance: '#14b8a6',
    emergency: '#dc2626',
  },

  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Backgrounds
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    tertiary: '#f1f5f9',
  },

  // Dark mode backgrounds
  backgroundDark: {
    primary: '#0f172a',
    secondary: '#1e293b',
    tertiary: '#334155',
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Icon sizes
export const ICON_SIZE = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  '2xl': 40,
} as const;

// Room type icons and colors
export const ROOM_TYPES = {
  living_room: { label: 'Living Room', icon: 'Sofa', color: '#3b82f6' },
  bedroom: { label: 'Bedroom', icon: 'Bed', color: '#8b5cf6' },
  kitchen: { label: 'Kitchen', icon: 'CookingPot', color: '#f97316' },
  bathroom: { label: 'Bathroom', icon: 'Bath', color: '#06b6d4' },
  garage: { label: 'Garage', icon: 'Car', color: '#64748b' },
  basement: { label: 'Basement', icon: 'ArrowDown', color: '#78716c' },
  attic: { label: 'Attic', icon: 'ArrowUp', color: '#a1a1aa' },
  office: { label: 'Office', icon: 'Monitor', color: '#6366f1' },
  laundry: { label: 'Laundry', icon: 'WashingMachine', color: '#14b8a6' },
  dining: { label: 'Dining', icon: 'UtensilsCrossed', color: '#ec4899' },
  outdoor: { label: 'Outdoor', icon: 'Trees', color: '#22c55e' },
  utility: { label: 'Utility', icon: 'Wrench', color: '#f59e0b' },
  storage: { label: 'Storage', icon: 'Package', color: '#a855f7' },
  other: { label: 'Other', icon: 'Grid3x3', color: '#94a3b8' },
} as const;

// Asset category icons and colors
export const ASSET_CATEGORIES = {
  appliance: { label: 'Appliance', icon: 'Refrigerator', color: '#3b82f6' },
  hvac: { label: 'HVAC', icon: 'Thermometer', color: '#06b6d4' },
  plumbing: { label: 'Plumbing', icon: 'Droplets', color: '#0ea5e9' },
  electrical: { label: 'Electrical', icon: 'Zap', color: '#eab308' },
  furniture: { label: 'Furniture', icon: 'Armchair', color: '#a855f7' },
  electronics: { label: 'Electronics', icon: 'Tv', color: '#6366f1' },
  outdoor: { label: 'Outdoor', icon: 'Flower', color: '#22c55e' },
  structural: { label: 'Structural', icon: 'Building', color: '#78716c' },
  other: { label: 'Other', icon: 'Box', color: '#94a3b8' },
} as const;

// Expense type icons and colors
export const EXPENSE_TYPES = {
  repair: { label: 'Repair', icon: 'Wrench', color: '#f97316' },
  bill: { label: 'Bill', icon: 'Receipt', color: '#8b5cf6' },
  maintenance: { label: 'Maintenance', icon: 'Settings', color: '#14b8a6' },
  purchase: { label: 'Purchase', icon: 'ShoppingBag', color: '#3b82f6' },
  other: { label: 'Other', icon: 'MoreHorizontal', color: '#94a3b8' },
} as const;

// Property types
export const PROPERTY_TYPES = {
  home: { label: 'Home', icon: 'Home', color: '#22c55e' },
  vacation: { label: 'Vacation', icon: 'Palmtree', color: '#f59e0b' },
  office: { label: 'Office', icon: 'Building2', color: '#3b82f6' },
  rental: { label: 'Rental', icon: 'Key', color: '#8b5cf6' },
  other: { label: 'Other', icon: 'MapPin', color: '#94a3b8' },
} as const;

// Emergency shutoff types
export const EMERGENCY_TYPES = {
  water: { label: 'Water Shutoff', icon: 'Droplets', color: '#0ea5e9' },
  gas: { label: 'Gas Shutoff', icon: 'Flame', color: '#f97316' },
  electrical: { label: 'Main Breaker', icon: 'Zap', color: '#eab308' },
  hvac: { label: 'HVAC Control', icon: 'Fan', color: '#06b6d4' },
} as const;

// Worker specialties
export const WORKER_SPECIALTIES = [
  'Plumber',
  'Electrician',
  'HVAC Technician',
  'General Contractor',
  'Handyman',
  'Painter',
  'Landscaper',
  'Roofer',
  'Appliance Repair',
  'Carpenter',
  'Flooring',
  'Cleaning',
  'Pest Control',
  'Pool Service',
  'Locksmith',
  'Other',
] as const;

// Bill categories for recurring templates
export const BILL_CATEGORIES = [
  'Electricity',
  'Gas',
  'Water',
  'Internet',
  'Phone',
  'Insurance',
  'HOA',
  'Property Tax',
  'Mortgage',
  'Rent',
  'Trash',
  'Lawn Care',
  'Pool Service',
  'Security',
  'Other',
] as const;

// Maintenance task templates
export const MAINTENANCE_TEMPLATES = [
  {
    title: 'HVAC Filter Replacement',
    description: 'Replace or clean HVAC air filters',
    frequency: 'monthly' as const,
    reminderDaysBefore: 3,
  },
  {
    title: 'Smoke Detector Battery',
    description: 'Test and replace smoke detector batteries',
    frequency: 'biannual' as const,
    reminderDaysBefore: 7,
  },
  {
    title: 'Gutter Cleaning',
    description: 'Clean gutters and downspouts',
    frequency: 'biannual' as const,
    reminderDaysBefore: 7,
  },
  {
    title: 'Water Heater Flush',
    description: 'Drain and flush water heater tank',
    frequency: 'yearly' as const,
    reminderDaysBefore: 14,
  },
  {
    title: 'HVAC Service',
    description: 'Professional HVAC maintenance and inspection',
    frequency: 'yearly' as const,
    reminderDaysBefore: 14,
  },
  {
    title: 'Dryer Vent Cleaning',
    description: 'Clean dryer vent and duct',
    frequency: 'yearly' as const,
    reminderDaysBefore: 7,
  },
  {
    title: 'Refrigerator Coils',
    description: 'Clean refrigerator condenser coils',
    frequency: 'yearly' as const,
    reminderDaysBefore: 7,
  },
  {
    title: 'Septic Tank Pump',
    description: 'Professional septic tank pumping',
    frequency: 'yearly' as const,
    reminderDaysBefore: 30,
  },
] as const;
