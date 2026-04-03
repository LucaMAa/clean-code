// ============================================================
//  VIEW: DOCTRINE, EVENTS, REDIS, ELASTICSEARCH
//  dominio: Instagram Post
// ============================================================

// ── DOCTRINE ORM ─────────────────────────────────────────────
function renderDoctrine() {
  const accent = '#34d399';
  return `
${PageHeader({eyebrow:'Symfony & PHP', title:'Doctrine ORM',
  subtitle:'Mapping delle entità del social: Post, User, Like, Comment, Follow, Hashtag, MediaFile.',
  accent})}
${Tabs({id:'doctrine', accent, tabs:[
  {label:'📦 Entity Post',    content: docEntity()},
  {label:'📚 Repository',    content: docRepo()},
  {label:'🔍 Query Builder', content: docQB()},
  {label:'🔗 Relazioni',     content: docRelations()},
  {label:'🔄 Lifecycle',     content: docLifecycle()},
  {label:'🗂️ Migrations',    content: docMigrations()},
]})}`;
}

function docEntity() {
  return `
${Callout({type:'info',title:'Entity = POPO — Plain Old PHP Object',
  body:'Le Entity non dipendono da Doctrine. Sono classi PHP con attributi PHP 8.1. Doctrine le legge via Reflection per generare SQL — le entità non sanno di essere persistite.'})}
${CodeBlock({filename:'Post.php — Entity completa', code:
`<?php
declare(strict_types=1);

namespace App\\Entity;

use App\\Repository\\PostRepository;
use App\\ValueObject\\Caption;
use Doctrine\\Common\\Collections\\{ArrayCollection, Collection};
use Doctrine\\ORM\\Mapping as ORM;

#[ORM\\Entity(repositoryClass: PostRepository::class)]
#[ORM\\Table(name: 'posts')]
#[ORM\\HasLifecycleCallbacks]
#[ORM\\Index(columns: ['published_at'], name: 'idx_post_published_at')]
#[ORM\\Index(columns: ['author_id', 'is_archived'], name: 'idx_post_author_status')]
class Post
{
    public const TYPE_PHOTO    = 'photo';
    public const TYPE_VIDEO    = 'video';
    public const TYPE_REEL     = 'reel';
    public const TYPE_CAROUSEL = 'carousel';
    public const TYPE_STORY    = 'story';

    #[ORM\\Id, ORM\\GeneratedValue, ORM\\Column]
    private ?int $id = null;

    #[ORM\\Column(length: 12, unique: true)]
    private string $shortCode; // es: "Dv3kR9xABCd"

    #[ORM\\ManyToOne(targetEntity: User::class, inversedBy: 'posts')]
    #[ORM\\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $author;

    #[ORM\\Column(type: 'text', nullable: true)]
    private ?string $caption = null;

    #[ORM\\Column(length: 20)]
    private string $type = self::TYPE_PHOTO;

    #[ORM\\Column]
    private bool $isArchived = false;

    #[ORM\\Column]
    private bool $commentsEnabled = true;

    #[ORM\\Column]
    private bool $likesVisible = true;

    #[ORM\\Column(type: 'decimal', precision: 9, scale: 6, nullable: true)]
    private ?float $latitude = null;

    #[ORM\\Column(type: 'decimal', precision: 9, scale: 6, nullable: true)]
    private ?float $longitude = null;

    #[ORM\\Column(type: 'string', length: 100, nullable: true)]
    private ?string $locationName = null;

    #[ORM\\Column(type: 'datetime_immutable')]
    private \\DateTimeImmutable $publishedAt;

    #[ORM\\Column(type: 'datetime_immutable', nullable: true)]
    private ?\\DateTimeImmutable $updatedAt = null;

    // Relazioni
    #[ORM\\OneToMany(mappedBy: 'post', targetEntity: MediaFile::class,
        cascade: ['persist','remove'], orphanRemoval: true)]
    #[ORM\\OrderBy(['position' => 'ASC'])]
    private Collection $mediaFiles;

    #[ORM\\OneToMany(mappedBy: 'post', targetEntity: Like::class,
        cascade: ['remove'], fetch: 'EXTRA_LAZY')]
    private Collection $likes;

    #[ORM\\OneToMany(mappedBy: 'post', targetEntity: Comment::class,
        cascade: ['persist','remove'], orphanRemoval: true)]
    #[ORM\\OrderBy(['createdAt' => 'ASC'])]
    private Collection $comments;

    #[ORM\\ManyToMany(targetEntity: Hashtag::class, inversedBy: 'posts')]
    #[ORM\\JoinTable(name: 'post_hashtags')]
    private Collection $hashtags;

    #[ORM\\ManyToMany(targetEntity: User::class)]
    #[ORM\\JoinTable(name: 'post_tagged_users')]
    private Collection $taggedUsers;

    public function __construct(User $author, string $type = self::TYPE_PHOTO)
    {
        $this->author      = $author;
        $this->type        = $type;
        $this->shortCode   = $this->generateShortCode();
        $this->publishedAt = new \\DateTimeImmutable();
        $this->mediaFiles  = new ArrayCollection();
        $this->likes       = new ArrayCollection();
        $this->comments    = new ArrayCollection();
        $this->hashtags    = new ArrayCollection();
        $this->taggedUsers = new ArrayCollection();
    }

    // Logica di business nell'entity (domain model ricco)
    public function isOwnedBy(User $user): bool     { return $this->author === $user; }
    public function isArchived(): bool               { return $this->isArchived; }
    public function hasLocation(): bool              { return $this->latitude !== null; }
    public function isCarousel(): bool               { return $this->type === self::TYPE_CAROUSEL; }
    public function canReceiveComments(): bool       { return $this->commentsEnabled && !$this->isArchived; }
    public function getLikeCount(): int              { return $this->likes->count(); }
    public function getCommentCount(): int           { return $this->comments->count(); }
    public function getFirstMedia(): ?MediaFile      { return $this->mediaFiles->first() ?: null; }

    public function archive(): void
    {
        $this->isArchived = true;
        $this->updatedAt  = new \\DateTimeImmutable();
    }

    public function addHashtag(Hashtag $hashtag): void
    {
        if (!$this->hashtags->contains($hashtag))
            $this->hashtags->add($hashtag);
    }

    #[ORM\\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \\DateTimeImmutable();
    }

    private function generateShortCode(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
        return implode('', array_map(fn() => $chars[random_int(0, strlen($chars)-1)], range(1,11)));
    }
}`,
})}`;
}

