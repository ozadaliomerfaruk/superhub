import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MoreVertical,
  Plus,
  Package,
  DoorOpen,
  ChevronRight,
  DollarSign,
  Wrench,
  Receipt,
  Clock,
  Palette,
  Ruler,
  Calendar,
  Edit3,
  Trash2,
  AlertCircle,
  Shield,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Room, Asset, Expense } from '../../types';
import { roomRepository, assetRepository, expenseRepository } from '../../services/database';
import { IconButton, PressableCard, Button } from '../../components/ui';
import { COLORS, ROOM_TYPES, ASSET_CATEGORIES, SHADOWS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoomDetailRouteProp = RouteProp<RootStackParamList, 'RoomDetail'>;

export function RoomDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoomDetailRouteProp>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [room, setRoom] = useState<Room | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [roomData, assetsData] = await Promise.all([
        roomRepository.getById(route.params.roomId),
        assetRepository.getByRoomId(route.params.roomId),
      ]);
      setRoom(roomData);
      setAssets(assetsData);
      // TODO: Get expenses by room when roomId filter is added
      setExpenses([]);
    } catch (error) {
      console.error('Failed to load room:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [route.params.roomId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMoreOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), t('room.edit'), t('room.delete')],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            navigation.navigate('EditRoom', { roomId: room!.id });
          } else if (buttonIndex === 2) {
            handleDelete();
          }
        }
      );
    } else {
      Alert.alert(t('property.options'), t('property.chooseAction'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('room.edit'),
          onPress: () => navigation.navigate('EditRoom', { roomId: room!.id }),
        },
        { text: t('room.delete'), style: 'destructive', onPress: handleDelete },
      ]);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('room.delete'),
      'Are you sure you want to delete this room? Assets in this room will be unassigned. This action cannot be undone.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await roomRepository.delete(room!.id);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete room:', error);
              Alert.alert(t('common.error'), t('common.tryAgain'));
            }
          },
        },
      ]
    );
  };

  const formatExpenseDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return t('dates.today');
    if (isYesterday(date)) return t('dates.yesterday');
    return format(date, 'MMM d');
  };

  const getWarrantyStatus = (warrantyEndDate?: string) => {
    if (!warrantyEndDate) return null;
    const endDate = parseISO(warrantyEndDate);
    const daysUntilExpiry = differenceInDays(endDate, new Date());

    if (daysUntilExpiry < 0) {
      return { status: 'expired', label: 'Expired', color: COLORS.error };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `${daysUntilExpiry}d left`, color: COLORS.warning };
    } else {
      return { status: 'valid', label: 'Under Warranty', color: COLORS.success };
    }
  };

  const getAssetIcon = (category: Asset['category']) => {
    const categoryConfig = ASSET_CATEGORIES[category] || ASSET_CATEGORIES.other;
    return { color: categoryConfig.color };
  };

  const roomConfig = room ? ROOM_TYPES[room.type] || ROOM_TYPES.other : ROOM_TYPES.other;

  // Calculate total asset value
  const totalAssetValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);

  if (!room && !loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('property.notFound')}</Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header with Image or Color */}
      <View className="relative">
        {room?.imageUri ? (
          <Image
            source={{ uri: room.imageUri }}
            className="w-full h-48"
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full h-48"
            style={{ backgroundColor: roomConfig.color + '20' }}
          >
            <View className="flex-1 items-center justify-center">
              <View
                className="w-16 h-16 rounded-full items-center justify-center"
                style={{ backgroundColor: roomConfig.color + '30' }}
              >
                <DoorOpen size={32} color={roomConfig.color} />
              </View>
            </View>
          </View>
        )}

        {/* Overlay Header */}
        <View
          className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <IconButton
            icon={<ArrowLeft size={22} color={room?.imageUri ? '#fff' : COLORS.slate[800]} />}
            variant="ghost"
            className={room?.imageUri ? 'bg-black/30' : 'bg-white/80'}
            onPress={() => navigation.goBack()}
          />
          <IconButton
            icon={<MoreVertical size={22} color={room?.imageUri ? '#fff' : COLORS.slate[600]} />}
            variant="ghost"
            className={room?.imageUri ? 'bg-black/30' : 'bg-white/80'}
            onPress={handleMoreOptions}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 -mt-6"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Room Info Card */}
        <View className={`mx-4 rounded-2xl p-5 ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={SHADOWS.md}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{room?.name}</Text>
              <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{roomConfig.label}</Text>
            </View>
            <View
              className="px-3 py-1.5 rounded-xl"
              style={{ backgroundColor: roomConfig.color + '15' }}
            >
              <DoorOpen size={18} color={roomConfig.color} />
            </View>
          </View>

          {room?.notes && (
            <View className={`mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <Text className={`text-sm leading-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{room.notes}</Text>
            </View>
          )}

          {/* Quick Stats */}
          <View className={`flex-row mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <Package size={16} color={COLORS.slate[400]} />
                <Text className={`text-2xl font-bold ml-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {assets.length}
                </Text>
              </View>
              <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('asset.title')}</Text>
            </View>
            <View className={`w-px ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
            <View className="flex-1 items-center">
              <View className="flex-row items-center">
                <DollarSign size={16} color={COLORS.primary[500]} />
                <Text className="text-2xl font-bold text-primary-600 ml-1">
                  {formatCurrency(totalAssetValue)}
                </Text>
              </View>
              <Text className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('worker.total')}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mt-5">
          <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('home.quickActions')}
          </Text>
          <View className="flex-row gap-2.5">
            <PressableCard
              variant="default"
              padding="sm"
              className="flex-1 items-center bg-purple-50 border border-purple-100"
              onPress={() =>
                navigation.navigate('PaintCodes', {
                  propertyId: route.params.propertyId,
                  roomId: room!.id,
                })
              }
            >
              <View className="w-10 h-10 rounded-xl bg-purple-100 items-center justify-center">
                <Palette size={20} color="#8b5cf6" />
              </View>
              <Text className="text-xs font-semibold text-purple-700 mt-2">{t('quickActions.paint')}</Text>
            </PressableCard>

            <PressableCard
              variant="default"
              padding="sm"
              className="flex-1 items-center bg-blue-50 border border-blue-100"
              onPress={() =>
                navigation.navigate('Measurements', {
                  propertyId: route.params.propertyId,
                  roomId: room!.id,
                })
              }
            >
              <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center">
                <Ruler size={20} color={COLORS.info} />
              </View>
              <Text className="text-xs font-semibold text-blue-700 mt-2">{t('quickActions.measure')}</Text>
            </PressableCard>

            <PressableCard
              variant="default"
              padding="sm"
              className="flex-1 items-center bg-green-50 border border-green-100"
              onPress={() =>
                navigation.navigate('AddExpense', {
                  propertyId: route.params.propertyId,
                  roomId: room!.id,
                })
              }
            >
              <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
                <DollarSign size={20} color={COLORS.primary[600]} />
              </View>
              <Text className="text-xs font-semibold text-green-700 mt-2">{t('quickActions.expense')}</Text>
            </PressableCard>

            <PressableCard
              variant="default"
              padding="sm"
              className="flex-1 items-center bg-pink-50 border border-pink-100"
              onPress={() =>
                navigation.navigate('AddAsset', {
                  propertyId: route.params.propertyId,
                  roomId: room!.id,
                })
              }
            >
              <View className="w-10 h-10 rounded-xl bg-pink-100 items-center justify-center">
                <Package size={20} color="#ec4899" />
              </View>
              <Text className="text-xs font-semibold text-pink-700 mt-2">{t('quickActions.assets')}</Text>
            </PressableCard>
          </View>
        </View>

        {/* Assets Section */}
        <View className="mx-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('asset.title')} ({assets.length})
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('AddAsset', {
                  propertyId: route.params.propertyId,
                  roomId: room!.id,
                })
              }
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <Plus size={16} color={COLORS.primary[600]} />
              <Text className="text-sm font-semibold text-primary-600 ml-1">{t('common.add')}</Text>
            </TouchableOpacity>
          </View>

          {assets.length === 0 ? (
            <View className={`rounded-2xl p-6 items-center ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={SHADOWS.sm}>
              <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-pink-900/40' : 'bg-pink-50'}`}>
                <Package size={28} color="#ec4899" />
              </View>
              <Text className={`text-base font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{t('room.noAssets')}</Text>
              <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('room.noAssetsDescription')}
              </Text>
              <Button
                title={t('room.addFirstAsset')}
                variant="primary"
                size="sm"
                onPress={() =>
                  navigation.navigate('AddAsset', {
                    propertyId: route.params.propertyId,
                    roomId: room!.id,
                  })
                }
                className="mt-4"
              />
            </View>
          ) : (
            <View className="gap-2.5">
              {assets.map((asset) => {
                const categoryConfig = ASSET_CATEGORIES[asset.category] || ASSET_CATEGORIES.other;
                const warranty = getWarrantyStatus(asset.warrantyEndDate);

                return (
                  <PressableCard
                    key={asset.id}
                    variant="default"
                    padding="md"
                    className={isDark ? 'bg-slate-800' : 'bg-white'}
                    onPress={() => navigation.navigate('AssetDetail', { assetId: asset.id })}
                  >
                    <View className="flex-row items-center">
                      {asset.imageUri ? (
                        <Image
                          source={{ uri: asset.imageUri }}
                          className="w-14 h-14 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="w-14 h-14 rounded-xl items-center justify-center"
                          style={{ backgroundColor: categoryConfig.color + '15' }}
                        >
                          <Package size={24} color={categoryConfig.color} />
                        </View>
                      )}

                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center">
                          <Text
                            className={`text-base font-semibold flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`}
                            numberOfLines={1}
                          >
                            {asset.name}
                          </Text>
                          {warranty && (
                            <View
                              className="px-2 py-0.5 rounded-md ml-2"
                              style={{ backgroundColor: warranty.color + '15' }}
                            >
                              <Text
                                className="text-xs font-medium"
                                style={{ color: warranty.color }}
                              >
                                {warranty.label}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {categoryConfig.label}
                          {asset.brand && ` • ${asset.brand}`}
                        </Text>

                        {asset.purchasePrice && (
                          <Text className={`text-sm font-semibold mt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {formatCurrency(asset.purchasePrice)}
                          </Text>
                        )}
                      </View>

                      <ChevronRight size={20} color={COLORS.slate[400]} className="ml-2" />
                    </View>
                  </PressableCard>
                );
              })}
            </View>
          )}
        </View>

        {/* Room Created */}
        {room && (
          <View className="mx-4 mt-6 flex-row items-center justify-center">
            <Calendar size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            <Text className={`text-xs ml-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('property.added')} {format(parseISO(room.createdAt), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
