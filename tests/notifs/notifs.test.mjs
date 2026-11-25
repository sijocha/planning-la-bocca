// Tests de la fonction « notifs » (notifications sur l'écran de verrouillage), sans Supabase ni vrai téléphone.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import ece from 'http_ece';
import * as jose from 'jose';
import { encrypt, newVapid, sendPush, b64u, unb64u, events, destinataires, paris, prochainJour } from './notifs.mjs';

const telephone = () => { const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); return { ua, auth: crypto.randomBytes(16) }; };
const ecoute = srv => new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

test('le message chiffré se lit avec la bibliothèque de référence', async () => {
  const { ua, auth } = telephone();
  const msg = JSON.stringify({ title: 'Commande à valider', body: 'Client · 07:30 · 8 m³ · éàç' });
  const corps = await encrypt(msg, b64u(ua.getPublicKey()), b64u(auth));
  assert.equal(ece.decrypt(Buffer.from(corps), { version: 'aes128gcm', privateKey: ua, authSecret: auth }).toString(), msg);
});

test('la signature VAPID est valide', async () => {
  const { ua, auth } = telephone(); const v = await newVapid(); let h;
  const srv = http.createServer((req, res) => { h = req.headers; res.writeHead(201); res.end(); });
  const port = await ecoute(srv);
  const r = await sendPush({ endpoint: `http://127.0.0.1:${port}/push/a`, p256dh: b64u(ua.getPublicKey()), auth: b64u(auth) }, { title: 't' }, v);
  srv.close();
  assert.equal(r.status, 201);
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(h.authorization);
  assert.equal(m[2], v.pub);
  const raw = unb64u(m[2]);
  const cle = await jose.importJWK({ kty: 'EC', crv: 'P-256', x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33)) }, 'ES256');
  const { payload } = await jose.jwtVerify(m[1], cle);
  assert.equal(payload.aud, `http://127.0.0.1:${port}`);
  assert.ok(payload.exp > Date.now() / 1000);
  assert.equal(h['content-encoding'], 'aes128gcm');
});

test('chacun reçoit les bonnes notifications', () => {
  const lbl = () => 'Client · Chantier';
  const base = { date: '2026-11-26', h: '07:30', tours: [{ v: 8 }], by: 'Morgan (commercial)' };
  const subs = [
    { par: 'uC', role: 'centraliste', nom: 'Jonathan' },
    { par: 'uM', role: 'commercial', nom: 'Morgan (commercial)' },
    { par: 'uM2', role: 'commercial', nom: 'Paul (commercial)' },
    { par: 'uC2', role: 'centraliste', nom: 'Karim', prefs: { valider: false } },
  ];
  const qui = (ev, aut) => ev.map(e => `${e.title} → ${destinataires(e, subs, aut).map(s => s.nom).join(', ')}`).join(' | ');
  const o = (k, x = {}) => ({ ...base, kind: k, ...x });
  assert.equal(qui(events('orders', 'o1', null, o('aplacer'), lbl), 'uM'), 'Commande à valider → Jonathan');
  assert.equal(qui(events('orders', 'o1', o('aplacer'), o('cmd'), lbl), 'uC'), 'Commande validée → Morgan (commercial)');
  assert.equal(qui(events('orders', 'o1', o('cmd'), o('cmd', { h: '09:00', tours: [{ v: 8 }, { v: 4 }] }), lbl), 'uC'), 'Commande modifiée par la centrale → Morgan (commercial)');
  assert.equal(qui(events('orders', 'o1', o('cmd'), o('cmd', { h: '10:00', modv: { by: 'Morgan (commercial)', at: '10:02' } }), lbl), 'uM'), 'Modification à valider · Morgan (commercial) → Jonathan, Karim');
  assert.equal(qui(events('orders', 'o1', o('cmd', { tours: [{ v: 8, s: 0 }] }), o('cmd', { tours: [{ v: 8, s: 1, p: 'EF' }] }), lbl), 'uC'), '');
  assert.equal(qui(events('orders', 'o1', o('cmd'), o('cmd', { st: 'annulee' }), lbl), 'uC'), 'Commande annulée → Morgan (commercial)');
  const d1 = { v: [{ id: 'r1', t: 'Changer la formule', de: 'Morgan (commercial)', pour: 'centraliste', rep: [] }] };
  assert.equal(qui(events('ref', 'demandes', { v: [] }, d1, lbl), 'uM'), 'Demande de Morgan (commercial) → Jonathan, Karim');
  const d2 = { v: [{ ...d1.v[0], rep: [{ by: 'Jonathan', t: 'OK' }] }] };
  assert.equal(qui(events('ref', 'demandes', d1, d2, lbl), 'uC'), 'Réponse de Jonathan → Morgan (commercial)');
  assert.equal(qui(events('chat', 'm1', null, { by: 'Morgan (commercial)', t: 'Je passe à 14 h' }, lbl), 'uM'), 'Chat · Morgan (commercial) → Jonathan, Karim');
});