function docRepo() {
  return `
${Callout({type:'warn',title:'Mai query nel Controller o nel Service!',
  body:'Il Repository è l\'unico posto dove costruire query. Il Controller chiama il Service, il Service chiama il Repository — mai salti di layer.'})}
${CodeBlock({filename:'PostRepository.php — Repository completo', code:
`class PostRepository extends ServiceEntityRepository
    implements PostRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Post::class);
    }

    // ── Lettura ───────────────────────────────────────────────

    public function findById(int $id): ?Post
    {
        return $this->find($id);
    }

    public function findByShortCode(string $code): ?Post
    {
        return $this->findOneBy(['shortCode' => $code]);
    }

    /** Feed cronologico — post degli utenti seguiti */
    public function findFeedForUser(User $user, int $limit = 20): array
    {
        return $this->createQueryBuilder('p')
            ->select('p', 'author', 'media')
            ->join('p.author', 'author')
            ->leftJoin('p.mediaFiles', 'media')
            ->join('author.followers', 'f')
            ->where('f = :user')
            ->andWhere('p.isArchived = false')
            ->andWhere('author.isSuspended = false')
            ->setParameter('user', $user)
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** Post di un utente visibili al viewer */
    public function findPublicPostsByUser(User $author, User $viewer, int $limit = 30): array
    {
        $qb = $this->createQueryBuilder('p')
            ->select('p', 'media')
            ->leftJoin('p.mediaFiles', 'media')
            ->where('p.author = :author')
            ->andWhere('p.isArchived = false')
            ->setParameter('author', $author)
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults($limit);

        // Se account privato, solo i follower vedono i post
        if ($author->isPrivate() && $author !== $viewer) {
            $qb->join('Author.followers', 'f')
               ->andWhere('f = :viewer')
               ->setParameter('viewer', $viewer);
        }
        return $qb->getQuery()->getResult();
    }

    /** Explore: post recenti con hashtag, non già visti */
    public function findExploreByHashtag(Hashtag $tag, User $viewer, int $limit = 20): array
    {
        return $this->createQueryBuilder('p')
            ->select('p', 'author', 'media')
            ->join('p.author', 'author')
            ->leftJoin('p.mediaFiles', 'media')
            ->join('p.hashtags', 'h')
            ->where('h = :tag')
            ->andWhere('p.isArchived = false')
            ->andWhere('author.isPrivate = false')
            ->andWhere('author.isSuspended = false')
            ->andWhere('p.author != :viewer')
            ->setParameter('tag', $tag)
            ->setParameter('viewer', $viewer)
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** Top post per like nell'ultimo mese */
    public function findTrendingThisMonth(int $limit = 10): array
    {
        $since = new \\DateTimeImmutable('-30 days');
        return $this->createQueryBuilder('p')
            ->select('p', 'COUNT(l.id) as HIDDEN likeCount')
            ->join('p.likes', 'l')
            ->join('p.author', 'a')
            ->where('p.publishedAt >= :since')
            ->andWhere('p.isArchived = false')
            ->andWhere('a.isPrivate = false')
            ->setParameter('since', $since)
            ->groupBy('p.id')
            ->orderBy('likeCount', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    // ── Scrittura ─────────────────────────────────────────────

    public function save(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->persist($post);
        if ($flush) $this->getEntityManager()->flush();
    }

    public function delete(Post $post, bool $flush = false): void
    {
        $this->getEntityManager()->remove($post);
        if ($flush) $this->getEntityManager()->flush();
    }
}`,
})}`;
}

function docQB() {
  return `
${Callout({type:'warn',title:'Problema N+1 — il killer delle performance',
  body:'Caricare 20 post del feed e poi fare una query per ogni autore, ogni thumbnail, ogni like count = 60+ query invece di 1. Usa JOIN + addSelect().'})}
${CompareGrid({
  badCode:
`// N+1: 1 query + N query per ogni relazione
$posts = $postRepo->findFeedForUser($user, 20);
// = 1 query

foreach ($posts as $post) {
    $author    = $post->getAuthor();     // query!
    $thumbnail = $post->getFirstMedia(); // query!
    $likeCount = $post->getLikeCount(); // query!
    // Con 20 post = 1 + 60 = 61 query
    echo "{$author->getUsername()}: {$likeCount} likes";
}`,
  goodCode:
`// Eager loading: 1 sola query con JOIN
$posts = $this->createQueryBuilder('p')
    ->select('p', 'author', 'media')  // <-- pre-carica
    ->join('p.author', 'author')
    ->leftJoin('p.mediaFiles', 'media')
    ->where('...')
    ->getQuery()
    ->getResult();

foreach ($posts as $post) {
    $author    = $post->getAuthor();     // già in memoria
    $thumbnail = $post->getFirstMedia(); // già in memoria
    // like count: usa EXTRA_LAZY + cache Redis
    echo "{$author->getUsername()}";
}
// Sempre 1 query`,
})}
${SectionBlock({title:'Query complessa — statistiche per profilo', content: CodeBlock({
  filename:'PostRepository.php — aggregazioni',
  code:
`public function getProfileStats(User $user): array
{
    return $this->createQueryBuilder('p')
        ->select(
            'COUNT(p.id)          as postCount',
            'SUM(l.likeCount)     as totalLikes',
            'SUM(c.commentCount)  as totalComments',
            'AVG(l.likeCount)     as avgLikesPerPost',
            'MAX(p.publishedAt)   as lastPostAt'
        )
        ->leftJoin(
            'App\\Entity\\Like', 'l',
            'WITH', 'l.post = p.id'
        )
        ->leftJoin(
            'App\\Entity\\Comment', 'c',
            'WITH', 'c.post = p.id'
        )
        ->where('p.author = :user')
        ->andWhere('p.isArchived = false')
        ->setParameter('user', $user)
        ->getQuery()
        ->getSingleResult();
}

public function findPostsByMultipleHashtags(array $hashtags, User $viewer, int $limit): array
{
    $subQuery = $this->createQueryBuilder('p2')
        ->select('IDENTITY(ph.post)')
        ->join('p2.hashtags', 'h2')
        ->where('h2 IN (:tags)');

    return $this->createQueryBuilder('p')
        ->select('p', 'author')
        ->join('p.author', 'author')
        ->where($this->createQueryBuilder('p')->expr()->in('p.id', $subQuery->getDQL()))
        ->andWhere('author.isPrivate = false')
        ->andWhere('p.isArchived = false')
        ->setParameter('tags', $hashtags)
        ->orderBy('p.publishedAt', 'DESC')
        ->setMaxResults($limit)
        ->getQuery()
        ->getResult();
}`,
})})}`;
}

function docRelations() {
  return `
