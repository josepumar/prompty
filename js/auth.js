import { getSupabase } from './supabase-client.js';

export async function getSession() {
  const { data } = await getSupabase().auth.getSession();
  return data?.session ?? null;
}

export async function login(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function logout() {
  await getSupabase().auth.signOut();
}

export function onAuthStateChange(callback) {
  getSupabase().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
