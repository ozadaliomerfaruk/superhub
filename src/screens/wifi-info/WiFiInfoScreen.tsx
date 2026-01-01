import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Wifi,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Eye,
  EyeOff,
  Copy,
  Share2,
  Users,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Clipboard } from 'react-native';
import { RootStackParamList } from '../../navigation/types';
import { WiFiInfo, Property } from '../../types';
import { wifiInfoRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type WiFiInfoRouteProp = RouteProp<RootStackParamList, 'WiFiInfo'>;

export function WiFiInfoScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<WiFiInfoRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [networks, setNetworks] = useState<WiFiInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Form state
  const [formNetworkName, setFormNetworkName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsGuest, setFormIsGuest] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, networkData] = await Promise.all([
        propertyRepository.getById(propertyId),
        wifiInfoRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setNetworks(networkData);
    } catch (error) {
      console.error('Failed to load WiFi info:', error);
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

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyPassword = async (password: string) => {
    Clipboard.setString(password);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Password copied to clipboard');
  };

  const handleShare = async (network: WiFiInfo) => {
    try {
      await Share.share({
        message: `WiFi Network: ${network.networkName}\nPassword: ${network.password}`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const resetForm = () => {
    setFormNetworkName('');
    setFormPassword('');
    setFormIsGuest(false);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formNetworkName.trim() || !formPassword.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const data = {
        propertyId,
        networkName: formNetworkName.trim(),
        password: formPassword.trim(),
        isGuest: formIsGuest,
      };

      if (editingId) {
        await wifiInfoRepository.update(editingId, data);
      } else {
        await wifiInfoRepository.create(data);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save WiFi info:', error);
      Alert.alert('Error', 'Failed to save WiFi info');
    }
  };

  const handleEdit = (network: WiFiInfo) => {
    setFormNetworkName(network.networkName);
    setFormPassword(network.password);
    setFormIsGuest(network.isGuest);
    setEditingId(network.id);
    setShowAddForm(true);
  };

  const handleDelete = (network: WiFiInfo) => {
    Alert.alert(
      'Delete Network',
      `Are you sure you want to delete "${network.networkName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await wifiInfoRepository.delete(network.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete network:', error);
              Alert.alert('Error', 'Failed to delete network');
            }
          },
        },
      ]
    );
  };

  // Separate main and guest networks
  const mainNetworks = networks.filter((n) => !n.isGuest);
  const guestNetworks = networks.filter((n) => n.isGuest);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="WiFi Networks"
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
        {/* Add/Edit Form */}
        {showAddForm && (
          <View className="px-5 pt-5">
            <Card variant="default" padding="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingId ? 'Edit Network' : 'Add Network'}
                </Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Network Name *</Text>
                  <TextInput
                    value={formNetworkName}
                    onChangeText={setFormNetworkName}
                    placeholder="e.g., MyHomeWiFi"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password *</Text>
                  <TextInput
                    value={formPassword}
                    onChangeText={setFormPassword}
                    placeholder="WiFi password"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={false}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setFormIsGuest(!formIsGuest)}
                  className={`flex-row items-center p-4 rounded-xl border ${
                    formIsGuest
                      ? 'bg-primary-50 border-primary-500'
                      : isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                      formIsGuest ? 'border-primary-500 bg-primary-500' : isDark ? 'border-slate-500' : 'border-slate-300'
                    }`}
                  >
                    {formIsGuest && <Check size={14} color="#ffffff" />}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        formIsGuest ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      Guest Network
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Mark this as a guest network for visitors
                    </Text>
                  </View>
                  <Users size={20} color={formIsGuest ? COLORS.primary[600] : isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>

                <Button
                  title={editingId ? 'Update Network' : 'Save Network'}
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Networks List */}
        {networks.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Wifi size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No WiFi networks saved
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Save your WiFi credentials for easy sharing with guests
                </Text>
                <Button
                  title="Add Network"
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {/* Main Networks */}
            {mainNetworks.length > 0 && (
              <View>
                <View className="flex-row items-center mb-2">
                  <Lock size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Main Networks
                  </Text>
                </View>

                <View className="gap-2">
                  {mainNetworks.map((network) => (
                    <NetworkCard
                      key={network.id}
                      network={network}
                      isPasswordVisible={visiblePasswords[network.id] || false}
                      onTogglePassword={() => togglePasswordVisibility(network.id)}
                      onCopy={() => handleCopyPassword(network.password)}
                      onShare={() => handleShare(network)}
                      onEdit={() => handleEdit(network)}
                      onDelete={() => handleDelete(network)}
                      isDark={isDark}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Guest Networks */}
            {guestNetworks.length > 0 && (
              <View>
                <View className="flex-row items-center mb-2">
                  <Users size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Guest Networks
                  </Text>
                </View>

                <View className="gap-2">
                  {guestNetworks.map((network) => (
                    <NetworkCard
                      key={network.id}
                      network={network}
                      isPasswordVisible={visiblePasswords[network.id] || false}
                      onTogglePassword={() => togglePasswordVisibility(network.id)}
                      onCopy={() => handleCopyPassword(network.password)}
                      onShare={() => handleShare(network)}
                      onEdit={() => handleEdit(network)}
                      onDelete={() => handleDelete(network)}
                      isDark={isDark}
                    />
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

interface NetworkCardProps {
  network: WiFiInfo;
  isPasswordVisible: boolean;
  onTogglePassword: () => void;
  onCopy: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDark: boolean;
}

function NetworkCard({
  network,
  isPasswordVisible,
  onTogglePassword,
  onCopy,
  onShare,
  onEdit,
  onDelete,
  isDark,
}: NetworkCardProps) {
  return (
    <Card variant="default" padding="none">
      <View className="p-4">
        <View className="flex-row items-center">
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center ${
              network.isGuest
                ? isDark ? 'bg-purple-900/40' : 'bg-purple-100'
                : isDark ? 'bg-blue-900/40' : 'bg-blue-100'
            }`}
          >
            <Wifi size={24} color={network.isGuest ? '#a855f7' : COLORS.info} />
          </View>

          <View className="flex-1 ml-3">
            <View className="flex-row items-center">
              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{network.networkName}</Text>
              {network.isGuest && (
                <Badge label="Guest" variant="purple" size="sm" className="ml-2" />
              )}
            </View>

            <View className="flex-row items-center mt-1">
              <Text className={`text-sm font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isPasswordVisible ? network.password : '••••••••••••'}
              </Text>
              <TouchableOpacity
                onPress={onTogglePassword}
                className="ml-2 p-1"
                activeOpacity={0.7}
              >
                {isPasswordVisible ? (
                  <EyeOff size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                ) : (
                  <Eye size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <TouchableOpacity
            onPress={onCopy}
            className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            activeOpacity={0.7}
          >
            <Copy size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onShare}
            className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onEdit}
            className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
            activeOpacity={0.7}
          >
            <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}