${CodeBlock({filename:'Tutte le relazioni del dominio Instagram', code:
`// User — ha molti Post (OneToMany)
#[ORM\\OneToMany(mappedBy: 'author', targetEntity: Post::class,
    cascade: ['persist'], fetch: 'EXTRA_LAZY')]
#[ORM\\OrderBy(['publishedAt' => 'DESC'])]
private Collection $posts;

// Post — ha molti MediaFile (OneToMany con cascade)
#[ORM\\OneToMany(mappedBy: 'post', targetEntity: MediaFile::class,
    cascade: ['persist', 'remove'], orphanRemoval: true)]
#[ORM\\OrderBy(['position' => 'ASC'])]
private Collection $mediaFiles;

// Post ↔ Hashtag (ManyToMany bidirezionale)
// Lato Post:
#[ORM\\ManyToMany(targetEntity: Hashtag::class, inversedBy: 'posts')]
#[ORM\\JoinTable(name: 'post_hashtags')]
private Collection $hashtags;

// Lato Hashtag:
#[ORM\\ManyToMany(targetEntity: Post::class, mappedBy: 'hashtags', fetch: 'EXTRA_LAZY')]
private Collection $posts;

// User ↔ User Follow (auto-referenziale ManyToMany)
#[ORM\\ManyToMany(targetEntity: User::class, inversedBy: 'following')]
#[ORM\\JoinTable(
    name: 'user_follows',
    joinColumns: [new ORM\\JoinColumn(name: 'follower_id')],
    inverseJoinColumns: [new ORM\\JoinColumn(name: 'following_id')]
)]
private Collection $followers;

#[ORM\\ManyToMany(targetEntity: User::class, mappedBy: 'followers')]
private Collection $following;

// Like — entità di join con dati extra (timestamp)
#[ORM\\Entity]
#[ORM\\Table(name: 'likes')]
#[ORM\\UniqueConstraint(columns: ['post_id', 'user_id'])]
class Like
{
    #[ORM\\ManyToOne(targetEntity: Post::class, inversedBy: 'likes')]
    #[ORM\\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    #[ORM\\ManyToOne(targetEntity: User::class)]
    #[ORM\\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    #[ORM\\Column(type: 'datetime_immutable')]
    private \\DateTimeImmutable $likedAt;
}`,
})}`;
}

function docLifecycle() {
  return `
${CodeBlock({filename:'Lifecycle per Post e MediaFile', code:
`// Entity Listener — separato dall'entity (SRP)
#[ORM\\EntityListeners([PostListener::class])]
class Post { ... }

class PostListener
{
    public function __construct(
        private readonly ShortCodeGenerator $shortCodes,
        private readonly SluggerInterface   $slugger,
    ) {}

    #[ORM\\PrePersist]
    public function prePersist(Post $post, PrePersistEventArgs $args): void
    {
        // Genera shortcode unico stile Instagram (es: "Dv3kR9xABCd")
        $post->setShortCode($this->shortCodes->generate());
        $post->setPublishedAt(new \\DateTimeImmutable());
    }

    #[ORM\\PreUpdate]
    public function preUpdate(Post $post, PreUpdateEventArgs $args): void
    {
        $post->setUpdatedAt(new \\DateTimeImmutable());

        // Se la caption cambia, ricalcola hashtag
        if ($args->hasChangedField('caption')) {
            $this->hashtagSyncService->syncForPost($post);
        }
    }

    #[ORM\\PostRemove]
    public function postRemove(Post $post, PostRemoveEventArgs $args): void
    {
        // Pulisce i media da S3/CDN dopo la cancellazione dal DB
        foreach ($post->getMediaFiles() as $media) {
            $this->cdnCleanupQueue->enqueue($media->getCdnUrl());
        }
        // Rimuove dall'indice Elasticsearch
        $this->searchIndexQueue->enqueue(
            new RemoveFromIndexMessage($post->getId())
        );
    }
}`,
})}`;
}

function docMigrations() {
  return `
${CodeBlock({filename:'Migration — aggiunta tabella likes con indici', code:
`final class Version20241201140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create likes table and add engagement indexes on posts';
    }

    public function up(Schema $schema): void
    {
        // Tabella likes
        $this->addSql('
            CREATE TABLE likes (
                id         INT AUTO_INCREMENT NOT NULL,
                post_id    INT NOT NULL,
                user_id    INT NOT NULL,
                liked_at   DATETIME NOT NULL COMMENT "(DC2Type:datetime_immutable)",
                PRIMARY KEY(id),
                UNIQUE INDEX uniq_like_post_user (post_id, user_id),
                INDEX idx_like_user (user_id),
                INDEX idx_like_post_date (post_id, liked_at),
                CONSTRAINT fk_like_post FOREIGN KEY (post_id)
                    REFERENCES posts (id) ON DELETE CASCADE,
                CONSTRAINT fk_like_user FOREIGN KEY (user_id)
                    REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        ');

        // Indice per feed cronologico (usato nella query di feed)
        $this->addSql('
            CREATE INDEX idx_post_feed
            ON posts (author_id, is_archived, published_at DESC)
        ');

        // Migra i like "vecchi" dalla colonna JSON alla tabella
        $this->addSql('
            INSERT INTO likes (post_id, user_id, liked_at)
            SELECT
                p.id,
                JSON_UNQUOTE(j.user_id),
                COALESCE(JSON_UNQUOTE(j.liked_at), p.published_at)
            FROM posts p,
                 JSON_TABLE(p.legacy_likes, "$[*]"
                     COLUMNS(user_id VARCHAR(10) PATH "$.user_id",
                             liked_at VARCHAR(30) PATH "$.liked_at")
                 ) j
            WHERE p.legacy_likes IS NOT NULL
        ');

        $this->addSql('ALTER TABLE posts DROP COLUMN legacy_likes');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE likes');
        $this->addSql('DROP INDEX idx_post_feed ON posts');
    }
}`,
})}`;
}

function renderMVC() {
  const accent = '#34d399';
  return `
${PageHeader({
  eyebrow:'Symfony & PHP',
  title:'MVC (Model-Service-Entity)',
  subtitle:'Architettura backend API-first: Controller → Service → Entity.',
  accent
})}

${Tabs({id:'mvc', accent, tabs:[
  {label:'🧠 Architettura', content: mvcArchitecture()},
  {label:'🎮 Controller',   content: mvcController()},
  {label:'⚙️ Service',      content: mvcService()},
  {label:'📦 Entity',       content: mvcEntity()},
]})}
`;
}

function mvcArchitecture() {
  return `
${Callout({
  type:'info',
  title:'MVC moderno (senza Twig)',
  body:'Backend puro: restituisce JSON. Frontend separato (React, Vue, mobile app).'
})}

${CodeBlock({
  filename:'Flow',
  code:
`HTTP Request
    ↓
Controller
    ↓
Service
    ↓
Entity
    ↓
Repository
    ↓
JSON Response`
})}

${Callout({
  type:'warn',
  title:'Regola d\'oro',
  body:'Se il Controller contiene logica → errore. Deve solo orchestrare.'
})}
`;
}

function mvcController() {
  return `
