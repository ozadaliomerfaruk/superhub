import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { COLORS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface InputDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function InputDialog({
  visible,
  title,
  message,
  placeholder = '',
  defaultValue = '',
  cancelText = 'Cancel',
  confirmText = 'OK',
  onCancel,
  onConfirm,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const { isDark } = useTheme();

  useEffect(() => {
    if (visible) {
      setValue(defaultValue);
    }
  }, [visible, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
    setValue('');
  };

  const handleCancel = () => {
    onCancel();
    setValue('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View className="flex-1 bg-black/50 justify-center items-center px-8">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View
                className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                style={SHADOWS.xl}
              >
                {/* Header */}
                <View className="px-6 pt-6 pb-4">
                  <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {title}
                  </Text>
                  {message && (
                    <Text className={`text-sm text-center mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {message}
                    </Text>
                  )}
                </View>

                {/* Input */}
                <View className="px-6 pb-4">
                  <TextInput
                    value={value}
                    onChangeText={setValue}
                    placeholder={placeholder}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    autoFocus
                    className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                  />
                </View>

                {/* Buttons */}
                <View className={`flex-row border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    className={`flex-1 py-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-base font-medium text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className="flex-1 py-4"
                    activeOpacity={0.7}
                  >
                    <Text className="text-base font-semibold text-primary-600 text-center">
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface SelectDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  options: Array<{ label: string; value: string }>;
  cancelText?: string;
  onCancel: () => void;
  onSelect: (value: string) => void;
}

export function SelectDialog({
  visible,
  title,
  message,
  options,
  cancelText = 'Cancel',
  onCancel,
  onSelect,
}: SelectDialogProps) {
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/50 justify-center items-center px-8">
          <TouchableWithoutFeedback>
            <View
              className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
              style={SHADOWS.xl}
            >
              {/* Header */}
              <View className="px-6 pt-6 pb-4">
                <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {title}
                </Text>
                {message && (
                  <Text className={`text-sm text-center mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {message}
                  </Text>
                )}
              </View>

              {/* Options */}
              <View className="px-4 pb-4">
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => onSelect(option.value)}
                    className={`py-3 px-4 rounded-xl ${
                      index > 0 ? 'mt-2' : ''
                    } ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-base font-medium text-center ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Cancel Button */}
              <View className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <TouchableOpacity
                  onPress={onCancel}
                  className="py-4"
                  activeOpacity={0.7}
                >
                  <Text className={`text-base font-medium text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface PasswordDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  confirmPlaceholder?: string;
  requireConfirmation?: boolean;
  minLength?: number;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}

export function PasswordDialog({
  visible,
  title,
  message,
  placeholder = 'Enter password',
  confirmPlaceholder = 'Confirm password',
  requireConfirmation = true,
  minLength = 4,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
}: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (password.length < minLength) {
      setError(`Password must be at least ${minLength} characters`);
      return;
    }

    if (requireConfirmation && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onConfirm(password);
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleCancel = () => {
    onCancel();
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const isValid = password.length >= minLength && (!requireConfirmation || password === confirmPassword);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View className="flex-1 bg-black/50 justify-center items-center px-8">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View
                className={`rounded-2xl w-full max-w-sm overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                style={SHADOWS.xl}
              >
                {/* Header */}
                <View className="px-6 pt-6 pb-4 items-center">
                  <View className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-primary-900/40' : 'bg-primary-100'}`}>
                    <Lock size={28} color={COLORS.primary[600]} />
                  </View>
                  <Text className={`text-lg font-bold text-center ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {title}
                  </Text>
                  {message && (
                    <Text className={`text-sm text-center mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {message}
                    </Text>
                  )}
                </View>

                {/* Password Inputs */}
                <View className="px-6 pb-4 gap-3">
                  <View className="relative">
                    <TextInput
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setError(null);
                      }}
                      placeholder={placeholder}
                      placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                      secureTextEntry={!showPassword}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      className={`rounded-xl px-4 py-3 pr-12 text-base ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                      activeOpacity={0.7}
                    >
                      {showPassword ? (
                        <EyeOff size={22} color={COLORS.slate[500]} />
                      ) : (
                        <Eye size={22} color={COLORS.slate[500]} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {requireConfirmation && (
                    <View className="relative">
                      <TextInput
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          setError(null);
                        }}
                        placeholder={confirmPlaceholder}
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className={`rounded-xl px-4 py-3 pr-12 text-base ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3"
                        activeOpacity={0.7}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={22} color={COLORS.slate[500]} />
                        ) : (
                          <Eye size={22} color={COLORS.slate[500]} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {error && (
                    <Text className="text-sm text-red-500 text-center">
                      {error}
                    </Text>
                  )}

                  <Text className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Minimum {minLength} characters required
                  </Text>
                </View>

                {/* Buttons */}
                <View className={`flex-row border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    className={`flex-1 py-4 border-r ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`text-base font-medium text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleConfirm}
                    className={`flex-1 py-4 ${!isValid ? 'opacity-50' : ''}`}
                    activeOpacity={0.7}
                    disabled={!isValid}
                  >
                    <Text className={`text-base font-semibold text-center ${isValid ? 'text-primary-600' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
