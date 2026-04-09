// ============================================================
//  RENDER: Bug Hunt game
// ============================================================

function renderBugHunt() {
  const accent = '#ef4444';
  return `
${PageHeader({
  eyebrow: 'Mini-game',
  title: '🐛 Trova il Bug',
  subtitle: 'Leggi il codice, individua il problema prima di vedere la spiegazione. Ogni bug trovato vale punti.',
  accent,
})}
<div id="bh-scoreboard" style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
  <div class="stat-card" style="--accent-color:${accent};min-width:120px;">
    <div class="stat-card__value" id="bh-score">0</div>
    <div class="stat-card__label">Punti</div>
  </div>
  <div class="stat-card" style="--accent-color:#38bdf8;min-width:120px;">
    <div class="stat-card__value" id="bh-found">0</div>
    <div class="stat-card__label">Bug trovati</div>
  </div>
  <div class="stat-card" style="--accent-color:#f59e0b;min-width:120px;">
    <div class="stat-card__value">${BUG_HUNT_LEVELS.length}</div>
    <div class="stat-card__label">Totale livelli</div>
  </div>
</div>
<div id="bh-levels">
  ${BUG_HUNT_LEVELS.map((lvl, i) => renderBugLevel(lvl, i)).join('')}
</div>`;
}

function renderBugLevel(lvl, idx) {
  return `
<div class="section-block" id="bh-level-${lvl.id}">
  <div class="section-block__title">
    Livello ${idx + 1} — ${lvl.title}
    <span class="badge badge--warn" style="margin-left:8px;">+${lvl.points} pt</span>
    <span class="badge badge--bad bh-status-badge" id="bh-status-${lvl.id}" style="display:none;">✗ Bug non trovato</span>
    <span class="badge badge--good bh-status-badge" id="bh-ok-${lvl.id}" style="display:none;">✓ Trovato!</span>
  </div>
  <div class="code-wrap">
    <div class="code-header">
      <div class="code-header__dots">
        <div class="code-header__dot code-header__dot--red"></div>
        <div class="code-header__dot code-header__dot--yellow"></div>
        <div class="code-header__dot code-header__dot--green"></div>
      </div>
      <span class="code-header__filename">${lvl.title}</span>
    </div>
    <div class="code-body" id="bh-code-${lvl.id}" style="cursor:default;">${escapeHtml(lvl.code)}</div>
  </div>
  <div style="margin-bottom:12px;">
    <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">💬 Descrivi il bug in una frase:</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <input
        type="text"
        id="bh-input-${lvl.id}"
        placeholder="es: manca il controllo dei duplicati..."
        style="flex:1;min-width:200px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-ui);font-size:13px;padding:8px 12px;outline:none;"
        onkeydown="if(event.key==='Enter')bhSubmit('${lvl.id}')"
      />
      <button class="btn btn--primary" onclick="bhSubmit('${lvl.id}')">Invia risposta</button>
      <button class="btn" onclick="bhReveal('${lvl.id}')">👁 Mostra soluzione</button>
    </div>
  </div>
  <div id="bh-feedback-${lvl.id}" class="callout callout--info" style="display:none;"></div>
</div>`;
}

// ============================================================
//  RENDER: Method Guesser game
// ============================================================

function renderMethodGuesser() {
  const accent = '#a78bfa';
  return `
${PageHeader({
  eyebrow: 'Mini-game',
  title: '🔍 Cosa fa questo metodo?',
  subtitle: 'Vedi solo firma e corpo offuscato. Se non capisci cosa fa dal nome, il nome è sbagliato.',
  accent,
})}
<div id="mg-scoreboard" style="display:flex;gap:16px;margin-bottom:24px;flex-wrap:wrap;">
  <div class="stat-card" style="--accent-color:${accent};min-width:120px;">
    <div class="stat-card__value" id="mg-score">0</div>
    <div class="stat-card__label">Punti</div>
  </div>
  <div class="stat-card" style="--accent-color:#38bdf8;min-width:120px;">
    <div class="stat-card__value" id="mg-correct">0</div>
    <div class="stat-card__label">Corretti</div>
  </div>
</div>
<div id="mg-levels">
  ${METHOD_GUESSER_LEVELS.map((lvl, i) => renderMgLevel(lvl, i)).join('')}
</div>`;
}

