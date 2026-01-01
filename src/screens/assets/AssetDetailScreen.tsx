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
  Camera,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Package,
  Hash,
  Clock,
  Wrench,
  MapPin,
  ExternalLink,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { Asset, Room, Expense } from '../../types';
import { assetRepository, roomRepository, expenseRepository } from '../../services/database';
import { ScreenHeader, Card, PressableCard, Button, IconButton, Badge, SingleImageViewer } from '../../components/ui';
import { COLORS, ASSET_CATEGORIES, EXPENSE_TYPES } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatRelativeDate } from '../../utils/date';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AssetDetailRouteProp = RouteProp<RootStackParamList, 'AssetDetail'>;

export function AssetDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AssetDetailRouteProp>();
  const { assetId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const assetData = await assetRepository.getById(assetId);
      setAsset(assetData);

      if (assetData?.roomId) {
        const roomData = await roomRepository.getById(assetData.roomId);
        setRoom(roomData);
      }

      const expensesData = await expenseRepository.getByAssetId(assetId);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Failed to load asset:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assetId]);

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
    navigation.navigate('EditAsset', { assetId });
  };

  const handleDelete = () => {
    Alert.alert(
      t('asset.delete'),
      `Are you sure you want to delete "${asset?.name}"? This action cannot be undone.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await assetRepository.delete(assetId);
              navigation.goBack();
            } catch (error) {
              console.error('Failed to delete asset:', error);
              Alert.alert(t('common.error'), 'Failed to delete asset');
            }
          },
        },
      ]
    );
  };

  const handleExpensePress = (expense: Expense) => {
    navigation.navigate('ExpenseDetail', { expenseId: expense.id });
  };

  const handleOpenManual = () => {
    if (asset?.manualUri) {
      Linking.openURL(asset.manualUri);
    }
  };

  if (!asset) {
    return (
      <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <ScreenHeader
          title={t('asset.title')}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? 'text-slate-400' : 'text-slate-500'}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  const categoryConfig = ASSET_CATEGORIES[asset.category] || ASSET_CATEGORIES.other;
  const totalRepairCost = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Check warranty status
  const warrantyStatus = (() => {
    if (!asset.warrantyEndDate) return null;
    const endDate = new Date(asset.warrantyEndDate);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: 'expired', label: t('common.error'), color: COLORS.slate[400], days: Math.abs(daysRemaining) };
    } else if (daysRemaining <= 30) {
      return { status: 'expiring', label: 'Expiring Soon', color: COLORS.warning, days: daysRemaining };
    } else {
      return { status: 'active', label: 'Active', color: COLORS.success, days: daysRemaining };
    }
  })();

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('asset.title')}
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
        {/* Hero Image */}
        {asset.imageUri && (
          <TouchableOpacity
            onPress={() => setShowImageViewer(true)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: asset.imageUri }}
              className="w-full h-56"
              resizeMode="cover"
            />
            <View className="absolute bottom-3 right-3 bg-black/50 px-2 py-1 rounded-md flex-row items-center">
              <Text className="text-white text-xs">Tap to view</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Asset Info */}
        <View className={`px-5 py-5 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
          <View className="flex-row items-start">
            {!asset.imageUri && (
              <View
                className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: `${categoryConfig.color}15` }}
              >
                <Package size={28} color={categoryConfig.color} />
              </View>
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Badge
                  label={categoryConfig.label}
                  color={categoryConfig.color}
                  size="sm"
                />
              </View>
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{asset.name}</Text>

              {/* Brand & Model */}
              {(asset.brand || asset.model) && (
                <Text className={`text-base mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {[asset.brand, asset.model].filter(Boolean).join(' ')}
                </Text>
              )}

              {/* Room location */}
              {room && (
                <View className="flex-row items-center mt-2">
                  <MapPin size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{room.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Warranty Status Banner */}
          {warrantyStatus && (
            <View
              className="flex-row items-center mt-4 p-3 rounded-xl"
              style={{
                backgroundColor:
                  warrantyStatus.status === 'expired'
                    ? COLORS.slate[100]
                    : warrantyStatus.status === 'expiring'
                    ? '#fef3c7'
                    : '#dcfce7',
              }}
            >
              {warrantyStatus.status === 'expired' ? (
                <AlertTriangle size={20} color={COLORS.slate[500]} />
              ) : warrantyStatus.status === 'expiring' ? (
                <AlertTriangle size={20} color={COLORS.warning} />
              ) : (
                <ShieldCheck size={20} color={COLORS.success} />
              )}
              <View className="flex-1 ml-3">
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      warrantyStatus.status === 'expired'
                        ? COLORS.slate[600]
                        : warrantyStatus.status === 'expiring'
                        ? '#92400e'
                        : '#166534',
                  }}
                >
                  Warranty {warrantyStatus.label}
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    color:
                      warrantyStatus.status === 'expired'
                        ? COLORS.slate[500]
                        : warrantyStatus.status === 'expiring'
                        ? '#a16207'
                        : '#15803d',
                  }}
                >
                  {warrantyStatus.status === 'expired'
                    ? `Expired ${warrantyStatus.days} days ago`
                    : `${warrantyStatus.days} days remaining`}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View className="flex-row gap-3 px-5 mt-5">
          {asset.purchasePrice && (
            <Card variant="default" padding="md" className={`flex-1 ${isDark ? 'bg-slate-800' : ''}`}>
              <View className="flex-row items-center mb-2">
                <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                  <DollarSign size={16} color={COLORS.success} />
                </View>
              </View>
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatCurrency(asset.purchasePrice)}
              </Text>
              <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('asset.purchasePrice')}</Text>
            </Card>
          )}

          <Card variant="default" padding="md" className={`flex-1 ${isDark ? 'bg-slate-800' : ''}`}>
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-orange-900/40' : 'bg-orange-100'}`}>
                <Wrench size={16} color={COLORS.categories.repair} />
              </View>
            </View>
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(totalRepairCost)}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Repairs</Text>
          </Card>

          <Card variant="default" padding="md" className={`flex-1 ${isDark ? 'bg-slate-800' : ''}`}>
            <View className="flex-row items-center mb-2">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                <Clock size={16} color={COLORS.info} />
              </View>
            </View>
            <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {expenses.length}
            </Text>
            <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Service Records</Text>
          </Card>
        </View>

        {/* Details Section */}
        <View className="px-5 mt-5">
          <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Details
          </Text>
          <Card variant="default" padding="none" className={isDark ? 'bg-slate-800' : ''}>
            {asset.serialNumber && (
              <View className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Hash size={18} color={COLORS.slate[500]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('asset.serialNumber')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{asset.serialNumber}</Text>
                </View>
              </View>
            )}

            {asset.purchaseDate && (
              <View className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <Calendar size={18} color={COLORS.slate[500]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('asset.purchaseDate')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(asset.purchaseDate)}
                  </Text>
                </View>
              </View>
            )}

            {asset.warrantyEndDate && (
              <View className={`flex-row items-center px-4 py-3.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  <ShieldCheck size={18} color={COLORS.slate[500]} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('asset.warrantyEndDate')}</Text>
                  <Text className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatDate(asset.warrantyEndDate)}
                  </Text>
                </View>
              </View>
            )}

            {asset.manualUri && (
              <TouchableOpacity
                onPress={handleOpenManual}
                className="flex-row items-center px-4 py-3.5"
                activeOpacity={0.7}
              >
                <View className={`w-9 h-9 rounded-xl items-center justify-center ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
                  <FileText size={18} color={COLORS.categories.document} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>User Manual</Text>
                  <Text className="text-base font-medium text-primary-600">View Document</Text>
                </View>
                <ExternalLink size={18} color={COLORS.primary[600]} />
              </TouchableOpacity>
            )}

            {!asset.serialNumber && !asset.purchaseDate && !asset.warrantyEndDate && !asset.manualUri && (
              <View className="px-4 py-4">
                <Text className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('common.noData')}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Notes */}
        {asset.notes && (
          <View className="px-5 mt-5">
            <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('maintenance.notes')}
            </Text>
            <Card variant="default" padding="md" className={isDark ? 'bg-slate-800' : ''}>
              <Text className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{asset.notes}</Text>
            </Card>
          </View>
        )}

        {/* Service History */}
        <View className="px-5 mt-5 mb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Service History
            </Text>
          </View>

          {expenses.length > 0 ? (
            <View className="gap-2">
              {expenses.slice(0, 5).map((expense) => {
                const typeConfig = EXPENSE_TYPES[expense.type] || EXPENSE_TYPES.other;
                return (
                  <PressableCard
                    key={expense.id}
                    variant="default"
                    padding="md"
                    onPress={() => handleExpensePress(expense)}
                    className={isDark ? 'bg-slate-800' : ''}
                  >
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: `${typeConfig.color}15` }}
                      >
                        <Wrench size={18} color={typeConfig.color} />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                          {expense.description}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                          <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatDate(expense.date)}
                          </Text>
                        </View>
                      </View>
                      <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {formatCurrency(expense.amount)}
                      </Text>
                    </View>
                  </PressableCard>
                );
              })}
            </View>
          ) : (
            <Card variant="filled" padding="lg" className={isDark ? 'bg-slate-800' : ''}>
              <View className="items-center py-4">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Wrench size={24} color={COLORS.slate[400]} />
                </View>
                <Text className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>No service records</Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Repairs linked to this asset will appear here
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Added Date */}
        <View className="px-5 pb-10">
          <View className="flex-row items-center justify-center py-3">
            <Calendar size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            <Text className={`text-sm ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Added {formatDate(asset.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      <SingleImageViewer
        visible={showImageViewer}
        imageUri={asset.imageUri || null}
        onClose={() => setShowImageViewer(false)}
      />
    </View>
  );
}
