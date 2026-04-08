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
  {label:'🔨 Builder',          content: patBuilder()}
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
`abstract class AbstractMediaProcessingFactory
{
    // Metodo astratto: ogni tipo di media deve implementare la generazione della thumbnail
    abstract public function createThumbnailGenerator(): ThumbnailGeneratorInterface;

    // Metodo astratto: ogni tipo di media deve implementare la generazione della preview
    abstract public function createPreviewGenerator(): PreviewGeneratorInterface;

    // Metodo astratto: ogni tipo di media deve implementare l'upload
    abstract public function createStorageUploader(): StorageUploaderInterface;

    // Metodo concreto condiviso da tutte le factory
    public function process(MediaFile $media): ProcessedMedia
    {
        $thumbnail = $this->createThumbnailGenerator()->generate($media);
        $preview   = $this->createPreviewGenerator()->generate($media);
        $url       = $this->createStorageUploader()->upload($media->getPath());

        return new ProcessedMedia($url, $thumbnail, $preview);
    }
}

class PhotoProcessingFactory extends AbstractMediaProcessingFactory
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

class VideoProcessingFactory extends AbstractMediaProcessingFactory
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

class MediaProcessor
{
    public function process(MediaFile $media, AbstractMediaProcessingFactory $factory): ProcessedMedia
    {
        return $factory->process($media);
    }
}
//Invece di fare questo:
class MediaProcessor
{
    public function process(MediaFile $media): ProcessedMedia
    {
        if ($media->getMimeType() === 'image/jpeg') {
            $thumbnail = new ImageThumbnailGenerator(width: 150, height: 150, format: 'webp');
            $preview   = new ImagePreviewGenerator(maxWidth: 1080, quality: 85);
            $uploader  = new S3ImageUploader($s3Client, bucket: 'photos');
        } elseif ($media->getMimeType() === 'video/mp4') {
            $thumbnail = new VideoThumbnailGenerator(atSecond: 1.0);
            $preview   = new VideoPreviewGenerator(durationSec: 15, format: 'mp4');
            $uploader  = new S3VideoUploader($s3Client, bucket: 'videos');
        } else {
            throw new \Exception("Tipo di media non supportato");
        }

        return new ProcessedMedia(
            $uploader->upload($media->getPath()),
            $thumbnail->generate($media),
            $preview->generate($media)
        );
    }
}
`,


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
  {label:'👁️ Relfection',  content: patReflection()},
  {label:'💡 Command',   content: patCommand()},
  {label:'📋 Template',  content: patTemplate()},
]})}`;
}

function patStrategy() {
  return `
${Callout({type:'info',title:'Strategy Pattern',
  body:'L\'algoritmo di ordinamento del feed è intercambiabile: cronologico, per engagement, algoritmico (ML). Il FeedService non sa quale algoritmo usa — lo scambi a runtime senza modificare il codice.'})}
${Heading({level:2, text:'Cos\'è il Strategy Pattern'})}
${Paragraph({text:'Il Strategy Pattern è un pattern comportamentale che incapsula una famiglia di algoritmi in classi separate e intercambiabili, permettendo al client di scegliere quale algoritmo usare a runtime senza modificare il codice che lo utilizza. Risolve il problema: "Come evito enormi blocchi if/else per scegliere tra algoritmi diversi?"'})}

