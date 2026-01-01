import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Receipt,
  Home,
  MapPin,
  Package,
  User,
  ChevronRight,
  ExternalLink,
  Repeat,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { Expense, Property, Room, Asset, Worker, ExpenseAssetWithDetails } from '../../types';
import {
  expenseRepository,
  propertyRepository,
  roomRepository,
  assetRepository,
  workerRepository,
  expenseAssetRepository,
} from '../../services/database';
import { ScreenHeader, Card, PressableCard, Button, IconButton, Badge } from '../../components/ui';
import { COLORS, EXPENSE_TYPES, ASSET_CATEGORIES } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatRelativeDate } from '../../utils/date';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ExpenseDetailRouteProp = RouteProp<RootStackParamList, 'ExpenseDetail'>;

export function ExpenseDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ExpenseDetailRouteProp>();
  const { expenseId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [linkedAssets, setLinkedAssets] = useState<ExpenseAssetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const expenseData = await expenseRepository.getById(expenseId);
      setExpense(expenseData);

      if (expenseData) {
        const propertyData = await propertyRepository.getById(expenseData.propertyId);
        setProperty(propertyData);

        if (expenseData.roomId) {
          const roomData = await roomRepository.getById(expenseData.roomId);
          setRoom(roomData);
        }

        if (expenseData.assetId) {
          const assetData = await assetRepository.getById(expenseData.assetId);
          setAsset(assetData);
        }

        if (expenseData.workerId) {
          const workerData = await workerRepository.getById(expenseData.workerId);
          setWorker(workerData);
        }

        // Load linked assets
        const linkedAssetsData = await expenseAssetRepository.getByExpenseIdWithDetails(expenseId);
        setLinkedAssets(linkedAssetsData);
      }
    } catch (error) {
      console.error('Failed to load expense:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expenseId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEdit = () => {
    navigation.navigate('EditExpense', { expenseId });
  };

  const handleDelete = () => {
    Alert.alert(
      t('expense.delete'),
      t('expense.deleteConfirmation'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Update worker's total paid before deleting
              if (expense?.workerId && expense?.amount) {
                await workerRepository.updateTotalPaid(expense.workerId, -expense.amount);
              }
              await expenseRepository.delete(expenseId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete expense:', error);
              Alert.alert(t('common.error'), t('expense.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleViewReceipt = () => {
    if (expense?.receiptUri) {
      Linking.openURL(expense.receiptUri);
    }
  };

  const handlePropertyPress = () => {
    if (property) {
      navigation.navigate('PropertyDetail', { propertyId: property.id });
    }
  };

  const handleRoomPress = () => {
    if (room && property) {
      navigation.navigate('RoomDetail', { roomId: room.id, propertyId: property.id });
    }
  };

  const handleAssetPress = () => {
    if (asset) {
      navigation.navigate('AssetDetail', { assetId: asset.id });
    }
  };

  const handleWorkerPress = () => {
    if (worker) {
      navigation.navigate('WorkerDetail', { workerId: worker.id });
    }
  };

  if (!expense) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <ScreenHeader
          title={t('expense.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  const typeConfig = EXPENSE_TYPES[expense.type] || EXPENSE_TYPES.other;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('expense.details')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <View className="flex-row gap-2">
            <IconButton
              icon={<Edit3 size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
              variant="default"
              onPress={handleEdit}
            />
            <IconButton
              icon={<Trash2 size={20} color={COLORS.error} />}
              variant="default"
              onPress={handleDelete}
            />
          </View>
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
        {/* Receipt Image */}
        {expense.receiptUri && (
          <TouchableOpacity onPress={handleViewReceipt} activeOpacity={0.9}>
            <Image
              source={{ uri: expense.receiptUri }}
              className="w-full h-56"
              resizeMode="cover"
            />
            <View className="absolute bottom-3 right-3 bg-black/50 px-3 py-1.5 rounded-lg flex-row items-center">
              <ExternalLink size={14} color="#ffffff" />
              <Text className="text-white text-sm font-medium ml-1.5">View Full</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Amount Header */}
        <View className={`px-5 py-6 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <Badge
                  label={typeConfig.label}
                  color={typeConfig.color}
                  size="sm"
                />
                <Badge
                  label={expense.category}
                  color={COLORS.slate[500]}
                  size="sm"
                />
                {expense.isRecurring && (
                  <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                    <Repeat size={12} color={COLORS.categories.bill} />
                    <Text className={`text-xs font-medium ml-1 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>{t('expense.recurring')}</Text>
                  </View>
                )}
              </View>
              <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(expense.amount)}
              </Text>
              <Text className={`text-lg mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{expense.description}</Text>
            </View>
          </View>

          {/* Date */}
          <View className={`flex-row items-center mt-4 px-3 py-2.5 rounded-xl self-start ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
            <Calendar size={16} color={COLORS.slate[500]} />
            <Text className={`text-sm font-medium ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {formatDate(expense.date)}
            </Text>
            <Text className={`text-sm ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ({formatRelativeDate(expense.date)})
            </Text>
          </View>
        </View>

        {/* Tags */}
        {expense.tags && expense.tags.length > 0 && (
          <View className="px-5 pt-5">
            <View className="flex-row flex-wrap gap-2">
              {expense.tags.map((tag, index) => (
                <View
                  key={index}
                  className={`flex-row items-center px-3 py-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                >
                  <Tag size={12} color={COLORS.slate[500]} />
                  <Text className={`text-sm ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Linked Items */}
        <View className="px-5 mt-5">
          <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('common.linkedTo')}
          </Text>
          <Card variant="default" padding="none" className={isDark ? 'bg-slate-800' : ''}>
            {/* Property */}
            {property && (
              <TouchableOpacity
                onPress={handlePropertyPress}
                className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-primary-900/40' : 'bg-primary-50'}`}>
                  <Home size={20} color={COLORS.primary[600]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.property')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{property.name}</Text>
                </View>
                <ChevronRight size={20} color={COLORS.slate[400]} />
              </TouchableOpacity>
            )}

            {/* Room */}
            {room && (
              <TouchableOpacity
                onPress={handleRoomPress}
                className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
                  <MapPin size={20} color={COLORS.info} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.room')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{room.name}</Text>
                </View>
                <ChevronRight size={20} color={COLORS.slate[400]} />
              </TouchableOpacity>
            )}

            {/* Asset */}
            {asset && (
              <TouchableOpacity
                onPress={handleAssetPress}
                className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-cyan-900/40' : 'bg-cyan-50'}`}>
                  <Package size={20} color={COLORS.categories.asset} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.asset')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{asset.name}</Text>
                  {(asset.brand || asset.model) && (
                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {[asset.brand, asset.model].filter(Boolean).join(' ')}
                    </Text>
                  )}
                </View>
                <ChevronRight size={20} color={COLORS.slate[400]} />
              </TouchableOpacity>
            )}

            {/* Worker */}
            {worker && (
              <TouchableOpacity
                onPress={handleWorkerPress}
                className="flex-row items-center px-4 py-3.5"
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDark ? 'bg-pink-900/40' : 'bg-pink-50'}`}>
                  <User size={20} color={COLORS.categories.worker} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.worker')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{worker.name}</Text>
                  {worker.company && (
                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{worker.company}</Text>
                  )}
                </View>
                <ChevronRight size={20} color={COLORS.slate[400]} />
              </TouchableOpacity>
            )}

            {!property && !room && !asset && !worker && (
              <View className="px-4 py-4">
                <Text className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.noLinkedItems')}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Linked Assets Section */}
        {linkedAssets.length > 0 && (
          <View className="px-5 mt-5">
            <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('expense.costBreakdown')}
            </Text>
            <Card variant="default" padding="none" className={isDark ? 'bg-slate-800' : ''}>
              {linkedAssets.map((linkedAsset, index) => {
                const categoryConfig = ASSET_CATEGORIES[linkedAsset.assetCategory as keyof typeof ASSET_CATEGORIES] || {
                  color: COLORS.slate[500],
                  label: linkedAsset.assetCategory,
                };
                const isLast = index === linkedAssets.length - 1;

                return (
                  <TouchableOpacity
                    key={linkedAsset.id}
                    onPress={() => navigation.navigate('AssetDetail', { assetId: linkedAsset.assetId })}
                    className={`flex-row items-center px-4 py-3.5 ${!isLast ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}` : ''}`}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: categoryConfig.color + '20' }}
                    >
                      <Package size={20} color={categoryConfig.color} />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {linkedAsset.assetName}
                      </Text>
                      {(linkedAsset.assetBrand || linkedAsset.assetModel) && (
                        <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {[linkedAsset.assetBrand, linkedAsset.assetModel].filter(Boolean).join(' ')}
                        </Text>
                      )}
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-semibold text-primary-600">
                        {formatCurrency(linkedAsset.amount)}
                      </Text>
                      <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {Math.round((linkedAsset.amount / expense.amount) * 100)}%
                      </Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.slate[400]} className="ml-2" />
                  </TouchableOpacity>
                );
              })}
              {/* Total Row */}
              <View className={`flex-row items-center justify-between px-4 py-3 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                <Text className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('expense.totalAllocated')}
                </Text>
                <Text className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {formatCurrency(linkedAssets.reduce((sum, a) => sum + a.amount, 0))}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Receipt Section */}
        {expense.receiptUri && (
          <View className="px-5 mt-5">
            <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('expense.receipt')}
            </Text>
            <TouchableOpacity
              onPress={handleViewReceipt}
              activeOpacity={0.8}
            >
              <Card variant="default" padding="md" className={isDark ? 'bg-slate-800' : ''}>
                <View className="flex-row items-center">
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                    <Receipt size={24} color={COLORS.categories.document} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('expense.viewReceipt')}</Text>
                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('expense.tapToOpen')}</Text>
                  </View>
                  <ExternalLink size={20} color={COLORS.primary[600]} />
                </View>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {/* Created Date */}
        <View className="px-5 py-10">
          <View className="flex-row items-center justify-center py-3">
            <Clock size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            <Text className={`text-sm ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {t('common.added')} {formatDate(expense.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
