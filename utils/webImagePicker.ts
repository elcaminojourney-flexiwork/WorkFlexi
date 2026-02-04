/**
 * Web fallback for expo-image-picker
 * Uses HTML file input for image selection
 */

import { Platform } from 'react-native';

export interface ImagePickerOptions {
  mediaTypes?: 'images' | 'videos' | 'all';
  allowsEditing?: boolean;
  quality?: number;
  aspect?: [number, number];
  allowsMultipleSelection?: boolean;
}

export interface ImagePickerResult {
  cancelled: boolean;
  uri?: string;
  width?: number;
  height?: number;
  type?: string;
  base64?: string;
  assets?: Array<{
    uri: string;
    width: number;
    height: number;
    type: string;
    base64?: string;
  }>;
}

/**
 * Web implementation of image picker
 */
export async function launchImageLibraryAsync(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  if (Platform.OS !== 'web') {
    // Fallback to expo-image-picker on native
    const { launchImageLibraryAsync: nativeLaunch } = await import('expo-image-picker');
    return nativeLaunch(options);
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.mediaTypes === 'videos' 
      ? 'video/*' 
      : options.mediaTypes === 'all'
      ? 'image/*,video/*'
      : 'image/*';
    input.multiple = options.allowsMultipleSelection || false;
    input.style.display = 'none';

    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      
      if (files.length === 0) {
        resolve({ cancelled: true });
        document.body.removeChild(input);
        return;
      }

      const results = await Promise.all(
        files.map(async (file) => {
          const uri = URL.createObjectURL(file);
          
          // Get image dimensions
          const dimensions = await getImageDimensions(uri);
          
          // Convert to base64 if requested
          let base64: string | undefined;
          if (options.quality !== undefined) {
            base64 = await fileToBase64(file);
          }

          return {
            uri,
            width: dimensions.width,
            height: dimensions.height,
            type: file.type,
            base64,
          };
        })
      );

      document.body.removeChild(input);

      if (options.allowsMultipleSelection) {
        resolve({
          cancelled: false,
          assets: results,
        });
      } else {
        resolve({
          cancelled: false,
          ...results[0],
        });
      }
    };

    input.oncancel = () => {
      resolve({ cancelled: true });
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  });
}

export async function launchCameraAsync(
  options: ImagePickerOptions = {}
): Promise<ImagePickerResult> {
  if (Platform.OS !== 'web') {
    const { launchCameraAsync: nativeLaunch } = await import('expo-image-picker');
    return nativeLaunch(options);
  }

  // On web, fallback to file picker (camera access requires getUserMedia)
  // For better UX, we can implement camera access later
  return launchImageLibraryAsync(options);
}

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = uri;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
