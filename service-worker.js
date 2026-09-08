const CACHE='truper26-v5';
const CORE=['./','./index.html','./styles.css','./app.js','./products.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('truper26-')&&k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(u.origin===location.origin){
   e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request)));return;
 }
 if(/\.(jpg|jpeg|png|webp)$/i.test(u.pathname)){
   e.respondWith(caches.open(CACHE).then(async c=>{const h=await c.match(e.request);if(h)return h;try{const r=await fetch(e.request,{mode:'no-cors'});await c.put(e.request,r.clone());return r}catch{return new Response('',{status:504})}}))
 }
});