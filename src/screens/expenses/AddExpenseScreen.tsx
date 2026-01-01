import React, { useState, useEffect, useCallback } from 'react';
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
  Check,
  Calendar,
  DollarSign,
  Wrench,
  Receipt,
  ShoppingBag,
  Settings,
  MoreHorizontal,
  Users,
  Package,
  ChevronRight,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { ExpenseType, Room, Worker, Asset } from '../../types';
import { expenseRepository, roomRepository, workerRepository, assetRepository, expenseAssetRepository } from '../../services/database';
import { Button, Input, IconButton, TextArea, AssetSelectionModal, SelectedAsset } from '../../components/ui';
import { COLORS, EXPENSE_TYPES, BILL_CATEGORIES, SHADOWS } from '../../constants/theme';
import { useToast, useTranslation, useTheme } from '../../contexts';
import { validateAmount, parseAmount } from '../../utils/validation';
import { getImageQuality } from '../../utils/image';
import { getCurrencySymbol, formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../../utils/currency';
import { formatDateObjectWithDay } from '../../utils/date';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

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

// Category keys for each expense type
const categoryKeys: Record<ExpenseType, string[]> = {
  repair: ['plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'roof', 'other'],
  bill: ['electricity', 'water', 'gas', 'internet', 'phone', 'insurance', 'hoa', 'propertyTax', 'lawnCare', 'pestControl', 'security', 'streaming', 'rent', 'mortgage', 'other'],
  maintenance: ['hvacService', 'lawnCare', 'poolService', 'pestControl', 'cleaning', 'other'],
  purchase: ['appliance', 'furniture', 'tools', 'supplies', 'decor', 'other'],
  other: ['other'],
};

// Get translated categories
const getCategoryOptions = (type: ExpenseType, t: (key: string) => string): { key: string; label: string }[] => {
  const keys = categoryKeys[type];
  if (type === 'bill') {
    return keys.map(key => ({
      key,
      label: t(`bills.categories.${key}`),
    }));
  } else if (type === 'other') {
    return [{ key: 'other', label: t('expense.types.other') }];
  }
  return keys.map(key => ({
    key,
    label: t(`expense.categories.${type}.${key}`),
  }));
};

export function AddExpenseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const [type, setType] = useState<ExpenseType>('repair');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [receiptUri, setReceiptUri] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(route.params.roomId);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(route.params.workerId);
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);

  // Date picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [showAssetModal, setShowAssetModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [roomsData, workersData, assetsData] = await Promise.all([
        roomRepository.getByPropertyId(route.params.propertyId),
        workerRepository.getAll(),
        assetRepository.getByPropertyId(route.params.propertyId),
      ]);
      setRooms(roomsData);
      setWorkers(workersData);
      setAssets(assetsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, [route.params.propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    // Reset category when type changes, or set initial category
    const categories = getCategoryOptions(type, t);
    const categoryKeysList = categories.map(c => c.key);
    if (categories.length > 0 && (!category || !categoryKeysList.includes(category))) {
      setCategory(categories[0].key);
    }
  }, [type, category, t]);

  const handlePickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionNeeded'), t('common.photoLibraryPermission'));
      return;
    }

    const quality = await getImageQuality();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality,
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

    const quality = await getImageQuality();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  // Handle amount input with currency formatting
  const handleAmountChange = (value: string) => {
    // Keep raw digits for storage
    const rawValue = value.replace(/[^\d.,]/g, '');
    setAmount(rawValue);

    // Format for display
    const formatted = formatCurrencyInput(rawValue);
    setDisplayAmount(formatted);
  };

  const handleSave = async () => {
    // Parse amount from formatted display value
    const parsedAmount = parseCurrencyInput(displayAmount);

    // Validate amount
    if (parsedAmount <= 0) {
      Alert.alert(t('common.invalidAmount'), t('common.amountGreaterThanZero'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('common.required'), t('expense.descriptionRequired'));
      return;
    }

    // Validate asset amounts don't exceed total
    const totalAssetAmount = selectedAssets.reduce((sum, a) => sum + a.amount, 0);
    if (totalAssetAmount > parsedAmount) {
      Alert.alert(
        t('common.invalidAssetAmounts'),
        `${t('common.assetAmountsExceed')} (${formatCurrency(totalAssetAmount)}) ${t('common.totalExpenseAmount')} (${formatCurrency(parsedAmount)})`
      );
      return;
    }

    setLoading(true);

    try {
      const expense = await expenseRepository.create({
        propertyId: route.params.propertyId,
        roomId: selectedRoomId,
        assetId: route.params.assetId,
        workerId: selectedWorkerId,
        type,
        category,
        amount: parsedAmount,
        date: date.toISOString(),
        description: description.trim(),
        receiptUri,
        isRecurring: false,
        tags: [],
      });

      // Save asset associations if any
      if (selectedAssets.length > 0) {
        await expenseAssetRepository.createMany(expense.id, selectedAssets);
      }

      // Update worker's total paid if worker is selected
      if (selectedWorkerId) {
        await workerRepository.updateTotalPaid(selectedWorkerId, parsedAmount);
      }

      showSuccess(t('expense.addSuccess'));
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create expense:', error);
      showError(t('expense.addError'));
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
          isSelected ? 'border-primary-500' : isDark ? 'border-slate-700' : 'border-slate-200'
        }`}
        style={isSelected ? { backgroundColor: isDark ? COLORS.primary[900] + '40' : COLORS.primary[50] } : { backgroundColor: isDark ? COLORS.slate[800] : '#fff' }}
      >
        <View
          className="w-10 h-10 rounded-full items-center justify-center mb-1.5"
          style={{ backgroundColor: item.color + '20' }}
        >
          <IconComponent size={20} color={item.color} />
        </View>
        <Text
          className={`text-xs font-semibold ${
            isSelected ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const currentCategories = getCategoryOptions(type, t);
  const expenseTypes = getExpenseTypes(t);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <IconButton
          icon={<X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('expense.add')}</Text>
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
          <View className={`rounded-2xl p-5 mb-5 items-center ${isDark ? 'bg-primary-900/40' : 'bg-primary-50'}`}>
            <Text className="text-sm font-medium text-primary-700 mb-2">{t('expense.amount')}</Text>
            <View className="flex-row items-center">
              <Text className="text-3xl font-bold text-primary-700">{getCurrencySymbol()}</Text>
              <Input
                placeholder="0,00"
                value={displayAmount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                containerClassName="flex-1 ml-1"
                className="text-3xl font-bold text-primary-700 bg-transparent border-0 text-center"
              />
            </View>
          </View>

          {/* Expense Type */}
          <View className="mb-5">
            <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('expense.type')}</Text>
            <View className="flex-row gap-2">
              {expenseTypes.map(renderTypeButton)}
            </View>
          </View>

          {/* Category */}
          <View className="mb-5">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('expense.category')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
            >
              {currentCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    category === cat.key
                      ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                      : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      category === cat.key ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {cat.label}
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
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('expense.date')}</Text>
            <TouchableOpacity
              onPress={() => {
                setTempDate(date);
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
              className={`rounded-xl px-4 py-3.5 border flex-row items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              <Calendar size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
              <Text className={`text-base ml-3 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {formatDateObjectWithDay(date)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Room Selection */}
          {rooms.length > 0 && (
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('common.roomOptional')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <TouchableOpacity
                  onPress={() => setSelectedRoomId(undefined)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    !selectedRoomId
                      ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                      : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedRoomId ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
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
                        ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                        : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedRoomId === room.id ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
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
                <Users size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('common.workerOptional')}
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
                    !selectedWorkerId
                      ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                      : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedWorkerId ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
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
                        ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                        : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        selectedWorkerId === worker.id ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {worker.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Asset Selection */}
          {assets.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Package size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('common.relatedAssetsOptional')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAssetModal(true)}
                activeOpacity={0.7}
                className={`rounded-xl px-4 py-3.5 border flex-row items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                {selectedAssets.length > 0 ? (
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-base ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {selectedAssets.length} {t('common.assetSelected', { count: selectedAssets.length })}
                      </Text>
                      <Text className="text-sm font-semibold text-primary-600">
                        {formatCurrency(selectedAssets.reduce((sum, a) => sum + a.amount, 0))}
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap mt-1.5 gap-1">
                      {selectedAssets.slice(0, 3).map((selected) => {
                        const asset = assets.find((a) => a.id === selected.assetId);
                        return asset ? (
                          <View
                            key={selected.assetId}
                            className={`rounded-lg px-2 py-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                          >
                            <Text className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {asset.name}: {formatCurrency(selected.amount)}
                            </Text>
                          </View>
                        ) : null;
                      })}
                      {selectedAssets.length > 3 && (
                        <View className={`rounded-lg px-2 py-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Text className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            +{selectedAssets.length - 3} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    <Package size={18} color={COLORS.slate[400]} />
                    <Text className={`text-base ml-3 flex-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('common.selectAssets')}
                    </Text>
                  </>
                )}
                <ChevronRight size={18} color={COLORS.slate[400]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Receipt */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('expense.receiptOptional')}</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePickReceipt}
                activeOpacity={0.8}
                className={`w-20 h-20 rounded-xl overflow-hidden items-center justify-center border-2 border-dashed ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-slate-100 border-slate-300'}`}
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
                    <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.add')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {receiptUri && (
                <View className="ml-3 gap-2">
                  <Button
                    title={t('common.change')}
                    variant="outline"
                    size="sm"
                    onPress={handlePickReceipt}
                  />
                  <Button
                    title={t('common.camera')}
                    variant="outline"
                    size="sm"
                    icon={<Camera size={14} color={isDark ? COLORS.slate[300] : COLORS.slate[700]} />}
                    onPress={handleTakePhoto}
                  />
                </View>
              )}

              {!receiptUri && (
                <Button
                  title={t('common.takePhoto')}
                  variant="outline"
                  size="sm"
                  icon={<Camera size={14} color={isDark ? COLORS.slate[300] : COLORS.slate[700]} />}
                  onPress={handleTakePhoto}
                  className="ml-3"
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('common.selectDate')}</Text>
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
              textColor={isDark ? '#fff' : '#1e293b'}
            />
          </View>
        </View>
      </Modal>

      {/* Asset Selection Modal */}
      <AssetSelectionModal
        visible={showAssetModal}
        assets={assets}
        selectedAssets={selectedAssets}
        onCancel={() => setShowAssetModal(false)}
        onConfirm={(selected) => {
          setSelectedAssets(selected);
          setShowAssetModal(false);
        }}
      />
    </View>
  );
}
