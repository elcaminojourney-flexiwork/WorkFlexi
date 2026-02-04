// supabase.web.js - FlexiWork Supabase Client (web only, no native AsyncStorage)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ewudhvaunpsnevrgweor.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3dWRodmF1bnBzbmV2cmd3ZW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTUxNDksImV4cCI6MjA3Nzk5MTE0OX0.N-nRw972VGQn7fxihOxFn6-GQYkvCN6YhHF8gd8RLkM';

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
