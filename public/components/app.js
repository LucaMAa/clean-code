// ============================================================
//  APP — Router, Nav, State
// ============================================================

// ── State ────────────────────────────────────────────────────
const State = {
  currentView: 'home',
  quizAnswered: [],
  quizCorrect: 0,
};

// ── View Registry ─────────────────────────────────────────────
const VIEWS = {
  home:        renderHome,
  cleancode:   renderCleanCode,
  solid:       renderSOLID,
  mvc:         renderMVC,
  creational:  renderCreational,
  behavioral:  renderBehavioral,
  doctrine:    renderDoctrine,
  events:      renderEvents,
  commands:    renderCommands,
  security:    renderSecurity,
  redis:       renderRedis,
  elastic:     renderElastic,
  //performance: renderPerformance,
  testing:     renderTesting,
  quiz:        renderQuiz,
};

// ── Router ────────────────────────────────────────────────────
function navigate(viewId) {
  const render = VIEWS[viewId];
  if (!render) return;
  State.currentView = viewId;

  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="view active" id="view-${viewId}">${render()}</div>`;

  // Update sidebar
  document.querySelectorAll('.nav-item, .nav-subitem').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewId);
  });

  // Scroll to top
  main.scrollTop = 0;

  // Update URL hash
  history.replaceState(null, '', '#' + viewId);
}

// ── Tab Switcher ──────────────────────────────────────────────
function switchTab(groupId, index, btn) {
  const buttons = btn.closest('.tabs').querySelectorAll('.tab-btn');
  buttons.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const panels = document.querySelectorAll(`[data-tab^="${groupId}-"]`);
  panels.forEach((p, i) => p.classList.toggle('active', i === index));
}

// ── Search ────────────────────────────────────────────────────
let searchIndex = [];

function buildSearchIndex() {
  searchIndex = Object.entries(VIEWS).map(([id, fn]) => {
    const html  = fn();
    const text  = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const label = NAV_STRUCTURE.flatMap(g => g.items).find(i => i.id === id)?.label || id;
    return { id, label, text: text.toLowerCase() };
  });
}

function handleSearch(query) {
  const q = query.toLowerCase().trim();
  const resultsEl = document.getElementById('search-results');
  if (!q) { resultsEl.style.display = 'none'; return; }

  const matches = searchIndex
    .filter(item => item.text.includes(q) || item.label.toLowerCase().includes(q))
    .slice(0, 6);

  if (!matches.length) {
    resultsEl.innerHTML = `<div style="padding:12px 16px;font-size:13px;color:var(--text-muted)">Nessun risultato</div>`;
  } else {
    resultsEl.innerHTML = matches.map(m =>
      `<div class="search-result-item" onclick="navigate('${m.id}'); closeSearch()">${m.label}</div>`
    ).join('');
  }
  resultsEl.style.display = 'block';
}

function closeSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').style.display = 'none';
}

// ── Sidebar Builder ───────────────────────────────────────────
function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = NAV_STRUCTURE.map(group => `
    <div class="sidebar__section-label">${group.groupLabel}</div>
    ${group.items.map(item => `
      <div class="nav-item" data-view="${item.id}" onclick="navigate('${item.id}')"
           style="--item-accent:${item.accent}">
        <span class="nav-item__icon">${item.icon}</span>
        <span class="nav-item__label">${item.label}</span>
        ${item.badge ? `<span class="nav-item__badge">${item.badge}</span>` : ''}
      </div>
    `).join('')}
  `).join('');
}

// ── Home View ─────────────────────────────────────────────────
function renderHome() {
  const topicsData = [
    { id: 'cleancode',   icon: '✦', accent: '#38bdf8', title: 'Clean Code',      count: '12 regole', desc: 'Nomi, funzioni, DRY, commenti, DTO' },
    { id: 'solid',       icon: '◈', accent: '#38bdf8', title: 'SOLID',           count: '5 principi', desc: 'I fondamenti dell\'OOP moderno' },
    { id: 'mvc',         icon: '⟳', accent: '#a78bfa', title: 'MVC', count: '3 sezioni', desc: 'Controller, Service, Entity' },
    { id: 'creational',  icon: '◎', accent: '#a78bfa', title: 'Pattern Creazionali', count: '4 pattern', desc: 'Factory, Builder, Abstract Factory' },
    { id: 'behavioral',  icon: '⟳', accent: '#a78bfa', title: 'Pattern Comportamentali', count: '5 pattern', desc: 'Strategy, Observer, Command, Chain' },
    { id: 'doctrine',    icon: '⬢', accent: '#34d399', title: 'Doctrine ORM',    count: '6 sezioni', desc: 'Entity, Repository, Query Builder, Relations' },
    { id: 'events',      icon: '⚡', accent: '#60a5fa', title: 'Events & Subscribers', count: '4 sezioni', desc: 'EventDispatcher, Subscriber, Kernel, Messenger' },
    { id: 'security',    icon: '⊕', accent: '#f87171', title: 'Security',        count: '3 sezioni', desc: 'Voters, JWT, CSRF, XSS, SQL Injection' },
    { id: 'redis',       icon: '⊞', accent: '#fb923c', title: 'Cache & Redis',   count: '5 sezioni', desc: 'Cache pools, tag invalidation, sessions, rate limit' },
    { id: 'elastic',     icon: '◉', accent: '#f59e0b', title: 'Elasticsearch',   count: '4 sezioni', desc: 'Index, full-text search, aggregazioni, sync' },
    { id: 'testing',     icon: '✓', accent: '#4ade80', title: 'Testing & TDD',   count: '5 sezioni', desc: 'Unit, Integration, Functional, Mock, TDD' },
    //{ id: 'performance', icon: '⚡', accent: '#c084fc', title: 'Performance',     count: '4 sezioni', desc: 'Profiling, N+1, OPcache, HTTP Cache' },
  ];

  return `
<div class="home-hero">
  <h1 class="home-hero__title">Clean Code & Design Patterns</h1>
  <p class="home-hero__subtitle">
    Guida interattiva completa per scrivere PHP professionale con Symfony.
    Dai principi SOLID ai design pattern, da Doctrine ORM a Redis e Elasticsearch.
  </p>
  <div class="home-hero__cta">
    <button class="btn btn--primary" onclick="navigate('cleancode')">Inizia dal Clean Code →</button>
    <button class="btn" onclick="navigate('quiz')">Vai al Quiz 🎯</button>
  </div>
</div>

<h3 class="section-block__title">Tutti gli argomenti</h3>

<div class="topic-grid">
  ${topicsData.map(t => `
  <div class="topic-card" onclick="navigate('${t.id}')" style="--card-accent:${t.accent}">
    <div class="topic-card__accent-bar"></div>
    <span class="topic-card__icon">${t.icon}</span>
    <div class="topic-card__title">${t.title}</div>
    <div class="topic-card__count" style="color:${t.accent}">${t.count}</div>
    <div class="topic-card__desc">${t.desc}</div>
  </div>`).join('')}
</div>

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:8px;">
  <div class="stat-card"><div class="stat-card__value" style="color:#38bdf8">12+</div><div class="stat-card__label">Sezioni</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:#a78bfa">13</div><div class="stat-card__label">Design Pattern</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:#34d399">50+</div><div class="stat-card__label">Esempi di codice</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:#f59e0b">10</div><div class="stat-card__label">Domande quiz</div></div>
</div>`;
}

// ── Quiz View ─────────────────────────────────────────────────
function renderQuiz() {
  // Reset state on render
  State.quizAnswered = [];
  State.quizCorrect  = 0;

  const questionsHtml = QUIZ_DATA.map((q, qi) => `
    <div class="quiz-card" id="qcard-${qi}">
      <div class="quiz-question">${qi + 1}. ${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, oi) =>
          `<button class="quiz-option" id="qopt-${qi}-${oi}" onclick="answerQuiz(${qi},${oi})">${opt}</button>`
        ).join('')}
      </div>
      <div class="quiz-feedback" id="qfb-${qi}"></div>
    </div>`
  ).join('');

  return `
