// ============================================================
//  VIEW: SOLID  —  dominio: Instagram Post
// ============================================================

function renderSOLID() {
  const accent = '#38bdf8';
  return `
${PageHeader({eyebrow:'Principi fondamentali', title:'I 5 Principi SOLID',
  subtitle:'Ogni principio illustrato con il dominio Instagram: Post, Like, Comment, Follow, Notification, Feed.',
  accent})}
<div class="solid-grid">
${[
  {letter:'S',name:'Single Responsibility',color:'#38bdf8',desc:'Una classe = un motivo per cambiare.'},
  {letter:'O',name:'Open / Closed',        color:'#34d399',desc:'Aperta all\'estensione, chiusa alla modifica.'},
  {letter:'L',name:'Liskov Substitution',  color:'#a78bfa',desc:'Le sottoclassi sostituiscono la classe padre.'},
  {letter:'I',name:'Interface Segregation',color:'#fb923c',desc:'Molte interfacce specifiche, non una generica.'},
  {letter:'D',name:'Dependency Inversion', color:'#f472b6',desc:'Dipendi dalle astrazioni, non dalle implementazioni.'},
].map(p=>`
  <div class="solid-card" style="--card-accent:${p.color}">
    <div class="solid-card__letter">${p.letter}</div>
    <div class="solid-card__name">${p.name}</div>
    <div class="solid-card__desc">${p.desc}</div>
  </div>`).join('')}
</div>
${Tabs({id:'solid', accent, tabs:[
  {label:'S — SRP', content: solidSRP()},
  {label:'O — OCP', content: solidOCP()},
  {label:'L — LSP', content: solidLSP()},
  {label:'I — ISP', content: solidISP()},
  {label:'D — DIP', content: solidDIP()},
]})}`;
}

function solidSRP() {
  return `
${Callout({type:'info',title:'Single Responsibility Principle',
  body:'Ogni classe dovrebbe avere una sola responsabilità. Se una classe gestisce più compiti, un cambiamento in uno di essi può rompere tutto il resto.'})}
${CompareGrid({
  badCode:
`// SRP violato — PostManager fa TUTTO
class PostManager
{
    public function publish(array $data, User $author): Post
    {
        // valida il post
        if (mb_strlen($data['caption']) > 2200)
            throw new Exception('Caption too long');

        // crea il post
        $post = new Post();
        $post->setCaption($data['caption']);
        $post->setAuthor($author);

        // estrae hashtag
        preg_match_all('/#(\\w+)/', $data['caption'], $m);
        foreach ($m[1] as $tag) { /* ... */ }

        // salva nel DB
        $this->em->persist($post);
        $this->em->flush();

        // invia notifiche ai follower
        foreach ($author->getFollowers() as $f) {
            mail($f->getEmail(), 'Nuovo post', '...');
        }

        // invalida la cache del feed
        $this->redis->del("feed:{$author->getId()}");

        return $post;
    }
}`,
  goodCode:
`// SRP rispettato — ogni classe ha 1 responsabilità
class PostPublisher          // crea e salva il post
{
    public function publish(PublishPostDTO $dto, User $author): Post
    {
        $post = $this->factory->create($dto, $author);
        $this->postRepo->save($post, flush: true);
        $this->dispatcher->dispatch(new PostPublishedEvent($post));
        return $post;
    }
}

class PostValidator          // valida i dati del post
class HashtagExtractor       // estrae #hashtag dalla caption
class MediaUploader          // carica foto/video su S3
class FeedCacheInvalidator   // invalida la cache del feed
class FollowerNotifier       // notifica i follower

// Devo modificare una logica su chi deve ricevere le notifiche?
// → tocchi solo FollowerNotifier, nient'altro.`,
})}`;
}

function solidOCP() {
  return `
${Callout({type:'info',title:'Open/Closed Principle',
  body:'Aggiungere un nuovo tipo di notifica (es. Telegram) non deve richiedere la modifica di NotificationService. Si aggiunge una nuova classe, non si tocca il codice esistente.'})}
${CompareGrid({
  badCode:
`// OCP violato: ogni nuovo canale → modifica
class NotificationService
{
    public function notify(User $user, Post $post, string $channel): void
    {
        if ($channel === 'email') {
            mail($user->getEmail(), 'Ti hanno likato!', '...');
        } elseif ($channel === 'push') {
            $this->apns->send($user->getDeviceToken(), '...');
        } elseif ($channel === 'sms') {
            $this->twilio->message($user->getPhone(), '...');
        }
        // aggiungere Telegram? Modifico questa classe!
    }
}`,
  goodCode:
`interface NotificationChannelInterface
{
    public function send(User $recipient, Notification $n): void;
    public function supports(User $recipient): bool;
}

class EmailChannel implements NotificationChannelInterface
{
    public function send(User $r, Notification $n): void {
        $this->mailer->send(new LikeEmail($r, $n));
    }
    public function supports(User $r): bool { return $r->wantsEmailNotifications(); }
}

class PushChannel  implements NotificationChannelInterface { ... }
class SmsChannel   implements NotificationChannelInterface { ... }
class TelegramChannel implements NotificationChannelInterface { ... }

class NotificationService
{
    /** @param NotificationChannelInterface[] $channels */
    public function __construct(
        #[TaggedIterator('app.notification_channel')]
        private iterable $channels
    ) {}

    public function notify(User $user, Notification $n): void
    {
        foreach ($this->channels as $channel) {
            if ($channel->supports($user))
                $channel->send($user, $n);
        }
    }
    // Nuovo canale? Solo nuova classe + tag. Zero modifiche.
}`,
})}`;
}

function solidLSP() {
  return `
