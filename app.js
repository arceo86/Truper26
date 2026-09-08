const PAGE=60;let ALL=[],results=[],page=0,category='Todos',showFavs=false,listView=false;
const $=s=>document.querySelector(s),grid=$('#grid'),q=$('#q'),stats=$('#stats'),pl=$('#pageLabel'),chips=$('#chips'),modal=$('#modal');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v)||0);
let fav=new Set(JSON.parse(localStorage.getItem('truper26-favs')||'[]'));
function saveFav(){localStorage.setItem('truper26-favs',JSON.stringify([...fav]));$('#favCount').textContent=fav.size}
function pcat(p){return String(p.categoria||p.cat||'Otros').trim()||'Otros'}
function image(p){return (p.imgs&&p.imgs[0])||p.imagen||''}
function tryImg(img,urls,i,ph,badge){if(!urls||i>=urls.length){img.style.display='none';ph.style.display='flex';if(badge){badge.textContent='Sin foto';badge.className='badge bad'}return}img.onload=()=>{if(badge)badge.textContent='Imagen oficial'};img.onerror=()=>tryImg(img,urls,i+1,ph,badge);img.src=urls[i]}
function card(p){
 const e=document.createElement('article');e.className='card';const pr=p.precios||[0,0,0,0],on=fav.has(p.codigo);
 e.innerHTML=`<div class="pic"><button class="heart ${on?'on':''}" data-fav="${esc(p.codigo)}">${on?'♥':'♡'}</button><img loading="lazy" alt="${esc(p.descripcion)}"><div class="ph">Imagen no disponible</div></div>
 <div class="body"><div class="meta"><span class="key">${esc(p.clave)}</span><span class="code">#${esc(p.codigo)}</span></div><div class="desc">${esc(p.descripcion)}</div>
 <div class="prices"><div class="price"><small>D</small><b>${money(pr[0])}</b></div><div class="price"><small>M</small><b>${money(pr[1])}</b></div><div class="price"><small>MM</small><b>${money(pr[2])}</b></div><div class="price public"><small>P</small><b>${money(pr[3])}</b></div></div>
 <span class="badge">Cargando foto…</span><div class="card-actions"><button class="details" data-detail="${esc(p.codigo)}">Ver detalles</button><button class="copy" data-copy="${esc(p.codigo)}">Copiar</button></div></div>`;
 const img=e.querySelector('img'),ph=e.querySelector('.ph'),badge=e.querySelector('.badge');tryImg(img,p.imgs||[p.imagen].filter(Boolean),0,ph,badge);return e
}
function apply(){
 let s=q.value.trim().toLowerCase();results=ALL.filter(p=>{
   const hit=!s||(p.codigo+' '+p.clave+' '+p.descripcion+' '+(p.codigo_barras||'')).toLowerCase().includes(s);
   const cat=category==='Todos'||pcat(p)===category;const f=!showFavs||fav.has(p.codigo);return hit&&cat&&f
 });
 const sort=$('#sort').value;if(sort==='priceAsc')results.sort((a,b)=>(a.precios?.[3]||0)-(b.precios?.[3]||0));if(sort==='priceDesc')results.sort((a,b)=>(b.precios?.[3]||0)-(a.precios?.[3]||0));if(sort==='key')results.sort((a,b)=>String(a.clave).localeCompare(String(b.clave)));
 page=0;render()
}
function render(){grid.innerHTML='';let pages=Math.max(1,Math.ceil(results.length/PAGE));page=Math.min(page,pages-1);results.slice(page*PAGE,(page+1)*PAGE).forEach(p=>grid.appendChild(card(p)));stats.textContent=`${results.length.toLocaleString('es-MX')} productos`;$('#filterText').textContent=(showFavs?'Favoritos · ':'')+(category!=='Todos'?category:'');pl.textContent=`${page+1} / ${pages}`;saveFav()}
function buildCats(){let counts={};ALL.forEach(p=>counts[pcat(p)]=(counts[pcat(p)]||0)+1);let top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0]);['Todos',...top].forEach(c=>{let b=document.createElement('button');b.className='chip'+(c==='Todos'?' active':'');b.textContent=c;b.onclick=()=>{category=c;showFavs=false;[...chips.children].forEach(x=>x.classList.toggle('active',x===b));apply()};chips.appendChild(b)})}
function find(code){return ALL.find(p=>String(p.codigo)===String(code))}
function details(p){const pr=p.precios||[];$('#modalBody').innerHTML=`<img class="detail-img" src="${esc(image(p))}" alt=""><h2 id="modalTitle" class="detail-title">${esc(p.clave)} <small>#${esc(p.codigo)}</small></h2><p class="detail-desc">${esc(p.descripcion)}</p><div class="detail-prices"><div>Distribuidor<b>${money(pr[0])}</b></div><div>Mayoreo<b>${money(pr[1])}</b></div><div>Medio mayoreo<b>${money(pr[2])}</b></div><div>Precio público<b>${money(pr[3])}</b></div></div><p class="detail-info">Marca: ${esc(p.marca||'Truper')}<br>Categoría: ${esc(pcat(p))}<br>Código de barras: ${esc(p.codigo_barras||'—')}</p>`;modal.hidden=false;document.body.style.overflow='hidden'}
grid.addEventListener('click',async e=>{let b=e.target.closest('button');if(!b)return;if(b.dataset.fav){fav.has(b.dataset.fav)?fav.delete(b.dataset.fav):fav.add(b.dataset.fav);saveFav();render()}if(b.dataset.detail)details(find(b.dataset.detail));if(b.dataset.copy){let p=find(b.dataset.copy),t=`${p.clave} - ${p.descripcion} - Público ${money(p.precios?.[3])}`;try{await navigator.clipboard.writeText(t);b.textContent='Copiado ✓';setTimeout(()=>b.textContent='Copiar',1000)}catch{}}});
modal.addEventListener('click',e=>{if(e.target.hasAttribute('data-close')){modal.hidden=true;document.body.style.overflow=''}});
q.addEventListener('input',()=>{clearTimeout(window._s);window._s=setTimeout(apply,100)});$('#clear').onclick=()=>{q.value='';apply();q.focus()};$('#sort').onchange=apply;
$('#view').onclick=()=>{listView=!listView;grid.classList.toggle('list',listView);$('#view').textContent=listView?'☷':'▦'};
$('#prev').onclick=()=>{if(page>0){page--;render();scrollTo(0,0)}};$('#next').onclick=()=>{if((page+1)*PAGE<results.length){page++;render();scrollTo(0,0)}};
function favMode(){showFavs=true;category='Todos';[...chips.children].forEach(x=>x.classList.remove('active'));apply()}$('#favs').onclick=favMode;$('#favTop').onclick=favMode;
$('#home').onclick=()=>{showFavs=false;category='Todos';q.value='';[...chips.children].forEach((x,i)=>x.classList.toggle('active',i===0));apply()};$('#cats').onclick=()=>{scrollTo({top:0,behavior:'smooth'});q.focus()};$('#up').onclick=$('#top').onclick=()=>scrollTo({top:0,behavior:'smooth'});
addEventListener('scroll',()=>$('#top').classList.toggle('show',scrollY>500));
fetch('products.json').then(r=>r.json()).then(d=>{ALL=d;results=ALL;buildCats();render()}).catch(e=>stats.textContent='Error cargando products.json');
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});