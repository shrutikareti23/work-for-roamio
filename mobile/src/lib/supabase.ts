import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config, isSupabaseConfigured } from './config';
import { LargeSecureStore } from './secure-storage';

/**
 * The one Supabase client the app uses (like a module-level db connection in Python).
 * It's null until mobile/.env has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        storage: Platform.OS === 'web' ? undefined : new LargeSecureStore(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Keep the login fresh only while the app is open (Supabase's recommendation for mobile).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
