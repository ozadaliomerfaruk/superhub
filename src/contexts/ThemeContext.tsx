import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@hometrack/theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };

    loadTheme();
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }, []);

  // Resolve the actual theme based on mode and system preference
  const resolvedTheme: ResolvedTheme =
    themeMode === 'system'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themeMode;

  const isDark = resolvedTheme === 'dark';

  const value: ThemeContextType = {
    themeMode,
    resolvedTheme,
    isDark,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for getting theme-aware colors
export function useThemeColors() {
  const { isDark } = useTheme();

  return {
    // Backgrounds
    background: isDark ? '#0f172a' : '#ffffff',
    backgroundSecondary: isDark ? '#1e293b' : '#f8fafc',
    backgroundTertiary: isDark ? '#334155' : '#f1f5f9',

    // Text
    textPrimary: isDark ? '#f8fafc' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    textTertiary: isDark ? '#64748b' : '#94a3b8',

    // Borders
    border: isDark ? '#334155' : '#e2e8f0',
    borderLight: isDark ? '#1e293b' : '#f1f5f9',

    // Cards
    card: isDark ? '#1e293b' : '#ffffff',
    cardElevated: isDark ? '#334155' : '#ffffff',

    // Inputs
    inputBackground: isDark ? '#334155' : '#f1f5f9',

    // Status bar style
    statusBarStyle: isDark ? 'light' : 'dark',
  };
}
