// ============================================================
//  VIEW: DESIGN PATTERNS  —  dominio: Instagram Post
// ============================================================

// ── CREAZIONALI ──────────────────────────────────────────────
function renderCreational() {
  const accent = '#a78bfa';
  return `
${PageHeader({eyebrow:'Design Patterns — Creazionali', title:'Factory, Builder, Abstract Factory',
  subtitle:'Creazione di Post, MediaFile, Notification e Feed senza accoppiamento alle classi concrete.',
  accent})}
${Tabs({id:'creational', accent, tabs:[
  {label:'🏭 Factory Method',   content: patFactory()},
  {label:'🏗️ Abstract Factory', content: patAbstractFactory()},
  {label:'🔨 Builder',          content: patBuilder()},
  {label:'♻️ Singleton',        content: patSingleton()},
]})}`;
}

function patFactory() {
  return `
${Callout({type:'info',title:'Factory Method',
  body:'Creare il tipo giusto di Post (foto, video, carosello, reel, storia) senza if/switch nel controller. Il factory decide, il client usa solo PostInterface.'})}
${CompareGrid({
  badCode:
`// if/switch ovunque nel codice
class PostController
{
    public function create(Request $req): Response
    {
        $type = $req->request->get('type');
        if ($type === 'photo') {
            $post = new PhotoPost();
        } elseif ($type === 'video') {
            $post = new VideoPost();
        } elseif ($type === 'reel') {
            $post = new ReelPost();
        } elseif ($type === 'carousel') {
            $post = new CarouselPost();
        } elseif ($type === 'story') {
            $post = new StoryPost();
        }
        // aggiungere 'live'? Modifico ovunque!
    }
}`,
  goodCode:
`interface PostInterface
{
    public function getType(): string;
    public function isShareable(): bool;
    public function getMediaCount(): int;
    public function publish(): void;
}

class PhotoPost   implements PostInterface { ... }
class VideoPost   implements PostInterface { ... }
class ReelPost    implements PostInterface { ... }
class CarouselPost implements PostInterface { ... }
class StoryPost   implements PostInterface { ... }

class PostFactory
{
    private array $creators = [];

    public function register(string $type, callable $creator): void
    {
        $this->creators[$type] = $creator;
    }

    public function create(string $type, PublishPostDTO $dto, User $author): PostInterface
    {
        if (!isset($this->creators[$type]))
            throw new UnknownPostTypeException($type);
        return ($this->creators[$type])($dto, $author);
    }
}

// Registrazione via tagged services in Symfony
// Aggiungere 'live'? Solo nuova classe + tag.`,
})}
${SectionBlock({title:'Integrazione Symfony — TaggedIterator', content: CodeBlock({
  filename:'PostCreatorInterface.php + services.yaml',
  code:
`// Ogni tipo di post ha il proprio creator
interface PostCreatorInterface
{
    public function create(PublishPostDTO $dto, User $author): PostInterface;
    public function supports(string $type): bool;
}

#[AutoconfigureTag('app.post_creator')]
class PhotoPostCreator implements PostCreatorInterface
{
    public function supports(string $type): bool { return $type === 'photo'; }
    public function create(PublishPostDTO $dto, User $author): PostInterface
    {
        $post = new PhotoPost($author, Caption::fromString($dto->caption));
        $post->setMedia($this->mediaUploader->upload($dto->mediaFiles[0]));
        return $post;
    }
}

#[AutoconfigureTag('app.post_creator')]
class CarouselPostCreator implements PostCreatorInterface
{
    public function supports(string $type): bool { return $type === 'carousel'; }
    public function create(PublishPostDTO $dto, User $author): PostInterface
    {
        $post = new CarouselPost($author, Caption::fromString($dto->caption));
        foreach ($dto->mediaFiles as $file) {
            $post->addSlide($this->mediaUploader->upload($file));
        }
        return $post;
    }
}

class PostFactory
{
    public function __construct(
        #[TaggedIterator('app.post_creator')]
        private iterable $creators
    ) {}

    public function create(string $type, PublishPostDTO $dto, User $author): PostInterface
    {
        foreach ($this->creators as $creator) {
            if ($creator->supports($type)) return $creator->create($dto, $author);
        }
        throw new UnknownPostTypeException($type);
    }
}`,
})})}`;
}

function patAbstractFactory() {
  return `
${Callout({type:'info',title:'Abstract Factory',
  body:'Creare famiglie di oggetti correlati per ogni tipo di media: foto crea Thumbnail + Preview + CDNUploader coerenti. Video crea altro set coerente di strumenti.'})}