${PageHeader({
  eyebrow: 'Metti alla prova le tue conoscenze',
  title: 'Quiz Finale',
  subtitle: '10 domande su Clean Code, Design Patterns, Doctrine, Redis, Elasticsearch e Testing.',
  accent: '#f59e0b'
})}

<div class="quiz-score">
  <span class="quiz-score__text" id="quiz-score-text">Punteggio: 0 / 0</span>
  <div class="quiz-score__bar"><div class="quiz-score__fill" id="quiz-score-fill" style="width:0%"></div></div>
  <button class="btn" onclick="navigate('quiz')">↺ Ricomincia</button>
</div>

${questionsHtml}`;
}

function answerQuiz(qi, oi) {
  if (State.quizAnswered.includes(qi)) return;
  State.quizAnswered.push(qi);

  const q  = QUIZ_DATA[qi];
  const fb = document.getElementById(`qfb-${qi}`);

  for (let i = 0; i < q.opts.length; i++) {
    const btn = document.getElementById(`qopt-${qi}-${i}`);
    btn.disabled = true;
    if (i === q.ans)      btn.classList.add('correct');
    else if (i === oi)    btn.classList.add('wrong');
  }

  if (oi === q.ans) {
    State.quizCorrect++;
    fb.textContent   = '✓ Esatto! ' + q.exp;
    fb.className     = 'quiz-feedback show ok';
  } else {
    fb.textContent   = '✗ Non corretto. ' + q.exp;
    fb.className     = 'quiz-feedback show ko';
  }

  const answered = State.quizAnswered.length;
  const pct      = answered ? Math.round(State.quizCorrect / answered * 100) : 0;
  document.getElementById('quiz-score-text').textContent =
    `Punteggio: ${State.quizCorrect} / ${answered}  (${pct}%)`;
  document.getElementById('quiz-score-fill').style.width = pct + '%';
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  buildSidebar();
  buildSearchIndex();

  const hash = location.hash.replace('#', '') || 'home';
  navigate(VIEWS[hash] ? hash : 'home');

  // Search input
  const input = document.getElementById('search-input');
  if (input) {
    input.addEventListener('input', e => handleSearch(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSearch();
    });
  }

  // Click outside search
  document.addEventListener('click', e => {
    if (!e.target.closest('.topbar__search')) closeSearch();
  });
}

window.addEventListener('DOMContentLoaded', init);
window.navigate    = navigate;
window.switchTab   = switchTab;
window.answerQuiz  = answerQuiz;
