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
${Callout({type:'info',title:'ORM',
  body:`L’ORM (Object-Relational Mapping) è una tecnica di programmazione che permette di mappare oggetti di un linguaggio orientato agli oggetti (come PHP) a tabelle di un database relazionale. 
  Con un ORM:
  una classe PHP rappresenta una tabella 
  un oggetto rappresenta una riga (record)
  una proprietà rappresenta una colonna
  Doctrine le legge via Reflection per generare SQL`})}
${CodeBlock({filename:'Post.php — Entity completa', code:
`<?php
declare(strict_types=1);

namespace App\\Entity;

use App\\Repository\\PostRepository;
use App\\ValueObject\\Caption;
use Doctrine\\Common\\Collections\\{ArrayCollection, Collection};
use Doctrine\\ORM\\Mapping as ORM;

#[ORM\\Entity(repositoryClass: PostRepository::class)]
#[ORM\\Table(name: 'posts')] // nome della tabella
#[ORM\\HasLifecycleCallbacks]
#[ORM\\Index(columns: ['published_at'], name: 'idx_post_published_at')]
#[ORM\\Index(columns: ['author_id', 'is_archived'], name: 'idx_post_author_status')] // index
class Post
{
    public const TYPE_PHOTO    = 'photo';
    public const TYPE_VIDEO    = 'video';
    public const TYPE_REEL     = 'reel';
    public const TYPE_CAROUSEL = 'carousel';
    public const TYPE_STORY    = 'story';

    #[ORM\\Id, ORM\\GeneratedValue, ORM\\Column]
    private ?int $id = null; // property -> colonna id della tabella posts

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
  body:'Il Repository è l\'unico posto dove costruire query. Il Controller chiama il Service, il Service chiama il Repository — saltiamo il layer nel caso in cui EntityManager di doctrine può fare ciò che ci interessa.'})}
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
        return $this->find($id); // potrebbe non service, già EntityManager di Doctrine ha la find $this->entityManager->findOneBy(Post::class, ['id' => $id]);
        // l’EntityManager è il componente centrale che gestisce il ciclo di vita delle entità
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

    /** Top post per like ultimo mese */
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
        $this->getEntityManager()->persist($post); //anche qui spesso è solo ripetizione avere un metodo per ciò che già EntityManager può fare
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
`;
}

function docRelations() {
  return `
${CodeBlock({filename:'Tutte le relazioni del dominio Instagram', code:
`// User → Post
// Un utente può avere molti post (1 → N)
#[ORM\OneToMany(mappedBy: 'author', targetEntity: Post::class,
    cascade: ['persist'], fetch: 'EXTRA_LAZY')] // EXTRA_LAZY permette di eseguire operazioni su una collection (count, contains, slice, ecc.) senza caricare tutti gli elementi in memoria.
#[ORM\OrderBy(['publishedAt' => 'DESC'])]
private Collection $posts;


// Post → MediaFile
// Un post può avere molti file (1 → N)
// I file vengono salvati e cancellati automaticamente con il post
// Se un file viene rimosso dalla collection → viene eliminato dal DB
#[ORM\OneToMany(mappedBy: 'post', targetEntity: MediaFile::class,
    cascade: ['persist', 'remove'], orphanRemoval: true)] // Significa che se rimuovi un elemento dalla collection, Doctrine lo elimina dal database
#[ORM\OrderBy(['position' => 'ASC'])]
private Collection $mediaFiles;


// Post ↔ Hashtag
// Relazione molti-a-molti (N ↔ N)
// Un post può avere molti hashtag
// Un hashtag può appartenere a molti post
// Doctrine usa una tabella intermedia (post_hashtags)

// Lato Post
#[ORM\ManyToMany(targetEntity: Hashtag::class, inversedBy: 'posts')]
#[ORM\JoinTable(name: 'post_hashtags')]
private Collection $hashtags;

// Lato Hashtag
#[ORM\ManyToMany(targetEntity: Post::class, mappedBy: 'hashtags', fetch: 'EXTRA_LAZY')]
private Collection $posts;


// User ↔ User (followers)
// Relazione molti-a-molti auto-referenziale (N ↔ N)
// Un utente può seguire molti utenti
// Un utente può avere molti follower

