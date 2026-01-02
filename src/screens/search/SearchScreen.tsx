import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Search as SearchIcon,
  X,
  Home,
  DoorOpen,
  Package,
  Receipt,
  HardHat,
  ArrowRight,
  Clock,
  Filter,
  ChevronDown,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { Property, Room, Asset, Expense, Worker } from '../../types';
import {
  propertyRepository,
  roomRepository,
  assetRepository,
  expenseRepository,
  workerRepository,
} from '../../services/database';
import { ScreenHeader, Card, Badge } from '../../components/ui';
import { COLORS, ROOM_TYPES, ASSET_CATEGORIES, EXPENSE_TYPES } from '../../constants/theme';
import { formatDate, formatRelative } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';
import { useTheme, useTranslation } from '../../contexts';

// Expense filter options
const AMOUNT_RANGE_KEYS = [
  { key: 'all', min: 0, max: Infinity },
  { key: 'under100', min: 0, max: 100 },
  { key: '100-500', min: 100, max: 500 },
  { key: '500-1000', min: 500, max: 1000 },
  { key: 'over1000', min: 1000, max: Infinity },
];

const DATE_RANGE_KEYS = ['all', 'today', 'week', 'month', 'year'];

const EXPENSE_TYPE_FILTER_KEYS = ['all', 'repair', 'bill', 'maintenance', 'purchase', 'other'];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SearchResults {
  properties: Property[];
  rooms: (Room & { propertyName?: string })[];
  assets: (Asset & { propertyName?: string; roomName?: string })[];
  expenses: (Expense & { propertyName?: string })[];
  workers: Worker[];
}

type SearchCategory = 'all' | 'properties' | 'rooms' | 'assets' | 'expenses' | 'workers';

