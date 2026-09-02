import fs from "../../../core/src/fs/fs";
import App from "../App";
import { Role } from "../enums";
import PacketDataKeys from "../../../core/src/PacketDataKeys";

/*
  Avatar loading is shared by Friends / Ratings / ProfileInfo / Dashboard.

  Keep the queue FIFO because list rows are rendered top-to-bottom:
  the visible rows must load before rows farther down the list.

  We still keep the useful fixes:
  - default avatar ids (m1, w2, ...) use /default/<id>.jpg first;
  - PLAYER_OBJECT_ID is preferred over OBJECT_ID;
  - cache keys include both player identity and photo value;
  - failed remote images fall back to the local default avatar.
*/
type QueuedImageRequest = {
  url: string;
  resolve: (value: string | null) => void;
};

let activeRequests = 0;

/*
  Visible avatars get their own FIFO queue.
  It has priority over background retries / off-screen work, while the
  global concurrency limit still protects Safari from request flooding.
*/
const foregroundImageQueue: QueuedImageRequest[] = [];
const imageQueue: QueuedImageRequest[] = [];

/*
  Avatar CDN tuning.

  Five simultaneous requests made larger lists arrive in too many waves,
  especially when one dottap.com candidate was slow. Eight is still a modest
  cap for mobile Safari, but lets visible room/friends/rating avatars fill in
  noticeably faster.

  A dead/slow candidate now gives the next known avatar URL a chance after
  3 seconds instead of holding one queue slot for the full 5 seconds.
  Background retries remain unchanged, so a temporarily slow real avatar can
  still recover later without becoming a permanent placeholder.
*/
const MAX_CONCURRENT_REQUESTS = 8;
/*
  Lists and explicit profile/dashboard requests need different timeouts.

  In a large list, one broken/slow avatar must release its queue slot quickly
  so later players can load. An 8 second global timeout can let a handful of
  bad URLs occupy every shared slot and make the whole leaderboard feel slow.

  A clicked profile or the Dashboard is different: it bypasses the list queue,
  so it can afford to wait longer for a slow but valid dottap.com image.
*/
const IMAGE_TIMEOUT_MS = 3000;
const PRIORITY_IMAGE_TIMEOUT_MS = 8000;

/*
  Initial on-screen avatars must not be serialized behind our own 8-slot
  JavaScript queue.

  Safari already has its own HTTP/2 connection scheduler and cache. Let every
  initially requested avatar enter the browser network stack immediately, while
  keeping the old bounded queue only for background retries.

  This removes the previous "compromise":
  - a slow/broken avatar cannot occupy one of our slots and delay later users;
  - a slow but valid avatar is allowed enough time to finish;
  - retries still stay bounded and cannot flood the browser.
*/
const VISIBLE_IMAGE_TIMEOUT_MS = 12000;

const pendingUrlPromises =
  new Map<string, Promise<string | null>>();

const pendingVisibleUrlPromises =
  new Map<string, Promise<string | null>>();

const pendingAvatarPromises =
  new Map<string, Promise<string>>();

/*
  If a visible avatar temporarily fails, do not require the user to
  reopen a profile. Retry quietly in the background and push the real
  image into every duplicate <img> as soon as one attempt succeeds.
*/
const avatarRetryTimers =
  new Map<string, number>();

const avatarRetryAttempts =
  new Map<string, number>();

const AVATAR_RETRY_DELAYS =
  [700, 1800, 4500, 10000];

function processQueue() {
  while(
    (
      foregroundImageQueue.length > 0 ||
      imageQueue.length > 0
    ) &&
    activeRequests < MAX_CONCURRENT_REQUESTS
  ) {
    const request =
      foregroundImageQueue.shift() ??
      imageQueue.shift();

    if(!request)
      return;

    activeRequests++;

    const img = new Image();
    let finished = false;

    const finish = (
      result: string | null
    ) => {
      if(finished) return;

      finished = true;
      window.clearTimeout(timeoutId);

      img.onload = null;
      img.onerror = null;

      activeRequests--;
      request.resolve(result);

      processQueue();
    };

    const timeoutId = window.setTimeout(
      () => finish(null),
      IMAGE_TIMEOUT_MS
    );

    img.onload = () =>
      finish(request.url);

    img.onerror = () =>
      finish(null);

    img.src = request.url;
  }
}

