// BlockML Studio service worker: keeps the editor, lessons and starter projects on
// this computer so they open without internet. scripts/build-sw.mjs puts PRECACHE
// (site path -> content hash) and VERSION in front of this file in build/sw.js.
// AI models are not in this list; they are big and get their own offline download.
/* global PRECACHE, VERSION */

const FILES = typeof PRECACHE === 'undefined' ? {} : PRECACHE;
const CACHE_PREFIX = 'studio-shell-';
const CACHE = CACHE_PREFIX + (typeof VERSION === 'undefined' ? 'dev' : VERSION);
// sw.js is at the site root, so every path in FILES is relative to it.
const BASE = new URL('./', self.location.href);

// The hash is part of the key, so a changed file never matches its old copy.
const keyFor = path => new URL(`${path}?rev=${FILES[path]}`, BASE).href;

const precache = async () => {
    const cache = await caches.open(CACHE);
    const paths = Object.keys(FILES);
    let next = 0;
    const worker = async () => {
        while (next < paths.length) {
            const path = paths[next++];
            const key = keyFor(path);
            if (await cache.match(key)) continue;
            // Files that did not change since the last version are copied, not downloaded again.
            const old = await caches.match(key);
            if (old) {
                await cache.put(key, old);
                continue;
            }
            let res = await fetch(new URL(path, BASE), {cache: 'no-cache'});
            if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
            // Chrome refuses to show a redirected response as a page.
            if (res.redirected) res = new Response(await res.blob(), res);
            await cache.put(key, res);
        }
    };
    await Promise.all([1, 2, 3, 4, 5, 6].map(worker));
};

self.addEventListener('install', event => {
    event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        // Keep the version before this one too: an editor tab opened before the
        // update may still load its old script files.
        const old = (await caches.keys()).filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE);
        await Promise.all(old.slice(0, -1).map(k => caches.delete(k)));
        await self.clients.claim();
    })());
});

// Pages are listed by the URL they are served at ("editor", "lessons/" with clean
// URLs; "editor.html", "lessons/index.html" without), so try each spelling.
const findPage = path => {
    if (path === '') return ['editor', 'index.html'].find(p => FILES[p]);
    const clean = path.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
    const bare = clean.replace(/\/$/, '');
    return [path, clean, bare, `${bare}/`, `${bare}.html`, `${bare}/index.html`].find(p => FILES[p]);
};

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;
    const path = url.pathname.slice(BASE.pathname.length);
    const listed = FILES[path] ? path : (request.mode === 'navigate' && findPage(path));
    if (listed) {
        event.respondWith(caches.open(CACHE)
            .then(cache => cache.match(keyFor(listed)))
            .then(res => res || fetch(request)));
    } else if (path.startsWith('js/')) {
        // Script files have a hash in their name, so an old tab's copy is still right.
        event.respondWith(caches.match(request, {ignoreSearch: true})
            .then(res => res || fetch(request)));
    }
});
