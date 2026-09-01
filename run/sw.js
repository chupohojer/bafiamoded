self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async() => {
      /*
        v8: notification-only worker.

        Remove old experimental Bafia caches, including the private-message
        history/pending caches used by v4-v7. We no longer keep Mafia auth
        tokens or open background private-chat WebSockets.
      */
      const keys =
        await caches.keys();

      await Promise.all(
        keys
          .filter(
            key =>
              key.startsWith(
                'bafia-'
              )
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
  IMPORTANT:
  - NO fetch handler
  - NO Mafia WebSocket
  - NO acpc / pcmsr history request
  - NO background read/accept path

  A push notification must never change unread/read state.
*/

function cleanText(value) {
  return String(
    value ??
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function friendshipFromDeeplink(
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
      Support both:
        scheme://private_chat/<friendship>
        https://.../private_chat/<friendship>
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
      segments[
        index + 1
      ]
    ) {
      return String(
        segments[
          index + 1
        ]
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

function friendshipFromPush(
  data,
  notification
) {
  const deeplinkUri =
    data?.deeplinkUri ??
    notification?.click_action ??
    '';

  const fromDeeplink =
    friendshipFromDeeplink(
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
    ? cleanText(
        groupMatch[1]
      )
    : '';
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

  /*
    Do NOT use previousBody here: by definition it can describe an older
    message. Only show the body attached to THIS push.

    If the official Mafia backend sends only a generic body, we deliberately
    keep the generic body rather than opening the private chat in the
    background and accidentally marking messages as read.
  */
  const body =
    cleanText(
      data?.body ??
      notification?.body ??
      'Новое сообщение'
    ) ||
    'Новое сообщение';

  const deeplinkUri =
    data?.deeplinkUri ??
    notification?.click_action ??
    '';

  const friendship =
    friendshipFromPush(
      data,
      notification
    );

  return {
    data,
    title,
    body,
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

    const notificationId =
      cleanText(
        parsed.data?.notificationId
      );

    const tag =
      parsed.friendship
        ? `bafia-private-${parsed.friendship}`
        : (
            notificationId
              ? `bafia-official-${notificationId}`
              : 'bafia-official-message'
          );

    event.waitUntil(
      self.registration.showNotification(
        parsed.title,
        {
          body:
            parsed.body,
          icon:
            './splash_screens/icon.png',
          tag,
          data: {
            kind:
              parsed.friendship
                ? 'bafia-private-message'
                : 'bafia-official-push',

            friendship:
              parsed.friendship ||
              undefined,

            deeplinkUri:
              parsed.deeplinkUri
                ? String(
                    parsed.deeplinkUri
                  )
                : undefined,

            /*
              Kept only for click routing/debugging.
              No background Mafia request is made from this payload.
            */
            raw:
              parsed.data
          }
        }
      )
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
          !self.clients.openWindow
        ) {
          return;
        }

        const params =
          new URLSearchParams();

        if(
          notificationData.friendship
        ) {
          params.set(
            'bafiaPushFriendship',
            String(
              notificationData.friendship
            )
          );
        }

        if(
          notificationData.playerObjectId
        ) {
          params.set(
            'bafiaPushPlayer',
            String(
              notificationData.playerObjectId
            )
          );
        }

        const deeplinkUri =
          notificationData.deeplinkUri ??
          notificationData.raw?.deeplinkUri ??
          '';

        if(deeplinkUri) {
          params.set(
            'bafiaPushDeeplink',
            String(
              deeplinkUri
            )
          );
        }

        const query =
          params.toString();

        await self.clients.openWindow(
          query
            ? `./?${query}`
            : './'
        );
      })()
    );
  }
);