${CodeBlock({
  filename:'PostController.php',
  code:
`#[Route('/api/posts')]
class PostController extends AbstractController
{
    public function __construct(
        private readonly PostService $postService,
    ) {}

    #[Route('/{id}/like', methods: ['POST'])]
    public function like(int $id): JsonResponse
    {
        $user = $this->getUser();

        $this->postService->likePost($id, $user);

        return $this->json(['status' => 'ok']);
    }

    #[Route('', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();

        $dto = CreatePostDTO::fromRequest($request);

        $post = $this->postService->createPost($user, $dto);

        return $this->json([
            'id' => $post->getId(),
            'shortCode' => $post->getShortCode(),
        ]);
    }
}`
})}
`;
}

function mvcService() {
  return `
${CodeBlock({
  filename:'PostService.php',
  code:
`class PostService
{
    public function __construct(
        private readonly PostRepositoryInterface $postRepo,
        private readonly EntityManagerInterface $em,
        private readonly EventDispatcherInterface $dispatcher,
    ) {}

    public function createPost(User $author, CreatePostDTO $dto): Post
    {
        if (!$author->canPublish()) {
            throw new DomainException('User cannot publish');
        }

        $post = new Post($author, $dto->type);
        $post->setCaption($dto->caption);

        $this->postRepo->save($post, true);

        $this->dispatcher->dispatch(
            new PostPublishedEvent($post, $author)
        );

        return $post;
    }

    public function likePost(int $postId, User $user): void
    {
        $post = $this->postRepo->findById($postId);

        if (!$post) {
            throw new PostNotFoundException();
        }

        if ($post->isOwnedBy($user)) {
            throw new SelfLikeNotAllowedException();
        }

        $like = new Like($post, $user);

        $this->em->persist($like);
        $this->em->flush();

        $this->dispatcher->dispatch(
            new PostLikedEvent($like, $post, $user)
        );
    }
}`
})}
`;
}

function mvcEntity() {
  return `
${CodeBlock({
  filename:'Post.php (domain logic)',
  code:
`class Post
{
    private User $author;
    private bool $isArchived = false;
    private bool $commentsEnabled = true;

    public function isOwnedBy(User $user): bool
    {
        return $this->author === $user;
    }

    public function canReceiveComments(): bool
    {
        return $this->commentsEnabled && !$this->isArchived;
    }

    public function archive(): void
    {
        $this->isArchived = true;
    }
}`
})}

${Callout({
  type:'warn',
  title:'Anemic Model = errore',
  body:'Le entity NON devono avere comportamento, solo getter/setter.'
})}
`;
}

// ── EVENTS & SUBSCRIBERS ──────────────────────────────────────
function renderEvents() {
  const accent = '#60a5fa';
  return `
${PageHeader({eyebrow:'Symfony & PHP', title:'Events, Subscribers & Kernel Events',
  subtitle:'Architettura event-driven per il social: when a post is liked, when a user follows another, when a comment is added.',
  accent})}
${Tabs({id:'events', accent, tabs:[
  {label:'⚡ Domain Events',   content: evtDomain()},
  {label:'📡 Subscriber',     content: evtSubscriber()},
  {label:'🌐 Kernel Events',  content: evtKernel()},
  {label:'📨 Messenger',      content: evtMessenger()},
]})}`;
}

function evtDomain() {
  return `
${CodeBlock({filename:'Domain Events del Post Instagram', code:
`// Gli eventi sono immutabili — solo dati, nessuna logica

final class PostPublishedEvent
{
    public function __construct(
        public readonly Post              $post,
        public readonly User             $author,
        public readonly DateTimeImmutable $publishedAt = new DateTimeImmutable(),
    ) {}
}

final class PostLikedEvent
{
    public function __construct(
        public readonly Like $like,
        public readonly Post $post,
        public readonly User $likedBy,
    ) {}
}

final class PostCommentedEvent
{
    public function __construct(
        public readonly Comment $comment,
        public readonly Post    $post,
        public readonly User    $commentedBy,
    ) {}
}

final class UserFollowedEvent
{
    public function __construct(
        public readonly User $follower,
        public readonly User $following,
        public readonly bool $requiresApproval,
    ) {}
}

final class PostDeletedEvent
{
    public function __construct(
        public readonly int  $postId,
        public readonly User $author,
        public readonly string $reason = 'user_deleted',
    ) {}
}

// Il service dispatcha — non sa chi ascolta
class PostService
{
    public function like(Post $post, User $user): void
    {
        $like = new Like($post, $user);
        $this->likeRepo->save($like, flush: true);

        // Dispatcha — FollowerNotifier, Analytics, Cache: tutti
        // ascoltano questo evento senza conoscersi
        $this->dispatcher->dispatch(new PostLikedEvent($like, $post, $user));
    }
}`,
})}`;
}

function evtSubscriber() {
  return `
${CompareGrid({
  badCode:
`// Listener — configurato esternamente, sparpagliato
class LikeNotificationListener
{
    public function onPostLiked(PostLikedEvent $e): void { ... }
}

# services.yaml
App\\Listener\\LikeNotificationListener:
    tags:
        - name: kernel.event_listener
          event: App\\Event\\PostLikedEvent
          method: onPostLiked`,
  goodCode:
`// Subscriber — auto-contenuto, zero configurazione YAML
class LikeNotificationSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly LoggerInterface     $logger,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            PostLikedEvent::class     => [
                ['sendLikeNotification', 10],
                ['trackEngagement',      5],
            ],
            PostCommentedEvent::class => 'sendCommentNotification',
            UserFollowedEvent::class  => 'sendFollowNotification',
        ];
    }

    public function sendLikeNotification(PostLikedEvent $event): void
    {
        $author = $event->post->getAuthor();
        if ($author === $event->likedBy) return; // non notificare per self-like
        if ($author->isMuted($event->likedBy)) return;

        $this->notifications->send(
            recipient: $author,
            type:      'post_liked',
            data: [
                'liker_username' => $event->likedBy->getUsername(),
                'liker_avatar'   => $event->likedBy->getAvatarUrl(),
                'post_thumbnail' => $event->post->getFirstMediaThumbnail(),
                'post_url'       => "/p/{$event->post->getShortCode()}",
            ]
        );
    }

    public function sendCommentNotification(PostCommentedEvent $event): void
    {
        $author = $event->post->getAuthor();
        if ($author === $event->commentedBy) return;

        $this->notifications->send(
            recipient: $author,
            type:      'post_commented',
            data: [
                'commenter'  => $event->commentedBy->getUsername(),
                'preview'    => substr($event->comment->getText(), 0, 80),
                'post_url'   => "/p/{$event->post->getShortCode()}",
            ]
        );
    }
}`,
})}`;
}

function evtKernel() {
  return `
