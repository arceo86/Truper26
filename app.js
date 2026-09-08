
const PAGE=60;
let IDX=[], MAN=null, results=[], page=0, chunkCache=new Map();
const grid=document.querySelector('#grid'), q=document.querySelector('#q'), stats=document.querySelector('#stats'), pl=document.querySelector('#pageLabel');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(v??0);
async function getChunk(id){if(chunkCache.has(id))return chunkCache.get(id);let p=fetch(`data/p${String(id).padStart(3,'0')}.json`).then(r=>r.json());chunkCache.set(id,p);return p}
async function getProduct(ref){let ch=await getChunk(ref.ch);return ch[ref.o]}
async function cacheImg(url){if(!('caches'in window))return;try{let c=await caches.open('ferrepocket-truper-img-v3');if(!(await c.match(url))){let r=await fetch(url,{mode:'no-cors'});await c.put(url,r)}}catch(e){}}
function tryImg(img,urls,i,b,ph){if(i>=urls.length){img.style.display='none';ph.style.display='flex';b.textContent='SIN FOTO';b.className='badge bad';return}b.textContent=`FOTO ${i+1}`;b.className='badge try';img.onload=()=>{b.textContent='OK';b.className='badge ok';cacheImg(urls[i])};img.onerror=()=>tryImg(img,urls,i+1,b,ph);img.src=urls[i]}
function makeCard(p){let e=document.createElement('article');e.className='card';let pr=p.precios;e.innerHTML=`<div class="pic"><img loading="lazy"><div class="ph">Sin imagen<br><small>${esc(p.clave)}</small></div></div><div class="body"><div class="meta"><b>${esc(p.clave)}</b><span>#${esc(p.codigo)}</span></div><div class="desc">${esc(p.descripcion)}</div><div class="prices"><span>D <b>${money(pr[0])}</b></span><span>M <b>${money(pr[1])}</b></span><span>MM <b>${money(pr[2])}</b></span><span>P <b>${money(pr[3])}</b></span></div><span class="badge">PENDIENTE</span></div>`;tryImg(e.querySelector('img'),p.imgs,0,e.querySelector('.badge'),e.querySelector('.ph'));return e}
async function render(){grid.innerHTML='';let pages=Math.max(1,Math.ceil(results.length/PAGE));page=Math.min(page,pages-1);let refs=results.slice(page*PAGE,(page+1)*PAGE);let ps=await Promise.all(refs.map(getProduct));ps.forEach(p=>grid.appendChild(makeCard(p)));pl.textContent=`Página ${page+1} de ${pages}`;stats.textContent=`${results.length.toLocaleString('es-MX')} de ${MAN.products.toLocaleString('es-MX')} productos`;scrollTo({top:0,behavior:'instant'})}
function searchNow(){let s=q.value.trim().toLowerCase();results=!s?IDX:IDX.filter(x=>(x.c+' '+x.k+' '+x.d+' '+x.b).toLowerCase().includes(s));page=0;render()}
q.addEventListener('input',()=>{clearTimeout(window._s);window._s=setTimeout(searchNow,100)});
document.querySelector('#prev').onclick=()=>{if(page>0){page--;render()}};
document.querySelector('#next').onclick=()=>{if((page+1)*PAGE<results.length){page++;render()}};
Promise.all([fetch('manifest.json').then(r=>r.json()),fetch('search-index.json').then(r=>r.json())]).then(([m,i])=>{MAN=m;IDX=i;results=IDX;render()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
