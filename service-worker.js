
const STATIC='ferrepocket-truper-static-v3',IMG='ferrepocket-truper-img-v3';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.json','./search-index.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(STATIC).then(c=>c.addAll(CORE))));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{let u=new URL(e.request.url);if(u.hostname.includes('truper.com')&&/\.(jpg|jpeg|png|webp)$/i.test(u.pathname)){e.respondWith(caches.open(IMG).then(async c=>{let h=await c.match(e.request);if(h)return h;try{let r=await fetch(e.request,{mode:'no-cors'});await c.put(e.request,r.clone());return r}catch(_){return new Response('',{status:504})}}));return}e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
