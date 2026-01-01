import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Plus,
  Package,
  ChevronRight,
  Camera,
  X,
  Check,
  Calendar,
  Shield,
  Search,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Asset, AssetCategory, Room } from '../../types';
import { assetRepository, roomRepository } from '../../services/database';
import { ScreenHeader, Input, Button, Badge } from '../../components/ui';
import { COLORS, ASSET_CATEGORIES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { useTheme } from '../../contexts';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PropertyAssetsRouteProp = RouteProp<RootStackParamList, 'PropertyAssets'>;

type AssetCategoryOption = {
  value: AssetCategory;
  label: string;
  color: string;
};

const assetCategories: AssetCategoryOption[] = [
  { value: 'appliance', label: 'Appliance', color: ASSET_CATEGORIES.appliance.color },
  { value: 'hvac', label: 'HVAC', color: ASSET_CATEGORIES.hvac.color },
  { value: 'plumbing', label: 'Plumbing', color: ASSET_CATEGORIES.plumbing.color },
  { value: 'electrical', label: 'Electrical', color: ASSET_CATEGORIES.electrical.color },
  { value: 'furniture', label: 'Furniture', color: ASSET_CATEGORIES.furniture.color },
  { value: 'electronics', label: 'Electronics', color: ASSET_CATEGORIES.electronics.color },
  { value: 'outdoor', label: 'Outdoor', color: ASSET_CATEGORIES.outdoor.color },
  { value: 'structural', label: 'Structural', color: ASSET_CATEGORIES.structural.color },
  { value: 'other', label: 'Other', color: ASSET_CATEGORIES.other.color },
];

export function PropertyAssetsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PropertyAssetsRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  // Assets list state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);

  // Add asset modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('appliance');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [purchasePrice, setPurchasePrice] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState<Date | undefined>();
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Date picker visibility
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [tempPurchaseDate, setTempPurchaseDate] = useState<Date>(new Date());
  const [tempWarrantyDate, setTempWarrantyDate] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    try {
      const [assetsData, roomsData] = await Promise.all([
        assetRepository.getByPropertyId(propertyId),
        roomRepository.getByPropertyId(propertyId),
      ]);
      setAssets(assetsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load assets:', error);
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

  const openAddModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetForm();
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
  };

  const resetForm = () => {
    setName('');
    setCategory('appliance');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setPurchaseDate(undefined);
    setPurchasePrice('');
    setWarrantyEndDate(undefined);
    setImageUri(undefined);
    setSelectedRoomId(undefined);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera access');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSaveAsset = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an asset name');
      return;
    }

    setSaving(true);

    try {
      await assetRepository.create({
        propertyId,
        roomId: selectedRoomId,
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate: purchaseDate?.toISOString(),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        warrantyEndDate: warrantyEndDate?.toISOString(),
        imageUri,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeAddModal();
      loadData();
    } catch (error) {
      console.error('Failed to create asset:', error);
      Alert.alert('Error', 'Failed to create asset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetPress = (asset: Asset) => {
    navigation.navigate('AssetDetail', { assetId: asset.id });
  };

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = searchQuery
      ? asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory ? asset.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    const room = rooms.find((r) => r.id === roomId);
    return room?.name;
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Assets"
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={openAddModal}
            className="w-10 h-10 rounded-xl items-center justify-center bg-primary-100"
            activeOpacity={0.7}
          >
            <Plus size={20} color={COLORS.primary[600]} />
          </TouchableOpacity>
        }
      />

      {/* Search Bar */}
      <View className="px-4 py-3">
        <View
          className={`flex-row items-center rounded-xl px-3 py-2.5 ${
            isDark ? 'bg-slate-800' : 'bg-white'
          }`}
          style={SHADOWS.sm}
        >
          <Search size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
          <TextInput
            placeholder="Search assets..."
            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className={`flex-1 ml-2 text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
        >
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setSelectedCategory(null)}
              activeOpacity={0.7}
              className={`px-3 py-1.5 rounded-full ${
                !selectedCategory
                  ? 'bg-primary-500'
                  : isDark
                  ? 'bg-slate-700'
                  : 'bg-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  !selectedCategory
                    ? 'text-white'
                    : isDark
                    ? 'text-slate-300'
                    : 'text-slate-600'
                }`}
              >
                All ({assets.length})
              </Text>
            </TouchableOpacity>
            {assetCategories.map((cat) => {
              const count = assets.filter((a) => a.category === cat.value).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
                  activeOpacity={0.7}
                  className={`px-3 py-1.5 rounded-full ${
                    selectedCategory === cat.value
                      ? 'bg-primary-500'
                      : isDark
                      ? 'bg-slate-700'
                      : 'bg-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selectedCategory === cat.value
                        ? 'text-white'
                        : isDark
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {cat.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Assets List */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {filteredAssets.length === 0 ? (
          <View className="items-center py-12">
            <View
              className={`w-20 h-20 rounded-3xl items-center justify-center mb-4 ${
                isDark ? 'bg-slate-800' : 'bg-slate-100'
              }`}
            >
              <Package size={36} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
            </View>
            <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {searchQuery || selectedCategory ? 'No matching assets' : 'No assets yet'}
            </Text>
            <Text className={`text-sm text-center mt-2 px-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filter'
                : 'Tap the + button to add your first asset'}
            </Text>
            {!searchQuery && !selectedCategory && (
              <TouchableOpacity
                onPress={openAddModal}
                className="mt-4 px-5 py-2.5 bg-primary-500 rounded-xl flex-row items-center"
                activeOpacity={0.7}
              >
                <Plus size={18} color="#fff" />
                <Text className="text-white font-semibold ml-1.5">Add Asset</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="gap-3">
            {/* Summary */}
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
              </Text>
              {filteredAssets.some((a) => a.purchasePrice) && (
                <Text className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Total: {formatCurrency(
                    filteredAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0)
                  )}
                </Text>
              )}
            </View>

            {/* Asset Cards */}
            {filteredAssets.map((asset) => {
              const categoryConfig = ASSET_CATEGORIES[asset.category] || ASSET_CATEGORIES.other;
              const roomName = getRoomName(asset.roomId);

              return (
                <TouchableOpacity
                  key={asset.id}
                  onPress={() => handleAssetPress(asset)}
                  activeOpacity={0.7}
                >
                  <View
                    className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                    style={SHADOWS.sm}
                  >
                    <View className="flex-row items-center">
                      {asset.imageUri ? (
                        <Image
                          source={{ uri: asset.imageUri }}
                          className="w-16 h-16 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="w-16 h-16 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${categoryConfig.color}15` }}
                        >
                          <Package size={28} color={categoryConfig.color} />
                        </View>
                      )}
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Badge
                            label={categoryConfig.label}
                            color={categoryConfig.color}
                            size="sm"
                          />
                        </View>
                        <Text
                          className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}
                          numberOfLines={1}
                        >
                          {asset.name}
                        </Text>
                        {(asset.brand || asset.model) && (
                          <Text
                            className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                            numberOfLines={1}
                          >
                            {[asset.brand, asset.model].filter(Boolean).join(' ')}
                          </Text>
                        )}
                        {roomName && (
                          <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {roomName}
                          </Text>
                        )}
                      </View>
                      <View className="items-end">
                        {asset.purchasePrice && (
                          <Text className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {formatCurrency(asset.purchasePrice)}
                          </Text>
                        )}
                        <ChevronRight
                          size={20}
                          color={isDark ? COLORS.slate[600] : COLORS.slate[400]}
                          className="mt-1"
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add Asset Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddModal}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {/* Modal Header */}
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}`}>
            <TouchableOpacity onPress={closeAddModal} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Add Asset
            </Text>
            <TouchableOpacity
              onPress={handleSaveAsset}
              disabled={saving || !name.trim()}
              activeOpacity={0.7}
            >
              <Check size={24} color={saving || !name.trim() ? COLORS.slate[400] : COLORS.primary[600]} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Photo Section */}
              <View className="flex-row items-center mb-4">
                <TouchableOpacity
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                  className={`w-24 h-24 rounded-2xl overflow-hidden items-center justify-center ${
                    isDark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}
                >
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="items-center">
                      <Camera size={28} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                      <Text className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Add Photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                {imageUri && (
                  <View className="ml-3 gap-2">
                    <TouchableOpacity
                      onPress={handlePickImage}
                      className="px-3 py-2 bg-slate-200 rounded-lg"
                    >
                      <Text className="text-sm text-slate-700">Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleTakePhoto}
                      className="px-3 py-2 bg-slate-200 rounded-lg flex-row items-center"
                    >
                      <Camera size={14} color={COLORS.slate[700]} />
                      <Text className="text-sm text-slate-700 ml-1">Camera</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Name */}
              <Input
                label="Asset Name *"
                placeholder="e.g., Samsung Refrigerator"
                value={name}
                onChangeText={setName}
                containerClassName="mb-4"
              />

              {/* Category */}
              <View className="mb-4">
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {assetCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setCategory(cat.value)}
                      activeOpacity={0.7}
                      className={`px-3 py-2 rounded-xl border-2 ${
                        category === cat.value
                          ? 'border-primary-500 bg-primary-50'
                          : isDark
                          ? 'border-slate-600 bg-slate-800'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <View className="flex-row items-center">
                        <View
                          className="w-3 h-3 rounded-full mr-1.5"
                          style={{ backgroundColor: cat.color }}
                        />
                        <Text
                          className={`text-sm font-medium ${
                            category === cat.value
                              ? 'text-primary-700'
                              : isDark
                              ? 'text-slate-300'
                              : 'text-slate-700'
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Room Selection */}
              {rooms.length > 0 && (
                <View className="mb-4">
                  <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Room (Optional)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => setSelectedRoomId(undefined)}
                        activeOpacity={0.7}
                        className={`px-3 py-2 rounded-xl border-2 ${
                          !selectedRoomId
                            ? 'border-primary-500 bg-primary-50'
                            : isDark
                            ? 'border-slate-600 bg-slate-800'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            !selectedRoomId
                              ? 'text-primary-700'
                              : isDark
                              ? 'text-slate-300'
                              : 'text-slate-700'
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
                          className={`px-3 py-2 rounded-xl border-2 ${
                            selectedRoomId === room.id
                              ? 'border-primary-500 bg-primary-50'
                              : isDark
                              ? 'border-slate-600 bg-slate-800'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              selectedRoomId === room.id
                                ? 'text-primary-700'
                                : isDark
                                ? 'text-slate-300'
                                : 'text-slate-700'
                            }`}
                          >
                            {room.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Brand & Model */}
              <View className="flex-row gap-3 mb-4">
                <Input
                  label="Brand"
                  placeholder="e.g., Samsung"
                  value={brand}
                  onChangeText={setBrand}
                  containerClassName="flex-1"
                />
                <Input
                  label="Model"
                  placeholder="Model number"
                  value={model}
                  onChangeText={setModel}
                  containerClassName="flex-1"
                />
              </View>

              {/* Serial Number */}
              <Input
                label="Serial Number"
                placeholder="Enter serial number"
                value={serialNumber}
                onChangeText={setSerialNumber}
                containerClassName="mb-4"
              />

              {/* Purchase Info */}
              <View className="flex-row gap-3 mb-4">
                <TouchableOpacity
                  onPress={() => {
                    setTempPurchaseDate(purchaseDate || new Date());
                    setShowPurchaseDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  className={`flex-1 rounded-xl px-3 py-3 border ${
                    isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Purchase Date
                  </Text>
                  <View className="flex-row items-center">
                    <Calendar size={14} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                    <Text className={`text-sm ml-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {purchaseDate ? format(purchaseDate, 'MMM d, yyyy') : 'Select'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Input
                  label="Purchase Price"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                  leftIcon={<Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>$</Text>}
                  containerClassName="flex-1"
                />
              </View>

              {/* Warranty */}
              <TouchableOpacity
                onPress={() => {
                  setTempWarrantyDate(warrantyEndDate || new Date());
                  setShowWarrantyDatePicker(true);
                }}
                activeOpacity={0.7}
                className={`rounded-xl px-3 py-3 border mb-6 ${
                  isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
                }`}
              >
                <Text className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Warranty End Date
                </Text>
                <View className="flex-row items-center">
                  <Shield size={14} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                  <Text className={`text-sm ml-2 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {warrantyEndDate ? format(warrantyEndDate, 'MMM d, yyyy') : 'Select (Optional)'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Save Button */}
              <Button
                title={saving ? 'Saving...' : 'Save Asset'}
                variant="primary"
                onPress={handleSaveAsset}
                loading={saving}
                disabled={saving || !name.trim()}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

        {/* Purchase Date Picker Modal */}
        <Modal
          visible={showPurchaseDatePicker}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl`}>
              <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <TouchableOpacity
                  onPress={() => setShowPurchaseDatePicker(false)}
                  activeOpacity={0.7}
                >
                  <Text className="text-base text-slate-500">Cancel</Text>
                </TouchableOpacity>
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Purchase Date
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPurchaseDate(tempPurchaseDate);
                    setShowPurchaseDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-semibold text-primary-600">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempPurchaseDate}
                mode="date"
                display="spinner"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (date) setTempPurchaseDate(date);
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>

        {/* Warranty Date Picker Modal */}
        <Modal
          visible={showWarrantyDatePicker}
          transparent
          animationType="slide"
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className={`${isDark ? 'bg-slate-800' : 'bg-white'} rounded-t-3xl`}>
              <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <TouchableOpacity
                  onPress={() => setShowWarrantyDatePicker(false)}
                  activeOpacity={0.7}
                >
                  <Text className="text-base text-slate-500">Cancel</Text>
                </TouchableOpacity>
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Warranty End Date
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setWarrantyEndDate(tempWarrantyDate);
                    setShowWarrantyDatePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-semibold text-primary-600">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempWarrantyDate}
                mode="date"
                display="spinner"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (date) setTempWarrantyDate(date);
                }}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}
