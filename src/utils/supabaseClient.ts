import { createClient } from '@supabase/supabase-js';

// Supabase client instance caching and configuration helper
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
  const savedUrl = (localStorage.getItem('sb_url') || (import.meta.env.VITE_SUPABASE_URL as string) || '').trim();
  const savedKey = (localStorage.getItem('sb_key') || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();

  if (!savedUrl || !savedKey || !savedUrl.startsWith('http')) {
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
        persistSession: false // Require credentials on page reload (confidential data protection)
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
  const url = (localStorage.getItem('sb_url') || (import.meta.env.VITE_SUPABASE_URL as string) || '').trim();
  const key = (localStorage.getItem('sb_key') || (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();
  
  const hasLocal = localStorage.getItem('sb_url') !== null && localStorage.getItem('sb_key') !== null;
  if (hasLocal) {
    return localStorage.getItem('sb_verified') !== 'false' && url !== '' && url.startsWith('http');
  }
  
  return url !== '' && key !== '' && url.startsWith('http');
}
