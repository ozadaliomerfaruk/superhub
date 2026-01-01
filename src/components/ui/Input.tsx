import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  secureTextEntry,
  containerClassName = '',
  className = '',
  required = false,
  ...props
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  const [isFocused, setIsFocused] = useState(false);
  const { isDark } = useTheme();

  const hasError = !!error;

  return (
    <View className={containerClassName}>
      {label && (
        <View className="flex-row items-center mb-2">
          <Text className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {label}
          </Text>
          {required && (
            <Text className="text-sm text-red-500 ml-0.5">*</Text>
          )}
        </View>
      )}

      <View
        className={`
          flex-row items-center
          rounded-2xl
          border-2
          ${isDark ? 'bg-slate-800' : 'bg-slate-50'}
          ${isFocused ? `border-primary-500 ${isDark ? 'bg-slate-700' : 'bg-white'}` : 'border-transparent'}
          ${hasError ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        {leftIcon && (
          <View className="pl-4">
            {leftIcon}
          </View>
        )}

        <TextInput
          className={`
            flex-1 py-4 px-4
            text-base ${isDark ? 'text-white' : 'text-slate-900'}
            ${leftIcon ? 'pl-3' : ''}
            ${rightIcon || secureTextEntry ? 'pr-3' : ''}
            ${className}
          `}
          placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecure(!isSecure)}
            className="pr-4"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSecure ? (
              <EyeOff size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            ) : (
              <Eye size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            )}
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <View className="pr-4">
            {rightIcon}
          </View>
        )}
      </View>

      {(error || hint) && (
        <Text
          className={`
            text-sm mt-2
            ${hasError ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}
          `}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}

interface TextAreaProps extends Omit<TextInputProps, 'multiline'> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  required?: boolean;
  rows?: number;
}

export function TextArea({
  label,
  error,
  hint,
  containerClassName = '',
  className = '',
  required = false,
  rows = 4,
  ...props
}: TextAreaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { isDark } = useTheme();

  const hasError = !!error;
  const minHeight = rows * 24;

  return (
    <View className={containerClassName}>
      {label && (
        <View className="flex-row items-center mb-2">
          <Text className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {label}
          </Text>
          {required && (
            <Text className="text-sm text-red-500 ml-0.5">*</Text>
          )}
        </View>
      )}

      <View
        className={`
          rounded-2xl
          border-2
          ${isDark ? 'bg-slate-800' : 'bg-slate-50'}
          ${isFocused ? `border-primary-500 ${isDark ? 'bg-slate-700' : 'bg-white'}` : 'border-transparent'}
          ${hasError ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        <TextInput
          className={`
            py-4 px-4
            text-base ${isDark ? 'text-white' : 'text-slate-900'}
            ${className}
          `}
          style={{ minHeight, textAlignVertical: 'top' }}
          placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
          multiline
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>

      {(error || hint) && (
        <Text
          className={`
            text-sm mt-2
            ${hasError ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}
          `}
        >
          {error || hint}
        </Text>
      )}
    </View>
  );
}
