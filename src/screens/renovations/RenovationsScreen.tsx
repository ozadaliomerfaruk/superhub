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
  Dimensions,
  Modal,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Images,
  Plus,
  Trash2,
  Camera,
  X,
  Check,
  ChevronRight,
  Calendar,
  DollarSign,
  Sparkles,
  Home,
  Tag,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { Renovation, Property, Room, ExpenseType } from '../../types';
import { renovationRepository, propertyRepository, roomRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS, EXPENSE_TYPES } from '../../constants/theme';
import { useTheme, useTranslation } from '../../contexts';
import { formatDate, getCurrentISODate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RenovationsRouteProp = RouteProp<RootStackParamList, 'Renovations'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function RenovationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RenovationsRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [property, setProperty] = useState<Property | null>(null);
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBeforeImage, setFormBeforeImage] = useState<string | null>(null);
  const [formCost, setFormCost] = useState('');
  const [formRoomId, setFormRoomId] = useState<string | undefined>(undefined);
  const [formExpenseType, setFormExpenseType] = useState<ExpenseType | undefined>(undefined);

  // Selection modals
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [showExpenseTypePicker, setShowExpenseTypePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, renovationsData, roomsData] = await Promise.all([
        propertyRepository.getById(propertyId),
        renovationRepository.getByPropertyId(propertyId),
        roomRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setRenovations(renovationsData);
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load renovations:', error);
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

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormBeforeImage(null);
    setFormCost('');
    setFormRoomId(undefined);
    setFormExpenseType(undefined);
    setShowAddForm(false);
  };

  const handlePickBeforeImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormBeforeImage(result.assets[0].uri);
    }
  };

  const handleTakeBeforePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('renovation.alerts.permissionDenied'), t('renovation.alerts.cameraRequired'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormBeforeImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert(t('common.error'), t('renovation.alerts.enterTitle'));
      return;
    }
    if (!formBeforeImage) {
      Alert.alert(t('common.error'), t('renovation.alerts.addBeforePhoto'));
      return;
    }

    try {
      await renovationRepository.create({
        propertyId,
        roomId: formRoomId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        beforeImageUri: formBeforeImage,
        cost: formCost ? parseFloat(formCost) : undefined,
        expenseType: formExpenseType,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create renovation:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.createFailed'));
    }
  };

  const handleAddAfterPhoto = async (renovation: Renovation) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await renovationRepository.update(renovation.id, {
          afterImageUri: result.assets[0].uri,
          completedDate: getCurrentISODate(),
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      } catch (error) {
        console.error('Failed to add after photo:', error);
        Alert.alert(t('common.error'), t('renovation.alerts.addPhotoFailed'));
      }
    }
  };

  const handleDelete = (renovation: Renovation) => {
    Alert.alert(
      t('renovation.deleteRenovation'),
      t('renovation.deleteConfirm', { title: renovation.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await renovationRepository.delete(renovation.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert(t('common.error'), t('renovation.alerts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleRenovationPress = (renovation: Renovation) => {
    navigation.navigate('RenovationDetail', { renovationId: renovation.id });
  };

  const getRoomName = (roomId?: string) => {
    if (!roomId) return null;
    const room = rooms.find(r => r.id === roomId);
    return room?.name;
  };

  const getExpenseTypeLabel = (type?: ExpenseType) => {
    if (!type) return null;
    return t(`giderCategories.${type}`);
  };

  const inProgress = renovations.filter((r) => !r.afterImageUri);
  const completed = renovations.filter((r) => r.afterImageUri);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('renovation.title')}
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
        {/* Add Form */}
        {showAddForm && (
          <View className="px-5 pt-5">
            <Card variant="default" padding="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('renovation.newRenovation')}</Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.titleLabel')} *</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder={t('renovation.titlePlaceholder')}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.description')}</Text>
                  <TextInput
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder={t('renovation.descriptionPlaceholder')}
                    multiline
                    numberOfLines={2}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    textAlignVertical="top"
                  />
                </View>

                {/* Room Selection */}
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.room')}</Text>
                  <TouchableOpacity
                    onPress={() => setShowRoomPicker(true)}
                    className={`rounded-xl px-4 py-3 border flex-row items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Home size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                    <Text className={`flex-1 ml-3 text-base ${formRoomId ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                      {formRoomId ? getRoomName(formRoomId) : t('renovation.selectRoom')}
                    </Text>
                    <ChevronRight size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  </TouchableOpacity>
                </View>

                {/* Expense Type Selection */}
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.expenseType')}</Text>
                  <TouchableOpacity
                    onPress={() => setShowExpenseTypePicker(true)}
                    className={`rounded-xl px-4 py-3 border flex-row items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Tag size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                    <Text className={`flex-1 ml-3 text-base ${formExpenseType ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                      {formExpenseType ? getExpenseTypeLabel(formExpenseType) : t('renovation.selectExpenseType')}
                    </Text>
                    <ChevronRight size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  </TouchableOpacity>
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.estimatedCost')}</Text>
                  <TextInput
                    value={formCost}
                    onChangeText={setFormCost}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('renovation.beforePhoto')} *</Text>
                  {formBeforeImage ? (
                    <View className="relative">
                      <Image
                        source={{ uri: formBeforeImage }}
                        className="w-full h-48 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => setFormBeforeImage(null)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handleTakeBeforePhoto}
                        className={`flex-1 py-4 rounded-xl items-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                        activeOpacity={0.7}
                      >
                        <Camera size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                        <Text className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('renovation.takePhoto')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handlePickBeforeImage}
                        className={`flex-1 py-4 rounded-xl items-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                        activeOpacity={0.7}
                      >
                        <Images size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                        <Text className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('renovation.choose')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Button
                  title={t('renovation.startTracking')}
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Empty State */}
        {renovations.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                  <Sparkles size={32} color="#8b5cf6" />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('renovation.noRenovations')}
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('renovation.noRenovationsDescription')}
                </Text>
                <Button
                  title={t('renovation.addRenovation')}
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-6 pb-8">
            {/* In Progress */}
            {inProgress.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('renovation.inProgress')} ({inProgress.length})
                  </Text>
                </View>

                <View className="gap-3">
                  {inProgress.map((renovation) => (
                    <TouchableOpacity
                      key={renovation.id}
                      onPress={() => handleRenovationPress(renovation)}
                      activeOpacity={0.9}
                    >
                      <Card variant="default" padding="none">
                        <Image
                          source={{ uri: renovation.beforeImageUri }}
                          className="w-full h-40 rounded-t-xl"
                          resizeMode="cover"
                        />
                        <View className="absolute top-3 left-3">
                          <Badge label={t('renovation.before')} variant="warning" size="sm" />
                        </View>

                        <View className="p-4">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {renovation.title}
                              </Text>
                              {getRoomName(renovation.roomId) && (
                                <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {getRoomName(renovation.roomId)}
                                </Text>
                              )}
                              {renovation.description && (
                                <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={2}>
                                  {renovation.description}
                                </Text>
                              )}
                            </View>
                            <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          </View>

                          <View className="flex-row gap-2 mt-3">
                            <Button
                              title={t('renovation.addAfterPhoto')}
                              onPress={() => handleAddAfterPhoto(renovation)}
                              variant="primary"
                              size="sm"
                              className="flex-1"
                              icon={<Camera size={16} color="#fff" />}
                            />
                            <TouchableOpacity
                              onPress={() => handleDelete(renovation)}
                              className={`p-2.5 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                              activeOpacity={0.7}
                            >
                              <Trash2 size={18} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('renovation.completed')} ({completed.length})
                  </Text>
                </View>

                <View className="gap-3">
                  {completed.map((renovation) => (
                    <TouchableOpacity
                      key={renovation.id}
                      onPress={() => handleRenovationPress(renovation)}
                      activeOpacity={0.9}
                    >
                      <Card variant="default" padding="none">
                        <BeforeAfterPreview renovation={renovation} />
                        <View className="p-4">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {renovation.title}
                              </Text>
                              <View className="flex-row items-center mt-1 gap-3">
                                {renovation.completedDate && (
                                  <View className="flex-row items-center">
                                    <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                                    <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {formatDate(renovation.completedDate, 'MMM d, yyyy')}
                                    </Text>
                                  </View>
                                )}
                                {renovation.cost && (
                                  <View className="flex-row items-center">
                                    <DollarSign size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                                    <Text className={`text-xs ml-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {formatCurrency(renovation.cost)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Room Picker Modal */}
      <Modal
        visible={showRoomPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRoomPicker(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowRoomPicker(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('renovation.selectRoom')}
            </Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            {/* No Room Option */}
            <TouchableOpacity
              onPress={() => {
                setFormRoomId(undefined);
                setShowRoomPicker(false);
              }}
              activeOpacity={0.7}
            >
              <Card variant="default" padding="md" className="mb-2">
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                  </View>
                  <Text className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('renovation.noRoom')}
                  </Text>
                  {!formRoomId && <Check size={20} color={COLORS.primary[600]} />}
                </View>
              </Card>
            </TouchableOpacity>

            {rooms.map((room) => (
              <TouchableOpacity
                key={room.id}
                onPress={() => {
                  setFormRoomId(room.id);
                  setShowRoomPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Card variant="default" padding="md" className="mb-2">
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <Home size={18} color={COLORS.info} />
                    </View>
                    <Text className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {room.name}
                    </Text>
                    {formRoomId === room.id && <Check size={20} color={COLORS.primary[600]} />}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Expense Type Picker Modal */}
      <Modal
        visible={showExpenseTypePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExpenseTypePicker(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowExpenseTypePicker(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('renovation.selectExpenseType')}
            </Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            {(['repair', 'maintenance', 'purchase', 'other'] as ExpenseType[]).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  setFormExpenseType(type);
                  setShowExpenseTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Card variant="default" padding="md" className="mb-2">
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                      <Tag size={18} color={COLORS.primary[600]} />
                    </View>
                    <Text className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {t(`giderCategories.${type}`)}
                    </Text>
                    {formExpenseType === type && <Check size={20} color={COLORS.primary[600]} />}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

interface BeforeAfterPreviewProps {
  renovation: Renovation;
}

function BeforeAfterPreview({ renovation }: BeforeAfterPreviewProps) {
  return (
    <View className="relative h-40 rounded-t-xl overflow-hidden">
      {/* Before Image (left half) */}
      <Image
        source={{ uri: renovation.beforeImageUri }}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      {/* After Image (right half overlay) */}
      <View className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
        <Image
          source={{ uri: renovation.afterImageUri }}
          className="absolute right-0 top-0 h-full"
          style={{ width: SCREEN_WIDTH - 40 }}
          resizeMode="cover"
        />
      </View>
      {/* Center divider */}
      <View className="absolute left-1/2 top-0 bottom-0 w-1 bg-white" style={{ marginLeft: -2 }}>
        <View className="absolute top-1/2 -mt-4 -ml-3 w-7 h-7 rounded-full bg-white items-center justify-center shadow-md">
          <View className="flex-row">
            <View className="w-0.5 h-3 bg-slate-400 mx-0.5" />
            <View className="w-0.5 h-3 bg-slate-400 mx-0.5" />
          </View>
        </View>
      </View>
      {/* Labels */}
      <View className="absolute left-3 bottom-3">
        <Badge label="Before" variant="default" size="sm" />
      </View>
      <View className="absolute right-3 bottom-3">
        <Badge label="After" variant="success" size="sm" />
      </View>
    </View>
  );
}
