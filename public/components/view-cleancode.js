// ============================================================
//  VIEW: CLEAN CODE  —  dominio: Instagram Post
// ============================================================

function renderCleanCode() {
  const accent = '#38bdf8';
  return `
${PageHeader({ eyebrow:'Fondamenti', title:'Clean Code in PHP & Symfony',
  subtitle:'Ogni esempio usa il dominio reale di un social: Post, User, Like, Comment, Follow, Hashtag, Media.',
  accent })}
${Callout({
  type:'info',
  title:'Cos’è il Clean Code?',
  body:`
Clean Code significa scrivere codice che è facile da leggere, capire e modificare.

Non è solo "codice che funziona", ma codice pensato per gli sviluppatori:
- leggibile al primo colpo
- senza ambiguità
- senza duplicazioni
- con responsabilità chiare

Nel mondo reale (es: Instagram), il codice viene letto molto più spesso di quanto viene scritto.
Se il codice non è chiaro oggi, diventerà un problema domani.

👉 Regola chiave: se devi spiegare il codice con un commento, probabilmente puoi scriverlo meglio.
`
})}

${Callout({
  type:'warn',
  title:'Senza Clean Code → caos',
  body:`
Dopo qualche mese, codice non pulito porta a:
- bug difficili da trovare
- paura di modificare
- duplicazione ovunque
- feature lente da sviluppare

Clean Code evita tutto questo.
`
})}

${Tabs({ id:'cleancode', accent, tabs:[
  { label:'📛 Nomi',              content: ccNaming() },
  { label:'⚡ Funzioni',          content: ccFunctions() },
  { label:'🔁 DRY',              content: ccDRY() },
  { label:'💬 Commenti',         content: ccComments() },
  { label:'🎯 DTO & Value Obj',  content: ccDTO() },
  { label:'📐 Struttura classe', content: ccStructure() },
]})}`;
}

function ccNaming() {
  return `
${Callout({type:'info',title:'Regola d\'oro',
  body:'Se devi scrivere un commento per spiegare una variabile, il nome è sbagliato. Il codice deve raccontare da solo.'})}
${CompareGrid({
  badFile:'PostController.php — nomi criptici',
  goodFile:'PostController.php — nomi parlanti',
  badCode:
`$u   = $this->getUser();
$p   = $repo->find($id);
$arr = [];
foreach ($p->getL() as $l) {
    if ($l->getU() === $u)
        $arr[] = $l;
}
if (count($arr) > 0) { $p->setS(1); }`,
  goodCode:
`$currentUser  = $this->getUser();
$post         = $this->postRepo->findOrFail($id);
$userLikes    = $post->getLikesByUser($currentUser);
$hasLiked     = count($userLikes) > 0;
if ($hasLiked) {
    $post->markAsLikedByCurrentUser();
}`,
})}
${SectionBlock({title:'Convenzioni per il dominio Instagram', content:`
<div class="info-grid">
  <div class="info-card"><div class="info-card__title" style="color:#38bdf8">Classi</div>
    <div class="info-card__body"><code>Post</code>, <code>User</code>, <code>Like</code>, <code>Comment</code>, <code>Hashtag</code>, <code>MediaFile</code>, <code>FollowRequest</code>, <code>FeedEntry</code></div></div>
  <div class="info-card"><div class="info-card__title" style="color:#38bdf8">Metodi — verbi chiari</div>
    <div class="info-card__body"><code>publishPost()</code>, <code>likePost()</code>, <code>unlikePost()</code>, <code>followUser()</code>, <code>addComment()</code></div></div>
  <div class="info-card"><div class="info-card__title" style="color:#38bdf8">Booleani — is/has/can</div>
    <div class="info-card__body"><code>isPublished()</code>, <code>hasLiked()</code>, <code>canComment()</code>, <code>isFollowing()</code>, <code>isPrivateAccount()</code></div></div>
  <div class="info-card"><div class="info-card__title" style="color:#38bdf8">Costanti</div>
    <div class="info-card__body"><code>MAX_CAPTION_LENGTH</code>, <code>MAX_HASHTAGS_PER_POST</code>, <code>LIKE_CACHE_TTL</code>, <code>FEED_PAGE_SIZE</code></div></div>
</div>`})}`;
}

