const CACHE='truper26-v4';
const CORE=['./','./index.html','./styles.css','./app.js','./products.json'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k.startsWith('truper26-')&&k!==CACHE).map(k=>caches.delete(k))
    ))
  ]));
});

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);

  if(url.origin===location.origin){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){
            const clone=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,clone));
          }
          return response;
        })
        .catch(()=>caches.match(event.request))
    );
    return;
  }

  if(/\.(jpg|jpeg|png|webp)$/i.test(url.pathname)){
    event.respondWith(
      caches.open(CACHE).then(async cache=>{
        const hit=await cache.match(event.request);
        if(hit)return hit;
        try{
          const response=await fetch(event.request,{mode:'no-cors'});
          await cache.put(event.request,response.clone());
          return response;
        }catch{
          return new Response('',{status:504});
        }
      })
    );
  }
});