function renderMgLevel(lvl, idx) {
  return `
<div class="section-block" id="mg-level-${lvl.id}">
  <div class="section-block__title">
    Metodo ${idx + 1}
    <span class="badge badge--new" style="margin-left:8px;">+${lvl.points} pt</span>
    <span class="badge badge--good" id="mg-ok-${lvl.id}" style="display:none;">✓ Corretto!</span>
    <span class="badge badge--bad" id="mg-ko-${lvl.id}" style="display:none;">✗ Risposta vista</span>
  </div>
  <div class="code-wrap">
    <div class="code-header">
      <div class="code-header__dots">
        <div class="code-header__dot code-header__dot--red"></div>
        <div class="code-header__dot code-header__dot--yellow"></div>
        <div class="code-header__dot code-header__dot--green"></div>
      </div>
      <span class="code-header__filename">firma + corpo offuscato</span>
    </div>
    <div class="code-body" style="color:var(--text-primary);">${escapeHtml(lvl.signature)}</div>
    <div class="code-body" style="border-top:1px dashed var(--border-subtle);color:var(--text-secondary);">{
${escapeHtml(lvl.body)}
}</div>
  </div>
  <div style="margin-bottom:8px;">
    <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">🤔 Cosa fa questo metodo? (in una frase)</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <textarea
        id="mg-input-${lvl.id}"
        rows="2"
        placeholder="es: Restituisce tutti i post visibili per l'utente..."
        style="flex:1;min-width:200px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-ui);font-size:13px;padding:8px 12px;outline:none;resize:vertical;"
      ></textarea>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
      <button class="btn btn--primary" onclick="mgSubmit('${lvl.id}')">Invia ↗</button>
      <button class="btn" onclick="mgHint('${lvl.id}', 0)">💡 Suggerimento 1</button>
      <button class="btn" onclick="mgHint('${lvl.id}', 1)">💡 Suggerimento 2</button>
      <button class="btn" onclick="mgReveal('${lvl.id}')">👁 Mostra risposta</button>
    </div>
  </div>
  <div id="mg-hint-${lvl.id}-0" class="callout callout--warn" style="display:none;"><div class="callout__icon">💡</div><div class="callout__body">${lvl.hints[0]}</div></div>
  <div id="mg-hint-${lvl.id}-1" class="callout callout--warn" style="display:none;"><div class="callout__icon">💡</div><div class="callout__body">${lvl.hints[1]}</div></div>
  <div id="mg-feedback-${lvl.id}" class="callout" style="display:none;"></div>
</div>`;
}

// ============================================================
//  GAME DATA — Bug Hunt & Method Guesser
// ============================================================