${CodeBlock({filename:'ApiKernelSubscriber.php — header, rate limit, eccezioni API', code:
`class InstagramApiKernelSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST   => [['onRequest', 10]],
            KernelEvents::RESPONSE  => 'onResponse',
            KernelEvents::EXCEPTION => ['onException', 0],
        ];
    }

    // Imposta l'utente corrente da JWT + aggiunge attributi utili
    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) return;
        $request = $event->getRequest();

        // Versione API da header (es: X-Instagram-API: v2)
        $apiVersion = $request->headers->get('X-Instagram-API', 'v1');
        $request->attributes->set('api_version', $apiVersion);

        // Device info per analytics
        $request->attributes->set('device_type',
            $this->detectDevice($request->headers->get('User-Agent', ''))
        );
    }

    // Aggiunge header standard alle response API
    public function onResponse(ResponseEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api/')) return;

        $response = $event->getResponse();
        $response->headers->set('X-App-Version',    APP_VERSION);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options',  'DENY');
        $response->headers->set('X-Response-Time',
            round((microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']) * 1000) . 'ms'
        );
    }

    // Converte eccezioni di dominio in risposte JSON strutturate
    public function onException(ExceptionEvent $event): void
    {
        $req = $event->getRequest();
        if (!str_starts_with($req->getPathInfo(), '/api/')) return;

        $ex = $event->getThrowable();
        [$status, $code, $message] = match(true) {
            $ex instanceof PostNotFoundException    => [404, 'POST_NOT_FOUND',     $ex->getMessage()],
            $ex instanceof SelfLikeNotAllowedException => [400, 'SELF_LIKE',       'Cannot like your own post'],
            $ex instanceof AlreadyLikedException   => [409, 'ALREADY_LIKED',      'Post already liked'],
            $ex instanceof PrivateAccountException  => [403, 'PRIVATE_ACCOUNT',   'This account is private'],
            $ex instanceof AccountSuspendedException => [403, 'ACCOUNT_SUSPENDED','Account suspended'],
            $ex instanceof PostNotAvailableException => [410, 'POST_UNAVAILABLE', 'Post not available'],
            default                                => [500, 'INTERNAL_ERROR',     'Something went wrong'],
        };

        $event->setResponse(new JsonResponse([
            'error'   => ['code' => $code, 'message' => $message],
            'status'  => $status,
        ], $status));
    }

    private function detectDevice(string $ua): string
    {
        if (str_contains($ua, 'Instagram/')) return 'instagram_app';
        if (str_contains($ua, 'Mobile'))     return 'mobile_browser';
        return 'desktop';
    }
}`,
})}`;
}

function evtMessenger() {
  return `
${CodeBlock({filename:'Messenger — job asincroni dopo la pubblicazione', code:
`// Quando viene pubblicato un post, l'evento scatena 3 job asincroni
class PostPublishedSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly MessageBusInterface $bus) {}

    public static function getSubscribedEvents(): array
    {
        return [PostPublishedEvent::class => 'onPostPublished'];
    }

    public function onPostPublished(PostPublishedEvent $event): void
    {
        $postId     = $event->post->getId();
        $followerIds = $event->author->getFollowerIds();

        // 1. Notifica i follower in batch (100 alla volta)
        foreach (array_chunk($followerIds, 100) as $batch) {
            $this->bus->dispatch(new NotifyFollowersBatchMessage($postId, $batch));
        }

        // 2. Indicizza su Elasticsearch per la ricerca
        $this->bus->dispatch(new IndexPostMessage($postId));

        // 3. Genera le thumbnail per tutti i media del post
        foreach ($event->post->getMediaFiles() as $media) {
            $this->bus->dispatch(new GenerateThumbnailsMessage($media->getId()));
        }
    }
}

// Handler per indexing su Elasticsearch
#[AsMessageHandler]
class IndexPostHandler
{
    public function __invoke(IndexPostMessage $msg): void
    {
        $post = $this->postRepo->findById($msg->postId);
        if (!$post || $post->isArchived()) return;

        $this->elasticIndexer->index([
            'id'         => $post->getId(),
            'shortCode'  => $post->getShortCode(),
            'caption'    => (string) $post->getCaption(),
            'hashtags'   => $post->getHashtagNames(),
            'author'     => $post->getAuthor()->getUsername(),
            'likeCount'  => $post->getLikeCount(),
            'type'       => $post->getType(),
            'publishedAt'=> $post->getPublishedAt()->format('c'),
        ]);
    }
}`,
})}`;
}

// ── REDIS & CACHE ─────────────────────────────────────────────
function renderRedis() {
  const accent = '#fb923c';
  return `
${PageHeader({eyebrow:'Infrastruttura', title:'Cache & Redis',
  subtitle:'Redis per il feed cache, like count, sessioni, rate limiting dei like/commenti e code di messaggi asincroni.',
  accent})}
<div class="stats-row" style="--accent-color:${accent}">
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">~1ms</div><div class="stat-card__label">Redis latency</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">10k+</div><div class="stat-card__label">Feed req/sec</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">120s</div><div class="stat-card__label">Feed TTL</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">60</div><div class="stat-card__label">Like/min limit</div></div>
</div>
${Tabs({id:'redis', accent, tabs:[
  {label:'🔧 Setup',              content: redisSetup()},
  {label:'📦 Feed Cache',         content: redisFeedCache()},
  {label:'🏷️ Tag Invalidation',  content: redisTagInvalidation()},
  {label:'🔒 Session',           content: redisSession()},
  {label:'🔢 Rate Limiting',     content: redisRateLimit()},
]})}`;
}

function redisSetup() {
  return `
${CodeBlock({filename:'docker-compose.yml + cache.yaml', code:
`# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save ""
      --appendonly no
    ports: ["6379:6379"]

# .env
REDIS_URL=redis://redis:6379
REDIS_FEED_URL=redis://redis:6379/1      # feed cache
REDIS_SESSION_URL=redis://redis:6379/2   # sessioni utente
REDIS_RATE_URL=redis://redis:6379/3      # rate limiting

# config/packages/cache.yaml
framework:
    cache:
        default_redis_provider: '%env(REDIS_URL)%'
        pools:
            # Feed - TTL breve, cambia spesso
            cache.feed:
                adapter: cache.adapter.redis
                provider: '%env(REDIS_FEED_URL)%'
                default_lifetime: 120
                tags: true

            # Post singolo - TTL più lungo
            cache.posts:
                adapter: cache.adapter.redis
                default_lifetime: 3600
                tags: true

            # Like count - TTL breve (aggiornato spesso)
            cache.likes:
                adapter: cache.adapter.redis
                default_lifetime: 60
                tags: true`,
})}`;
}

function redisFeedCache() {
  return `
