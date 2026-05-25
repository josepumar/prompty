async function fetchPrompts() {
  const { data, error } = await getSupabase()
    .from('prompts')
    .select('id, title, body, description, created_at, updated_at, prompt_tags(tag_id)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createPrompt({ title, body, description, tagIds = [] }) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('prompts')
    .insert({ title, body, description })
    .select('id, title, body, description, created_at, updated_at')
    .single();
  if (error) throw error;
  if (tagIds.length > 0) {
    const { error: tagErr } = await sb
      .from('prompt_tags')
      .insert(tagIds.map(tag_id => ({ prompt_id: data.id, tag_id })));
    if (tagErr) throw tagErr;
  }
  return data;
}

async function updatePrompt(id, { title, body, description, tagIds = [] }) {
  const sb = getSupabase();
  const { error } = await sb.from('prompts').update({ title, body, description }).eq('id', id);
  if (error) throw error;

  const { error: delErr } = await sb.from('prompt_tags').delete().eq('prompt_id', id);
  if (delErr) throw delErr;

  if (tagIds.length > 0) {
    const { error: tagErr } = await sb
      .from('prompt_tags')
      .insert(tagIds.map(tag_id => ({ prompt_id: id, tag_id })));
    if (tagErr) throw tagErr;
  }
}

async function deletePrompt(id) {
  const { error } = await getSupabase().from('prompts').delete().eq('id', id);
  if (error) throw error;
}

async function duplicatePrompt(prompt) {
  const sb = getSupabase();

  const m = prompt.title.match(/^(.*?)\s*-(\d+)(?:\.\d+)?$/);
  let base, nn;
  if (m) {
    base = m[1];
    nn = parseInt(m[2], 10) + 1;
  } else {
    base = prompt.title;
    nn = 1;
  }

  let candidate = `${base} -${String(nn).padStart(2, '0')}`;

  const { data: exists } = await sb
    .from('prompts').select('id').eq('title', candidate).maybeSingle();

  if (exists) {
    let sub = 1;
    while (true) {
      const subCandidate = `${candidate}.${sub}`;
      const { data: subExists } = await sb
        .from('prompts').select('id').eq('title', subCandidate).maybeSingle();
      if (!subExists) { candidate = subCandidate; break; }
      sub++;
    }
  }

  const tagIds = (prompt.prompt_tags || []).map(pt => pt.tag_id);
  return createPrompt({ title: candidate, body: prompt.body, description: prompt.description || '', tagIds });
}