// ── Livelli ───────────────────────────────────────────────────
const BUG_HUNT_LEVELS = [
  {
    id: 'bh1',
    title: 'PostController.php',
    points: 10,
    difficulty: 'facile',
    code: `$u   = $this->getUser();
$p   = $repo->find($id);
$arr = [];
foreach ($p->getLikes() as $l) {
    if ($l->getUser() === $u)
        $arr[] = $l;
}
if (count($arr) > 0) {
    $p->setStatus(1);
}`,
    solution: `<strong>Problema:</strong> Nomi criptici — <code>$u</code>, <code>$p</code>, <code>$arr</code> non comunicano nulla a chi legge il codice dopo di te.<br><br>
<strong>Regola:</strong> Il nome deve rivelare l'intenzione. Se devi aprire il metodo per capire cosa fa la variabile, il nome è sbagliato.<br><br>
<strong>Fix:</strong><br>
<code>$currentUser</code> invece di <code>$u</code><br>
<code>$post</code> invece di <code>$p</code><br>
<code>$userLikes</code> invece di <code>$arr</code><br><br>
<strong>Da discutere con gli studenti:</strong> Quanto deve essere lungo un nome? <code>$currentAuthenticatedUser</code> è troppo? La regola è: usa il contesto per abbreviare, non l'arbitrio.`,
  },
  {
    id: 'bh2',
    title: 'LikeService.php',
    points: 10,
    difficulty: 'facile',
    code: `public function likePost(Post $post, User $user): void
{
    if (!$post->isArchived()) {
        if ($post->getAuthor() !== $user) {
            $like = new Like($post, $user);
            $this->likeRepo->save($like, flush: true);
        }
    }
}`,
    solution: `<strong>Problema:</strong> Piramide dell'orrore — 3 livelli di annidamento per una logica semplice. Più if annidati = più difficile ragionare sul flusso.<br><br>
<strong>Regola:</strong> Early return — inverti la condizione ed esci subito. La logica principale resta piatta.<br><br>
<strong>Fix:</strong><br>
<code>if ($post->isArchived())          return;</code><br>
<code>if ($post->getAuthor() === $user) return;</code><br>
<code>// qui il codice principale, senza annidamento</code><br><br>
<strong>Da discutere:</strong> Quando è accettabile annidare? Un solo livello è quasi sempre ok. Due livelli è un segnale. Tre livelli è quasi sempre un problema.`,
  },
  {
    id: 'bh3',
    title: 'CommentService.php',
    points: 15,
    difficulty: 'facile',
    code: `public function addComment(Post $post, User $user, string $text): void
{
    // controlla se l'utente è sospeso
    if ($user->isSuspended()) {
        throw new AccountSuspendedException();
    }
    // controlla se è bloccato
    if ($post->getAuthor()->hasBlocked($user)) {
        throw new UserBlockedException();
    }
    $comment = new Comment($post, $user, $text);
    $this->em->persist($comment);
    $this->em->flush();
}`,
    solution: `<strong>Problema:</strong> I commenti spiegano il <em>cosa</em> — che è già leggibile dal codice. Un commento che dice "controlla se l'utente è sospeso" sopra <code>isSuspended()</code> non aggiunge nulla.<br><br>
<strong>Regola:</strong> I commenti devono spiegare il <em>perché</em> — la regola di business, la decisione di design, il workaround.<br><br>
<strong>Fix:</strong><br>
<code>// Instagram policy: account sospesi non possono interagire (HTTP 400, cod. 190)</code><br>
<code>// Gli utenti bloccati dall'autore non devono sapere che il post esiste</code><br><br>
<strong>Da discutere:</strong> Se il codice è abbastanza chiaro, il commento migliore è nessun commento. Quando è obbligatorio? Workaround, hack, logica non ovvia, decisioni che sembrano sbagliate ma non lo sono.`,
  },
  {
    id: 'bh4',
    title: 'PostService.php',
    points: 20,
    difficulty: 'facile',
    code: `public function publish(array $data, User $author): Post
{
    $post = new Post();
    $post->setCaption($data['caption']);
    $post->setAuthor($author);

    preg_match_all('/#(\\w+)/', $data['caption'], $m);
    foreach ($m[1] as $tag) {
        $hashtag = $this->hashtagRepo->findOrCreate($tag);
        $post->addHashtag($hashtag);
    }
    foreach ($data['media'] as $file) {
        $media = new MediaFile($file, $post);
        $this->em->persist($media);
    }
    foreach ($author->getFollowers() as $follower) {
        $n = new Notification($follower, 'new_post', $post);
        $this->em->persist($n);
    }
    $this->em->persist($post);
    $this->em->flush();
    return $post;
}`,
    solution: `<strong>Problema:</strong> Una funzione fa troppe cose — crea il post, estrae hashtag, gestisce media, invia notifiche, salva tutto. Se cambia la logica delle notifiche, devi toccare questo metodo.<br><br>
<strong>Regola:</strong> Single Responsibility — una funzione fa una cosa sola. Se la descrivi con "e", va spezzata.<br><br>
<strong>Fix:</strong> Il metodo publish() deve solo orchestrare:<br>
<code>$this->validator->validate($dto);</code><br>
<code>$post = $this->postFactory->createFromDTO($dto, $author);</code><br>
<code>$this->postRepo->save($post, flush: true);</code><br>
<code>$this->dispatcher->dispatch(new PostPublishedEvent($post));</code><br><br>
<strong>Da discutere:</strong> Chi gestisce hashtag, media e notifiche? I listener dell'evento. Perché è meglio? Perché sono indipendenti, testabili e modificabili senza toccare publish().`,
  },
  {
    id: 'bh5',
    title: 'FeedService.php',
    points: 30,
    difficulty: 'difficile',
    code: `public function getFeedForUser(int $userId, int $page = 1): array
{
    $user  = $this->userRepo->find($userId);
    $posts = $this->postRepo->findAll();
    $feed  = [];

    foreach ($posts as $post) {
        if (in_array($user, $post->getAuthor()->getFollowers())) {
            if (!$post->isArchived()) {
                if (!$post->getAuthor()->isSuspended()) {
                    $feed[] = $post;
                }
            }
        }
    }

    usort($feed, fn($a, $b) => $a->getPublishedAt() <=> $b->getPublishedAt());

    $perPage = 20;
    $offset  = ($page - 1) * $perPage;
    return array_slice($feed, $offset, $perPage);
}`,
    solution: `<strong>Ci sono 3 bug distinti — uno per tipo:</strong><br><br>
<strong>1. Performance catastrofica</strong><br>
<code>findAll()</code> carica TUTTI i post dal DB in memoria, poi filtra in PHP. Con milioni di post è un crash garantito. Il filtro va fatto nella query SQL con WHERE e JOIN.<br><br>
<strong>2. Ordinamento sbagliato</strong><br>
<code>$a <=> $b</code> ordina in ASC (prima i più vecchi). Un feed social mostra i più recenti: deve essere <code>$b <=> $a</code>.<br><br>
<strong>3. Tipo sbagliato per l'ID</strong><br>
Il metodo riceve <code>int $userId</code> e fa <code>find($userId)</code>, ma dovrebbe ricevere direttamente <code>User $user</code> — il controller ha già l'oggetto User da <code>getUser()</code>. Passare l'ID costringe a un'altra query inutile.<br><br>
<strong>Da discutere:</strong> Quale dei tre è più grave? Il bug di performance è il più pericoloso in produzione. Il bug di tipo è il più sottile — non crasher mai in test ma è design sbagliato.`,
  },
  {
    id: 'bh6',
    title: 'NotificationService.php',
    points: 30,
    difficulty: 'difficile',
    code: `final class NotificationService
{
    public function notifyFollowers(User $author, Post $post): void
    {
        $followers = $author->getFollowers();

        foreach ($followers as $follower) {
            $notification = new Notification(
                recipient: $follower,
                type: 'new_post',
                payload: [
                    'post_id'    => $post->getId(),
                    'author'     => $author->getUsername(),
                    'caption'    => $post->getCaption(),
                    'created_at' => new \DateTime(),
                ]
            );
            $this->em->persist($notification);
        }

        $this->em->flush();
        $this->mailer->sendPostDigest($author, $post, $followers);
        $this->pushService->sendPush($author, $post, $followers);
    }
}`,
    solution: `<strong>Ci sono 3 problemi distinti — tutti sottili:</strong><br><br>
<strong>1. Single Responsibility violata</strong><br>
<code>notifyFollowers()</code> fa tre cose: salva notifiche nel DB, manda email, manda push. Se cambia il sistema di push, tocchi questo metodo. Ogni canale dovrebbe essere un listener separato su un evento <code>PostPublishedEvent</code>.<br><br>
<strong>2. Dato mutabile nel payload</strong><br>
<code>'created_at' => new \\DateTime()</code> usa <code>DateTime</code> mutabile. Se qualcuno modifica questo oggetto altrove, il dato cambia silenziosamente. Usare <code>new \\DateTimeImmutable()</code>.<br><br>
<strong>3. Accoppiamento forte ai followers in memoria</strong><br>
<code>$author->getFollowers()</code> carica tutti i follower in memoria (stesso problema di findAll). Con un account da 1M follower è un memory overflow. La notifica va processata in batch asincrono tramite Messenger/queue, non in-process.<br><br>
<strong>Da discutere:</strong> Quale bug troveresti in code review? Il n.1 è visibile subito. Il n.2 richiede conoscenza di PHP. Il n.3 richiede esperienza di produzione — non lo vedi mai nei test locali.`,
  },
];

