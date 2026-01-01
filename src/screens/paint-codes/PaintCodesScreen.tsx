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
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Palette,
  Plus,
  MapPin,
  Edit3,
  Trash2,
  Camera,
  X,
  Check,
  Droplet,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { PaintCode, Property, Room } from '../../types';
import { paintCodeRepository, propertyRepository, roomRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaintCodesRouteProp = RouteProp<RootStackParamList, 'PaintCodes'>;

const FINISH_KEYS = ['flat', 'eggshell', 'satin', 'semiGloss', 'gloss'] as const;

export function PaintCodesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaintCodesRouteProp>();
  const { propertyId, roomId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const getFinishLabel = (key: string) => t(`paintCodes.finishes.${key}`);

  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [paintCodes, setPaintCodes] = useState<PaintCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formLocation, setFormLocation] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formColorName, setFormColorName] = useState('');
  const [formColorCode, setFormColorCode] = useState('');
  const [formFinish, setFormFinish] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const propertyData = await propertyRepository.getById(propertyId);
      setProperty(propertyData);

      if (roomId) {
        const roomData = await roomRepository.getById(roomId);
        setRoom(roomData);
        const codes = await paintCodeRepository.getByRoomId(roomId);
        setPaintCodes(codes);
      } else {
        const codes = await paintCodeRepository.getByPropertyId(propertyId);
        setPaintCodes(codes);
      }
    } catch (error) {
      console.error('Failed to load paint codes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, roomId]);

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
    setFormLocation('');
    setFormBrand('');
    setFormColorName('');
    setFormColorCode('');
    setFormFinish('');
    setFormNotes('');
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formLocation.trim() || !formBrand.trim() || !formColorName.trim() || !formColorCode.trim()) {
      Alert.alert(t('common.error'), t('paintCodes.alerts.fillRequired'));
      return;
    }

    try {
      if (editingId) {
        await paintCodeRepository.update(editingId, {
          location: formLocation.trim(),
          brand: formBrand.trim(),
          colorName: formColorName.trim(),
          colorCode: formColorCode.trim(),
          finish: formFinish.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      } else {
        await paintCodeRepository.create({
          propertyId,
          roomId: roomId || undefined,
          location: formLocation.trim(),
          brand: formBrand.trim(),
          colorName: formColorName.trim(),
          colorCode: formColorCode.trim(),
          finish: formFinish.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save paint code:', error);
      Alert.alert(t('common.error'), t('paintCodes.alerts.saveFailed'));
    }
  };

  const handleEdit = (code: PaintCode) => {
    setFormLocation(code.location);
    setFormBrand(code.brand);
    setFormColorName(code.colorName);
    setFormColorCode(code.colorCode);
    setFormFinish(code.finish || '');
    setFormNotes(code.notes || '');
    setEditingId(code.id);
    setShowAddForm(true);
  };

  const handleDelete = (code: PaintCode) => {
    Alert.alert(
      t('paintCodes.deleteTitle'),
      t('paintCodes.deleteMessage', { colorName: code.colorName, location: code.location }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await paintCodeRepository.delete(code.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete paint code:', error);
              Alert.alert(t('common.error'), t('paintCodes.alerts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleAddPhoto = async (code: PaintCode) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await paintCodeRepository.update(code.id, {
          imageUri: result.assets[0].uri,
        });
        loadData();
      } catch (error) {
        console.error('Failed to add photo:', error);
        Alert.alert(t('common.error'), t('paintCodes.alerts.photoFailed'));
      }
    }
  };

  // Group by location
  const groupedCodes = paintCodes.reduce((acc, code) => {
    if (!acc[code.location]) acc[code.location] = [];
    acc[code.location].push(code);
    return acc;
  }, {} as Record<string, PaintCode[]>);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('paintCodes.title')}
        subtitle={room?.name || property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          !showAddForm ? (
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              className="w-10 h-10 rounded-xl bg-primary-500 items-center justify-center"
              activeOpacity={0.7}
            >
              <Plus size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : undefined
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
        {/* Add/Edit Form */}
        {showAddForm && (
          <View className="px-5 pt-5">
            <Card variant="default" padding="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingId ? t('paintCodes.editPaintCode') : t('paintCodes.addPaintCode')}
                </Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.location')} *</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder={t('paintCodes.locationPlaceholder')}
                    className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.brand')} *</Text>
                  <TextInput
                    value={formBrand}
                    onChangeText={setFormBrand}
                    placeholder={t('paintCodes.brandPlaceholder')}
                    className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.colorName')} *</Text>
                    <TextInput
                      value={formColorName}
                      onChangeText={setFormColorName}
                      placeholder={t('paintCodes.colorNamePlaceholder')}
                      className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border`}
                      placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.colorCode')} *</Text>
                    <TextInput
                      value={formColorCode}
                      onChangeText={setFormColorCode}
                      placeholder={t('paintCodes.colorCodePlaceholder')}
                      className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border`}
                      placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    />
                  </View>
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.finish')}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {FINISH_KEYS.map((finishKey) => (
                      <TouchableOpacity
                        key={finishKey}
                        onPress={() => setFormFinish(formFinish === finishKey ? '' : finishKey)}
                        className={`px-3 py-2 rounded-lg border ${
                          formFinish === finishKey
                            ? 'bg-primary-50 border-primary-500'
                            : isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            formFinish === finishKey ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {getFinishLabel(finishKey)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('paintCodes.notes')}</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder={t('paintCodes.notesPlaceholder')}
                    multiline
                    numberOfLines={2}
                    className={`rounded-xl px-4 py-3 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    textAlignVertical="top"
                  />
                </View>

                <Button
                  title={editingId ? t('paintCodes.updatePaintCode') : t('paintCodes.addPaintCode')}
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Paint Codes List */}
        {paintCodes.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Palette size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('paintCodes.noPaintCodes')}
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('paintCodes.savePaintCodesDescription')}
                </Text>
                <Button
                  title={t('paintCodes.addPaintCode')}
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {Object.entries(groupedCodes).map(([location, codes]) => (
              <View key={location}>
                <View className="flex-row items-center mb-2">
                  <MapPin size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {location}
                  </Text>
                </View>

                <View className="gap-2">
                  {codes.map((code) => (
                    <Card key={code.id} variant="default" padding="none">
                      <View className="p-4">
                        <View className="flex-row">
                          {/* Color Swatch */}
                          <View className="mr-4">
                            <View
                              className={`w-16 h-16 rounded-xl border-2 items-center justify-center ${isDark ? 'border-slate-600' : 'border-slate-200'}`}
                              style={{ backgroundColor: isDark ? '#374151' : '#f5f5f5' }}
                            >
                              <Droplet size={24} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            </View>
                          </View>

                          {/* Info */}
                          <View className="flex-1">
                            <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {code.colorName}
                            </Text>
                            <Text className={`text-sm font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {code.colorCode}
                            </Text>
                            <View className="flex-row flex-wrap items-center gap-2 mt-2">
                              <Badge label={code.brand} variant="info" size="sm" />
                              {code.finish && (
                                <Badge label={code.finish} variant="default" size="sm" />
                              )}
                            </View>
                          </View>
                        </View>

                        {code.notes && (
                          <Text className={`text-sm mt-3 pt-3 border-t ${isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                            {code.notes}
                          </Text>
                        )}

                        {code.imageUri && (
                          <Image
                            source={{ uri: code.imageUri }}
                            className="w-full h-32 rounded-xl mt-3"
                            resizeMode="cover"
                          />
                        )}

                        {/* Actions */}
                        <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <TouchableOpacity
                            onPress={() => handleAddPhoto(code)}
                            className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                            activeOpacity={0.7}
                          >
                            <Camera size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {code.imageUri ? t('paintCodes.update') : t('paintCodes.photo')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleEdit(code)}
                            className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                            activeOpacity={0.7}
                          >
                            <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(code)}
                            className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={16} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
