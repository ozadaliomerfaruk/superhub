import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  X,
  Camera,
  Calendar,
  Wrench,
  Receipt,
  ShoppingBag,
  Settings,
  MoreHorizontal,
  Users,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { ExpenseType, Room, Worker } from '../../types';
import { expenseRepository, roomRepository, workerRepository } from '../../services/database';
import { Button, Input, IconButton } from '../../components/ui';
import { COLORS, EXPENSE_TYPES, BILL_CATEGORIES } from '../../constants/theme';
import { getCurrencySymbol } from '../../utils/currency';
import { formatDateObjectWithDay } from '../../utils/date';
import { useToast, useTranslation } from '../../contexts';
import { getImageQuality } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditExpenseRouteProp = RouteProp<RootStackParamList, 'EditExpense'>;

type ExpenseTypeOption = {
  value: ExpenseType;
  label: string;
  color: string;
  Icon: typeof Wrench;
};

const getExpenseTypes = (t: any): ExpenseTypeOption[] => [
  { value: 'repair', label: t('expense.types.repair'), color: EXPENSE_TYPES.repair.color, Icon: Wrench },
  { value: 'bill', label: t('expense.types.bill'), color: EXPENSE_TYPES.bill.color, Icon: Receipt },
  { value: 'maintenance', label: t('expense.types.maintenance'), color: EXPENSE_TYPES.maintenance.color, Icon: Settings },
  { value: 'purchase', label: t('expense.types.purchase'), color: EXPENSE_TYPES.purchase.color, Icon: ShoppingBag },
  { value: 'other', label: t('expense.types.other'), color: EXPENSE_TYPES.other.color, Icon: MoreHorizontal },
];

const categoryOptions: Record<ExpenseType, string[]> = {
  repair: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Roof', 'Other'],
  bill: BILL_CATEGORIES as unknown as string[],
  maintenance: ['HVAC Service', 'Lawn Care', 'Pool Service', 'Pest Control', 'Cleaning', 'Other'],
  purchase: ['Appliance', 'Furniture', 'Tools', 'Supplies', 'Decor', 'Other'],
  other: ['Other'],
};

