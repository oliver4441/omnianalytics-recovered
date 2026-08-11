const CACHE_VERSION = 'omnianalytics-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/app-icon.svg',
  '/images/app-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const currentCaches = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => {
        if (!currentCaches.has(name)) return caches.delete(name);
        return undefined;
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Authentication and Firestore requests can contain private workspace data.
  // Keep them network-only and let Firebase's own persistence layer manage offline data.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isStaticAsset(pathname) {
  return /\.(?:css|js|mjs|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(pathname)
    || pathname === '/manifest.json';
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request))
      || (await caches.match('/index.html'))
      || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await network) || Response.error();
}

self.addEventListener('push', (event) => {
  const body = event.data?.text() || 'New OmniAnalytics workspace activity';
  event.waitUntil(self.registration.showNotification('OmniAnalytics', {
    body,
    icon: '/images/app-icon.png',
    badge: '/images/app-icon.png',
    data: { url: '/dashboard' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || '/dashboard'));
});
