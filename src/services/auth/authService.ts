import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_LOCK_KEY = 'app_lock_enabled';
const LAST_BACKGROUND_TIME_KEY = 'last_background_time';
const LOCK_TIMEOUT_MS = 60000; // 1 minute

interface AuthResult {
  success: boolean;
  error?: string;
}

class AuthService {
  private isLockEnabled: boolean = false;
  private isAuthenticated: boolean = false;
  private lastBackgroundTime: number | null = null;

  async initialize(): Promise<void> {
    try {
      const enabled = await AsyncStorage.getItem(APP_LOCK_KEY);
      this.isLockEnabled = enabled === 'true';

      const lastTime = await AsyncStorage.getItem(LAST_BACKGROUND_TIME_KEY);
      if (lastTime) {
        this.lastBackgroundTime = parseInt(lastTime, 10);
      }
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
    }
  }

  async checkBiometricAvailability(): Promise<{
    available: boolean;
    biometricType: 'faceid' | 'fingerprint' | 'none';
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (!hasHardware || !isEnrolled) {
        return { available: false, biometricType: 'none' };
      }

      const hasFaceId = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );
      const hasFingerprint = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      );

      return {
        available: true,
        biometricType: hasFaceId ? 'faceid' : hasFingerprint ? 'fingerprint' : 'none',
      };
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
      return { available: false, biometricType: 'none' };
    }
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const { available, biometricType } = await this.checkBiometricAvailability();

      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const promptMessage =
        biometricType === 'faceid'
          ? 'Authenticate with Face ID to access HomeTrack'
          : 'Authenticate with your fingerprint to access HomeTrack';

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        this.isAuthenticated = true;
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: 'An error occurred during authentication',
      };
    }
  }

  async setLockEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_LOCK_KEY, enabled ? 'true' : 'false');
      this.isLockEnabled = enabled;

      if (!enabled) {
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Failed to save lock setting:', error);
      throw error;
    }
  }

  async getLockEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(APP_LOCK_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Failed to get lock setting:', error);
      return false;
    }
  }

  isAppLocked(): boolean {
    return this.isLockEnabled && !this.isAuthenticated;
  }

  requiresAuthentication(): boolean {
    if (!this.isLockEnabled) return false;
    if (this.isAuthenticated) {
      // Check if we need to re-authenticate based on timeout
      if (this.lastBackgroundTime) {
        const timeSinceBackground = Date.now() - this.lastBackgroundTime;
        if (timeSinceBackground > LOCK_TIMEOUT_MS) {
          this.isAuthenticated = false;
          return true;
        }
      }
      return false;
    }
    return true;
  }

  async onAppBackground(): Promise<void> {
    this.lastBackgroundTime = Date.now();
    try {
      await AsyncStorage.setItem(
        LAST_BACKGROUND_TIME_KEY,
        this.lastBackgroundTime.toString()
      );
    } catch (error) {
      console.error('Failed to save background time:', error);
    }
  }

  async onAppForeground(): Promise<boolean> {
    if (this.requiresAuthentication()) {
      const result = await this.authenticate();
      return result.success;
    }
    return true;
  }

  resetAuthentication(): void {
    this.isAuthenticated = false;
  }

  getBiometricLabel(type: 'faceid' | 'fingerprint' | 'none'): string {
    switch (type) {
      case 'faceid':
        return 'Face ID';
      case 'fingerprint':
        return 'Touch ID';
      default:
        return 'Biometric';
    }
  }
}

export const authService = new AuthService();
