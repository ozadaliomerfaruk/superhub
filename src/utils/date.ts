import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { settingsRepository } from '../services/database/repositories/settingsRepository';

// Cache for date format setting
let cachedDateFormat: string = 'MM/dd/yyyy';
let cacheInitialized = false;

// Initialize cache from settings
export async function initializeDateCache(): Promise<void> {
  try {
    const settings = await settingsRepository.get();
    if (settings?.dateFormat) {
      cachedDateFormat = settings.dateFormat;
    }
    cacheInitialized = true;
  } catch (error) {
    console.error('Failed to initialize date cache:', error);
  }
}

// Update cache when settings change
export function updateDateCache(dateFormat: string): void {
  cachedDateFormat = dateFormat;
  cacheInitialized = true;
}

// Get current cached date format
export function getCachedDateFormat(): string {
  return cachedDateFormat;
}

// Format date using the cached settings format
export function formatDate(dateString: string, formatStr?: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, formatStr || cachedDateFormat);
}

// Format a Date object using cached settings
export function formatDateObject(date: Date, formatStr?: string): string {
  if (!isValid(date)) return '';
  return format(date, formatStr || cachedDateFormat);
}

// Format date with time
export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, `${cachedDateFormat} h:mm a`);
}

// Format date in a friendly way (e.g., "December 25, 2024")
export function formatDateFriendly(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'MMMM d, yyyy');
}

// Format date with day name (e.g., "Wednesday, December 25, 2024")
export function formatDateWithDay(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'EEEE, MMMM d, yyyy');
}

// Format Date object with day name
export function formatDateObjectWithDay(date: Date): string {
  if (!isValid(date)) return '';
  return format(date, 'EEEE, MMMM d, yyyy');
}

// Format short date (e.g., "Dec 25")
export function formatDateShort(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return format(date, 'MMM d');
}

// Format relative time (e.g., "2 days ago")
export function formatRelative(dateString: string): string {
  const date = parseISO(dateString);
  if (!isValid(date)) return dateString;
  return formatDistanceToNow(date, { addSuffix: true });
}

// Alias for formatRelative
export function formatRelativeDate(dateString: string): string {
  return formatRelative(dateString);
}

// Get current ISO date string
export function getCurrentISODate(): string {
  return new Date().toISOString();
}

// Convert Date to ISO string
export function toISODate(date: Date): string {
  return date.toISOString();
}

// Parse ISO date string to Date object
export function parseDate(dateString: string): Date | null {
  const date = parseISO(dateString);
  return isValid(date) ? date : null;
}

// Check if a date is in the past
export function isPastDate(dateString: string): boolean {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  return date < new Date();
}

// Check if a date is today
export function isToday(dateString: string): boolean {
  const date = parseISO(dateString);
  if (!isValid(date)) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Get days until a date (negative if in past)
export function getDaysUntil(dateString: string): number {
  const date = parseISO(dateString);
  if (!isValid(date)) return 0;
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