${CodeBlock({filename:'MediaProcessingFactory — Abstract Factory completo', code:
`// Prodotti astratti
interface ThumbnailGeneratorInterface  { public function generate(MediaFile $m): string; }
interface PreviewGeneratorInterface    { public function generate(MediaFile $m): string; }
interface StorageUploaderInterface     { public function upload(string $path): string; }

// Abstract Factory
interface MediaProcessingFactoryInterface
{
    public function createThumbnailGenerator(): ThumbnailGeneratorInterface;
    public function createPreviewGenerator(): PreviewGeneratorInterface;
    public function createStorageUploader(): StorageUploaderInterface;
}

// Famiglia per le FOTO
class PhotoProcessingFactory implements MediaProcessingFactoryInterface
{
    public function createThumbnailGenerator(): ThumbnailGeneratorInterface
    {
        return new ImageThumbnailGenerator(width: 150, height: 150, format: 'webp');
    }
    public function createPreviewGenerator(): PreviewGeneratorInterface
    {
        return new ImagePreviewGenerator(maxWidth: 1080, quality: 85);
    }
    public function createStorageUploader(): StorageUploaderInterface
    {
        return new S3ImageUploader($this->s3Client, bucket: 'photos');
    }
}

// Famiglia per i VIDEO / REEL
class VideoProcessingFactory implements MediaProcessingFactoryInterface
{
    public function createThumbnailGenerator(): ThumbnailGeneratorInterface
    {
        return new VideoThumbnailGenerator(atSecond: 1.0);
    }
    public function createPreviewGenerator(): PreviewGeneratorInterface
    {
        return new VideoPreviewGenerator(durationSec: 15, format: 'mp4');
    }
    public function createStorageUploader(): StorageUploaderInterface
    {
        return new S3VideoUploader($this->s3Client, bucket: 'videos');
    }
}

// MediaProcessor usa la factory — non sa se è foto o video
class MediaProcessor
{
    public function process(MediaFile $media): ProcessedMedia
    {
        $factory   = $this->factoryResolver->resolve($media->getMimeType());
        $thumbnail = $factory->createThumbnailGenerator()->generate($media);
        $preview   = $factory->createPreviewGenerator()->generate($media);
        $url       = $factory->createStorageUploader()->upload($media->getPath());
        return new ProcessedMedia($url, $thumbnail, $preview);
    }
}`,
})}`;
}

function patBuilder() {
  return `
${Callout({type:'info',title:'Builder Pattern',
  body:'Una query per il feed Instagram ha decine di parametri opzionali: utente, hashtag, location, periodo, tipo di post, solo verified, ecc. Il Builder rende la costruzione leggibile.'})}
${CompareGrid({
  badCode:
`// Costruttore con 9 parametri — incubo!
$feed = new FeedQuery(
    $user,          // chi vede
    null,           // hashtag?
    null,           // location?
    'DESC',         // order
    true,           // solo following?
    false,          // solo verified?
    ['photo','reel'], // tipi
    20,             // limit
    1               // page
);`,
  goodCode:
`// Builder — self-documenting
$feed = (new FeedQueryBuilder())
    ->forUser($currentUser)
    ->withHashtag($hashtag)         // opzionale
    ->nearLocation($lat, $lng, 10)  // opzionale
    ->onlyPostTypes(['photo', 'reel'])
    ->fromFollowingOnly()
    ->orderByRecent()
    ->paginate(page: 2, perPage: 20)
    ->build();`,
})}
${SectionBlock({title:'Implementazione FeedQueryBuilder', content: CodeBlock({
  filename:'FeedQueryBuilder.php',
  code:
`final class FeedQueryBuilder
{
    private ?User     $user         = null;
    private ?Hashtag  $hashtag      = null;
    private ?Location $location     = null;
    private ?float    $radiusKm     = null;
    private array     $postTypes    = ['photo','video','reel','carousel'];
    private bool      $followingOnly = false;
    private bool      $verifiedOnly  = false;
    private string    $orderBy       = 'publishedAt';
    private string    $direction     = 'DESC';
    private int       $page          = 1;
    private int       $perPage       = 20;

    public function forUser(User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function withHashtag(Hashtag $hashtag): static
    {
        $this->hashtag = $hashtag;
        return $this;
    }

    public function nearLocation(float $lat, float $lng, float $km): static
    {
        $this->location = new Location($lat, $lng);
        $this->radiusKm = $km;
        return $this;
    }

    public function onlyPostTypes(array $types): static
    {
        $this->postTypes = $types;
        return $this;
    }

    public function fromFollowingOnly(): static
    {
        $this->followingOnly = true;
        return $this;
    }

    public function onlyVerified(): static
    {
        $this->verifiedOnly = true;
        return $this;
    }

    public function orderByEngagement(): static
    {
        $this->orderBy  = 'engagementScore';
        $this->direction = 'DESC';
        return $this;
    }

    public function orderByRecent(): static
    {
        $this->orderBy  = 'publishedAt';
        $this->direction = 'DESC';
        return $this;
    }

    public function paginate(int $page, int $perPage = 20): static
    {
        $this->page    = max(1, $page);
        $this->perPage = min(50, max(1, $perPage));
        return $this;
    }

    public function build(): FeedQuery
    {
        if ($this->user === null)
            throw new RuntimeException('forUser() is required');

        return new FeedQuery(
            user:          $this->user,
            hashtag:       $this->hashtag,
            location:      $this->location,
            radiusKm:      $this->radiusKm,
            postTypes:     $this->postTypes,
            followingOnly: $this->followingOnly,
            verifiedOnly:  $this->verifiedOnly,
            orderBy:       $this->orderBy,
            direction:     $this->direction,
            page:          $this->page,
            perPage:       $this->perPage,
        );
    }
}`,
})})}`;
}

function patSingleton() {
  return `
