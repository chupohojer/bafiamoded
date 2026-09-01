const PUSH_STATE_CACHE =
  'bafia-push-state-v1';

const PUSH_STATE_URL =
  new URL(
    './__bafia_push_state__',
    self.registration.scope
  ).toString();

const PUSH_CONVERSATION_CACHE =
  'bafia-push-conversations-v1';

/*
  Burst pushes from the same person are serialized inside one SW lifetime.
  This is important when 2-3 FCM pushes arrive almost simultaneously: without
  it they open several Mafia WebSockets at once and race for the same pcmsr.
*/
const conversationJobs =
  new Map();

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async() => {
      const keys =
        await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key.startsWith(
                'bafia-'
              ) &&
              key !==
                PUSH_STATE_CACHE &&
              key !==
                PUSH_CONVERSATION_CACHE
          )
          .map(
            key =>
              caches.delete(key)
          )
      );

      await self.clients.claim();
    })()
  );
});

/*
  Deliberately NO fetch event handler.
  Avatars and normal game networking stay completely outside the SW.
*/

async function savePushSessionState(
  value
) {
  if(
    !value ||
    typeof value !== 'object'
  ) {
    return;
  }

  const state = {
    serverUrl:
      String(
        value.serverUrl ??
        ''
      ).trim(),
    userObjectId:
      String(
        value.userObjectId ??
        ''
      ).trim(),
    token:
      String(
        value.token ??
        ''
      ).trim(),
    playerObjectId:
      String(
        value.playerObjectId ??
        ''
      ).trim()
  };

  if(
    !state.serverUrl ||
    !state.userObjectId ||
    !state.token
  ) {
    return;
  }

  const cache =
    await caches.open(
      PUSH_STATE_CACHE
    );

  await cache.put(
    PUSH_STATE_URL,
    new Response(
      JSON.stringify(state),
      {
        headers: {
          'content-type':
            'application/json'
        }
      }
    )
  );
}