function loadImageWithQueue(
  url: string,
  foreground = false
): Promise<string | null> {
  const existing =
    pendingUrlPromises.get(url);

  if(existing) {
    /*
      If the same URL was previously waiting as background work and has
      just become visible, promote that queued request instead of making
      the visible row wait behind background retries.
    */
    if(foreground) {
      const queuedIndex =
        imageQueue.findIndex(
          request =>
            request.url === url
        );

      if(queuedIndex >= 0) {
        const [request] =
          imageQueue.splice(
            queuedIndex,
            1
          );

        foregroundImageQueue.push(
          request
        );

        processQueue();
      }
    }

    return existing;
  }

  const promise =
    new Promise<string | null>(
      resolve => {
        const request = {
          url,
          resolve
        };

        if(foreground) {
          foregroundImageQueue.push(
            request
          );
        } else {
          imageQueue.push(
            request
          );
        }

        processQueue();
      }
    ).finally(() => {
      pendingUrlPromises.delete(url);
    });

  pendingUrlPromises.set(
    url,
    promise
  );

  return promise;
}

function normalizeValue(
  value: unknown
) {
  if(
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

/*
  When the same player's avatar appears in several places at once
  (for example: a Ratings row behind an opened ProfileInfo dialog),
  update every visible copy as soon as ANY request gets the real image.
*/
function syncAvatarElements(
  identity: string,
  src: string
) {
  if(
    !identity ||
    !src ||
    typeof document === "undefined"
  ) {
    return;
  }

  const images =
    document.querySelectorAll<HTMLImageElement>(
      "img[data-bafia-avatar-id]"
    );

  images.forEach(img => {
    if(
      img.dataset.bafiaAvatarId === identity &&
      img.src !== src
    ) {
      img.src = src;
    }
  });
}

function scheduleAvatarRetry(
  identity: string,
  cacheKey: string,
  candidates: string[]
) {
  if(
    !identity ||
    !candidates.length ||
    App.resources[cacheKey]
  ) {
    return;
  }

  if(avatarRetryTimers.has(cacheKey)) {
    return;
  }

  const attempt =
    avatarRetryAttempts.get(cacheKey) ?? 0;

  if(attempt >= AVATAR_RETRY_DELAYS.length) {
    return;
  }

  const delay =
    AVATAR_RETRY_DELAYS[attempt];

  const timerId =
    window.setTimeout(
      async () => {
        avatarRetryTimers.delete(cacheKey);

        /*
          The avatar may have loaded through ProfileInfo while this
          retry was waiting.
        */
        const alreadyLoaded =
          App.resources[cacheKey];

        if(
          alreadyLoaded &&
          !String(alreadyLoaded).startsWith("data:")
        ) {
          syncAvatarElements(
            identity,
            alreadyLoaded
          );

          avatarRetryAttempts.delete(
            cacheKey
          );

          return;
        }

        avatarRetryAttempts.set(
          cacheKey,
          attempt + 1
        );

        for(const url of candidates) {
          const loaded =
            await loadImageWithQueue(url);

          if(!loaded)
            continue;

          App.resources[cacheKey] =
            loaded;

          syncAvatarElements(
            identity,
            loaded
          );

          avatarRetryAttempts.delete(
            cacheKey
          );

          return;
        }

        /*
          Still unavailable: schedule the next, more relaxed retry.
          The current <img> keeps showing the local placeholder.
        */
        scheduleAvatarRetry(
          identity,
          cacheKey,
          candidates
        );
      },
      delay
    );

  avatarRetryTimers.set(
    cacheKey,
    timerId
  );
}

function isDefaultPhotoId(
  photo: string
) {
  /*
    Official default-photo ids are values such as m1 / w1.
    Dashboard itself loads them from:
      /mafia/profile_photo/default/<id>.jpg
  */
  return /^[mw]\d+$/i.test(photo);
}

function addCandidate(
  list: string[],
  url: string
) {
  if(
    url &&
    !list.includes(url)
  ) {
    list.push(url);
  }
}

export type AvatarLoadOptions = {
  /*
    Priority = explicit profile/dashboard request.
    It bypasses all list queues and starts immediately.
  */
  priority?: boolean;

  /*
    Foreground = visible/near-visible list row.
    It stays concurrency-limited, but jumps ahead of background retries.
  */
  foreground?: boolean;
};

function loadImageDirect(
  url: string,
  timeoutMs = 5000
): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    let finished = false;

    const finish = (
      result: string | null
    ) => {
      if(finished) return;

      finished = true;
      window.clearTimeout(timeoutId);

      img.onload = null;
      img.onerror = null;

      resolve(result);
    };

    const timeoutId =
      window.setTimeout(
        () => finish(null),
        timeoutMs
      );

    img.onload = () =>
      finish(url);

    img.onerror = () =>
      finish(null);

    img.src = url;
  });
}

