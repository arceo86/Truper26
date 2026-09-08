const STEP=40;
let ALL=[],filtered=[],visible=STEP,category='Todos',showFavs=false,listView=false,priceMode=3,stream=null;
const $=s=>document.querySelector(s),grid=$('#grid'),q=$('#q'),stats=$('#stats'),chips=$('#chips'),empty=$('#empty'),loadMore=$('#loadMore'),modal=$('#modal');
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v)||0);
const LABELS=['Distribuidor','Mayoreo','Medio mayoreo','Público'],SHORT=['D','M','MM','P'];
let fav=new Set(JSON.parse(localStorage.getItem('truper26-favs')||'[]'));

function inferCategory(p){
 const t=normalize((p.descripcion||'')+' '+(p.clave||'')+' '+(p.categoria||''));
 const rules=[
 ['Eléctrico',/electr|volt|cable|contacto|apagador|extension|multimet|pinza amper|foco|lampara/],
 ['Plomería',/plomer|tubo|conexion|valvula|llave.*agua|manguera|regadera|sanitario|grifo|bomba.*agua/],
 ['Construcción',/cement|concret|albañ|cincel|marro|carretilla|nivel|mezcl|llana|cuchara|pala/],
 ['Jardinería',/jardin|poda|machete|azadon|rastrillo|aspersor|riego|tijera.*poda|desbroz/],
 ['Automotriz',/automotr|gato|dado|matraca|bujia|mecan|llanta|aceite|compresor/],
 ['Seguridad',/guante|casco|lente|proteccion|respirador|mascar|chaleco|seguridad/],
 ['Ferretería',/tornillo|abrazadera|tuerca|rondana|remache|cadena|candado|bisagra|gancho|armella|clavo/],
 ['Herramientas',/martillo|pinza|desarmador|llave|taladro|sierra|cortador|broca|punzon|cuchillo|herramient/]
 ];
 for(const [name,re] of rules)if(re.test(t))return name;
 return 'Otros';
}
function searchBlob(p){if(!p._s)p._s=normalize([p.codigo,p.clave,p.descripcion,p.codigo_barras,inferCategory(p)].join(' '));return p._s}
function saveFav(){localStorage.setItem('truper26-favs',JSON.stringify([...fav]));$('#favCount').textContent=fav.size}
function imageUrls(p){return p.imgs||[p.imagen].filter(Boolean)}
function setImage(img,urls,i,ph,status){
 if(!urls||i>=urls.length){img.style.display='none';ph.style.display='flex';status.textContent='Sin foto';status.className='photo-bad';return}
 img.onload=()=>{status.textContent='Foto disponible';status.className='photo-ok'};
 img.onerror=()=>setImage(img,urls,i+1,ph,status);img.src=urls[i]
}
function priceHTML(pr){
 const primary=Number(pr?.[priceMode]||0);
 let minis=[0,1,2,3].filter(i=>i!==priceMode).map(i=>`<div><small>${SHORT[i]}</small><b>${money(pr?.[i])}</b></div>`).join('');
 return `<div class="main-price"><span>${LABELS[priceMode]}</span><b>${money(primary)}</b></div><div class="mini-prices">${minis}</div>`
}
function card(p){
 const e=document.createElement('article');e.className='card';const on=fav.has(String(p.codigo));
 e.innerHTML=`<div class="pic"><button class="heart ${on?'on':''}" data-fav="${esc(p.codigo)}">${on?'♥':'♡'}</button><img loading="lazy" decoding="async" alt="${esc(p.descripcion)}"><div class="ph">Imagen no disponible</div></div>
 <div class="body"><div class="meta"><span class="key">${esc(p.clave)}</span><span class="code">#${esc(p.codigo)}</span></div><div class="desc">${esc(p.descripcion)}</div>${priceHTML(p.precios)}
 <div class="cardfoot"><span class="photo-ok">Cargando…</span><button class="details" data-detail="${esc(p.codigo)}">Ver ficha</button></div></div>`;
 setImage(e.querySelector('img'),imageUrls(p),0,e.querySelector('.ph'),e.querySelector('.photo-ok'));return e
}
function render(reset=false){
 if(reset){visible=STEP;grid.innerHTML=''}else grid.innerHTML='';
 const items=filtered.slice(0,visible);items.forEach(p=>grid.appendChild(card(p)));
 stats.textContent=`${filtered.length.toLocaleString('es-MX')} productos`;
 $('#filterText').textContent=[showFavs?'Favoritos':'',category!=='Todos'?category:''].filter(Boolean).join(' · ');
 empty.hidden=filtered.length>0;loadMore.hidden=visible>=filtered.length;saveFav()
}
function apply(){
 const s=normalize(q.value.trim());
 filtered=ALL.filter(p=>{
  const hit=!s||searchBlob(p).includes(s);
  const cat=category==='Todos'||inferCategory(p)===category;
  const f=!showFavs||fav.has(String(p.codigo));return hit&&cat&&f
 });
 const sort=$('#sort').value;
 if(sort==='priceAsc')filtered.sort((a,b)=>(a.precios?.[priceMode]||0)-(b.precios?.[priceMode]||0));
 else if(sort==='priceDesc')filtered.sort((a,b)=>(b.precios?.[priceMode]||0)-(a.precios?.[priceMode]||0));
 else if(sort==='key')filtered.sort((a,b)=>String(a.clave).localeCompare(String(b.clave)));
 render(true)
}
function buildCategories(){
 const names=['Todos','Herramientas','Ferretería','Eléctrico','Plomería','Construcción','Jardinería','Automotriz','Seguridad','Otros'];
 names.forEach(name=>{const b=document.createElement('button');b.className='chip'+(name==='Todos'?' active':'');b.textContent=name;b.onclick=()=>{category=name;showFavs=false;[...chips.children].forEach(x=>x.classList.toggle('active',x===b));apply()};chips.appendChild(b)})
}
function find(code){return ALL.find(p=>String(p.codigo)===String(code))}
function openDetail(p){
 const pr=p.precios||[],$b=$('#modalBody'),img=imageUrls(p)[0]||'';
 $b.innerHTML=`<img class="detail-img" src="${esc(img)}" alt="${esc(p.descripcion)}"><div class="detail-head"><h2 class="detail-title">${esc(p.clave)}</h2><span class="detail-code">#${esc(p.codigo)}</span></div><p class="detail-desc">${esc(p.descripcion)}</p>
 <div class="detail-prices">${[0,1,2,3].map(i=>`<div class="${i===3?'public':''}"><span>${LABELS[i]}</span><b>${money(pr[i])}</b></div>`).join('')}</div>
 <div class="detail-meta">Categoría: ${esc(inferCategory(p))}<br>Marca: ${esc(p.marca||'TRUPER')}<br>Código de barras: ${esc(p.codigo_barras||'No disponible')}</div>
 <div class="detail-actions"><button class="copy-detail" data-copy-detail="${esc(p.codigo)}">Copiar datos</button>${p.ficha?`<a class="official-link" href="${esc(p.ficha)}" target="_blank" rel="noopener">Ficha Truper</a>`:''}</div>`;
 modal.hidden=false;document.body.style.overflow='hidden'
}
grid.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fav){const c=String(b.dataset.fav);fav.has(c)?fav.delete(c):fav.add(c);saveFav();render()}
 if(b.dataset.detail)openDetail(find(b.dataset.detail))
});
modal.addEventListener('click',async e=>{
 if(e.target.hasAttribute('data-close')){modal.hidden=true;document.body.style.overflow='';return}
 const b=e.target.closest('[data-copy-detail]');if(b){const p=find(b.dataset.copyDetail),t=`${p.clave} | ${p.descripcion} | D ${money(p.precios?.[0])} | M ${money(p.precios?.[1])} | MM ${money(p.precios?.[2])} | P ${money(p.precios?.[3])}`;try{await navigator.clipboard.writeText(t);b.textContent='Copiado ✓'}catch{}}
});
q.addEventListener('input',()=>{clearTimeout(window._search);window._search=setTimeout(apply,90)});
$('#clear').onclick=()=>{q.value='';apply();q.focus()};
$('#sort').onchange=apply;
$('#priceMode').onchange=()=>{priceMode=Number($('#priceMode').value);apply()};
$('#view').onclick=()=>{listView=!listView;grid.classList.toggle('list',listView);$('#view').textContent=listView?'☷':'▦'};
loadMore.onclick=()=>{visible+=STEP;render();};
function favoritesMode(){showFavs=true;category='Todos';[...chips.children].forEach(x=>x.classList.remove('active'));apply()}
$('#favs').onclick=$('#favTop').onclick=favoritesMode;
$('#home').onclick=()=>{showFavs=false;category='Todos';q.value='';[...chips.children].forEach((x,i)=>x.classList.toggle('active',i===0));apply()};
$('#cats').onclick=()=>{scrollTo({top:0,behavior:'smooth'});setTimeout(()=>chips.scrollIntoView({behavior:'smooth'}),150)};
$('#up').onclick=$('#top').onclick=()=>scrollTo({top:0,behavior:'smooth'});
addEventListener('scroll',()=>$('#top').classList.toggle('show',scrollY>450));