const CATEGORY_KEYS: Array<{ key: SearchCategory; icon: React.ElementType }> = [
  { key: 'all', icon: SearchIcon },
  { key: 'properties', icon: Home },
  { key: 'rooms', icon: DoorOpen },
  { key: 'assets', icon: Package },
  { key: 'expenses', icon: Receipt },
  { key: 'workers', icon: HardHat },
];

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SearchResults>({
    properties: [],
    rooms: [],
    assets: [],
    expenses: [],
    workers: [],
  });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [amountFilter, setAmountFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchError, setSearchError] = useState<string | null>(null);

  // Helper to check if expense matches date filter
  const matchesDateFilter = useCallback((expenseDate: string): boolean => {
    if (dateFilter === 'all') return true;

    const date = new Date(expenseDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (dateFilter) {
      case 'today':
        // Fixed: now properly checks only today, not future dates
        return date >= today && date < tomorrow;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo && date < tomorrow;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return date >= monthStart && date < tomorrow;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return date >= yearStart && date < tomorrow;
      default:
        return true;
    }
  }, [dateFilter]);

  // Helper to check if expense matches amount filter
  const matchesAmountFilter = useCallback((amount: number): boolean => {
    const range = AMOUNT_RANGE_KEYS.find(r => r.key === amountFilter);
    if (!range) return true;
    return amount >= range.min && amount < range.max;
  }, [amountFilter]);

  const performSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);

    try {
      const searchLower = searchQuery.toLowerCase();

      // Fetch properties once and reuse - Fixed N+1 query pattern
      const properties = await propertyRepository.getAll();
      const workers = await workerRepository.getAll();

      // Build rooms, assets, expenses in parallel using the single properties fetch
      const [allRooms, allAssets, allExpenses] = await Promise.all([
        Promise.all(properties.map(async (p) => {
          const rooms = await roomRepository.getByPropertyId(p.id);
          return rooms.map((r) => ({ ...r, propertyName: p.name }));
        })).then((arr) => arr.flat()),
        Promise.all(properties.map(async (p) => {
          const assets = await assetRepository.getByPropertyId(p.id);
          return assets.map((a) => ({ ...a, propertyName: p.name }));
        })).then((arr) => arr.flat()),
        Promise.all(properties.map(async (p) => {
          const expenses = await expenseRepository.getByPropertyId(p.id);
          return expenses.map((e) => ({ ...e, propertyName: p.name }));
        })).then((arr) => arr.flat()),
      ]);

      // Filter based on query
      const filteredProperties = properties.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.address.toLowerCase().includes(searchLower)
      );

      const filteredRooms = allRooms.filter(
        (r) =>
          r.name.toLowerCase().includes(searchLower) ||
          r.notes?.toLowerCase().includes(searchLower)
      );

      const filteredAssets = allAssets.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.brand?.toLowerCase().includes(searchLower) ||
          a.model?.toLowerCase().includes(searchLower) ||
          a.notes?.toLowerCase().includes(searchLower)
      );

      const filteredExpenses = allExpenses.filter(
        (e) =>
          (e.description.toLowerCase().includes(searchLower) ||
          e.category.toLowerCase().includes(searchLower)) &&
          matchesAmountFilter(e.amount) &&
          matchesDateFilter(e.date) &&
          (typeFilter === 'all' || e.type === typeFilter)
      );

      const filteredWorkers = workers.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.company?.toLowerCase().includes(searchLower) ||
          w.specialty.some((s) => s.toLowerCase().includes(searchLower))
      );

      setResults({
        properties: filteredProperties,
        rooms: filteredRooms,
        assets: filteredAssets,
        expenses: filteredExpenses,
        workers: filteredWorkers,
      });

      // Add to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [matchesDateFilter, matchesAmountFilter, typeFilter, recentSearches, t]);

  // Debounced search with proper dependencies
  useEffect(() => {
    if (!query.trim()) {
      setResults({ properties: [], rooms: [], assets: [], expenses: [], workers: [] });
      setHasSearched(false);
      setSearchError(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, category, amountFilter, dateFilter, typeFilter, performSearch]);

  const handleClearSearch = () => {
    setQuery('');
    setResults({ properties: [], rooms: [], assets: [], expenses: [], workers: [] });
    setHasSearched(false);
  };

  const handleRecentSearch = (search: string) => {
    setQuery(search);
  };

  const navigateToProperty = (property: Property) => {
    navigation.navigate('PropertyDetail', { propertyId: property.id });
  };

  const navigateToRoom = (room: Room & { propertyName?: string }) => {
    navigation.navigate('RoomDetail', { roomId: room.id, propertyId: room.propertyId });
  };

  const navigateToAsset = (asset: Asset) => {
    navigation.navigate('AssetDetail', { assetId: asset.id });
  };

  const navigateToExpense = (expense: Expense) => {
    navigation.navigate('ExpenseDetail', { expenseId: expense.id });
  };

  const navigateToWorker = (worker: Worker) => {
    navigation.navigate('WorkerDetail', { workerId: worker.id });
  };

  const totalResults =
    (category === 'all' || category === 'properties' ? results.properties.length : 0) +
    (category === 'all' || category === 'rooms' ? results.rooms.length : 0) +
    (category === 'all' || category === 'assets' ? results.assets.length : 0) +
    (category === 'all' || category === 'expenses' ? results.expenses.length : 0) +
    (category === 'all' || category === 'workers' ? results.workers.length : 0);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('search.title')}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Search Input */}
      <View className="px-5 pt-4">
        <View className={`flex-row items-center rounded-xl px-4 py-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border`}>
          <SearchIcon size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            className={`flex-1 ml-3 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <X size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          <View className="flex-row gap-2">
            {CATEGORY_KEYS.map((cat) => {
              const Icon = cat.icon;
              const isActive = category === cat.key;

              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setCategory(cat.key)}
                  className={`flex-row items-center px-3 py-2 rounded-lg ${
                    isActive ? 'bg-primary-500' : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')
                  } ${!isActive ? 'border' : ''}`}
                  activeOpacity={0.7}
                >
                  <Icon size={16} color={isActive ? '#ffffff' : (isDark ? COLORS.slate[400] : COLORS.slate[500])} />
                  <Text
                    className={`text-sm font-medium ml-1.5 ${
                      isActive ? 'text-white' : (isDark ? 'text-slate-300' : 'text-slate-600')
                    }`}
                  >
                    {t(`search.categories.${cat.key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Expense Filters Toggle */}
        {(category === 'expenses' || category === 'all') && (
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`flex-row items-center mt-3 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
            activeOpacity={0.7}
          >
            <Filter size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
            <Text className={`text-sm font-medium ml-2 flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Expense Filters
            </Text>
            <ChevronDown
              size={16}
              color={isDark ? COLORS.slate[400] : COLORS.slate[500]}
              style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
            />
          </TouchableOpacity>
        )}

        {/* Expense Filter Options */}
        {showFilters && (category === 'expenses' || category === 'all') && (
          <View className={`mt-2 p-3 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'} border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {/* Date Filter */}
            <View className="mb-3">
              <Text className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('expense.date')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {DATE_RANGE_KEYS.map((rangeKey) => (
                    <TouchableOpacity
                      key={rangeKey}
                      onPress={() => setDateFilter(rangeKey)}
                      className={`px-3 py-1.5 rounded-lg ${
                        dateFilter === rangeKey
                          ? 'bg-primary-500'
                          : (isDark ? 'bg-slate-700' : 'bg-slate-100')
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          dateFilter === rangeKey
                            ? 'text-white'
                            : (isDark ? 'text-slate-300' : 'text-slate-600')
                        }`}
                      >
                        {t(`search.dateRanges.${rangeKey}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Amount Filter */}
            <View className="mb-3">
              <Text className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('expense.amount')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {AMOUNT_RANGE_KEYS.map((range) => (
                    <TouchableOpacity
                      key={range.key}
                      onPress={() => setAmountFilter(range.key)}
                      className={`px-3 py-1.5 rounded-lg ${
                        amountFilter === range.key
                          ? 'bg-primary-500'
                          : (isDark ? 'bg-slate-700' : 'bg-slate-100')
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          amountFilter === range.key
                            ? 'text-white'
                            : (isDark ? 'text-slate-300' : 'text-slate-600')
                        }`}
                      >
                        {t(`search.amountRanges.${range.key}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Type Filter */}
            <View>
              <Text className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('expense.type')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {EXPENSE_TYPE_FILTER_KEYS.map((typeKey) => (
                    <TouchableOpacity
                      key={typeKey}
                      onPress={() => setTypeFilter(typeKey)}
                      className={`px-3 py-1.5 rounded-lg ${
                        typeFilter === typeKey
                          ? 'bg-primary-500'
                          : (isDark ? 'bg-slate-700' : 'bg-slate-100')
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          typeFilter === typeKey
                            ? 'text-white'
                            : (isDark ? 'text-slate-300' : 'text-slate-600')
                        }`}
                      >
                        {typeKey === 'all' ? t('common.all') : t(`expense.types.${typeKey}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Loading */}
        {loading && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color={COLORS.primary[600]} />
          </View>
        )}

        {/* Recent Searches */}
        {!hasSearched && recentSearches.length > 0 && !loading && (
          <View className="px-5 mt-4">
            <View className="flex-row items-center mb-2">
              <Clock size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('search.recentSearches')}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleRecentSearch(search)}
                  className={`px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border`}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search Error */}
        {searchError && !loading && (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <X size={32} color={COLORS.error} />
                <Text className={`text-base font-semibold text-center mt-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {searchError}
                </Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('common.tryAgain')}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* No Results */}
        {hasSearched && totalResults === 0 && !loading && !searchError && (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <SearchIcon size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                <Text className={`text-base font-semibold text-center mt-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('search.noResults', { query })}
                </Text>
                <Text className={`text-sm text-center mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t('common.tryDifferentSearch')}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {/* Results */}
        {!loading && (
          <View className="px-5 mt-4 gap-4 pb-8">
            {/* Properties */}
            {(category === 'all' || category === 'properties') && results.properties.length > 0 && (
              <View>
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Properties ({results.properties.length})
                </Text>
                <View className="gap-2">
                  {results.properties.map((property) => (
                    <TouchableOpacity
                      key={property.id}
                      onPress={() => navigateToProperty(property)}
                      activeOpacity={0.7}
                    >
                      <Card variant="default" padding="md">
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-xl bg-green-100 items-center justify-center">
                            <Home size={20} color={COLORS.success} />
                          </View>
                          <View className="flex-1 ml-3">
                            <Text className="text-base font-semibold text-slate-900">
                              {property.name}
                            </Text>
                            <Text className="text-sm text-slate-500">{property.address}</Text>
                          </View>
                          <ArrowRight size={18} color={COLORS.slate[400]} />
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Rooms */}
            {(category === 'all' || category === 'rooms') && results.rooms.length > 0 && (
              <View>
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Rooms ({results.rooms.length})
                </Text>
                <View className="gap-2">
                  {results.rooms.map((room) => {
                    const roomConfig = ROOM_TYPES[room.type];
                    return (
                      <TouchableOpacity
                        key={room.id}
                        onPress={() => navigateToRoom(room)}
                        activeOpacity={0.7}
                      >
                        <Card variant="default" padding="md">
                          <View className="flex-row items-center">
                            <View
                              className="w-10 h-10 rounded-xl items-center justify-center"
                              style={{ backgroundColor: `${roomConfig.color}15` }}
                            >
                              <DoorOpen size={20} color={roomConfig.color} />
                            </View>
                            <View className="flex-1 ml-3">
                              <Text className="text-base font-semibold text-slate-900">
                                {room.name}
                              </Text>
                              <Text className="text-sm text-slate-500">{room.propertyName}</Text>
                            </View>
                            <ArrowRight size={18} color={COLORS.slate[400]} />
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Assets */}
            {(category === 'all' || category === 'assets') && results.assets.length > 0 && (
              <View>
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Assets ({results.assets.length})
                </Text>
                <View className="gap-2">
                  {results.assets.map((asset) => {
                    const categoryConfig = ASSET_CATEGORIES[asset.category];
                    return (
                      <TouchableOpacity
                        key={asset.id}
                        onPress={() => navigateToAsset(asset)}
                        activeOpacity={0.7}
                      >
                        <Card variant="default" padding="md">
                          <View className="flex-row items-center">
                            <View
                              className="w-10 h-10 rounded-xl items-center justify-center"
                              style={{ backgroundColor: `${categoryConfig.color}15` }}
                            >
                              <Package size={20} color={categoryConfig.color} />
                            </View>
                            <View className="flex-1 ml-3">
                              <Text className="text-base font-semibold text-slate-900">
                                {asset.name}
                              </Text>
                              <Text className="text-sm text-slate-500">
                                {asset.brand} {asset.model ? `• ${asset.model}` : ''}
                              </Text>
                            </View>
                            <ArrowRight size={18} color={COLORS.slate[400]} />
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Expenses */}
            {(category === 'all' || category === 'expenses') && results.expenses.length > 0 && (
              <View>
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Expenses ({results.expenses.length})
                </Text>
                <View className="gap-2">
                  {results.expenses.map((expense) => {
                    const typeConfig = EXPENSE_TYPES[expense.type];
                    return (
                      <TouchableOpacity
                        key={expense.id}
                        onPress={() => navigateToExpense(expense)}
                        activeOpacity={0.7}
                      >
                        <Card variant="default" padding="md">
                          <View className="flex-row items-center">
                            <View
                              className="w-10 h-10 rounded-xl items-center justify-center"
                              style={{ backgroundColor: `${typeConfig.color}15` }}
                            >
                              <Receipt size={20} color={typeConfig.color} />
                            </View>
                            <View className="flex-1 ml-3">
                              <Text className="text-base font-semibold text-slate-900">
                                {expense.description}
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Text className="text-sm font-bold text-primary-600">
                                  {formatCurrency(expense.amount)}
                                </Text>
                                <Text className="text-sm text-slate-500">
                                  {formatDate(expense.date, 'MMM d, yyyy')}
                                </Text>
                              </View>
                            </View>
                            <ArrowRight size={18} color={COLORS.slate[400]} />
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Workers */}
            {(category === 'all' || category === 'workers') && results.workers.length > 0 && (
              <View>
                <Text className={`text-sm font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Workers ({results.workers.length})
                </Text>
                <View className="gap-2">
                  {results.workers.map((worker) => (
                    <TouchableOpacity
                      key={worker.id}
                      onPress={() => navigateToWorker(worker)}
                      activeOpacity={0.7}
                    >
                      <Card variant="default" padding="md">
                        <View className="flex-row items-center">
                          <View className="w-10 h-10 rounded-xl bg-pink-100 items-center justify-center">
                            <HardHat size={20} color="#ec4899" />
                          </View>
                          <View className="flex-1 ml-3">
                            <Text className="text-base font-semibold text-slate-900">
                              {worker.name}
                            </Text>
                            <Text className="text-sm text-slate-500">
                              {worker.specialty.slice(0, 2).join(', ')}
                            </Text>
                          </View>
                          <ArrowRight size={18} color={COLORS.slate[400]} />
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
    </View>
  );
}
