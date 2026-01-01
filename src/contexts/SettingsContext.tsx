import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { settingsRepository } from '../services/database/repositories/settingsRepository';
import { AppSettings } from '../types';
import { updateCurrencyCache } from '../utils/currency';
import { updateDateCache } from '../utils/date';

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  updateCurrency: (currency: string) => Promise<void>;
  updateDateFormat: (dateFormat: string) => Promise<void>;
  updatePhotoQuality: (quality: AppSettings['photoQuality']) => Promise<void>;
  updateEncryptExports: (enabled: boolean) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const CURRENCY_OPTIONS = [
  { label: 'USD ($)', value: 'USD', symbol: '$' },
  { label: 'EUR (\u20ac)', value: 'EUR', symbol: '\u20ac' },
  { label: 'GBP (\u00a3)', value: 'GBP', symbol: '\u00a3' },
  { label: 'TRY (\u20ba)', value: 'TRY', symbol: '\u20ba' },
  { label: 'JPY (\u00a5)', value: 'JPY', symbol: '\u00a5' },
  { label: 'CAD (C$)', value: 'CAD', symbol: 'C$' },
  { label: 'AUD (A$)', value: 'AUD', symbol: 'A$' },
  { label: 'CHF (CHF)', value: 'CHF', symbol: 'CHF' },
  { label: 'CNY (\u00a5)', value: 'CNY', symbol: '\u00a5' },
  { label: 'INR (\u20b9)', value: 'INR', symbol: '\u20b9' },
  { label: 'BRL (R$)', value: 'BRL', symbol: 'R$' },
  { label: 'MXN (MX$)', value: 'MXN', symbol: 'MX$' },
];

export const DATE_FORMAT_OPTIONS = [
  { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy', example: '12/31/2024' },
  { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy', example: '31/12/2024' },
  { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd', example: '2024-12-31' },
  { label: 'DD.MM.YYYY', value: 'dd.MM.yyyy', example: '31.12.2024' },
  { label: 'MMM DD, YYYY', value: 'MMM dd, yyyy', example: 'Dec 31, 2024' },
  { label: 'DD MMM YYYY', value: 'dd MMM yyyy', example: '31 Dec 2024' },
];

export const PHOTO_QUALITY_OPTIONS = [
  { label: 'Original', value: 'original', description: 'Full resolution (largest file size)' },
  { label: 'High', value: 'high', description: 'Recommended (good quality, smaller size)' },
  { label: 'Medium', value: 'medium', description: 'Balanced quality and size' },
  { label: 'Low', value: 'low', description: 'Smallest file size' },
];

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsRepository.get();
      setSettings(data);
      // Sync caches with loaded settings
      if (data?.currency) {
        updateCurrencyCache(data.currency);
      }
      if (data?.dateFormat) {
        updateDateCache(data.dateFormat);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateCurrency = useCallback(async (currency: string) => {
    try {
      await settingsRepository.setCurrency(currency);
      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, currency };
      });
      updateCurrencyCache(currency);
    } catch (error) {
      console.error('Failed to update currency:', error);
      throw error;
    }
  }, []);

  const updateDateFormat = useCallback(async (dateFormat: string) => {
    try {
      await settingsRepository.setDateFormat(dateFormat);
      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, dateFormat };
      });
      updateDateCache(dateFormat);
    } catch (error) {
      console.error('Failed to update date format:', error);
      throw error;
    }
  }, []);

  const updatePhotoQuality = useCallback(async (photoQuality: AppSettings['photoQuality']) => {
    try {
      await settingsRepository.setPhotoQuality(photoQuality);
      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, photoQuality };
      });
    } catch (error) {
      console.error('Failed to update photo quality:', error);
      throw error;
    }
  }, []);

  const updateEncryptExports = useCallback(async (encryptExports: boolean) => {
    try {
      await settingsRepository.setEncryptExports(encryptExports);
      setSettings(prev => {
        if (!prev) return prev;
        return { ...prev, encryptExports };
      });
    } catch (error) {
      console.error('Failed to update encrypt exports:', error);
      throw error;
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const value: SettingsContextType = {
    settings,
    isLoading,
    updateCurrency,
    updateDateFormat,
    updatePhotoQuality,
    updateEncryptExports,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Helper to get display label for currency
export function getCurrencyLabel(code: string): string {
  const option = CURRENCY_OPTIONS.find(o => o.value === code);
  return option?.label || code;
}

// Helper to get display label for date format
export function getDateFormatLabel(format: string): string {
  const option = DATE_FORMAT_OPTIONS.find(o => o.value === format);
  return option?.label || format;
}

// Helper to get display label for photo quality
export function getPhotoQualityLabel(quality: string): string {
  const option = PHOTO_QUALITY_OPTIONS.find(o => o.value === quality);
  return option?.label || quality;
}