${Callout({type:'warn',title:'Singleton — in Symfony non ne hai bisogno',
  body:'Il DI Container di Symfony è già un singleton manager. Ogni service è shared:true di default — una sola istanza per tutta la request. Il Singleton classico introduce stato globale non testabile.'})}
${CompareGrid({
  badCode:
`// Singleton classico — anti-pattern
class InstagramConfig
{
    private static ?self $instance = null;
    private array $settings = [];

    private function __construct()
    {
        $this->settings = json_decode(file_get_contents('config.json'), true);
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
}

// Impossibile testare — stato globale condiviso
InstagramConfig::getInstance()->get('max_caption_length');`,
  goodCode:
`// In Symfony: il container è già shared per default
// services.yaml
services:
    App\\Config\\PostConfig:
        shared: true   # default — una sola istanza

// PHP — normale classe iniettata
final class PostConfig
{
    public function __construct(
        private readonly int    $maxCaptionLength,
        private readonly int    $maxHashtags,
        private readonly int    $maxTaggedUsers,
        private readonly int    $feedPageSize,
    ) {}

    public function getMaxCaptionLength(): int { return $this->maxCaptionLength; }
    public function getMaxHashtags(): int       { return $this->maxHashtags; }
}

// Iniettata normalmente — testabile con valori diversi
$config = new PostConfig(maxCaptionLength: 2200, maxHashtags: 30, ...);`,
})}`;
}

// ── STRUTTURALI ───────────────────────────────────────────────
function renderStructural() {
  const accent = '#a78bfa';
  return `
${PageHeader({eyebrow:'Design Patterns — Strutturali', title:'Decorator, Adapter, Facade, Composite',
  subtitle:'Composizione di oggetti nel dominio Instagram: cache su repository, adattatori CDN, facade per checkout, permessi compositi.',
  accent})}
${Tabs({id:'structural', accent, tabs:[
  {label:'🎨 Decorator',  content: patDecorator()},
  {label:'🔌 Adapter',   content: patAdapter()},
  {label:'🌉 Facade',    content: patFacade()},
  {label:'🌳 Composite', content: patComposite()},
]})}`;
}

function patDecorator() {
  return `
${Callout({type:'info',title:'Decorator Pattern',
  body:'Aggiunge la cache Redis al PostRepository senza modificarlo. Il Service non sa se sta parlando con Doctrine o con la cache — usa solo l\'interfaccia.'})}