function ccFunctions() {
  return `
${Callout({type:'info',title:'Una funzione = una cosa sola',
  body:'Se descrivi il metodo con "e" (pubblica il post E invia notifiche E aggiorna il feed), va spezzato.'})}
${CompareGrid({
  badFile:'PostService.php — funzione monstre',
  goodFile:'PostService.php — responsabilità separate',
  badCode:
`public function publish(array $data, User $author): Post
{
    if (strlen($data['caption']) > 2200)
        throw new Exception('Caption too long');
    if (empty($data['media']))
        throw new Exception('No media');

    $post = new Post();
    $post->setCaption($data['caption']);
    $post->setAuthor($author);
    $post->setPublishedAt(new DateTimeImmutable());

    preg_match_all('/#(\\w+)/', $data['caption'], $m);
    foreach ($m[1] as $tag) {
        $hashtag = $this->hashtagRepo->findOrCreate($tag);
        $post->addHashtag($hashtag);
    }
    foreach ($data['media'] as $file) {
        $media = new MediaFile($file, $post);
        $this->em->persist($media);
    }
    $this->em->persist($post);
    $this->em->flush();

    foreach ($author->getFollowers() as $follower) {
        $n = new Notification($follower, 'new_post', $post);
        $this->em->persist($n);
    }
    $this->em->flush();
    foreach ($author->getFollowers() as $follower) {
        $this->cache->delete("feed.{$follower->getId()}");
    }
    $this->pushService->notifyFollowers($author, $post);
    return $post;
}`,
  goodCode:
`public function publish(PublishPostDTO $dto, User $author): Post
{
    // 1️⃣ Validazione dei dati
    $this->validator->validate($dto);

    // 2️⃣ Creazione del Post dal DTO
    $post = $this->postFactory->createFromDTO($dto, $author);

    // 3️⃣ Salvataggio Post
    $this->postRepo->save($post, flush: true);

    // 4️⃣ Dispatch dell'evento “Post pubblicato”
    //    I listener gestiranno:
    //    - Estrazione hashtag
    //    - Upload media su CDN/S3
    //    - Notifiche ai follower
    //    - Invalidazione cache
    //    - Push notification
    $this->dispatcher->dispatch(new PostPublishedEvent($post));

    // 5️⃣ Restituisco l’oggetto Post
    return $post;
}

final class PostPublishedListener
{
    public function __construct(
        private readonly HashtagExtractor     $hashtagExtractor,
        private readonly MediaUploader        $mediaUploader,
        private readonly NotificationService  $notificationService,
        private readonly CacheService         $cacheService,
        private readonly PushService          $pushService,
    ) {}

    public function onPostPublished(PostPublishedEvent $event): void
    {
        $post = $event->getPost();

        // 1️⃣ Estrazione hashtag dalla caption
        $hashtags = $this->hashtagExtractor->extractFromPost($post);
        $post->setHashtags($hashtags);

        // 2️⃣ Upload media su CDN/S3
        foreach ($post->getMediaFiles() as $media) {
            $this->mediaUploader->upload($media);
        }

        // 3️⃣ Notifiche ai follower
        $this->notificationService->notifyFollowers($post->getAuthor(), $post);

        // 4️⃣ Invalidazione cache feed dei follower
        $this->cacheService->invalidateFeedCacheForFollowers($post->getAuthor());

        // 5️⃣ Push notification mobile/web
        $this->pushService->sendPostPublishedPush($post);
    }
}

// ✅ Ogni responsabilità è separata e testabile:
// PostValidator           → valida caption, media, hashtag
// PostFactory             → crea oggetto Post da DTO
// HashtagExtractorListener → parsing #hashtag dalla caption
// MediaUploaderListener    → upload file su S3/CDN
// NotificationListener     → notifiche follower
// CacheListener            → invalidazione cache feed
// PushListener             → push notification mobile/web`,
})}
${SectionBlock({title:'Early return — niente piramide dell\'orrore', content: CompareGrid({
  badCode:
`public function likePost(Post $post, User $user): void
{
    if (!$post->isArchived()) {
        if ($post->getAuthor() !== $user) {
            if (!$this->hasAlreadyLiked($post, $user)) {
                $like = new Like($post, $user);
                $this->em->persist($like);
                $this->em->flush();
            }
        }
    }
}`,
  goodCode:
`public function likePost(Post $post, User $user): void
{
    if ($post->isArchived())                  return;
    if ($post->getAuthor() === $user)         return;
    if ($this->hasAlreadyLiked($post, $user)) return;

    $like = new Like($post, $user);
    $this->likeRepo->save($like, flush: true);
    $this->dispatcher->dispatch(new PostLikedEvent($like));
}`,
})})}`;
}

function ccDRY() {
  return `
