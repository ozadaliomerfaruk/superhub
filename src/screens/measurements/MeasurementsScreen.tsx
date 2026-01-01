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
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Ruler,
  Plus,
  Edit3,
  Trash2,
  Camera,
  X,
  Check,
  MoveHorizontal,
  MoveVertical,
  Box,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { Measurement, Property, Room } from '../../types';
import { measurementRepository, propertyRepository, roomRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MeasurementsRouteProp = RouteProp<RootStackParamList, 'Measurements'>;

const UNIT_OPTIONS: Array<{ value: Measurement['unit']; label: string }> = [
  { value: 'in', label: 'Inches' },
  { value: 'ft', label: 'Feet' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'Meters' },
];

function formatMeasurement(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '-';
  return `${value} ${unit}`;
}

export function MeasurementsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MeasurementsRouteProp>();
  const { propertyId, roomId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formHeight, setFormHeight] = useState('');
  const [formDepth, setFormDepth] = useState('');
  const [formUnit, setFormUnit] = useState<Measurement['unit']>('in');
  const [formNotes, setFormNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const propertyData = await propertyRepository.getById(propertyId);
      setProperty(propertyData);

      if (roomId) {
        const roomData = await roomRepository.getById(roomId);
        setRoom(roomData);
        const data = await measurementRepository.getByRoomId(roomId);
        setMeasurements(data);
      } else {
        const data = await measurementRepository.getByPropertyId(propertyId);
        setMeasurements(data);
      }
    } catch (error) {
      console.error('Failed to load measurements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, roomId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const resetForm = () => {
    setFormName('');
    setFormWidth('');
    setFormHeight('');
    setFormDepth('');
    setFormUnit('in');
    setFormNotes('');
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Please enter a name for this measurement');
      return;
    }

    if (!formWidth && !formHeight && !formDepth) {
      Alert.alert('Error', 'Please enter at least one dimension');
      return;
    }

    try {
      const data = {
        propertyId,
        roomId: roomId || undefined,
        name: formName.trim(),
        width: formWidth ? parseFloat(formWidth) : undefined,
        height: formHeight ? parseFloat(formHeight) : undefined,
        depth: formDepth ? parseFloat(formDepth) : undefined,
        unit: formUnit,
        notes: formNotes.trim() || undefined,
      };

      if (editingId) {
        await measurementRepository.update(editingId, data);
      } else {
        await measurementRepository.create(data);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save measurement:', error);
      Alert.alert('Error', 'Failed to save measurement');
    }
  };

  const handleEdit = (measurement: Measurement) => {
    setFormName(measurement.name);
    setFormWidth(measurement.width?.toString() || '');
    setFormHeight(measurement.height?.toString() || '');
    setFormDepth(measurement.depth?.toString() || '');
    setFormUnit(measurement.unit);
    setFormNotes(measurement.notes || '');
    setEditingId(measurement.id);
    setShowAddForm(true);
  };

  const handleDelete = (measurement: Measurement) => {
    Alert.alert(
      'Delete Measurement',
      `Are you sure you want to delete "${measurement.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await measurementRepository.delete(measurement.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete measurement:', error);
              Alert.alert('Error', 'Failed to delete measurement');
            }
          },
        },
      ]
    );
  };

  const handleAddPhoto = async (measurement: Measurement) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await measurementRepository.update(measurement.id, {
          imageUri: result.assets[0].uri,
        });
        loadData();
      } catch (error) {
        console.error('Failed to add photo:', error);
        Alert.alert('Error', 'Failed to add photo');
      }
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Measurements"
        subtitle={room?.name || property?.name}
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
                  {editingId ? 'Edit Measurement' : 'Add Measurement'}
                </Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Name *</Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g., Window, Door, Closet"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Unit</Text>
                  <View className="flex-row gap-2">
                    {UNIT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setFormUnit(option.value)}
                        className={`flex-1 py-2.5 rounded-lg border items-center ${
                          formUnit === option.value
                            ? 'bg-primary-50 border-primary-500'
                            : isDark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            formUnit === option.value ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Width</Text>
                    <View className="flex-row items-center">
                      <MoveHorizontal size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} className="mr-2" />
                      <TextInput
                        value={formWidth}
                        onChangeText={setFormWidth}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        className={`flex-1 rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Height</Text>
                    <View className="flex-row items-center">
                      <MoveVertical size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} className="mr-2" />
                      <TextInput
                        value={formHeight}
                        onChangeText={setFormHeight}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        className={`flex-1 rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                      />
                    </View>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Depth</Text>
                    <View className="flex-row items-center">
                      <Box size={16} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} className="mr-2" />
                      <TextInput
                        value={formDepth}
                        onChangeText={setFormDepth}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        className={`flex-1 rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                      />
                    </View>
                  </View>
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Notes</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Any additional notes..."
                    multiline
                    numberOfLines={2}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    textAlignVertical="top"
                  />
                </View>

                <Button
                  title={editingId ? 'Update Measurement' : 'Save Measurement'}
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Measurements List */}
        {measurements.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <Ruler size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No measurements saved
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Save measurements for windows, doors, and spaces for future reference
                </Text>
                <Button
                  title="Add Measurement"
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-3 pb-8">
            {measurements.map((measurement) => (
              <Card key={measurement.id} variant="default" padding="none">
                <View className="p-4">
                  <View className="flex-row items-start">
                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                      <Ruler size={24} color={COLORS.info} />
                    </View>

                    <View className="flex-1 ml-3">
                      <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {measurement.name}
                      </Text>

                      <View className="flex-row flex-wrap items-center gap-3 mt-2">
                        {measurement.width !== undefined && (
                          <View className="flex-row items-center">
                            <MoveHorizontal size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              W: {formatMeasurement(measurement.width, measurement.unit)}
                            </Text>
                          </View>
                        )}
                        {measurement.height !== undefined && (
                          <View className="flex-row items-center">
                            <MoveVertical size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              H: {formatMeasurement(measurement.height, measurement.unit)}
                            </Text>
                          </View>
                        )}
                        {measurement.depth !== undefined && (
                          <View className="flex-row items-center">
                            <Box size={14} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                            <Text className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              D: {formatMeasurement(measurement.depth, measurement.unit)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {measurement.notes && (
                    <Text className={`text-sm mt-3 pt-3 border-t ${isDark ? 'text-slate-400 border-slate-700' : 'text-slate-500 border-slate-100'}`}>
                      {measurement.notes}
                    </Text>
                  )}

                  {measurement.imageUri && (
                    <Image
                      source={{ uri: measurement.imageUri }}
                      className="w-full h-32 rounded-xl mt-3"
                      resizeMode="cover"
                    />
                  )}

                  {/* Actions */}
                  <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                    <TouchableOpacity
                      onPress={() => handleAddPhoto(measurement)}
                      className={`flex-row items-center px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                      activeOpacity={0.7}
                    >
                      <Camera size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                      <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {measurement.imageUri ? 'Update' : 'Photo'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEdit(measurement)}
                      className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(measurement)}
                      className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
