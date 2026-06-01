import { createClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: any = null;
let lastUrl: string = '';
let lastKey: string = '';

/**
 * Returns a cached Supabase client or instantiates a new one if the credentials changed.
 * Returns null if no valid credentials are provided.
 */
export function getSupabaseClient(): any {
  const savedUrl = localStorage.getItem('sb_url') || '';
  const savedKey = localStorage.getItem('sb_key') || '';

  if (!savedUrl.trim() || !savedKey.trim()) {
    cachedClient = null;
    return null;
  }

  // If credentials are identical to last instantiation, return cache
  if (cachedClient && savedUrl === lastUrl && savedKey === lastKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(savedUrl, savedKey, {
      auth: {
        persistSession: false // Disable session persistence to keep it simple
      }
    });
    lastUrl = savedUrl;
    lastKey = savedKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    cachedClient = null;
    return null;
  }
}

/**
 * Helper to check if credentials are saved in local storage.
 */
export function isSupabaseConfigured(): boolean {
  const url = localStorage.getItem('sb_url') || '';
  const key = localStorage.getItem('sb_key') || '';
  return url.trim() !== '' && key.trim() !== '';
}
