// ============================================================
//  VIEW: TESTING, SECURITY, COMMANDS, PERFORMANCE
//  dominio: Instagram Post
// ============================================================

// ── TESTING ───────────────────────────────────────────────────
function renderTesting() {
  const accent = '#4ade80';
  return `
${PageHeader({eyebrow:'Qualità', title:'Testing & TDD — Post Instagram',
  subtitle:'Test su PostService, LikeService, FeedService, Caption Value Object. Unit, Integration, Functional con il dominio reale.',
  accent})}
${Tabs({id:'testing', accent, tabs:[
  {label:'⚗️ Unit Tests',       content: testUnit()},
  {label:'🔗 Integration',      content: testIntegration()},
  {label:'🌐 Functional API',   content: testFunctional()},
  {label:'🎭 Mocking',          content: testMocking()},
  {label:'🏗️ TDD',             content: testTDD()},
]})}`;
}

function testUnit() {
  return `
${Callout({type:'info',title:'Unit Test — testa in isolamento totale',
  body:'Niente DB, niente Redis, niente HTTP. Testa solo la logica pura: Caption.fromString(), LikeService.like(), InteractionPolicy, ecc.'})}
${CodeBlock({filename:'CaptionTest.php — Value Object', code:
`class CaptionTest extends TestCase
{
    // Pattern AAA: Arrange → Act → Assert

    #[Test]
    public function it_parses_hashtags_from_caption(): void
    {
        // Arrange
        $raw = 'Golden hour magic ✨ #travel #photography #sunset #italy';

        // Act
        $caption  = Caption::fromString($raw);
        $hashtags = $caption->extractHashtags();

        // Assert
        self::assertCount(4, $hashtags);
        self::assertContains('travel', $hashtags);
        self::assertContains('photography', $hashtags);
        self::assertContains('sunset', $hashtags);
        self::assertContains('italy', $hashtags);
    }

    #[Test]
    public function it_deduplicates_hashtags(): void
    {
        $caption  = Caption::fromString('#travel #travel #italy #TRAVEL');
        $hashtags = $caption->extractHashtags();

        self::assertCount(2, $hashtags); // travel + italy
    }

    #[Test]
    public function it_throws_when_caption_exceeds_max_length(): void
    {
        $this->expectException(CaptionTooLongException::class);
        Caption::fromString(str_repeat('a', 2201));
    }

    #[Test]
    public function it_throws_when_too_many_hashtags(): void
    {
        $this->expectException(TooManyHashtagsException::class);
        $tags = implode(' ', array_map(fn($i) => "#tag{$i}", range(1, 31)));
        Caption::fromString($tags);
    }

    #[Test]
    public function it_extracts_mentions(): void
    {
        $caption   = Caption::fromString('Thanks @natgeo and @nasa for the feature!');
        $mentions  = $caption->extractMentions();
        self::assertSame(['natgeo', 'nasa'], $mentions);
    }

    #[Test, DataProvider('previewProvider')]
    public function it_truncates_preview_correctly(
        string $input, int $chars, string $expected
    ): void {
        $caption = Caption::fromString($input);
        self::assertSame($expected, $caption->preview($chars));
    }

    public static function previewProvider(): array
    {
        return [
            'short'   => ['Hello!', 125, 'Hello!'],
            'exact'   => [str_repeat('a', 125), 125, str_repeat('a', 125)],
            'long'    => [str_repeat('a', 130), 125, str_repeat('a', 125) . '… more'],
        ];
    }
}`,
})}
${SectionBlock({title:'LikeServiceTest.php — logica di business', content: CodeBlock({
  filename:'LikeServiceTest.php',
  code:
`class LikeServiceTest extends TestCase
{
    private LikeService   $service;
    private MockObject    $likeRepo;
    private MockObject    $dispatcher;
    private MockObject    $policy;

    protected function setUp(): void
    {
        $this->likeRepo   = $this->createMock(LikeRepositoryInterface::class);
        $this->dispatcher = $this->createMock(EventDispatcherInterface::class);
        $this->policy     = $this->createMock(InteractionPolicy::class);

        $this->service = new LikeService(
            $this->likeRepo,
            $this->dispatcher,
            $this->policy,
        );
    }

    #[Test]
    public function it_dispatches_liked_event_on_success(): void
    {
        $post = $this->makePost();
        $user = $this->makeUser(id: 99);

        $this->policy->expects(self::once())->method('assertCanInteract');
        $this->likeRepo->method('exists')->willReturn(false);
        $this->likeRepo->expects(self::once())->method('save');
        $this->dispatcher->expects(self::once())->method('dispatch')
            ->with(self::isInstanceOf(PostLikedEvent::class));

        $this->service->like($post, $user);
    }

    #[Test]
    public function it_ignores_duplicate_likes(): void
    {
        $post = $this->makePost();
        $user = $this->makeUser(id: 99);

        $this->likeRepo->method('exists')->willReturn(true); // già likato
        $this->likeRepo->expects(self::never())->method('save');
        $this->dispatcher->expects(self::never())->method('dispatch');

        $this->service->like($post, $user);
    }

    private function makePost(int $id = 1): Post
    {
        $post = $this->createMock(Post::class);
        $post->method('getId')->willReturn($id);
        $post->method('getAuthor')->willReturn($this->makeUser(id: 1));
        return $post;
    }

    private function makeUser(int $id): User
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn($id);
        return $user;
    }
}`,
})})}`;
}

