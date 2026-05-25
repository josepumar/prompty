// ── State ──────────────────────────────────────────────
let prompts = [];
let affixes = [];
let tags = [];
let selectedPrompt = null;
let selectedTagIds = new Set();
let searchKeyword = '';
let editingPromptId = null;
let editingAffixId = null;

// ── Boot ───────────────────────────────────────────────

async function boot() {
  if (!isConfigured()) {
    showScreen('setup-screen');
    mountSetup(() => afterSetup());
    return;
  }
  await afterSetup();
}

async function afterSetup() {
  try {
    const session = await getSession();
    if (!session) { showScreen('login-screen'); return; }
    await loadApp();
  } catch {
    showScreen('login-screen');
  }
}

async function loadApp() {
  showScreen('app-shell');
  await Promise.all([loadPrompts(), loadAffixes(), loadTags()]);
  onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showScreen('login-screen');
  });
  renderAll();
  showEmptyState();
}

// ── Data ───────────────────────────────────────────────

async function loadPrompts() { prompts = await fetchPrompts(); }
async function loadAffixes() { affixes = await fetchAffixes(); }
async function loadTags()    { tags    = await fetchTags(); }

// ── Screens ────────────────────────────────────────────

function showScreen(id) {
  ['setup-screen', 'login-screen', 'app-shell'].forEach(s =>
    document.getElementById(s).classList.toggle('hidden', s !== id)
  );
}

// ── Render ─────────────────────────────────────────────

function renderAll() {
  renderPromptList();
  renderTagChips();
  renderAffixDrawer();
}

function renderPromptList() {
  const list = document.getElementById('prompt-list');
  const filtered = filterPrompts(prompts, searchKeyword, selectedTagIds);

  list.innerHTML = '';
  if (filtered.length === 0) {
    list.innerHTML = '<div class="list-empty">No prompts found.</div>';
    return;
  }

  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'prompt-item' + (selectedPrompt?.id === p.id ? ' active' : '');

    const title = document.createElement('div');
    title.className = 'prompt-item-title';
    title.textContent = p.title;

    const preview = document.createElement('div');
    preview.className = 'prompt-item-preview';
    preview.textContent = p.description || p.body.slice(0, 80);

    item.appendChild(title);
    item.appendChild(preview);
    item.addEventListener('click', () => selectPrompt(p));
    list.appendChild(item);
  });
}

function renderTagChips() {
  const container = document.getElementById('tag-chips');
  container.innerHTML = '';
  tags.forEach(t => {
    const chip = document.createElement('button');
    chip.className = 'tag-chip' + (selectedTagIds.has(t.id) ? ' active' : '');
    chip.textContent = t.name;
    chip.addEventListener('click', () => toggleTagFilter(t.id));
    container.appendChild(chip);
  });
}

function renderAffixDrawer() {
  const list = document.getElementById('affix-list');
  list.innerHTML = '';

  function renderGroup(group, label) {
    if (group.length === 0) return;
    const heading = document.createElement('div');
    heading.className = 'affix-group-label';
    heading.textContent = label;
    list.appendChild(heading);

    group.forEach(a => {
      const row = document.createElement('div');
      row.className = 'affix-row';

      const left = document.createElement('div');
      left.className = 'affix-row-left';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = a.is_active;
      cb.addEventListener('change', async () => {
        a.is_active = cb.checked;
        await updateAffix(a.id, { is_active: cb.checked });
      });

      const nameSpan = document.createElement('span');
      nameSpan.textContent = a.name;
      left.appendChild(cb);
      left.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.className = 'affix-row-actions';

      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'btn-xs';
      editBtn.addEventListener('click', () => openAffixModal(a));

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Del';
      delBtn.className = 'btn-xs btn-xs-danger';
      delBtn.addEventListener('click', () => handleDeleteAffix(a));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      row.appendChild(left);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }

  renderGroup(affixes.filter(a => a.type === 'prefix'), 'Prefixes');
  renderGroup(affixes.filter(a => a.type === 'suffix'), 'Suffixes');
}

// ── Selection & Views ──────────────────────────────────

function selectPrompt(prompt) {
  selectedPrompt = prompt;
  renderPromptList();
  showDetail();
}

function showDetail() {
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('prompt-detail').classList.remove('hidden');
  document.getElementById('prompt-form').classList.add('hidden');

  document.getElementById('detail-title').textContent = selectedPrompt.title;
  document.getElementById('detail-description').textContent = selectedPrompt.description || '';
  document.getElementById('detail-body').textContent = selectedPrompt.body;

  const tagsEl = document.getElementById('detail-tags');
  tagsEl.innerHTML = '';
  (selectedPrompt.prompt_tags || []).forEach(pt => {
    const tag = tags.find(t => t.id === pt.tag_id);
    if (!tag) return;
    const badge = document.createElement('span');
    badge.className = 'tag-badge';
    badge.textContent = tag.name;
    tagsEl.appendChild(badge);
  });
}

function showForm(prompt = null) {
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('prompt-detail').classList.add('hidden');
  document.getElementById('prompt-form').classList.remove('hidden');

  editingPromptId = prompt?.id ?? null;
  document.getElementById('form-title').value = prompt?.title ?? '';
  document.getElementById('form-description').value = prompt?.description ?? '';
  document.getElementById('form-body').value = prompt?.body ?? '';

  const picker = document.getElementById('form-tags-picker');
  picker.innerHTML = '';
  const promptTagIds = new Set((prompt?.prompt_tags || []).map(pt => pt.tag_id));
  tags.forEach(t => {
    const label = document.createElement('label');
    label.className = 'tag-picker-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = t.id;
    cb.checked = promptTagIds.has(t.id);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + t.name));
    picker.appendChild(label);
  });

  document.getElementById('form-title').focus();
}

