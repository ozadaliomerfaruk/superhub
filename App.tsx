import './global.css';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootNavigator } from './src/navigation';
import { getDatabase } from './src/services/database';
import { COLORS } from './src/constants/theme';
import { notificationService } from './src/services/notifications';
import { authService } from './src/services/auth';
import { ThemeProvider, useTheme, SettingsProvider, ToastProvider } from './src/contexts';
import { OnboardingScreen, ONBOARDING_COMPLETE_KEY } from './src/screens/onboarding';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initializeCurrencyCache } from './src/utils/currency';
import { initializeDateCache } from './src/utils/date';
import { recurringExpenseService } from './src/services/recurring';

// Custom navigation themes
const LightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
    primary: COLORS.primary[600],
  },
};

const DarkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f172a',
    card: '#1e293b',
    text: '#f8fafc',
    border: '#334155',
    primary: COLORS.primary[500],
  },
};

function AppContent() {
  const { isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // App is going to background
      await authService.onAppBackground();
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App is coming to foreground
      if (authService.requiresAuthentication()) {
        setIsLocked(true);
        const success = await authService.onAppForeground();
        setIsLocked(!success);
      }
    }
    appState.current = nextAppState;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  useEffect(() => {
    async function initialize() {
      try {
        // Check if onboarding is complete
        const onboardingComplete = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);

        // Initialize database
        await getDatabase();

        // Initialize settings caches for currency and date formatting
        await Promise.all([
          initializeCurrencyCache(),
          initializeDateCache(),
        ]);

        // Initialize auth service
        await authService.initialize();

        // Initialize notifications
        await notificationService.initialize();

        // Process recurring expenses (auto-create if due)
        try {
          await recurringExpenseService.processRecurringExpenses();
        } catch (e) {
          console.log('Recurring expense check failed:', e);
        }

        // Show onboarding if not completed
        if (onboardingComplete !== 'true') {
          setShowOnboarding(true);
        }

        // Check if authentication is required on startup
        if (authService.requiresAuthentication()) {
          setIsLocked(true);
          const success = await authService.authenticate();
          setIsLocked(!success.success);
        }

        setIsReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please restart.');
      }
    }

    initialize();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleUnlock = async () => {
    const result = await authService.authenticate();
    if (result.success) {
      setIsLocked(false);
    }
  };

  if (error) {
    return (
      <View className={`flex-1 items-center justify-center px-8 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <Text className="text-red-500 text-center text-lg font-medium">{error}</Text>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <ActivityIndicator size="large" color={COLORS.primary[600]} />
        <Text className={`mt-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading...</Text>
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  if (isLocked) {
    return (
      <View className={`flex-1 items-center justify-center px-8 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          HomeTrack Locked
        </Text>
        <Text className={`text-center mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Authenticate to access your data
        </Text>
        <View
          className="px-6 py-3 rounded-xl bg-primary-600"
          onTouchEnd={handleUnlock}
        >
          <Text className="text-white font-semibold text-base">Unlock</Text>
        </View>
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkNavigationTheme : LightNavigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <ThemeProvider>
            <SettingsProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </SettingsProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