function testIntegration() {
  return `
${CodeBlock({filename:'PostRepositoryTest.php — Integration con DB test', code:
`class PostRepositoryTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private PostRepository         $repo;

    protected function setUp(): void
    {
        self::bootKernel(['environment' => 'test']);
        $this->em   = static::getContainer()->get(EntityManagerInterface::class);
        $this->repo = static::getContainer()->get(PostRepository::class);

        // Schema pulito per ogni test
        (new SchemaTool($this->em))
            ->dropSchema($this->em->getMetadataFactory()->getAllMetadata());
        (new SchemaTool($this->em))
            ->createSchema($this->em->getMetadataFactory()->getAllMetadata());
    }

    #[Test]
    public function it_finds_feed_posts_from_followed_users(): void
    {
        // Arrange
        $alice = $this->createUser('alice');
        $bob   = $this->createUser('bob');
        $carol = $this->createUser('carol'); // alice non segue carol

        $alice->addFollowing($bob); // alice segue bob
        $bobPost   = $this->createPost($bob,   'Post da Bob');
        $carolPost = $this->createPost($carol, 'Post da Carol'); // non deve apparire

        $this->em->flush();
        $this->em->clear();

        // Act
        $feed = $this->repo->findFeedForUser($alice, limit: 20);

        // Assert
        self::assertCount(1, $feed);
        self::assertSame('Post da Bob', (string) $feed[0]->getCaption());
    }

    #[Test]
    public function it_excludes_archived_posts_from_feed(): void
    {
        $alice = $this->createUser('alice');
        $bob   = $this->createUser('bob');
        $alice->addFollowing($bob);

        $active   = $this->createPost($bob, 'Post attivo');
        $archived = $this->createPost($bob, 'Post archiviato');
        $archived->archive();

        $this->em->flush();
        $this->em->clear();

        $feed = $this->repo->findFeedForUser($alice, limit: 20);
        self::assertCount(1, $feed);
        self::assertSame('Post attivo', (string) $feed[0]->getCaption());
    }

    private function createUser(string $username): User
    {
        $user = new User($username, "{$username}@test.com");
        $this->em->persist($user);
        return $user;
    }

    private function createPost(User $author, string $caption): Post
    {
        $post = new Post($author);
        $post->setCaption(Caption::fromString($caption));
        $this->em->persist($post);
        return $post;
    }
}`,
})}`;
}