function showEmptyState() {
  document.getElementById('empty-state').classList.remove('hidden');
  document.getElementById('prompt-detail').classList.add('hidden');
  document.getElementById('prompt-form').classList.add('hidden');
}

// ── Tag Filter ─────────────────────────────────────────

function toggleTagFilter(tagId) {
  if (selectedTagIds.has(tagId)) selectedTagIds.delete(tagId);
  else selectedTagIds.add(tagId);
  renderTagChips();
  renderPromptList();
}

// ── CRUD ───────────────────────────────────────────────

async function handleSave() {
  const title = document.getElementById('form-title').value.trim();
  if (!title) { alert('Title is required.'); return; }

  const description = document.getElementById('form-description').value.trim();
  const body = document.getElementById('form-body').value;
  const tagIds = [...document.querySelectorAll('#form-tags-picker input:checked')].map(cb => cb.value);

  try {
    if (editingPromptId) {
      await updatePrompt(editingPromptId, { title, body, description, tagIds });
      await loadPrompts();
      selectedPrompt = prompts.find(p => p.id === editingPromptId) ?? null;
    } else {
      const created = await createPrompt({ title, body, description, tagIds });
      await loadPrompts();
      selectedPrompt = prompts.find(p => p.id === created.id) ?? null;
    }
    editingPromptId = null;
    renderAll();
    if (selectedPrompt) showDetail(); else showEmptyState();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

async function handleDelete() {
  if (!selectedPrompt) return;
  if (!confirm(`Delete "${selectedPrompt.title}"?`)) return;
  try {
    await deletePrompt(selectedPrompt.id);
    selectedPrompt = null;
    await loadPrompts();
    renderAll();
    showEmptyState();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

async function handleDuplicate() {
  if (!selectedPrompt) return;
  try {
    const created = await duplicatePrompt(selectedPrompt);
    await loadPrompts();
    selectedPrompt = prompts.find(p => p.id === created.id) ?? null;
    renderAll();
    if (selectedPrompt) showDetail();
  } catch (err) {
    alert('Duplicate failed: ' + err.message);
  }
}

// ── Assembly ───────────────────────────────────────────

function handleCopy() {
  if (!selectedPrompt) return;
  openAssembly(selectedPrompt, affixes);
}

// ── Tags Modal ─────────────────────────────────────────

function openTagsModal() {
  document.getElementById('tags-modal').classList.remove('hidden');
  renderTagsModal();
  document.getElementById('new-tag-input').focus();
}

function closeTagsModal() {
  document.getElementById('tags-modal').classList.add('hidden');
}

function renderTagsModal() {
  const list = document.getElementById('tags-list');
  list.innerHTML = '';
  tags.forEach(t => {
    const row = document.createElement('div');
    row.className = 'modal-row';

    const name = document.createElement('span');
    name.className = 'modal-row-name';
    name.textContent = t.name;

    const actions = document.createElement('div');
    actions.className = 'modal-row-actions';

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.className = 'btn-xs';
    renameBtn.addEventListener('click', async () => {
      const newName = prompt(`Rename "${t.name}" to:`, t.name);
      if (!newName || newName.trim() === t.name) return;
      await renameTag(t.id, newName.trim());
      await loadTags();
      renderAll();
      renderTagsModal();
    });

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'btn-xs btn-xs-danger';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Delete tag "${t.name}"? It will be removed from all prompts.`)) return;
      await deleteTag(t.id);
      selectedTagIds.delete(t.id);
      await Promise.all([loadTags(), loadPrompts()]);
      renderAll();
      renderTagsModal();
    });

    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);
    row.appendChild(name);
    row.appendChild(actions);
    list.appendChild(row);
  });
}

// ── Affix Modal ────────────────────────────────────────

function openAffixModal(affix = null) {
  editingAffixId = affix?.id ?? null;
  document.getElementById('affix-modal-title').textContent = affix ? 'Edit Affix' : 'New Affix';
  document.getElementById('affix-type').value = affix?.type ?? 'prefix';
  document.getElementById('affix-name').value = affix?.name ?? '';
  document.getElementById('affix-body').value = affix?.body ?? '';
  document.getElementById('affix-active').checked = affix?.is_active ?? false;
  document.getElementById('affix-modal').classList.remove('hidden');
  document.getElementById('affix-name').focus();
}

function closeAffixModal() {
  document.getElementById('affix-modal').classList.add('hidden');
  editingAffixId = null;
}

async function handleSaveAffix() {
  const name = document.getElementById('affix-name').value.trim();
  if (!name) { alert('Name is required.'); return; }

  const type = document.getElementById('affix-type').value;
  const body = document.getElementById('affix-body').value;
  const is_active = document.getElementById('affix-active').checked;

  try {
    if (editingAffixId) {
      await updateAffix(editingAffixId, { type, name, body, is_active });
    } else {
      await createAffix({ type, name, body, is_active });
    }
    closeAffixModal();
    await loadAffixes();
    renderAffixDrawer();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

async function handleDeleteAffix(affix) {
  if (!confirm(`Delete affix "${affix.name}"?`)) return;
  try {
    await deleteAffix(affix.id);
    await loadAffixes();
    renderAffixDrawer();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

// ── Event Wiring ───────────────────────────────────────

function wireEvents() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.textContent = 'Signing in…';
    errorEl.classList.add('hidden');
    try {
      await login(email, password);
      await loadApp();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  document.getElementById('reset-setup-btn').addEventListener('click', () => {
    if (!confirm('Reset Supabase configuration?')) return;
    resetConfig();
    location.reload();
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    showScreen('login-screen');
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchKeyword = e.target.value;
    renderPromptList();
  });

  document.getElementById('new-prompt-btn').addEventListener('click', () => showForm());
  document.getElementById('new-prompt-btn-empty').addEventListener('click', () => showForm());

  document.getElementById('copy-btn').addEventListener('click', handleCopy);
  document.getElementById('edit-btn').addEventListener('click', () => showForm(selectedPrompt));
  document.getElementById('duplicate-btn').addEventListener('click', handleDuplicate);
  document.getElementById('delete-btn').addEventListener('click', handleDelete);

  document.getElementById('save-btn').addEventListener('click', handleSave);
  document.getElementById('cancel-btn').addEventListener('click', () => {
    if (selectedPrompt) showDetail(); else showEmptyState();
  });

  document.getElementById('overlay-close').addEventListener('click', closeAssembly);
  document.getElementById('overlay-copy-btn').addEventListener('click', copyAssembly);
  document.getElementById('assembly-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAssembly();
  });

  document.getElementById('tags-btn').addEventListener('click', openTagsModal);
  document.getElementById('tags-modal-close').addEventListener('click', closeTagsModal);
  document.getElementById('tags-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTagsModal();
  });
  document.getElementById('add-tag-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-tag-input');
    const name = input.value.trim();
    if (!name) return;
    await createTag(name);
    input.value = '';
    await loadTags();
    renderAll();
    renderTagsModal();
  });
  document.getElementById('new-tag-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-tag-btn').click();
  });

  document.getElementById('affix-toggle').addEventListener('click', () => {
    const body = document.getElementById('affix-drawer-body');
    body.classList.toggle('hidden');
    document.querySelector('.toggle-caret').textContent =
      body.classList.contains('hidden') ? '▾' : '▴';
  });

  document.getElementById('new-affix-btn').addEventListener('click', () => openAffixModal());
  document.getElementById('affix-modal-close').addEventListener('click', closeAffixModal);
  document.getElementById('affix-cancel-btn').addEventListener('click', closeAffixModal);
  document.getElementById('affix-save-btn').addEventListener('click', handleSaveAffix);
  document.getElementById('affix-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAffixModal();
  });

  document.addEventListener('keydown', (e) => {
    const assemblyOpen = !document.getElementById('assembly-overlay').classList.contains('hidden');

    if (assemblyOpen) {
      if (e.key === 'Escape') { closeAssembly(); return; }
      if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); copyAssembly(); return; }
      if (e.key === 'Enter' && !e.target.matches('input, textarea, button')) {
        e.preventDefault(); copyAssembly(); return;
      }
    }

    if (e.key === 'Escape') {
      if (!document.getElementById('tags-modal').classList.contains('hidden'))  { closeTagsModal(); return; }
      if (!document.getElementById('affix-modal').classList.contains('hidden')) { closeAffixModal(); return; }
      if (!document.getElementById('prompt-form').classList.contains('hidden')) {
        if (selectedPrompt) showDetail(); else showEmptyState();
      }
    }
  });

}

// ── Init ───────────────────────────────────────────────

wireEvents();
boot();