${CodeBlock({filename:'RedisFeedCache.php — Cache-Aside Pattern', code:
`class RedisFeedCache implements FeedCacheInterface
{
    private const TTL_FEED        = 120;   // 2 min — feed cambia spesso
    private const TTL_LIKE_COUNT  = 60;    // 1 min — aggiornato a ogni like
    private const TTL_POST_DETAIL = 3600;  // 1 ora — post non cambia spesso
    private const FEED_PAGE_SIZE  = 20;

    public function __construct(
        private readonly TagAwareCacheInterface $feedCache,
        private readonly TagAwareCacheInterface $postCache,
    ) {}

    // Cache-Aside: cerca in cache, se manca calcola e salva
    public function getFeedForUser(User $user, int $page = 1): ?array
    {
        return $this->feedCache->get(
            $this->feedKey($user, $page),
            function (ItemInterface $item) use ($user, $page) {
                $item->expiresAfter(self::TTL_FEED);
                $item->tag([
                    "user.{$user->getId()}.feed",
                    'feeds',
                ]);
                // Cache miss: ritorna null, il caller usa il DB
                return null;
            }
        );
    }

    public function setFeedForUser(User $user, int $page, array $posts): void
    {
        $item = $this->feedCache->getItem($this->feedKey($user, $page));
        $item->set($posts)
             ->expiresAfter(self::TTL_FEED)
             ->tag(["user.{$user->getId()}.feed", 'feeds']);
        $this->feedCache->save($item);
    }

    // Quando un utente pubblica, invalida il feed di TUTTI i suoi follower
    public function invalidateForFollowers(User $author, array $followerIds): void
    {
        // Invalida per tag — una sola operazione Redis
        $tags = array_map(fn($id) => "user.{$id}.feed", $followerIds);
        $this->feedCache->invalidateTags($tags);
    }

    // Like count con write-through: aggiorna subito la cache
    public function getLikeCount(Post $post): ?int
    {
        try {
            $item = $this->postCache->getItem("like.count.{$post->getId()}");
            return $item->isHit() ? (int) $item->get() : null;
        } catch (\\Exception) {
            return null; // fallback al DB
        }
    }

    public function incrementLikeCount(Post $post): void
    {
        $key  = "like.count.{$post->getId()}";
        $item = $this->postCache->getItem($key);
        $current = $item->isHit() ? (int) $item->get() : $post->getLikeCount();
        $item->set($current + 1)->expiresAfter(self::TTL_LIKE_COUNT)
             ->tag(["post.{$post->getId()}"]);
        $this->postCache->save($item);
    }

    private function feedKey(User $user, int $page): string
    {
        return "feed.user.{$user->getId()}.page.{$page}";
    }
}`,
})}`;
}

function redisTagInvalidation() {
  return `
${CodeBlock({filename:'CacheInvalidationSubscriber.php — invalida per tag', code:
`class CacheInvalidationSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly RedisFeedCache              $feedCache,
        private readonly TagAwareCacheInterface      $postCache,
        private readonly FollowRepositoryInterface   $followRepo,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            PostPublishedEvent::class => 'onPostPublished',
            PostLikedEvent::class     => 'onPostLiked',
            PostDeletedEvent::class   => 'onPostDeleted',
            UserFollowedEvent::class  => 'onUserFollowed',
        ];
    }

    // Nuovo post: invalida il feed di tutti i follower
    public function onPostPublished(PostPublishedEvent $event): void
    {
        $followerIds = $this->followRepo->findFollowerIds($event->author);
        $this->feedCache->invalidateForFollowers($event->author, $followerIds);
    }

    // Nuovo like: aggiorna contatore in cache (write-through)
    public function onPostLiked(PostLikedEvent $event): void
    {
        $this->feedCache->incrementLikeCount($event->post);
        // Invalida la cache del profilo dell'autore (statistiche)
        $this->postCache->invalidateTags([
            "user.{$event->post->getAuthor()->getId()}.stats",
        ]);
    }

    // Post eliminato: invalida tutto quello che lo riguarda
    public function onPostDeleted(PostDeletedEvent $event): void
    {
        $this->postCache->invalidateTags([
            "post.{$event->postId}",
        ]);
        // Il feed verrà invalidato dal prossimo evento di follow/publish
    }

    // Nuovo follow: invalida il feed del nuovo follower
    public function onUserFollowed(UserFollowedEvent $event): void
    {
        if ($event->requiresApproval) return; // feed non cambia finché non approvato

        $this->postCache->invalidateTags([
            "user.{$event->follower->getId()}.feed",
        ]);
    }
}`,
})}`;
}

function redisSession() {
  return `
${CodeBlock({filename:'Session Redis — scaling orizzontale', code:
`# framework.yaml — sessioni in Redis (multi-server ready)
framework:
    session:
        handler_id: Symfony\\Component\\HttpFoundation\\Session\\Storage\\Handler\\RedisSessionHandler
        cookie_secure:   auto
        cookie_samesite: lax
        cookie_httponly: true
        cookie_lifetime: 2592000  # 30 giorni (keep me logged in)
        gc_maxlifetime:  2592000

# Con Redis Sessions:
# - Deploy senza perdere sessioni attive
# - Scaling a N server senza sticky sessions
# - Logout globale da tutti i dispositivi (GDPR)

class SessionService
{
    // Salva il device corrente nella sessione (come Instagram "Dispositivi attivi")
    public function registerDevice(User $user, Request $req): void
    {
        $session = $req->getSession();
        $devices = $session->get('active_devices', []);
        $deviceId = md5($req->headers->get('User-Agent') . $req->getClientIp());

        $devices[$deviceId] = [
            'device'    => $this->detectDevice($req),
            'ip'        => $req->getClientIp(),
            'city'      => $this->geoip->getCityByIp($req->getClientIp()),
            'lastSeen'  => new \\DateTimeImmutable(),
        ];

        $session->set('active_devices', $devices);
        $session->set('user_id', $user->getId());
    }

    // Logout da tutti i dispositivi — elimina tutte le sessioni Redis
    public function logoutFromAllDevices(User $user): int
    {
        $pattern    = "PHPREDIS_SESSION:*";
        $sessionIds = $this->redis->keys($pattern);
        $deleted    = 0;

        foreach ($sessionIds as $key) {
            $data = $this->redis->get($key);
            if ($data && str_contains($data, "user_id|i:{$user->getId()}")) {
                $this->redis->del($key);
                $deleted++;
            }
        }
        return $deleted;
    }
}`,
})}`;
}

function redisRateLimit() {
  return `
