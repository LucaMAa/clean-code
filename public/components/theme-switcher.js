// ============================================================
//  THEME SWITCHER
// ============================================================

const THEME_KEY = 'symfony-guide-theme';

function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  const btn    = document.getElementById('theme-toggle');
  const icon   = document.getElementById('theme-icon');
  const label  = document.getElementById('theme-label');

  if (!btn) return;

  if (theme === 'light') {
    icon.textContent  = '☀';
    label.textContent = 'Light';
    btn.title         = 'Passa al tema scuro';
  } else {
    icon.textContent  = '◑';
    label.textContent = 'Dark';
    btn.title         = 'Passa al tema chiaro';
  }
}

function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function initTheme() {
  // Rispetta preferenza sistema se non c'è storage
  const stored = localStorage.getItem(THEME_KEY);
  const preferred = !stored && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light' : (stored || 'dark');
  applyTheme(preferred);
}
