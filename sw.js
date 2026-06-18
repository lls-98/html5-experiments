const CACHE_NAME = 'microcity-v1';

// Static assets blueprint list to intercept and store locally
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/main.css',
    './js/main.js',
    './js/core/Engine.js',
    './js/core/WorldState.js',
    './js/core/SaveSystem.js',
    './js/view/CanvasView.js',
    './js/view/Input.js',
    './js/view/ToolManager.js',
    './js/simulation/InfrastructureSimulator.js',
    './js/simulation/EconomicSimulator.js',
    './js/simulation/GrowthSimulator.js',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Pre-caching core application assets...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing legacy cache variant:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
    );
});