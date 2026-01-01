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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  Check,
  Calendar,
  DollarSign,
  Shield,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { AssetCategory, Room } from '../../types';
import { assetRepository, roomRepository } from '../../services/database';
import { Button, Input, IconButton, TextArea, DatePickerModal } from '../../components/ui';
import { COLORS, ASSET_CATEGORIES } from '../../constants/theme';
import { format } from 'date-fns';
import { useTranslation, useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddAssetRouteProp = RouteProp<RootStackParamList, 'AddAsset'>;

type AssetCategoryOption = {
  value: AssetCategory;
  label: string;
  color: string;
};

export function AddAssetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddAssetRouteProp>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const assetCategories: AssetCategoryOption[] = [
    { value: 'appliance', label: t('asset.categories.appliance'), color: ASSET_CATEGORIES.appliance.color },
    { value: 'hvac', label: t('asset.categories.hvac'), color: ASSET_CATEGORIES.hvac.color },
    { value: 'plumbing', label: t('asset.categories.plumbing'), color: ASSET_CATEGORIES.plumbing.color },
    { value: 'electrical', label: t('asset.categories.electrical'), color: ASSET_CATEGORIES.electrical.color },
    { value: 'furniture', label: t('asset.categories.furniture'), color: ASSET_CATEGORIES.furniture.color },
    { value: 'electronics', label: t('asset.categories.electronics'), color: ASSET_CATEGORIES.electronics.color },
    { value: 'outdoor', label: t('asset.categories.outdoor'), color: ASSET_CATEGORIES.outdoor.color },
    { value: 'structural', label: t('asset.categories.structural'), color: ASSET_CATEGORIES.structural.color },
    { value: 'other', label: t('asset.categories.other'), color: ASSET_CATEGORIES.other.color },
  ];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('appliance');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>();
  const [purchasePrice, setPurchasePrice] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(route.params.roomId);

  // Date picker visibility
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [tempPurchaseDate, setTempPurchaseDate] = useState<Date>(new Date());
  const [tempWarrantyDate, setTempWarrantyDate] = useState<Date>(new Date());

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const roomsData = await roomRepository.getByPropertyId(route.params.propertyId);
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common.permissionRequired'), t('permissions.photosDescription'));
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
      Alert.alert(t('common.permissionRequired'), t('permissions.cameraDescription'));
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.required'));
      return;
    }

    setLoading(true);

    try {
      await assetRepository.create({
        propertyId: route.params.propertyId,
        roomId: selectedRoomId,
        name: name.trim(),
        category,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseDate: purchaseDate?.toISOString(),
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : undefined,
        warrantyEndDate: warrantyEndDate?.toISOString(),
        notes: notes.trim() || undefined,
        imageUri,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to create asset:', error);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryButton = (item: AssetCategoryOption) => {
    const isSelected = category === item.value;

    return (
      <TouchableOpacity
        key={item.value}
        onPress={() => setCategory(item.value)}
        activeOpacity={0.7}
        className={`px-4 py-2.5 rounded-xl mr-2 mb-2 border-2 ${
          isSelected ? 'border-primary-500' : 'border-slate-200'
        }`}
        style={isSelected ? { backgroundColor: COLORS.primary[50] } : { backgroundColor: '#fff' }}
      >
        <View className="flex-row items-center">
          <View
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: item.color }}
          />
          <Text
            className={`text-sm font-medium ${
              isSelected ? 'text-primary-700' : 'text-slate-700'
            }`}
          >
            {item.label}
          </Text>
          {isSelected && (
            <Check size={14} color={COLORS.primary[600]} className="ml-1" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <IconButton
          icon={<X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('asset.add')}</Text>
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
          {/* Photo Section */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-slate-700 mb-2">{t('property.photo')}</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.8}
                className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 items-center justify-center"
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center">
                    <Camera size={28} color={COLORS.slate[400]} />
                    <Text className="text-xs text-slate-500 mt-1">{t('worker.addPhoto')}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {imageUri && (
                <View className="ml-3 gap-2">
                  <Button
                    title={t('common.change')}
                    variant="outline"
                    size="sm"
                    onPress={handlePickImage}
                  />
                  <Button
                    title={t('property.takePhoto')}
                    variant="outline"
                    size="sm"
                    icon={<Camera size={14} color={COLORS.slate[700]} />}
                    onPress={handleTakePhoto}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Name */}
          <Input
            label={t('asset.name')}
            placeholder="e.g., Samsung Refrigerator, Dyson Vacuum"
            value={name}
            onChangeText={setName}
            containerClassName="mb-4"
            required
          />

          {/* Category */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">{t('asset.category')}</Text>
            <View className="flex-row flex-wrap">
              {assetCategories.map(renderCategoryButton)}
            </View>
          </View>

          {/* Room Selection */}
          {rooms.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-slate-700 mb-2">{t('room.title')} ({t('common.optional')})</Text>
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
                    {t('common.none')}
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

          {/* Brand & Model */}
          <View className="flex-row gap-3 mb-4">
            <Input
              label={t('asset.brand')}
              placeholder="e.g., Samsung, LG"
              value={brand}
              onChangeText={setBrand}
              containerClassName="flex-1"
            />
            <Input
              label={t('asset.model')}
              placeholder="e.g., RF28R7351SG"
              value={model}
              onChangeText={setModel}
              containerClassName="flex-1"
            />
          </View>

          {/* Serial Number */}
          <Input
            label={t('asset.serialNumber')}
            placeholder="Enter serial number"
            value={serialNumber}
            onChangeText={setSerialNumber}
            containerClassName="mb-4"
          />

          {/* Purchase Info */}
          <View className="bg-slate-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <DollarSign size={18} color={COLORS.primary[600]} />
              <Text className="text-sm font-semibold text-slate-700 ml-2">
                {t('asset.purchaseDate')} {t('common.optional')}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                onPress={() => {
                  setTempPurchaseDate(purchaseDate || new Date());
                  setShowPurchaseDatePicker(true);
                }}
                activeOpacity={0.7}
                className="flex-1 bg-white rounded-xl px-4 py-3 border border-slate-200"
              >
                <Text className="text-xs text-slate-500 mb-1">{t('asset.purchaseDate')}</Text>
                <View className="flex-row items-center">
                  <Calendar size={16} color={COLORS.slate[400]} />
                  <Text className="text-sm text-slate-700 ml-2">
                    {purchaseDate ? format(purchaseDate, 'MMM d, yyyy') : t('common.select')}
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="flex-1">
                <Input
                  label={t('asset.purchasePrice')}
                  placeholder="0.00"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                  keyboardType="decimal-pad"
                  leftIcon={<Text className="text-slate-500">$</Text>}
                />
              </View>
            </View>
          </View>

          {/* Warranty Info */}
          <View className="bg-slate-50 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Shield size={18} color={COLORS.success} />
              <Text className="text-sm font-semibold text-slate-700 ml-2">
                {t('asset.warranty')} {t('common.optional')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTempWarrantyDate(warrantyEndDate || new Date());
                setShowWarrantyDatePicker(true);
              }}
              activeOpacity={0.7}
              className="bg-white rounded-xl px-4 py-3 border border-slate-200"
            >
              <Text className="text-xs text-slate-500 mb-1">{t('asset.warrantyEndDate')}</Text>
              <View className="flex-row items-center">
                <Calendar size={16} color={COLORS.slate[400]} />
                <Text className="text-sm text-slate-700 ml-2">
                  {warrantyEndDate ? format(warrantyEndDate, 'MMM d, yyyy') : t('common.select')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <TextArea
            label={t('asset.notes')}
            placeholder={t('asset.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            rows={3}
            containerClassName="mb-4"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Purchase Date Picker Modal */}
      <Modal visible={showPurchaseDatePicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
              <TouchableOpacity onPress={() => setShowPurchaseDatePicker(false)}>
                <Text className="text-base text-slate-600">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-slate-900">{t('asset.purchaseDate')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseDate(tempPurchaseDate);
                  setShowPurchaseDatePicker(false);
                }}
              >
                <Text className="text-base font-semibold text-primary-600">{t('common.done')}</Text>
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
      <Modal visible={showWarrantyDatePicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-200">
              <TouchableOpacity onPress={() => setShowWarrantyDatePicker(false)}>
                <Text className="text-base text-slate-600">{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text className="text-base font-semibold text-slate-900">{t('asset.warrantyEndDate')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setWarrantyEndDate(tempWarrantyDate);
                  setShowWarrantyDatePicker(false);
                }}
              >
                <Text className="text-base font-semibold text-primary-600">{t('common.done')}</Text>
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
    </View>
  );
}