async function startScanner(){
 const sc=$('#scanner'),video=$('#video'),status=$('#scanStatus');
 if(!navigator.mediaDevices?.getUserMedia){alert('La cámara no está disponible en este navegador.');return}
 sc.hidden=false;document.body.style.overflow='hidden';
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
  video.srcObject=stream;
  if('BarcodeDetector'in window){
   const detector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e']});
   const loop=async()=>{if(sc.hidden)return;try{const codes=await detector.detect(video);if(codes.length){q.value=codes[0].rawValue;stopScanner();apply();return}}catch{}requestAnimationFrame(loop)};loop()
  }else status.textContent='Tu navegador permite cámara, pero no detección automática. Usa búsqueda manual.'
 }catch{status.textContent='No fue posible abrir la cámara. Revisa el permiso del navegador.'}
}
function stopScanner(){const sc=$('#scanner');sc.hidden=true;document.body.style.overflow='';if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
$('#scanBtn').onclick=startScanner;$('#scanner').addEventListener('click',e=>{if(e.target.hasAttribute('data-scan-close'))stopScanner()});

function skeletons(){grid.innerHTML=Array.from({length:8},()=>'<article class="card"><div class="pic skeleton"></div><div class="body"><div class="skeleton" style="height:18px;border-radius:6px;margin-bottom:8px"></div><div class="skeleton" style="height:42px;border-radius:6px"></div></div></article>').join('')}
skeletons();
fetch('products.json').then(r=>r.json()).then(d=>{ALL=d;ALL.forEach(p=>p._cat=inferCategory(p));filtered=ALL;buildCategories();render(true)}).catch(()=>{stats.textContent='Error cargando products.json';grid.innerHTML=''});
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});