#[ORM\ManyToMany(targetEntity: User::class, inversedBy: 'following')]
#[ORM\JoinTable(
    name: 'user_follows',
    joinColumns: [new ORM\JoinColumn(name: 'follower_id')],
    inverseJoinColumns: [new ORM\JoinColumn(name: 'following_id')]
)]
private Collection $followers;

#[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'followers')]
private Collection $following;


// Like (entità di join)
// Serve per rappresentare una relazione molti-a-molti con dati extra (timestamp)
// Ogni like collega un user e un post

#[ORM\Entity]
#[ORM\Table(name: 'likes')]
#[ORM\UniqueConstraint(columns: ['post_id', 'user_id'])] // uno user può mettere like solo una volta per post
class Like
{
    // Molti like appartengono a un post (N → 1)
    #[ORM\ManyToOne(targetEntity: Post::class, inversedBy: 'likes')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Post $post;

    // Molti like appartengono a un utente (N → 1)
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $user;

    // Data del like (informazione extra)
    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $likedAt;
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
                UNIQUE INDEX uniq_like_post_user (post_id, user_id), // user può mettere like una sola volta a quel post
                INDEX idx_like_user (user_id), // indice per user per velocizzare la lettura
                INDEX idx_like_post_date (post_id, liked_at), indice combinato per post e data
                CONSTRAINT fk_like_post FOREIGN KEY (post_id)
                    REFERENCES posts (id) ON DELETE CASCADE, // se il post viene eliminato elimina anche i like
                CONSTRAINT fk_like_user FOREIGN KEY (user_id)
                    REFERENCES users (id) ON DELETE CASCADE // se lo user viene eliminato elimina anche i like (like che ha messo ad altre persone)
            ) ENGINE=InnoDB
        ');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE likes');
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

    #[Route('/post/{id}/like', methods: ['POST'])]
    public function like(int $id): JsonResponse
    {
        $user = $this->getUser();

        $this->postService->likePost($id, $user);

        return $this->json(['status' => 'ok']);
    }

    #[Route('/post', methods: ['POST'])]
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
            PostLikedEvent::class => 'sendLikeNotification',
            PostCommentedEvent::class  => 'sendCommentNotification',
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
}


// come faccio poi ad utilizzare questo subscriber? 

public function likePost(Post $post, User $user): void
{
    $like = new Like($post, $user);
    $this->likeRepo->save($like, flush: true);
    $this->dispatcher->dispatch(new PostLikedEvent($like));
}`
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
${PageHeader({
  eyebrow: 'Infrastruttura', 
  title: 'Cache & Redis',
  subtitle: 'Redis è una memoria velocissima in RAM. Non è un database, è una cache. Quando i dati scadono o Redis crasha, perdi tutto. Perfetto per feed (TTL 2min), contatori (TTL 1min), sessioni. Non per dati critici.',
  accent
})}

<div class="stats-row" style="--accent-color:${accent}">
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">~1ms</div><div class="stat-card__label">Latenza (vs 100-500ms del database)</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">In RAM</div><div class="stat-card__label">Non persiste su disco</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">TTL</div><div class="stat-card__label">Dati scadono automaticamente</div></div>
  <div class="stat-card"><div class="stat-card__value" style="color:${accent}">Fallback</div><div class="stat-card__label">Se Redis crasha, ricarichi dal DB</div></div>
</div>

${Tabs({id:'redis', accent, tabs:[
  {label:'⚙️ Setup', content: redisSetup()},
  {label:'📦 Feed Cache', content: redisFeedCache()},
  {label:'🔄 Invalidazione', content: redisTagInvalidation()},
  {label:'🔢 Rate Limiting', content: redisRateLimit()},
]})}
  `;
}