${Callout({type:'warn',title:'DRY — Don\'t Repeat Yourself',
  body:'La logica "può interagire?" (blocchi, account privato, post archiviato) è usata in like, commento, follow, DM. Un solo posto — InteractionPolicy.'})}
${CompareGrid({
  badFile:'Logica di interazione duplicata ovunque',
  goodFile:'InteractionPolicy — unica fonte di verità',
  badCode:
`class LikeService {
    public function like(Post $p, User $u): void {
        if ($u->isSuspended()) throw new ...;
        if ($p->getAuthor()->hasBlocked($u)) throw new ...;
        if ($p->isArchived()) throw new ...;
        // like logic
    }
}
class CommentService {
    public function comment(Post $p, User $u, string $t): void {
        if ($u->isSuspended()) throw new ...;    // duplicato!
        if ($p->getAuthor()->hasBlocked($u)) throw new ...;
        if ($p->isArchived()) throw new ...;     // duplicato!
        // comment logic
    }
}
class FollowService {
    public function follow(User $target, User $u): void {
        if ($u->isSuspended()) throw new ...;    // ancora!
    }
}`,
  goodCode:
`final class InteractionPolicy
{
    public function assertCanInteract(
        User $actor,
        Post $post
    ): void {
        if ($actor->isSuspended())
            throw new AccountSuspendedException($actor);

        if ($post->getAuthor()->hasBlocked($actor))
            throw new UserBlockedException($actor);

        if ($post->isArchived())
            throw new PostNotAvailableException($post);

        if ($post->getAuthor()->isPrivate()
            && !$this->followRepo->isFollowing($actor, $post->getAuthor()))
            throw new PrivateAccountException();
    }
}

// LikeService, CommentService, ecc — una riga:
$this->policy->assertCanInteract($user, $post);`,
})}
${SectionBlock({title:'DRY nelle query — criteri riusabili nel Repository', content: CodeBlock({
  filename:'PostRepository.php',
  code:
`class PostRepository extends ServiceEntityRepository
{
    // Scope riusabile: visibile all'utente corrente
    private function visibleTo(QueryBuilder $qb, User $viewer): QueryBuilder
    {
        return $qb
            ->andWhere('p.isArchived = false')
            ->andWhere('author.isSuspended = false')
            ->andWhere(
                $qb->expr()->orX(
                    'author.isPrivate = false',
                    ':viewer MEMBER OF author.followers'
                )
            )
            ->setParameter('viewer', $viewer);
    }

    // Feed: riusa lo scope
    public function findFeedForUser(User $user, int $limit = 20): array
    {
        $qb = $this->createQueryBuilder('p')
            ->join('p.author', 'author')
            ->join('author.followers', 'f')
            ->andWhere('f = :user')
            ->setParameter('user', $user)
            ->orderBy('p.publishedAt', 'DESC')
            ->setMaxResults($limit);
        return $this->visibleTo($qb, $user)->getQuery()->getResult();
    }

    // Hashtag: riusa lo stesso scope
    public function findByHashtag(Hashtag $tag, User $viewer): array
    {
        $qb = $this->createQueryBuilder('p')
            ->join('p.author', 'author')
            ->join('p.hashtags', 'h')
            ->andWhere('h = :tag')
            ->setParameter('tag', $tag);
        return $this->visibleTo($qb, $viewer)->getQuery()->getResult();
    }
}`,
})})}`;
}

function ccComments() {
  return `
