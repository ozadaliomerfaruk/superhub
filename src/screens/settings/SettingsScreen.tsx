import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Moon,
  Sun,
  Monitor,
  Download,
  Upload,
  Shield,
  HelpCircle,
  FileText,
  Smartphone,
  Camera,
  DollarSign,
  Calendar,
  Star,
  MessageCircle,
  Lock,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ListItem, Divider, SelectDialog, PasswordDialog } from '../../components/ui';
import { COLORS, SHADOWS } from '../../constants/theme';
import { backupService } from '../../services/backup';
import { authService } from '../../services/auth';
import {
  useTheme,
  useSettings,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  PHOTO_QUALITY_OPTIONS,
  getCurrencyLabel,
  getDateFormatLabel,
  getPhotoQualityLabel,
} from '../../contexts';
import { AppSettings } from '../../types';

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System Default', value: 'system' },
];

const THEME_LABELS: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System default',
};

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { settings, updateCurrency, updateDateFormat, updatePhotoQuality, updateEncryptExports } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceid' | 'fingerprint' | 'none'>('none');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDateFormatPicker, setShowDateFormatPicker] = useState(false);
  const [showPhotoQualityPicker, setShowPhotoQualityPicker] = useState(false);
  const [showExportPasswordDialog, setShowExportPasswordDialog] = useState(false);
  const [showImportPasswordDialog, setShowImportPasswordDialog] = useState(false);

  const loadSettings = useCallback(async () => {
    const [lockEnabled, biometrics] = await Promise.all([
      authService.getLockEnabled(),
      authService.checkBiometricAvailability(),
    ]);
    setAppLockEnabled(lockEnabled);
    setBiometricAvailable(biometrics.available);
    setBiometricType(biometrics.biometricType);
  }, []);

  const handleThemeSelect = async (value: string) => {
    setShowThemePicker(false);
    await setThemeMode(value as 'light' | 'dark' | 'system');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleCurrencySelect = async (value: string) => {
    setShowCurrencyPicker(false);
    try {
      await updateCurrency(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to update currency');
    }
  };

  const handleDateFormatSelect = async (value: string) => {
    setShowDateFormatPicker(false);
    try {
      await updateDateFormat(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to update date format');
    }
  };

  const handlePhotoQualitySelect = async (value: string) => {
    setShowPhotoQualityPicker(false);
    try {
      await updatePhotoQuality(value as AppSettings['photoQuality']);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to update photo quality');
    }
  };

  const getThemeIcon = () => {
    if (themeMode === 'dark' || (themeMode === 'system' && isDark)) {
      return <Moon size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />;
    }
    if (themeMode === 'light') {
      return <Sun size={18} color={COLORS.secondary[500]} />;
    }
    return <Monitor size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />;
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleAppLockToggle = async (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        'Biometric Not Available',
        'Please set up Face ID or Touch ID in your device settings first.'
      );
      return;
    }

    if (enabled) {
      // Verify user can authenticate before enabling
      const result = await authService.authenticate();
      if (!result.success) {
        Alert.alert('Authentication Failed', result.error || 'Could not verify your identity');
        return;
      }
    }

    try {
      await authService.setLockEnabled(enabled);
      setAppLockEnabled(enabled);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to update app lock setting');
    }
  };

  const handleExportData = async () => {
    const encryptEnabled = settings?.encryptExports ?? false;

    if (encryptEnabled) {
      // Show password dialog for encrypted export
      setShowExportPasswordDialog(true);
    } else {
      // Regular export without encryption
      Alert.alert(
        'Export Data',
        'Your data will be exported as a JSON file containing all your properties, expenses, workers, and more.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export',
            onPress: () => performExport(),
          },
        ]
      );
    }
  };

  const performExport = async (password?: string) => {
    setIsExporting(true);
    try {
      const result = await backupService.exportData(password);
      Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Export Failed', 'An unexpected error occurred');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPasswordConfirm = async (password: string) => {
    setShowExportPasswordDialog(false);
    await performExport(password);
  };

  const handleImportData = async () => {
    Alert.alert(
      'Import Data',
      'Select a backup file to restore your data. This will merge with your existing data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          onPress: () => performImport(),
        },
      ]
    );
  };

  const performImport = async (password?: string) => {
    setIsImporting(true);
    try {
      const result = await backupService.importData(password);

      // Check if file needs password
      if (result.needsPassword) {
        setIsImporting(false);
        setShowImportPasswordDialog(true);
        return;
      }

      Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      ).catch(() => {});
      if (result.success && result.stats) {
        Alert.alert(
          'Import Successful',
          `Imported:\n${result.stats.properties} properties\n${result.stats.rooms} rooms\n${result.stats.assets} assets\n${result.stats.expenses} expenses\n${result.stats.workers} workers`
        );
      } else if (!result.success && result.error !== 'No file selected') {
        Alert.alert('Import Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      Alert.alert('Import Failed', 'An unexpected error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportPasswordConfirm = async (password: string) => {
    setShowImportPasswordDialog(false);
    await performImport(password);
  };

  const handleEncryptExportsToggle = async (enabled: boolean) => {
    try {
      await updateEncryptExports(enabled);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert('Error', 'Failed to update encryption setting');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data including properties, expenses, workers, and photos. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await backupService.clearAllData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              Alert.alert('Success', 'All data has been deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  // Helper to get photo quality subtitle with recommendation
  const getPhotoQualitySubtitle = () => {
    const quality = settings?.photoQuality || 'high';
    const label = getPhotoQualityLabel(quality);
    return quality === 'high' ? `${label} (Recommended)` : label;
  };

  // Support handlers
  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'HomeTrack is your complete home management solution.\n\n' +
      'Key Features:\n' +
      '• Track multiple properties\n' +
      '• Log expenses and receipts\n' +
      '• Schedule maintenance reminders\n' +
      '• Store important documents\n' +
      '• Manage contractor contacts\n\n' +
      'Need help? Tap on any screen\'s info button for tips.',
      [{ text: 'Got it', style: 'default' }]
    );
  };

  const handleSendFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'We appreciate your feedback! As this app is under development, your input helps us improve.\n\n' +
      'What would you like to share?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report a Bug',
          onPress: () => {
            Alert.alert(
              'Bug Report',
              'Please describe the issue you encountered and the steps to reproduce it. We\'ll work on fixing it in the next update.',
              [{ text: 'OK' }]
            );
          },
        },
        {
          text: 'Suggest Feature',
          onPress: () => {
            Alert.alert(
              'Feature Request',
              'We\'d love to hear your ideas! Feature requests are reviewed for future updates.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate HomeTrack',
      'Thank you for your interest in rating HomeTrack!\n\n' +
      'This app is currently in development. Once it\'s published to the App Store and Play Store, you\'ll be able to rate it there.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'HomeTrack Privacy Policy\n\n' +
      '• All your data is stored locally on your device\n' +
      '• We do not collect or transmit any personal information\n' +
      '• Backups are encrypted when you enable encryption\n' +
      '• Photos and documents stay on your device\n' +
      '• No analytics or tracking is used\n\n' +
      'Your privacy is our priority.',
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'HomeTrack Terms of Service\n\n' +
      '• This app is provided "as-is" without warranties\n' +
      '• You are responsible for backing up your data\n' +
      '• Use of this app is at your own risk\n' +
      '• We are not liable for any data loss\n' +
      '• You retain ownership of all your content\n\n' +
      'By using this app, you agree to these terms.',
      [{ text: 'I Agree' }]
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`px-5 pt-4 pb-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border-b`}>
        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</Text>
        <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Customize your experience</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Preferences
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="Theme"
              subtitle={THEME_LABELS[themeMode]}
              leftIcon={
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  {getThemeIcon()}
                </View>
              }
              showChevron
              onPress={() => setShowThemePicker(true)}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Currency"
              subtitle={getCurrencyLabel(settings?.currency || 'USD')}
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-green-100 items-center justify-center">
                  <DollarSign size={18} color={COLORS.primary[600]} />
                </View>
              }
              showChevron
              onPress={() => setShowCurrencyPicker(true)}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Date Format"
              subtitle={getDateFormatLabel(settings?.dateFormat || 'MM/dd/yyyy')}
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
                  <Calendar size={18} color={COLORS.info} />
                </View>
              }
              showChevron
              onPress={() => setShowDateFormatPicker(true)}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Photo Quality"
              subtitle={getPhotoQualitySubtitle()}
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-purple-100 items-center justify-center">
                  <Camera size={18} color="#8b5cf6" />
                </View>
              }
              showChevron
              onPress={() => setShowPhotoQualityPicker(true)}
            />
          </View>
        </View>

        {/* Data & Backup Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Data & Backup
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="Export Data"
              subtitle="Create a backup ZIP file"
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-cyan-100 items-center justify-center">
                  <Download size={18} color="#0891b2" />
                </View>
              }
              showChevron
              onPress={handleExportData}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Import Data"
              subtitle="Restore from backup"
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
                  <Upload size={18} color="#d97706" />
                </View>
              }
              showChevron
              onPress={handleImportData}
            />
          </View>
        </View>

        {/* Security Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Security
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="App Lock"
              subtitle={
                biometricAvailable
                  ? `Require ${authService.getBiometricLabel(biometricType)}`
                  : 'Biometric not available'
              }
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-indigo-100 items-center justify-center">
                  <Lock size={18} color="#6366f1" />
                </View>
              }
              rightContent={
                <Switch
                  value={appLockEnabled}
                  onValueChange={handleAppLockToggle}
                  trackColor={{ false: COLORS.slate[200], true: COLORS.primary[500] }}
                  thumbColor="#ffffff"
                  disabled={!biometricAvailable}
                />
              }
              onPress={() => {}}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Encrypt Exports"
              subtitle={settings?.encryptExports ? "Backups will be password-protected" : "Password-protect backup files"}
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-teal-100 items-center justify-center">
                  <Shield size={18} color="#14b8a6" />
                </View>
              }
              rightContent={
                <Switch
                  value={settings?.encryptExports ?? false}
                  onValueChange={handleEncryptExportsToggle}
                  trackColor={{ false: COLORS.slate[200], true: COLORS.primary[500] }}
                  thumbColor="#ffffff"
                />
              }
              onPress={() => handleEncryptExportsToggle(!(settings?.encryptExports ?? false))}
            />
          </View>
        </View>

        {/* Support Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Support
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="Help & Support"
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
                  <HelpCircle size={18} color={COLORS.info} />
                </View>
              }
              showChevron
              onPress={handleHelpSupport}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Send Feedback"
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-pink-100 items-center justify-center">
                  <MessageCircle size={18} color="#ec4899" />
                </View>
              }
              showChevron
              onPress={handleSendFeedback}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Rate the App"
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
                  <Star size={18} color="#f59e0b" />
                </View>
              }
              showChevron
              onPress={handleRateApp}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Legal
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="Privacy Policy"
              leftIcon={
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <FileText size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                </View>
              }
              showChevron
              onPress={handlePrivacyPolicy}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title="Terms of Service"
              leftIcon={
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <FileText size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                </View>
              }
              showChevron
              onPress={handleTermsOfService}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Danger Zone
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title="Clear All Data"
              subtitle="Delete everything permanently"
              danger
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-red-100 items-center justify-center">
                  <Trash2 size={18} color={COLORS.error} />
                </View>
              }
              showChevron
              onPress={handleClearData}
            />
          </View>
        </View>

        {/* Privacy Notice */}
        <View className={`mx-5 mt-6 p-4 rounded-2xl border ${isDark ? 'bg-primary-900/30 border-primary-800' : 'bg-primary-50 border-primary-100'}`}>
          <View className="flex-row items-center mb-2">
            <Shield size={18} color={COLORS.primary[600]} />
            <Text className={`text-sm font-bold ml-2 ${isDark ? 'text-primary-300' : 'text-primary-800'}`}>
              Your data stays on your device
            </Text>
          </View>
          <Text className={`text-sm leading-5 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
            All your information is stored locally on your device. No account required, no cloud sync, no tracking. Your privacy is our priority.
          </Text>
        </View>

        {/* App Info */}
        <View className="items-center mt-8 mb-4">
          <View className="w-14 h-14 rounded-2xl bg-primary-600 items-center justify-center mb-3">
            <Smartphone size={24} color="white" />
          </View>
          <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>HomeTrack</Text>
          <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Version 1.0.0</Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>The Carfax for Your Home</Text>
        </View>
      </ScrollView>

      {/* Theme Picker Dialog */}
      <SelectDialog
        visible={showThemePicker}
        title="Choose Theme"
        message="Select your preferred appearance"
        options={THEME_OPTIONS}
        onCancel={() => setShowThemePicker(false)}
        onSelect={handleThemeSelect}
      />

      {/* Currency Picker Dialog */}
      <SelectDialog
        visible={showCurrencyPicker}
        title="Choose Currency"
        message="Select your preferred currency for displaying amounts"
        options={CURRENCY_OPTIONS}
        onCancel={() => setShowCurrencyPicker(false)}
        onSelect={handleCurrencySelect}
      />

      {/* Date Format Picker Dialog */}
      <SelectDialog
        visible={showDateFormatPicker}
        title="Choose Date Format"
        message="Select how dates should be displayed"
        options={DATE_FORMAT_OPTIONS.map(opt => ({
          label: `${opt.label} (${opt.example})`,
          value: opt.value,
        }))}
        onCancel={() => setShowDateFormatPicker(false)}
        onSelect={handleDateFormatSelect}
      />

      {/* Photo Quality Picker Dialog */}
      <SelectDialog
        visible={showPhotoQualityPicker}
        title="Choose Photo Quality"
        message="Higher quality uses more storage"
        options={PHOTO_QUALITY_OPTIONS.map(opt => ({
          label: `${opt.label} - ${opt.description}`,
          value: opt.value,
        }))}
        onCancel={() => setShowPhotoQualityPicker(false)}
        onSelect={handlePhotoQualitySelect}
      />

      {/* Export Password Dialog */}
      <PasswordDialog
        visible={showExportPasswordDialog}
        title="Encrypt Backup"
        message="Set a password to protect your backup. You'll need this password to restore from this backup."
        placeholder="Enter password"
        confirmPlaceholder="Confirm password"
        requireConfirmation={true}
        minLength={4}
        cancelText="Cancel"
        confirmText="Create Backup"
        onCancel={() => setShowExportPasswordDialog(false)}
        onConfirm={handleExportPasswordConfirm}
      />

      {/* Import Password Dialog */}
      <PasswordDialog
        visible={showImportPasswordDialog}
        title="Encrypted Backup"
        message="This backup is password-protected. Enter the password to restore your data."
        placeholder="Enter password"
        requireConfirmation={false}
        minLength={1}
        cancelText="Cancel"
        confirmText="Restore"
        onCancel={() => setShowImportPasswordDialog(false)}
        onConfirm={handleImportPasswordConfirm}
      />
    </View>
  );
}
