import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { X, ExternalLink, FileText, Image as ImageIcon, Share2, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type DocumentType = 'pdf' | 'image' | 'unknown';

interface DocumentViewerProps {
  visible: boolean;
  uri: string | null;
  name?: string;
  fileType?: 'pdf' | 'image';
  onClose: () => void;
  onShare?: (uri: string) => void;
}

function detectDocumentType(uri: string | null, providedType?: 'pdf' | 'image'): DocumentType {
  if (providedType) return providedType;
  if (!uri) return 'unknown';

  const lowercaseUri = uri.toLowerCase();
  if (lowercaseUri.endsWith('.pdf')) return 'pdf';
  if (
    lowercaseUri.endsWith('.jpg') ||
    lowercaseUri.endsWith('.jpeg') ||
    lowercaseUri.endsWith('.png') ||
    lowercaseUri.endsWith('.gif') ||
    lowercaseUri.endsWith('.webp') ||
    lowercaseUri.endsWith('.bmp')
  ) {
    return 'image';
  }

  // Check for common image content types in data URIs
  if (lowercaseUri.startsWith('data:image/')) return 'image';
  if (lowercaseUri.startsWith('data:application/pdf')) return 'pdf';

  // Default based on common file:// paths
  if (lowercaseUri.includes('/camera/') || lowercaseUri.includes('/imagepicker/')) {
    return 'image';
  }

  return 'unknown';
}

export function DocumentViewer({
  visible,
  uri,
  name,
  fileType,
  onClose,
  onShare,
}: DocumentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documentType = detectDocumentType(uri, fileType);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleOpenExternal = async () => {
    if (!uri) return;

    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Cannot Open', 'Unable to open this document externally.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open document.');
    }
  };

  const handleShare = () => {
    if (onShare && uri) {
      onShare(uri);
    }
  };

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View className="absolute top-0 left-0 right-0 z-10 pt-14 pb-4 px-4 bg-black/80">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
              activeOpacity={0.7}
            >
              <X size={24} color="white" />
            </TouchableOpacity>

            <View className="flex-1 mx-4">
              <Text className="text-white text-base font-semibold text-center" numberOfLines={1}>
                {name || 'Document'}
              </Text>
              <Text className="text-white/60 text-xs text-center uppercase">
                {documentType}
              </Text>
            </View>

            <View className="flex-row gap-2">
              {onShare && (
                <TouchableOpacity
                  onPress={handleShare}
                  className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Share2 size={20} color="white" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleOpenExternal}
                className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
                activeOpacity={0.7}
              >
                <ExternalLink size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 pt-28 pb-10">
          {documentType === 'image' ? (
            <ScrollView
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              centerContent
            >
              {loading && (
                <View className="absolute inset-0 items-center justify-center">
                  <ActivityIndicator size="large" color="white" />
                </View>
              )}
              <Image
                source={{ uri }}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT * 0.7,
                }}
                resizeMode="contain"
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError('Failed to load image');
                }}
              />
            </ScrollView>
          ) : documentType === 'pdf' ? (
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-24 h-24 rounded-3xl bg-red-500/20 items-center justify-center mb-6">
                <FileText size={48} color="#ef4444" />
              </View>
              <Text className="text-white text-xl font-bold text-center mb-2">
                PDF Document
              </Text>
              <Text className="text-white/60 text-base text-center mb-8">
                {name || 'Document.pdf'}
              </Text>
              <Text className="text-white/40 text-sm text-center mb-6">
                PDF viewing is not available in-app.{'\n'}
                Tap below to open in an external viewer.
              </Text>
              <TouchableOpacity
                onPress={handleOpenExternal}
                className="bg-white rounded-2xl px-8 py-4 flex-row items-center"
                activeOpacity={0.8}
              >
                <ExternalLink size={20} color={COLORS.slate[900]} />
                <Text className="text-slate-900 font-semibold ml-2">Open in External App</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <View className="w-24 h-24 rounded-3xl bg-slate-500/20 items-center justify-center mb-6">
                <FileText size={48} color={COLORS.slate[400]} />
              </View>
              <Text className="text-white text-xl font-bold text-center mb-2">
                Unknown Document Type
              </Text>
              <Text className="text-white/60 text-base text-center mb-8">
                {name || 'Unknown file'}
              </Text>
              <TouchableOpacity
                onPress={handleOpenExternal}
                className="bg-white rounded-2xl px-8 py-4 flex-row items-center"
                activeOpacity={0.8}
              >
                <ExternalLink size={20} color={COLORS.slate[900]} />
                <Text className="text-slate-900 font-semibold ml-2">Try Opening Externally</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View className="absolute inset-0 items-center justify-center bg-black/80">
              <Text className="text-red-400 text-lg font-medium">{error}</Text>
              <TouchableOpacity
                onPress={handleOpenExternal}
                className="mt-4 bg-white/10 rounded-xl px-6 py-3"
                activeOpacity={0.7}
              >
                <Text className="text-white font-medium">Try External App</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bottom hint */}
        {documentType === 'image' && (
          <View className="absolute bottom-6 left-0 right-0 items-center">
            <Text className="text-white/50 text-xs">Pinch to zoom</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
