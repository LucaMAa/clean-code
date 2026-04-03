// ============================================================
//  COMPONENT RENDERERS
//  Pure functions that return HTML strings
// ============================================================

// ── Syntax Highlighter ──────────────────────────────────────
// Tokenizer approach: scansiona il codice RAW una volta sola,
// emette token colorati, poi HTML-escapa solo il testo dei token.
// Non usa mai regex sul codice già trasformato → niente double-wrap.

const KW = new Set([
  'class','interface','abstract','extends','implements',
  'public','protected','private','static','readonly','final',
  'function','return','new','null','true','false','void',
  'string','int','float','bool','array','object','self',
  'parent','match','fn','throw','if','else','elseif',
  'foreach','while','for','do','yield','use','namespace',
  'trait','enum','const','echo','print','declare','instanceof',
]);

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlight(raw) {
  // Tokenizer: restituisce array di {type, text}
  const tokens = [];
  let i = 0;
  const len = raw.length;

  while (i < len) {
    // Single-line comment  // ...
    if (raw[i] === '/' && raw[i+1] === '/') {
      let j = i;
      while (j < len && raw[j] !== '\n') j++;
      tokens.push({ t: 'cmt', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // Hash comment  # ...  (ma NON #[ che è attributo PHP)
    if (raw[i] === '#' && raw[i+1] !== '[') {
      let j = i;
      while (j < len && raw[j] !== '\n') j++;
      tokens.push({ t: 'cmt', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // PHP Attribute  #[ ... ]
    if (raw[i] === '#' && raw[i+1] === '[') {
      let j = i + 2, depth = 1;
      while (j < len && depth > 0) {
        if (raw[j] === '[') depth++;
        else if (raw[j] === ']') depth--;
        j++;
      }
      tokens.push({ t: 'ann', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // YAML comment  # (only at start of line after spaces) — handled by hash above
    // Single-quoted string
    if (raw[i] === "'") {
      let j = i + 1;
      while (j < len) {
        if (raw[j] === '\\') { j += 2; continue; }
        if (raw[j] === "'")  { j++; break; }
        j++;
      }
      tokens.push({ t: 'str', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // Double-quoted string
    if (raw[i] === '"') {
      let j = i + 1;
      while (j < len) {
        if (raw[j] === '\\') { j += 2; continue; }
        if (raw[j] === '"')  { j++; break; }
        j++;
      }
      tokens.push({ t: 'str', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // Variable  $name
    if (raw[i] === '$') {
      let j = i + 1;
      while (j < len && /[a-zA-Z0-9_]/.test(raw[j])) j++;
      tokens.push({ t: 'var', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // Arrow method call  ->foo(
    if (raw[i] === '-' && raw[i+1] === '>') {
      let j = i + 2;
      while (j < len && /[a-zA-Z0-9_]/.test(raw[j])) j++;
      const name = raw.slice(i+2, j);
      // peek for (
      const isCall = raw[j] === '(';
      tokens.push({ t: 'op',  v: '->' });
      tokens.push({ t: isCall ? 'fn' : 'plain', v: name });
      i = j;
      continue;
    }
    // Static call  ::foo(
    if (raw[i] === ':' && raw[i+1] === ':') {
      let j = i + 2;
      while (j < len && /[a-zA-Z0-9_]/.test(raw[j])) j++;
      const name = raw.slice(i+2, j);
      const isCall = raw[j] === '(';
      tokens.push({ t: 'op',  v: '::' });
      tokens.push({ t: isCall ? 'fn' : 'plain', v: name });
      i = j;
      continue;
    }
    // Word (keyword / classname / identifier / number)
    if (/[a-zA-Z_]/.test(raw[i])) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(raw[j])) j++;
      const word = raw.slice(i, j);
      let type = 'plain';
      if (KW.has(word))                    type = 'kw';
      else if (/^[A-Z]/.test(word))        type = 'cls';
      tokens.push({ t: type, v: word });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(raw[i])) {
      let j = i;
      while (j < len && /[0-9._]/.test(raw[j])) j++;
      tokens.push({ t: 'num', v: raw.slice(i, j) });
      i = j;
      continue;
    }
    // Everything else: plain char
    const last = tokens[tokens.length - 1];
    if (last && last.t === 'plain') last.v += raw[i];
    else tokens.push({ t: 'plain', v: raw[i] });
    i++;
  }

  // Render tokens → HTML
  return tokens.map(tok => {
    const safe = esc(tok.v);
    if (tok.t === 'plain' || tok.t === 'op') return safe;
    return `<span class="${tok.t}">${safe}</span>`;
  }).join('');
}

// ── CodeBlock Component ──────────────────────────────────────
function CodeBlock({ filename = '', badge = null, lang = 'php', code, noHighlight = false }) {
  // highlight() lavora sul RAW e fa escaping internamente
  const body = noHighlight ? esc(code) : highlight(code);
  const badgeHtml = badge
    ? `<span class="badge badge--${badge.type || 'info'}">${badge.text}</span>`
    : '';
  return `
<div class="code-wrap">
  <div class="code-header">
    <div class="code-header__dots">
      <div class="code-header__dot code-header__dot--red"></div>
      <div class="code-header__dot code-header__dot--yellow"></div>
      <div class="code-header__dot code-header__dot--green"></div>
    </div>
    <span class="code-header__filename">${filename || lang}</span>
    ${badgeHtml}
  </div>
  <div class="code-body">${body}</div>
</div>`;
}

// ── CompareGrid Component ────────────────────────────────────
function CompareGrid({ badCode, goodCode, badFile = 'bad.php', goodFile = 'good.php' }) {
  return `
<div class="compare-grid">
  <div class="compare-block">
    <div class="compare-block__label compare-block__label--bad">✗ Bad — ${badFile}</div>
    <div class="code-body">${highlight(badCode)}</div>
  </div>
  <div class="compare-block">
    <div class="compare-block__label compare-block__label--good">✓ Good — ${goodFile}</div>
    <div class="code-body">${highlight(goodCode)}</div>
  </div>
</div>`;
}

// ── Callout Component ────────────────────────────────────────
function Callout({ type = 'info', icon, title, body }) {
  const icons = { info: 'ℹ', warn: '⚠', good: '✓', bad: '✗' };
  return `
<div class="callout callout--${type}">
  <span class="callout__icon">${icon || icons[type]}</span>
  <div class="callout__body">${title ? `<strong>${title}</strong>` : ''}${body}</div>
</div>`;
}

// ── Tabs Component ───────────────────────────────────────────
function Tabs({ id, tabs, accent }) {
  const btnStyle = accent
    ? `style="--tab-active-bg:${accent}18;--tab-active-border:${accent};--tab-active-color:${accent}"`
    : '';
  const buttons = tabs.map((t, i) =>
    `<button class="tab-btn${i === 0 ? ' active' : ''}" onclick="switchTab('${id}',${i},this)" ${btnStyle}>
      ${t.label}
    </button>`
  ).join('');
  const panels = tabs.map((t, i) =>
    `<div class="tab-panel${i === 0 ? ' active' : ''}" data-tab="${id}-${i}">${t.content}</div>`
  ).join('');
  return `<div class="tabs" data-tabs="${id}">${buttons}</div><div>${panels}</div>`;
}

// ── SectionBlock Component ───────────────────────────────────
function SectionBlock({ title, content }) {
  return `
<div class="section-block">
  <h3 class="section-block__title">${title}</h3>
  ${content}
</div>`;
}

// ── PageHeader Component ─────────────────────────────────────
function PageHeader({ eyebrow, title, subtitle, accent }) {
  return `
<div class="page-header" style="--accent-color:${accent}">
  <div class="page-header__eyebrow">${eyebrow}</div>
  <h1 class="page-header__title">${title}</h1>
  <p class="page-header__subtitle">${subtitle}</p>
</div>`;
}

// ── Utility (esc() è definita sopra, usata dal tokenizer) ────
