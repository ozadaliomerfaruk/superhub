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
  Globe,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ListItem, Divider, SelectDialog, PasswordDialog } from '../../components/ui';
import { COLORS, SHADOWS } from '../../constants/theme';
import { backupService } from '../../services/backup';
import { authService } from '../../services/auth';
import {
  useTheme,
  useSettings,
  useLanguage,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  PHOTO_QUALITY_OPTIONS,
  getCurrencyLabel,
  getDateFormatLabel,
  getPhotoQualityLabel,
} from '../../contexts';
import { AppSettings } from '../../types';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { settings, updateCurrency, updateDateFormat, updatePhotoQuality, updateEncryptExports } = useSettings();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();

  // Theme options using translations
  const THEME_OPTIONS = [
    { label: t('settingsScreen.themeOptions.light'), value: 'light' },
    { label: t('settingsScreen.themeOptions.dark'), value: 'dark' },
    { label: t('settingsScreen.themeOptions.system'), value: 'system' },
  ];

  const getThemeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      light: t('settingsScreen.themeOptions.light'),
      dark: t('settingsScreen.themeOptions.dark'),
      system: t('settingsScreen.themeOptions.system'),
    };
    return labels[mode] || mode;
  };
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'faceid' | 'fingerprint' | 'none'>('none');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDateFormatPicker, setShowDateFormatPicker] = useState(false);
  const [showPhotoQualityPicker, setShowPhotoQualityPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showExportPasswordDialog, setShowExportPasswordDialog] = useState(false);
  const [showImportPasswordDialog, setShowImportPasswordDialog] = useState(false);

  // Language options for picker
  const languageOptions = supportedLanguages.map(lang => ({
    label: `${lang.flag} ${lang.nativeName}`,
    value: lang.code,
  }));

  const handleLanguageSelect = async (value: string) => {
    setShowLanguagePicker(false);
    try {
      await setLanguage(value as SupportedLanguage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.languageError'));
    }
  };

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
      Alert.alert(t('common.error'), t('settingsScreen.alerts.currencyError'));
    }
  };

  const handleDateFormatSelect = async (value: string) => {
    setShowDateFormatPicker(false);
    try {
      await updateDateFormat(value);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.dateFormatError'));
    }
  };

  const handlePhotoQualitySelect = async (value: string) => {
    setShowPhotoQualityPicker(false);
    try {
      await updatePhotoQuality(value as AppSettings['photoQuality']);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.photoQualityError'));
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
        t('settingsScreen.alerts.biometricNotAvailable'),
        t('settingsScreen.alerts.biometricSetupRequired')
      );
      return;
    }

    if (enabled) {
      // Verify user can authenticate before enabling
      const result = await authService.authenticate();
      if (!result.success) {
        Alert.alert(t('settingsScreen.alerts.authFailed'), result.error || t('settingsScreen.alerts.authError'));
        return;
      }
    }

    try {
      await authService.setLockEnabled(enabled);
      setAppLockEnabled(enabled);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert(t('common.error'), t('settingsScreen.alerts.appLockError'));
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
        t('settingsScreen.alerts.exportTitle'),
        t('settingsScreen.alerts.exportMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settingsScreen.alerts.export'),
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
        Alert.alert(t('settingsScreen.alerts.exportFailed'), result.error || t('settingsScreen.alerts.unexpectedError'));
      }
    } catch (error) {
      Alert.alert(t('settingsScreen.alerts.exportFailed'), t('settingsScreen.alerts.unexpectedError'));
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
      t('settingsScreen.alerts.importTitle'),
      t('settingsScreen.alerts.importMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.alerts.chooseFile'),
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
          t('settingsScreen.alerts.importSuccess'),
          t('settingsScreen.alerts.importStats', {
            properties: result.stats.properties,
            rooms: result.stats.rooms,
            assets: result.stats.assets,
            expenses: result.stats.expenses,
            workers: result.stats.workers,
          })
        );
      } else if (!result.success && result.error !== 'No file selected') {
        Alert.alert(t('settingsScreen.alerts.importFailed'), result.error || t('settingsScreen.alerts.unexpectedError'));
      }
    } catch (error) {
      Alert.alert(t('settingsScreen.alerts.importFailed'), t('settingsScreen.alerts.unexpectedError'));
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
      Alert.alert(t('common.error'), t('settingsScreen.alerts.encryptionError'));
    }
  };

  const handleClearData = () => {
    Alert.alert(
      t('settingsScreen.alerts.clearDataTitle'),
      t('settingsScreen.alerts.clearDataMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.alerts.deleteEverything'),
          style: 'destructive',
          onPress: async () => {
            try {
              await backupService.clearAllData();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              Alert.alert(t('settingsScreen.alerts.success'), t('settingsScreen.alerts.dataCleared'));
            } catch (error) {
              Alert.alert(t('common.error'), t('settingsScreen.alerts.clearError'));
            }
          },
        },
      ]
    );
  };

  // Helper to get photo quality subtitle with recommendation
  const getPhotoQualitySubtitle = () => {
    const quality = settings?.photoQuality || 'high';
    const label = language === 'tr'
      ? t(`settingsScreen.photoQualityOptions.${quality}`)
      : getPhotoQualityLabel(quality);
    return quality === 'high' ? `${label} (${t('settingsScreen.recommended')})` : label;
  };

  // Support handlers
  const handleHelpSupport = () => {
    Alert.alert(
      t('settingsScreen.alerts.helpTitle'),
      t('settingsScreen.alerts.helpMessage'),
      [{ text: t('settingsScreen.alerts.gotIt'), style: 'default' }]
    );
  };

  const handleSendFeedback = () => {
    Alert.alert(
      t('settingsScreen.alerts.feedbackTitle'),
      t('settingsScreen.alerts.feedbackMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settingsScreen.alerts.reportBug'),
          onPress: () => {
            Alert.alert(
              t('settingsScreen.alerts.bugReportTitle'),
              t('settingsScreen.alerts.bugReportMessage'),
              [{ text: t('common.ok') }]
            );
          },
        },
        {
          text: t('settingsScreen.alerts.suggestFeature'),
          onPress: () => {
            Alert.alert(
              t('settingsScreen.alerts.featureRequestTitle'),
              t('settingsScreen.alerts.featureRequestMessage'),
              [{ text: t('common.ok') }]
            );
          },
        },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      t('settingsScreen.alerts.rateTitle'),
      t('settingsScreen.alerts.rateMessage'),
      [{ text: t('common.ok'), style: 'default' }]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      t('settingsScreen.alerts.privacyTitle'),
      t('settingsScreen.alerts.privacyMessage'),
      [{ text: t('common.ok') }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      t('settingsScreen.alerts.termsTitle'),
      t('settingsScreen.alerts.termsMessage'),
      [{ text: t('settingsScreen.alerts.iAgree') }]
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`px-5 pt-4 pb-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border-b`}>
        <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('settings.title')}</Text>
        <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('settingsScreen.subtitle')}</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Preferences Section */}
        <View className="mt-6">
          <Text className={`px-5 text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            {t('settingsScreen.preferences')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settings.language')}
              subtitle={SUPPORTED_LANGUAGES[language].nativeName}
              leftIcon={
                <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
                  <Globe size={18} color="#059669" />
                </View>
              }
              showChevron
              onPress={() => setShowLanguagePicker(true)}
            />
            <Divider className="ml-[68px]" />
            <ListItem
              title={t('settingsScreen.theme')}
              subtitle={getThemeLabel(themeMode)}
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
              title={t('settings.currency')}
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
              title={t('settingsScreen.dateFormat')}
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
              title={t('settingsScreen.photoQuality')}
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
            {t('settingsScreen.dataBackup')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settingsScreen.exportData')}
              subtitle={t('settingsScreen.exportSubtitle')}
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
              title={t('settingsScreen.importData')}
              subtitle={t('settingsScreen.importSubtitle')}
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
            {t('settingsScreen.security')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settingsScreen.appLock')}
              subtitle={
                biometricAvailable
                  ? t('settingsScreen.requireBiometric', { type: authService.getBiometricLabel(biometricType) })
                  : t('settingsScreen.biometricNotAvailable')
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
              title={t('settingsScreen.encryptExports')}
              subtitle={settings?.encryptExports ? t('settingsScreen.encryptOnSubtitle') : t('settingsScreen.encryptOffSubtitle')}
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
            {t('settingsScreen.support')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settingsScreen.helpSupport')}
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
              title={t('settingsScreen.sendFeedback')}
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
              title={t('settingsScreen.rateApp')}
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
            {t('settingsScreen.legal')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settingsScreen.privacyPolicy')}
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
              title={t('settingsScreen.termsOfService')}
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
            {t('settingsScreen.dangerZone')}
          </Text>
          <View className={isDark ? 'bg-slate-800' : 'bg-white'} style={SHADOWS.sm}>
            <ListItem
              title={t('settingsScreen.clearAllData')}
              subtitle={t('settingsScreen.clearDataSubtitle')}
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
              {t('settingsScreen.privacyNotice.title')}
            </Text>
          </View>
          <Text className={`text-sm leading-5 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
            {t('settingsScreen.privacyNotice.description')}
          </Text>
        </View>

        {/* App Info */}
        <View className="items-center mt-8 mb-4">
          <View className="w-14 h-14 rounded-2xl bg-primary-600 items-center justify-center mb-3">
            <Smartphone size={24} color="white" />
          </View>
          <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>HomeTrack</Text>
          <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Version 1.0.0</Text>
          <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('settingsScreen.appInfo.tagline')}</Text>
        </View>
      </ScrollView>

      {/* Language Picker Dialog */}
      <SelectDialog
        visible={showLanguagePicker}
        title={language === 'tr' ? 'Dil Seçin' : 'Choose Language'}
        message={language === 'tr' ? 'Tercih ettiğiniz dili seçin' : 'Select your preferred language'}
        options={languageOptions}
        cancelText={t('common.cancel')}
        onCancel={() => setShowLanguagePicker(false)}
        onSelect={handleLanguageSelect}
      />

      {/* Theme Picker Dialog */}
      <SelectDialog
        visible={showThemePicker}
        title={language === 'tr' ? 'Tema Seçin' : 'Choose Theme'}
        message={language === 'tr' ? 'Tercih ettiğiniz görünümü seçin' : 'Select your preferred appearance'}
        options={THEME_OPTIONS}
        cancelText={t('common.cancel')}
        onCancel={() => setShowThemePicker(false)}
        onSelect={handleThemeSelect}
      />

      {/* Currency Picker Dialog */}
      <SelectDialog
        visible={showCurrencyPicker}
        title={t('settingsScreen.dialogs.chooseCurrency')}
        message={t('settingsScreen.dialogs.currencyMessage')}
        options={CURRENCY_OPTIONS}
        cancelText={t('common.cancel')}
        onCancel={() => setShowCurrencyPicker(false)}
        onSelect={handleCurrencySelect}
      />

      {/* Date Format Picker Dialog */}
      <SelectDialog
        visible={showDateFormatPicker}
        title={t('settingsScreen.dialogs.chooseDateFormat')}
        message={t('settingsScreen.dialogs.dateFormatMessage')}
        options={DATE_FORMAT_OPTIONS.map(opt => ({
          label: `${opt.label} (${language === 'tr' ? opt.example.replace('Dec', 'Ara') : opt.example})`,
          value: opt.value,
        }))}
        cancelText={t('common.cancel')}
        onCancel={() => setShowDateFormatPicker(false)}
        onSelect={handleDateFormatSelect}
      />

      {/* Photo Quality Picker Dialog */}
      <SelectDialog
        visible={showPhotoQualityPicker}
        title={t('settingsScreen.dialogs.choosePhotoQuality')}
        message={t('settingsScreen.dialogs.photoQualityMessage')}
        options={PHOTO_QUALITY_OPTIONS.map(opt => ({
          label: language === 'tr'
            ? `${t(`settingsScreen.photoQualityOptions.${opt.value}`)} - ${t(`settingsScreen.photoQualityOptions.${opt.value}Desc`)}`
            : `${opt.label} - ${opt.description}`,
          value: opt.value,
        }))}
        cancelText={t('common.cancel')}
        onCancel={() => setShowPhotoQualityPicker(false)}
        onSelect={handlePhotoQualitySelect}
      />

      {/* Export Password Dialog */}
      <PasswordDialog
        visible={showExportPasswordDialog}
        title={t('settingsScreen.dialogs.encryptBackup')}
        message={t('settingsScreen.dialogs.encryptMessage')}
        placeholder={t('settingsScreen.dialogs.enterPassword')}
        confirmPlaceholder={t('settingsScreen.dialogs.confirmPassword')}
        requireConfirmation={true}
        minLength={4}
        cancelText={t('common.cancel')}
        confirmText={t('settingsScreen.dialogs.createBackup')}
        onCancel={() => setShowExportPasswordDialog(false)}
        onConfirm={handleExportPasswordConfirm}
      />

      {/* Import Password Dialog */}
      <PasswordDialog
        visible={showImportPasswordDialog}
        title={t('settingsScreen.dialogs.encryptedBackup')}
        message={t('settingsScreen.dialogs.encryptedBackupMessage')}
        placeholder={t('settingsScreen.dialogs.enterPassword')}
        requireConfirmation={false}
        minLength={1}
        cancelText={t('common.cancel')}
        confirmText={t('settingsScreen.dialogs.restore')}
        onCancel={() => setShowImportPasswordDialog(false)}
        onConfirm={handleImportPasswordConfirm}
      />
    </View>
  );
}
