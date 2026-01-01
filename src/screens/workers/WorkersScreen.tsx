import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Star,
  ChevronRight,
  Building2,
  DollarSign,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Worker } from '../../types';
import { workerRepository } from '../../services/database';
import { EmptyState, IconButton, Card, PressableCard, Avatar } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function WorkersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorkers = useCallback(async () => {
    try {
      const data = await workerRepository.getAll();
      setWorkers(data);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkers();
    }, [loadWorkers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkers();
  };

  const handleWorkerPress = (worker: Worker) => {
    navigation.navigate('WorkerDetail', { workerId: worker.id });
  };

  const handleAddWorker = () => {
    navigation.navigate('AddWorker');
  };

  // Filter workers based on search
  const filteredWorkers = workers.filter((worker) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      worker.name.toLowerCase().includes(query) ||
      worker.company?.toLowerCase().includes(query) ||
      worker.specialty.some((s) => s.toLowerCase().includes(query))
    );
  });

  // Calculate totals
  const totalPaid = workers.reduce((sum, w) => sum + w.totalPaid, 0);

  const hasData = workers.length > 0;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`px-5 pt-4 pb-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border-b`}>
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('worker.title')}</Text>
            <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('worker.subtitle')}</Text>
          </View>
          <View className="flex-row gap-2">
            <IconButton
              icon={<Search size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
              variant="default"
              onPress={() => {}}
            />
            <IconButton
              icon={<Plus size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
              variant="default"
              onPress={handleAddWorker}
            />
          </View>
        </View>

        {/* Summary Stats */}
        {hasData && (
          <View className="flex-row gap-3">
            <View className={`flex-1 flex-row items-center rounded-xl px-3 py-2.5 ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
              <Users size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
              <Text className={`text-sm font-semibold ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {workers.length} {workers.length === 1 ? t('worker.workerSingular') : t('worker.workerPlural')}
              </Text>
            </View>
            <View className={`flex-1 flex-row items-center rounded-xl px-3 py-2.5 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
              <DollarSign size={18} color={COLORS.primary[isDark ? 400 : 600]} />
              <Text className={`text-sm font-semibold ml-1 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
                {formatCurrency(totalPaid)} {t('worker.paid')}
              </Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {!hasData && !loading ? (
          <View className="flex-1 pt-12 px-8">
            <EmptyState
              icon={<Users size={44} color={COLORS.slate[400]} />}
              title={t('worker.emptyTitle')}
              description={t('worker.emptyDescription')}
              actionLabel={t('worker.addFirst')}
              onAction={handleAddWorker}
            />
          </View>
        ) : (
          <View className="px-5 gap-3">
            {filteredWorkers.map((worker) => (
              <PressableCard
                key={worker.id}
                variant="default"
                padding="md"
                onPress={() => handleWorkerPress(worker)}
              >
                <View className="flex-row items-center">
                  {/* Avatar */}
                  {worker.imageUri ? (
                    <Image
                      source={{ uri: worker.imageUri }}
                      className="w-14 h-14 rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-2xl bg-pink-100 items-center justify-center">
                      <Text className="text-xl font-bold text-pink-600">
                        {worker.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Info */}
                  <View className="flex-1 ml-4">
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
                        {worker.name}
                      </Text>
                      {worker.rating && (
                        <View className="flex-row items-center">
                          <Star size={14} color="#f59e0b" fill="#f59e0b" />
                          <Text className="text-sm font-semibold text-amber-600 ml-1">
                            {worker.rating.toFixed(1)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {worker.company && (
                      <View className="flex-row items-center mt-0.5">
                        <Building2 size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                        <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={1}>
                          {worker.company}
                        </Text>
                      </View>
                    )}

                    {/* Specialties */}
                    {worker.specialty.length > 0 && (
                      <View className="flex-row flex-wrap gap-1.5 mt-2">
                        {worker.specialty.slice(0, 3).map((spec, index) => (
                          <View
                            key={index}
                            className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                          >
                            <Text className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {spec}
                            </Text>
                          </View>
                        ))}
                        {worker.specialty.length > 3 && (
                          <View className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <Text className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              +{worker.specialty.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} className="ml-2" />
                </View>

                {/* Contact info and total paid */}
                <View className={`flex-row items-center justify-between mt-4 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <View className="flex-row items-center gap-3">
                    {worker.phone && (
                      <TouchableOpacity className="flex-row items-center">
                        <Phone size={14} color={COLORS.primary[600]} />
                      </TouchableOpacity>
                    )}
                    {worker.email && (
                      <TouchableOpacity className="flex-row items-center">
                        <Mail size={14} color={COLORS.primary[600]} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {formatCurrency(worker.totalPaid)} {t('worker.total')}
                  </Text>
                </View>
              </PressableCard>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
