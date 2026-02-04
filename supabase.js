// supabase.js - FlexiWork Supabase Client (native: iOS/Android). Web uses supabase.web.js
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// === SUPABASE CONFIG ===
const supabaseUrl = 'https://ewudhvaunpsnevrgweor.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dWRodmF1bnBzbmV2cmd3ZW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTUxNDksImV4cCI6MjA3Nzk5MTE0OX0.N-nRw972VGQn7fxihOxFn6-GQYkvCN6YhHF8gd8RLkM';

// === STORAGE ADAPTER ===
const webStorage = {
  getItem: (key) => {
    try {
      return Promise.resolve(typeof window !== 'undefined' ? localStorage.getItem(key) : null);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined') localStorage.setItem(key, value);
    } catch {}
    return Promise.resolve();
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(key);
    } catch {}
    return Promise.resolve();
  },
};

const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

// === CREATE CLIENT ===
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export default supabase;