${Callout({type:'warn',title:'I commenti migliori spiegano il "perché", non il "cosa"',
  body:'Il "cosa" lo dice il codice. Il "perché" è logica di business che non si vede — regole Instagram, workaround, decisioni di design.'})}
${CompareGrid({
  badCode:
`// controlla se l'utente è l'autore
if ($post->getAuthor() === $currentUser) {
    // incrementa il contatore
    $count++;
    // salva nel database
    $this->em->flush();
}`,
  goodCode:
`// Instagram non permette di likarsi i propri post.
// L'API restituisce errore 400 cod.190 in quel caso.
// Gestiamo lato server per coerenza con le API mobile.
if ($post->getAuthor() === $currentUser) {
    throw new SelfLikeNotAllowedException();
}

// Workaround: ES non indicizza post con < 3 hashtag
// nell'explore feed (issue #412, ES bug pre-8.x).
// Rimuovere dopo upgrade a Elasticsearch 8.
if (count($post->getHashtags()) < self::MIN_HASHTAGS_FOR_EXPLORE) {
    $post->setExcludeFromExplore(true);
}`,
})}`;
}

function ccDTO() {
  return `
${Callout({type:'good',title:'DTO trasportano dati — Value Object incapsulano logica',
  body:'PublishPostDTO porta i dati grezzi dal Controller al Service. Servirà a validare i nostri dati in ingresso secondo le regole imposte da Instagram(dalla logica di business)'})}
${CompareGrid({
  badCode:
`// Array grezzi — nessuna garanzia
function publishPost(array $data, User $author): Post
{
    $caption = $data['caption'];   // null? troppo lungo?
    $media   = $data['media'];     // array o stringa?
    $lat     = $data['latitude'];  // undefined index?
}

publishPost([
    'caption' => null,    // ops
    'median'  => [...],   // typo silenzioso
], $user);`,
  goodCode:
`// DTO tipizzato con Symfony Validator
final class PublishPostDTO
{
    public function __construct(
        #[Assert\\NotBlank]
        #[Assert\\Length(max: 2200)]
        public readonly string $caption,

        #[Assert\\Count(min: 1, max: 10)]
        #[Assert\\All([new Assert\\File(mimeTypes: ['image/*','video/*'])])]
        public readonly array $mediaFiles,

        public readonly ?float $latitude  = null,
        public readonly ?float $longitude = null,

        #[Assert\\Count(max: 20)]
        public readonly array $taggedUserIds = [],
    ) {}
}`,
})}
${SectionBlock({title:'Caption — Value Object con logica Instagram', content: CodeBlock({
  filename:'Caption.php',
  code:
`final class Caption
{
    public const MAX_LENGTH   = 2200;
    public const MAX_HASHTAGS = 30;

    private function __construct(
        private readonly string $value,
    ) {}

    public static function fromString(string $raw): self
    {
        $trimmed = trim($raw);

        if (mb_strlen($trimmed) > self::MAX_LENGTH)
            throw new CaptionTooLongException(mb_strlen($trimmed));

        if (count(self::parseHashtags($trimmed)) > self::MAX_HASHTAGS)
            throw new TooManyHashtagsException();

        return new self($trimmed);
    }

    /** @return string[] — es: ['travel','sunset','photography'] */
    public function extractHashtags(): array
    {
        return self::parseHashtags($this->value);
    }

    /** @return string[] — es: ['natgeo','nasa'] */
    public function extractMentions(): array
    {
        preg_match_all('/@([\\w.]+)/', $this->value, $m);
        return $m[1];
    }

    public function preview(int $chars = 125): string
    {
        if (mb_strlen($this->value) <= $chars) return $this->value;
        return mb_substr($this->value, 0, $chars) . '… more';
    }

    public function __toString(): string { return $this->value; }

    private static function parseHashtags(string $text): array
    {
        preg_match_all('/#([\\w\\x{00C0}-\\x{024F}]+)/u', $text, $m);
        return array_unique(array_map('strtolower', $m[1]));
    }
}

// Nel Service — Caption porta la propria logica
$caption = Caption::fromString($dto->caption);
$post->setCaption($caption);
foreach ($caption->extractHashtags() as $tag) {
    $post->addHashtag($this->hashtagRepo->findOrCreate($tag));
}
foreach ($caption->extractMentions() as $username) {
    $post->addMention($this->userRepo->findByUsername($username));
}`,
})})}`;
}

function ccStructure() {
  return `
