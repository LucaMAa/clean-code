// ============================================================
//  ALL TOPIC DATA
//  Each topic has: id, label, icon, accent color, badge text
// ============================================================

const NAV_STRUCTURE = [
  {
    groupLabel: "Fondamenti",
    items: [
      { id: "home",        icon: "⌂",  label: "Home",              accent: "#38bdf8", badge: null },
      { id: "cleancode",   icon: "✦",  label: "Clean Code",        accent: "#38bdf8", badge: "12" },
      { id: "solid",       icon: "◈",  label: "Principi SOLID",    accent: "#38bdf8", badge: "5"  },
    ]
  },
  {
    groupLabel: "Design Patterns",
    items: [
      { id: "creational",  icon: "◎",  label: "Creazionali",       accent: "#a78bfa", badge: "4"  },
      { id: "structural",  icon: "⬡",  label: "Strutturali",       accent: "#a78bfa", badge: "4"  },
      { id: "behavioral",  icon: "⟳",  label: "Comportamentali",   accent: "#a78bfa", badge: "5"  },
    ]
  },
  {
    groupLabel: "Symfony & PHP",
    items: [
      { id: "mvc",         icon: "☰",  label: "MVC",              accent: "#34d399", badge: "3"  },
      { id: "doctrine",    icon: "⬢",  label: "Doctrine ORM",      accent: "#34d399", badge: "6"  },
      { id: "events",      icon: "⚡",  label: "Events & Subscribers", accent: "#60a5fa", badge: "4" },
      { id: "commands",    icon: "▶",  label: "Commands & Services", accent: "#60a5fa", badge: "3" },
      { id: "security",    icon: "⊕",  label: "Security & Voters",  accent: "#f87171", badge: "3"  },
    ]
  },
  {
    groupLabel: "Infrastruttura",
    items: [
      { id: "redis",       icon: "⊞",  label: "Cache & Redis",     accent: "#fb923c", badge: "5"  },
      { id: "elastic",     icon: "◉",  label: "Elasticsearch",     accent: "#f59e0b", badge: "4"  },
      { id: "performance", icon: "⚡",  label: "Performance",       accent: "#c084fc", badge: "4"  },
    ]
  },
  {
    groupLabel: "Qualità",
    items: [
      { id: "testing",     icon: "✓",  label: "Testing & TDD",     accent: "#4ade80", badge: "5"  },
      { id: "quiz",        icon: "?",  label: "Quiz Finale",       accent: "#f59e0b", badge: null },
    ]
  }
];

