function filterPrompts(prompts, keyword, selectedTagIds) {
  let result = prompts;

  if (keyword) {
    const kw = keyword.toLowerCase();
    result = result.filter(p =>
      (p.title || '').toLowerCase().includes(kw) ||
      (p.body || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
    );
  }

  if (selectedTagIds && selectedTagIds.size > 0) {
    result = result.filter(p => {
      const promptTagIds = new Set((p.prompt_tags || []).map(pt => pt.tag_id));
      for (const tid of selectedTagIds) {
        if (!promptTagIds.has(tid)) return false;
      }
      return true;
    });
  }

  return result;
}