async function loadPushSessionState() {
  try {
    const cache =
      await caches.open(
        PUSH_STATE_CACHE
      );

    const response =
      await cache.match(
        PUSH_STATE_URL
      );

    if(!response)
      return null;

    const value =
      await response.json();

    if(
      !value?.serverUrl ||
      !value?.userObjectId ||
      !value?.token
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

self.addEventListener(
  'message',
  event => {
    if(
      event.data?.type !==
        'bafia-push-session-state'
    ) {
      return;
    }

    event.waitUntil(
      savePushSessionState(
        event.data?.data
      )
    );
  }
);

function cleanText(value) {
  return String(
    value ??
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCreated(value) {
  const number =
    Number(value);

  if(
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return 0;
  }

  /*
    Server builds have historically used both seconds and milliseconds.
  */
  return number < 100000000000
    ? number * 1000
    : number;
}

function privateChatFriendshipFromDeeplink(
  rawValue
) {
  const raw =
    cleanText(rawValue);

  if(!raw)
    return '';

  try {
    const url =
      new URL(raw);

    const segments =
      url.pathname
        .split('/')
        .filter(Boolean)
        .map(segment => {
          try {
            return decodeURIComponent(
              segment
            );
          } catch {
            return segment;
          }
        });

    if(
      url.hostname ===
        'private_chat' &&
      segments[0]
    ) {
      return String(
        segments[0]
      );
    }

    const index =
      segments.findIndex(
        segment =>
          segment ===
            'private_chat'
      );

    if(
      index >= 0 &&
      segments[index + 1]
    ) {
      return String(
        segments[index + 1]
      );
    }
  } catch {}

  const match =
    raw.match(
      /(?:^|[/:])private_chat[/:]([^/?#]+)/i
    );

  if(!match?.[1])
    return '';

  try {
    return decodeURIComponent(
      match[1]
    );
  } catch {
    return match[1];
  }
}

function privateChatFriendshipFromPush(
  data,
  notification
) {
  const deeplinkUri =
    data?.deeplinkUri ??
    notification?.click_action ??
    '';

  const fromDeeplink =
    privateChatFriendshipFromDeeplink(
      deeplinkUri
    );

  if(fromDeeplink)
    return fromDeeplink;

  const group =
    cleanText(
      data?.notificationGroup
    );

  const groupMatch =
    group.match(
      /^private_chat[_:/-](.+)$/i
    );

  return groupMatch?.[1]
    ? cleanText(groupMatch[1])
    : '';
}

function conversationStateUrl(
  friendship
) {
  const url =
    new URL(
      './__bafia_push_conversation__',
      self.registration.scope
    );

  url.searchParams.set(
    'friendship',
    friendship
  );

  return url.toString();
}

async function loadConversationState(
  friendship
) {
  try {
    const cache =
      await caches.open(
        PUSH_CONVERSATION_CACHE
      );

    const response =
      await cache.match(
        conversationStateUrl(
          friendship
        )
      );

    if(!response)
      return {
        seen: [],
        lines: [],
        pending: [],
        lastCreated: 0,
        updatedAt: 0
      };

    const value =
      await response.json();

    return {
      seen:
        Array.isArray(value?.seen)
          ? value.seen
              .map(cleanText)
              .filter(Boolean)
              .slice(-120)
          : [],

      lines:
        Array.isArray(value?.lines)
          ? value.lines
              .map(cleanText)
              .filter(Boolean)
              .slice(-4)
          : [],

      pending:
        Array.isArray(value?.pending)
          ? value.pending
              .filter(
                item =>
                  item &&
                  typeof item === 'object'
              )
              .map(
                item => ({
                  key:
                    cleanText(
                      item.key
                    ),
                  text:
                    cleanText(
                      item.text
                    ),
                  created:
                    Number(
                      item.created
                    ) || 0
                })
              )
              .filter(
                item =>
                  item.key &&
                  item.text
              )
              .slice(-20)
          : [],

      lastCreated:
        Number(
          value?.lastCreated
        ) || 0,

      updatedAt:
        Number(
          value?.updatedAt
        ) || 0
    };
  } catch {
    return {
      seen: [],
      lines: [],
      pending: [],
      lastCreated: 0,
      updatedAt: 0
    };
  }
}

async function saveConversationState(
  friendship,
  state
) {
  try {
    const cache =
      await caches.open(
        PUSH_CONVERSATION_CACHE
      );

    await cache.put(
      conversationStateUrl(
        friendship
      ),
      new Response(
        JSON.stringify({
          seen:
            Array.isArray(state?.seen)
              ? state.seen.slice(-120)
              : [],
          lines:
            Array.isArray(state?.lines)
              ? state.lines.slice(-4)
              : [],
          pending:
            Array.isArray(state?.pending)
              ? state.pending.slice(-20)
              : [],
          lastCreated:
            Number(
              state?.lastCreated
            ) || 0,
          updatedAt:
            Date.now()
        }),
        {
          headers: {
            'content-type':
              'application/json'
          }
        }
      )
    );
  } catch {}
}

async function clearConversationState(
  friendship
) {
  if(!friendship)
    return;

  try {
    const cache =
      await caches.open(
        PUSH_CONVERSATION_CACHE
      );

    await cache.delete(
      conversationStateUrl(
        friendship
      )
    );
  } catch {}
}

function messageSnapshotFromPacket(
  packet,
  ownPlayerObjectId
) {
  const messages =
    Array.isArray(packet?.ms)
      ? packet.ms
      : (
          Array.isArray(packet?.pcmsr?.ms)
            ? packet.pcmsr.ms
            : []
        );

  const ownId =
    cleanText(
      ownPlayerObjectId
    );

  const result = [];

  for(
    let index = 0;
    index < messages.length;
    index++
  ) {
    const message =
      messages[index];

    if(
      !message ||
      typeof message !== 'object'
    ) {
      continue;
    }

    const senderId =
      cleanText(
        message.puo
      );

    if(
      ownId &&
      senderId &&
      senderId === ownId
    ) {
      continue;
    }

    const text =
      message.mstk
        ? 'Стикер'
        : cleanText(
            message.tx
          );

    if(!text)
      continue;

    const id =
      cleanText(
        message.o
      );

    const created =
      normalizeCreated(
        message.c
      );

    const key =
      id ||
      [
        senderId,
        String(created),
        text
      ].join('|');

    result.push({
      key,
      text:
        text.length > 220
          ? `${text.slice(0, 217)}…`
          : text,
      created,
      order:
        index
    });
  }

  /*
    Preserve the server order, but timestamps help if one build happens to
    return the list in another order.
  */
  result.sort(
    (a, b) => {
      if(
        a.created &&
        b.created &&
        a.created !== b.created
      ) {
        return (
          a.created -
          b.created
        );
      }

      return (
        a.order -
        b.order
      );
    }
  );

  return result;
}

async function fetchPrivateMessageSnapshotOnce(
  friendship,
  timeoutMs = 4200
) {
  const state =
    await loadPushSessionState();

  if(
    !state ||
    !friendship ||
    typeof WebSocket ===
      'undefined'
  ) {
    return {
      ok: false,
      messages: []
    };
  }

  return new Promise(resolve => {
    let socket;
    let finished = false;

    const finish =
      (
        ok,
        messages = []
      ) => {
        if(finished)
          return;

        finished = true;
        clearTimeout(timer);

        try {
          socket?.close();
        } catch {}

        resolve({
          ok,
          messages
        });
      };

    const timer =
      setTimeout(
        () =>
          finish(
            false,
            []
          ),
        timeoutMs
      );

    try {
      socket =
        new WebSocket(
          String(
            state.serverUrl
          )
        );
    } catch {
      finish(false, []);
      return;
    }

    socket.addEventListener(
      'open',
      () => {
        try {
          socket.send(
            JSON.stringify({
              ty:
                'acpc',
              t:
                state.token,
              uo:
                state.userObjectId,
              fp:
                friendship
            })
          );
        } catch {
          finish(false, []);
        }
      }
    );

    socket.addEventListener(
      'message',
      event => {
        let packet;

        try {
          packet =
            JSON.parse(
              event.data
            );
        } catch {
          return;
        }

        if(
          packet?.ty !==
            'pcmsr'
        ) {
          return;
        }

        finish(
          true,
          messageSnapshotFromPacket(
            packet,
            state.playerObjectId
          )
        );
      }
    );

    socket.addEventListener(
      'error',
      () =>
        finish(
          false,
          []
        )
    );

    socket.addEventListener(
      'close',
      () =>
        finish(
          false,
          []
        )
    );
  });
}

async function fetchPrivateMessageSnapshot(
  friendship
) {
  const first =
    await fetchPrivateMessageSnapshotOnce(
      friendship,
      4200
    );

  if(first.ok)
    return first;

  /*
    A rapid burst used to fail selectively because several short-lived sockets
    raced each other. Jobs are serialized now, and one small retry gives a
    suspended iPhone another chance if the first socket woke too early.
  */
  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        250
      )
  );

  return fetchPrivateMessageSnapshotOnce(
    friendship,
    4200
  );
}

function groupedBody(
  lines,
  fallback
) {
  const normalized =
    Array.isArray(lines)
      ? lines
          .map(cleanText)
          .filter(Boolean)
          .slice(-4)
      : [];

  return normalized.length
    ? normalized.join('\n')
    : cleanText(
        fallback
      );
}

async function notificationIsActive(
  tag
) {
  try {
    const notifications =
      await self.registration.getNotifications({
        tag
      });

    return (
      notifications.length >
      0
    );
  } catch {
    return false;
  }
}

async function handlePrivatePush(
  {
    data,
    notification,
    title,
    genericBody,
    deeplinkUri,
    friendship
  }
) {
  /*
    IMPORTANT FOR iOS:
    WebKit currently does not coalesce notifications by Notification.tag.
    Calling showNotification() twice for one push therefore creates TWO cards
    on the lock screen.

    So this handler now calls showNotification EXACTLY ONCE per push.
    We spend a short, bounded amount of time trying to resolve the real text;
    if that fails, the same push still produces the generic official body.
  */

  let state =
    await loadConversationState(
      friendship
    );

  if(
    !Array.isArray(
      state.pending
    )
  ) {
    state.pending = [];
  }

  const snapshotResult =
    await fetchPrivateMessageSnapshotOnce(
      friendship,
      1800
    );

  if(snapshotResult.ok) {
    const snapshot =
      snapshotResult.messages;

    const seen =
      new Set(
        state.seen
      );

    let unseen = [];

    if(seen.size > 0) {
      unseen =
        snapshot.filter(
          message =>
            !seen.has(
              message.key
            )
        );
    } else {
      /*
        First successful fetch after installing/updating the worker:
        do not dump old chat history into notifications.
      */
      const recentThreshold =
        Date.now() -
        30_000;

      const recent =
        snapshot.filter(
          message =>
            message.created &&
            message.created >=
              recentThreshold
        );

      unseen =
        recent.length
          ? recent
          : snapshot.slice(-1);
    }

    /*
      Add all newly discovered messages to a persistent FIFO queue.

      Example:
        three FCM pushes arrive very fast;
        the first pcmsr already contains messages A/B/C;
        first push consumes A,
        second push consumes B,
        third push consumes C.

      This is much more deterministic than showing the whole history on every
      notification.
    */
    const pendingKeys =
      new Set(
        state.pending.map(
          item =>
            cleanText(
              item?.key
            )
        )
      );

    for(const message of unseen) {
      if(
        !message?.key ||
        pendingKeys.has(
          message.key
        )
      ) {
        continue;
      }

      state.pending.push({
        key:
          message.key,
        text:
          message.text,
        created:
          message.created || 0
      });

      pendingKeys.add(
        message.key
      );
    }

    state.pending =
      state.pending
        .filter(
          item =>
            cleanText(
              item?.text
            )
        )
        .slice(-20);

    state.seen =
      snapshot
        .map(
          message =>
            message.key
        )
        .filter(Boolean)
        .slice(-120);

    state.lastCreated =
      snapshot.reduce(
        (
          max,
          message
        ) =>
          Math.max(
            max,
            message.created || 0
          ),
        state.lastCreated || 0
      );
  }

  /*
    Consume one real message for THIS push.
    If the short background WebSocket did not resolve in time, keep the
    official generic body instead of risking a missing notification.
  */
  const queuedMessage =
    state.pending.length
      ? state.pending.shift()
      : null;

  await saveConversationState(
    friendship,
    state
  );

  const body =
    cleanText(
      queuedMessage?.text
    ) ||
    genericBody ||
    'Новое личное сообщение';

  const notificationData = {
    kind:
      'bafia-official-push',
    friendship,
    deeplinkUri:
      deeplinkUri
        ? String(deeplinkUri)
        : undefined,
    raw:
      data
  };

  await self.registration.showNotification(
    title,
    {
      body,
      icon:
        './splash_screens/icon.png',

      /*
        Keep a stable tag for browsers that DO implement replacement.
        iOS currently keeps separate cards despite the same tag.
      */
      tag:
        `bafia-private-${friendship}`,

      data:
        notificationData
    }
  );
}

function parsePushPayload(
  event
) {
  let payload = {};

  try {
    payload =
      event.data
        ? event.data.json()
        : {};
  } catch {
    try {
      payload = {
        body:
          event.data
            ? event.data.text()
            : ''
      };
    } catch {
      payload = {};
    }
  }

  const data =
    (
      payload &&
      typeof payload ===
        'object' &&
      payload.data &&
      typeof payload.data ===
        'object'
    )
      ? payload.data
      : payload;

  const notification =
    (
      payload &&
      typeof payload ===
        'object' &&
      payload.notification &&
      typeof payload.notification ===
        'object'
    )
      ? payload.notification
      : {};

  const title =
    cleanText(
      data?.title ??
      notification?.title ??
      'Новое личное сообщение'
    ) ||
    'Новое личное сообщение';

  const genericBody =
    cleanText(
      data?.body ??
      notification?.body ??
      'Вам написали в Бафии'
    ) ||
    'Новое личное сообщение';

  const deeplinkUri =
    data?.deeplinkUri ??
    notification?.click_action ??
    '';

  const friendship =
    privateChatFriendshipFromPush(
      data,
      notification
    );

  return {
    data,
    notification,
    title,
    genericBody,
    deeplinkUri,
    friendship
  };
}

self.addEventListener(
  'push',
  event => {
    const parsed =
      parsePushPayload(
        event
      );

    if(!parsed.friendship) {
      const notificationId =
        cleanText(
          parsed.data?.notificationId
        );

      event.waitUntil(
        self.registration.showNotification(
          parsed.title,
          {
            body:
              parsed.genericBody,
            icon:
              './splash_screens/icon.png',
            tag:
              notificationId
                ? `bafia-official-${notificationId}`
                : 'bafia-official-message',
            data: {
              kind:
                'bafia-official-push',
              deeplinkUri:
                parsed.deeplinkUri
                  ? String(
                      parsed.deeplinkUri
                    )
                  : undefined,
              raw:
                parsed.data
            }
          }
        )
      );

      return;
    }

    const key =
      parsed.friendship;

    const previous =
      conversationJobs.get(
        key
      ) ??
      Promise.resolve();

    const job =
      previous
        .catch(() => {})
        .then(
          () =>
            handlePrivatePush(
              parsed
            )
        )
        .finally(
          () => {
            if(
              conversationJobs.get(
                key
              ) === job
            ) {
              conversationJobs.delete(
                key
              );
            }
          }
        );

    conversationJobs.set(
      key,
      job
    );

    event.waitUntil(
      job
    );
  }
);

self.addEventListener(
  'notificationclick',
  event => {
    event.notification.close();

    const notificationData =
      event.notification.data ||
      {};

    event.waitUntil(
      (async() => {
        const friendship =
          cleanText(
            notificationData?.friendship
          );

        if(friendship) {
          await clearConversationState(
            friendship
          );
        }

        const windows =
          await self.clients.matchAll({
            type:
              'window',
            includeUncontrolled:
              true
          });

        for(
          const client of
          windows
        ) {
          if(
            'focus' in client
          ) {
            await client.focus();

            client.postMessage({
              type:
                'bafia-notification-click',
              data:
                notificationData
            });

            return;
          }
        }

        if(
          self.clients.openWindow
        ) {
          const deeplinkUri =
            notificationData?.deeplinkUri ??
            notificationData?.raw?.deeplinkUri ??
            '';

          if(deeplinkUri) {
            const params =
              new URLSearchParams();

            params.set(
              'bafiaPushDeeplink',
              String(
                deeplinkUri
              )
            );

            await self.clients.openWindow(
              `./?${params.toString()}`
            );

            return;
          }

          await self.clients.openWindow(
            './'
          );
        }
      })()
    );
  }
);
