import { timingSafeEqual } from 'node:crypto';
import { put, del, list } from '@vercel/blob';
import webpush from 'web-push';
import { openJSON } from '../lib/pushcrypto.js';

const TEAM_ID = 112;                 // Chicago Cubs
const NL_CENTRAL_DIV_ID = 205;
const TOTAL_GAMES = 162;
const MIN = 60000, HOUR = 3600e3;
const FIRSTPITCH_WINDOW = 35 * MIN;  // alert when first pitch is this close
const CHECK_LEAD = 45 * MIN;         // loop wakes this far ahead of first pitch
const FINAL_WINDOW = 6 * HOUR;       // ignore finals older than this (vs scheduled start)
const CHECK_TAIL = 4.5 * HOUR;       // stateless post-start active window (baseball runs long)
const STATE_KEY = 'state/alerts.json';

const isoDate = (ms) => new Date(ms).toISOString().split('T')[0];
const scheduleUrl = (now) =>
  `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=${TEAM_ID}&startDate=${isoDate(now - 24 * HOUR)}&endDate=${isoDate(now + 48 * HOUR)}&hydrate=team,linescore,broadcasts`;
const standingsUrl = (now) =>
  `https://statsapi.mlb.com/api/v1/standings?leagueId=104&season=${new Date(now).getUTCFullYear()}&standingsTypes=regularSeason`;

/* ---------------- pure logic (unit-tested) ---------------- */

export function parseScheduleLite(data) {
  const games = [];
  for (const d of (data && data.dates) || []) {
    for (const g of d.games || []) {
      const home = g.teams && g.teams.home && g.teams.home.team && g.teams.home.team.id === TEAM_ID;
      const cubsSide = home ? g.teams.home : (g.teams && g.teams.away);
      const oppSide = home ? (g.teams && g.teams.away) : (g.teams && g.teams.home);
      const st = g.status || {};
      const coded = st.codedGameState || '';
      const completed = ['F', 'O'].includes(coded) || /Final|Game Over|Completed/.test(st.detailedState || '');
      const live = !completed && (coded === 'I' || (st.abstractGameState === 'Live' && !['P', 'S', 'D'].includes(coded)));
      const ls = g.linescore || {};
      const lsCubs = ls.teams ? (home ? ls.teams.home : ls.teams.away) : null;
      const lsOpp = ls.teams ? (home ? ls.teams.away : ls.teams.home) : null;
      const bcs = g.broadcasts || [];
      const b = bcs.find((x) => x.isNational) || bcs.find((x) => x.homeAway === (home ? 'home' : 'away')) || bcs[0];
      games.push({
        id: String(g.gamePk),
        date: Date.parse(g.gameDate),
        state: completed ? 'post' : (live ? 'in' : 'pre'),
        completed,
        home: !!home,
        oppName: (oppSide && oppSide.team && (oppSide.team.teamName || oppSide.team.name)) || 'the opponent',
        cubsScore: (lsCubs && lsCubs.runs != null) ? lsCubs.runs : (cubsSide && cubsSide.score != null ? cubsSide.score : null),
        oppScore: (lsOpp && lsOpp.runs != null) ? lsOpp.runs : (oppSide && oppSide.score != null ? oppSide.score : null),
        won: !!(cubsSide && cubsSide.isWinner === true),
        broadcast: (b && (b.name || b.callSign)) || '',
        inning: ls.currentInning || 0,
        inningState: ls.inningState || '',
      });
    }
  }
  return games.sort((a, b2) => a.date - b2.date);
}

/* Mirrors the app's binding-chaser math: the chaser is the non-leader with the
   FEWEST losses, not whoever sits 2nd by pct. magic = 163 − leaderW − chaserL. */
export function computeMagicNumber(teamRecords) {
  if (!teamRecords || !teamRecords.length) return null;
  const winPct = (t) => t.wins / Math.max(1, t.wins + t.losses);
  const sorted = [...teamRecords].sort((a, b) =>
    winPct(b) - winPct(a) || b.wins - a.wins || a.losses - b.losses);
  const cubs = sorted.find((t) => t.team && t.team.id === TEAM_ID);
  if (!cubs) return null;
  const leader = sorted[0];
  const isLeader = leader.team.id === TEAM_ID;
  const nonLeaders = sorted.filter((t) => t.team.id !== leader.team.id);
  const minLosses = nonLeaders.length ? Math.min(...nonLeaders.map((t) => t.losses)) : 0;
  const chaser = nonLeaders.find((t) => t.losses === minLosses) || nonLeaders[0] || leader;
  const magicToClinch = Math.max(0, (TOTAL_GAMES + 1) - cubs.wins - chaser.losses);
  return { isLeader, magicToClinch, chaserName: (chaser.team && (chaser.team.teamName || chaser.team.name)) || 'the field' };
}

export function computeActive(games, now, state) {
  if (games.some((g) => g.state === 'in')) return true;
  const next = games.filter((g) => g.state === 'pre' && g.date > now - 30 * MIN).sort((a, b) => a.date - b.date)[0];
  if (next && next.date - now <= CHECK_LEAD) return true;
  return games.some((g) => g.completed && now - g.date > 0 && now - g.date < CHECK_TAIL
    && (!state || !state.sent[`final:${g.id}`]));
}

const fmtFirstPitch = (ms) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }).format(ms) + ' CT';

