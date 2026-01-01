import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { Package, Check, X, Plus, Minus, Trash2 } from 'lucide-react-native';
import { COLORS, SHADOWS, ASSET_CATEGORIES } from '../../constants/theme';
import { Asset } from '../../types';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';
import { parseAmount } from '../../utils/validation';
import { useTheme } from '../../contexts';

export interface SelectedAsset {
  assetId: string;
  amount: number;
  notes?: string;
}

interface AssetSelectionModalProps {
  visible: boolean;
  assets: Asset[];
  selectedAssets: SelectedAsset[];
  onCancel: () => void;
  onConfirm: (selected: SelectedAsset[]) => void;
}

export function AssetSelectionModal({
  visible,
  assets,
  selectedAssets: initialSelected,
  onCancel,
  onConfirm,
}: AssetSelectionModalProps) {
  const { isDark } = useTheme();
  const [selected, setSelected] = useState<SelectedAsset[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [tempAmount, setTempAmount] = useState('');

  useEffect(() => {
    if (visible) {
      setSelected([...initialSelected]);
      setEditingAssetId(null);
      setTempAmount('');
    }
  }, [visible, initialSelected]);

  const getSelectedAsset = (assetId: string) => {
    return selected.find((s) => s.assetId === assetId);
  };

  const isSelected = (assetId: string) => {
    return selected.some((s) => s.assetId === assetId);
  };

  const toggleAsset = (assetId: string) => {
    if (isSelected(assetId)) {
      setSelected(selected.filter((s) => s.assetId !== assetId));
      if (editingAssetId === assetId) {
        setEditingAssetId(null);
        setTempAmount('');
      }
    } else {
      setSelected([...selected, { assetId, amount: 0 }]);
      setEditingAssetId(assetId);
      setTempAmount('');
    }
  };

  const updateAmount = (assetId: string, amount: number) => {
    setSelected(
      selected.map((s) => (s.assetId === assetId ? { ...s, amount } : s))
    );
  };

  const handleAmountBlur = () => {
    if (editingAssetId) {
      const parsedAmount = parseAmount(tempAmount);
      updateAmount(editingAssetId, parsedAmount);
      setEditingAssetId(null);
      setTempAmount('');
    }
  };

  const startEditingAmount = (assetId: string) => {
    const selectedAsset = getSelectedAsset(assetId);
    setEditingAssetId(assetId);
    setTempAmount(selectedAsset?.amount?.toString() || '');
  };

  const getTotalAmount = () => {
    return selected.reduce((sum, s) => sum + (s.amount || 0), 0);
  };

  const handleConfirm = () => {
    // Filter out assets with zero or no amount
    const validSelected = selected.filter((s) => s.amount > 0);
    onConfirm(validSelected);
  };

  const removeAsset = (assetId: string) => {
    setSelected(selected.filter((s) => s.assetId !== assetId));
    if (editingAssetId === assetId) {
      setEditingAssetId(null);
      setTempAmount('');
    }
  };

  const getCategoryConfig = (category: string) => {
    return ASSET_CATEGORIES[category as keyof typeof ASSET_CATEGORIES] || {
      color: COLORS.slate[500],
      label: category
    };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View
                className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}
                style={[SHADOWS.xl, { maxHeight: SCREEN_HEIGHT * 0.85, minHeight: SCREEN_HEIGHT * 0.5 }]}
              >
                {/* Header */}
                <View className={`flex-row items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
                    <X size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                  </TouchableOpacity>
                  <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Select Assets
                  </Text>
                  <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7}>
                    <Check size={24} color={COLORS.primary[600]} />
                  </TouchableOpacity>
                </View>

                {/* Selected Assets Summary */}
                {selected.length > 0 && (
                  <View className={`px-5 py-3 border-b ${isDark ? 'bg-primary-900/30 border-primary-800' : 'bg-primary-50 border-primary-100'}`}>
                    <View className="flex-row items-center justify-between">
                      <Text className={`text-sm font-medium ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
                        {selected.length} asset{selected.length > 1 ? 's' : ''} selected
                      </Text>
                      <Text className={`text-sm font-bold ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>
                        Total: {formatCurrency(getTotalAmount())}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Selected Assets with Amounts */}
                {selected.length > 0 && (
                  <View className={`px-5 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <Text className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Amounts per Asset
                    </Text>
                    {selected.map((item) => {
                      const asset = assets.find((a) => a.id === item.assetId);
                      if (!asset) return null;

                      const categoryConfig = getCategoryConfig(asset.category);

                      return (
                        <View
                          key={item.assetId}
                          className={`flex-row items-center py-2 border-b ${isDark ? 'border-slate-700' : 'border-slate-50'}`}
                        >
                          <View
                            className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: categoryConfig.color + (isDark ? '30' : '20') }}
                          >
                            <Package size={16} color={categoryConfig.color} />
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`} numberOfLines={1}>
                              {asset.name}
                            </Text>
                            {asset.brand && (
                              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {asset.brand}
                              </Text>
                            )}
                          </View>
                          <View className="flex-row items-center">
                            <Text className={`text-sm mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {getCurrencySymbol()}
                            </Text>
                            {editingAssetId === item.assetId ? (
                              <TextInput
                                value={tempAmount}
                                onChangeText={setTempAmount}
                                onBlur={handleAmountBlur}
                                keyboardType="decimal-pad"
                                autoFocus
                                placeholder="0.00"
                                placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                                className={`w-20 rounded-lg px-2 py-1 text-sm text-right ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'}`}
                              />
                            ) : (
                              <TouchableOpacity
                                onPress={() => startEditingAmount(item.assetId)}
                                activeOpacity={0.7}
                                className={`rounded-lg px-3 py-1 min-w-[60px] ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                              >
                                <Text className={`text-sm font-medium text-right ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                  {item.amount > 0 ? item.amount.toFixed(2) : 'Enter'}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => removeAsset(item.assetId)}
                              activeOpacity={0.7}
                              className="ml-2 p-1"
                            >
                              <Trash2 size={16} color={COLORS.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Asset List */}
                <ScrollView
                  style={{ flex: 1, minHeight: 200 }}
                  contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {assets.length === 0 ? (
                    <View className="items-center py-8">
                      <Package size={48} color={isDark ? COLORS.slate[600] : COLORS.slate[300]} />
                      <Text className={`text-base font-medium mt-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        No assets available
                      </Text>
                      <Text className={`text-sm mt-1 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Add assets to your property first
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Available Assets
                      </Text>
                      {assets.map((asset) => {
                        const isAssetSelected = isSelected(asset.id);
                        const categoryConfig = getCategoryConfig(asset.category);

                        return (
                          <TouchableOpacity
                            key={asset.id}
                            onPress={() => toggleAsset(asset.id)}
                            activeOpacity={0.7}
                            className={`flex-row items-center p-3 rounded-xl mb-2 border-2 ${
                              isAssetSelected
                                ? isDark ? 'border-primary-500 bg-primary-900/30' : 'border-primary-500 bg-primary-50'
                                : isDark ? 'border-slate-700 bg-slate-700' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <View
                              className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                              style={{ backgroundColor: categoryConfig.color + (isDark ? '30' : '20') }}
                            >
                              <Package size={20} color={categoryConfig.color} />
                            </View>
                            <View className="flex-1">
                              <Text
                                className={`text-base font-medium ${
                                  isAssetSelected
                                    ? isDark ? 'text-primary-400' : 'text-primary-700'
                                    : isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                numberOfLines={1}
                              >
                                {asset.name}
                              </Text>
                              <View className="flex-row items-center gap-2">
                                {asset.brand && (
                                  <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {asset.brand}
                                  </Text>
                                )}
                                {asset.model && (
                                  <Text className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {asset.model}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <View
                              className={`w-6 h-6 rounded-full items-center justify-center ${
                                isAssetSelected ? 'bg-primary-500' : isDark ? 'border-2 border-slate-500' : 'border-2 border-slate-300'
                              }`}
                            >
                              {isAssetSelected && (
                                <Check size={14} color="white" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