${CodeBlock({filename:'CachedPostRepository.php — Decorator con Redis', code:
`interface PostRepositoryInterface
{
    public function findById(int $id): ?Post;
    /** @return Post[] */
    public function findFeedForUser(User $user, int $limit): array;
    public function getLikeCount(Post $post): int;
    public function save(Post $post, bool $flush = false): void;
}

// Implementazione base — va al DB
class DoctrinePostRepository extends ServiceEntityRepository
    implements PostRepositoryInterface
{
    public function findById(int $id): ?Post
    {
        return $this->find($id);
    }

    public function findFeedForUser(User $user, int $limit): array
    {
        return $this->createQueryBuilder('p')
            ->join('p.author', 'a')
            ->join('a.followers', 'f')
            ->where('f = :user')
            ->andWhere('p.isArchived = false')
            ->setParameter('user', $user)
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()->getResult();
    }

    public function getLikeCount(Post $post): int
    {
        return (int) $this->getEntityManager()
            ->createQuery('SELECT COUNT(l) FROM App\\Entity\\Like l WHERE l.post = :post')
            ->setParameter('post', $post)
            ->getSingleScalarResult();
    }
}

// Decorator — aggiunge cache Redis senza toccare Doctrine
class CachedPostRepository implements PostRepositoryInterface
{
    private const TTL_POST       = 3600;   // 1 ora
    private const TTL_FEED       = 120;    // 2 minuti (feed cambia spesso)
    private const TTL_LIKE_COUNT = 60;     // 1 minuto

    public function __construct(
        private readonly PostRepositoryInterface $inner,  // DoctrinePostRepository
        private readonly TagAwareCacheInterface  $cache,
    ) {}

    public function findById(int $id): ?Post
    {
        return $this->cache->get(
            "post.{$id}",
            fn($item) => $item->expiresAfter(self::TTL_POST)
                ->tag(["post.{$id}"])
                ->set($this->inner->findById($id))
        );
    }

    public function findFeedForUser(User $user, int $limit): array
    {
        return $this->cache->get(
            "feed.{$user->getId()}.{$limit}",
            fn($item) => $item->expiresAfter(self::TTL_FEED)
                ->tag(["user.{$user->getId()}.feed"])
                ->set($this->inner->findFeedForUser($user, $limit))
        );
    }

    public function getLikeCount(Post $post): int
    {
        return $this->cache->get(
            "likes.count.{$post->getId()}",
            fn($item) => $item->expiresAfter(self::TTL_LIKE_COUNT)
                ->tag(["post.{$post->getId()}"])
                ->set($this->inner->getLikeCount($post))
        );
    }

    public function save(Post $post, bool $flush = false): void
    {
        $this->inner->save($post, $flush);
        // Invalida la cache del post e del feed dell'autore
        $this->cache->invalidateTags([
            "post.{$post->getId()}",
            "user.{$post->getAuthor()->getId()}.feed",
        ]);
    }
}

// services.yaml — Symfony decora automaticamente
App\\Repository\\CachedPostRepository:
    decorates: App\\Repository\\PostRepositoryInterface`,
})}`;
}

function patAdapter() {
  return `
${Callout({type:'info',title:'Adapter Pattern',
  body:'L\'SDK di AWS S3, Cloudinary o BunnyCDN hanno interfacce diverse. L\'Adapter le unifica in MediaStorageInterface — il codice non cambia se si cambia provider.'})}
${CodeBlock({filename:'CloudinaryAdapter.php', code:
`// La nostra interfaccia interna per lo storage media
interface MediaStorageInterface
{
    public function uploadPhoto(string $localPath, string $userId): MediaUrl;
    public function uploadVideo(string $localPath, string $userId): MediaUrl;
    public function generateThumbnail(MediaUrl $original, int $width, int $height): MediaUrl;
    public function delete(MediaUrl $url): void;
}

// SDK Cloudinary — interfaccia completamente diversa
class CloudinarySDK
{
    public function upload(array $options): array { ... }
    public function destroy(string $publicId): array { ... }
    public function transformation(string $url, array $transforms): string { ... }
}

// Adapter: adatta Cloudinary alla nostra interfaccia
class CloudinaryAdapter implements MediaStorageInterface
{
    public function __construct(
        private readonly CloudinarySDK $sdk,
        private readonly string        $baseFolder,
    ) {}

    public function uploadPhoto(string $localPath, string $userId): MediaUrl
    {
        $result = $this->sdk->upload([
            'file'           => $localPath,
            'folder'         => "{$this->baseFolder}/photos/{$userId}",
            'resource_type'  => 'image',
            'transformation' => [
                ['width' => 1080, 'crop' => 'limit'],
                ['quality' => 'auto', 'fetch_format' => 'auto'],
            ],
        ]);
        return new MediaUrl($result['secure_url'], $result['public_id']);
    }

    public function uploadVideo(string $localPath, string $userId): MediaUrl
    {
        $result = $this->sdk->upload([
            'file'          => $localPath,
            'folder'        => "{$this->baseFolder}/videos/{$userId}",
            'resource_type' => 'video',
            'eager'         => [['width' => 720, 'format' => 'mp4']],
        ]);
        return new MediaUrl($result['secure_url'], $result['public_id']);
    }

    public function generateThumbnail(MediaUrl $original, int $w, int $h): MediaUrl
    {
        $url = $this->sdk->transformation($original->getPublicId(), [
            ['width' => $w, 'height' => $h, 'crop' => 'fill', 'gravity' => 'face'],
            ['format' => 'webp', 'quality' => 'auto'],
        ]);
        return new MediaUrl($url, $original->getPublicId() . "_thumb_{$w}x{$h}");
    }

    public function delete(MediaUrl $url): void
    {
        $this->sdk->destroy($url->getPublicId());
    }
}

// Domani passa a BunnyCDN? Scrivi BunnyCDNAdapter.
// Il resto del codice non cambia.`,
})}`;
}

function patFacade() {
  return `
${Callout({type:'info',title:'Facade Pattern',
  body:'Pubblicare un post su Instagram coinvolge: validazione, upload media su CDN, estrazione hashtag, creazione post, invio notifiche, aggiornamento feed, analytics. Il PostPublishingFacade lo semplifica in un\'unica chiamata.'})}