${Heading({level:3, text:'Componenti principali'})}
${Table({
  headers: ['Componente', 'Ruolo', 'Nel tuo codice'],
  rows: [
    ['Strategy Interface', 'Contratto che tutte le implementazioni devono rispettare', 'FeedRankingStrategyInterface'],
    ['Concrete Strategies', 'Implementazioni concrete di algoritmi diversi', 'ChronologicalRanking, EngagementRanking, MLRanking'],
    ['Context', 'Classe che usa una strategy senza conoscere i dettagli', 'FeedService'],
    ['Client', 'Chi decide quale strategy iniettare nel context', 'Controller che istanzia FeedService'],
  ]
})}

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
    //Ordina i post dal più recente al più vecchio
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
    //Ordina i post in base all’engagement recente(Popolarità).
    // Come funziona:
    // Per ogni post calcola uno score
    // Ordina per score decrescente
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
    // Usa un modello di Machine Learning esterno
    public function rank(array $posts, User $viewer): array
    {
        $scores = $this->mlClient->scorePostsForUser(
            postIds: array_map(fn($p) => $p->getId(), $posts),
            userId:  $viewer->getId()
        );
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
        // FeedService NON SA quale algoritmo sta usando
        return array_slice($this->ranking->rank($posts, $user), 0, $limit);
    }
}`,
})}

${Heading({level:3, text:'Senza Strategy: il problema degli if/else'})}

${CodeBlock({filename:'Senza Strategy — difficile da estendere', code:
`public function getFeed(User $user, string $rankingType = 'chronological'): array
{
    $posts = $this->postRepo->findCandidatesForFeed($user, 60);
    
    if ($rankingType === 'chronological') {
        usort($posts, fn($a, $b) => $b->getPublishedAt() <=> $a->getPublishedAt());
    } elseif ($rankingType === 'engagement') {
        // ... 10 righe di logica engagement
        $scored = array_map(fn($post) => [
            'post'  => $post,
            'score' => $this->computeEngagementScore($post),
        ], $posts);
        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);
        $posts = array_column($scored, 'post');
    } elseif ($rankingType === 'ml') {
        // ... 15 righe di logica ML
    } elseif ($rankingType === 'trending') {
        // ... aggiungere un nuovo algoritmo
    }
    
    return array_slice($posts, 0, 20);
}
// Quando aggiungi una nuova strategia, devi modificare questa funzione!
// Ogni cambio è rischioso — Open/Closed Principle violato.`,
})}

${Heading({level:3, text:'Con Strategy: pulito e estendibile'})}

${CodeBlock({filename:'Con Strategy — facile da estendere', code:
`class FeedService
{
    public function __construct(
        private readonly PostRepositoryInterface      $postRepo,
        private readonly FeedRankingStrategyInterface $ranking,
    ) {}

    public function getFeed(User $user, int $limit = 20): array
    {
        $posts = $this->postRepo->findCandidatesForFeed($user, $limit * 3);
        return array_slice($this->ranking->rank($posts, $user), 0, $limit);
    }
}

// Nel controller — cambio strategia a runtime
$ranking = match($request->get('sort')) {
    'chronological' => new ChronologicalRanking(),
    'engagement'    => new EngagementRanking(),
    'ml'            => new MLRanking($mlClient),
    default         => new EngagementRanking(),
};

$feedService = new FeedService($postRepo, $ranking);
$feed = $feedService->getFeed($user);

// Aggiungi una nuova strategia? Crei una classe, basta! FeedService non cambia mai.`,
})}

${Heading({level:3, text:'Vantaggi del Pattern Strategy'})}

${BulletList({items:[
  {title:'Niente if/else', text:'FeedService è semplice e leggibile. Non contiene logica di ranking.'},
  {title:'Open/Closed Principle', text:'Aperto all\'estensione (aggiungi TrendingRanking), chiuso alla modifica (FeedService rimane intatto).'},
  {title:'Single Responsibility', text:'ChronologicalRanking ordina cronologicamente. EngagementRanking calcola engagement. MLRanking chiama il servizio ML. Ognuno fa una cosa.'},
  {title:'Testabilità', text:'Nel test inietti una mock strategy e testi FeedService isolato dalla logica di ranking.'},
  {title:'Cambio dinamico', text:'L\'utente sceglie l\'algoritmo? Cambi la strategy a runtime senza riavviare nulla.'},
]})})

${Heading({level:3, text:'Strategy vs Factory: qual è la differenza?'})}

${Table({
  headers: ['Aspetto', 'Strategy', 'Factory'],
  rows: [
    ['Problema risolto', 'Come usare algoritmi diversi senza if/else', 'Come creare oggetti senza sapere quale classe istanziare'],
    ['Focus', 'Comportamento (come faccio l\'operazione)', 'Creazione (come creo l\'oggetto)'],
    ['Quando la usi', 'L\'algoritmo viene usato ripetutamente', 'L\'oggetto viene creato una sola volta'],
    ['Chi decide?', 'Spesso il client esterno', 'La Factory decide, il client non sa'],
  ]
})}

