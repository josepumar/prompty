async function fetchAffixes() {
  const { data, error } = await getSupabase()
    .from('affixes')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

async function createAffix({ type, name, body, is_active = false }) {
  const sb = getSupabase();
  const { data: existing } = await sb
    .from('affixes').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sort_order = existing?.length ? existing[0].sort_order + 1 : 0;

  const { data, error } = await sb
    .from('affixes')
    .insert({ type, name, body, is_active, sort_order })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateAffix(id, updates) {
  const { error } = await getSupabase().from('affixes').update(updates).eq('id', id);
  if (error) throw error;
}

async function deleteAffix(id) {
  const { error } = await getSupabase().from('affixes').delete().eq('id', id);
  if (error) throw error;
}
