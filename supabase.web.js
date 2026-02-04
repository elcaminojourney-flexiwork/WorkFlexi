// supabase.web.js - FlexiWork Supabase Client (web only, no native AsyncStorage)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gqhcuwwzjowdplfyizyb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaGN1d3d6am93ZHBsZnlpenliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTQ3ODMsImV4cCI6MjA1MTEzMDc4M30.5dxURJnuMKf0gOFxEwdnLLfnf-N5Y9f_wq0DTxcHhq8';

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