${CodeBlock({filename:'Differenza nella pratica', code:
`// STRATEGY: il client sceglie quale algoritmo usare
$ranking = match($request->get('sort')) {
    'chronological' => new ChronologicalRanking(),
    'engagement'    => new EngagementRanking(),
    'ml'            => new MLRanking($mlClient),
};
$feedService = new FeedService($postRepo, $ranking);
$feed = $feedService->getFeed($user);

// FACTORY: la factory decide quale oggetto creare
class RankingFactory
{
    public function create(string $type): FeedRankingStrategyInterface
    {
        return match($type) {
            'chronological' => new ChronologicalRanking(),
            'engagement'    => new EngagementRanking(),
            'ml'            => new MLRanking($this->mlClient),
        };
    }
}

// Nel controller
$ranking = $this->factory->create($request->get('sort'));
$feedService = new FeedService($postRepo, $ranking);
$feed = $feedService->getFeed($user);

// La logica è identica. Usi Factory quando la CREAZIONE è complessa.
// Nel tuo caso: Strategy pura, ma potresti aggiungere una Factory se MLRanking
// richiedesse setup complicato (dipendenze, validazioni, configurazioni).`,
})}

${Heading({level:3, text:'Quando usare Strategy Pattern'})}

${BulletList({items:[
  {title:'Hai 2+ algoritmi intercambiabili', text:'Per la stessa operazione (ordinamento, pagamento, filtro, validazione).'},
  {title:'Gli algoritmi cambiano a runtime', text:'L\'utente sceglie, una configurazione lo decide, un flag lo attiva — non è fisso al deploy.'},
  {title:'Vuoi evitare if/else lunghi', text:'Se i tuoi metodi iniziano a diventare pieni di condizionali, è il segnale.'},
  {title:'Ogni algoritmo è complesso', text:'Merita la sua classe, non una funzione privata nascosta.'},
]})}
`;
}

function patReflection() {
  return `
${Callout({type:'info', title:'Reflection API',
  body:'La Reflection API permette di ispezionare classi, metodi, proprietà e parametri a runtime — senza conoscerli a compile time. È la base su cui Symfony costruisce il Dependency Injection Container, il Router e il sistema di validazione.'})}

${Heading({level:2, text:'Cos\'è la Reflection API'})}

${Paragraph({text:'Normalmente il codice sa già cosa sta usando: chiama metodi conosciuti, istanzia classi note. Con la Reflection puoi fare il contrario: dato un oggetto o una stringa con il nome di una classe, puoi scoprire a runtime quali metodi ha, quali parametri accettano, quali attributi PHP sono applicati, quali sono i tipi. Symfony usa questo meccanismo per costruire il container DI automaticamente.'})}

${Heading({level:3, text:'I principali strumenti della Reflection API'})}

${Table({
  headers: ['Classe', 'Cosa ispeziona', 'Uso tipico'],
  rows: [
    ['ReflectionClass', 'La classe: metodi, proprietà, interfacce, attributi', 'Scoprire cosa implementa una classe a runtime'],
    ['ReflectionMethod', 'Un singolo metodo: parametri, visibilità, return type', 'Capire come invocare un metodo dinamicamente'],
    ['ReflectionParameter', 'Un parametro di un metodo: tipo, default, nullable', 'Autowiring del DI Container'],
    ['ReflectionProperty', 'Una proprietà: tipo, valore default, visibilità', 'Serializzazione, ORM mapping'],
    ['ReflectionAttribute', 'Gli attributi PHP #[] applicati a classe/metodo/prop', 'Routing, validazione, cache'],
  ]
})}

${Heading({level:3, text:'Caso 1 — Ispezionare una classe'})}

${Paragraph({text:'Il caso più semplice: dato il nome di una classe, scopri tutto quello che contiene.'})}

${CodeBlock({filename:'ReflectionClass — ispezione base', code:
`class UserService
{
    private UserRepository $repo;
    private EmailSender    $emailSender;
    private Logger         $logger;

    public function __construct(
        UserRepository $repo,
        EmailSender    $emailSender,
        Logger         $logger,
    ) {
        $this->repo        = $repo;
        $this->emailSender = $emailSender;
        $this->logger      = $logger;
    }

    public function activate(int $userId): void { ... }
    public function deactivate(int $userId): void { ... }
    private function sendWelcomeEmail(User $user): void { ... }
}

// Ispezione a runtime
$ref = new ReflectionClass(UserService::class);

echo $ref->getName();           // App\\Service\\UserService
echo $ref->getShortName();      // UserService
echo $ref->isAbstract();        // false
echo $ref->getParentClass();    // false (nessun parent)

// Tutti i metodi pubblici
foreach ($ref->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
    echo $method->getName(); // __construct, activate, deactivate
}

// Tutte le proprietà
foreach ($ref->getProperties() as $prop) {
    echo $prop->getName();   // repo, emailSender, logger
    echo $prop->getType();   // UserRepository, EmailSender, Logger
}`,
})}