const METHOD_GUESSER_LEVELS = [
  {
    id: 'mg1',
    points: 10,
    difficulty: 'facile',
    signature: `public function publishPost(PublishPostDTO $dto, User $author): Post`,
    body: `█████████████████████████($dto);
$post = $this->████████->createFromDTO($dto, $author);
$this->████████->save($post, flush: true);
$this->████████->dispatch(new ████████($post));
return $post;`,
    answer: 'Pubblica un nuovo post: valida il DTO, crea l\'entità Post, la salva e dispatcha un evento PostPublishedEvent.',
    discussion: 'Perché il metodo dispatcha un evento invece di fare tutto lui? Cosa succede se aggiungiamo le stories — dobbiamo toccare questo metodo?',
    hints: ['Guarda il tipo di ritorno: Post', 'Il nome inizia con "publish" — cosa pubblica?'],
  },
  {
    id: 'mg2',
    points: 10,
    difficulty: 'facile',
    signature: `public function assertCanInteract(User $actor, Post $post): void`,
    body: `if ($actor->████████())
    throw new AccountSuspendedException($actor);
if ($post->getAuthor()->████████($actor))
    throw new UserBlockedException($actor);
if ($post->████████())
    throw new PostNotAvailableException($post);`,
    answer: 'Verifica che un utente possa interagire con un post. Non ritorna nulla: se qualcosa non va, lancia un\'eccezione specifica. Se non lancia, l\'interazione è permessa.',
    discussion: 'Perché si chiama "assert" e non "canInteract" o "checkInteraction"? La convezione assert* comunica che il metodo garantisce una precondizione — o lancia, o passa.',
    hints: ['Il tipo di ritorno è void — non restituisce true/false', 'assert = garantisce una condizione'],
  },
  {
    id: 'mg3',
    points: 15,
    difficulty: 'facile',
    signature: `public function likePost(Post $post, User $user): void`,
    body: `if ($post->████████())          return;
if ($post->getAuthor() ██████ $user) return;
if ($this->hasAlreadyLiked($post, $user)) return;

$like = new Like($post, $user);
$this->████████->save($like, flush: true);
$this->████████->dispatch(new ████████($like));`,
    answer: 'Aggiunge un like a un post. Prima controlla tre precondizioni con early return: post archiviato, auto-like, like già esistente. Solo se tutte passano, crea e salva il Like.',
    discussion: 'Cosa succederebbe senza il terzo controllo? L\'utente potrebbe likarsi lo stesso post infinite volte. Perché dispatcha un evento invece di inviare la notifica direttamente?',
    hints: ['Ci sono tre guard clause prima della logica reale', 'Cosa impedisce i like duplicati?'],
  },
  {
    id: 'mg4',
    points: 20,
    difficulty: 'media',
    signature: `private function visibleTo(QueryBuilder $qb, User $viewer): QueryBuilder`,
    body: `return $qb
    ->andWhere('p.████████ = false')
    ->andWhere('author.████████ = false')
    ->andWhere(
        $qb->expr()->orX(
            'author.isPrivate = false',
            ':viewer MEMBER OF author.████████'
        )
    )
    ->setParameter('viewer', $viewer);`,
    answer: 'Aggiunge alla QueryBuilder i filtri di visibilità: esclude post archiviati, autori sospesi, e account privati che il viewer non segue. È uno scope riusabile applicabile a qualsiasi query sui post.',
    discussion: 'Perché è un metodo privato che ritorna QueryBuilder invece di eseguire la query? Perché è riusabile — feed, hashtag, explore usano tutti questo stesso filtro senza duplicare le WHERE.',
    hints: ['Riceve e ritorna un QueryBuilder — non esegue la query', 'Aggiunge condizioni WHERE — quante e di che tipo?'],
  },
  {
    id: 'mg5',
    points: 25,
    difficulty: 'media',
    signature: `public function handle(PostPublishedEvent $event): void`,
    body: `$post    = $event->████████();
$author  = $post->████████();

foreach ($author->████████() as $follower) {
    $entry = new ████████(
        user: $follower,
        post: $post,
    );
    $this->████████->save($entry);
}

$this->████████->flush();`,
    answer: 'È un event listener che reagisce alla pubblicazione di un post. Per ogni follower dell\'autore, crea una FeedEntry — cioè aggiunge il post al feed di chi lo segue. È il pattern "fan-out on write".',
    discussion: 'Cosa succede se un utente ha 1 milione di follower? Il flush blocca il processo per secondi. La soluzione è processare i follower in batch asincroni con Symfony Messenger. Questo è il problema reale di Instagram a scala.',
    hints: ['È un handler di un evento — cosa fa dopo che un post viene pubblicato?', 'Crea qualcosa per ogni follower — cosa potrebbe essere FeedEntry?'],
  }
];

