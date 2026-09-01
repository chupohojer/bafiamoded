const PUSH_STATE_CACHE =
  'bafia-push-state-v1';

const PUSH_STATE_URL =
  new URL(
    './__bafia_push_state__',
    self.registration.scope
  ).toString();

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
            (key) =>
              key.startsWith(
                'bafia-'
              ) &&
              key !==
                PUSH_STATE_CACHE
          )
          .map(
            (key) =>
              caches.delete(key)
          )
      );

      await self.clients.claim();
    })()
  );
});

/*
  IMPORTANT:
  There is deliberately NO fetch event handler here.
  Avatars and normal game networking are never intercepted.
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
  (event) => {
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

    /*
      Handles e.g. mafia://private_chat/<friendshipId>
      where `private_chat` becomes the URL host rather than a path segment.
    */
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
  } catch {
    /* custom/odd URI fallback below */
  }

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

  /*
    Small fallback for official grouping strings such as
    private_chat_<friendshipId>, if the server ever omits deeplinkUri.
  */
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

function latestIncomingMessageBody(
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

  if(!messages.length)
    return '';

  const ownId =
    cleanText(
      ownPlayerObjectId
    );

  for(
    let index = messages.length - 1;
    index >= 0;
    index--
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

    if(message.mstk)
      return 'Стикер';

    const text =
      cleanText(
        message.tx
      );

    if(!text)
      continue;

    return text.length > 220
      ? `${text.slice(0, 217)}…`
      : text;
  }

  return '';
}

async function fetchLatestPrivateMessageBody(
  friendship
) {
  const state =
    await loadPushSessionState();

  if(
    !state ||
    !friendship ||
    typeof WebSocket ===
      'undefined'
  ) {
    return '';
  }

  return new Promise(resolve => {
    let socket;
    let finished = false;

    const finish =
      (value = '') => {
        if(finished)
          return;

        finished = true;
        clearTimeout(timer);

        try {
          socket?.close();
        } catch {}

        resolve(
          cleanText(value)
        );
      };

    /*
      Keep this short. The generic notification has ALREADY been shown before
      this helper is called, so a slow/unsupported socket can never suppress
      lock-screen delivery.
    */
    const timer =
      setTimeout(
        () => finish(''),
        2800
      );

    try {
      socket =
        new WebSocket(
          String(
            state.serverUrl
          )
        );
    } catch {
      finish('');
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
          finish('');
        }
      }
    );

    socket.addEventListener(
      'message',
      (event) => {
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
          latestIncomingMessageBody(
            packet,
            state.playerObjectId
          )
        );
      }
    );

    socket.addEventListener(
      'error',
      () => finish('')
    );

    socket.addEventListener(
      'close',
      () => finish('')
    );
  });
}

self.addEventListener(
  'push',
  (event) => {
    event.waitUntil(
      (async() => {
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
          String(
            data?.title ??
            notification?.title ??
            'Новое личное сообщение'
          );

        const genericBody =
          String(
            data?.body ??
            notification?.body ??
            'Вам написали в Бафии'
          );

        const deeplinkUri =
          data?.deeplinkUri ??
          notification?.click_action ??
          '';

        const notificationId =
          data?.notificationId ??
          '';

        const friendship =
          privateChatFriendshipFromPush(
            data,
            notification
          );

        const tag =
          notificationId
            ? `bafia-official-${notificationId}`
            : (
                friendship
                  ? `bafia-private-${friendship}`
                  : 'bafia-official-private-message'
              );

        const notificationData = {
          kind:
            'bafia-official-push',
          friendship:
            friendship ||
            undefined,
          deeplinkUri:
            deeplinkUri
              ? String(deeplinkUri)
              : undefined,
          raw:
            data
        };

        /*
          FIRST: use the exact simple notification path already confirmed on
          the iPhone lock screen. We do this before any extra network work.
        */
        await self.registration.showNotification(
          title,
          {
            body:
              genericBody,
            icon:
              './splash_screens/icon.png',
            tag,
            data:
              notificationData
          }
        );

        if(!friendship)
          return;

        /*
          SECOND: while the same push event is still alive, ask the official
          Mafia websocket for pcmsr and replace THIS SAME notification if the
          newest incoming message text is available.
        */
        const actualBody =
          await fetchLatestPrivateMessageBody(
            friendship
          );

        if(
          !actualBody ||
          actualBody ===
            cleanText(genericBody)
        ) {
          return;
        }

        await self.registration.showNotification(
          title,
          {
            body:
              actualBody,
            icon:
              './splash_screens/icon.png',
            tag,
            data:
              notificationData
          }
        );
      })()
    );
  }
);

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const notificationData =
      event.notification.data || {};

    event.waitUntil(
      (async() => {
        const windows =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
          });

        for(const client of windows) {
          if('focus' in client) {
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

        if(self.clients.openWindow) {
          const deeplinkUri =
            notificationData?.deeplinkUri ??
            notificationData?.raw?.deeplinkUri ??
            '';

          if(deeplinkUri) {
            const params =
              new URLSearchParams();

            params.set(
              'bafiaPushDeeplink',
              String(deeplinkUri)
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
