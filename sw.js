const CACHE_NAME = 'tutien-v1.0.9';
const STATIC_ASSETS = [
  './',
  './chat.js',
  './index.html',
  './style.css',
  './app.js',
  './audio.js',
  './realm.js',
  './inventory.js',
  './battle.js',
  './quiz.js',
  './manifest.json',
  './a1_vocab.csv',
  './b1_vocab.csv',
  './assets/bgm.mp3',
  './assets/pham-nhan-1.png',
  './assets/luyen-khi.png',
  './assets/truc-co.png',
  './assets/hac-am-son-dong.png',
  './assets/truc-co.png',
  './assets/truc-co-trung-ky.png',
  './assets/truc-co-vien-man.png',
  './assets/quy-hon.png',
  './assets/kiem-khi-luyen-khi.png',
  './assets/kiem-khi-truc-co.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // BỎ QUA các yêu cầu không phải http/https (như chrome-extension) và chỉ nhận phương thức GET
  if (!url.protocol.startsWith('http') || req.method !== 'GET') {
    return;
  }

  // BỎ QUA các request động của Firebase để không ghi đè dữ liệu
  if (url.origin.includes('firebase') || url.origin.includes('googleapis') || url.origin.includes('gstatic')) {
    return;
  }

  // Network-First cho mã nguồn giao diện để luôn nhận code mới nhất
  if (
    req.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-First cho hình ảnh, âm thanh và file CSV
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(req).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return networkResponse;
      });
    })
  );
});
