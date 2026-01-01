import React, { useState, useEffect } from 'react';
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
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditRoomRouteProp = RouteProp<RootStackParamList, 'EditRoom'>;

const roomTypeOptions: { value: RoomType; icon: React.ComponentType<any> }[] = [
  { value: 'living_room', icon: Sofa },
  { value: 'bedroom', icon: Bed },
  { value: 'kitchen', icon: CookingPot },
  { value: 'bathroom', icon: Bath },
  { value: 'garage', icon: Car },
  { value: 'basement', icon: ArrowDown },
  { value: 'attic', icon: ArrowUp },
  { value: 'office', icon: Monitor },
  { value: 'dining', icon: UtensilsCrossed },
  { value: 'outdoor', icon: Trees },
  { value: 'utility', icon: Wrench },
  { value: 'storage', icon: Package },
  { value: 'other', icon: Grid3x3 },
];

export function EditRoomScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditRoomRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const { roomId } = route.params;

  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('living_room');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  const loadRoom = async () => {
    try {
      const room = await roomRepository.getById(roomId);
      if (room) {
        setName(room.name);
        setType(room.type);
        setNotes(room.notes || '');
        setImageUri(room.imageUri);
      }
    } catch (error) {
      console.error('Failed to load room:', error);
      Alert.alert(t('common.error'), t('property.failedToLoad'));
      navigation.goBack();
    } finally {
      setInitialLoading(false);
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
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('validation.required'));
      return;
    }

    setLoading(true);

    try {
      await roomRepository.update(roomId, {
        name: name.trim(),
        type,
        notes: notes.trim() || undefined,
        imageUri,
      });

      navigation.goBack();
    } catch (error) {
      console.error('Failed to update room:', error);
      Alert.alert(t('common.error'), t('common.tryAgain'));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('common.loading')}</Text>
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
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('room.edit')}</Text>
        <Button
          title={t('common.save')}
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
          <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('property.photo')}</Text>
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
                <Text className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('property.tapToAddPhoto')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Room Name */}
        <Input
          label={t('room.name')}
          placeholder="e.g., Master Bedroom, Kitchen"
          value={name}
          onChangeText={setName}
          containerClassName="mb-4"
        />

        {/* Room Type */}
        <View className="mb-6">
          <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('room.type')}</Text>
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
                    {t(`room.types.${item.value}`)}
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
          label={t('maintenance.notes')}
          placeholder={t('maintenance.notesPlaceholder')}
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