// ============================================================
//  GAME LOGIC
// ============================================================

let _bhScore = 0, _bhFound = 0;
// Traccia quali livelli hanno già mostrato la soluzione
const _bhRevealed = {};

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// --- Bug Hunt ---

function bhSubmit(id) {
  bhShowSolution(id);
}

function bhReveal(id) {
  bhShowSolution(id);
}

function bhShowSolution(id) {
  if (_bhRevealed[id]) return;
  _bhRevealed[id] = true;

  const lvl = BUG_HUNT_LEVELS.find(l => l.id === id);
  if (!lvl) return;

  const fb  = document.getElementById('bh-feedback-' + id);
  const inp = document.getElementById('bh-input-' + id);

  if (inp) inp.disabled = true;

  if (fb) {
    fb.style.display = 'flex';
    fb.className = 'callout callout--info';
    fb.innerHTML = `
      <div class="callout__icon">🔍</div>
      <div class="callout__body">
        <strong style="display:block;margin-bottom:8px;">Soluzione:</strong>
        ${lvl.solution}
        <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;gap:12px;">
          <span style="font-size:12px;color:var(--text-muted);">Hai trovato il bug?</span>
          <button class="btn" style="padding:4px 12px;font-size:12px;color:var(--good);border-color:rgba(34,197,94,0.4);"
            onclick="bhAwardPoints('${id}', ${lvl.points})">
            ✓ Sì — assegna +${lvl.points} pt
          </button>
          <button class="btn" style="padding:4px 12px;font-size:12px;" onclick="bhDismissPoints('${id}')">
            ✗ No
          </button>
        </div>
        <div id="bh-award-msg-${id}" style="font-size:12px;margin-top:8px;display:none;"></div>
      </div>`;
  }
}