${CodeBlock({filename:'PostPublishingFacade.php', code:
`// Senza Facade: il Controller conosce 9 servizi
// $this->validator, $this->mediaUploader, $this->hashtagExtractor,
// $this->postFactory, $this->postRepo, $this->feedInvalidator,
// $this->notifier, $this->analyticsTracker, $this->moderationQueue

// Con Facade: una sola dipendenza
class PostPublishingFacade
{
    public function __construct(
        private readonly PostValidator         $validator,
        private readonly MediaUploader         $mediaUploader,
        private readonly HashtagExtractor      $hashtagExtractor,
        private readonly PostFactory           $postFactory,
        private readonly PostRepositoryInterface $postRepo,
        private readonly FeedCacheInterface    $feedCache,
        private readonly EventDispatcherInterface $dispatcher,
        private readonly ContentModerationQueue $moderationQueue,
    ) {}

    public function publish(PublishPostDTO $dto, User $author): PostPublishingResult
    {
        // 1. Valida
        $violations = $this->validator->validate($dto);
        if (count($violations) > 0)
            return PostPublishingResult::withErrors($violations);

        // 2. Carica i media su CDN
        $processedMedia = [];
        foreach ($dto->mediaFiles as $file) {
            $processedMedia[] = $this->mediaUploader->upload($file, $author);
        }

        // 3. Estrai hashtag e mention dalla caption
        $caption  = Caption::fromString($dto->caption);
        $hashtags = $this->hashtagExtractor->extractAll($caption);

        // 4. Crea il post
        $post = $this->postFactory->create($dto, $author, $processedMedia, $hashtags);
        $this->postRepo->save($post, flush: true);

        // 5. Invalida la cache del feed dei follower
        $this->feedCache->invalidateForFollowers($author);

        // 6. Dispatcha evento — notifiche, analytics, ecc.
        $this->dispatcher->dispatch(new PostPublishedEvent($post));

        // 7. Invia a moderazione se account non verificato
        if (!$author->isVerified()) {
            $this->moderationQueue->enqueue($post);
        }

        return PostPublishingResult::success($post);
    }
}

// Il controller ora ha UNA sola dipendenza
class PostController extends AbstractController
{
    public function __construct(
        private readonly PostPublishingFacade $publishingFacade,
    ) {}

    #[Route('/api/posts', methods: ['POST'])]
    public function create(Request $req): JsonResponse
    {
        $dto    = PublishPostDTO::fromRequest($req);
        $result = $this->publishingFacade->publish($dto, $this->getUser());

        if ($result->hasErrors()) {
            return $this->json(['errors' => $result->getErrors()], 422);
        }
        return $this->json($result->getPost(), 201);
    }
}`,
})}`;
}

function patComposite() {
  return `
${Callout({type:'info',title:'Composite Pattern',
  body:'Le regole di visibilità di un Post sono composte: account privato AND (follower OR owner) AND NOT blocked AND NOT archived. Il Composite permette di combinare queste regole come albero.'})}
${CodeBlock({filename:'VisibilityRule — Composite per regole composte', code:
`// Interfaccia comune — foglie e compositi
interface VisibilityRuleInterface
{
    public function isSatisfiedBy(User $viewer, Post $post): bool;
    public function describe(): string;
}

// Foglie — regole atomiche
class NotArchivedRule implements VisibilityRuleInterface
{
    public function isSatisfiedBy(User $viewer, Post $post): bool
    {
        return !$post->isArchived();
    }
    public function describe(): string { return 'post non archiviato'; }
}

class NotBlockedRule implements VisibilityRuleInterface
{
    public function isSatisfiedBy(User $viewer, Post $post): bool
    {
        return !$post->getAuthor()->hasBlocked($viewer)
            && !$viewer->hasBlocked($post->getAuthor());
    }
    public function describe(): string { return 'nessun blocco reciproco'; }
}

class IsFollowerOrOwnerRule implements VisibilityRuleInterface
{
    public function __construct(private readonly FollowRepository $follows) {}
    public function isSatisfiedBy(User $viewer, Post $post): bool
    {
        $author = $post->getAuthor();
        return $viewer === $author
            || !$author->isPrivate()
            || $this->follows->isFollowing($viewer, $author);
    }
    public function describe(): string { return 'follower o proprietario'; }
}

// Compositi — AND e OR
class AllRules implements VisibilityRuleInterface
{
    /** @param VisibilityRuleInterface[] $rules */
    public function __construct(private readonly array $rules) {}

    public function isSatisfiedBy(User $viewer, Post $post): bool
    {
        foreach ($this->rules as $rule) {
            if (!$rule->isSatisfiedBy($viewer, $post)) return false;
        }
        return true;
    }
    public function describe(): string
    {
        return implode(' AND ', array_map(fn($r) => $r->describe(), $this->rules));
    }
}

// Uso: regola completa di visibilità Instagram
$visibilityRule = new AllRules([
    new NotArchivedRule(),
    new NotBlockedRule(),
    new IsFollowerOrOwnerRule($followRepo),
]);

// Applicata uniformemente ovunque
if (!$visibilityRule->isSatisfiedBy($currentUser, $post)) {
    throw new PostNotVisibleException($post, $currentUser);
}`,
})}`;
}

// ── COMPORTAMENTALI ───────────────────────────────────────────
function renderBehavioral() {
  const accent = '#a78bfa';
  return `
