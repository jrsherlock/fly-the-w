/* Fly the W service worker: offline shell + last-known data + push. */
'use strict';

const VERSION = 'v1';
const SHELL_CACHE = `ftw-shell-${VERSION}`;
const DATA_CACHE = `ftw-data-${VERSION}`;
const ASSET_CACHE = `ftw-assets-${VERSION}`;
const SHELL = ['./', './manifest.webmanifest', './favicon.svg', './cubs-logo.png', './icons/icon-192.png', './icons/badge-96.png'];
const API = self.location.hostname.endsWith('github.io') ? 'https://fly-the-w.vercel.app' : '';

const DATA_HOSTS = ['statsapi.mlb.com'];
const ASSET_HOSTS = ['midfield.mlbstatic.com', 'img.mlbstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = [SHELL_CACHE, DATA_CACHE, ASSET_CACHE];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await caches.match('./');
      if (shell) return shell;
    }
    return new Response('offline', { status: 503, statusText: 'offline' });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/api/')) return;              // never cache API
    e.respondWith(networkFirst(req, SHELL_CACHE));
  } else if (DATA_HOSTS.includes(url.hostname)) {
    e.respondWith(networkFirst(req, DATA_CACHE));              // stale-if-error scores
  } else if (ASSET_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req, ASSET_CACHE));
  }
});

/* ---------------- push ---------------- */
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'Fly the W', {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/badge-96.png',
    tag: data.tag || 'fly-the-w',
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) { await w.focus(); if ('navigate' in w) await w.navigate(url); return; }
    }
    await self.clients.openWindow(url);
  })());
});

self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    const res = await fetch(`${API}/api/subscribe`);
    const { publicKey } = await res.json();
    if (!publicKey) return;
    const pad = '='.repeat((4 - publicKey.length % 4) % 4);
    const raw = atob((publicKey + pad).replace(/-/g, '+').replace(/_/g, '/'));
    const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await fetch(`${API}/api/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sub) });
  })());
});
