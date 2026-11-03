// BlockML Studio service worker: keeps the editor, lessons and starter projects on
// this computer so they open without internet. scripts/build-sw.mjs puts PRECACHE
// (site path -> content hash) and VERSION in front of this file in build/sw.js.
// AI models are not in this list; they are big and students choose which to download on
// the "Use offline" page (static/offline/), which saves them in MODEL_CACHE.
/* global PRECACHE, VERSION, MODEL_FILES */

const FILES = typeof PRECACHE === 'undefined' ? {} : PRECACHE;
const MODELS = typeof MODEL_FILES === 'undefined' ? {} : MODEL_FILES;
const MODEL_CACHE = 'studio-models';
const CACHE_PREFIX = 'studio-shell-';
const CACHE = CACHE_PREFIX + (typeof VERSION === 'undefined' ? 'dev' : VERSION);
// sw.js is at the site root, so every path in FILES is relative to it.
const BASE = new URL('./', self.location.href);

// The hash is part of the key, so a changed file never matches its old copy.
const keyFor = path => new URL(`${path}?rev=${FILES[path]}`, BASE).href;

// Downloads sometimes stall for good, so start a file again when no data arrives for a while.
const STALL_MS = 20000;
const MAX_ATTEMPTS = 4;
const fetchWhole = async url => {
    for (let attempt = 1; ; attempt++) {
        const stop = new AbortController();
        let timer;
        const watch = () => {
            clearTimeout(timer);
            timer = setTimeout(() => stop.abort(), STALL_MS);
        };
        try {
            watch();
            const res = await fetch(url, {cache: 'no-cache', signal: stop.signal});
            if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
            const reader = res.body.getReader();
            const chunks = [];
            for (;;) {
                watch();
                const {done, value} = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            // The body is already decompressed, so drop the headers that describe the transfer.
            const headers = new Headers(res.headers);
            headers.delete('content-encoding');
            headers.delete('content-length');
            return new Response(new Blob(chunks), {status: res.status, statusText: res.statusText, headers});
        } catch (err) {
            if (attempt >= MAX_ATTEMPTS) throw err;
        } finally {
            clearTimeout(timer);
        }
    }
};

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
            // A new Response, so Chrome also shows a redirected page (it refuses the original).
            await cache.put(key, await fetchWhole(new URL(path, BASE)));
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
    } else if (MODELS[path]) {
        const key = new URL(`${path}?rev=${MODELS[path]}`, BASE).href;
        event.respondWith(caches.open(MODEL_CACHE)
            .then(cache => cache.match(key))
            .then(res => res || fetch(request)));
    } else if (path.startsWith('js/')) {
        // Script files have a hash in their name, so an old tab's copy is still right.
        event.respondWith(caches.match(request, {ignoreSearch: true})
            .then(res => res || fetch(request)));
    }
});
