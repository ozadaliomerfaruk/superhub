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
import { useToast } from '../../contexts';
import { validateAmount, parseAmount } from '../../utils/validation';
import { getImageQuality } from '../../utils/image';
import { getCurrencySymbol, formatCurrency } from '../../utils/currency';
import { formatDateObjectWithDay } from '../../utils/date';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddExpenseRouteProp = RouteProp<RootStackParamList, 'AddExpense'>;

type ExpenseTypeOption = {
  value: ExpenseType;
  label: string;
  color: string;
  Icon: typeof Wrench;
};

const expenseTypes: ExpenseTypeOption[] = [
  { value: 'repair', label: 'Repair', color: EXPENSE_TYPES.repair.color, Icon: Wrench },
  { value: 'bill', label: 'Bill', color: EXPENSE_TYPES.bill.color, Icon: Receipt },
  { value: 'maintenance', label: 'Maintenance', color: EXPENSE_TYPES.maintenance.color, Icon: Settings },
  { value: 'purchase', label: 'Purchase', color: EXPENSE_TYPES.purchase.color, Icon: ShoppingBag },
  { value: 'other', label: 'Other', color: EXPENSE_TYPES.other.color, Icon: MoreHorizontal },
];

const categoryOptions: Record<ExpenseType, string[]> = {
  repair: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Roof', 'Other'],
  bill: BILL_CATEGORIES as unknown as string[],
  maintenance: ['HVAC Service', 'Lawn Care', 'Pool Service', 'Pest Control', 'Cleaning', 'Other'],
  purchase: ['Appliance', 'Furniture', 'Tools', 'Supplies', 'Decor', 'Other'],
  other: ['Other'],
};

export function AddExpenseScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();

  const [type, setType] = useState<ExpenseType>('repair');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
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
    const categories = categoryOptions[type];
    if (categories.length > 0 && (!category || !categories.includes(category))) {
      setCategory(categories[0]);
    }
  }, [type, category]);

  const handlePickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
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
      Alert.alert('Permission needed', 'Please grant camera access');
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

  const handleSave = async () => {
    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
      Alert.alert('Invalid Amount', amountValidation.error);
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description');
      return;
    }

    // Validate asset amounts don't exceed total
    const totalAssetAmount = selectedAssets.reduce((sum, a) => sum + a.amount, 0);
    if (totalAssetAmount > parsedAmount) {
      Alert.alert(
        'Invalid Asset Amounts',
        `The sum of asset amounts (${formatCurrency(totalAssetAmount)}) exceeds the total expense amount (${formatCurrency(parsedAmount)})`
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

      showSuccess('Expense added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create expense:', error);
      showError('Failed to create expense. Please try again.');
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

  const currentCategories = categoryOptions[type];

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100">
        <IconButton
          icon={<X size={22} color={COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className="text-lg font-bold text-slate-900">Add Expense</Text>
        <Button
          title="Save"
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
            <Text className="text-sm font-medium text-primary-700 mb-2">Amount</Text>
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
            <Text className="text-sm font-medium text-slate-700 mb-3">Expense Type</Text>
            <View className="flex-row gap-2">
              {expenseTypes.map(renderTypeButton)}
            </View>
          </View>

          {/* Category */}
          <View className="mb-5">
            <Text className="text-sm font-medium text-slate-700 mb-2">Category</Text>
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
            label="Description"
            placeholder="What was this expense for?"
            value={description}
            onChangeText={setDescription}
            containerClassName="mb-4"
            required
          />

          {/* Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">Date</Text>
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
              <Text className="text-sm font-medium text-slate-700 mb-2">Room (Optional)</Text>
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
                    No Room
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
                  Worker (Optional)
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
                    No Worker
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

          {/* Asset Selection */}
          {assets.length > 0 && (
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Package size={16} color={COLORS.slate[500]} />
                <Text className="text-sm font-medium text-slate-700 ml-1.5">
                  Related Assets (Optional)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAssetModal(true)}
                activeOpacity={0.7}
                className="bg-white rounded-xl px-4 py-3.5 border border-slate-200 flex-row items-center"
              >
                {selectedAssets.length > 0 ? (
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base text-slate-700">
                        {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected
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
                            className="bg-slate-100 rounded-lg px-2 py-0.5"
                          >
                            <Text className="text-xs text-slate-600">
                              {asset.name}: {formatCurrency(selected.amount)}
                            </Text>
                          </View>
                        ) : null;
                      })}
                      {selectedAssets.length > 3 && (
                        <View className="bg-slate-100 rounded-lg px-2 py-0.5">
                          <Text className="text-xs text-slate-600">
                            +{selectedAssets.length - 3} more
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    <Package size={18} color={COLORS.slate[400]} />
                    <Text className="text-base text-slate-500 ml-3 flex-1">
                      Select assets for this expense
                    </Text>
                  </>
                )}
                <ChevronRight size={18} color={COLORS.slate[400]} />
              </TouchableOpacity>
            </View>
          )}

          {/* Receipt */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">Receipt (Optional)</Text>
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
                    <Text className="text-xs text-slate-500 mt-1">Add</Text>
                  </View>
                )}
              </TouchableOpacity>

              {receiptUri && (
                <View className="ml-3 gap-2">
                  <Button
                    title="Change"
                    variant="outline"
                    size="sm"
                    onPress={handlePickReceipt}
                  />
                  <Button
                    title="Camera"
                    variant="outline"
                    size="sm"
                    icon={<Camera size={14} color={COLORS.slate[700]} />}
                    onPress={handleTakePhoto}
                  />
                </View>
              )}

              {!receiptUri && (
                <Button
                  title="Take Photo"
                  variant="outline"
                  size="sm"
                  icon={<Camera size={14} color={COLORS.slate[700]} />}
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
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text className="text-base text-slate-600">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-slate-900">Select Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text className="text-base font-semibold text-primary-600">Done</Text>
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