function bhAwardPoints(id, points) {
  if (_bhRevealed['awarded_' + id]) return;
  _bhRevealed['awarded_' + id] = true;

  _bhScore += points;
  _bhFound++;

  const scoreEl = document.getElementById('bh-score');
  const foundEl = document.getElementById('bh-found');
  if (scoreEl) scoreEl.textContent = _bhScore;
  if (foundEl) foundEl.textContent = _bhFound;

  const okBadge = document.getElementById('bh-ok-' + id);
  if (okBadge) okBadge.style.display = '';

  const msg = document.getElementById('bh-award-msg-' + id);
  if (msg) {
    msg.style.display = 'block';
    msg.style.color = 'var(--good)';
    msg.textContent = `+${points} punti assegnati!`;
  }

  // disabilita entrambi i pulsanti award/dismiss
  const fb = document.getElementById('bh-feedback-' + id);
  if (fb) fb.querySelectorAll('button').forEach(b => b.disabled = true);
}

function bhDismissPoints(id) {
  const stBadge = document.getElementById('bh-status-' + id);
  if (stBadge) stBadge.style.display = '';

  const msg = document.getElementById('bh-award-msg-' + id);
  if (msg) {
    msg.style.display = 'block';
    msg.style.color = 'var(--text-muted)';
    msg.textContent = 'Nessun punto assegnato — continua la spiegazione.';
  }

  const fb = document.getElementById('bh-feedback-' + id);
  if (fb) fb.querySelectorAll('button').forEach(b => b.disabled = true);
}


// ── Method Guesser state ──────────────────────────────────────
let _mgScore   = 0;
let _mgCorrect = 0;
const _mgRevealed = {};

// ── Logic ─────────────────────────────────────────────────────
function mgSubmit(id) {
  mgShowAnswer(id);
}

function mgReveal(id) {
  mgShowAnswer(id);
}

