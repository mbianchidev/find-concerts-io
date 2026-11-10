const CACHE = 'find-concerts-public-shell-v3';
const scope = new URL(self.registration.scope);
const offline = new URL('offline.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          offline,
          new URL('mark.svg', scope).href,
          new URL('apple-touch-icon.png', scope).href,
        ])
      )
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('find-concerts-public-shell-') && key !== CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== scope.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(offline)));
  } else if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      })
    );
  }
});
self.addEventListener('push', (event) => {
  if (!event.data) return;
  event.waitUntil(
    (async () => {
      const data = event.data.json();
      const url = new URL(data.url, scope);
      if (
        url.origin !== scope.origin ||
        typeof data.title !== 'string' ||
        typeof data.body !== 'string'
      )
        throw new Error('Invalid concert notification payload.');
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        icon: new URL('apple-touch-icon.png', scope).href,
        data: { url: url.href },
      });
    })()
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(event.notification.data.url, scope);
      if (url.origin !== scope.origin)
        throw new Error('Notification destination must belong to this app.');
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === scope.origin
      );
      if (existing) {
        await existing.navigate(url.href);
        await existing.focus();
      } else await self.clients.openWindow(url.href);
    })()
  );
});
