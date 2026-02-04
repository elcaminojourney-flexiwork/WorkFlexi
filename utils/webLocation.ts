/**
 * Web fallback for location services
 * Uses Geolocation API
 */

import { Platform } from 'react-native';

export interface LocationOptions {
  accuracy?: 'lowest' | 'low' | 'balanced' | 'high' | 'highest' | 'bestForNavigation';
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationData {
  coords: LocationCoords;
  timestamp: number;
}

/**
 * Get current location (web implementation)
 */
export async function getCurrentPositionAsync(
  options: LocationOptions = {}
): Promise<LocationData> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not available');
  }

  return new Promise((resolve, reject) => {
    const geoOptions: PositionOptions = {
      enableHighAccuracy: options.enableHighAccuracy ?? options.accuracy === 'high',
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 10000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      geoOptions
    );
  });
}

/**
 * Watch position changes
 */
export function watchPositionAsync(
  callback: (location: LocationData) => void,
  options: LocationOptions = {}
): number {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation is not available');
  }

  const geoOptions: PositionOptions = {
    enableHighAccuracy: options.enableHighAccuracy ?? options.accuracy === 'high',
    timeout: options.timeout ?? 15000,
    maximumAge: options.maximumAge ?? 10000,
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          altitudeAccuracy: position.coords.altitudeAccuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        },
        timestamp: position.timestamp,
      });
    },
    (error) => {
      console.error('Geolocation watch error:', error);
    },
    geoOptions
  );
}

/**
 * Clear position watch
 */
export function clearWatch(watchId: number) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}