function mgShowAnswer(id) {
  if (_mgRevealed[id]) return;
  _mgRevealed[id] = true;

  const lvl = METHOD_GUESSER_LEVELS.find(l => l.id === id);
  if (!lvl) return;

  const fb  = document.getElementById('mg-feedback-' + id);
  const inp = document.getElementById('mg-input-' + id);
  if (inp) inp.disabled = true;

  // nasconde i pulsanti hint che non sono ancora stati mostrati
  [0, 1].forEach(i => {
    const h = document.getElementById('mg-hint-' + id + '-' + i);
    if (h && h.style.display === 'none') h.style.display = 'none';
  });

  if (fb) {
    fb.style.display = 'flex';
    fb.className = 'callout callout--info';
    fb.innerHTML = `
      <div class="callout__icon">🔍</div>
      <div class="callout__body">
        <strong style="display:block;margin-bottom:6px;">Risposta:</strong>
        <span style="color:var(--text-primary);">${lvl.answer}</span>
        <div style="margin-top:10px;padding:10px 12px;background:var(--bg-elevated);border-radius:var(--radius-sm);border-left:3px solid var(--c-patterns);">
          <span style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--c-patterns);font-weight:600;">💬 Spunto di discussione</span><br>
          <span style="font-size:13px;color:var(--text-secondary);line-height:1.7;">${lvl.discussion}</span>
        </div>
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="font-size:12px;color:var(--text-muted);">Lo avevi intuito?</span>
          <button class="btn" style="padding:4px 12px;font-size:12px;color:var(--good);border-color:rgba(34,197,94,0.4);"
            onclick="mgAwardPoints('${id}', ${lvl.points})">
            ✓ Sì — +${lvl.points} pt
          </button>
          <button class="btn" style="padding:4px 12px;font-size:12px;"
            onclick="mgDismissPoints('${id}')">
            ✗ No — spiega meglio
          </button>
        </div>
        <div id="mg-award-msg-${id}" style="font-size:12px;margin-top:6px;display:none;"></div>
      </div>`;
  }
}

function mgAwardPoints(id, points) {
  if (_mgRevealed['awarded_' + id]) return;
  _mgRevealed['awarded_' + id] = true;

  _mgScore += points;
  _mgCorrect++;

  const scoreEl   = document.getElementById('mg-score');
  const correctEl = document.getElementById('mg-correct');
  if (scoreEl)   scoreEl.textContent   = _mgScore;
  if (correctEl) correctEl.textContent = _mgCorrect;

  const okBadge = document.getElementById('mg-ok-' + id);
  if (okBadge) okBadge.style.display = '';

  const msg = document.getElementById('mg-award-msg-' + id);
  if (msg) {
    msg.style.display = 'block';
    msg.style.color   = 'var(--good)';
    msg.textContent   = `+${points} punti assegnati!`;
  }

  const fb = document.getElementById('mg-feedback-' + id);
  if (fb) fb.querySelectorAll('button').forEach(b => b.disabled = true);
}

function mgDismissPoints(id) {
  const koBadge = document.getElementById('mg-ko-' + id);
  if (koBadge) koBadge.style.display = '';

  const msg = document.getElementById('mg-award-msg-' + id);
  if (msg) {
    msg.style.display = 'block';
    msg.style.color   = 'var(--text-muted)';
    msg.textContent   = 'Nessun punto — continua la discussione.';
  }

  const fb = document.getElementById('mg-feedback-' + id);
  if (fb) fb.querySelectorAll('button').forEach(b => b.disabled = true);
}

function mgHint(id, hintIdx) {
  const el = document.getElementById('mg-hint-' + id + '-' + hintIdx);
  if (el) el.style.display = 'flex';
}

// ============================================================
//  RENDER: Mini IDE
// ============================================================

const IDE_SECTIONS = [
  { id: 'naming',    label: '📛 Nomi',              starter: `// Sezione: Nomi\n// Scrivi qui il codice dettato dagli studenti\n\n$u = $this->getUser();\n// TODO: rinomina le variabili in modo descrittivo\n` },
  { id: 'functions', label: '⚡ Funzioni',           starter: `// Sezione: Funzioni\n// Scrivi qui il refactoring del metodo publish()\n\npublic function publish(array \$data, User \$author): Post\n{\n    // TODO: spezza in responsabilità separate\n}\n` },
  { id: 'dry',       label: '🔁 DRY',               starter: `// Sezione: DRY\n// Scrivi qui la classe InteractionPolicy unificata\n\nfinal class InteractionPolicy\n{\n    public function assertCanInteract(User \$actor, Post \$post): void\n    {\n        // TODO: unifica la logica duplicata\n    }\n}\n` },
  { id: 'comments',  label: '💬 Commenti',           starter: `// Sezione: Commenti\n// Aggiungi qui i commenti "perché" (non "cosa")\n\nif (\$post->getAuthor() === \$currentUser) {\n    // TODO: aggiungi un commento che spiega la regola Instagram\n    throw new SelfLikeNotAllowedException();\n}\n` },
  { id: 'dto',       label: '🎯 DTO & Value Obj',    starter: `// Sezione: DTO\n// Scrivi qui il PublishPostDTO tipizzato\n\nfinal class PublishPostDTO\n{\n    public function __construct(\n        // TODO: aggiungi le proprietà con i constraint\n    ) {}\n}\n` },
  { id: 'structure', label: '📐 Struttura classe',   starter: `// Sezione: Struttura classe\n// Riscrivi PostService rispettando l'ordine:\n// costanti → costruttore → metodi pubblici → privati\n\nfinal class PostService\n{\n    // TODO\n}\n` },
];