${PageHeader({eyebrow:'Design Patterns — Comportamentali', title:'Strategy, Observer, Command, Chain, Template',
  subtitle:'Come gli oggetti del dominio Instagram interagiscono e si coordinano: feed algorithm, notifiche, interazioni, middleware.',
  accent})}
${Tabs({id:'behavioral', accent, tabs:[
  {label:'♟️ Strategy',  content: patStrategy()},
  {label:'👁️ Observer',  content: patObserver()},
  {label:'💡 Command',   content: patCommand()},
  {label:'🔗 Chain',     content: patChain()},
  {label:'📋 Template',  content: patTemplate()},
]})}`;
}

function patStrategy() {
  return `
${Callout({type:'info',title:'Strategy Pattern',
  body:'L\'algoritmo di ordinamento del feed è intercambiabile: cronologico, per engagement, algoritmico (ML), per location. Il FeedService non sa quale algoritmo usa — lo scambi a runtime.'})}
${CodeBlock({filename:'FeedRankingStrategy.php — algoritmo di feed intercambiabile', code:
`interface FeedRankingStrategyInterface
{
    /** @param Post[] $posts */
    public function rank(array $posts, User $viewer): array;
    public function getName(): string;
}

// Cronologico — più semplice
class ChronologicalRanking implements FeedRankingStrategyInterface
{
    public function rank(array $posts, User $viewer): array
    {
        usort($posts, fn($a, $b) =>
            $b->getPublishedAt() <=> $a->getPublishedAt()
        );
        return $posts;
    }
    public function getName(): string { return 'chronological'; }
}

// Per engagement — like + commenti + saves nelle ultime 24h
class EngagementRanking implements FeedRankingStrategyInterface
{
    public function rank(array $posts, User $viewer): array
    {
        $scored = array_map(fn($post) => [
            'post'  => $post,
            'score' => $this->computeEngagementScore($post),
        ], $posts);

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        return array_column($scored, 'post');
    }

    private function computeEngagementScore(Post $post): float
    {
        $ageHours  = (time() - $post->getPublishedAt()->getTimestamp()) / 3600;
        $likes     = $post->getLikeCount();
        $comments  = $post->getCommentCount();
        $saves     = $post->getSaveCount();
        $decay     = exp(-$ageHours / 48); // dimezza ogni 48h

        return ($likes + $comments * 2 + $saves * 3) * $decay;
    }
    public function getName(): string { return 'engagement'; }
}

// Algoritmico (ML) — chiama microservizio esterno
class MLRanking implements FeedRankingStrategyInterface
{
    public function rank(array $posts, User $viewer): array
    {
        $scores = $this->mlClient->scorePostsForUser(
            postIds: array_map(fn($p) => $p->getId(), $posts),
            userId:  $viewer->getId()
        );
        // ordina per score ML
        usort($posts, fn($a, $b) =>
            ($scores[$b->getId()] ?? 0) <=> ($scores[$a->getId()] ?? 0)
        );
        return $posts;
    }
    public function getName(): string { return 'ml_personalized'; }
}

class FeedService
{
    public function __construct(
        private readonly PostRepositoryInterface      $postRepo,
        private readonly FeedRankingStrategyInterface $ranking,  // iniettata via DI
    ) {}

    public function getFeed(User $user, int $limit = 20): array
    {
        $posts = $this->postRepo->findCandidatesForFeed($user, $limit * 3);
        return array_slice($this->ranking->rank($posts, $user), 0, $limit);
    }
}`,
})}`;
}

function patObserver() {
  return `
${Callout({type:'info',title:'Observer — Event-Driven',
  body:'Quando un utente pubblica un Post, lo stesso evento scatena: notifiche ai follower, aggiornamento cache feed, analytics, moderazione contenuti. Nessun servizio sa degli altri.'})}
