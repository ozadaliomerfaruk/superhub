import { settingsRepository } from '../services/database';

export type PhotoQuality = 'original' | 'high' | 'medium' | 'low';

/**
 * Quality value mapping for ImagePicker
 * These values are used directly by expo-image-picker's quality option
 */
export const QUALITY_VALUES: Record<PhotoQuality, number> = {
  original: 1,
  high: 0.85,
  medium: 0.6,
  low: 0.4,
};

/**
 * Gets the quality value for ImagePicker based on user settings
 * @returns The quality value (0-1) for ImagePicker
 */
export async function getImageQuality(): Promise<number> {
  try {
    const settings = await settingsRepository.get();
    const photoQuality = (settings?.photoQuality || 'high') as PhotoQuality;
    return QUALITY_VALUES[photoQuality];
  } catch (error) {
    console.warn('Failed to get quality setting, using default:', error);
    return QUALITY_VALUES.high;
  }
}

/**
 * Passthrough function for image URI
 * Note: Without expo-image-manipulator, compression is handled by ImagePicker's quality option
 * This function is a passthrough for now to maintain API compatibility
 * @param uri The image URI
 * @returns The same image URI
 */
export async function compressImage(uri: string): Promise<string> {
  // Without expo-image-manipulator, we rely on ImagePicker's quality setting
  // This is a passthrough to maintain API compatibility
  return uri;
}

/**
 * Gets estimated file size reduction percentage based on quality
 */
export function getEstimatedReduction(quality: PhotoQuality): string {
  switch (quality) {
    case 'original':
      return 'Full size';
    case 'high':
      return '~20% smaller';
    case 'medium':
      return '~50% smaller';
    case 'low':
      return '~70% smaller';
  }
}