function testFunctional() {
  return `
${CodeBlock({filename:'PostApiTest.php — Functional Test HTTP completo', code:
`class PostApiTest extends WebTestCase
{
    use ResetDatabase;

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    #[Test]
    public function it_publishes_a_post_with_hashtags(): void
    {
        // Arrange — crea utente con Foundry
        $user = UserFactory::createOne(['username' => 'alice', 'isVerified' => true]);
        $this->client->loginUser($user->object());

        // Act
        $this->client->request('POST', '/api/posts',
            server:  ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'caption' => 'Golden hour ✨ #travel #photography',
                'type'    => 'photo',
            ])
        );

        // Assert
        self::assertResponseStatusCodeSame(201);
        $data = json_decode($this->client->getResponse()->getContent(), true);
        self::assertArrayHasKey('shortCode', $data);
        self::assertSame('photo', $data['type']);
        self::assertContains('travel', $data['hashtags']);
        self::assertContains('photography', $data['hashtags']);
    }

    #[Test]
    public function it_returns_422_when_caption_is_too_long(): void
    {
        $user = UserFactory::createOne();
        $this->client->loginUser($user->object());

        $this->client->request('POST', '/api/posts',
            server:  ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['caption' => str_repeat('a', 2201), 'type' => 'photo'])
        );

        self::assertResponseStatusCodeSame(422);
        $data = json_decode($this->client->getResponse()->getContent(), true);
        self::assertSame('CAPTION_TOO_LONG', $data['error']['code']);
    }

    #[Test]
    public function it_returns_409_when_liking_same_post_twice(): void
    {
        $user = UserFactory::createOne();
        $post = PostFactory::createOne(['author' => UserFactory::createOne()]);
        $this->client->loginUser($user->object());

        $this->client->request('POST', "/api/posts/{$post->getId()}/like");
        self::assertResponseStatusCodeSame(200);

        $this->client->request('POST', "/api/posts/{$post->getId()}/like");
        self::assertResponseStatusCodeSame(409); // ALREADY_LIKED
    }

    #[Test]
    public function it_returns_401_for_unauthenticated_requests(): void
    {
        $this->client->request('GET', '/api/feed');
        self::assertResponseStatusCodeSame(401);
    }

    #[Test]
    public function it_returns_403_when_liking_own_post(): void
    {
        $user = UserFactory::createOne();
        $post = PostFactory::createOne(['author' => $user]);
        $this->client->loginUser($user->object());

        $this->client->request('POST', "/api/posts/{$post->getId()}/like");
        self::assertResponseStatusCodeSame(400);
        $data = json_decode($this->client->getResponse()->getContent(), true);
        self::assertSame('SELF_LIKE', $data['error']['code']);
    }
}`,
})}`;
}

function testMocking() {
  return `
${CodeBlock({filename:'FeedServiceTest.php — Mock completo con behavior verification', code:
`class FeedServiceTest extends TestCase
{
    #[Test]
    public function it_returns_cached_feed_without_hitting_db(): void
    {
        $user   = $this->createStub(User::class);
        $cached = [/* array di post mockati */];

        $feedCache = $this->createMock(FeedCacheInterface::class);
        $feedCache->method('getFeedForUser')->willReturn($cached); // cache hit!

        $postRepo = $this->createMock(PostRepositoryInterface::class);
        $postRepo->expects(self::never())->method('findFeedForUser'); // DB mai chiamato!

        $service = new FeedService($postRepo, $feedCache, new ChronologicalRanking());
        $result  = $service->getForUser($user);

        self::assertSame($cached, $result);
    }

    #[Test]
    public function it_populates_cache_on_cache_miss(): void
    {
        $user      = $this->createStub(User::class);
        $dbPosts   = [/* post dal DB */];

        $feedCache = $this->createMock(FeedCacheInterface::class);
        $feedCache->method('getFeedForUser')->willReturn(null); // cache miss!
        $feedCache->expects(self::once())
            ->method('setFeedForUser')
            ->with($user, 1, $dbPosts);  // deve salvare in cache

        $postRepo = $this->createMock(PostRepositoryInterface::class);
        $postRepo->method('findFeedForUser')->willReturn($dbPosts);

        $service = new FeedService($postRepo, $feedCache, new ChronologicalRanking());
        $service->getForUser($user);
        // Il semplice fatto che non throwava e ha chiamato setFeedForUser è sufficiente
    }
}`,
})}`;
}