function redisSetup() {
  return `
${Heading({level: 2, text: 'Perché Redis non è un Database'})}

${Paragraph({text: 'Redis **non salva su disco**. Vive in RAM. Se il server crasha, tutto scompare. Non è un problema perché il dato vero rimane nel database SQL. Redis è solo una copia veloce.'})}

${Heading({level: 3, text: 'Caso d\'uso perfetto'})}

${Table({
  headers: ['Caso', 'TTL', 'Perché Redis?', 'Se Redis crasha?'],
  rows: [
    ['Feed utente', '2 min', 'Caricarlo dal DB ogni volta è lento. Ogni 2min è ok ricaricare', 'Ricarichi dal DB, basta aspettare 100ms'],
    ['Like count', '1 min', 'Cambia ogni secondo. Non serve perfetto al millesimo', 'Leggi il valore vero dal DB'],
    ['Sessione login', '30 gg', 'Serve veloce ma persiste (Redis + DB)', 'Il DB mantiene la sessione'],
    ['Post singolo', '1 ora', 'Non cambia. Cachare 1 ora è safe', 'Ricarichi dal DB'],
  ]
})}

${CodeBlock({
  filename: 'docker-compose.yml',
  code: `version: '3.8'
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save ""
      --appendonly no
    ports:
      - "6379:6379"
`
})}

${Paragraph({text: '**--save ""** = non salvare su disco. **--appendonly no** = niente log. **--maxmemory-policy allkeys-lru** = quando la RAM è piena, cancella i dati meno usati.'})}

${CodeBlock({
  filename: '.env',
  code: `REDIS_FEED_URL=redis://redis:6379/1
REDIS_SESSION_URL=redis://redis:6379/2
REDIS_RATE_URL=redis://redis:6379/3
`
})}

${CodeBlock({
  filename: 'config/packages/cache.yaml',
  code: `framework:
  cache:
    pools:
      cache.feed:
        adapter: cache.adapter.redis
        provider: '%env(REDIS_FEED_URL)%'
        default_lifetime: 120
        tags: true

      cache.posts:
        adapter: cache.adapter.redis
        default_lifetime: 3600
        tags: true

      cache.likes:
        adapter: cache.adapter.redis
        default_lifetime: 60
        tags: true
`
})}
  `;
}

function redisFeedCache() {
  return `
${Heading({level: 2, text: 'Feed Cache — Cache-Aside Pattern'})}

${Paragraph({text: 'Cache-Aside: "Prendi da Redis, se non c\'è prendi dal DB e mettilo in Redis". Semplice. Se Redis è down, il dato viene comunque caricato dal DB.'})}

${CodeBlock({
  filename: 'src/Cache/RedisFeedCache.php',
  code: `class RedisFeedCache implements FeedCacheInterface {
  private const TTL_FEED = 120;

  public function __construct(
    private readonly TagAwareCacheInterface $feedCache,
    private readonly PostRepository $postRepo,
  ) {}

  public function getFeedForUser(User $user, int $page = 1): array {
    $key = "feed.user.{$user->getId()}.page.{$page}";

    // Prova a prendere da Redis
    $cached = $this->feedCache->get($key);
    if ($cached !== null) {
      return $cached; // Cache hit — 1ms
    }

    // Cache miss — vai al database
    $posts = $this->postRepo->getFeedForUser($user, $page);

    // Salva in cache per la prossima volta
    $this->feedCache->set($key, $posts, self::TTL_FEED, [
      "user.{$user->getId()}.feed"
    ]);

    return $posts;
  }

  public function invalidateForFollowers(User $author, array $followerIds): void {
    $tags = array_map(fn($id) => "user.{$id}.feed", $followerIds);
    $this->feedCache->invalidateTags($tags);
    // Cancella il feed di tutti i follower. Ricarichiamo dal DB la prossima volta
  }

  public function incrementLikeCount(Post $post): void {
    $key = "like.count.{$post->getId()}";
    $current = $this->feedCache->get($key) ?? $post->getLikeCount();
    $this->feedCache->set($key, $current + 1, self::TTL_LIKE_COUNT);
  }
}
`
})}

${Heading({level: 3, text: 'Nel Controller'})}

${CodeBlock({
  filename: 'src/Controller/FeedController.php',
  code: `class FeedController {
  public function __construct(
    private readonly RedisFeedCache $feedCache,
  ) {}

  public function feed(Request $request, User $user): Response {
    $page = (int)$request->query->get('page', 1);
    
    // RedisFeedCache gestisce automaticamente cache + fallback DB
    $posts = $this->feedCache->getFeedForUser($user, $page);
    
    return $this->json($posts);
  }
}
`
})}

${Paragraph({text: '**Come funziona**: Primo caricamento → Redis è vuoto → leggi dal DB (lento) → salva in Redis. Ricaricamento entro 2 minuti → Redis ha i dati → leggi da Redis (veloce). Dopo 2 minuti → TTL scaduto → Redis cancella → ricarica dal DB.'})}
  `;
}