${CodeBlock({filename:'Rate Limiting — limiti reali di Instagram', code:
`# config/packages/rate_limiter.yaml
framework:
    rate_limiter:
        # Max 60 like al minuto (simile al limite Instagram)
        post_likes:
            policy: sliding_window
            limit: 60
            interval: '1 minute'

        # Max 30 commenti all'ora
        post_comments:
            policy: token_bucket
            limit: 30
            rate: { interval: '1 hour', amount: 30 }

        # Max 10 post al giorno per account non verificati
        post_publishing:
            policy: fixed_window
            limit: 10
            interval: '24 hours'

        # Follow: max 200 al giorno (anti-bot)
        user_follows:
            policy: sliding_window
            limit: 200
            interval: '24 hours'

// Applicato nel Service (non nel Controller — logica di business)
class LikeService
{
    public function __construct(
        private readonly RateLimiterFactory $likeLimiterFactory,
        private readonly PostRepositoryInterface $postRepo,
    ) {}

    public function like(Post $post, User $user): void
    {
        // Rate limit per utente
        $limiter = $this->likeLimiterFactory->create("like.{$user->getId()}");
        $limit   = $limiter->consume(1);

        if (!$limit->isAccepted()) {
            throw new RateLimitExceededException(
                retryAfter: $limit->getRetryAfter(),
                message:    'You are liking too fast. Slow down!'
            );
        }

        // Procedi con il like normale
        $this->policy->assertCanInteract($user, $post);
        $like = new Like($post, $user);
        $this->likeRepo->save($like, flush: true);
        $this->dispatcher->dispatch(new PostLikedEvent($like, $post, $user));
    }
}`,
})}`;
}

// ── ELASTICSEARCH ─────────────────────────────────────────────
function renderElastic() {
  const accent = '#f59e0b';
  return `
${PageHeader({eyebrow:'Infrastruttura', title:'Elasticsearch — Ricerca Post e Hashtag',
  subtitle:'Full-text search per caption, hashtag, username e location. Autocomplete per la barra di ricerca. Explore feed personalizzato.',
  accent})}
${Tabs({id:'elastic', accent, tabs:[
  {label:'⚙️ Index & Mapping', content: esMapping()},
  {label:'🔍 Ricerca caption', content: esSearch()},
  {label:'🔄 Sync con Doctrine', content: esSync()},
  {label:'📊 Aggregazioni',   content: esAggregations()},
]})}`;
}

function esMapping() {
  return `
${CodeBlock({filename:'PostIndexer.php — crea l\'indice con mapping completo', code:
`class PostIndexer
{
    private const INDEX = 'instagram_posts';

    public function createIndex(): void
    {
        if ($this->client->indices()->exists(['index' => self::INDEX])) return;

        $this->client->indices()->create([
            'index' => self::INDEX,
            'body'  => [
                'settings' => [
                    'number_of_shards'   => 2,
                    'number_of_replicas' => 1,
                    'analysis' => [
                        'analyzer' => [
                            'caption_analyzer' => [
                                'type'      => 'custom',
                                'tokenizer' => 'standard',
                                'filter'    => ['lowercase', 'asciifolding', 'stop'],
                            ],
                            'hashtag_analyzer' => [
                                'type'      => 'custom',
                                'tokenizer' => 'keyword',
                                'filter'    => ['lowercase'],
                            ],
                        ],
                    ],
                ],
                'mappings' => [
                    'properties' => [
                        'id'         => ['type' => 'integer'],
                        'shortCode'  => ['type' => 'keyword'],

                        // Caption: ricerca full-text + keyword per exact match
                        'caption' => [
                            'type'     => 'text',
                            'analyzer' => 'caption_analyzer',
                            'fields'   => [
                                'keyword' => ['type' => 'keyword', 'ignore_above' => 256],
                            ],
                        ],

                        // Hashtag: keyword per match esatto, case-insensitive
                        'hashtags' => [
                            'type'     => 'keyword',
                            'normalizer' => 'lowercase',
                        ],

                        // Autore
                        'author' => [
                            'properties' => [
                                'id'         => ['type' => 'integer'],
                                'username'   => ['type' => 'keyword'],
                                'isVerified' => ['type' => 'boolean'],
                                'isPrivate'  => ['type' => 'boolean'],
                            ],
                        ],

                        'type'          => ['type' => 'keyword'],
                        'likeCount'     => ['type' => 'integer'],
                        'commentCount'  => ['type' => 'integer'],
                        'isArchived'    => ['type' => 'boolean'],
                        'publishedAt'   => ['type' => 'date'],

                        // Geolocalizzazione per ricerca near location
                        'location' => ['type' => 'geo_point'],

                        // Autocomplete
                        'suggest' => ['type' => 'completion'],
                    ],
                ],
            ],
        ]);
    }

    public function indexPost(Post $post): void
    {
        if ($post->isArchived() || $post->getAuthor()->isPrivate()) return;

        $doc = [
            'id'           => $post->getId(),
            'shortCode'    => $post->getShortCode(),
            'caption'      => (string) $post->getCaption(),
            'hashtags'     => $post->getHashtagNames(),
            'author'       => [
                'id'         => $post->getAuthor()->getId(),
                'username'   => $post->getAuthor()->getUsername(),
                'isVerified' => $post->getAuthor()->isVerified(),
                'isPrivate'  => $post->getAuthor()->isPrivate(),
            ],
            'type'         => $post->getType(),
            'likeCount'    => $post->getLikeCount(),
            'commentCount' => $post->getCommentCount(),
            'isArchived'   => $post->isArchived(),
            'publishedAt'  => $post->getPublishedAt()->format('c'),
            'suggest'      => [
                'input' => array_merge(
                    [$post->getAuthor()->getUsername()],
                    $post->getHashtagNames()
                ),
            ],
        ];

        if ($post->hasLocation()) {
            $doc['location'] = [
                'lat' => $post->getLatitude(),
                'lon' => $post->getLongitude(),
            ];
        }

        $this->client->index([
            'index' => self::INDEX,
            'id'    => $post->getId(),
            'body'  => $doc,
        ]);
    }
}`,
})}`;
}

function esSearch() {
  return `
