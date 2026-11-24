/* Planning La Bocca : service worker de l'application installable.
   Réseau d'abord : on sert toujours la dernière version publiée ; le cache ne sert qu'à ouvrir l'application sans réseau.
   Les échanges avec Supabase et Google (autre domaine) ne passent jamais par ici. */
const CACHE='lb-shell-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','manifest.webmanifest','icons/icon-192.png']).catch(()=>{})))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{
    if(res.ok&&res.type==='basic'){const key=r.mode==='navigate'?'./':r;const cp=res.clone();caches.open(CACHE).then(c=>c.put(key,cp)).catch(()=>{})}
    return res
  }).catch(()=>caches.match(r.mode==='navigate'?'./':r,{ignoreSearch:r.mode==='navigate'}).then(m=>m||(r.mode==='navigate'?caches.match('./'):undefined)).then(m=>m||Response.error())))
});