// ── QUIZ DATA ────────────────────────────────────────────────
const QUIZ_DATA = [
  {
    q: "Quale principio SOLID afferma che una classe deve avere un'unica ragione per cambiare?",
    opts: ["Open/Closed Principle", "Single Responsibility Principle", "Dependency Inversion", "Liskov Substitution"],
    ans: 1,
    exp: "SRP (Single Responsibility): ogni classe deve avere una sola responsabilità. Se devi modificare una classe per due motivi diversi, ha troppe responsabilità."
  },
  {
    q: "Nel pattern Factory Method, qual è il vantaggio principale?",
    opts: [
      "Riduce l'uso della memoria",
      "Permette di creare oggetti senza specificare la classe concreta",
      "Garantisce una sola istanza della classe",
      "Aggiunge metodi a un oggetto a runtime"
    ],
    ans: 1,
    exp: "Il Factory Method delega la creazione degli oggetti alle sottoclassi, rispettando Open/Closed: puoi aggiungere nuovi tipi senza modificare il codice client."
  },
  {
    q: "Cos'è il problema N+1 in Doctrine ORM?",
    opts: [
      "Un bug nel Query Builder",
      "Una query per la lista + N query per ogni elemento (una per relazione)",
      "Un errore di migrazione del database",
      "Un problema di connessione al database"
    ],
    ans: 1,
    exp: "N+1: carichi 10 utenti (1 query), poi per ogni utente fai una query per i suoi ordini (10 query) = 11 query totali. Si risolve con JOIN ed eager loading."
  },
  {
    q: "In Symfony, un EventSubscriber differisce da un EventListener perché...",
    opts: [
      "È più veloce del listener",
      "Definisce internamente a quali eventi si sottoscrive tramite getSubscribedEvents()",
      "Può ascoltare solo un evento alla volta",
      "Non richiede la registrazione nel container"
    ],
    ans: 1,
    exp: "Il Subscriber dichiara i propri eventi via getSubscribedEvents() — tutto è auto-contenuto nella classe. Il Listener viene configurato esternamente in services.yaml."
  },
  {
    q: "Qual è lo scopo principale del pattern Repository in un'applicazione Symfony?",
    opts: [
      "Velocizzare le query SQL",
      "Separare la logica di business dalla logica di accesso ai dati",
      "Gestire le transazioni del database",
      "Creare automaticamente le entità Doctrine"
    ],
    ans: 1,
    exp: "Il Repository astrae la fonte dei dati: il Service non sa se i dati vengono da MySQL, Redis o un'API. Questo rende il codice testabile e rispetta il DIP."
  },
  {
    q: "Redis è preferito rispetto a un semplice file cache quando...",
    opts: [
      "Hai bisogno di cache persistente su disco",
      "Devi condividere la cache tra più istanze dell'applicazione (scaling orizzontale)",
      "Vuoi ridurre l'uso della RAM",
      "Hai pochi dati da cachare"
    ],
    ans: 1,
    exp: "Redis è in-memory e condiviso: perfetto per ambienti multi-server (k8s, load balancer). Supporta anche strutture dati avanzate, pub/sub, e TTL nativo."
  },
  {
    q: "Nel pattern Decorator, come si aggiunge il comportamento all'oggetto originale?",
    opts: [
      "Modificando direttamente la classe originale",
      "Ereditando dalla classe originale",
      "Wrappando l'oggetto originale e delegando le chiamate",
      "Usando la reflection per aggiungere metodi"
    ],
    ans: 2,
    exp: "Il Decorator implementa la stessa interfaccia, riceve l'oggetto originale nel costruttore, esegue il suo comportamento aggiuntivo e delega all'oggetto inner."
  },
  {
    q: "In Elasticsearch, cosa rappresenta un 'indice'?",
    opts: [
      "Un singolo documento JSON",
      "Una query di ricerca",
      "Una collezione di documenti simili, paragonabile a una tabella in SQL",
      "Un cluster di nodi"
    ],
    ans: 2,
    exp: "L'indice in Elasticsearch è simile a una tabella SQL. Contiene documenti JSON e ha un mapping che definisce i tipi dei campi per ottimizzare ricerca e analisi."
  },
  {
    q: "Cosa restituisce un test che segue il pattern AAA (Arrange-Act-Assert)?",
    opts: [
      "Array, Action, Assertion",
      "Arrange: prepara lo stato, Act: esegui l'azione, Assert: verifica il risultato",
      "Niente, i test non restituiscono valori",
      "Un booleano true/false"
    ],
    ans: 1,
    exp: "AAA è la struttura base di un test leggibile: Arrange = setup dell'oggetto e dipendenze mock, Act = chiama il metodo, Assert = verifica il risultato atteso."
  },
  {
    q: "Il pattern Builder è utile quando...",
    opts: [
      "Hai bisogno di una sola istanza della classe",
      "Devi creare oggetti con molti parametri opzionali in modo leggibile",
      "Vuoi convertire un'interfaccia in un'altra",
      "Hai bisogno di notificare più oggetti di un cambiamento"
    ],
    ans: 1,
    exp: "Il Builder evita i costruttori con 10+ parametri. Consente una fluent interface leggibile: new QueryBuilder()->select('u')->where('u.active = 1')->limit(10)->build()."
  }
];