function testTDD() {
  return `
${Callout({type:'good',title:'TDD — Red → Green → Refactor con il dominio Instagram',
  body:'Scrivi prima il test del comportamento atteso, poi il codice minimo, poi refactora. Ogni ciclo dura pochi minuti.'})}
<div class="steps" style="--accent-color:#4ade80">
  <div class="step"><div class="step__number" style="border-color:#ef4444;color:#ef4444">1</div>
    <div class="step__content"><div class="step__title" style="color:#ef4444">🔴 RED — Scrivi il test (che fallisce)</div>
    <div class="step__desc">Definisci il comportamento prima che esista il codice. Cosa deve fare Caption.extractHashtags()?</div></div></div>
  <div class="step"><div class="step__number" style="border-color:#4ade80;color:#4ade80">2</div>
    <div class="step__content"><div class="step__title" style="color:#4ade80">🟢 GREEN — Codice minimo per passare</div>
    <div class="step__desc">Solo il codice necessario. Anche una implementazione banale va bene — l'importante è il verde.</div></div></div>
  <div class="step"><div class="step__number" style="border-color:#f59e0b;color:#f59e0b">3</div>
    <div class="step__content"><div class="step__title" style="color:#f59e0b">🔵 REFACTOR — Migliora con fiducia</div>
    <div class="step__desc">I test sono la rete di sicurezza. Refactora senza paura — se rompi qualcosa, lo sai subito.</div></div></div>
</div>
${CodeBlock({filename:'TDD — Caption::extractHashtags() ciclo completo', code:
`// 🔴 STEP 1 — RED: il test esiste, Caption non ancora
#[Test]
public function it_extracts_hashtags_from_caption(): void
{
    $caption  = Caption::fromString('Magic ✨ #travel #photography');
    $hashtags = $caption->extractHashtags();  // metodo non esiste → TEST FALLISCE
    self::assertContains('travel', $hashtags);
}

// 🟢 STEP 2 — GREEN: implementazione minima
final class Caption
{
    public function __construct(private readonly string $value) {}

    public static function fromString(string $raw): self
    {
        return new self(trim($raw));  // minimo per passare
    }

    public function extractHashtags(): array
    {
        preg_match_all('/#(\\w+)/', $this->value, $matches);
        return $matches[1];           // TEST PASSA 🟢
    }
}

// 🔵 STEP 3 — REFACTOR: aggiungi validazione, dedup, unicode
final class Caption
{
    public const MAX_LENGTH   = 2200;
    public const MAX_HASHTAGS = 30;

    private function __construct(private readonly string $value) {}

    public static function fromString(string $raw): self
    {
        $trimmed = trim($raw);
        if (mb_strlen($trimmed) > self::MAX_LENGTH)
            throw new CaptionTooLongException(mb_strlen($trimmed));
        if (count(self::parseHashtags($trimmed)) > self::MAX_HASHTAGS)
            throw new TooManyHashtagsException();
        return new self($trimmed);
    }

    public function extractHashtags(): array
    {
        return self::parseHashtags($this->value);
    }

    private static function parseHashtags(string $text): array
    {
        // Unicode, dedup, lowercase — TUTTI I TEST PASSANO 🟢
        preg_match_all('/#([\\w\\x{00C0}-\\x{024F}]+)/u', $text, $m);
        return array_unique(array_map('strtolower', $m[1]));
    }
}`,
})}`;
}

// ── COMMANDS ──────────────────────────────────────────────────
function renderCommands() {
  const accent = '#60a5fa';
  return `
${PageHeader({eyebrow:'Symfony & PHP', title:'Console Commands',
  subtitle:'Command per manutenzione del social: cleanup post scaduti, reindex Elasticsearch, statistiche hashtag, cleanup media orfani.',
  accent})}
${CodeBlock({filename:'CleanupExpiredStoriesCommand.php', code:
`#[AsCommand(
    name:        'app:cleanup:expired-stories',
    description: 'Archivia automaticamente le Stories scadute (>24h)',
)]
class CleanupExpiredStoriesCommand extends Command
{
    public function __construct(
        private readonly PostRepository  $postRepo,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Simula senza archiviare')
            ->addOption('batch',   null, InputOption::VALUE_OPTIONAL, 'Batch size', 100);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io      = new SymfonyStyle($input, $output);
        $dryRun  = $input->getOption('dry-run');
        $batch   = (int) $input->getOption('batch');

        $io->title('Cleanup Stories scadute (>24h)');
        if ($dryRun) $io->warning('DRY-RUN: nessun dato verrà modificato');

        $expiredBefore = new \\DateTimeImmutable('-24 hours');
        $stories       = $this->postRepo->findExpiredStories($expiredBefore, $batch);

        if (empty($stories)) {
            $io->success('Nessuna story scaduta trovata.');
            return Command::SUCCESS;
        }

        $io->progressStart(count($stories));
        $archived = 0;

        foreach ($stories as $story) {
            if (!$dryRun) {
                $story->archive();
                $this->postRepo->save($story);
            }
            $archived++;
            $io->progressAdvance();
        }

        if (!$dryRun) {
            $this->postRepo->flush();
        }

        $io->progressFinish();
        $io->success("Stories archiviate: {$archived}");
        $this->logger->info('Stories cleanup', ['count' => $archived, 'dry_run' => $dryRun]);

        return Command::SUCCESS;
    }
}