function redisTagInvalidation() {
  return `
${Heading({level: 2, text: 'Tag Invalidation — invalida dati correlati'})}

${Paragraph({text: 'I tag sono etichette. Quando Mario pubblica, invalidi il tag "user.FOLLOWER.feed" e automaticamente tutti i feed in cache dei follower vengono cancellati.'})}

${CodeBlock({
  filename: 'src/EventSubscriber/CacheInvalidationSubscriber.php',
  code: `class CacheInvalidationSubscriber implements EventSubscriberInterface {
  public function __construct(
    private readonly RedisFeedCache $feedCache,
    private readonly TagAwareCacheInterface $postCache,
    private readonly FollowRepository $followRepo,
  ) {}

  public static function getSubscribedEvents(): array {
    return [
      PostPublishedEvent::class => 'onPostPublished',
      PostLikedEvent::class => 'onPostLiked',
      PostDeletedEvent::class => 'onPostDeleted',
    ];
  }

  public function onPostPublished(PostPublishedEvent $event): void {
    // Mario pubblica. Prendi tutti i follower
    $followerIds = $this->followRepo->findFollowerIds($event->author);
    
    // Invalida il feed di TUTTI i follower
    $this->feedCache->invalidateForFollowers($event->author, $followerIds);
    // La prossima volta che caricano il feed, ricarichiamo dal DB
  }

  public function onPostLiked(PostLikedEvent $event): void {
    // Nuovo like — aggiorna il contatore in cache
    $this->feedCache->incrementLikeCount($event->post);
  }

  public function onPostDeleted(PostDeletedEvent $event): void {
    // Post eliminato — invalida il tag
    $this->postCache->invalidateTags(["post.{$event->postId}"]);
  }
}
`
})}

${Heading({level: 3, text: 'Cosa succede in sequenza'})}

1. Mario pubblica un post → **evento PostPublished**
2. Listener trova i 1000 follower di Mario
3. Invalida il tag "user.FOLLOWER_ID.feed" per tutti e 1000
4. Redis cancella il feed dalla cache
5. Quando un follower ricarica → **cache miss** → ricarica dal DB (contiene il nuovo post di Mario)
6. Salva in Redis con TTL 2 minuti
  `;
}

function redisRateLimit() {
  return `
${Heading({level: 2, text: 'Rate Limiting — limitare le azioni'})}

${Paragraph({text: 'Redis mantiene un contatore per utente. "Mario ha fatto 5 like in questo minuto. Se ne fa altri, blocco." Il contatore scade ogni minuto.'})}

${CodeBlock({
  filename: 'config/packages/rate_limiter.yaml',
  code: `framework:
  rate_limiter:
    post_likes:
      policy: sliding_window
      limit: 60
      interval: '1 minute'

    post_comments:
      policy: sliding_window
      limit: 30
      interval: '1 hour'
`
})}

${CodeBlock({
  filename: 'src/Service/LikeService.php',
  code: `class LikeService {
  public function __construct(
    private readonly RateLimiterFactory $limiter,
    private readonly LikeRepository $likeRepo,
  ) {}

  public function like(Post $post, User $user): void {
    $limiter = $this->limiter->create("like.{$user->getId()}");
    $limit = $limiter->consume(1);

    if (!$limit->isAccepted()) {
      throw new RateLimitExceededException(
        retryAfter: $limit->getRetryAfter(),
        message: 'Too many likes. Wait ' . $limit->getRetryAfter() . 's'
      );
    }

    $like = new Like($post, $user);
    $this->likeRepo->save($like, flush: true);
  }
}
`
})}

${Heading({level: 3, text: 'Come funziona'})}

${Table({
  headers: ['Azione', 'Redis fa'],
  rows: [
    ['Utente mette 1° like', 'Crea chiave "like.123" = 1'],
    ['Utente mette 2° like (stesso minuto)', 'Incrementa a 2'],
    ['Utente mette 60° like', 'Incrementa a 60 (limite raggiunto)'],
    ['Utente tenta 61° like', 'Blocco: "Aspetta X secondi"'],
    ['Passa 1 minuto', 'Contatore scade, ritorna a 0'],
  ]
})}
  `;
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
  {label:'Fos Elastica Bundle', content: esFosElastica()},
  {label:'🔍 Ricerca caption', content: esSearch()},
  {label:'📊 Aggregazioni',   content: esAggregations()},
]})}`;
}

function esMapping() {
  return `
