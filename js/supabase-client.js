import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL_KEY = 'prompty_sb_url';
const SB_KEY_KEY = 'prompty_sb_key';

let _client = null;

export function isConfigured() {
  return !!(localStorage.getItem(SB_URL_KEY) && localStorage.getItem(SB_KEY_KEY));
}

export function initSupabase(url, key) {
  localStorage.setItem(SB_URL_KEY, url);
  localStorage.setItem(SB_KEY_KEY, key);
  _client = createClient(url, key);
  return _client;
}

export function getSupabase() {
  if (_client) return _client;
  const url = localStorage.getItem(SB_URL_KEY);
  const key = localStorage.getItem(SB_KEY_KEY);
  if (url && key) {
    _client = createClient(url, key);
    return _client;
  }
  return null;
}

export function resetConfig() {
  localStorage.removeItem(SB_URL_KEY);
  localStorage.removeItem(SB_KEY_KEY);
  _client = null;
}