# Eseguito via cron ogni ora
# 0 * * * * php bin/console app:cleanup:expired-stories --env=prod`,
})}`;
}

// ── SECURITY ─────────────────────────────────────────────────
function renderSecurity() {
  const accent = '#f87171';
  return `
${PageHeader({eyebrow:'Symfony & PHP', title:'Security — Voters & Protezioni',
  subtitle:'Chi può vedere, modificare, eliminare un Post? Voters granulari per ogni azione del social.',
  accent})}
${Tabs({id:'security', accent, tabs:[
  {label:'🗳️ PostVoter',     content: secVoter()},
  {label:'🔐 Auth & JWT',   content: secAuth()},
  {label:'🛡️ Protezioni',   content: secProtections()},
]})}`;
}

function secVoter() {
  return `
${CodeBlock({filename:'PostVoter.php — chi può fare cosa su un Post', code:
`class PostVoter extends Voter
{
    const VIEW      = 'post.view';
    const EDIT      = 'post.edit';
    const DELETE    = 'post.delete';
    const LIKE      = 'post.like';
    const COMMENT   = 'post.comment';
    const ARCHIVE   = 'post.archive';
    const REPORT    = 'post.report';

    public function __construct(
        private readonly FollowRepositoryInterface $followRepo,
    ) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [
            self::VIEW, self::EDIT, self::DELETE,
            self::LIKE, self::COMMENT, self::ARCHIVE, self::REPORT
        ]) && $subject instanceof Post;
    }

    protected function voteOnAttribute(string $attribute, mixed $post, TokenInterface $token): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) return false;
        if ($user->isSuspended())   return false;

        return match($attribute) {
            self::VIEW    => $this->canView($post, $user),
            self::EDIT    => $this->canEdit($post, $user),
            self::DELETE  => $this->canDelete($post, $user),
            self::LIKE    => $this->canLike($post, $user),
            self::COMMENT => $this->canComment($post, $user),
            self::ARCHIVE => $this->canArchive($post, $user),
            self::REPORT  => $this->canReport($post, $user),
            default       => false,
        };
    }

    // Può vedere: account pubblico, o follower di account privato, o è l'autore
    private function canView(Post $post, User $user): bool
    {
        if ($post->isArchived() && !$post->isOwnedBy($user)) return false;
        if ($post->getAuthor()->hasBlocked($user))           return false;
        if ($user->hasBlocked($post->getAuthor()))           return false;
        if ($post->getAuthor()->isPrivate() && !$post->isOwnedBy($user)) {
            return $this->followRepo->isFollowing($user, $post->getAuthor());
        }
        return true;
    }

    // Può modificare: solo il proprietario, solo se non archiviato
    private function canEdit(Post $post, User $user): bool
    {
        return $post->isOwnedBy($user) && !$post->isArchived();
    }

    // Può eliminare: proprietario o admin
    private function canDelete(Post $post, User $user): bool
    {
        return $post->isOwnedBy($user) || in_array('ROLE_ADMIN', $user->getRoles());
    }

    // Può likare: può vedere + non è il suo post + non è già archiviato
    private function canLike(Post $post, User $user): bool
    {
        return $this->canView($post, $user)
            && !$post->isOwnedBy($user)
            && !$post->isArchived();
    }

    // Può commentare: può vedere + commenti abilitati dall'autore
    private function canComment(Post $post, User $user): bool
    {
        return $this->canView($post, $user) && $post->canReceiveComments();
    }

    private function canArchive(Post $post, User $user): bool { return $post->isOwnedBy($user); }
    private function canReport(Post $post, User $user): bool  { return !$post->isOwnedBy($user); }
}

// Uso nel Controller — semplice e dichiarativo
class PostController extends AbstractController
{
    #[Route('/api/posts/{id}', methods: ['DELETE'])]
    public function delete(Post $post): Response
    {
        $this->denyAccessUnlessGranted(PostVoter::DELETE, $post);
        // ...
    }

    #[Route('/api/posts/{id}/like', methods: ['POST'])]
    public function like(Post $post): Response
    {
        $this->denyAccessUnlessGranted(PostVoter::LIKE, $post);
        // ...
    }
}`,
})}`;
}

function secAuth() {
  return `
