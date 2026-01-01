import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  onShare?: (uri: string) => void;
}

export function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
  onShare,
}: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setLoading(true);
      // Scroll to initial image
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      }, 0);
    }
  }, [visible, initialIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
      setCurrentIndex(newIndex);
      setLoading(true);
      Haptics.selectionAsync();
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      scrollRef.current?.scrollTo({ x: newIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(newIndex);
      setLoading(true);
      Haptics.selectionAsync();
    }
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: newIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(newIndex);
      setLoading(true);
      Haptics.selectionAsync();
    }
  };

  const handleShare = () => {
    if (onShare && images[currentIndex]) {
      onShare(images[currentIndex]);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  if (images.length === 0) return null;

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
        <View className="absolute top-0 left-0 right-0 z-10 pt-14 pb-4 px-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
              activeOpacity={0.7}
            >
              <X size={24} color="white" />
            </TouchableOpacity>

            {images.length > 1 && (
              <View className="bg-black/50 px-3 py-1.5 rounded-full">
                <Text className="text-white text-sm font-medium">
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>
            )}

            <View className="flex-row gap-2">
              {onShare && (
                <TouchableOpacity
                  onPress={handleShare}
                  className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Share2 size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Image Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {images.map((uri, index) => (
            <View
              key={`${uri}-${index}`}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              className="items-center justify-center"
            >
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                centerContent
                onScrollBeginDrag={() => setIsZoomed(true)}
                onScrollEndDrag={(e) => {
                  const zoomScale = e.nativeEvent.zoomScale || 1;
                  setIsZoomed(zoomScale > 1);
                }}
              >
                {loading && index === currentIndex && (
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
                />
              </ScrollView>
            </View>
          ))}
        </ScrollView>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                onPress={goToPrevious}
                className="absolute left-4 top-1/2 -mt-6 w-12 h-12 rounded-full bg-black/40 items-center justify-center"
                activeOpacity={0.7}
              >
                <ChevronLeft size={28} color="white" />
              </TouchableOpacity>
            )}

            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                onPress={goToNext}
                className="absolute right-4 top-1/2 -mt-6 w-12 h-12 rounded-full bg-black/40 items-center justify-center"
                activeOpacity={0.7}
              >
                <ChevronRight size={28} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Bottom Dots Indicator */}
        {images.length > 1 && images.length <= 10 && (
          <View className="absolute bottom-12 left-0 right-0 flex-row justify-center gap-2">
            {images.map((_, index) => (
              <View
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </View>
        )}

        {/* Zoom hint */}
        <View className="absolute bottom-6 left-0 right-0 items-center">
          <Text className="text-white/50 text-xs">Pinch to zoom</Text>
        </View>
      </View>
    </Modal>
  );
}

// Single image viewer helper
interface SingleImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onShare?: (uri: string) => void;
}

export function SingleImageViewer({
  visible,
  imageUri,
  onClose,
  onShare,
}: SingleImageViewerProps) {
  if (!imageUri) return null;

  return (
    <ImageViewer
      visible={visible}
      images={[imageUri]}
      initialIndex={0}
      onClose={onClose}
      onShare={onShare}
    />
  );
}