${Heading({level:3, text:'Caso 2 — Autowiring: come Symfony risolve le dipendenze'})}

${Paragraph({text:'Questo è l\'uso più importante della Reflection in Symfony. Il Container legge il costruttore di ogni service, scopre i tipi dei parametri, e li risolve automaticamente — senza che tu debba configurare nulla.'})}

${CompareGrid({
  badCode:
`// Senza autowiring — configurazione manuale
// services.yaml
services:
    App\\Service\\UserService:
        arguments:
            - '@App\\Repository\\UserRepository'
            - '@App\\Service\\EmailSender'
            - '@Psr\\Log\\LoggerInterface'

// Ogni volta che aggiungi una dipendenza
// devi aggiornare services.yaml a mano.
// Con 50 service diventa un incubo.`,
  goodCode:
`// Con autowiring — zero configurazione
// services.yaml
services:
    _defaults:
        autowire: true

    App\\Service\\UserService: ~
    # Symfony legge il costruttore con Reflection
    # e risolve le 3 dipendenze automaticamente`,
})}

${CodeBlock({filename:'SimpleContainer.php — implementazione minimale di autowiring', code:
`// Ecco come funziona internamente — versione semplificata
class SimpleContainer
{
    private array $bindings  = [];
    private array $instances = [];

    public function bind(string $abstract, string $concrete): void
    {
        $this->bindings[$abstract] = $concrete;
    }

    public function make(string $class): object
    {
        // Già in cache? Restituisci la stessa istanza (shared service)
        if (isset($this->instances[$class])) {
            return $this->instances[$class];
        }

        // 1. Rifletti sulla classe
        $ref = new ReflectionClass($class);

        // 2. Nessun costruttore? Instanzia direttamente
        $constructor = $ref->getConstructor();
        if ($constructor === null) {
            return $this->instances[$class] = new $class();
        }

        // 3. Leggi i parametri del costruttore
        $dependencies = [];
        foreach ($constructor->getParameters() as $param) {
            $type = $param->getType();

            // Parametro senza tipo? Non possiamo risolverlo
            if (!$type instanceof ReflectionNamedType || $type->isBuiltin()) {
                if ($param->isDefaultValueAvailable()) {
                    $dependencies[] = $param->getDefaultValue();
                    continue;
                }
                throw new \\RuntimeException(
                    "Cannot resolve parameter \${$param->getName()} in {$class}"
                );
            }

            // 4. Risolvi ricorsivamente la dipendenza
            $depClass      = $type->getName();
            $dependencies[] = $this->make(
                $this->bindings[$depClass] ?? $depClass
            );
        }

        // 5. Instanzia con le dipendenze risolte
        $instance = $ref->newInstanceArgs($dependencies);
        return $this->instances[$class] = $instance;
    }
}

// Utilizzo — il container risolve tutto automaticamente
$container = new SimpleContainer();

// Symfony fa questo per ogni interface → implementazione
$container->bind(UserRepositoryInterface::class, DoctrineUserRepository::class);
$container->bind(LoggerInterface::class, MonologLogger::class);

// Una sola riga — il container legge il costruttore
// e risolve UserRepository, EmailSender, Logger
$userService = $container->make(UserService::class);`,
})}

${Heading({level:3, text:'Caso 3 — Leggere gli Attributi PHP #[]'})}

${Paragraph({text:'Gli attributi PHP 8 sono metadati che puoi attaccare a classi, metodi e proprietà. La Reflection è l\'unico modo per leggerli a runtime. Symfony li usa per il routing, la validazione e la cache.'})}

