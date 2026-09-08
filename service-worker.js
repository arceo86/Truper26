const C='truper26-v3';
const CORE=['./','./index.html','./styles.css','./app.js','./products.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
 self.clients.claim(),
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('truper26-')&&k!==C).map(k=>caches.delete(k))))
])));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.origin===location.origin){
   e.respondWith(fetch(e.request).then(r=>{if(r.ok){const x=r.clone();caches.open(C).then(c=>c.put(e.request,x))}return r}).catch(()=>caches.match(e.request)));return;
 }
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});