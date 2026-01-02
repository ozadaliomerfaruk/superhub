import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Plus,
  Trash2,
  Edit3,
  X,
  Tag,
  Receipt,
  Layers,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { CustomCategory, CustomCategoryType } from '../../types';
import { customCategoryRepository } from '../../services/database';
import { ScreenHeader, Card } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'expense_type' | 'expense_category' | 'bill_category';

const TABS: { key: TabType; icon: React.ReactNode }[] = [
  { key: 'expense_type', icon: <Tag size={18} /> },
  { key: 'expense_category', icon: <Layers size={18} /> },
  { key: 'bill_category', icon: <Receipt size={18} /> },
];

export function ManageCategoriesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>('expense_type');
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#3b82f6');

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
    '#78716c', '#64748b',
  ];

  const loadCategories = useCallback(async () => {
    try {
      // Initialize defaults if needed
      await customCategoryRepository.initializeDefaultCategories();

      const data = await customCategoryRepository.getByType(activeTab);
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadCategories();
    }, [loadCategories])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const openAddModal = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryColor('#3b82f6');
    setModalVisible(true);
  };

  const openEditModal = async (category: CustomCategory) => {
    if (category.isDefault) {
      Alert.alert(
        t('manageCategories.cannotEdit'),
        t('manageCategories.defaultCategoryInfo')
      );
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color || '#3b82f6');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert(t('common.error'), t('manageCategories.nameRequired'));
      return;
    }

    try {
      if (editingCategory) {
        await customCategoryRepository.update(editingCategory.id, {
          name: categoryName.trim(),
          color: categoryColor,
        });
      } else {
        await customCategoryRepository.create({
          type: activeTab,
          name: categoryName.trim(),
          color: categoryColor,
          isDefault: false,
          sortOrder: categories.length,
        });
      }
      setModalVisible(false);
      loadCategories();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save category:', error);
      Alert.alert(t('common.error'), t('manageCategories.saveError'));
    }
  };

  const handleDelete = (category: CustomCategory) => {
    if (category.isDefault) {
      Alert.alert(
        t('manageCategories.cannotDelete'),
        t('manageCategories.defaultCategoryInfo')
      );
      return;
    }

    Alert.alert(
      t('manageCategories.deleteCategory'),
      t('manageCategories.deleteConfirm', { name: category.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await customCategoryRepository.delete(category.id);
              loadCategories();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Failed to delete category:', error);
            }
          },
        },
      ]
    );
  };

  const getTabLabel = (key: TabType) => {
    switch (key) {
      case 'expense_type':
        return t('manageCategories.expenseTypes');
      case 'expense_category':
        return t('manageCategories.expenseCategories');
      case 'bill_category':
        return t('manageCategories.billCategories');
    }
  };

  const getCategoryDisplayName = (category: CustomCategory) => {
    // Try to get translated name for default categories
    if (category.isDefault) {
      const translationKey = activeTab === 'expense_type'
        ? `expense.types.${category.name.toLowerCase()}`
        : activeTab === 'bill_category'
          ? `bills.categories.${category.name}`
          : `expense.categories.${category.name}`;
      const translated = t(translationKey);
      // If translation exists and is different from key, use it
      if (translated && !translated.includes('.')) {
        return translated;
      }
    }
    return category.name;
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('manageCategories.title')}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={openAddModal}
            className="w-10 h-10 rounded-xl bg-primary-500 items-center justify-center"
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View className={`flex-row px-5 py-3 border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                setLoading(true);
              }}
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg mr-2 ${
                isActive
                  ? 'bg-primary-500'
                  : isDark ? 'bg-slate-700' : 'bg-slate-100'
              }`}
            >
              {React.cloneElement(tab.icon as React.ReactElement<{ color: string }>, {
                color: isActive ? '#ffffff' : isDark ? COLORS.slate[400] : COLORS.slate[600],
              })}
              <Text
                className={`ml-1.5 text-xs font-medium ${
                  isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
                numberOfLines={1}
              >
                {getTabLabel(tab.key)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {categories.length === 0 && !loading ? (
          <View className="items-center py-12">
            <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <Tag size={32} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
            </View>
            <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('manageCategories.noCategories')}
            </Text>
            <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('manageCategories.addFirstCategory')}
            </Text>
          </View>
        ) : (
          <View className="gap-2 pb-6">
            {categories.map((category) => (
              <Card key={category.id} variant="default" padding="none">
                <TouchableOpacity
                  onPress={() => openEditModal(category)}
                  onLongPress={() => handleDelete(category)}
                  className="flex-row items-center p-4"
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${category.color || '#3b82f6'}20` }}
                  >
                    <View
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color || '#3b82f6' }}
                    />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {getCategoryDisplayName(category)}
                    </Text>
                    {category.isDefault && (
                      <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {t('manageCategories.default')}
                      </Text>
                    )}
                  </View>
                  {!category.isDefault && (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => openEditModal(category)}
                        className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                      >
                        <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(category)}
                        className="w-8 h-8 rounded-lg items-center justify-center bg-red-100"
                      >
                        <Trash2 size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View className={`rounded-t-3xl px-5 pt-6 pb-10 ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingCategory ? t('manageCategories.editCategory') : t('manageCategories.addCategory')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
              </TouchableOpacity>
            </View>

            {/* Category Name */}
            <View className="mb-5">
              <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('manageCategories.categoryName')}
              </Text>
              <TextInput
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder={t('manageCategories.namePlaceholder')}
                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                className={`px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
              />
            </View>

            {/* Color Picker */}
            <View className="mb-6">
              <Text className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('manageCategories.categoryColor')}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => setCategoryColor(color)}
                    className={`w-10 h-10 rounded-xl items-center justify-center ${
                      categoryColor === color ? 'border-2 border-primary-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    {categoryColor === color && (
                      <View className="w-3 h-3 rounded-full bg-white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className={`flex-1 py-3.5 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              >
                <Text className={`text-center font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 py-3.5 rounded-xl bg-primary-500"
              >
                <Text className="text-center font-semibold text-white">
                  {t('common.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
