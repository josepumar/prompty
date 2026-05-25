const SB_URL_KEY = 'prompty_sb_url';
const SB_KEY_KEY = 'prompty_sb_key';

let _client = null;

function isConfigured() {
  return !!(localStorage.getItem(SB_URL_KEY) && localStorage.getItem(SB_KEY_KEY));
}

function initSupabase(url, key) {
  localStorage.setItem(SB_URL_KEY, url);
  localStorage.setItem(SB_KEY_KEY, key);
  _client = supabase.createClient(url, key, { auth: { detectSessionInUrl: false, persistSession: true, storage: window.localStorage } });
  return _client;
}

function getSupabase() {
  if (_client) return _client;
  const url = localStorage.getItem(SB_URL_KEY);
  const key = localStorage.getItem(SB_KEY_KEY);
  if (url && key) {
    _client = supabase.createClient(url, key, { auth: { detectSessionInUrl: false, persistSession: true, storage: window.localStorage } });
    return _client;
  }
  return null;
}

function resetConfig() {
  localStorage.removeItem(SB_URL_KEY);
  localStorage.removeItem(SB_KEY_KEY);
  _client = null;
}