export function EditExpenseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditExpenseRouteProp>();
  const insets = useSafeAreaInsets();
  const { expenseId } = route.params;
  const { t } = useTranslation();

  const [type, setType] = useState<ExpenseType>('repair');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>();
  const [propertyId, setPropertyId] = useState<string>('');
  const [originalWorkerId, setOriginalWorkerId] = useState<string | undefined>();
  const [originalAmount, setOriginalAmount] = useState(0);

  // Date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  useEffect(() => {
    loadExpense();
  }, [expenseId]);

  const loadExpense = async () => {
    try {
      const expense = await expenseRepository.getById(expenseId);
      if (expense) {
        setType(expense.type);
        setCategory(expense.category);
        setAmount(expense.amount.toString());
        setDescription(expense.description);
        setDate(new Date(expense.date));
        setReceiptUri(expense.receiptUri);
        setSelectedRoomId(expense.roomId);
        setSelectedWorkerId(expense.workerId);
        setPropertyId(expense.propertyId);
        setOriginalWorkerId(expense.workerId);
        setOriginalAmount(expense.amount);

        // Load rooms and workers
        const [roomsData, workersData] = await Promise.all([
          roomRepository.getByPropertyId(expense.propertyId),
          workerRepository.getAll(),
        ]);
        setRooms(roomsData);
        setWorkers(workersData);
      }
    } catch (error) {
      console.error('Failed to load expense:', error);
      Alert.alert(t('common.error'), t('expense.loadError'));
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
  };

  const handlePickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeeded'), t('common.photoLibraryPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeeded'), t('common.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert(t('common.required'), t('common.validAmount'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('common.required'), t('expense.descriptionRequired'));
      return;
    }

    setLoading(true);

    try {
      const newAmount = parseFloat(amount);

      await expenseRepository.update(expenseId, {
        roomId: selectedRoomId,
        workerId: selectedWorkerId,
        type,
        category,
        amount: newAmount,
        date: date.toISOString(),
        description: description.trim(),
        receiptUri,
      });

      // Update worker's total paid if worker changed
      if (originalWorkerId !== selectedWorkerId || originalAmount !== newAmount) {
        // Subtract from original worker
        if (originalWorkerId) {
          await workerRepository.updateTotalPaid(originalWorkerId, -originalAmount);
        }
        // Add to new worker
        if (selectedWorkerId) {
          await workerRepository.updateTotalPaid(selectedWorkerId, newAmount);
        }
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to update expense:', error);
      Alert.alert(t('common.error'), t('expense.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const renderTypeButton = (item: ExpenseTypeOption) => {
    const isSelected = type === item.value;
    const IconComponent = item.Icon;

    return (
      <TouchableOpacity
        key={item.value}
        onPress={() => setType(item.value)}
        activeOpacity={0.7}
        className={`flex-1 items-center py-3 rounded-xl border-2 ${
          isSelected ? 'border-primary-500' : 'border-slate-200'
        }`}
        style={isSelected ? { backgroundColor: COLORS.primary[50] } : { backgroundColor: '#fff' }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mb-1.5"
          style={{ backgroundColor: item.color + '20' }}
        >
          <IconComponent size={20} color={item.color} />
        </View>
        <Text
          className={`text-xs font-semibold ${
            isSelected ? 'text-primary-700' : 'text-slate-600'
          }`}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (initialLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-slate-500">{t('common.loading')}</Text>
      </View>
    );
  }

  const currentCategories = categoryOptions[type];
  const expenseTypes = getExpenseTypes(t);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
        <IconButton
          icon={<X size={22} color={COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className="text-lg font-bold text-slate-900">{t('expense.edit')}</Text>
        <Button
          title={t('common.save')}
          variant="primary"
          size="sm"
          loading={loading}
          onPress={handleSave}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount Section */}
          <View className="bg-primary-50 rounded-2xl p-5 mb-5 items-center">
            <Text className="text-sm font-medium text-primary-700 mb-2">{t('expense.amount')}</Text>
            <View className="flex-row items-center">
              <Text className="text-3xl font-bold text-primary-700">{getCurrencySymbol()}</Text>
              <Input
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                containerClassName="flex-1 ml-1"
                className="text-3xl font-bold text-primary-700 bg-transparent border-0 text-center"
              />
            </View>
          </View>

          {/* Expense Type */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-3">{t('expense.type')}</Text>
            <View className="flex-row gap-2">
              {expenseTypes.map(renderTypeButton)}
            </View>
          </View>

          {/* Category */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-2">{t('expense.category')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {currentCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    category === cat
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      category === cat ? 'text-primary-700' : 'text-slate-700'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <Input
            label={t('expense.description')}
            placeholder={t('expense.descriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            containerClassName="mb-4"
            required
          />

          {/* Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">{t('expense.date')}</Text>
            <TouchableOpacity
              onPress={() => {
                setTempDate(date);
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
              className="bg-white rounded-xl px-4 py-3.5 border border-slate-200 flex-row items-center"
            >
              <Calendar size={18} color={COLORS.slate[500]} />
              <Text className="text-base text-slate-700 ml-3">
                {formatDateObjectWithDay(date)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Room Selection */}
          {rooms.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">{t('common.room')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <TouchableOpacity
                  onPress={() => setSelectedRoomId(undefined)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    !selectedRoomId ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedRoomId ? 'text-primary-700' : 'text-slate-700'
                    }`}
                  >
                    {t('common.noRoom')}
                  </Text>
                </TouchableOpacity>
                {rooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    onPress={() => setSelectedRoomId(room.id)}
                    activeOpacity={0.7}
                    className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                      selectedRoomId === room.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedRoomId === room.id ? 'text-primary-700' : 'text-slate-700'
                      }`}
                    >
                      {room.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Worker Selection */}
          {workers.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Users size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-medium text-slate-700 ml-1.5">
                  {t('common.worker')}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <TouchableOpacity
                  onPress={() => setSelectedWorkerId(undefined)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    !selectedWorkerId ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedWorkerId ? 'text-primary-700' : 'text-slate-700'
                    }`}
                  >
                    {t('common.noWorker')}
                  </Text>
                </TouchableOpacity>
                {workers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() => setSelectedWorkerId(worker.id)}
                    activeOpacity={0.7}
                    className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                      selectedWorkerId === worker.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedWorkerId === worker.id ? 'text-primary-700' : 'text-slate-700'
                      }`}
                    >
                      {worker.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Receipt */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">{t('expense.receipt')}</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePickReceipt}
                activeOpacity={0.8}
                className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 items-center justify-center border-2 border-dashed border-slate-300"
              >
                {receiptUri ? (
                  <Image
                    source={{ uri: receiptUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center">
                    <Receipt size={24} color={COLORS.slate[400]} />
                    <Text className="text-xs text-slate-500 mt-1">{t('common.add')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View className="ml-3 gap-2">
                <Button
                  title={receiptUri ? t('common.change') : t('common.choose')}
                  variant="outline"
                  size="sm"
                  onPress={handlePickReceipt}
                />
                <Button
                  title={t('common.camera')}
                  variant="outline"
                  size="sm"
                  icon={<Camera size={14} color={COLORS.slate[700]} />}
                  onPress={handleTakePhoto}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text className="text-base text-slate-600">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-slate-900">{t('common.selectDate')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text className="text-base font-semibold text-primary-600">{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                if (selectedDate) setTempDate(selectedDate);
              }}
              style={{ height: 200 }}
              textColor="#1e293b"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