/*
  Shared immediate loader for avatars that are requested by a real screen.

  The exact same URL is still deduplicated, so Dashboard/Profile/Room/Rating
  cannot accidentally start duplicate preloads for one URL at the same time.
*/
function loadVisibleImage(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  const existing =
    pendingVisibleUrlPromises.get(url);

  if(existing)
    return existing;

  const promise =
    loadImageDirect(
      url,
      timeoutMs
    ).finally(() => {
      pendingVisibleUrlPromises.delete(
        url
      );
    });

  pendingVisibleUrlPromises.set(
    url,
    promise
  );

  return promise;
}

/*
  Custom uploaded avatars have two already-known valid lookup forms:
    1) /profile_photo/<photo>
    2) /profile_photo/<playerObjectId>?v=<photo>

  Waiting for the first route to time out before trying the second makes a
  single slow CDN/backend path add seconds of visible placeholder time.

  Use a small "hedge": start the normal photo URL first, and only if it has not
  finished quickly, start the player-id URL as well. The first successful one
  wins. Fast primary requests therefore stay one-request-only; slow ones no
  longer block the useful fallback for several seconds.
*/
const AVATAR_HEDGE_DELAY_MS = 350;

function loadAvatarUrl(
  url: string,
  options: AvatarLoadOptions
) {
  /*
    Every call reaching this function belongs to a currently requested screen
    avatar. Start it immediately and let Safari schedule/cache the HTTP work.

    scheduleAvatarRetry() intentionally does NOT use this function: retries
    continue through loadImageWithQueue(), so failed avatars cannot create an
    uncontrolled background request storm.
  */
  return loadVisibleImage(
    url,
    options.priority
      ? PRIORITY_IMAGE_TIMEOUT_MS
      : VISIBLE_IMAGE_TIMEOUT_MS
  );
}

function loadHedgedAvatarPair(
  primaryUrl: string,
  secondaryUrl: string,
  options: AvatarLoadOptions
): Promise<string | null> {
  return new Promise(resolve => {
    let finished = false;
    let primaryFinished = false;
    let secondaryStarted = false;
    let secondaryFinished = false;

    const maybeFinishEmpty = () => {
      if(
        !finished &&
        primaryFinished &&
        secondaryStarted &&
        secondaryFinished
      ) {
        finished = true;
        resolve(null);
      }
    };

    const accept = (
      result: string | null,
      source: "primary" | "secondary"
    ) => {
      if(source === "primary") {
        primaryFinished = true;
      } else {
        secondaryFinished = true;
      }

      if(finished)
        return;

      if(result) {
        finished = true;
        resolve(result);
        return;
      }

      /*
        If the primary failed outright, do not wait for the hedge timer.
        Start the known player-id form immediately.
      */
      if(
        source === "primary" &&
        !secondaryStarted
      ) {
        startSecondary();
        return;
      }

      maybeFinishEmpty();
    };

    const startSecondary = () => {
      if(
        finished ||
        secondaryStarted
      ) {
        return;
      }

      secondaryStarted = true;

      void loadAvatarUrl(
        secondaryUrl,
        options
      ).then(result =>
        accept(
          result,
          "secondary"
        )
      );
    };

    void loadAvatarUrl(
      primaryUrl,
      options
    ).then(result =>
      accept(
        result,
        "primary"
      )
    );

    window.setTimeout(
      startSecondary,
      AVATAR_HEDGE_DELAY_MS
    );
  });
}

