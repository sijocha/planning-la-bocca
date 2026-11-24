// Planning La Bocca : notifications sur le téléphone (Web Push), envoyées par la base.
// Fonction Supabase « notifs » — à coller dans Supabase → Edge Functions → Deploy a new function → Via Editor,
// avec « Verify JWT » désactivé (la base s'authentifie avec un secret qu'elle seule connaît).
//   GET  → clé publique de notification (créée au premier appel)
//   POST → appelée par la base à chaque changement utile (voir supabase/10_notifications.sql)
// Aucune bibliothèque : chiffrement RFC 8291 (aes128gcm) et signature VAPID (RFC 8292) avec Web Crypto.

const URL_ = (globalThis as any).Deno?.env.get("SUPABASE_URL") ?? "";
const KEY = (globalThis as any).Deno?.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? (globalThis as any).Deno?.env.get("SUPABASE_SECRET_KEY") ?? "";
const CONTACT = "https://sijocha.github.io/planning-la-bocca/";
const enc = new TextEncoder();

// ---------- base64url ----------
export function b64u(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64u(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
  const r = atob(s); const out = new Uint8Array(r.length);
  for (let i = 0; i < r.length; i++) out[i] = r.charCodeAt(i);
  return out;
}
const cat = (...a: Uint8Array[]) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

// ---------- clés VAPID ----------
export async function newVapid() {
  const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", k.privateKey);
  return { pub: b64u(pub), priv: JSON.stringify(jwk) };
}
async function vapidHeader(endpoint: string, pub: string, privJwk: string) {
  const key = await crypto.subtle.importKey("jwk", JSON.parse(privJwk), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const aud = new URL(endpoint).origin;
  const h = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(h + "." + p)));
  return `vapid t=${h}.${p}.${b64u(sig)}, k=${pub}`;
}