${CodeBlock({filename:'Attributi custom — Route + Cache + Validate', code:
`// Definizione degli attributi
#[\\Attribute(\\Attribute::TARGET_METHOD)]
class Route
{
    public function __construct(
        public readonly string $path,
        public readonly string $method = 'GET',
    ) {}
}

#[\\Attribute(\\Attribute::TARGET_METHOD)]
class Cache
{
    public function __construct(public readonly int $ttl = 60) {}
}

#[\\Attribute(\\Attribute::TARGET_PROPERTY)]
class Validate
{
    public function __construct(
        public readonly int    $maxLength = 255,
        public readonly bool   $required  = true,
    ) {}
}

// Controller con attributi applicati
class PostController
{
    #[Route('/api/posts', method: 'GET')]
    #[Cache(ttl: 120)]
    public function index(): JsonResponse { ... }

    #[Route('/api/posts/{id}', method: 'GET')]
    #[Cache(ttl: 300)]
    public function show(int $id): JsonResponse { ... }

    #[Route('/api/posts', method: 'POST')]
    public function create(Request $req): JsonResponse { ... }
}

// Lettore di attributi — come Symfony costruisce il router
class AttributeRouteReader
{
    public function extractRoutes(string $controllerClass): array
    {
        $ref    = new ReflectionClass($controllerClass);
        $routes = [];

        foreach ($ref->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
            // Leggi tutti gli attributi #[Route] sul metodo
            $routeAttrs = $method->getAttributes(Route::class);
            $cacheAttrs = $method->getAttributes(Cache::class);

            foreach ($routeAttrs as $routeAttr) {
                $route = $routeAttr->newInstance(); // istanzia l'attributo
                $cache = !empty($cacheAttrs)
                    ? $cacheAttrs[0]->newInstance()
                    : null;

                $routes[] = [
                    'path'    => $route->path,
                    'method'  => $route->method,
                    'handler' => [$controllerClass, $method->getName()],
                    'ttl'     => $cache?->ttl,
                ];
            }
        }

        return $routes;
    }
}

// Risultato
$reader = new AttributeRouteReader();
$routes = $reader->extractRoutes(PostController::class);

// [
//   ['path' => '/api/posts',      'method' => 'GET',  'handler' => [...], 'ttl' => 120],
//   ['path' => '/api/posts/{id}', 'method' => 'GET',  'handler' => [...], 'ttl' => 300],
//   ['path' => '/api/posts',      'method' => 'POST', 'handler' => [...], 'ttl' => null],
// ]`,
})}

${Heading({level:3, text:'Ok ma come fa a capire symfony da dove prendere le rotte? devo registrarle a mano ogni volta?'})}
${CodeBlock({filename:'SimpleContainer.php — implementazione minimale di autowiring', code:
`# config/routes.yaml
_attributes:
  resource: ../src/Controller/
  type: attribute  # ← "Scannerizza i Controller e leggi gli Attribute"`,
})}

${Heading({level:3, text:'Quando usare (e quando evitare) la Reflection'})}

${Table({
  headers: ['Caso', 'Usala?', 'Perché'],
  rows: [
    ['Costruire un DI Container', '✓ Sì', 'È esattamente il suo scopo — autowiring basato sui tipi'],
    ['Leggere attributi #[] a runtime', '✓ Sì', 'È l\'unico modo per farlo'],
    ['Costruire un router da attributi', '✓ Sì', 'Symfony, Laravel e altri la usano così'],
    ['Accedere a proprietà private nei test', '⚠ Solo nei test', 'Accettabile nei test, mai in produzione'],
    ['Chiamare metodi privati di un\'altra classe', '✗ No', 'Rompe l\'encapsulation — ripensa il design'],
    ['Usarla in ogni request HTTP', '✗ No', 'È lenta — Symfony compila il container in cache proprio per evitarlo'],
  ]
})}

