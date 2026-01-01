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
  Check,
  Calendar,
  DollarSign,
  Shield,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Asset, AssetCategory, Room } from '../../types';
import { assetRepository, roomRepository } from '../../services/database';
import { Button, Input, IconButton, TextArea } from '../../components/ui';
import { COLORS, ASSET_CATEGORIES } from '../../constants/theme';
import { format } from 'date-fns';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditAssetRouteProp = RouteProp<RootStackParamList, 'EditAsset'>;

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

export function EditAssetScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditAssetRouteProp>();
  const insets = useSafeAreaInsets();
  const { assetId } = route.params;
  const { isDark } = useTheme();

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
  const [initialLoading, setInitialLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [propertyId, setPropertyId] = useState<string>('');

  // Date picker visibility
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [tempPurchaseDate, setTempPurchaseDate] = useState<Date>(new Date());
  const [tempWarrantyDate, setTempWarrantyDate] = useState<Date>(new Date());

  useEffect(() => {
    loadAsset();
  }, [assetId]);

  const loadAsset = async () => {
    try {
      const asset = await assetRepository.getById(assetId);
      if (asset) {
        setName(asset.name);
        setCategory(asset.category);
        setBrand(asset.brand || '');
        setModel(asset.model || '');
        setSerialNumber(asset.serialNumber || '');
        setPurchaseDate(asset.purchaseDate ? new Date(asset.purchaseDate) : undefined);
        setPurchasePrice(asset.purchasePrice?.toString() || '');
        setWarrantyEndDate(asset.warrantyEndDate ? new Date(asset.warrantyEndDate) : undefined);
        setNotes(asset.notes || '');
        setImageUri(asset.imageUri);
        setSelectedRoomId(asset.roomId);
        setPropertyId(asset.propertyId);

        // Load rooms for this property
        const roomsData = await roomRepository.getByPropertyId(asset.propertyId);
        setRooms(roomsData);
      }
    } catch (error) {
      console.error('Failed to load asset:', error);
      Alert.alert('Error', 'Failed to load asset');
      navigation.goBack();
    } finally {
      setInitialLoading(false);
    }
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter an asset name');
      return;
    }

    setLoading(true);

    try {
      await assetRepository.update(assetId, {
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
      console.error('Failed to update asset:', error);
      Alert.alert('Error', 'Failed to update asset. Please try again.');
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

  if (initialLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading...</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <IconButton
          icon={<X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Asset</Text>
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
          {/* Photo Section */}
          <View className="mb-6">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Photo</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePickImage}
                activeOpacity={0.8}
                className={`w-24 h-24 rounded-2xl overflow-hidden items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
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
                    <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View className="ml-3 gap-2">
                <Button
                  title={imageUri ? "Change" : "Choose"}
                  variant="outline"
                  size="sm"
                  onPress={handlePickImage}
                />
                <Button
                  title="Camera"
                  variant="outline"
                  size="sm"
                  icon={<Camera size={14} color={COLORS.slate[700]} />}
                  onPress={handleTakePhoto}
                />
              </View>
            </View>
          </View>

          {/* Name */}
          <Input
            label="Asset Name"
            placeholder="e.g., Samsung Refrigerator, Dyson Vacuum"
            value={name}
            onChangeText={setName}
            containerClassName="mb-4"
            required
          />

          {/* Category */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</Text>
            <View className="flex-row flex-wrap">
              {assetCategories.map(renderCategoryButton)}
            </View>
          </View>

          {/* Room Selection */}
          {rooms.length > 0 && (
            <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Room</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
              >
                <TouchableOpacity
                  onPress={() => setSelectedRoomId(undefined)}
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-xl mr-2 border-2 ${
                    !selectedRoomId ? 'border-primary-500 bg-primary-50' : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      !selectedRoomId ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
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

          {/* Brand & Model */}
          <View className="flex-row gap-3 mb-4">
            <Input
              label="Brand"
              placeholder="e.g., Samsung, LG"
              value={brand}
              onChangeText={setBrand}
              containerClassName="flex-1"
            />
            <Input
              label="Model"
              placeholder="e.g., RF28R7351SG"
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
          <View className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <View className="flex-row items-center mb-3">
              <DollarSign size={18} color={COLORS.primary[600]} />
              <Text className={`text-sm font-semibold ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Purchase Information
              </Text>
            </View>

            <View className="flex-row gap-3 mb-3">
              <TouchableOpacity
                onPress={() => {
                  setTempPurchaseDate(purchaseDate || new Date());
                  setShowPurchaseDatePicker(true);
                }}
                activeOpacity={0.7}
                className={`flex-1 rounded-xl px-4 py-3 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
              >
                <Text className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Purchase Date</Text>
                <View className="flex-row items-center">
                  <Calendar size={16} color={COLORS.slate[400]} />
                  <Text className={`text-sm ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {purchaseDate ? format(purchaseDate, 'MMM d, yyyy') : 'Select date'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="flex-1">
                <Input
                  label="Purchase Price"
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
          <View className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <View className="flex-row items-center mb-3">
              <Shield size={18} color={COLORS.success} />
              <Text className={`text-sm font-semibold ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Warranty Information
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setTempWarrantyDate(warrantyEndDate || new Date());
                setShowWarrantyDatePicker(true);
              }}
              activeOpacity={0.7}
              className={`rounded-xl px-4 py-3 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
            >
              <Text className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Warranty End Date</Text>
              <View className="flex-row items-center">
                <Calendar size={16} color={COLORS.slate[400]} />
                <Text className={`text-sm ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {warrantyEndDate ? format(warrantyEndDate, 'MMM d, yyyy') : 'Select date'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <TextArea
            label="Notes"
            placeholder="Add any additional notes about this asset..."
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
          <View className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <TouchableOpacity onPress={() => setShowPurchaseDatePicker(false)}>
                <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Purchase Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setPurchaseDate(tempPurchaseDate);
                  setShowPurchaseDatePicker(false);
                }}
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
      <Modal visible={showWarrantyDatePicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <TouchableOpacity onPress={() => setShowWarrantyDatePicker(false)}>
                <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Warranty End Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setWarrantyEndDate(tempWarrantyDate);
                  setShowWarrantyDatePicker(false);
                }}
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
    </View>
  );
}