// ---------- chiffrement du message (RFC 8291, aes128gcm) ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, len * 8));
}
export async function encrypt(payload: string, p256dh: string, auth: string, salt?: Uint8Array) {
  const ua = unb64u(p256dh), secret = unb64u(auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(secret, shared, cat(enc.encode("WebPush: info\0"), ua, asPub), 32);
  salt = salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, cat(enc.encode(payload), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object, vapid: { pub: string; priv: string }) {
  const body = await encrypt(JSON.stringify(payload), sub.p256dh, sub.auth);
  return await fetch(sub.endpoint, {
    method: "POST",
    headers: { "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high", Authorization: await vapidHeader(sub.endpoint, vapid.pub, vapid.priv) },
    body,
  });
}

// ---------- qui prévenir, et de quoi ----------
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const jour = (iso: string) => { const d = new Date(iso + "T12:00:00Z"); return isNaN(+d) ? iso : `${JOURS[d.getUTCDay()]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`; };
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const vol = (o: any) => (o?.tours || []).reduce((a: number, t: any) => a + (+t.v || 0), 0);
// défauts par rôle : le centraliste reçoit ce qui est à valider, le commercial ce qui touche ses commandes
export const DEFAUTS: Record<string, Record<string, boolean>> = {
  centraliste: { valider: true, modv: true, demandes: true, chat: true, mes: true },
  commercial: { valider: false, modv: false, demandes: true, chat: false, mes: true },
  labo: { valider: false, modv: false, demandes: true, chat: false, mes: true },
  lecture: { valider: false, modv: false, demandes: false, chat: false, mes: false },
};

type Ev = { cat: string; role?: string[]; nom?: string; title: string; body: string; tag: string; url: string };
/** Compare l'ancien et le nouveau document et renvoie les notifications à envoyer. */
export function events(collection: string, id: string, oldD: any, newD: any, lbl: (o: any) => string): Ev[] {
  const out: Ev[] = [];
  if (collection === "orders" && newD) {
    const o = newD, p = oldD || {};
    const url = `./?d=${o.date || ""}&o=${id}`;
    const quand = `${jour(o.date)} ${String(o.h || "").slice(0, 5)}`;
    const base = `${lbl(o)} · ${quand} · ${fmt(vol(o))} m³`;
    if (o.kind === "aplacer" && p.kind !== "aplacer")
      out.push({ cat: "valider", role: ["centraliste"], title: "Commande à valider", body: `${base}${o.by ? " · " + o.by : ""}`, tag: "val-" + id, url });
    const modv = !!o.modv && JSON.stringify(o.modv) !== JSON.stringify(p.modv || null);
    if (modv)
      out.push({ cat: "modv", role: ["centraliste"], title: "Modification à valider", body: `${base} · ${o.modv.by || ""}`, tag: "modv-" + id, url });
    if (oldD && o.by) {
      if (p.kind === "aplacer" && o.kind === "cmd")
        out.push({ cat: "mes", nom: o.by, title: "Commande validée", body: base, tag: "mes-" + id, url });
      else if (o.st === "annulee" && p.st !== "annulee")
        out.push({ cat: "mes", nom: o.by, title: "Commande annulée", body: base, tag: "mes-" + id, url });
      else if (!modv && p.kind !== "aplacer" && (o.h !== p.h || o.date !== p.date || o.f !== p.f || Math.abs(vol(o) - vol(p)) > 0.01)) {
        const ch: string[] = [];
        if (o.date !== p.date) ch.push(`jour ${jour(p.date)} → ${jour(o.date)}`);
        if (o.h !== p.h) ch.push(`heure ${String(p.h || "").slice(0, 5)} → ${String(o.h || "").slice(0, 5)}`);
        if (o.f !== p.f) ch.push(`formule → ${o.f}`);
        if (Math.abs(vol(o) - vol(p)) > 0.01) ch.push(`${fmt(vol(p))} → ${fmt(vol(o))} m³`);
        out.push({ cat: "mes", nom: o.by, title: "Commande modifiée par la centrale", body: `${lbl(o)} · ${ch.join(" · ")}`, tag: "mes-" + id, url });
      }
    }
  }
  if (collection === "ref" && id === "demandes" && Array.isArray(newD?.v)) {
    const avant: Record<string, any> = {}; (oldD?.v || []).forEach((r: any) => { if (r?.id) avant[r.id] = r; });
    for (const r of newD.v) {
      if (!r?.id) continue; const a = avant[r.id];
      const pour = r.pour === "labo" ? ["labo"] : ["centraliste"];
      if (!a) { out.push({ cat: "demandes", role: pour, title: `Demande de ${r.de || "?"}`, body: String(r.t || "").slice(0, 140), tag: "dem-" + r.id, url: "./?tab=demandes" }); continue; }
      const nr = (r.rep || []).length, na = (a.rep || []).length;
      if (nr > na) {
        const last = r.rep[nr - 1] || {};
        if (last.by && last.by !== r.de) out.push({ cat: "demandes", nom: r.de, title: `Réponse de ${last.by}`, body: String(last.t || r.t || "").slice(0, 140), tag: "dem-" + r.id, url: "./?tab=demandes" });
        else out.push({ cat: "demandes", role: pour, title: `Demande de ${r.de || "?"} : nouveau message`, body: String(last.t || "").slice(0, 140), tag: "dem-" + r.id, url: "./?tab=demandes" });
      }
      if (r.done && !a.done && r.de)
        out.push({ cat: "demandes", nom: r.de, title: "Demande traitée", body: `${String(r.t || "").slice(0, 100)}${r.doneBy ? " · " + r.doneBy : ""}`, tag: "dem-" + r.id, url: "./?tab=demandes" });
    }
  }
  if (collection === "chat" && newD && !oldD)
    out.push({ cat: "chat", title: `Chat · ${newD.by || "?"}`, body: String(newD.t || "").slice(0, 140), tag: "chat", url: "./?chat=1" });
  return out;
}

/** Les abonnés qui reçoivent un évènement (jamais l'auteur du changement). */
export function destinataires(ev: Ev, subs: any[], auteur: string | null) {
  return subs.filter((s) => {
    if (auteur && s.par === auteur) return false;
    const pr = { ...(DEFAUTS[s.role] || DEFAUTS.lecture), ...(s.prefs || {}) };
    if (!pr[ev.cat]) return false;
    if (ev.nom) return (s.nom || "").toLowerCase() === ev.nom.toLowerCase();
    if (ev.role) return ev.role.includes(s.role);
    return true;
  });
}

// ---------- accès à la base (clé de service, jamais exposée) ----------
async function db(path: string, init: RequestInit = {}) {
  const h: Record<string, string> = { apikey: KEY, "Content-Type": "application/json", ...(init.headers as any || {}) };
  if (KEY.startsWith("eyJ")) h.Authorization = "Bearer " + KEY;
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: h });
  if (!r.ok) throw new Error(`${path} : ${r.status} ${await r.text()}`);
  return r.status === 204 ? null : await r.json();
}
async function config() {
  let [c] = await db("push_config?id=eq.1&select=*");
  if (c && !c.vapid_public) {
    const v = await newVapid();
    await db("push_config?id=eq.1&vapid_public=is.null", { method: "PATCH", body: JSON.stringify({ vapid_public: v.pub, vapid_private: v.priv }) });
    [c] = await db("push_config?id=eq.1&select=*");
  }
  return c;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const c = await config();
  if (!c) return new Response("push_config manquant : exécuter 10_notifications.sql", { status: 500, headers: CORS });
  if (req.method === "GET") return Response.json({ publicKey: c.vapid_public }, { headers: CORS });
  if (req.headers.get("x-secret") !== c.secret) return new Response("non autorisé", { status: 401 });
  const msg = await req.json();
  if (msg.test) {   // bouton « notification de test » : seulement les appareils de la personne
    const subs = await db(`push_abonnements?par=eq.${msg.test}&select=endpoint,p256dh,auth`);
    let n = 0;
    for (const s of subs) {
      try {
        const r = await sendPush(s, { title: "Planning La Bocca", body: "Les notifications fonctionnent sur cet appareil.", tag: "test", url: "./" }, { pub: c.vapid_public, priv: c.vapid_private });
        if (r.status === 404 || r.status === 410) await db(`push_abonnements?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" });
        else if (r.ok) n++;
      } catch (_) { /* appareil injoignable */ }
    }
    return new Response(`${n} notification(s) de test`);
  }
  const { collection, id, old: oldD, new: newD, auteur } = msg;
  let refs: { cl: Record<string, string>; ch: Record<string, string> } | null = null;
  const lbl = (o: any) => {
    const cl = refs?.cl[o.cl] || "Client", ch = refs?.ch[o.ch];
    return ch ? `${cl} · ${ch}` : cl;
  };
  if (collection === "orders") {
    const rows = await db("documents?collection=eq.ref&id=in.(clients,chantiers)&select=id,data");
    refs = { cl: {}, ch: {} };
    for (const r of rows) for (const x of (r.data?.v || [])) (r.id === "clients" ? refs.cl : refs.ch)[x.id] = r.id === "clients" ? x.n : (x.nom || x.adr || "");
  }
  const evs = events(collection, id, oldD, newD, lbl);
  if (!evs.length) return new Response("rien à envoyer");
  const subs = await db("push_abonnements?select=endpoint,p256dh,auth,par,role,nom,prefs");
  let n = 0;
  for (const ev of evs) {
    for (const s of destinataires(ev, subs, auteur)) {
      try {
        const r = await sendPush(s, { title: ev.title, body: ev.body, tag: ev.tag, url: ev.url }, { pub: c.vapid_public, priv: c.vapid_private });
        if (r.status === 404 || r.status === 410) await db(`push_abonnements?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: "DELETE" });
        else if (r.ok) n++;
      } catch (_) { /* un téléphone injoignable ne bloque pas les autres */ }
    }
  }
  return new Response(`${n} notification(s) envoyée(s)`);
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve((req: Request) => handle(req).catch((e) => new Response(String(e?.message || e), { status: 500, headers: CORS })));