${Callout({type:'info',title:'Liskov Substitution Principle',
  body:'Ogni sottoclasse di Post (StoryPost, ReelPost, CarouselPost) deve poter sostituire Post senza rompere il comportamento atteso dal codice client.'})}
${CompareGrid({
  badCode:
`class Post
{
    public function getLikeCount(): int { return count($this->likes); }
    public function getComments(): array { return $this->comments->toArray(); }
}

// LSP VIOLATO: StoryPost disabilita commenti
// ma eredita da Post che li promette
class StoryPost extends Post
{
    public function getComments(): array
    {
        throw new RuntimeException('Stories have no comments!');
        // il caller si aspetta un array, riceve un'eccezione
    }
}

// Il codice client esplode:
foreach ($post->getComments() as $c) { // crash su StoryPost
    echo $c->getText();
}`,
  goodCode:
`// Interfacce separate per capacità diverse
interface CommentableInterface
{
    /** @return Comment[] */
    public function getComments(): array;
    public function addComment(Comment $c): void;
    public function isCommentsEnabled(): bool;
}

interface LikeableInterface
{
    public function getLikeCount(): int;
    public function addLike(Like $like): void;
}

class Post implements LikeableInterface, CommentableInterface { ... }
class StoryPost implements LikeableInterface { /* no comments */ }
class ReelPost  implements LikeableInterface, CommentableInterface { ... }

// Il client usa l'interfaccia giusta — mai sorprese
function showComments(CommentableInterface $post): void
{
    foreach ($post->getComments() as $comment) {
        echo $comment->getText(); // sempre sicuro
    }
}`,
})}`;
}

function solidISP() {
  return `
${Callout({type:'info',title:'Interface Segregation Principle',
  body:'UserRepositoryInterface non deve obbligare tutte le implementazioni a supportare operazioni che non usano. Interfacce piccole e specifiche per ogni scopo.'})}
${CompareGrid({
  badCode:
`// Interfaccia "grassa" — ISP violato
interface UserRepositoryInterface
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function findFollowers(User $user): array;
    public function findFollowing(User $user): array;
    public function findSuggestedUsers(User $user): array;
    public function save(User $user): void;
    public function delete(User $user): void;
    public function updateProfilePicture(User $u, string $url): void;
    public function blockUser(User $blocker, User $blocked): void;
    // 20 metodi — ogni implementazione deve supportarli tutti!
}`,
  goodCode:
`// Interfacce segregate per responsabilità
interface UserReaderInterface
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function findByUsername(string $username): ?User;
}

interface UserWriterInterface
{
    public function save(User $user, bool $flush = false): void;
    public function delete(User $user, bool $flush = false): void;
}

interface FollowRepositoryInterface
{
    public function findFollowers(User $user): array;
    public function findFollowing(User $user): array;
    public function isFollowing(User $actor, User $target): bool;
    public function countFollowers(User $user): int;
}

interface SuggestionsRepositoryInterface
{
    public function findSuggestedUsers(User $user, int $limit): array;
}

// DoctrineUserRepository implementa solo quello che usa
class DoctrineUserRepository implements UserReaderInterface, UserWriterInterface { }
class DoctrineFollowRepository implements FollowRepositoryInterface { }`,
})}`;
}

function solidDIP() {
  return `
${Callout({type:'info',title:'Dependency Inversion Principle',
  body:'FeedService non deve dipendere da DoctrinePostRepository. Deve dipendere da PostRepositoryInterface. Così puoi testare senza DB e swappare l\'implementazione senza toccare il Service.'})}
${CompareGrid({
  badCode:
`// DIP violato — dipende dall'implementazione concreta
class FeedService
{
    private DoctrinePostRepository $postRepo;    // ← concreto!
    private RedisCache $cache;                    // ← concreto!
    private ElasticsearchClient $searchClient;    // ← concreto!

    public function __construct()
    {
        $this->postRepo     = new DoctrinePostRepository();
        $this->cache        = new RedisCache('localhost');
        $this->searchClient = new ElasticsearchClient();
        // impossibile testare senza infrastruttura reale
    }
}`,
  goodCode:
`// DIP rispettato — dipende dalle astrazioni
interface PostRepositoryInterface
{
    /** @return Post[] */
    public function findFeedForUser(User $user, int $limit): array;
    public function findByHashtag(Hashtag $tag, User $viewer): array;
}

interface FeedCacheInterface
{
    public function getFeed(User $user): ?array;
    public function setFeed(User $user, array $posts): void;
    public function invalidate(User $user): void;
}

class FeedService
{
    public function __construct(
        private readonly PostRepositoryInterface $postRepo,
        private readonly FeedCacheInterface      $feedCache,
    ) {}

    public function getForUser(User $user, int $limit = 20): array
    {
        $cached = $this->feedCache->getFeed($user);
        if ($cached !== null) return $cached;

        $posts = $this->postRepo->findFeedForUser($user, $limit);
        $this->feedCache->setFeed($user, $posts);
        return $posts;
    }
}

// Test: inietti InMemoryPostRepository e FakeCache
// Prod: Symfony inietta Doctrine + Redis automaticamente`,
})}
${SectionBlock({title:'Autowiring Symfony — services.yaml', content: CodeBlock({
  filename:'config/services.yaml',
  code:
`services:
    _defaults:
        autowire: true
        autoconfigure: true

    # Bind interfaccia → implementazione concreta
    App\\Repository\\PostRepositoryInterface:
        alias: App\\Repository\\DoctrinePostRepository

    App\\Cache\\FeedCacheInterface:
        alias: App\\Cache\\RedisFeedCache

    # In test (services_test.yaml):
    # App\\Repository\\PostRepositoryInterface:
    #     alias: App\\Repository\\InMemoryPostRepository`,
})})}`;
}