export async function getAvatarImg(
  user?: any,
  options: AvatarLoadOptions = {}
): Promise<string> {
  if(user == 'Бармен')
    return App.resources['barmanChat'];

  if(user == 'Информатор')
    return App.resources['unknownChat'];

  if(user == 'Мафия')
    return App.resources['mafiaChat'];

  if(
    !user ||
    typeof user == 'string'
  ) {
    return (
      App.resources['unknownChat'] ??
      await getDefaultAvatar()
    );
  }

  const photo = normalizeValue(
    user[PacketDataKeys.PHOTO] ??
    user.photo
  );

  /*
    IMPORTANT:
    PLAYER_OBJECT_ID must win over OBJECT_ID.
    Profile/Friends packets can contain both, and the photo endpoint
    is associated with the public/player id used by ProfileInfo.
  */
  const playerObjectId =
    normalizeValue(
      user[PacketDataKeys.PLAYER_OBJECT_ID] ??
      user.playerObjectId ??
      user.puo
    );

  const objectId =
    normalizeValue(
      user[PacketDataKeys.OBJECT_ID] ??
      user.objectId
    );

  /*
    Include both id and photo version in the key.
    Users with an empty/same photo value must not share one cache entry.
  */
  const identity =
    playerObjectId ||
    objectId ||
    "unknown";

  const cacheKey =
    `avatars_${identity}_${photo || "no-photo"}`;

  const cached =
    App.resources[cacheKey];

  /*
    Real remote avatars are cached here.
    If an older build left a local data: fallback in this cache,
    priority mode ignores it and retries the real image immediately.
  */
  if(
    cached &&
    !(
      options.priority &&
      String(cached).startsWith("data:")
    )
  ) {
    syncAvatarElements(
      identity,
      cached
    );

    return cached;
  }

  const pendingKey =
    `${identity}|${photo}`;

  const existing =
    pendingAvatarPromises.get(
      pendingKey
    );

  /*
    A profile click must not inherit a queued request from Ratings.
    Priority mode starts its own immediate request.
  */
  if(
    existing &&
    !options.priority
  ) {
    return existing;
  }

  const avatarPromise =
    (async () => {
      const candidates: string[] = [];

      if(
        photo.startsWith("http://") ||
        photo.startsWith("https://") ||
        photo.startsWith("data:")
      ) {
        addCandidate(
          candidates,
          photo
        );
      } else {
        /*
          Default game photos have their OWN endpoint.
          Trying this first removes the long broken-image delay
          for m1/w1-style avatars.
        */
        if(
          photo &&
          isDefaultPhotoId(photo)
        ) {
          addCandidate(
            candidates,
            `https://dottap.com/mafia/profile_photo/default/${encodeURIComponent(photo)}.jpg`
          );
        }

        if(photo) {
          addCandidate(
            candidates,
            `https://dottap.com/mafia/profile_photo/${encodeURIComponent(photo)}`
          );
        }

        /*
          Stable cache-buster: when "ph" changes the URL changes,
          but repeated renders of the same avatar remain browser-cacheable.
        */
        const version =
          photo
            ? `?v=${encodeURIComponent(photo)}`
            : "";

        if(playerObjectId) {
          addCandidate(
            candidates,
            `https://dottap.com/mafia/profile_photo/${encodeURIComponent(playerObjectId)}${version}`
          );
        }

        /*
          Some older packets only expose OBJECT_ID.
          Keep it as the final remote fallback, but never prefer it
          over PLAYER_OBJECT_ID.
        */
        if(
          objectId &&
          objectId !== playerObjectId
        ) {
          addCandidate(
            candidates,
            `https://dottap.com/mafia/profile_photo/${encodeURIComponent(objectId)}${version}`
          );
        }
      }

      const acceptLoadedAvatar = (
        loaded: string | null
      ) => {
        if(!loaded)
          return null;

        App.resources[cacheKey] =
          loaded;

        const retryTimer =
          avatarRetryTimers.get(
            cacheKey
          );

        if(retryTimer !== undefined) {
          window.clearTimeout(
            retryTimer
          );

          avatarRetryTimers.delete(
            cacheKey
          );
        }

        avatarRetryAttempts.delete(
          cacheKey
        );

        syncAvatarElements(
          identity,
          loaded
        );

        return loaded;
      };

      /*
        Only hedge ordinary uploaded-photo ids.

        Default m1/w1-style avatars already have a dedicated fast endpoint, while
        absolute/data URLs are already exact and need no alternate request.
      */
      const canHedgeCustomAvatar =
        Boolean(
          photo &&
          !isDefaultPhotoId(photo) &&
          !photo.startsWith("http://") &&
          !photo.startsWith("https://") &&
          !photo.startsWith("data:") &&
          playerObjectId &&
          candidates.length >= 2
        );

      let nextCandidateIndex = 0;

      if(canHedgeCustomAvatar) {
        const hedgedLoaded =
          await loadHedgedAvatarPair(
            candidates[0],
            candidates[1],
            options
          );

        const accepted =
          acceptLoadedAvatar(
            hedgedLoaded
          );

        if(accepted)
          return accepted;

        /*
          The first two known forms both failed. Continue only with the older
          OBJECT_ID fallback, if this packet actually supplied one.
        */
        nextCandidateIndex = 2;
      }

      for(
        let i = nextCandidateIndex;
        i < candidates.length;
        i++
      ) {
        const loaded =
          await loadAvatarUrl(
            candidates[i],
            options
          );

        const accepted =
          acceptLoadedAvatar(
            loaded
          );

        if(accepted)
          return accepted;

        /*
          Another request for the same player may have finished while
          this queued request was waiting. Reuse it instead of continuing
          toward a fallback that could overwrite the visible real image.
        */
        const siblingLoaded =
          App.resources[cacheKey];

        if(
          siblingLoaded &&
          !String(siblingLoaded).startsWith("data:")
        ) {
          syncAvatarElements(
            identity,
            siblingLoaded
          );

          return siblingLoaded;
        }
      }

      /*
        Do NOT store the local fallback under the player's real-avatar key.
        Otherwise a temporary CDN failure becomes permanent until refresh.

        For normal list loads, return the local placeholder immediately
        BUT keep retrying the real remote photo in the background.
        When it eventually succeeds, syncAvatarElements() replaces the
        placeholder in-place — no profile click / refresh is required.
      */
      /*
        Priority requests (Dashboard / explicitly opened ProfileInfo) must also
        recover from a temporary dottap.com failure. Previously they tried each
        URL once and then stayed on the local placeholder until the screen/photo
        key changed, while ordinary list avatars kept retrying in background.

        Use the same shared retry scheduler for both paths. It remains
        deduplicated by cacheKey and still goes through the bounded image queue.
      */
      scheduleAvatarRetry(
        identity,
        cacheKey,
        candidates
      );

      const fallback =
        await getDefaultAvatar();

      /*
        A parallel priority request may have completed while the local
        fallback was being resolved. Prefer the real cached image.
      */
      const loadedMeanwhile =
        App.resources[cacheKey];

      if(
        loadedMeanwhile &&
        !String(loadedMeanwhile).startsWith("data:")
      ) {
        syncAvatarElements(
          identity,
          loadedMeanwhile
        );

        return loadedMeanwhile;
      }

      return fallback;
    })().finally(() => {
      if(!options.priority) {
        pendingAvatarPromises.delete(
          pendingKey
        );
      }
    });

  if(!options.priority) {
    pendingAvatarPromises.set(
      pendingKey,
      avatarPromise
    );
  }

  return avatarPromise;
}

