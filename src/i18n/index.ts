// i18n Configuration
// Centralized internationalization setup

import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = '@app_language';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  tr: { name: 'Türkçe', nativeName: 'Türkçe', flag: '🇹🇷' },
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// Create i18n instance
const i18n = new I18n({
  tr,
  en,
});

// Configure defaults
i18n.enableFallback = true;
i18n.defaultLocale = 'tr';

// Default to Turkish (expo-localization disabled to avoid native build requirement)
i18n.locale = 'tr';

// Helper to translate with type safety
export function t(
  scope: string,
  options?: Record<string, string | number>
): string {
  return i18n.t(scope, options);
}

// Get current language
export function getCurrentLanguage(): SupportedLanguage {
  return i18n.locale as SupportedLanguage;
}

// Set language
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  i18n.locale = language;
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

// Load saved language preference
export async function loadSavedLanguage(): Promise<SupportedLanguage> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage as SupportedLanguage]) {
      i18n.locale = savedLanguage;
      return savedLanguage as SupportedLanguage;
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
  return i18n.locale as SupportedLanguage;
}

// Check if language is supported
export function isLanguageSupported(language: string): language is SupportedLanguage {
  return language in SUPPORTED_LANGUAGES;
}

// Get all supported languages as array
export function getSupportedLanguages() {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
    code: code as SupportedLanguage,
    ...info,
  }));
}

// Export the i18n instance for direct access if needed
export { i18n };

// Default export
export default i18n;