${Callout({type:'info',title:'Struttura ideale di un Service Symfony',
  body:'Costanti → costruttore con readonly DI → metodi pubblici → metodi privati. Niente logica nel costruttore, se non per esempio inizializzare o settare valori di default (es. uuid).'})}
${CodeBlock({
  filename:'PostService.php — struttura completa',
  code:
`<?php

declare(strict_types=1);

namespace App\\Service;

use App\\DTO\\PublishPostDTO;
use App\\Entity\\{Post, User, Like};
use App\\Event\\{PostPublishedEvent, PostLikedEvent, PostDeletedEvent};
use App\\Exception\\{PostNotFoundException, SelfLikeNotAllowedException};
use App\\Policy\\InteractionPolicy;
use App\\Repository\\{PostRepositoryInterface, LikeRepositoryInterface};
use Symfony\\Component\\EventDispatcher\\EventDispatcherInterface;

final class PostService
{
    // 1. Costanti di business
    public const FEED_DEFAULT_LIMIT = 20;
    public const FEED_MAX_LIMIT     = 50;

    // 2. Costruttore con DI — PHP 8.1 readonly
    public function __construct(
        private readonly PostRepositoryInterface  $postRepo,
        private readonly LikeRepositoryInterface  $likeRepo,
        private readonly PostFactory              $postFactory,
        private readonly InteractionPolicy        $policy,
        private readonly EventDispatcherInterface $dispatcher,
    ) {}

    // 3. Metodi pubblici
    public function publish(PublishPostDTO $dto, User $author): Post
    {
        $post = $this->postFactory->createFromDTO($dto, $author);
        $this->postRepo->save($post, flush: true);
        $this->dispatcher->dispatch(new PostPublishedEvent($post));
        return $post;
    }

    public function like(Post $post, User $user): void
    {
        $this->policy->assertCanInteract($user, $post);

        if ($post->getAuthor() === $user)
            throw new SelfLikeNotAllowedException();

        if ($this->likeRepo->exists($post, $user)) return;

        $like = new Like($post, $user);
        $this->likeRepo->save($like, flush: true);
        $this->dispatcher->dispatch(new PostLikedEvent($like));
    }

    public function unlike(Post $post, User $user): void
    {
        $like = $this->likeRepo->findByPostAndUser($post, $user);
        if (!$like) return;

        $this->likeRepo->delete($like, flush: true);
    }

    public function delete(Post $post, User $requestedBy): void
    {
        $this->policy->assertCanDelete($requestedBy, $post);
        $this->postRepo->delete($post, flush: true);
        $this->dispatcher->dispatch(new PostDeletedEvent($post));
    }

    public function findOrFail(int $id): Post
    {
        return $this->postRepo->findById($id)
            ?? throw new PostNotFoundException($id);
    }

    // 4. Metodi privati
    private function clampFeedLimit(int $requested): int
    {
        return min(max(1, $requested), self::FEED_MAX_LIMIT);
    }
}`,
})}`;
}
