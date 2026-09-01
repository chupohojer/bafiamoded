self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async() => {
      /*
        Keep the service worker notification-only.
        Old Bafia caches from the abandoned fetch-intercepting worker are
        removed, but this worker NEVER handles ordinary network requests.
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
              caches.delete(
                key
              )
          )
      );

      await self.clients.claim();
    })()
  );
});

/*
  Deliberately NO fetch event handler.
  This keeps avatars/CDN/game networking completely outside the SW.
*/

const cleanPushText =
  value =>
    String(
      value ??
      ''
    )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

const isGenericPushText =
  value => {
    const text =
      cleanPushText(
        value
      )
        .toLocaleLowerCase(
          'ru-RU'
        );

    if(!text)
      return true;

    return [
      'новое сообщение',
      'новое личное сообщение',
      'вам написали в бафии',
      'new message',
      'new private message',
      'private message'
    ].includes(
      text
    );
  };

const extractPrivateChatFriendship =
  rawValue => {
    const raw =
      cleanPushText(
        rawValue
      );

    if(!raw)
      return '';

    try {
      const url =
        new URL(
          raw
        );

      const segments =
        url.pathname
          .split('/')
          .filter(Boolean)
          .map(
            segment => {
              try {
                return decodeURIComponent(
                  segment
                );
              } catch {
                return segment;
              }
            }
          );

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
    } catch {
      /*
        Custom/odd URI fallback below.
      */
    }

    const match =
      raw.match(
        /(?:^|\/)private_chat\/([^/?#]+)/i
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
  };

const bestPushBody =
  (
    data,
    notification
  ) => {
    /*
      Decompiled official Android CloudFirebaseMessagingService reads all of:
        body
        previousBody
        summaryText

      Android uses previousBody + body in its grouped InboxStyle. On our iPhone
      the server currently sends a generic `body` for private messages, so
      prefer a non-generic previousBody/summaryText when one is available.
    */
    const candidates = [
      data?.body,
      notification?.body,
      data?.previousBody,
      data?.summaryText
    ]
      .map(
        cleanPushText
      )
      .filter(Boolean);

    const informative =
      candidates.find(
        value =>
          !isGenericPushText(
            value
          )
      );

    return (
      informative ??
      candidates[0] ??
      'Новое личное сообщение'
    );
  };

self.addEventListener(
  'push',
  event => {
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
          cleanPushText(
            data?.title ??
            notification?.title ??
            'Новое личное сообщение'
          ) ||
          'Новое личное сообщение';

        const body =
          bestPushBody(
            data,
            notification
          );

        const deeplinkUri =
          cleanPushText(
            data?.deeplinkUri ??
            notification?.click_action ??
            ''
          );

        const friendship =
          extractPrivateChatFriendship(
            deeplinkUri
          );

        const notificationGroup =
          cleanPushText(
            data?.notificationGroup
          );

        const notificationId =
          cleanPushText(
            data?.notificationId
          );

        /*
          Prefer one tag per private conversation so repeated pushes from the
          same person update the existing notification instead of creating an
          endless stack. If this is not a private-chat push, keep official ids.
        */
        const tag =
          friendship
            ? `bafia-private-${friendship}`
            : (
                notificationGroup
                  ? `bafia-official-${notificationGroup}`
                  : (
                      notificationId
                        ? `bafia-official-${notificationId}`
                        : 'bafia-official-message'
                    )
              );

        await self.registration.showNotification(
          title,
          {
            body,
            icon:
              './splash_screens/icon.png',
            tag,
            data: {
              kind:
                friendship
                  ? 'bafia-private-message'
                  : 'bafia-official-push',

              friendship:
                friendship ||
                undefined,

              deeplinkUri:
                deeplinkUri ||
                undefined,

              /*
                Keep the useful official fields for click handling / later
                diagnostics without showing them to the user.
              */
              raw: {
                title:
                  data?.title,
                body:
                  data?.body,
                previousBody:
                  data?.previousBody,
                summaryText:
                  data?.summaryText,
                deeplinkUri:
                  data?.deeplinkUri,
                notificationChannel:
                  data?.notificationChannel,
                notificationGroup:
                  data?.notificationGroup,
                notificationId:
                  data?.notificationId,
                notificationGroupSummaryId:
                  data?.notificationGroupSummaryId
              }
            }
          }
        );
      })()
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
          self.clients.openWindow
        ) {
          /*
            No page is alive (typical lock-screen cold start). Put only the
            route ids in the URL so App.ts can consume them after Auth.
          */
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

          if(
            notificationData.deeplinkUri
          ) {
            params.set(
              'bafiaPushDeeplink',
              String(
                notificationData.deeplinkUri
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
        }
      })()
    );
  }
);
