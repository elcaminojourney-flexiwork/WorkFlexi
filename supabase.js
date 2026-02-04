// supabase.js - FlexiWork Supabase Client
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// === SUPABASE CONFIG ===
const supabaseUrl = 'https://gqhcuwwzjowdplfyizyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGN1d3d6am93ZHBsZnlpenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTQ3ODMsImV4cCI6MjA1MTEzMDc4M30.5dxURJnuMKf0gOFxEwdnLLfnf-N5Y9f_wq0DTxcHhq8';

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
