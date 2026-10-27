const VERSION = 'ktv-1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== 'shared').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // סרטון ששותף מווצאפ / מהגלריה
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get('video') || form.getAll('video')[0];
        if (file) {
          const cache = await caches.open('shared');
          await cache.put('shared-video', new Response(file, {
            headers: {
              'content-type': file.type || 'video/mp4',
              'x-name': encodeURIComponent(file.name || 'video.mp4')
            }
          }));
        }
      } catch (err) { /* ממשיכים לאפליקציה בכל מקרה */ }
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }

  // קבצי האפליקציה: קודם רשת, ואם אין אינטרנט - מהזיכרון
  if (e.request.method === 'GET' && url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
  }
});