export async function getDefaultAvatar(
  ph = ""
) {
  /*
    The local fallback image is identical for every missing avatar,
    so cache one copy instead of loading the same file once per "ph".
  */
  const cacheKey =
    "defaultAvatar_local";

  if(App.resources[cacheKey]) {
    return App.resources[cacheKey];
  }

  App.resources[cacheKey] =
    await fs.loadImageAsDataURL(
      `${App.config.path}/assets/textures/logo/avatar.jpg`
    );

  return App.resources[cacheKey];
}

export async function getRoleImg(role: Role){
  if(App.resources[`role_${role}`]) return App.resources[`role_${role}`];
  App.resources[`role_${role}`] = await fs.loadImageAsDataURL(`${App.config.path}/assets/textures/roles/${role}.png`);
  return App.resources[`role_${role}`];
}
export async function getBackgroundImg(bg: string){
  if(App.resources[`background_${bg}`]) return App.resources[`background_${bg}`]
  App.resources[`background_${bg}`] = await fs.loadImageAsDataURL(`${App.config.path}/assets/textures/backgrounds/${bg}.png`);
  return App.resources[`background_${bg}`]
}
export async function getTexture(path: string){
  if(App.resources[`assets/textures/`+path]) return App.resources[`assets/textures/`+path]
  App.resources[`assets/textures/`+path] = await fs.loadImageAsDataURL(`${App.config.path}/assets/textures/${path}`);
  return App.resources[`assets/textures/`+path];
}
export async function getImage(path: string){
  if(App.resources[path]) return App.resources[path];
  App.resources[path] = await fs.loadImageAsDataURL(`${App.config.path}/${path}`);
  return App.resources[path];
}
