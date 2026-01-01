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
  Package,
  Plus,
  MapPin,
  Edit3,
  Trash2,
  Camera,
  X,
  Check,
  Search,
  QrCode,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { StorageBox, Property } from '../../types';
import { storageBoxRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type StorageBoxesRouteProp = RouteProp<RootStackParamList, 'StorageBoxes'>;

export function StorageBoxesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<StorageBoxesRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [property, setProperty] = useState<Property | null>(null);
  const [boxes, setBoxes] = useState<StorageBox[]>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<StorageBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formContents, setFormContents] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, boxData] = await Promise.all([
        propertyRepository.getById(propertyId),
        storageBoxRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setBoxes(boxData);
      setFilteredBoxes(boxData);
    } catch (error) {
      console.error('Failed to load storage boxes:', error);
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = await storageBoxRepository.search(propertyId, query);
        setFilteredBoxes(results);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setFilteredBoxes(boxes);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormLocation('');
    setFormContents('');
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formLocation.trim() || !formContents.trim()) {
      Alert.alert(t('common.error'), t('storage.alerts.fillRequired'));
      return;
    }

    try {
      const data = {
        propertyId,
        name: formName.trim(),
        location: formLocation.trim(),
        contents: formContents.trim(),
      };

      if (editingId) {
        await storageBoxRepository.update(editingId, data);
      } else {
        await storageBoxRepository.create(data);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save storage box:', error);
      Alert.alert(t('common.error'), t('storage.alerts.saveFailed'));
    }
  };

  const handleEdit = (box: StorageBox) => {
    setFormName(box.name);
    setFormLocation(box.location);
    setFormContents(box.contents);
    setEditingId(box.id);
    setShowAddForm(true);
  };

  const handleDelete = (box: StorageBox) => {
    Alert.alert(
      t('storage.deleteBox'),
      t('storage.deleteConfirm', { name: box.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await storageBoxRepository.delete(box.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete storage box:', error);
              Alert.alert(t('common.error'), t('storage.alerts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleAddPhoto = async (box: StorageBox) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await storageBoxRepository.update(box.id, {
          imageUri: result.assets[0].uri,
        });
        loadData();
      } catch (error) {
        console.error('Failed to add photo:', error);
        Alert.alert(t('common.error'), t('storage.alerts.photoFailed'));
      }
    }
  };

  // Group by location
  const groupedBoxes = filteredBoxes.reduce((acc, box) => {
    if (!acc[box.location]) acc[box.location] = [];
    acc[box.location].push(box);
    return acc;
  }, {} as Record<string, StorageBox[]>);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('storage.title')}
        subtitle={property?.name}
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
        {/* Search Bar */}
        {boxes.length > 0 && !showAddForm && (
          <View className="px-5 pt-5">
            <View className={`flex-row items-center rounded-xl px-4 py-3 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <Search size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              <TextInput
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t('storage.searchPlaceholder')}
                className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <X size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <View className="px-5 pt-5">
            <Card variant="default" padding="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingId ? t('storage.editBox') : t('storage.addBox')}
                </Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('storage.boxName')} *</Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder={t('storage.boxNamePlaceholder')}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('storage.location')} *</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder={t('storage.locationPlaceholder')}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('storage.contents')} *</Text>
                  <TextInput
                    value={formContents}
                    onChangeText={setFormContents}
                    placeholder={t('storage.contentsPlaceholder')}
                    multiline
                    numberOfLines={4}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    textAlignVertical="top"
                    style={{ minHeight: 100 }}
                  />
                </View>

                <Button
                  title={editingId ? t('storage.updateBox') : t('storage.saveBox')}
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Boxes List */}
        {boxes.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Package size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('storage.noBoxes')}
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('storage.noBoxesDescription')}
                </Text>
                <Button
                  title={t('storage.addBox')}
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : filteredBoxes.length === 0 && searchQuery ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <Search size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                <Text className={`text-base font-semibold text-center mt-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('storage.noResults', { query: searchQuery })}
                </Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('storage.tryDifferent')}
                </Text>
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {Object.entries(groupedBoxes).map(([location, locationBoxes]) => (
              <View key={location}>
                <View className="flex-row items-center mb-2">
                  <MapPin size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {location} ({locationBoxes.length})
                  </Text>
                </View>

                <View className="gap-2">
                  {locationBoxes.map((box) => (
                    <Card key={box.id} variant="default" padding="none">
                      <View className="p-4">
                        <View className="flex-row items-start">
                          <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                            <Package size={24} color="#a855f7" />
                          </View>

                          <View className="flex-1 ml-3">
                            <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {box.name}
                            </Text>
                            {box.qrCode && (
                              <View className="flex-row items-center mt-0.5">
                                <QrCode size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                                <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  QR: {box.qrCode}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Contents */}
                        <View className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <View className="flex-row items-center mb-1.5">
                            <FileText size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {t('storage.contents')}
                            </Text>
                          </View>
                          <Text className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {box.contents}
                          </Text>
                        </View>

                        {box.imageUri && (
                          <Image
                            source={{ uri: box.imageUri }}
                            className="w-full h-32 rounded-xl mt-3"
                            resizeMode="cover"
                          />
                        )}

                        {/* Actions */}
                        <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <TouchableOpacity
                            onPress={() => handleAddPhoto(box)}
                            className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                            activeOpacity={0.7}
                          >
                            <Camera size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {box.imageUri ? t('storage.update') : t('storage.photo')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleEdit(box)}
                            className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                            activeOpacity={0.7}
                          >
                            <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(box)}
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
