import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Receipt,
  Plus,
  Trash2,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  DollarSign,
  Calendar,
  Repeat,
  History,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { RecurringTemplateWithHistory, RecurringPaymentHistory, Property } from '../../types';
import { recurringTemplateRepository, recurringPaymentHistoryRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type BillTemplatesRouteProp = RouteProp<RootStackParamList, 'BillTemplates'>;

const FREQUENCIES: Array<{ value: RecurringTemplateWithHistory['frequency']; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const CATEGORIES = [
  'Electricity',
  'Water',
  'Gas',
  'Internet',
  'Phone',
  'Insurance',
  'HOA',
  'Property Tax',
  'Lawn Care',
  'Pest Control',
  'Security',
  'Streaming',
  'Rent',
  'Mortgage',
  'Other',
];

const TYPICAL_PAYMENT_DAYS = [
  '1st of month',
  '5th of month',
  '10th of month',
  '15th of month',
  '20th of month',
  '25th of month',
  'End of month',
  'Beginning of quarter',
  'End of quarter',
  'Beginning of year',
  'End of year',
];

export function BillTemplatesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BillTemplatesRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [templates, setTemplates] = useState<RecurringTemplateWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplateWithHistory | null>(null);

  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RecurringTemplateWithHistory | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<RecurringPaymentHistory[]>([]);

  // Add payment modal state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringTemplateWithHistory['frequency']>('monthly');
  const [formTypicalPaymentDay, setFormTypicalPaymentDay] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [propertyData, templatesData] = await Promise.all([
        propertyRepository.getById(propertyId),
        recurringTemplateRepository.getByPropertyIdWithHistory(propertyId),
      ]);
      setProperty(propertyData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load recurring payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory('');
    setFormFrequency('monthly');
    setFormTypicalPaymentDay('');
    setShowFormModal(false);
    setEditingTemplate(null);
  };

  const populateFormForEdit = (template: RecurringTemplateWithHistory) => {
    setFormName(template.name);
    setFormCategory(template.category);
    setFormFrequency(template.frequency);
    setFormTypicalPaymentDay(template.typicalPaymentDay || '');
    setEditingTemplate(template);
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!formCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      const data = {
        name: formName.trim(),
        category: formCategory,
        frequency: formFrequency,
        typicalPaymentDay: formTypicalPaymentDay || undefined,
        isActive: true,
      };

      if (editingTemplate) {
        await recurringTemplateRepository.update(editingTemplate.id, data);
      } else {
        await recurringTemplateRepository.create({
          ...data,
          propertyId,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', 'Failed to save recurring payment');
    }
  };

  const handleToggleActive = async (template: RecurringTemplateWithHistory) => {
    try {
      await recurringTemplateRepository.toggleActive(template.id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData();
      // Update selected template if it's the one being toggled
      if (selectedTemplate?.id === template.id) {
        const updated = await recurringTemplateRepository.getByIdWithHistory(template.id);
        if (updated) setSelectedTemplate(updated);
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
      Alert.alert('Error', 'Failed to update');
    }
  };

  const handleDelete = (template: RecurringTemplateWithHistory) => {
    Alert.alert(
      'Delete Recurring Payment',
      `Are you sure you want to delete "${template.name}"? This will also delete all payment history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await recurringTemplateRepository.delete(template.id);
              setShowDetailModal(false);
              setSelectedTemplate(null);
              loadData();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const handleOpenDetail = async (template: RecurringTemplateWithHistory) => {
    setSelectedTemplate(template);
    try {
      const history = await recurringPaymentHistoryRepository.getByTemplateId(template.id);
      setPaymentHistory(history);
    } catch (error) {
      console.error('Failed to load history:', error);
      setPaymentHistory([]);
    }
    setShowDetailModal(true);
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!selectedTemplate) {
      Alert.alert('Error', 'No template selected');
      return;
    }

    try {
      await recurringPaymentHistoryRepository.create({
        templateId: selectedTemplate.id,
        amount: parseFloat(paymentAmount),
        paidDate: paymentDate.toISOString(),
        notes: paymentNotes.trim() || undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload history and template
      const [history, updated] = await Promise.all([
        recurringPaymentHistoryRepository.getByTemplateId(selectedTemplate.id),
        recurringTemplateRepository.getByIdWithHistory(selectedTemplate.id),
      ]);
      setPaymentHistory(history);
      if (updated) setSelectedTemplate(updated);

      // Reset form
      setPaymentAmount('');
      setPaymentDate(new Date());
      setPaymentNotes('');
      setShowAddPaymentModal(false);

      // Re-open detail modal after a delay
      setTimeout(() => setShowDetailModal(true), 300);

      loadData(); // Refresh main list
    } catch (error: any) {
      console.error('Failed to add payment:', error);
      Alert.alert('Error', `Failed to record payment: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeletePayment = (payment: RecurringPaymentHistory) => {
    Alert.alert(
      'Delete Payment Record',
      'Are you sure you want to delete this payment record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await recurringPaymentHistoryRepository.delete(payment.id);
              if (selectedTemplate) {
                const [history, updated] = await Promise.all([
                  recurringPaymentHistoryRepository.getByTemplateId(selectedTemplate.id),
                  recurringTemplateRepository.getByIdWithHistory(selectedTemplate.id),
                ]);
                setPaymentHistory(history);
                if (updated) setSelectedTemplate(updated);
              }
              loadData();
            } catch (error) {
              console.error('Failed to delete payment:', error);
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPaymentDate(selectedDate);
    }
  };

  const getFrequencyLabel = (freq: RecurringTemplateWithHistory['frequency']) => {
    return FREQUENCIES.find((f) => f.value === freq)?.label || freq;
  };

  const activeCount = templates.filter(t => t.isActive).length;
  const inactiveCount = templates.filter(t => !t.isActive).length;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Recurring Payments"
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowFormModal(true)}
            className="w-10 h-10 rounded-xl bg-primary-500 items-center justify-center"
            activeOpacity={0.7}
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Summary */}
        <View className="px-5 pt-5">
          <View className="flex-row gap-3">
            <Card variant="filled" padding="md" className={`flex-1 ${isDark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-100'} border`}>
              <Text className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>{activeCount}</Text>
              <Text className={`text-xs mt-0.5 ${isDark ? 'text-green-500' : 'text-green-600'}`}>Active</Text>
            </Card>
            <Card variant="filled" padding="md" className={`flex-1 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border`}>
              <Text className={`text-2xl font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{inactiveCount}</Text>
              <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Inactive</Text>
            </Card>
            <Card variant="filled" padding="md" className={`flex-1 ${isDark ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-100'} border`}>
              <Text className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>{templates.length}</Text>
              <Text className={`text-xs mt-0.5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>Total</Text>
            </Card>
          </View>
        </View>

        {/* Templates List */}
        {templates.length === 0 ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Receipt size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No recurring payments
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track your regular bills and payments here
                </Text>
                <Button
                  title="Add First Payment"
                  onPress={() => setShowFormModal(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-3 pb-8">
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => handleOpenDetail(template)}
                activeOpacity={0.7}
              >
                <Card variant="default" padding="none">
                  <View className="p-4">
                    <View className="flex-row items-start">
                      <View
                        className={`w-12 h-12 rounded-xl items-center justify-center ${
                          template.isActive
                            ? isDark ? 'bg-primary-900/40' : 'bg-primary-50'
                            : isDark ? 'bg-slate-700' : 'bg-slate-100'
                        }`}
                      >
                        <Receipt
                          size={24}
                          color={template.isActive ? COLORS.primary[600] : isDark ? COLORS.slate[500] : COLORS.slate[400]}
                        />
                      </View>

                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text
                            className={`text-base font-semibold ${
                              template.isActive
                                ? isDark ? 'text-white' : 'text-slate-900'
                                : isDark ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {template.name}
                          </Text>
                          {!template.isActive && (
                            <Badge label="Inactive" variant="default" size="sm" className="ml-2" />
                          )}
                        </View>

                        <View className="flex-row items-center mt-1 gap-3">
                          <View className="flex-row items-center">
                            <Repeat size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {getFrequencyLabel(template.frequency)}
                            </Text>
                          </View>
                          {template.typicalPaymentDay && (
                            <View className="flex-row items-center">
                              <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                              <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {template.typicalPaymentDay}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View className="flex-row items-center mt-2 gap-2">
                          <Badge label={template.category} variant="info" size="sm" />
                          {template.paymentCount > 0 && (
                            <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isDark ? 'bg-green-900/40' : 'bg-green-50'}`}>
                              <History size={10} color={COLORS.success} />
                              <Text className={`text-xs ml-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                                {template.paymentCount} payment{template.paymentCount !== 1 ? 's' : ''}
                              </Text>
                            </View>
                          )}
                        </View>

                        {template.lastPaymentDate && (
                          <Text className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Last paid: {formatDate(template.lastPaymentDate)}
                            {template.lastPaymentAmount && ` - ${formatCurrency(template.lastPaymentAmount)}`}
                          </Text>
                        )}
                      </View>

                      <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[300]} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetForm}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {editingTemplate ? 'Edit Payment' : 'New Recurring Payment'}
            </Text>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
              <Check size={24} color={COLORS.primary[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            <View className="gap-5 pb-10">
              {/* Name */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Name *</Text>
                <TextInput
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="e.g., Electric Bill, Netflix"
                  className={`border rounded-xl px-4 py-3.5 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                />
              </View>

              {/* Category */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setFormCategory(cat)}
                      className={`px-4 py-2.5 rounded-full ${
                        formCategory === cat
                          ? 'bg-primary-500'
                          : isDark ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          formCategory === cat ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Frequency */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Frequency *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {FREQUENCIES.map((freq) => (
                    <TouchableOpacity
                      key={freq.value}
                      onPress={() => setFormFrequency(freq.value)}
                      className={`px-4 py-2.5 rounded-xl ${
                        formFrequency === freq.value
                          ? 'bg-primary-500'
                          : isDark ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          formFrequency === freq.value ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {freq.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Typical Payment Day */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Typical Payment Day (optional)</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {TYPICAL_PAYMENT_DAYS.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setFormTypicalPaymentDay(formTypicalPaymentDay === day ? '' : day)}
                      className={`px-4 py-2.5 rounded-full ${
                        formTypicalPaymentDay === day
                          ? 'bg-amber-500'
                          : isDark ? 'bg-slate-700 border border-slate-600' : 'bg-white border border-slate-200'
                      }`}
                      activeOpacity={0.7}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          formTypicalPaymentDay === day ? 'text-white' : isDark ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Details</Text>
            <View className="w-6" />
          </View>

          {selectedTemplate && (
            <ScrollView className="flex-1">
              {/* Header Info */}
              <View className={`px-5 py-5 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                <View className="flex-row items-center">
                  <View className={`w-14 h-14 rounded-xl items-center justify-center ${
                    selectedTemplate.isActive
                      ? isDark ? 'bg-primary-900/40' : 'bg-primary-50'
                      : isDark ? 'bg-slate-700' : 'bg-slate-100'
                  }`}>
                    <Receipt size={28} color={selectedTemplate.isActive ? COLORS.primary[600] : isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  </View>
                  <View className="flex-1 ml-4">
                    <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedTemplate.name}</Text>
                    <View className="flex-row items-center mt-1 gap-2">
                      <Badge label={selectedTemplate.category} variant="info" size="sm" />
                      <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getFrequencyLabel(selectedTemplate.frequency)}</Text>
                    </View>
                  </View>
                </View>

                {selectedTemplate.typicalPaymentDay && (
                  <View className={`flex-row items-center mt-4 px-3 py-2 rounded-lg ${isDark ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                    <Clock size={16} color={COLORS.warning} />
                    <Text className={`text-sm ml-2 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Usually paid: {selectedTemplate.typicalPaymentDay}
                    </Text>
                  </View>
                )}

                {/* Actions */}
                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    onPress={() => handleToggleActive(selectedTemplate)}
                    className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                      selectedTemplate.isActive
                        ? isDark ? 'bg-green-900/30' : 'bg-green-50'
                        : isDark ? 'bg-slate-700' : 'bg-slate-100'
                    }`}
                    activeOpacity={0.7}
                  >
                    {selectedTemplate.isActive ? (
                      <>
                        <ToggleRight size={20} color={COLORS.success} />
                        <Text className={`text-sm font-semibold ml-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>Active</Text>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                        <Text className={`text-sm font-semibold ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Inactive</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowDetailModal(false);
                      setTimeout(() => populateFormForEdit(selectedTemplate), 300);
                    }}
                    className={`px-5 py-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(selectedTemplate)}
                    className={`px-5 py-3 rounded-xl ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Add Payment Button */}
              <View className="px-5 py-4">
                <Button
                  title="Record Payment"
                  onPress={() => {
                    setShowDetailModal(false);
                    setTimeout(() => setShowAddPaymentModal(true), 300);
                  }}
                  variant="primary"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>

              {/* Payment History */}
              <View className="px-5 pb-8">
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Payment History ({paymentHistory.length})
                </Text>

                {paymentHistory.length === 0 ? (
                  <Card variant="filled" padding="lg">
                    <View className="items-center py-4">
                      <History size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                      <Text className={`font-medium mt-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No payments recorded</Text>
                      <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Record your first payment to start tracking
                      </Text>
                    </View>
                  </Card>
                ) : (
                  <View className="gap-2">
                    {paymentHistory.map((payment) => (
                      <Card key={payment.id} variant="default" padding="md">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {formatCurrency(payment.amount)}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                              <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatDate(payment.paidDate)}
                              </Text>
                            </View>
                            {payment.notes && (
                              <Text className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{payment.notes}</Text>
                            )}
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeletePayment(payment)}
                            className="p-2"
                            activeOpacity={0.7}
                          >
                            <Trash2 size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          </TouchableOpacity>
                        </View>
                      </Card>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        visible={showAddPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddPaymentModal(false);
          setTimeout(() => setShowDetailModal(true), 300);
        }}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity
              onPress={() => {
                setShowAddPaymentModal(false);
                setTimeout(() => setShowDetailModal(true), 300);
              }}
              activeOpacity={0.7}
            >
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Record Payment</Text>
            <TouchableOpacity onPress={handleAddPayment} activeOpacity={0.7}>
              <Check size={24} color={COLORS.primary[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            <View className="gap-5">
              {/* Amount */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount Paid *</Text>
                <View className={`flex-row items-center border rounded-xl px-4 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <DollarSign size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <TextInput
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`flex-1 py-3.5 pl-2 text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>
              </View>

              {/* Date */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Payment Date *</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className={`border rounded-xl px-4 py-3.5 flex-row items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                  activeOpacity={0.7}
                >
                  <Calendar size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-base ml-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(paymentDate.toISOString())}
                  </Text>
                </TouchableOpacity>

                {(showDatePicker || Platform.OS === 'ios') && (
                  <View className={Platform.OS === 'ios' ? 'mt-2' : ''}>
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={paymentDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                    ) : showDatePicker && (
                      <DateTimePicker
                        value={paymentDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Notes */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Notes (optional)</Text>
                <TextInput
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  placeholder="Any additional notes..."
                  multiline
                  numberOfLines={3}
                  className={`border rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