function renderIDE() {
  return `
${PageHeader({
  eyebrow: 'Tool',
  title: '🖥️ Mini IDE',
  subtitle: 'Uno spazio per ogni sezione: scrivi il codice che gli studenti ti dettano, copia, confronta.',
  accent: '#34d399',
})}
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;" id="ide-tab-btns">
  ${IDE_SECTIONS.map((s, i) => `
    <button class="tab-btn${i === 0 ? ' active' : ''}"
      style="--tab-active-bg:rgba(52,211,153,0.1);--tab-active-border:#34d399;--tab-active-color:#34d399;"
      onclick="ideSelectTab('${s.id}', this)">${s.label}</button>
  `).join('')}
</div>
${IDE_SECTIONS.map((s, i) => `
<div class="tab-panel${i === 0 ? ' active' : ''}" id="ide-panel-${s.id}">
  <div class="ide-toolbar" style="display:flex;gap:8px;align-items:center;background:var(--bg-elevated);border:1px solid var(--border-subtle);border-bottom:none;border-radius:var(--radius-md) var(--radius-md) 0 0;padding:8px 14px;">
    <div class="code-header__dots">
      <div class="code-header__dot code-header__dot--red"></div>
      <div class="code-header__dot code-header__dot--yellow"></div>
      <div class="code-header__dot code-header__dot--green"></div>
    </div>
    <span style="font-family:var(--font-code);font-size:11px;color:var(--text-muted);flex:1;">${s.label} — scratch.php</span>
    <button class="btn" style="padding:3px 10px;font-size:11px;" onclick="ideCopy('${s.id}')">📋 Copia</button>
    <button class="btn" style="padding:3px 10px;font-size:11px;" onclick="ideReset('${s.id}')">↺ Reset</button>
  </div>
  <textarea
    id="ide-area-${s.id}"
    spellcheck="false"
    style="
      width:100%;
      min-height:380px;
      background:var(--bg-surface);
      border:1px solid var(--border-subtle);
      border-radius:0 0 var(--radius-md) var(--radius-md);
      color:var(--text-primary);
      font-family:var(--font-code);
      font-size:13px;
      line-height:1.8;
      padding:16px 20px;
      resize:vertical;
      outline:none;
      tab-size:4;
      white-space:pre;
      overflow-wrap:normal;
      overflow-x:auto;
      box-sizing:border-box;
    "
  >${escapeHtml(s.starter)}</textarea>
  <div id="ide-msg-${s.id}" style="height:24px;font-size:12px;color:var(--good);padding:4px 0;"></div>
</div>
`).join('')}`;
}

function ideSelectTab(id, btn) {
  document.querySelectorAll('#ide-tab-btns .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="ide-panel-"]').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('ide-panel-' + id);
  if (panel) panel.classList.add('active');
}

function ideCopy(id) {
  const area = document.getElementById('ide-area-' + id);
  if (!area) return;
  navigator.clipboard.writeText(area.value).then(() => {
    const msg = document.getElementById('ide-msg-' + id);
    if (msg) { msg.textContent = '✓ Copiato negli appunti!'; setTimeout(() => { msg.textContent = ''; }, 2000); }
  });
}

function ideReset(id) {
  const section = IDE_SECTIONS.find(s => s.id === id);
  const area = document.getElementById('ide-area-' + id);
  if (area && section) area.value = section.starter;
}

// Tab key support nell'IDE
document.addEventListener('keydown', function(e) {
  if (e.target && e.target.id && e.target.id.startsWith('ide-area-') && e.key === 'Tab') {
    e.preventDefault();
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.substring(0, start) + '    ' + e.target.value.substring(end);
    e.target.selectionStart = e.target.selectionEnd = start + 4;
  }
});
