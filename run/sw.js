self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async() => {
      /*
        Удаляем старые bafia-кеши от предыдущих версий SW.
        Дальше этот service worker вообще не вмешивается
        в загрузку игры, аватарок и внешних ресурсов.
      */
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) =>
            key.startsWith('bafia-')
          )
          .map((key) =>
            caches.delete(key)
          )
      );

      await self.clients.claim();
    })()
  );
});

/*
  Никакого fetch handler здесь специально нет.

  Браузер сам загружает:
  - GitHub Pages файлы
  - dottap.com аватарки
  - любые другие внешние ресурсы

  Service Worker нужен нам только для уведомлений.
*/

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
              type: 'bafia-notification-click',
              data: notificationData
            });

            return;
          }
        }

        if(self.clients.openWindow) {
          await self.clients.openWindow('./');
        }
      })()
    );
  }
);