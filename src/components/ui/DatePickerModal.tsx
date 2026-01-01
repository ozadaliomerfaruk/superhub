import React from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme, useTranslation } from '../../contexts';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  title?: string;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function DatePickerModal({
  visible,
  value,
  title,
  mode = 'date',
  minimumDate,
  maximumDate,
  onChange,
  onClose,
  onConfirm,
}: DatePickerModalProps) {
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date) {
      onChange(date);
    }
  };

  // Text color based on theme - fixes visibility in both light and dark modes
  const textColor = isDark ? '#ffffff' : '#1e293b';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
          {/* Header */}
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <TouchableOpacity onPress={onClose}>
              <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            {title && (
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </Text>
            )}
            <TouchableOpacity onPress={onConfirm}>
              <Text className="text-base font-semibold text-primary-600">
                {t('common.done')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* DateTimePicker */}
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            textColor={textColor}
            style={{ height: 200 }}
          />
        </View>
      </View>
    </Modal>
  );
}
