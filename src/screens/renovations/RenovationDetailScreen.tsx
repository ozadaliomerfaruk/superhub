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
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  Calendar,
  DollarSign,
  Users,
  Package,
  ChevronRight,
  Camera,
  Images,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RootStackParamList } from '../../navigation/types';
import {
  RenovationWithDetails,
  Room,
  Worker,
  Asset,
  RenovationCost,
  ExpenseType,
} from '../../types';
import {
  renovationRepository,
  renovationWorkerRepository,
  renovationAssetRepository,
  renovationCostRepository,
  roomRepository,
  workerRepository,
  assetRepository,
} from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS, EXPENSE_TYPES } from '../../constants/theme';
import { useTheme, useTranslation } from '../../contexts';
import { formatDate, getCurrentISODate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RenovationDetailRouteProp = RouteProp<RootStackParamList, 'RenovationDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 40;

export function RenovationDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RenovationDetailRouteProp>();
  const { renovationId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [renovation, setRenovation] = useState<RenovationWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection data
  const [rooms, setRooms] = useState<Room[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Modals
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Cost form
  const [costDescription, setCostDescription] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [costCategory, setCostCategory] = useState('');
  const [costDate, setCostDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await renovationRepository.getByIdWithDetails(renovationId);
      setRenovation(data);

      if (data) {
        const [roomsData, workersData, assetsData] = await Promise.all([
          roomRepository.getByPropertyId(data.propertyId),
          workerRepository.getAll(),
          assetRepository.getByPropertyId(data.propertyId),
        ]);
        setRooms(roomsData);
        setWorkers(workersData);
        setAssets(assetsData);
      }
    } catch (error) {
      console.error('Failed to load renovation:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [renovationId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddWorker = async (workerId: string) => {
    if (!renovation) return;
    try {
      await renovationWorkerRepository.create({
        renovationId: renovation.id,
        workerId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowWorkerModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to add worker:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.workerAddFailed'));
    }
  };

  const handleRemoveWorker = async (id: string) => {
    try {
      await renovationWorkerRepository.delete(id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData();
    } catch (error) {
      console.error('Failed to remove worker:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.workerRemoveFailed'));
    }
  };

  const handleAddAsset = async (assetId: string) => {
    if (!renovation) return;
    try {
      await renovationAssetRepository.create({
        renovationId: renovation.id,
        assetId,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAssetModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to add asset:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.assetAddFailed'));
    }
  };

  const handleRemoveAsset = async (id: string) => {
    try {
      await renovationAssetRepository.delete(id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData();
    } catch (error) {
      console.error('Failed to remove asset:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.assetRemoveFailed'));
    }
  };

  const handleAddCost = async () => {
    if (!renovation) return;
    if (!costDescription.trim()) {
      Alert.alert(t('common.error'), t('renovation.alerts.enterCostDescription'));
      return;
    }
    if (!costAmount || isNaN(parseFloat(costAmount))) {
      Alert.alert(t('common.error'), t('renovation.alerts.enterValidAmount'));
      return;
    }

    try {
      await renovationCostRepository.create({
        renovationId: renovation.id,
        description: costDescription.trim(),
        amount: parseFloat(costAmount),
        category: costCategory || undefined,
        date: costDate.toISOString(),
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCostDescription('');
      setCostAmount('');
      setCostCategory('');
      setCostDate(new Date());
      setShowCostModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to add cost:', error);
      Alert.alert(t('common.error'), t('renovation.alerts.costAddFailed'));
    }
  };

  const handleRemoveCost = async (id: string) => {
    Alert.alert(
      t('common.delete'),
      t('common.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await renovationCostRepository.delete(id);
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              loadData();
            } catch (error) {
              console.error('Failed to remove cost:', error);
              Alert.alert(t('common.error'), t('renovation.alerts.costRemoveFailed'));
            }
          },
        },
      ]
    );
  };

  const handleAddAfterPhoto = async () => {
    if (!renovation) return;

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

  const handleDelete = () => {
    if (!renovation) return;
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
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert(t('common.error'), t('renovation.alerts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setCostDate(selectedDate);
    }
  };

  // Filter out already added workers and assets
  const availableWorkers = workers.filter(
    (w) => !renovation?.workers.some((rw) => rw.workerId === w.id)
  );
  const availableAssets = assets.filter(
    (a) => !renovation?.assets.some((ra) => ra.assetId === a.id)
  );

  if (!renovation) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <ScreenHeader
          title={t('renovation.details')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {loading ? t('common.loading') : t('common.notFound')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={renovation.title}
        subtitle={renovation.roomName}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={handleDelete}
            className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={COLORS.error} />
          </TouchableOpacity>
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
        {/* Before/After Images */}
        <TouchableOpacity
          onPress={() => renovation.afterImageUri && setShowCompareModal(true)}
          activeOpacity={0.9}
          className="mx-5 mt-5"
        >
          <Card variant="default" padding="none">
            <View className="relative h-48 rounded-xl overflow-hidden">
              <Image
                source={{ uri: renovation.beforeImageUri }}
                className="absolute inset-0 w-full h-full"
                resizeMode="cover"
              />
              {renovation.afterImageUri ? (
                <>
                  <View className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
                    <Image
                      source={{ uri: renovation.afterImageUri }}
                      className="absolute right-0 top-0 h-full"
                      style={{ width: SCREEN_WIDTH - 40 }}
                      resizeMode="cover"
                    />
                  </View>
                  <View className="absolute left-1/2 top-0 bottom-0 w-1 bg-white" style={{ marginLeft: -2 }} />
                  <View className="absolute left-3 bottom-3">
                    <Badge label={t('renovation.before')} variant="default" size="sm" />
                  </View>
                  <View className="absolute right-3 bottom-3">
                    <Badge label={t('renovation.after')} variant="success" size="sm" />
                  </View>
                </>
              ) : (
                <View className="absolute left-3 bottom-3">
                  <Badge label={t('renovation.before')} variant="warning" size="sm" />
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* Add After Photo Button */}
        {!renovation.afterImageUri && (
          <View className="px-5 mt-4">
            <Button
              title={t('renovation.addAfterPhoto')}
              onPress={handleAddAfterPhoto}
              variant="primary"
              icon={<Camera size={18} color="#fff" />}
            />
          </View>
        )}

        {/* Description */}
        {renovation.description && (
          <View className="px-5 mt-5">
            <Card variant="filled" padding="md">
              <Text className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {renovation.description}
              </Text>
            </Card>
          </View>
        )}

        {/* Info Row */}
        <View className="px-5 mt-5 flex-row gap-3">
          {renovation.completedDate && (
            <View className={`flex-1 flex-row items-center px-3 py-2.5 rounded-xl ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <Calendar size={16} color={COLORS.success} />
              <Text className={`text-sm font-medium ml-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                {formatDate(renovation.completedDate)}
              </Text>
            </View>
          )}
          <View className={`flex-1 flex-row items-center px-3 py-2.5 rounded-xl ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
            <DollarSign size={16} color={COLORS.primary[600]} />
            <Text className={`text-sm font-bold ml-1 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
              {formatCurrency(renovation.totalCost)}
            </Text>
          </View>
        </View>

        {/* Workers Section */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('renovation.workers')} ({renovation.workers.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowWorkerModal(true)}
              className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Plus size={14} color={isDark ? COLORS.slate[300] : COLORS.slate[600]} />
                <Text className={`text-xs font-medium ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('renovation.addWorker')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {renovation.workers.length === 0 ? (
            <Card variant="filled" padding="md">
              <View className="flex-row items-center">
                <Users size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                <Text className={`text-sm ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('renovation.noWorkers')}
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-2">
              {renovation.workers.map((worker) => (
                <Card key={worker.id} variant="default" padding="sm">
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                      <Text className="text-base font-bold text-pink-600">
                        {worker.workerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {worker.workerName}
                      </Text>
                      {worker.role && (
                        <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {worker.role}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveWorker(worker.id)}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <X size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Assets Section */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('renovation.assets')} ({renovation.assets.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowAssetModal(true)}
              className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Plus size={14} color={isDark ? COLORS.slate[300] : COLORS.slate[600]} />
                <Text className={`text-xs font-medium ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('renovation.addAsset')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {renovation.assets.length === 0 ? (
            <Card variant="filled" padding="md">
              <View className="flex-row items-center">
                <Package size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                <Text className={`text-sm ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('renovation.noAssets')}
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-2">
              {renovation.assets.map((asset) => (
                <Card key={asset.id} variant="default" padding="sm">
                  <View className="flex-row items-center">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                      <Package size={18} color={COLORS.categories.asset} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {asset.assetName}
                      </Text>
                      {asset.assetBrand && (
                        <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {asset.assetBrand}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveAsset(asset.id)}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <X size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Costs Section */}
        <View className="px-5 mt-6 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('renovation.costs')} ({renovation.costs.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowCostModal(true)}
              className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Plus size={14} color={isDark ? COLORS.slate[300] : COLORS.slate[600]} />
                <Text className={`text-xs font-medium ml-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('renovation.addCost')}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {renovation.costs.length === 0 ? (
            <Card variant="filled" padding="md">
              <View className="flex-row items-center">
                <DollarSign size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                <Text className={`text-sm ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('renovation.noCosts')}
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-2">
              {renovation.costs.map((cost) => (
                <Card key={cost.id} variant="default" padding="sm">
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {cost.description}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        {cost.date && (
                          <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDate(cost.date)}
                          </Text>
                        )}
                        {cost.category && (
                          <Badge label={cost.category} variant="info" size="sm" className="ml-2" />
                        )}
                      </View>
                    </View>
                    <Text className={`text-base font-bold mr-2 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>
                      {formatCurrency(cost.amount)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveCost(cost.id)}
                      className="p-2"
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}

              {/* Total */}
              <View className={`flex-row items-center justify-between px-4 py-3 rounded-xl mt-2 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                <Text className={`text-sm font-semibold ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
                  {t('renovation.totalCost')}
                </Text>
                <Text className={`text-lg font-bold ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
                  {formatCurrency(renovation.totalCost)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Worker Selection Modal */}
      <Modal
        visible={showWorkerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkerModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowWorkerModal(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('renovation.selectWorker')}
            </Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            {availableWorkers.length === 0 ? (
              <View className="items-center py-10">
                <Users size={40} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
                <Text className={`text-base mt-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('worker.noWorkers')}
                </Text>
              </View>
            ) : (
              <View className="gap-2 pb-8">
                {availableWorkers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() => handleAddWorker(worker.id)}
                    activeOpacity={0.7}
                  >
                    <Card variant="default" padding="md">
                      <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDark ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
                          <Text className="text-lg font-bold text-pink-600">
                            {worker.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {worker.name}
                          </Text>
                          {worker.specialty.length > 0 && (
                            <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {worker.specialty.slice(0, 2).join(', ')}
                            </Text>
                          )}
                        </View>
                        <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Asset Selection Modal */}
      <Modal
        visible={showAssetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAssetModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowAssetModal(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('renovation.selectAsset')}
            </Text>
            <View className="w-6" />
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            {availableAssets.length === 0 ? (
              <View className="items-center py-10">
                <Package size={40} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
                <Text className={`text-base mt-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('asset.noAssets')}
                </Text>
              </View>
            ) : (
              <View className="gap-2 pb-8">
                {availableAssets.map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    onPress={() => handleAddAsset(asset.id)}
                    activeOpacity={0.7}
                  >
                    <Card variant="default" padding="md">
                      <View className="flex-row items-center">
                        <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDark ? 'bg-cyan-900/30' : 'bg-cyan-50'}`}>
                          <Package size={22} color={COLORS.categories.asset} />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {asset.name}
                          </Text>
                          {asset.brand && (
                            <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {asset.brand}
                            </Text>
                          )}
                        </View>
                        <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add Cost Modal */}
      <Modal
        visible={showCostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCostModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowCostModal(false)} activeOpacity={0.7}>
              <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('renovation.addCost')}
            </Text>
            <TouchableOpacity onPress={handleAddCost} activeOpacity={0.7}>
              <Check size={24} color={COLORS.primary[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-5 pt-5">
            <View className="gap-5 pb-8">
              {/* Description */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('renovation.costDescription')} *
                </Text>
                <TextInput
                  value={costDescription}
                  onChangeText={setCostDescription}
                  placeholder={t('renovation.costDescription')}
                  className={`border rounded-xl px-4 py-3.5 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                />
              </View>

              {/* Amount */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('renovation.costAmount')} *
                </Text>
                <View className={`flex-row items-center border rounded-xl px-4 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                  <DollarSign size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <TextInput
                    value={costAmount}
                    onChangeText={setCostAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`flex-1 py-3.5 pl-2 text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>
              </View>

              {/* Category */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('renovation.costCategory')}
                </Text>
                <TextInput
                  value={costCategory}
                  onChangeText={setCostCategory}
                  placeholder={t('renovation.costCategory')}
                  className={`border rounded-xl px-4 py-3.5 text-base ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                />
              </View>

              {/* Date */}
              <View>
                <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('renovation.costDate')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className={`border rounded-xl px-4 py-3.5 flex-row items-center ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}
                  activeOpacity={0.7}
                >
                  <Calendar size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-base ml-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(costDate.toISOString())}
                  </Text>
                </TouchableOpacity>

                {(showDatePicker || Platform.OS === 'ios') && (
                  <View className={Platform.OS === 'ios' ? 'mt-2' : ''}>
                    {Platform.OS === 'ios' ? (
                      <DateTimePicker
                        value={costDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        textColor={isDark ? '#ffffff' : '#1e293b'}
                      />
                    ) : showDatePicker && (
                      <DateTimePicker
                        value={costDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                      />
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Compare Modal */}
      {showCompareModal && renovation.afterImageUri && (
        <CompareModal
          renovation={renovation}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </View>
  );
}

interface CompareModalProps {
  renovation: RenovationWithDetails;
  onClose: () => void;
}

function CompareModal({ renovation, onClose }: CompareModalProps) {
  const sliderPosition = useSharedValue(SLIDER_WIDTH / 2);
  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = sliderPosition.value;
    })
    .onUpdate((event) => {
      const newPosition = startX.value + event.translationX;
      sliderPosition.value = Math.max(20, Math.min(SLIDER_WIDTH - 20, newPosition));
    })
    .onEnd(() => {
      sliderPosition.value = withSpring(sliderPosition.value, {
        damping: 20,
        stiffness: 200,
      });
    });

  const afterOverlayStyle = useAnimatedStyle(() => ({
    width: SLIDER_WIDTH - sliderPosition.value,
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    left: sliderPosition.value - 2,
  }));

  const sliderStyle = useAnimatedStyle(() => ({
    left: sliderPosition.value - 15,
  }));

  return (
    <View className="absolute inset-0 bg-black z-50">
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">{renovation.title}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center ml-3"
          activeOpacity={0.7}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 justify-center px-5">
        <View
          className="relative rounded-2xl overflow-hidden"
          style={{ width: SLIDER_WIDTH, height: SLIDER_WIDTH * 0.75 }}
        >
          <Image
            source={{ uri: renovation.beforeImageUri }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />

          <Animated.View
            className="absolute right-0 top-0 bottom-0 overflow-hidden"
            style={afterOverlayStyle}
          >
            <Image
              source={{ uri: renovation.afterImageUri }}
              className="absolute right-0 top-0 h-full"
              style={{ width: SLIDER_WIDTH }}
              resizeMode="cover"
            />
          </Animated.View>

          <Animated.View
            className="absolute top-0 bottom-0 w-1 bg-white"
            style={dividerStyle}
          />

          <GestureDetector gesture={panGesture}>
            <Animated.View
              className="absolute top-1/2 -mt-6 w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg"
              style={sliderStyle}
            >
              <View className="flex-row">
                <View className="w-0.5 h-5 bg-slate-400 mx-0.5 rounded-full" />
                <View className="w-0.5 h-5 bg-slate-400 mx-0.5 rounded-full" />
              </View>
            </Animated.View>
          </GestureDetector>

          <View className="absolute left-4 top-4">
            <Badge label="Before" variant="default" size="md" />
          </View>
          <View className="absolute right-4 top-4">
            <Badge label="After" variant="success" size="md" />
          </View>
        </View>

        <Text className="text-white/50 text-center text-sm mt-4">
          Drag the slider to compare
        </Text>
      </View>
    </View>
  );
}