${Callout({type:'warn', title:'Attenzione alle performance',
  body:'La Reflection è costosa. Symfony non usa ReflectionClass ad ogni request — compila tutto in PHP puro nella cache (var/cache). Se scrivi un sistema che usa Reflection, metti sempre una cache davanti: calcola una volta, salva il risultato, riusalo.'})}`;
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
${Callout({type:'info', title:'Template Method',
  body:'Definisce lo scheletro di un algoritmo in una classe base, lasciando alle sottoclassi l\'implementazione di alcuni passi. La struttura non cambia mai — cambiano solo i dettagli.'})}

${Heading({level:2, text:'Cos\'è il Template Method'})}

${Paragraph({text:'Immagina di dover spedire una notifica agli utenti. Il processo è sempre lo stesso: prepara il messaggio → formatta per il canale → invia → logga. Cambia solo come formatti e come invii. Il Template Method mette lo scheletro fisso nella classe base, e delega i passi variabili alle sottoclassi.'})}

${Heading({level:3, text:'Componenti principali'})}

${Table({
  headers: ['Componente', 'Ruolo', 'Nel tuo codice'],
  rows: [
    ['Classe astratta', 'Definisce il template method con lo scheletro fisso', 'AbstractNotificationSender'],
    ['Template method', 'Il metodo final che chiama i passi in ordine', 'send()'],
    ['Passi astratti', 'Obbligatori nelle sottoclassi — il \"cosa cambia\"', 'formatMessage(), deliver()'],
    ['Hook', 'Opzionali — le sottoclassi possono sovrascriverli o no', 'afterSend()'],
    ['Concrete class', 'Implementa solo i passi variabili', 'EmailSender, PushSender, SmsSender'],
  ]
})}

${Heading({level:3, text:'Senza Template Method: il problema'})}

${Paragraph({text:'Ogni classe di notifica implementa l\'intero processo da zero. Se aggiungi il logging, devi modificare tutte le classi. Se dimentichi un passo in una classe, il comportamento è inconsistente.'})}

${CompareGrid({
  badCode:
`// Ogni sender reimplementa tutto il processo
// Dimentichi il log in EmailSender? Nessuno te lo dice.

class EmailSender
{
    public function send(User $user, string $message): void
    {
        // Validazione — copiata ovunque
        if (empty($message)) throw new \\InvalidArgumentException('Empty');
        if (!$user->hasEmail()) throw new \\RuntimeException('No email');

        // Formattazione specifica email
        $html = "<html><body><p>{$message}</p></body></html>";
        $subject = $this->extractSubject($message);

        // Invio
        $this->mailer->send($user->getEmail(), $subject, $html);

        // Log — se te ne ricordi
        $this->logger->info("Email sent to {$user->getId()}");
    }
}

class SmsSender
{
    public function send(User $user, string $message): void
    {
        // Stessa validazione — duplicata!
        if (empty($message)) throw new \\InvalidArgumentException('Empty');
        if (!$user->hasPhone()) throw new \\RuntimeException('No phone');

        // Formattazione specifica SMS (max 160 char)
        $sms = mb_substr(strip_tags($message), 0, 160);

        // Invio
        $this->twilioClient->messages->create(
            $user->getPhone(), ['body' => $sms]
        );
        // Log dimenticato! Bug silenzioso.
    }
}

class PushSender
{
    public function send(User $user, string $message): void
    {
        // Validazione diversa — inconsistente!
        if (!$message) return; // silenzioso invece di eccezione

        // Formattazione push
        $payload = ['title' => 'Notifica', 'body' => $message];

        // Invio
        $this->fcm->send($user->getDeviceToken(), $payload);
        // Nessun log. Nessuna traccia.
    }
}

// Vuoi aggiungere un controllo "utente bloccato" prima di inviare?
// Devi modificare TUTTE e 3 le classi.`,

  goodCode:
`// Il processo è fisso nella classe base.
// Le sottoclassi implementano SOLO il "come".

abstract class AbstractNotificationSender
{
    // Template method — final: nessuno può cambiare l'ordine
    final public function send(User $user, string $message): void
    {
        $this->validate($user, $message);           // step 1 — fisso
        $formatted = $this->format($message);       // step 2 — variabile
        $this->deliver($user, $formatted);          // step 3 — variabile
        $this->afterSend($user, $message);          // step 4 — hook
    }

    // Passo fisso — uguale per tutti
    private function validate(User $user, string $message): void
    {
        if (empty($message))
            throw new \\InvalidArgumentException('Message cannot be empty');
        if (!$this->canReceive($user))
            throw new CannotDeliverException($user, static::class);
    }

    // Hook — opzionale, default: logga sempre
    protected function afterSend(User $user, string $message): void
    {
        $channel = static::class;
        $this->logger->info("Notification sent via {$channel} to {$user->getId()}");
    }

    // Passi astratti — ogni sottoclasse DEVE implementarli
    abstract protected function canReceive(User $user): bool;
    abstract protected function format(string $message): string;
    abstract protected function deliver(User $user, string $formatted): void;
}

// Email: implementa solo i 3 passi variabili
class EmailSender extends AbstractNotificationSender
{
    protected function canReceive(User $user): bool
    {
        return $user->hasEmail() && !$user->hasEmailOptOut(); // ha fornito il consenso di ricevere email (opt-out)
    }

    protected function format(string $message): string
    {
        return "<html><body><p>{$message}</p></body></html>";
    }

    protected function deliver(User $user, string $formatted): void
    {
        $this->mailer->send($user->getEmail(), 'Notifica', $formatted);
    }
}

// SMS: implementa solo i 3 passi variabili
class SmsSender extends AbstractNotificationSender
{
    protected function canReceive(User $user): bool
    {
        return $user->hasPhone();
    }

    protected function format(string $message): string
    {
        return mb_substr(strip_tags($message), 0, 160);
    }

    protected function deliver(User $user, string $formatted): void
    {
        $this->twilioClient->messages->create(
            $user->getPhone(), ['body' => $formatted]
        );
    }
}

// Push: sovrascrive anche l'hook afterSend
class PushSender extends AbstractNotificationSender
{
    protected function canReceive(User $user): bool
    {
        return $user->hasDeviceToken();
    }

    protected function format(string $message): string
    {
        return json_encode(['title' => 'Notifica', 'body' => $message]);
    }

    protected function deliver(User $user, string $formatted): void
    {
        $this->fcm->send($user->getDeviceToken(), json_decode($formatted, true));
    }

    // Override hook — push ha bisogno di log speciale con delivery receipt
    protected function afterSend(User $user, string $message): void
    {
        parent::afterSend($user, $message); // log base
        $this->pushMetrics->trackDelivery($user->getDeviceToken());
    }
}

//Service che si occupa di inviare le notifiche
class NotificationService
{
    public function __construct(
        private readonly EmailSender $emailSender,
        private readonly SmsSender  $smsSender,
        private readonly PushSender $pushSender,
    ) {}

    public function notifyNewFollower(User $user, User $follower): void
    {
        $message = "{$follower->getUsername()} ha iniziato a seguirti.";

        // Qui viene chiamata send() — che internamente esegue
        // validate → format → deliver → afterSend
        $this->emailSender->send($user, $message);
        $this->smsSender->send($user, $message);
        $this->pushSender->send($user, $message);
    }
}

`,
})}

${Heading({level:3, text:'Perché funziona'})}

${Paragraph({text:'Aggiungi domani un controllo "utente in Do Not Disturb"? Modifichi validate() nella classe base — tutte e 3 le sottoclassi lo ricevono automaticamente. Aggiungi SlackSender? Crei una classe, implementi 3 metodi, hai finito.'})}

${Table({
  headers: ['Scenario', 'Senza Template Method', 'Con Template Method'],
  rows: [
    ['Aggiungere log a tutti i sender', 'Modifica 3 classi (rischi di dimenticarne una)', 'Modifica afterSend() nella base — finito'],
    ['Aggiungere SlackSender', 'Copi tutto il processo, rischi bug', 'Estendi la base, implementi 3 metodi'],
    ['Cambiare l\'ordine dei passi', 'Devi allineare tutte le classi a mano', 'Cambi solo il template method nella base'],
    ['Testare il flusso comune', 'Devi testare ogni classe separatamente', 'Testi la base una volta, poi solo i passi variabili'],
  ]
})}
${Heading({level:3, text:'Quando usare Template Method'})}

${BulletList({items:[
  {title:'Hai un processo con passi fissi e dettagli variabili', text:'La struttura non cambia, ma "come" si fanno certi passi dipende dal contesto.'},
  {title:'Vuoi evitare duplicazione del codice comune', text:'Validazione, logging, cleanup — scritto una volta nella base, garantito in tutte le sottoclassi.'},
  {title:'L\'algoritmo non deve cambiare a runtime', text:'Se devi scambiare l\'algoritmo dinamicamente, usa Strategy. Template Method è compile-time.'},
  {title:'Vuoi dare hook opzionali senza obbligare', text:'afterSend() ha un default no-op — le sottoclassi lo sovrascrivono solo se ne hanno bisogno.'},
]})}`;
}
