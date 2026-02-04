import { supabase } from '../supabase';
import { Platform, Alert } from 'react-native';
import { launchImageLibraryAsync, ImagePickerOptions } from '../utils/webImagePicker';

export type UploadResult = {
  url: string;
  path: string;
  error?: string;
};

/**
 * Upload profile photo to Supabase Storage (for employers)
 */
export async function uploadProfilePhoto(
  userId: string,
  imageUri: string
): Promise<UploadResult> {
  try {
    // Get file extension
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
    const filePath = `employer-profiles/${fileName}`;

    // Convert image to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('employer-profiles')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true, // Replace if exists
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('employer-profiles')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading profile photo:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload profile photo',
    };
  }
}

/**
 * Upload worker profile photo to Supabase Storage
 */
export async function uploadWorkerProfilePhoto(
  userId: string,
  imageUri: string
): Promise<UploadResult> {
  try {
    // Get file extension
    const fileExt = imageUri.split('.').pop() || 'jpg';
    const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
    const filePath = `worker-profiles/${fileName}`;

    // Convert image to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('worker-profiles')
      .upload(filePath, blob, {
        contentType: `image/${fileExt}`,
        upsert: true, // Replace if exists
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('worker-profiles')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading worker profile photo:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload profile photo',
    };
  }
}

/**
 * Upload CV/document to Supabase Storage
 */
export async function uploadDocument(
  userId: string,
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    // Get file extension
    const fileExt = fileName.split('.').pop() || 'pdf';
    const storageFileName = `${userId}/cv-${Date.now()}.${fileExt}`;
    const filePath = `employer-documents/${storageFileName}`;

    // Convert file to blob
    const response = await fetch(fileUri);
    const blob = await response.blob();

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('employer-documents')
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    // Get public URL (for private bucket, this will be a signed URL)
    const { data: urlData } = supabase.storage
      .from('employer-documents')
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error: any) {
    console.error('Error uploading document:', error);
    return {
      url: '',
      path: '',
      error: error.message || 'Failed to upload document',
    };
  }
}

/**
 * Pick image from device
 * Uses web fallback on web platform
 */
export async function pickImage(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Web implementation
      const result = await launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      } as ImagePickerOptions);

      if (result.cancelled || !result.uri) {
        return null;
      }

      return result.uri;
    } else {
      // Native implementation
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      return result.assets[0].uri;
    }
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
}

/**
 * Pick document from device
 */
export async function pickDocument(): Promise<{
  uri: string | null;
  name: string | null;
  mimeType: string | null;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets[0]) {
      return { uri: null, name: null, mimeType: null };
    }

    return {
      uri: result.assets[0].uri,
      name: result.assets[0].name,
      mimeType: result.assets[0].mimeType || 'application/pdf',
    };
  } catch (error) {
    console.error('Error picking document:', error);
    return { uri: null, name: null, mimeType: null };
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(bucket: string, filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
