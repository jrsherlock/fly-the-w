import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAlerts, computeActive, computeMagicNumber, parseScheduleLite } from '../api/poll.js';
import { validSubscription } from '../api/subscribe.js';
import { sealJSON, openJSON } from '../lib/pushcrypto.js';
import { randomBytes } from 'node:crypto';

const MIN = 60000, H = 3600e3;
const T0 = Date.parse('2026-07-19T23:05:00Z');

const game = (o = {}) => ({
  id: '776000', date: T0, state: 'pre', completed: false, home: true,
  oppName: 'Reds', cubsScore: null, oppScore: null, won: false,
  broadcast: 'Marquee', inning: 0, inningState: '', ...o,
});

const schedFixture = {
  dates: [{
    games: [{
      gamePk: 776000,
      gameDate: '2026-07-19T23:05:00Z',
      status: { codedGameState: 'I', detailedState: 'In Progress', abstractGameState: 'Live' },
      teams: {
        home: { team: { id: 112, teamName: 'Cubs', name: 'Chicago Cubs' }, score: 4, isWinner: undefined },
        away: { team: { id: 113, teamName: 'Reds', name: 'Cincinnati Reds' }, score: 3 },
      },
      linescore: { currentInning: 8, inningState: 'Top', teams: { home: { runs: 4 }, away: { runs: 3 } } },
      broadcasts: [{ name: 'Marquee Sports Network', callSign: 'MARQ' }],
    }],
  }],
};

const nlCentral = (cubsW, cubsL, others) => [
  { team: { id: 112, teamName: 'Cubs' }, wins: cubsW, losses: cubsL },
  ...others,
];

test('parseScheduleLite maps statsapi games', () => {
  const [g] = parseScheduleLite(schedFixture);
  assert.equal(g.id, '776000');
  assert.equal(g.state, 'in');
  assert.equal(g.home, true);
  assert.equal(g.oppName, 'Reds');
  assert.equal(g.cubsScore, 4);
  assert.equal(g.oppScore, 3);
  assert.equal(g.inning, 8);
  assert.match(g.broadcast, /Marquee/);
});

test('parseScheduleLite: P-coded games are upcoming, F/O are final', () => {
  const mk = (coded, abstract) => ({ dates: [{ games: [{ ...schedFixture.dates[0].games[0], status: { codedGameState: coded, abstractGameState: abstract, detailedState: '' } }] }] });
  assert.equal(parseScheduleLite(mk('P', 'Live'))[0].state, 'pre');
  assert.equal(parseScheduleLite(mk('S', 'Preview'))[0].state, 'pre');
  assert.equal(parseScheduleLite(mk('F', 'Final'))[0].state, 'post');
  assert.equal(parseScheduleLite(mk('O', 'Live'))[0].state, 'post');
});

test('firstpitch fires inside 35-minute window, once', () => {
  const g = [game()];
  const a = decideAlerts(g, null, { sent: {} }, T0 - 30 * MIN);
  assert.equal(a.length, 1);
  assert.equal(a[0].key, 'firstpitch:776000');
  assert.match(a[0].body, /Reds/);
  assert.match(a[0].body, /CT/);
  assert.equal(decideAlerts(g, null, { sent: { 'firstpitch:776000': 1 } }, T0 - 30 * MIN).length, 0);
  assert.equal(decideAlerts(g, null, { sent: {} }, T0 - 2 * H).length, 0);
});

test('lateclose fires only 8th+ and margin ≤2', () => {
  const live = (inning, cs, os) => [game({ state: 'in', inning, inningState: 'Bottom', cubsScore: cs, oppScore: os })];
  const hit = decideAlerts(live(8, 4, 3), null, { sent: {} }, T0 + 2 * H);
  assert.ok(hit.some((a) => a.key === 'lateclose:776000'));
  assert.ok(!decideAlerts(live(7, 4, 3), null, { sent: {} }, T0 + 2 * H).some((a) => a.key === 'lateclose:776000'));
  assert.ok(!decideAlerts(live(9, 8, 3), null, { sent: {} }, T0 + 2 * H).some((a) => a.key === 'lateclose:776000'));
});

test('final: win flies the W with magic number, loss is plain', () => {
  const done = (won) => [game({ state: 'post', completed: true, cubsScore: won ? 6 : 2, oppScore: won ? 2 : 6, won })];
  const magic = { isLeader: true, magicToClinch: 34, chaserName: 'Brewers' };
  const w = decideAlerts(done(true), magic, { sent: {} }, T0 + 3 * H);
  assert.equal(w.length, 1);
  assert.match(w[0].title, /Fly the W/);
  assert.match(w[0].body, /Magic number: 34/);
  const l = decideAlerts(done(false), magic, { sent: {} }, T0 + 3 * H);
  assert.match(l[0].title, /fall/);
  assert.ok(!/Magic number/.test(l[0].body));
  assert.equal(decideAlerts(done(true), magic, { sent: { 'final:776000': 1 } }, T0 + 3 * H).length, 0);
  assert.equal(decideAlerts(done(true), magic, { sent: {} }, T0 + 7 * H).length, 0);
});

test('computeActive gates the polling loop (4.5h baseball tail)', () => {
  assert.equal(computeActive([game({ state: 'in' })], T0, null), true);
  assert.equal(computeActive([game()], T0 - 40 * MIN, null), true);
  assert.equal(computeActive([game()], T0 - 2 * H, null), false);
  const done = [game({ state: 'post', completed: true })];
  assert.equal(computeActive(done, T0 + 4 * H, null), true);
  assert.equal(computeActive(done, T0 + 4 * H, { sent: { 'final:776000': 1 } }), false);
  assert.equal(computeActive(done, T0 + 5 * H, null), false);
});

test('computeMagicNumber uses binding chaser (fewest losses), mirrors app math', () => {
  // Cubs lead; Brewers 2nd by pct but Cardinals have fewer losses → Cards bind.
  const m = computeMagicNumber(nlCentral(60, 36, [
    { team: { id: 158, teamName: 'Brewers' }, wins: 56, losses: 40 },
    { team: { id: 138, teamName: 'Cardinals' }, wins: 52, losses: 38 },
    { team: { id: 113, teamName: 'Reds' }, wins: 45, losses: 50 },
  ]));
  assert.equal(m.isLeader, true);
  assert.equal(m.magicToClinch, 163 - 60 - 38);
  assert.equal(m.chaserName, 'Cardinals');
  // Cubs trailing → not leader
  const t = computeMagicNumber(nlCentral(50, 46, [
    { team: { id: 158, teamName: 'Brewers' }, wins: 60, losses: 36 },
  ]));
  assert.equal(t.isLeader, false);
});

test('sealJSON/openJSON round-trips and rejects tampering', () => {
  const key = randomBytes(32);
  const obj = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } };
  const sealed = sealJSON(obj, key);
  assert.ok(!sealed.includes('fcm.googleapis.com'));
  assert.deepEqual(openJSON(sealed, key), obj);
  const bad = JSON.parse(sealed);
  bad.ct = bad.ct.slice(0, -4) + 'AAAA';
  assert.throws(() => openJSON(JSON.stringify(bad), key));
});

test('validSubscription accepts real shape, rejects junk', () => {
  const good = { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } };
  assert.equal(validSubscription(good), true);
  assert.equal(validSubscription({ endpoint: 'http://x', keys: { p256dh: 'a', auth: 'b' } }), false);
  assert.equal(validSubscription({ endpoint: 'https://x' }), false);
  assert.equal(validSubscription({ ...good, pad: 'x'.repeat(5000) }), false);
});
