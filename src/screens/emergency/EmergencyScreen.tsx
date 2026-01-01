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
  Droplets,
  Flame,
  Zap,
  Fan,
  Plus,
  Phone,
  MapPin,
  AlertTriangle,
  Edit3,
  Trash2,
  Camera,
  Info,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { EmergencyShutoff, Property } from '../../types';
import { emergencyRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, PressableCard, Button, EmptyState, IconButton, InputDialog } from '../../components/ui';
import { COLORS, EMERGENCY_TYPES } from '../../constants/theme';
import { useToast, useTheme } from '../../contexts';
import { getImageQuality } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EmergencyRouteProp = RouteProp<RootStackParamList, 'Emergency'>;

const EMERGENCY_ICON_MAP = {
  water: Droplets,
  gas: Flame,
  electrical: Zap,
  hvac: Fan,
};

const EMERGENCY_NUMBERS = [
  { name: 'Emergency Services', number: '911', icon: AlertTriangle, color: '#dc2626' },
  { name: 'Gas Company', number: '1-800-GAS-LEAK', icon: Flame, color: '#f97316' },
  { name: 'Electric Company', number: '1-800-POWER', icon: Zap, color: '#eab308' },
  { name: 'Water Company', number: '1-800-WATER', icon: Droplets, color: '#0ea5e9' },
];

