import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  Check,
  Phone,
  Mail,
  Building2,
  Star,
  Users,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { workerRepository } from '../../services/database';
import { Button, Input, IconButton, TextArea } from '../../components/ui';
import { COLORS, WORKER_SPECIALTIES, SHADOWS } from '../../constants/theme';
import { useToast, useTheme } from '../../contexts';
import { validateEmail, validatePhone } from '../../utils/validation';
import { getImageQuality } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function AddWorkerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [rating, setRating] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant access to your photo library');
      return;
    }

    const quality = await getImageQuality();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera access');
      return;
    }

    const quality = await getImageQuality();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  const handleRatingPress = (value: number) => {
    setRating(rating === value ? undefined : value);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name');
      return;
    }

    if (selectedSpecialties.length === 0) {
      Alert.alert('Required', 'Please select at least one specialty');
      return;
    }

    // Validate email if provided
    if (email.trim()) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        Alert.alert('Invalid Email', emailValidation.error);
        return;
      }
    }

    // Validate phone if provided
    if (phone.trim()) {
      const phoneValidation = validatePhone(phone);
      if (!phoneValidation.isValid) {
        Alert.alert('Invalid Phone', phoneValidation.error);
        return;
      }
    }

    setLoading(true);

    try {
      await workerRepository.create({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        specialty: selectedSpecialties,
        rating,
        notes: notes.trim() || undefined,
        imageUri,
      });

      showSuccess('Worker added successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to create worker:', error);
      showError('Failed to create worker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`} style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <IconButton
          icon={<X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />}
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Worker</Text>
        <Button
          title="Save"
          variant="primary"
          size="sm"
          loading={loading}
          onPress={handleSave}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo Section */}
          <View className="items-center mb-6">
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              className={`w-28 h-28 rounded-full overflow-hidden items-center justify-center ${isDark ? 'bg-pink-900/30' : 'bg-pink-100'}`}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <Users size={40} color="#ec4899" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickImage}
              className="mt-2"
              activeOpacity={0.7}
            >
              <Text className="text-sm font-medium text-primary-600">
                {imageUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Input
            label="Name"
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            containerClassName="mb-4"
            required
          />

          {/* Contact Info */}
          <View className={`rounded-2xl p-4 mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Contact Information
            </Text>

            <View className={`flex-row items-center rounded-xl px-4 py-3 border mb-3 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
              <Phone size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              <Input
                placeholder="Phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                containerClassName="flex-1 ml-3"
                className="border-0 p-0 bg-transparent"
              />
            </View>

            <View className={`flex-row items-center rounded-xl px-4 py-3 border mb-3 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
              <Mail size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              <Input
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerClassName="flex-1 ml-3"
                className="border-0 p-0 bg-transparent"
              />
            </View>

            <View className={`flex-row items-center rounded-xl px-4 py-3 border ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
              <Building2 size={18} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
              <Input
                placeholder="Company name (optional)"
                value={company}
                onChangeText={setCompany}
                containerClassName="flex-1 ml-3"
                className="border-0 p-0 bg-transparent"
              />
            </View>
          </View>

          {/* Specialties */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Specialties <Text className="text-red-500">*</Text>
            </Text>
            <View className="flex-row flex-wrap">
              {WORKER_SPECIALTIES.map((specialty) => {
                const isSelected = selectedSpecialties.includes(specialty);
                return (
                  <TouchableOpacity
                    key={specialty}
                    onPress={() => toggleSpecialty(specialty)}
                    activeOpacity={0.7}
                    className={`px-3.5 py-2 rounded-xl mr-2 mb-2 border-2 ${
                      isSelected ? 'border-primary-500 bg-primary-50' : isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <Text
                        className={`text-sm font-medium ${
                          isSelected ? 'text-primary-700' : isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {specialty}
                      </Text>
                      {isSelected && (
                        <Check size={14} color={COLORS.primary[600]} className="ml-1.5" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rating */}
          <View className="mb-4">
            <Text className={`text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Rating (Optional)
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => handleRatingPress(value)}
                  activeOpacity={0.7}
                  className="flex-1 items-center py-3 rounded-xl border-2"
                  style={{
                    borderColor:
                      rating !== undefined && value <= rating
                        ? '#f59e0b'
                        : isDark ? COLORS.slate[600] : COLORS.slate[200],
                    backgroundColor:
                      rating !== undefined && value <= rating
                        ? isDark ? '#78350f' : '#fef3c7'
                        : isDark ? COLORS.slate[800] : '#fff',
                  }}
                >
                  <Star
                    size={24}
                    color="#f59e0b"
                    fill={rating !== undefined && value <= rating ? '#f59e0b' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <TextArea
            label="Notes"
            placeholder="Add any additional notes about this worker..."
            value={notes}
            onChangeText={setNotes}
            rows={3}
            containerClassName="mb-4"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