test('rappel des pompes : heure de Paris et prochain jour travaillé', () => {
  assert.equal(paris(new Date('2026-11-26T05:45:00Z')).h, 6);
  assert.equal(paris(new Date('2026-07-01T04:45:00Z')).h, 6);
  assert.equal(prochainJour('2026-11-26', new Set()), '2026-11-27');
  assert.equal(prochainJour('2026-11-27', new Set()), '2026-11-30');
  assert.equal(prochainJour('2026-11-27', new Set(['2026-11-28'])), '2026-11-28');
});

test('la fonction complète : clé, secret, envoi, appareil disparu', async () => {
  const { ua, auth } = telephone(); const recus = [];
  const push = http.createServer(async (req, res) => {
    const ch = []; for await (const c of req) ch.push(c);
    if (req.url.endsWith('PARTI')) { res.writeHead(410); return res.end(); }
    recus.push(JSON.parse(ece.decrypt(Buffer.concat(ch), { version: 'aes128gcm', privateKey: ua, authSecret: auth }).toString()));
    res.writeHead(201); res.end();
  });
  const pp = await ecoute(push);
  const sub = (fin, nom) => ({ endpoint: `http://127.0.0.1:${pp}/push/${fin}`, p256dh: b64u(ua.getPublicKey()), auth: b64u(auth), par: 'u' + fin, role: 'centraliste', nom, prefs: {} });
  const DB = { config: { id: 1, vapid_public: null, vapid_private: null, secret: 'SEC' }, subs: [sub('C', 'Jonathan'), sub('PARTI', 'Ancien')],
    refs: [{ id: 'clients', data: { v: [{ id: 'c1', n: 'CLIENT' }] } }, { id: 'chantiers', data: { v: [{ id: 'h1', nom: 'Chantier' }] } }] };
  const rest = http.createServer(async (req, res) => {
    let b = ''; for await (const c of req) b += c;
    const u = decodeURIComponent(req.url); const j = x => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)); };
    if (req.headers.apikey !== 'cle_test') { res.writeHead(401); return res.end(); }
    if (u.startsWith('/rest/v1/push_config') && req.method === 'GET') return j([DB.config]);
    if (u.startsWith('/rest/v1/push_config') && req.method === 'PATCH') { if (!DB.config.vapid_public) Object.assign(DB.config, JSON.parse(b)); res.writeHead(204); return res.end(); }
    if (u.startsWith('/rest/v1/documents')) return j(DB.refs);
    if (u.startsWith('/rest/v1/push_abonnements') && req.method === 'GET') return j(DB.subs);
    if (u.startsWith('/rest/v1/push_abonnements') && req.method === 'DELETE') { const e = u.split('endpoint=eq.')[1]; DB.subs = DB.subs.filter(s => s.endpoint !== e); res.writeHead(204); return res.end(); }
    res.writeHead(404); res.end();
  });
  const rp = await ecoute(rest);
  let handler;
  globalThis.Deno = { env: { get: k => ({ SUPABASE_URL: `http://127.0.0.1:${rp}`, SUPABASE_SECRET_KEY: 'cle_test' })[k] }, serve: f => { handler = f; } };
  await import('./notifs.mjs?complet');
  const appel = async (method, body, sec) => { const r = await handler(new Request('http://x/notifs', { method, headers: sec ? { 'x-secret': sec } : {}, body: body ? JSON.stringify(body) : undefined })); return [r.status, await r.text()]; };
  try {
    const g1 = JSON.parse((await appel('GET'))[1]).publicKey, g2 = JSON.parse((await appel('GET'))[1]).publicKey;
    assert.equal(g1.length, 87); assert.equal(g1, g2); assert.ok(DB.config.vapid_private);
    assert.notEqual((await appel('POST', { collection: 'chat' }))[0], 200);
    const o = { cl: 'c1', ch: 'h1', date: '2026-11-26', h: '07:30', tours: [{ v: 8 }], by: 'Morgan (commercial)', kind: 'aplacer' };
    assert.equal((await appel('POST', { collection: 'orders', id: 'o1', old: null, new: o, auteur: 'uM' }, 'SEC'))[0], 200);
    assert.equal(recus.length, 1);
    assert.equal(recus[0].title, 'Commande à valider');
    assert.match(recus[0].body, /CLIENT · Chantier · jeu\. 26 nov\. 07:30 · 8 m³/);
    assert.deepEqual(DB.subs.map(s => s.nom), ['Jonathan']);
  } finally { rest.close(); push.close(); }
});