${CodeBlock({filename:'PostPublishedEvent + Subscriber', code:
`// L'evento — immutabile, porta tutti i dati necessari
final class PostPublishedEvent
{
    public function __construct(
        public readonly Post              $post,
        public readonly User             $author,
        public readonly DateTimeImmutable $publishedAt = new DateTimeImmutable(),
    ) {}
}

// Subscriber 1: notifica i follower
class FollowerNotificationSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [PostPublishedEvent::class => ['onPostPublished', 10]];
    }

    public function onPostPublished(PostPublishedEvent $event): void
    {
        $followers = $this->followRepo->findFollowers($event->author);
        foreach (array_chunk($followers, 100) as $batch) {
            $this->bus->dispatch(new NotifyFollowersBatchMessage(
                postId:      $event->post->getId(),
                followerIds: array_map(fn($f) => $f->getId(), $batch),
            ));
        }
    }
}

// Subscriber 2: invalida cache del feed dei follower
class FeedCacheInvalidatorSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [PostPublishedEvent::class => ['onPostPublished', 5]];
    }

    public function onPostPublished(PostPublishedEvent $event): void
    {
        $this->feedCache->invalidateForFollowers($event->author);
        // invalida anche l'explore feed se ha abbastanza hashtag
        if (count($event->post->getHashtags()) >= 3) {
            $this->exploreCache->invalidate();
        }
    }
}

// Subscriber 3: aggiorna analytics
class PostAnalyticsSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            PostPublishedEvent::class => 'onPostPublished',
            PostLikedEvent::class     => 'onPostLiked',
            CommentAddedEvent::class  => 'onCommentAdded',
        ];
    }

    public function onPostPublished(PostPublishedEvent $event): void
    {
        $this->analytics->track('post_published', [
            'post_id'    => $event->post->getId(),
            'author_id'  => $event->author->getId(),
            'post_type'  => $event->post->getType(),
            'hashtags'   => $event->post->getHashtagNames(),
            'has_location' => $event->post->hasLocation(),
        ]);
    }
}`,
})}`;
}

function patCommand() {
  return `
${Callout({type:'info',title:'Command Pattern + Symfony Messenger',
  body:'Le azioni pesanti — invio notifiche in batch a milioni di follower, generazione thumbnails, aggiornamento indice Elasticsearch — vanno in background via Messenger.'})}
${CodeBlock({filename:'Command + Handler asincrono', code:
`// Command — solo dati, serializzabile su Redis/RabbitMQ
final class NotifyFollowersBatchMessage
{
    public function __construct(
        public readonly int   $postId,
        public readonly array $followerIds,
        public readonly string $notificationType = 'new_post',
    ) {}
}

// Handler — tutta la logica
#[AsMessageHandler]
class NotifyFollowersBatchHandler
{
    public function __construct(
        private readonly PostRepositoryInterface         $postRepo,
        private readonly UserRepositoryInterface         $userRepo,
        private readonly PushNotificationServiceInterface $pushService,
        private readonly LoggerInterface                 $logger,
    ) {}

    public function __invoke(NotifyFollowersBatchMessage $message): void
    {
        $post      = $this->postRepo->findById($message->postId);
        $followers = $this->userRepo->findByIds($message->followerIds);

        if (!$post || $post->isArchived()) return; // post eliminato nel frattempo

        $notifications = [];
        foreach ($followers as $follower) {
            if (!$follower->wantsPushNotifications()) continue;
            if ($follower->isMuted($post->getAuthor())) continue;

            $notifications[] = new PushNotification(
                recipient: $follower,
                title:     "@{$post->getAuthor()->getUsername()} ha pubblicato un post",
                body:      $post->getCaption()->preview(80),
                imageUrl:  $post->getFirstMediaThumbnail(),
                deepLink:  "/p/{$post->getShortCode()}",
            );
        }

        $this->pushService->sendBatch($notifications);
        $this->logger->info('Followers notified', ['count' => count($notifications)]);
    }
}

// config/packages/messenger.yaml
framework:
    messenger:
        transports:
            notifications:
                dsn: '%env(REDIS_URL)%'
                retry_strategy:
                    max_retries: 3
                    delay: 2000
                    multiplier: 2
        routing:
            App\\Message\\NotifyFollowersBatchMessage: notifications
            App\\Message\\IndexPostInElasticsearchMessage: async
            App\\Message\\GenerateMediaThumbnailMessage: async`,
})}`;
}

function patChain() {
  return `
${Callout({type:'info',title:'Chain of Responsibility — Middleware',
  body:'Ogni request API passa attraverso una catena: autenticazione → rate limiting → permessi → validazione → controller. Ogni anello può bloccare o passare.'})}
