import { createHash } from 'node:crypto';
import { put, del, list } from '@vercel/blob';
import { sealJSON } from '../lib/pushcrypto.js';

const MAX_BODY = 4096;
/* The GitHub Pages copy of the site calls this API cross-origin. */
const ALLOWED_ORIGIN = 'https://jrsherlock.github.io';

export function validSubscription(sub) {
  return !!(sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://')
    && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string'
    && JSON.stringify(sub).length <= MAX_BODY);
}

const keyFor = (endpoint) => `subs/${createHash('sha256').update(endpoint).digest('hex')}.json`;

export default async function handler(req, res) {
  if (req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader('access-control-allow-origin', ALLOWED_ORIGIN);
    res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    return res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
  }
  if (req.method === 'POST') {
    const sub = req.body;
    if (!validSubscription(sub)) return res.status(400).json({ error: 'invalid subscription' });
    await put(keyFor(sub.endpoint),
      sealJSON({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, created: Date.now() }),
      { access: 'public', addRandomSuffix: false, contentType: 'application/json', allowOverwrite: true });
    return res.status(201).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const endpoint = req.body && req.body.endpoint;
    if (typeof endpoint !== 'string') return res.status(400).json({ error: 'missing endpoint' });
    const { blobs } = await list({ prefix: keyFor(endpoint) });
    if (blobs.length) await del(blobs.map((b) => b.url));
    return res.status(200).json({ ok: true });
  }
  res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
  return res.status(405).end();
}
