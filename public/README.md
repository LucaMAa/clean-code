# Symfony Clean Code Guide — Progetto Interattivo

Guida interattiva per studenti su **Clean Code**, **Design Patterns**, **Doctrine ORM**, **Redis**, **Elasticsearch** e molto altro con Symfony e PHP.

## Come usare

Apri semplicemente `index.html` nel browser — nessuna installazione richiesta, nessun server, nessuna dipendenza npm.

```bash
# Oppure con un server locale
npx serve .
# oppure
php -S localhost:8000
```

---

## Struttura del progetto

```
symfony-guide/
│
├── index.html                    ← Entry point — assembla tutto
│
├── src/
│   ├── styles/
│   │   ├── main.css              ← Design system, variabili, layout, componenti
│   │   ├── theme-light.css       ← Override per il tema chiaro
│   │   └── extras.css            ← Search, theme toggle, responsive, print
│   │
│   ├── data/
│   │   └── topics.js             ← Struttura nav + quiz data
│   │
│   └── components/
│       ├── components.js         ← Renderer puri: CodeBlock, CompareGrid, Callout, Tabs…
│       ├── theme-switcher.js     ← Dark/Light theme toggle con localStorage
│       ├── app.js                ← Router, sidebar builder, search engine, quiz engine
│       │
│       ├── view-cleancode.js     ← Clean Code: nomi, funzioni, DRY, commenti, DTO
│       ├── view-solid.js         ← SOLID: SRP, OCP, LSP, ISP, DIP
│       ├── view-patterns.js      ← Pattern: Factory, Builder, Abstract, Decorator,
│       │                           Adapter, Facade, Composite, Strategy, Observer,
│       │                           Command, Chain of Responsibility, Template Method
│       ├── view-infra.js         ← Doctrine ORM, Events/Subscribers, Redis, Elasticsearch
│       └── view-quality.js       ← Testing/TDD, Commands, Security/Voters, Performance
```

---

## Sezioni incluse (14 sezioni, 50+ esempi di codice)

### Fondamenti
- **Clean Code** — Nomi, funzioni, DRY, commenti, formattazione, DTO & Value Objects
- **SOLID** — Tutti e 5 i principi con esempi bad/good in Symfony

### Design Patterns (13 pattern)
- **Creazionali** — Factory Method, Abstract Factory, Builder, Singleton
- **Strutturali** — Decorator, Adapter, Facade, Composite
- **Comportamentali** — Strategy, Observer, Command, Chain of Responsibility, Template Method

### Symfony & PHP
- **Doctrine ORM** — Entity, Repository, Query Builder, Relazioni, Lifecycle, Migrations
- **Events & Subscribers** — EventDispatcher, Subscriber vs Listener, Kernel Events, Messenger
- **Commands & Services** — Console Commands con progress bar e dry-run
- **Security** — Voters personalizzati, JWT, CSRF/XSS/SQL Injection protection

### Infrastruttura
- **Cache & Redis** — Setup, Cache Pools, Tag Invalidation, Sessions, Rate Limiting
- **Elasticsearch** — Index + mapping, Full-text search, Sync con Doctrine, Aggregazioni
- **Performance** — Profiling, N+1 query, OPcache, HTTP Cache

### Qualità
- **Testing & TDD** — Unit, Integration, Functional tests, Mocking, TDD Red/Green/Refactor

---

## Feature UI
- 🌓 **Dark / Light theme** — persiste in localStorage, rispetta `prefers-color-scheme`
- 🔍 **Ricerca globale** — cerca in tutti i contenuti, shortcut `/`
- 📊 **Progress bar** — mostra avanzamento lettura e quiz completati
- 📱 **Responsive** — sidebar mobile con overlay
- ⌨️ **Keyboard shortcuts** — `/` per search, `Esc` per chiudere
- 🖨️ **Print-friendly** — CSS ottimizzato per stampa
- ↑ **Scroll to top** — bottone floating

---

## Aggiungere contenuti

### Nuova sezione

1. Crea `src/components/view-NOME.js` con una funzione `renderNOME()`
2. Aggiungi la voce in `src/data/topics.js` dentro `NAV_STRUCTURE`
3. Registra la view in `VIEWS` dentro `src/components/app.js`
4. Includi lo script in `index.html`

### Nuovo quiz

Aggiungi un oggetto in `QUIZ_DATA` in `src/data/topics.js`:

```js
{
  q: "La domanda?",
  opts: ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
  ans: 1,  // indice 0-based della risposta corretta
  exp: "Spiegazione mostrata dopo la risposta."
}
```

---

*Creato con ❤️ per studenti PHP e Symfony*
