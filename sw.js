const CACHE = 'fichas-ac-login-v24';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => Promise.all(ASSETS.map(u => fetch(new Request(u,{cache:'reload'})).then(r => r.ok ? c.put(u,r) : null).catch(() => null)))).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Só cuida do "app shell" (arquivos do próprio site). Tudo que é do Firebase,
// Google, EmailJS etc. (outros domínios) passa direto pela rede — nunca
// intercepta, pois isso quebraria o login, o Firestore e o envio de fotos.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // deixa passar (Firebase, EmailJS, etc.)

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(new Request(e.request.url,{cache:'no-cache',credentials:'same-origin'})).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l => l.length ? l[0].focus() : self.clients.openWindow('./')));
});
