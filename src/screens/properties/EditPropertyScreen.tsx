import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Home, Palmtree, Building2, Key, MapPin, Check } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Property } from '../../types';
import { propertyRepository } from '../../services/database';
import { Button, Input, IconButton } from '../../components/ui';
import { COLORS, PROPERTY_TYPES } from '../../constants/theme';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditPropertyRouteProp = RouteProp<RootStackParamList, 'EditProperty'>;

type PropertyTypeOption = {
  value: Property['type'];
  label: string;
  Icon: typeof Home;
};

const propertyTypes: PropertyTypeOption[] = [
  { value: 'home', label: 'Home', Icon: Home },
  { value: 'vacation', label: 'Vacation', Icon: Palmtree },
  { value: 'office', label: 'Office', Icon: Building2 },
  { value: 'rental', label: 'Rental', Icon: Key },
  { value: 'other', label: 'Other', Icon: MapPin },
];

export function EditPropertyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditPropertyRouteProp>();
  const insets = useSafeAreaInsets();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<Property['type']>('home');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      const property = await propertyRepository.getById(propertyId);
      if (property) {
        setName(property.name);
        setAddress(property.address);
        setType(property.type);
        setImageUri(property.imageUri);
      }
    } catch (error) {
      console.error('Failed to load property:', error);
      Alert.alert('Error', 'Failed to load property');
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
      aspect: [16, 9],
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
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a property name');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Required', 'Please enter an address');
      return;
    }

    setLoading(true);

    try {
      await propertyRepository.update(propertyId, {
        name: name.trim(),
        address: address.trim(),
        type,
        imageUri,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to update property:', error);
      Alert.alert('Error', 'Failed to update property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPropertyTypeButton = (item: PropertyTypeOption) => {
    const isSelected = type === item.value;
    const color = PROPERTY_TYPES[item.value]?.color || COLORS.slate[500];
    const IconComponent = item.Icon;

    return (
      <TouchableOpacity
        key={item.value}
        onPress={() => setType(item.value)}
        activeOpacity={0.7}
        className={`flex-1 min-w-[100px] p-4 rounded-xl items-center border-2 ${
          isSelected ? 'border-primary-500 bg-primary-50' : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
        }`}
      >
        <IconComponent size={24} color={isSelected ? COLORS.primary[600] : color} />
        <Text
          className={`text-sm font-medium mt-2 ${
            isSelected ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {item.label}
        </Text>
        {isSelected && (
          <View className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 items-center justify-center">
            <Check size={12} color="white" strokeWidth={3} />
          </View>
        )}
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
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <IconButton
          icon={<X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Property</Text>
        <Button
          title="Save"
          variant="primary"
          size="sm"
          loading={loading}
          onPress={handleSave}
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Photo</Text>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            className={`h-44 rounded-2xl overflow-hidden items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="items-center">
                <Camera size={32} color={COLORS.slate[400]} />
                <Text className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View className="flex-row gap-2 mt-2">
            <Button
              title={imageUri ? "Change" : "Choose Photo"}
              variant="outline"
              size="sm"
              onPress={handlePickImage}
              className="flex-1"
            />
            <Button
              title="Take Photo"
              variant="outline"
              size="sm"
              icon={<Camera size={16} color={COLORS.slate[700]} />}
              onPress={handleTakePhoto}
              className="flex-1"
            />
          </View>
        </View>

        <Input
          label="Property Name"
          placeholder="e.g., Main House, Beach Condo"
          value={name}
          onChangeText={setName}
          containerClassName="mb-4"
        />

        <Input
          label="Address"
          placeholder="123 Main St, City, State, ZIP"
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={2}
          containerClassName="mb-6"
        />

        <View>
          <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Property Type</Text>
          <View className="flex-row flex-wrap gap-3">
            {propertyTypes.map(renderPropertyTypeButton)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
