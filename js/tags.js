import { getSupabase } from './supabase-client.js';

export async function fetchTags() {
  const { data, error } = await getSupabase()
    .from('tags')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createTag(name) {
  const { data, error } = await getSupabase()
    .from('tags')
    .insert({ name })
    .select('id, name')
    .single();
  if (error) throw error;
  return data;
}

export async function renameTag(id, name) {
  const { error } = await getSupabase().from('tags').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deleteTag(id) {
  const { error } = await getSupabase().from('tags').delete().eq('id', id);
  if (error) throw error;
}
