const CACHE_NAME = 'bafia-v3-autoupdate';

const ASSETS = [
  './manifest.json',
  './index.html',
  './bin/index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET')
    return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .catch(async() => {
        const cached =
          await caches.match(
            event.request,
            { ignoreSearch: true }
          );

        if(cached)
          return cached;

        if(event.request.mode === 'navigate')
          return caches.match('./index.html');

        throw new Error('Offline resource is not cached');
      })
  );
});

/*
  Stage 1 notification click:
  focus an already-open Bafia window, or open the PWA if no client exists.

  Notification data is preserved so a later stage can deep-link directly
  into the corresponding PrivateChat.
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
              type:
                'bafia-notification-click',
              data:
                notificationData
            });

            return;
          }
        }

        if(self.clients.openWindow) {
          await self.clients.openWindow(
            './'
          );
        }
      })()
    );
  }
);