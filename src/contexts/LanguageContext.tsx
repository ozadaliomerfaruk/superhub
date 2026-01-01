// Language Context
// Provides language state and switching functionality throughout the app

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  i18n,
  t as translate,
  getCurrentLanguage,
  setLanguage as setI18nLanguage,
  loadSavedLanguage,
  getSupportedLanguages,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '../i18n';
import { updateLocaleCache } from '../utils/date';

interface LanguageContextType {
  // Current language code
  language: SupportedLanguage;
  // Change language
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  // Translation function
  t: (scope: string, options?: Record<string, string | number>) => string;
  // Is language loading
  isLoading: boolean;
  // Supported languages list
  supportedLanguages: ReturnType<typeof getSupportedLanguages>;
  // Language info
  languageInfo: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await loadSavedLanguage();
        setLanguageState(savedLanguage);
        // Update date locale cache
        updateLocaleCache(savedLanguage);
      } catch (error) {
        console.error('Failed to load language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Set language and persist
  const setLanguage = useCallback(async (newLanguage: SupportedLanguage) => {
    try {
      await setI18nLanguage(newLanguage);
      setLanguageState(newLanguage);
      // Update date locale cache
      updateLocaleCache(newLanguage);
    } catch (error) {
      console.error('Failed to set language:', error);
    }
  }, []);

  // Translation wrapper that triggers re-render on language change
  const t = useCallback(
    (scope: string, options?: Record<string, string | number>) => {
      // This dependency on language ensures re-render when language changes
      return translate(scope, options);
    },
    [language]
  );

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    isLoading,
    supportedLanguages: getSupportedLanguages(),
    languageInfo: SUPPORTED_LANGUAGES,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Convenience hook for just translations
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}

export default LanguageContext;
