import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  Check,
  Sofa,
  Bed,
  CookingPot,
  Bath,
  Car,
  ArrowDown,
  ArrowUp,
  Monitor,
  UtensilsCrossed,
  Trees,
  Wrench,
  Package,
  Grid3x3,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { RoomType } from '../../types';
import { roomRepository } from '../../services/database';
import { Button, Input, IconButton } from '../../components/ui';
import { COLORS, ROOM_TYPES } from '../../constants/theme';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddRoomRouteProp = RouteProp<RootStackParamList, 'AddRoom'>;

const roomTypeOptions: { value: RoomType; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'living_room', label: 'Living Room', icon: Sofa },
  { value: 'bedroom', label: 'Bedroom', icon: Bed },
  { value: 'kitchen', label: 'Kitchen', icon: CookingPot },
  { value: 'bathroom', label: 'Bathroom', icon: Bath },
  { value: 'garage', label: 'Garage', icon: Car },
  { value: 'basement', label: 'Basement', icon: ArrowDown },
  { value: 'attic', label: 'Attic', icon: ArrowUp },
  { value: 'office', label: 'Office', icon: Monitor },
  { value: 'dining', label: 'Dining', icon: UtensilsCrossed },
  { value: 'outdoor', label: 'Outdoor', icon: Trees },
  { value: 'utility', label: 'Utility', icon: Wrench },
  { value: 'storage', label: 'Storage', icon: Package },
  { value: 'other', label: 'Other', icon: Grid3x3 },
];

export function AddRoomScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddRoomRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('living_room');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a room name');
      return;
    }

    setLoading(true);

    try {
      await roomRepository.create({
        propertyId: route.params.propertyId,
        name: name.trim(),
        type,
        notes: notes.trim() || undefined,
        imageUri,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to create room:', error);
      Alert.alert('Error', 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Room</Text>
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
        {/* Image Picker */}
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Photo (Optional)</Text>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            className={`h-36 rounded-2xl overflow-hidden items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}
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
                <Text className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Room Name */}
        <Input
          label="Room Name"
          placeholder="e.g., Master Bedroom, Kitchen"
          value={name}
          onChangeText={setName}
          containerClassName="mb-4"
        />

        {/* Room Type */}
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Room Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {roomTypeOptions.map((item) => {
              const isSelected = type === item.value;
              const color = ROOM_TYPES[item.value]?.color || COLORS.slate[500];
              const IconComponent = item.icon;

              return (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setType(item.value)}
                  activeOpacity={0.7}
                  className={`
                    px-3 py-2.5 rounded-xl flex-row items-center border
                    ${isSelected ? 'border-primary-500 bg-primary-50' : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'}
                  `}
                >
                  <IconComponent
                    size={18}
                    color={isSelected ? COLORS.primary[600] : color}
                  />
                  <Text
                    className={`ml-2 text-sm font-medium ${
                      isSelected ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected && (
                    <Check size={14} color={COLORS.primary[600]} className="ml-1" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          placeholder="Any additional details about this room..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          containerClassName="mb-4"
        />
      </ScrollView>
    </View>
  );
}