${CodeBlock({filename:'PostIndexer.php — crea l\'indice con mapping completo', code:
`use FOS\ElasticaBundle\Persister\ObjectPersisterInterface;
use App\Entity\Post;

class PostIndexer
{
    private ObjectPersisterInterface $persister;

    public function __construct(ObjectPersisterInterface $persister)
    {
        $this->persister = $persister;
    }

    public function indexPost(Post $post): void
    {
        // Non indicizzare post archiviati o privati
        if ($post->isArchived() || $post->getAuthor()->isPrivate()) {
            $this->persister->delete($post); // rimuove dal search index se presente
            return;
        }

        // Salva direttamente l'entità su Elasticsearch
        $this->persister->replaceOne($post);
    }
}`,
})}`;
}

function esFosElastica() {
   return `
${CodeBlock({filename:'Fos Elastica Index', code:
`fos_elastica:
    clients:
        default: { host: localhost, port: 9200 }

    indexes:
        instagram_posts:
            types:
                post:
                    properties:
                        id: { type: integer }
                        shortCode: { type: keyword }
                        caption:
                            type: text
                            analyzer: standard
                            fields:
                                keyword: { type: keyword, ignore_above: 256 }
                        hashtags: { type: keyword, normalizer: lowercase }
                        author:
                            properties:
                                id: { type: integer }
                                username: { type: keyword }
                                isVerified: { type: boolean }
                                isPrivate: { type: boolean }
                        type: { type: keyword }
                        likeCount: { type: integer }
                        commentCount: { type: integer }
                        isArchived: { type: boolean }
                        publishedAt: { type: date }
                        location: { type: geo_point }
                        suggest: { type: completion }
                    persistence:
                        driver: orm
                        model: App\Entity\Post
                        provider: ~
                        finder: ~
                        listener: true
                        serializer:
                            groups: [search]`,
})}`;
}

function esSearch() {
  return `
${CodeBlock({filename:'PostSearchService.php — ricerca caption + hashtag', code:
`use FOS\ElasticaBundle\Finder\PaginatedFinderInterface;
use App\DTO\SearchPostsDTO;
use App\Entity\User;

class PostSearchService
{
    private PaginatedFinderInterface $postFinder;

    public function __construct(PaginatedFinderInterface $postFinder)
    {
        $this->postFinder = $postFinder;
    }

    public function search(SearchPostsDTO $dto, User $viewer): array
    {
        $query = $this->buildQuery($dto, $viewer);

        // PaginatedFinder restituisce paginazione integrata
        return $this->postFinder->find($query, $dto->perPage, ($dto->page - 1) * $dto->perPage);
    }

    private function buildQuery(SearchPostsDTO $dto, User $viewer): array
    {
        $must = [];
        $filter = [
            ['term' => ['isArchived' => false]],
            ['term' => ['author.isPrivate' => false]],
        ];

        if ($dto->query) {
            $must[] = [
                'multi_match' => [
                    'query'     => $dto->query,
                    'fields'    => ['caption^1', 'hashtags^3', 'author.username^2'],
                    'type'      => 'best_fields',
                    'fuzziness' => 'AUTO',
                ],
            ];
        } else {
            $must[] = ['match_all' => (object) []];
        }

        return [
            'query' => [
                'bool' => [
                    'must'   => $must,
                    'filter' => $filter,
                ],
            ],
            'sort' => $dto->sort ? [$dto->sort => ['order' => 'desc']] : null,
        ];
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