${CodeBlock({filename:'security.yaml — JWT + refresh token', code:
`security:
    # Configurazione hashing password
    password_hashers:
        App\\Entity\\User:        # Entità User
            algorithm: argon2id # Algoritmo sicuro moderno (più resistente di bcrypt)

    # Provider utenti
    providers: // dice a Symfony come trovare un utente per login e permessi
        app_users:
            entity: 
                class: App\\Entity\\User   # Usa entità User come provider
                property: email         # Identifica utenti tramite email

    # Firewalls: protezione percorsi e autenticazione
    firewalls: // I firewall sono linee di protezione per i percorsi. In questo config ci sono due firewall principali:
        api:
            pattern:   ^/api       # Tutti i percorsi /api
            stateless: true        # Nessuna sessione, tipico per API REST 
            jwt: ~                  # Autenticazione tramite JWT

        main:
            lazy: true             # Attiva il firewall solo quando serve
            provider: app_users    # Usa il provider definito sopra
            form_login:
                login_path:  app_login   # Percorso pagina login
                check_path:  app_login   # Percorso verifica username/password
                enable_csrf: true        # Protezione CSRF: tipo di attacco dove un sito malevolo fa eseguire azioni a un utente autenticato senza il suo consenso
                \n Symfony genera un token segreto unico per ogni form e sessione
                \n Il token viene inviato insieme ai dati del form
                \n Quando Symfony riceve il form, controlla che il token sia valido
            logout:
                path: app_logout         # Percorso logout
                delete_cookies: [REMEMBERME] # Cancella cookie di "ricordami"
            remember_me:
                secret:   '%kernel.secret%' # Chiave per token "ricordami"
                lifetime: 2592000          # 30 giorni in secondi

    # Controllo accessi: chi può accedere a cosa
    access_control:
        - { path: ^/api/auth/login,    roles: PUBLIC_ACCESS } # Login aperto a tutti
        - { path: ^/api/auth/register, roles: PUBLIC_ACCESS } # Registrazione aperta
        - { path: ^/api/p/,            roles: PUBLIC_ACCESS } # Post pubblici accessibili a tutti
        - { path: ^/api/admin,         roles: ROLE_ADMIN }    # Solo admin Symfony controlla il ruolo prima di accedere al percorso. Questo significa che solo gli utenti con ROLE_ADMIN possono entrare.
        - { path: ^/api,               roles: ROLE_USER }     # Tutte le altre API richiedono login`,
})}`;
}

function secProtections() {
  return `
${CompareGrid({
  badCode:
`// SQL Injection — MAI così
$username = $request->get('q');
$users = $conn->fetchAll(
    "SELECT * FROM users
     WHERE username LIKE '%{$username}%'"
    // Se username = "' OR '1'='1" → disastro!
);

// XSS — MAI output raw
echo $post->getCaption();
// Se caption contiene <script>alert(1)</script>
// → eseguito nel browser dell'utente!

// CSRF — form senza protezione
<form method="POST" action="/delete-account">
    <button>Elimina account</button>
</form>`,
  goodCode:
`// SQL Injection — sempre parametri bindati
$users = $this->createQueryBuilder('u')
    ->where('u.username LIKE :q')
    ->setParameter('q', '%' . $username . '%')
    ->getQuery()->getResult();
// Doctrine escapa automaticamente — sicuro

// XSS — Twig escapa sempre
{{ post.caption }}         {# escaped: sicuro #}
{{ post.caption|raw }}     {# attenzione! solo HTML fidato #}

// CSRF — Symfony lo gestisce nei form
class DeleteAccountType extends AbstractType {
    public function configureOptions(OptionsResolver $r): void {
        $r->setDefaults(['csrf_protection' => true]); // default!
    }
}`,
})}
${SectionBlock({title:'Content Security Policy per il social', content: CodeBlock({
  filename:'SecurityHeadersSubscriber.php',
  code:
`class SecurityHeadersSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::RESPONSE => 'onResponse'];
    }

    public function onResponse(ResponseEvent $event): void
    {
        $response = $event->getResponse();

        // Impedisce clickjacking (embed in iframe)
        $response->headers->set('X-Frame-Options', 'DENY');

        // Impedisce MIME sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Permette media solo dal nostro CDN
        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "img-src 'self' https://cdn.instagram-clone.com data: blob:",
            "media-src 'self' https://cdn.instagram-clone.com blob:",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",  // Tailwind inline styles
            "connect-src 'self' https://api.instagram-clone.com",
            "frame-ancestors 'none'",
        ]));
    }
}`,
})})}`;
}

// ── PERFORMANCE ───────────────────────────────────────────────
function renderPerformance() {
  const accent = '#c084fc';
  return `
