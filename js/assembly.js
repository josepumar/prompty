import { extractVariables, fillVariables } from './variables.js';

let _prompt = null;
let _affixes = [];

export function openAssembly(prompt, affixes) {
  _prompt = prompt;
  _affixes = affixes;

  buildAffixToggles(affixes);
  buildVariableFields(prompt.body);

  document.getElementById('assembly-overlay').classList.remove('hidden');
  updatePreview();

  const firstVar = document.querySelector('#variable-fields input');
  if (firstVar) firstVar.focus();
  else document.getElementById('overlay-copy-btn').focus();
}

function buildAffixToggles(affixes) {
  const container = document.getElementById('affix-toggles');
  container.innerHTML = '';

  const prefixes = affixes.filter(a => a.type === 'prefix');
  const suffixes = affixes.filter(a => a.type === 'suffix');

  if (prefixes.length === 0 && suffixes.length === 0) return;

  if (prefixes.length > 0) {
    container.appendChild(sectionLabel('Prefixes', 'affix-toggle-section'));
    prefixes.forEach(a => container.appendChild(makeToggleRow(a)));
  }
  if (suffixes.length > 0) {
    container.appendChild(sectionLabel('Suffixes', 'affix-toggle-section'));
    suffixes.forEach(a => container.appendChild(makeToggleRow(a)));
  }
}

function sectionLabel(text, cls) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  return el;
}

function makeToggleRow(affix) {
  const row = document.createElement('div');
  row.className = 'affix-toggle-row';
  const label = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = affix.is_active;
  cb.dataset.affixId = affix.id;
  cb.dataset.affixType = affix.type;
  cb.addEventListener('change', updatePreview);
  label.appendChild(cb);
  label.appendChild(document.createTextNode(' ' + affix.name));
  row.appendChild(label);
  return row;
}

function buildVariableFields(body) {
  const container = document.getElementById('variable-fields');
  container.innerHTML = '';
  const vars = extractVariables(body);
  if (vars.length === 0) return;

  container.appendChild(sectionLabel('Variables', 'section-label'));
  vars.forEach(v => {
    const row = document.createElement('div');
    row.className = 'var-row';
    const label = document.createElement('label');
    label.textContent = v;
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.var = v;
    input.placeholder = `{{${v}}}`;
    input.addEventListener('input', updatePreview);
    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  });
}

function getAssemblyParts() {
  const prefixes = [];
  const suffixes = [];

  document.querySelectorAll('#affix-toggles [data-affix-id]').forEach(cb => {
    if (!cb.checked) return;
    const affix = _affixes.find(a => a.id === cb.dataset.affixId);
    if (!affix) return;
    if (affix.type === 'prefix') prefixes.push(affix.body);
    else suffixes.push(affix.body);
  });

  const varValues = {};
  document.querySelectorAll('#variable-fields [data-var]').forEach(input => {
    varValues[input.dataset.var] = input.value;
  });

  const body = fillVariables(_prompt.body, varValues);
  return { prefixes, body, suffixes };
}

function updatePreview() {
  if (!_prompt) return;
  const { prefixes, body, suffixes } = getAssemblyParts();
  const preview = document.getElementById('assembly-preview');
  preview.innerHTML = '';

  prefixes.forEach((p, i) => {
    if (i > 0) preview.appendChild(document.createTextNode('\n'));
    const span = document.createElement('span');
    span.className = 'preview-prefix';
    span.textContent = p;
    preview.appendChild(span);
  });

  if (prefixes.length > 0) preview.appendChild(document.createTextNode('\n'));

  const bodySpan = document.createElement('span');
  bodySpan.className = 'preview-body';
  bodySpan.textContent = body;
  preview.appendChild(bodySpan);

  if (suffixes.length > 0) preview.appendChild(document.createTextNode('\n'));

  suffixes.forEach((s, i) => {
    if (i > 0) preview.appendChild(document.createTextNode('\n'));
    const span = document.createElement('span');
    span.className = 'preview-suffix';
    span.textContent = s;
    preview.appendChild(span);
  });
}

export function closeAssembly() {
  document.getElementById('assembly-overlay').classList.add('hidden');
  _prompt = null;
  _affixes = [];
}

export function copyAssembly() {
  const { prefixes, body, suffixes } = getAssemblyParts();
  const text = [...prefixes, body, ...suffixes].join('\n');

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
  closeAssembly();
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}