${CodeBlock({filename:'PostSearchService.php — ricerca caption + hashtag', code:
`class PostSearchService
{
    public function search(SearchPostsDTO $dto, User $viewer): SearchResult
    {
        $response = $this->client->search([
            'index' => 'instagram_posts',
            'body'  => [
                'from'  => ($dto->page - 1) * $dto->perPage,
                'size'  => $dto->perPage,
                'query' => [
                    'bool' => [
                        'must'   => $this->buildMustClauses($dto),
                        'filter' => $this->buildFilters($dto, $viewer),
                    ],
                ],
                'sort'      => $this->buildSort($dto->sort),
                'highlight' => [
                    'fields' => [
                        'caption' => ['fragment_size' => 150, 'number_of_fragments' => 2],
                    ],
                ],
                'aggs' => $this->buildAggregations(),
            ],
        ]);

        return SearchResult::fromElastic($response);
    }

    private function buildMustClauses(SearchPostsDTO $dto): array
    {
        if (empty($dto->query)) {
            return [['match_all' => (object) []]];
        }

        // Cerca in caption (full-text) e hashtag/username (exact-ish)
        return [[
            'multi_match' => [
                'query'     => $dto->query,
                'fields'    => ['caption^1', 'hashtags^3', 'author.username^2'],
                'type'      => 'best_fields',
                'fuzziness' => 'AUTO',  // tollera typo: "#travl" trova "#travel"
            ],
        ]];
    }

    private function buildFilters(SearchPostsDTO $dto, User $viewer): array
    {
        $filters = [
            ['term'  => ['isArchived' => false]],
            ['term'  => ['author.isPrivate' => false]],
        ];

        if ($dto->type) {
            $filters[] = ['term' => ['type' => $dto->type]];
        }

        if ($dto->onlyVerified) {
            $filters[] = ['term' => ['author.isVerified' => true]];
        }

        if ($dto->hashtag) {
            $filters[] = ['term' => ['hashtags' => strtolower($dto->hashtag)]];
        }

        // Ricerca per location: post entro N km
        if ($dto->latitude && $dto->longitude && $dto->radiusKm) {
            $filters[] = [
                'geo_distance' => [
                    'distance' => "{$dto->radiusKm}km",
                    'location' => ['lat' => $dto->latitude, 'lon' => $dto->longitude],
                ],
            ];
        }

        if ($dto->publishedAfter) {
            $filters[] = ['range' => ['publishedAt' => ['gte' => $dto->publishedAfter->format('c')]]];
        }

        return $filters;
    }

    // Autocomplete per la searchbar
    public function autocomplete(string $prefix): array
    {
        $response = $this->client->search([
            'index' => 'instagram_posts',
            'body'  => [
                '_source' => false,
                'suggest' => [
                    'post-suggest' => [
                        'prefix'     => $prefix,
                        'completion' => [
                            'field'   => 'suggest',
                            'size'    => 8,
                            'fuzzy'   => ['fuzziness' => 1],
                            'contexts' => [],
                        ],
                    ],
                ],
            ],
        ]);

        return array_map(
            fn($opt) => $opt['text'],
            $response['suggest']['post-suggest'][0]['options'] ?? []
        );
    }
}`,
})}`;
}

function esSync() {
  return `
${CodeBlock({filename:'ElasticsearchSyncSubscriber.php — sync real-time', code:
`class ElasticsearchSyncSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly MessageBusInterface $bus,
    ) {}

    public static function getSubscribedEvents(): array
    {
        return [
            PostPublishedEvent::class => 'onPostPublished',
            PostDeletedEvent::class   => 'onPostDeleted',
            PostLikedEvent::class     => 'onPostLiked',  // aggiorna likeCount
        ];
    }

    // Pubblicazione → indicizza in background (async)
    public function onPostPublished(PostPublishedEvent $event): void
    {
        $this->bus->dispatch(new IndexPostMessage($event->post->getId()));
    }

    // Cancellazione → rimuovi dall'indice
    public function onPostDeleted(PostDeletedEvent $event): void
    {
        $this->bus->dispatch(new RemoveFromIndexMessage($event->postId));
    }

    // Like → aggiorna solo il campo likeCount (partial update)
    public function onPostLiked(PostLikedEvent $event): void
    {
        $this->bus->dispatch(
            new UpdatePostStatsMessage($event->post->getId())
        );
    }
}

// Handler — esegue il reindex asincrono
#[AsMessageHandler]
class IndexPostHandler
{
    public function __invoke(IndexPostMessage $msg): void
    {
        $post = $this->postRepo->findById($msg->postId);
        if (!$post || $post->isArchived()) return;
        $this->indexer->indexPost($post);
    }
}

// Reindex completo da CLI (usato al deploy o dopo mapping change)
#[AsCommand(name: 'app:elasticsearch:reindex-posts')]
class ReindexPostsCommand extends Command
{
    protected function execute(InputInterface $in, OutputInterface $out): int
    {
        $io = new SymfonyStyle($in, $out);
        $io->title('Reindex Posts → Elasticsearch');

        $this->indexer->createIndex();
        $posts    = $this->postRepo->findAll();
        $chunks   = array_chunk($posts, 100);
        $progress = $io->createProgressBar(count($posts));

        foreach ($chunks as $chunk) {
            $this->indexer->bulkIndex($chunk);
            $progress->advance(count($chunk));
        }

        $progress->finish();
        $io->success(count($posts) . ' posts indexed successfully.');
        return Command::SUCCESS;
    }
}`,
})}`;
}

function esAggregations() {
  return `
${CodeBlock({filename:'Explore feed — aggregazioni per discover', code:
`// Aggregazioni per l'explore feed e le statistiche hashtag
private function buildAggregations(): array
{
    return [
        // Top hashtag nei risultati (per mostrare tag correlati)
        'top_hashtags' => [
            'terms' => ['field' => 'hashtags', 'size' => 20],
        ],

        // Distribuzione per tipo di post
        'post_types' => [
            'terms' => ['field' => 'type'],
        ],

        // Distribuzione temporale (per grafici analytics)
        'posts_over_time' => [
            'date_histogram' => [
                'field'             => 'publishedAt',
                'calendar_interval' => 'day',
                'format'            => 'yyyy-MM-dd',
                'min_doc_count'     => 0,
            ],
        ],

        // Like medi per tipo di post
        'avg_likes_by_type' => [
            'terms'  => ['field' => 'type'],
            'aggs'   => [
                'avg_likes' => ['avg' => ['field' => 'likeCount']],
            ],
        ],

        // Post con più engagement (per explore)
        'top_posts' => [
            'top_hits' => [
                'size' => 6,
                'sort' => [['likeCount' => ['order' => 'desc']]],
                '_source' => ['id', 'shortCode', 'likeCount', 'author.username'],
            ],
        ],
    ];
}

// Parsing del risultato per l'UI
class SearchResult
{
    public static function fromElastic(array $response): self
    {
        $hits     = $response['hits']['hits'];
        $total    = $response['hits']['total']['value'];
        $aggs     = $response['aggregations'] ?? [];

        $relatedHashtags = array_map(
            fn($b) => ['tag' => $b['key'], 'postCount' => $b['doc_count']],
            $aggs['top_hashtags']['buckets'] ?? []
        );

        return new self(
            posts:           array_map(fn($h) => $h['_source'], $hits),
            highlights:      array_column($hits, 'highlight'),
            total:           $total,
            relatedHashtags: $relatedHashtags,
            typeDistribution: $aggs['post_types']['buckets'] ?? [],
        );
    }
}`,
})}`;
}