export function EmergencyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EmergencyRouteProp>();
  const { propertyId } = route.params;
  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [shutoffs, setShutoffs] = useState<EmergencyShutoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<'water' | 'gas' | 'electrical' | 'hvac' | null>(null);

  // State for InputDialog
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogType, setDialogType] = useState<'water' | 'gas' | 'electrical' | 'hvac'>('water');
  const [dialogDefaultValue, setDialogDefaultValue] = useState('');
  const [editingShutoff, setEditingShutoff] = useState<EmergencyShutoff | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, shutoffData] = await Promise.all([
        propertyRepository.getById(propertyId),
        emergencyRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setShutoffs(shutoffData);
    } catch (error) {
      console.error('Failed to load emergency data:', error);
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

  const handleCall = async (number: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${number.replace(/[^0-9]/g, '')}`);
  };

  const handleAddShutoff = (type: 'water' | 'gas' | 'electrical' | 'hvac') => {
    setDialogMode('add');
    setDialogType(type);
    setDialogDefaultValue('');
    setEditingShutoff(null);
    setShowLocationDialog(true);
  };

  const handleEditShutoff = (shutoff: EmergencyShutoff) => {
    setDialogMode('edit');
    setDialogType(shutoff.type);
    setDialogDefaultValue(shutoff.location);
    setEditingShutoff(shutoff);
    setShowLocationDialog(true);
  };

  const handleDialogConfirm = async (location: string) => {
    if (!location.trim()) {
      setShowLocationDialog(false);
      return;
    }

    try {
      if (dialogMode === 'add') {
        await emergencyRepository.create({
          propertyId,
          type: dialogType,
          location: location.trim(),
        });
        showSuccess('Shutoff location added');
      } else if (editingShutoff) {
        await emergencyRepository.update(editingShutoff.id, {
          location: location.trim(),
        });
        showSuccess('Shutoff location updated');
      }
      loadData();
    } catch (error) {
      console.error('Failed to save shutoff:', error);
      showError(dialogMode === 'add' ? 'Failed to add shutoff location' : 'Failed to update shutoff');
    } finally {
      setShowLocationDialog(false);
      setEditingShutoff(null);
    }
  };

  const handleDeleteShutoff = (shutoff: EmergencyShutoff) => {
    const typeConfig = EMERGENCY_TYPES[shutoff.type];
    Alert.alert(
      'Delete Shutoff',
      `Are you sure you want to delete this ${typeConfig.label.toLowerCase()} location?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await emergencyRepository.delete(shutoff.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete shutoff:', error);
              Alert.alert('Error', 'Failed to delete shutoff');
            }
          },
        },
      ]
    );
  };

  const handleAddPhoto = async (shutoff: EmergencyShutoff) => {
    const quality = await getImageQuality();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await emergencyRepository.update(shutoff.id, {
          imageUri: result.assets[0].uri,
        });
        showSuccess('Photo added');
        loadData();
      } catch (error) {
        console.error('Failed to add photo:', error);
        showError('Failed to add photo');
      }
    }
  };

  // Group shutoffs by type
  const groupedShutoffs = shutoffs.reduce((acc, shutoff) => {
    if (!acc[shutoff.type]) {
      acc[shutoff.type] = [];
    }
    acc[shutoff.type].push(shutoff);
    return acc;
  }, {} as Record<string, EmergencyShutoff[]>);

  // Get types that haven't been added yet
  const availableTypes = (['water', 'gas', 'electrical', 'hvac'] as const).filter(
    (type) => !groupedShutoffs[type] || groupedShutoffs[type].length === 0
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Emergency Info"
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
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
        {/* Emergency Contacts */}
        <View className="px-5 pt-5">
          <View className="flex-row items-center mb-3">
            <AlertTriangle size={18} color={COLORS.error} />
            <Text className={`text-sm font-semibold uppercase tracking-wide ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Emergency Contacts
            </Text>
          </View>
          <Card variant="default" padding="none" className="overflow-hidden">
            {EMERGENCY_NUMBERS.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <TouchableOpacity
                  key={contact.name}
                  onPress={() => handleCall(contact.number)}
                  className={`flex-row items-center px-4 py-3.5 ${
                    index < EMERGENCY_NUMBERS.length - 1 ? `border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}` : ''
                  }`}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${contact.color}15` }}
                  >
                    <Icon size={20} color={contact.color} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{contact.name}</Text>
                    <Text className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{contact.number}</Text>
                  </View>
                  <View className="bg-primary-500 px-3 py-1.5 rounded-lg">
                    <Phone size={16} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>

        {/* Shutoff Locations */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Shutoff Locations
            </Text>
          </View>

          {shutoffs.length === 0 ? (
            <Card variant="filled" padding="lg">
              <View className="items-center py-4">
                <View className={`w-14 h-14 rounded-2xl items-center justify-center mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <MapPin size={28} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  No shutoff locations added
                </Text>
                <Text className={`text-sm text-center mt-1 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Add the locations of your water, gas, and electrical shutoffs for quick access during emergencies
                </Text>
              </View>
            </Card>
          ) : (
            <View className="gap-3">
              {Object.entries(groupedShutoffs).map(([type, items]) => {
                const typeConfig = EMERGENCY_TYPES[type as keyof typeof EMERGENCY_TYPES];
                const Icon = EMERGENCY_ICON_MAP[type as keyof typeof EMERGENCY_ICON_MAP];

                return items.map((shutoff) => (
                  <Card key={shutoff.id} variant="default" padding="none">
                    <View className="p-4">
                      <View className="flex-row items-start">
                        <View
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${typeConfig.color}15` }}
                        >
                          <Icon size={24} color={typeConfig.color} />
                        </View>
                        <View className="flex-1 ml-3">
                          <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {typeConfig.label}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            <MapPin size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm ml-1 flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              {shutoff.location}
                            </Text>
                          </View>
                          {shutoff.instructions && (
                            <View className="flex-row items-start mt-2">
                              <Info size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                              <Text className={`text-sm ml-1 flex-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {shutoff.instructions}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Photo */}
                      {shutoff.imageUri && (
                        <Image
                          source={{ uri: shutoff.imageUri }}
                          className="w-full h-40 rounded-xl mt-3"
                          resizeMode="cover"
                        />
                      )}

                      {/* Actions */}
                      <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <TouchableOpacity
                          onPress={() => handleAddPhoto(shutoff)}
                          className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                          activeOpacity={0.7}
                        >
                          <Camera size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                          <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {shutoff.imageUri ? 'Update Photo' : 'Add Photo'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleEditShutoff(shutoff)}
                          className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                          activeOpacity={0.7}
                        >
                          <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteShutoff(shutoff)}
                          className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                ));
              })}
            </View>
          )}
        </View>

        {/* Add Shutoff Types */}
        {availableTypes.length > 0 && (
          <View className="px-5 mt-6 mb-8">
            <Text className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Add Shutoff Location
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {availableTypes.map((type) => {
                const typeConfig = EMERGENCY_TYPES[type];
                const Icon = EMERGENCY_ICON_MAP[type];

                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => handleAddShutoff(type)}
                    className={`flex-row items-center px-4 py-3 rounded-xl border border-dashed ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-300'}`}
                    activeOpacity={0.7}
                  >
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ backgroundColor: `${typeConfig.color}15` }}
                    >
                      <Icon size={16} color={typeConfig.color} />
                    </View>
                    <Text className={`text-sm font-medium ml-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {typeConfig.label}
                    </Text>
                    <Plus size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} className="ml-2" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Tips */}
        <View className="px-5 mb-10">
          <Card variant="filled" padding="md" className={isDark ? 'bg-amber-900/30 border border-amber-800' : 'bg-amber-50 border border-amber-100'}>
            <View className="flex-row items-start">
              <View className={`w-8 h-8 rounded-lg items-center justify-center ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}`}>
                <Info size={16} color={COLORS.warning} />
              </View>
              <View className="flex-1 ml-3">
                <Text className={`text-sm font-semibold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Safety Tip</Text>
                <Text className={`text-sm mt-1 leading-relaxed ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  Take photos of your shutoff valves and breaker panels. In an emergency, clear photos help you or emergency responders quickly locate and operate them.
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Location Input Dialog */}
      <InputDialog
        visible={showLocationDialog}
        title={dialogMode === 'add' ? `Add ${EMERGENCY_TYPES[dialogType].label}` : 'Edit Location'}
        message={dialogMode === 'add' ? 'Enter the location (e.g., "Basement, behind water heater")' : 'Update the shutoff location'}
        placeholder="Location"
        defaultValue={dialogDefaultValue}
        confirmText={dialogMode === 'add' ? 'Add' : 'Save'}
        onCancel={() => {
          setShowLocationDialog(false);
          setEditingShutoff(null);
        }}
        onConfirm={handleDialogConfirm}
      />
    </View>
  );
}
