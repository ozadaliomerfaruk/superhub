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
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Images,
  Plus,
  Trash2,
  Camera,
  X,
  Check,
  ChevronRight,
  Calendar,
  DollarSign,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { RootStackParamList } from '../../navigation/types';
import { Renovation, Property } from '../../types';
import { renovationRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { useTheme } from '../../contexts';
import { formatDate, getCurrentISODate } from '../../utils/date';
import { formatCurrency } from '../../utils/currency';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RenovationsRouteProp = RouteProp<RootStackParamList, 'Renovations'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - 40;

export function RenovationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RenovationsRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRenovation, setSelectedRenovation] = useState<Renovation | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBeforeImage, setFormBeforeImage] = useState<string | null>(null);
  const [formCost, setFormCost] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [propertyData, renovationsData] = await Promise.all([
        propertyRepository.getById(propertyId),
        renovationRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setRenovations(renovationsData);
    } catch (error) {
      console.error('Failed to load renovations:', error);
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

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormBeforeImage(null);
    setFormCost('');
    setShowAddForm(false);
  };

  const handlePickBeforeImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormBeforeImage(result.assets[0].uri);
    }
  };

  const handleTakeBeforePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormBeforeImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!formBeforeImage) {
      Alert.alert('Error', 'Please add a "before" photo');
      return;
    }

    try {
      await renovationRepository.create({
        propertyId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        beforeImageUri: formBeforeImage,
        cost: formCost ? parseFloat(formCost) : undefined,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to create renovation:', error);
      Alert.alert('Error', 'Failed to create renovation');
    }
  };

  const handleAddAfterPhoto = async (renovation: Renovation) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await renovationRepository.update(renovation.id, {
          afterImageUri: result.assets[0].uri,
          completedDate: getCurrentISODate(),
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadData();
      } catch (error) {
        console.error('Failed to add after photo:', error);
        Alert.alert('Error', 'Failed to add after photo');
      }
    }
  };

  const handleDelete = (renovation: Renovation) => {
    Alert.alert(
      'Delete Renovation',
      `Are you sure you want to delete "${renovation.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await renovationRepository.delete(renovation.id);
              setSelectedRenovation(null);
              loadData();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert('Error', 'Failed to delete renovation');
            }
          },
        },
      ]
    );
  };

  const inProgress = renovations.filter((r) => !r.afterImageUri);
  const completed = renovations.filter((r) => r.afterImageUri);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Renovations"
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
        {/* Add Form */}
        {showAddForm && (
          <View className="px-5 pt-5">
            <Card variant="default" padding="md">
              <View className="flex-row items-center justify-between mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>New Renovation</Text>
                <TouchableOpacity onPress={resetForm} activeOpacity={0.7}>
                  <X size={22} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Title *</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g., Kitchen Remodel"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</Text>
                  <TextInput
                    value={formDescription}
                    onChangeText={setFormDescription}
                    placeholder="Describe the renovation..."
                    multiline
                    numberOfLines={2}
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                    textAlignVertical="top"
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Estimated Cost</Text>
                  <TextInput
                    value={formCost}
                    onChangeText={setFormCost}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`rounded-xl px-4 py-3 text-base border ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                    placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  />
                </View>

                <View>
                  <Text className={`text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Before Photo *</Text>
                  {formBeforeImage ? (
                    <View className="relative">
                      <Image
                        source={{ uri: formBeforeImage }}
                        className="w-full h-48 rounded-xl"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => setFormBeforeImage(null)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <X size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={handleTakeBeforePhoto}
                        className={`flex-1 py-4 rounded-xl items-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                        activeOpacity={0.7}
                      >
                        <Camera size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                        <Text className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Take Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handlePickBeforeImage}
                        className={`flex-1 py-4 rounded-xl items-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                        activeOpacity={0.7}
                      >
                        <Images size={24} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
                        <Text className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Choose</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <Button
                  title="Start Tracking"
                  onPress={handleSave}
                  variant="primary"
                  icon={<Check size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        )}

        {/* Empty State */}
        {renovations.length === 0 && !showAddForm ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-purple-900/40' : 'bg-purple-100'}`}>
                  <Sparkles size={32} color="#8b5cf6" />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No renovations yet
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track your home improvements with before & after photos
                </Text>
                <Button
                  title="Add Renovation"
                  onPress={() => setShowAddForm(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-6 pb-8">
            {/* In Progress */}
            {inProgress.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    In Progress ({inProgress.length})
                  </Text>
                </View>

                <View className="gap-3">
                  {inProgress.map((renovation) => (
                    <Card key={renovation.id} variant="default" padding="none">
                      <Image
                        source={{ uri: renovation.beforeImageUri }}
                        className="w-full h-40 rounded-t-xl"
                        resizeMode="cover"
                      />
                      <View className="absolute top-3 left-3">
                        <Badge label="Before" variant="warning" size="sm" />
                      </View>

                      <View className="p-4">
                        <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {renovation.title}
                        </Text>
                        {renovation.description && (
                          <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} numberOfLines={2}>
                            {renovation.description}
                          </Text>
                        )}

                        <View className="flex-row gap-2 mt-3">
                          <Button
                            title="Add After Photo"
                            onPress={() => handleAddAfterPhoto(renovation)}
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            icon={<Camera size={16} color="#fff" />}
                          />
                          <TouchableOpacity
                            onPress={() => handleDelete(renovation)}
                            className={`p-2.5 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
                            activeOpacity={0.7}
                          >
                            <Trash2 size={18} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <View>
                <View className="flex-row items-center mb-3">
                  <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  <Text className={`text-sm font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Completed ({completed.length})
                  </Text>
                </View>

                <View className="gap-3">
                  {completed.map((renovation) => (
                    <TouchableOpacity
                      key={renovation.id}
                      onPress={() => setSelectedRenovation(renovation)}
                      activeOpacity={0.9}
                    >
                      <Card variant="default" padding="none">
                        <BeforeAfterPreview renovation={renovation} />
                        <View className="p-4">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {renovation.title}
                              </Text>
                              <View className="flex-row items-center mt-1 gap-3">
                                {renovation.completedDate && (
                                  <View className="flex-row items-center">
                                    <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                                    <Text className={`text-xs ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {formatDate(renovation.completedDate, 'MMM d, yyyy')}
                                    </Text>
                                  </View>
                                )}
                                {renovation.cost && (
                                  <View className="flex-row items-center">
                                    <DollarSign size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                                    <Text className={`text-xs ml-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {formatCurrency(renovation.cost)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <ChevronRight size={20} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          </View>
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

      {/* Full Screen Comparison Modal */}
      {selectedRenovation && selectedRenovation.afterImageUri && (
        <BeforeAfterModal
          renovation={selectedRenovation}
          onClose={() => setSelectedRenovation(null)}
          onDelete={() => handleDelete(selectedRenovation)}
        />
      )}
    </View>
  );
}

interface BeforeAfterPreviewProps {
  renovation: Renovation;
}

function BeforeAfterPreview({ renovation }: BeforeAfterPreviewProps) {
  return (
    <View className="relative h-40 rounded-t-xl overflow-hidden">
      {/* Before Image (left half) */}
      <Image
        source={{ uri: renovation.beforeImageUri }}
        className="absolute inset-0 w-full h-full"
        resizeMode="cover"
      />
      {/* After Image (right half overlay) */}
      <View className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
        <Image
          source={{ uri: renovation.afterImageUri }}
          className="absolute right-0 top-0 h-full"
          style={{ width: SCREEN_WIDTH - 40 }}
          resizeMode="cover"
        />
      </View>
      {/* Center divider */}
      <View className="absolute left-1/2 top-0 bottom-0 w-1 bg-white" style={{ marginLeft: -2 }}>
        <View className="absolute top-1/2 -mt-4 -ml-3 w-7 h-7 rounded-full bg-white items-center justify-center shadow-md">
          <View className="flex-row">
            <View className="w-0.5 h-3 bg-slate-400 mx-0.5" />
            <View className="w-0.5 h-3 bg-slate-400 mx-0.5" />
          </View>
        </View>
      </View>
      {/* Labels */}
      <View className="absolute left-3 bottom-3">
        <Badge label="Before" variant="default" size="sm" />
      </View>
      <View className="absolute right-3 bottom-3">
        <Badge label="After" variant="success" size="sm" />
      </View>
    </View>
  );
}

interface BeforeAfterModalProps {
  renovation: Renovation;
  onClose: () => void;
  onDelete: () => void;
}

function BeforeAfterModal({ renovation, onClose, onDelete }: BeforeAfterModalProps) {
  const sliderPosition = useSharedValue(SLIDER_WIDTH / 2);
  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = sliderPosition.value;
    })
    .onUpdate((event) => {
      const newPosition = startX.value + event.translationX;
      sliderPosition.value = Math.max(20, Math.min(SLIDER_WIDTH - 20, newPosition));
    })
    .onEnd(() => {
      sliderPosition.value = withSpring(sliderPosition.value, {
        damping: 20,
        stiffness: 200,
      });
    });

  const sliderStyle = useAnimatedStyle(() => ({
    left: sliderPosition.value - 15,
  }));

  const afterOverlayStyle = useAnimatedStyle(() => ({
    width: SLIDER_WIDTH - sliderPosition.value,
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    left: sliderPosition.value - 2,
  }));

  return (
    <View className="absolute inset-0 bg-black z-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4">
        <View className="flex-1">
          <Text className="text-lg font-bold text-white">{renovation.title}</Text>
          {renovation.description && (
            <Text className="text-sm text-white/70 mt-0.5">{renovation.description}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="w-10 h-10 rounded-full bg-white/20 items-center justify-center ml-3"
          activeOpacity={0.7}
        >
          <X size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Comparison Slider */}
      <View className="flex-1 justify-center px-5">
        <View
          className="relative rounded-2xl overflow-hidden"
          style={{ width: SLIDER_WIDTH, height: SLIDER_WIDTH * 0.75 }}
        >
          {/* Before Image (full width) */}
          <Image
            source={{ uri: renovation.beforeImageUri }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />

          {/* After Image Overlay (right side) */}
          <Animated.View
            className="absolute right-0 top-0 bottom-0 overflow-hidden"
            style={afterOverlayStyle}
          >
            <Image
              source={{ uri: renovation.afterImageUri }}
              className="absolute right-0 top-0 h-full"
              style={{ width: SLIDER_WIDTH }}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Divider Line */}
          <Animated.View
            className="absolute top-0 bottom-0 w-1 bg-white"
            style={dividerStyle}
          />

          {/* Slider Handle */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              className="absolute top-1/2 -mt-6 w-12 h-12 rounded-full bg-white items-center justify-center shadow-lg"
              style={sliderStyle}
            >
              <View className="flex-row">
                <View className="w-0.5 h-5 bg-slate-400 mx-0.5 rounded-full" />
                <View className="w-0.5 h-5 bg-slate-400 mx-0.5 rounded-full" />
              </View>
            </Animated.View>
          </GestureDetector>

          {/* Labels */}
          <View className="absolute left-4 top-4">
            <Badge label="Before" variant="default" size="md" />
          </View>
          <View className="absolute right-4 top-4">
            <Badge label="After" variant="success" size="md" />
          </View>
        </View>

        <Text className="text-white/50 text-center text-sm mt-4">
          Drag the slider to compare
        </Text>
      </View>

      {/* Footer Info */}
      <View className="px-5 pb-10">
        <View className="flex-row items-center justify-center gap-6 mb-4">
          {renovation.completedDate && (
            <View className="flex-row items-center">
              <Calendar size={16} color="rgba(255,255,255,0.6)" />
              <Text className="text-white/80 ml-2">
                {formatDate(renovation.completedDate, 'MMMM d, yyyy')}
              </Text>
            </View>
          )}
          {renovation.cost && (
            <View className="flex-row items-center">
              <DollarSign size={16} color="rgba(255,255,255,0.6)" />
              <Text className="text-white/80 ml-1">{formatCurrency(renovation.cost)}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={onDelete}
          className="flex-row items-center justify-center py-3"
          activeOpacity={0.7}
        >
          <Trash2 size={18} color={COLORS.error} />
          <Text className="text-red-500 font-medium ml-2">Delete Renovation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