${PageHeader({eyebrow:'Infrastruttura', title:'Performance',
  subtitle:'Un social con milioni di post deve rispondere in <100ms. Profiling, N+1, OPcache, HTTP cache — strumenti concreti.',
  accent})}
${Tabs({id:'perf', accent, tabs:[
  {label:'📊 Profiling',      content: perfProfiling()},
  {label:'🗄️ N+1 & Indici',  content: perfDB()},
  {label:'⚡ OPcache',        content: perfOPcache()},
  {label:'🚀 HTTP Cache',     content: perfHTTP()},
]})}`;
}

function perfProfiling() {
  return `
${Callout({type:'warn',title:'Prima misura, poi ottimizza',
  body:'"Premature optimization is the root of all evil" — Knuth. Usa il Symfony Profiler in dev e Blackfire in staging per trovare dove il tempo va davvero.'})}
${CodeBlock({filename:'Stopwatch — misura sezioni critiche del feed', code:
`class FeedService
{
    public function __construct(
        private readonly PostRepositoryInterface $postRepo,
        private readonly RedisFeedCache          $cache,
        private readonly Stopwatch               $stopwatch,
    ) {}

    public function getForUser(User $user, int $limit = 20): array
    {
        $sw = $this->stopwatch->start('feed.get', 'business');

        // Misura cache lookup
        $this->stopwatch->start('feed.cache.lookup');
        $cached = $this->cache->getFeedForUser($user);
        $this->stopwatch->stop('feed.cache.lookup');

        if ($cached !== null) {
            $sw->stop();
            return $cached;
        }

        // Misura DB query
        $this->stopwatch->start('feed.db.query');
        $posts = $this->postRepo->findFeedForUser($user, $limit * 3);
        $this->stopwatch->stop('feed.db.query');

        // Misura ranking
        $this->stopwatch->start('feed.ranking');
        $ranked = $this->ranking->rank($posts, $user);
        $this->stopwatch->stop('feed.ranking');

        $result = array_slice($ranked, 0, $limit);
        $this->cache->setFeedForUser($user, 1, $result);

        $event = $sw->stop();
        // Visibile nel Symfony Profiler → Timeline
        // Se > 100ms → da ottimizzare
        return $result;
    }
}`,
})}`;
}

function perfDB() {
  return `
${CompareGrid({
  badCode:
`// N+1: feed con 20 post = 61+ query
$posts = $postRepo->findFeedForUser($user, 20);
// 1 query

foreach ($posts as $post) {
    $author    = $post->getAuthor();     // +1 query
    $thumbnail = $post->getFirstMedia(); // +1 query
    $likeCount = $post->getLikeCount(); // +1 query (EXTRA_LAZY)
    echo $author->getUsername();
}
// 1 + 20 + 20 + 20 = 61 query!`,
  goodCode:
`// Eager loading: sempre 1 query
public function findFeedForUser(User $user, int $limit): array
{
    return $this->createQueryBuilder('p')
        ->select('p', 'author', 'avatar', 'media')
        ->join('p.author', 'author')
        ->join('author.profilePicture', 'avatar')
        ->leftJoin('p.mediaFiles', 'media', 'WITH', 'media.position = 0')
        ->join('author.followers', 'f')
        ->where('f = :user')
        ->andWhere('p.isArchived = false')
        ->setParameter('user', $user)
        ->orderBy('p.publishedAt', 'DESC')
        ->setMaxResults($limit)
        ->getQuery()
        ->getResult();
    // Like count → Redis cache separata (non da DB)
}`,
})}
${SectionBlock({title:'Indici MySQL per le query del social', content: CodeBlock({
  filename:'Post.php — @Index strategici',
  code:
`// Indici per le query più comuni del feed
#[ORM\\Index(columns: ['author_id', 'is_archived', 'published_at'],
             name: 'idx_post_feed')]              // feed cronologico
#[ORM\\Index(columns: ['published_at'],
             name: 'idx_post_published_at')]      // explore recenti
#[ORM\\Index(columns: ['short_code'],
             name: 'idx_post_short_code')]        // lookup /p/{shortCode}

// Tabella likes — query più frequente del social!
#[ORM\\UniqueConstraint(columns: ['post_id', 'user_id'],
             name: 'uniq_like_post_user')]        // no duplicati
#[ORM\\Index(columns: ['post_id', 'liked_at'],
             name: 'idx_like_post_date')]         // ultimi like di un post
#[ORM\\Index(columns: ['user_id', 'liked_at'],
             name: 'idx_like_user_date')]         // post likati dall'utente

// EXPLAIN per verificare che gli indici siano usati
$plan = $conn->fetchAllAssociative(
    'EXPLAIN SELECT p.* FROM posts p
     JOIN user_follows f ON f.following_id = p.author_id
     WHERE f.follower_id = ? AND p.is_archived = 0
     ORDER BY p.published_at DESC LIMIT 20',
    [$user->getId()]
);
// Deve usare idx_post_feed — se fa full scan: indice mancante!`,
})})}`;
}

function perfOPcache() {
  return `
