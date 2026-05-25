const VAR_RE = /\{\{(\w[\w\s]*)\}\}/g;

function extractVariables(body) {
  const vars = [];
  const seen = new Set();
  VAR_RE.lastIndex = 0;
  let m;
  while ((m = VAR_RE.exec(body)) !== null) {
    const name = m[1];
    if (!seen.has(name)) { seen.add(name); vars.push(name); }
  }
  return vars;
}

function fillVariables(body, values) {
  return body.replace(/\{\{(\w[\w\s]*)\}\}/g, (_, name) =>
    values[name] !== undefined ? values[name] : `{{${name}}}`
  );
}
