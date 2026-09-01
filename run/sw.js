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
              )
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
  No fetch handler. Avatars/network stay outside the service worker.

  PUSH HANDLER BELOW IS DELIBERATELY THE SAME SIMPLE PATH THAT WAS
  CONFIRMED WORKING ON THE iPHONE LOCK SCREEN.
*/
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

        /*
          The official server currently appears to send generic push text
          (first message / later grouped messages), not the actual private
          message text. Keep this path simple until we fetch the chat message
          separately instead of risking lock-screen delivery again.
        */
        const body =
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

        await self.registration.showNotification(
          title,
          {
            body,
            icon:
              './splash_screens/icon.png',
            tag:
              notificationId
                ? `bafia-official-${notificationId}`
                : 'bafia-official-private-message',
            data: {
              kind:
                'bafia-official-push',
              deeplinkUri:
                deeplinkUri
                  ? String(deeplinkUri)
                  : undefined,
              raw:
                data
            }
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