${CodeBlock({filename:'php.ini — OPcache per produzione', code:
`[opcache]
opcache.enable=1
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.max_accelerated_files=20000
opcache.revalidate_freq=0       ; 0 = non ricontrollare file (prod)
opcache.validate_timestamps=0   ; 0 = non leggere mtime (max performance)
opcache.save_comments=1         ; necessario per attributi PHP 8
opcache.huge_code_pages=1
opcache.jit=1255                ; JIT per PHP 8 (trampoline mode)
opcache.jit_buffer_size=128M

; Preloading — carica classi critiche a startup
opcache.preload=/var/www/html/config/preload.php
opcache.preload_user=www-data`,
})}
${CodeBlock({filename:'config/preload.php', code:
`<?php
// Preloading: le classi più usate sono già in memoria OPcache
// Riduce il tempo di prima risposta del 30-50%

require_once __DIR__ . '/../vendor/autoload.php';

// Precarica il kernel Symfony
(new App\\Kernel('prod', false))->boot();

// Classi del dominio Instagram usate in ogni request
$classes = [
    App\\Entity\\Post::class,
    App\\Entity\\User::class,
    App\\Entity\\Like::class,
    App\\Entity\\Comment::class,
    App\\Entity\\Hashtag::class,
    App\\ValueObject\\Caption::class,
    App\\Service\\FeedService::class,
    App\\Service\\PostService::class,
    App\\Repository\\PostRepository::class,
];

foreach ($classes as $class) {
    opcache_compile_file((new ReflectionClass($class))->getFileName());
}`,
})}`;
}

function perfHTTP() {
  return `
${CodeBlock({filename:'HTTP Cache per le pagine pubbliche del profilo', code:
`class ProfileController extends AbstractController
{
    // Pagina profilo pubblico — cachata dal CDN
    #[Route('/api/users/{username}/posts')]
    public function profilePosts(User $profileUser, Request $req): Response
    {
        $response = new JsonResponse(
            $this->postRepo->findPublicPostsByUser($profileUser, $this->getUser(), 30)
        );

        // Se account pubblico: cache CDN 5 minuti
        if (!$profileUser->isPrivate()) {
            $response->setPublic();
            $response->setMaxAge(300);
            $response->setSharedMaxAge(300);
            $response->setLastModified($profileUser->getLastPostAt());
            $response->setEtag(md5($profileUser->getLastPostAt()?->format('c') ?? ''));

            // 304 Not Modified se non cambiato (risparmia banda)
            if ($response->isNotModified($req)) {
                return $response;
            }
        } else {
            // Account privato: no cache pubblica
            $response->setPrivate();
            $response->setMaxAge(0);
        }

        return $response;
    }

    // Post singolo — cache più lunga (cambia raramente)
    #[Route('/api/p/{shortCode}')]
    public function show(string $shortCode, Request $req): Response
    {
        $post = $this->postRepo->findByShortCode($shortCode);
        if (!$post) throw $this->createNotFoundException();

        $response = new JsonResponse($this->serializer->normalize($post));

        if (!$post->getAuthor()->isPrivate()) {
            $response->setPublic()->setSharedMaxAge(3600); // 1 ora su CDN
            $response->setEtag(md5($post->getUpdatedAt()?->format('c') ?? $post->getId()));
            if ($response->isNotModified($req)) return $response;
        }

        return $response;
    }
}`,
})}`;
}