export function decideAlerts(games, magic, state, now) {
  const sent = (state && state.sent) || {};
  const out = [];

  const next = games.filter((g) => g.state === 'pre').sort((a, b) => a.date - b.date)[0];
  if (next && !sent[`firstpitch:${next.id}`]) {
    const dt = next.date - now;
    if (dt > 0 && dt <= FIRSTPITCH_WINDOW) {
      out.push({ key: `firstpitch:${next.id}`, title: 'Cubs first pitch soon',
        body: `${next.home ? 'vs' : 'at'} ${next.oppName} · ${fmtFirstPitch(next.date)}${next.broadcast ? ` · ${next.broadcast}` : ''}`, url: './' });
    }
  }

  const live = games.find((g) => g.state === 'in') || null;
  if (live && !sent[`lateclose:${live.id}`] && live.inning >= 8
      && live.cubsScore != null && live.oppScore != null
      && Math.abs(live.cubsScore - live.oppScore) <= 2) {
    out.push({ key: `lateclose:${live.id}`, title: 'Late & close at the ballpark',
      body: `${live.inningState} ${live.inning} — Cubs ${live.cubsScore}, ${live.oppName} ${live.oppScore}. Every pitch matters.`, url: './' });
  }

  for (const g of games) {
    if (!g.completed || sent[`final:${g.id}`]) continue;
    const age = now - g.date;
    if (age <= 0 || age >= FINAL_WINDOW) continue;
    if (g.won) {
      const magicLine = (magic && magic.isLeader) ? ` · Magic number: ${magic.magicToClinch}` : '';
      out.push({ key: `final:${g.id}`, title: `🚩 Fly the W! Cubs ${g.cubsScore}–${g.oppScore}`,
        body: `${g.home ? 'vs' : 'at'} ${g.oppName}${magicLine}`, url: './' });
    } else {
      out.push({ key: `final:${g.id}`, title: `Final: Cubs fall ${g.cubsScore}–${g.oppScore}`,
        body: `${g.home ? 'vs' : 'at'} ${g.oppName}. On to the next one.`, url: './' });
    }
  }
  return out;
}

/* ---------------- I/O ---------------- */

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'fly-the-w-poller' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function authorized(req) {
  const secret = process.env.POLL_SECRET || '';
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(given), b = Buffer.from(secret);
  return secret.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

async function loadState() {
  const { blobs } = await list({ prefix: STATE_KEY });
  if (!blobs.length) return { sent: {} };
  try { return await (await fetch(blobs[0].url, { cache: 'no-store' })).json(); }
  catch { return { sent: {} }; }
}

async function saveState(state, now) {
  for (const [k, ts] of Object.entries(state.sent)) if (now - ts > 7 * 24 * HOUR) delete state.sent[k];
  await put(STATE_KEY, JSON.stringify(state), { access: 'public', addRandomSuffix: false, contentType: 'application/json', allowOverwrite: true });
}

async function loadSubs() {
  const { blobs } = await list({ prefix: 'subs/' });
  const subs = [];
  for (const b of blobs) {
    try { subs.push({ url: b.url, sub: openJSON(await (await fetch(b.url, { cache: 'no-store' })).text()) }); }
    catch { /* skip unreadable */ }
  }
  return subs;
}

async function fetchMagic(now) {
  try {
    const data = await getJSON(standingsUrl(now));
    const div = (data.records || []).find((r) => r.division && r.division.id === NL_CENTRAL_DIV_ID);
    if (!div) return null;
    return computeMagicNumber((div.teamRecords || []).map((tr) => ({
      team: { id: tr.team && tr.team.id, teamName: tr.team && tr.team.teamName, name: tr.team && tr.team.name },
      wins: tr.wins, losses: tr.losses,
    })));
  } catch { return null; }
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const now = Date.now();

  if (req.query && req.query.mode === 'test') {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jsherlock@cybercade.com',
      process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const subs = await loadSubs();
    let sent = 0, pruned = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(s.sub, JSON.stringify({ title: '🔔 Test alert', body: 'Push notifications are working. Play ball!', url: './', tag: 'test' }));
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) { await del(s.url).catch(() => {}); pruned++; }
      }
    }
    return res.status(200).json({ mode: 'test', subscribers: subs.length, sent, pruned });
  }

  const games = parseScheduleLite(await getJSON(scheduleUrl(now)));

  if (req.query && req.query.mode === 'check') {
    return res.status(200).json({ active: computeActive(games, now, null) });
  }

  const state = await loadState();
  const needsMagic = games.some((g) => g.completed && g.won && !state.sent[`final:${g.id}`]
    && now - g.date > 0 && now - g.date < FINAL_WINDOW);
  const magic = needsMagic ? await fetchMagic(now) : null;

  const alerts = decideAlerts(games, magic, state, now);
  let sent = 0, pruned = 0;
  if (alerts.length) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:jsherlock@cybercade.com',
      process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const subs = await loadSubs();
    for (const alert of alerts) {
      for (const s of subs) {
        try {
          await webpush.sendNotification(s.sub, JSON.stringify({ title: alert.title, body: alert.body, url: alert.url, tag: alert.key }));
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) { await del(s.url).catch(() => {}); pruned++; }
        }
      }
      state.sent[alert.key] = now;
    }
    await saveState(state, now);
  }
  return res.status(200).json({ active: computeActive(games, now, state), alerts: alerts.map((a) => a.key), sent, pruned });
}