${CodeBlock({filename:'Middleware chain per le API Instagram', code:
`interface PostMiddlewareInterface
{
    public function process(PostRequest $req, callable $next): PostResponse;
}

// 1. Autenticazione
class AuthenticationMiddleware implements PostMiddlewareInterface
{
    public function process(PostRequest $req, callable $next): PostResponse
    {
        $token = $req->getBearerToken();
        if (!$token || !$this->jwtValidator->isValid($token)) {
            return PostResponse::unauthorized('Invalid or missing token');
        }
        $req->setCurrentUser($this->jwtValidator->getUser($token));
        return $next($req);
    }
}

// 2. Rate limiting (per IP + per utente)
class RateLimitMiddleware implements PostMiddlewareInterface
{
    public function process(PostRequest $req, callable $next): PostResponse
    {
        $user    = $req->getCurrentUser();
        $limiter = $this->limiterFactory->create("post_publish.{$user->getId()}");
        $limit   = $limiter->consume(1);

        if (!$limit->isAccepted()) {
            return PostResponse::tooManyRequests(
                retryAfter: $limit->getRetryAfter()->getTimestamp()
            );
        }
        return $next($req);
    }
}

// 3. Moderazione account
class AccountStatusMiddleware implements PostMiddlewareInterface
{
    public function process(PostRequest $req, callable $next): PostResponse
    {
        $user = $req->getCurrentUser();
        if ($user->isSuspended())
            return PostResponse::forbidden('Account suspended');
        if ($user->isInReview())
            return PostResponse::forbidden('Account under review');
        return $next($req);
    }
}

// Pipeline — assembla la catena
class PostPublishPipeline
{
    private array $middleware;

    public function __construct(
        AuthenticationMiddleware  $auth,
        RateLimitMiddleware       $rateLimit,
        AccountStatusMiddleware   $accountStatus,
    ) {
        // Ordine importante: prima autentica, poi controlla i limiti
        $this->middleware = [$auth, $rateLimit, $accountStatus];
    }

    public function handle(PostRequest $req): PostResponse
    {
        $chain = array_reduce(
            array_reverse($this->middleware),
            fn($next, $mw) => fn($r) => $mw->process($r, $next),
            fn($r) => $this->controller->handle($r)
        );
        return $chain($req);
    }
}`,
})}`;
}

function patTemplate() {
  return `
${Callout({type:'info',title:'Template Method',
  body:'Il processo di export di un Post (CSV, JSON, PDF per press kit, XML per partner) segue sempre la stessa struttura: fetch → filter → format → render. Solo i passi cambiano.'})}
${CodeBlock({filename:'PostExporter — Template Method', code:
`abstract class PostExporter
{
    // Template method — struttura fissa, non sovrascrivibile
    final public function export(User $user, ExportDTO $params): ExportResult
    {
        $posts    = $this->fetchPosts($user, $params);       // step 1
        $filtered = $this->filterPosts($posts, $params);     // step 2
        $data     = $this->formatData($filtered, $params);   // step 3
        $output   = $this->render($data, $params);           // step 4
        $this->afterExport($user, $output);                  // hook opzionale
        return $output;
    }

    // Passo comune — usa sempre il repo
    protected function fetchPosts(User $user, ExportDTO $params): array
    {
        return $this->postRepo->findByUserInPeriod(
            $user, $params->from, $params->to
        );
    }

    // Hook opzionale — default: nessuna azione
    protected function filterPosts(array $posts, ExportDTO $params): array
    {
        return $posts; // le sottoclassi possono filtrare
    }

    // Passi astratti — obbligatori nelle sottoclassi
    abstract protected function formatData(array $posts, ExportDTO $params): array;
    abstract protected function render(array $data, ExportDTO $params): ExportResult;

    // Hook post-export
    protected function afterExport(User $user, ExportResult $result): void {} // no-op
}

// Export per il press kit (PDF con statistiche)
class PressKitExporter extends PostExporter
{
    protected function filterPosts(array $posts, ExportDTO $params): array
    {
        // Per il press kit solo i post con più engagement
        return array_filter($posts, fn($p) => $p->getLikeCount() > 1000);
    }

    protected function formatData(array $posts, ExportDTO $params): array
    {
        return array_map(fn($post) => [
            'url'       => "https://instagram.com/p/{$post->getShortCode()}",
            'thumbnail' => $post->getFirstMediaThumbnail(),
            'likes'     => $post->getLikeCount(),
            'comments'  => $post->getCommentCount(),
            'caption'   => $post->getCaption()->preview(200),
            'date'      => $post->getPublishedAt()->format('d/m/Y'),
        ], $posts);
    }

    protected function render(array $data, ExportDTO $params): ExportResult
    {
        $pdf = $this->pdfGenerator->generatePressKit($data, $params->user);
        return ExportResult::pdf($pdf, 'press_kit.pdf');
    }
}

// Export dati per partner (JSON)
class PartnerDataExporter extends PostExporter
{
    protected function formatData(array $posts, ExportDTO $params): array { ... }
    protected function render(array $data, ExportDTO $params): ExportResult
    {
        return ExportResult::json(json_encode($data));
    }
    protected function afterExport(User $user, ExportResult $result): void
    {
        $this->auditLog->logExport($user, 'partner_data');
    }
}`,
})}`;
}
