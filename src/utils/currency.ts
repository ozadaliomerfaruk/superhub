import { settingsRepository } from '../services/database/repositories/settingsRepository';

// Currency symbols map
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  TRY: '₺',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  MXN: 'MX$',
};

// Locale map for proper number formatting
const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  TRY: 'tr-TR',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  CHF: 'de-CH',
  CNY: 'zh-CN',
  INR: 'en-IN',
  BRL: 'pt-BR',
  MXN: 'es-MX',
};

// Cache for settings to avoid async calls in render
let cachedCurrency: string = 'USD';
let cacheInitialized = false;

// Initialize cache from settings
export async function initializeCurrencyCache(): Promise<void> {
  try {
    const settings = await settingsRepository.get();
    if (settings?.currency) {
      cachedCurrency = settings.currency;
    }
    cacheInitialized = true;
  } catch (error) {
    console.error('Failed to initialize currency cache:', error);
  }
}

// Update cache when settings change
export function updateCurrencyCache(currency: string): void {
  cachedCurrency = currency;
  cacheInitialized = true;
}

// Get current cached currency
export function getCachedCurrency(): string {
  return cachedCurrency;
}

// Get currency symbol for display
export function getCurrencySymbol(currency?: string): string {
  const curr = currency || cachedCurrency;
  return CURRENCY_SYMBOLS[curr] || curr;
}

// Format currency with proper locale and symbol
export function formatCurrency(
  amount: number,
  currency?: string,
  locale?: string
): string {
  const curr = currency || cachedCurrency;
  const loc = locale || CURRENCY_LOCALES[curr] || 'en-US';

  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    const symbol = CURRENCY_SYMBOLS[curr] || curr;
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Format currency without the symbol (just the number with proper locale formatting)
export function formatCurrencyAmount(amount: number, currency?: string): string {
  const curr = currency || cachedCurrency;
  const loc = CURRENCY_LOCALES[curr] || 'en-US';

  return new Intl.NumberFormat(loc, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
