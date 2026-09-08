const STEP=40, LABELS=['Distribuidor','Mayoreo','Medio mayoreo','Público'], SHORT=['D','M','MM','P'];
let ALL=[],filtered=[],visible=STEP,category='Todos',listView=false,priceMode=3,cameraStream=null;
let filters={min:null,max:null,onlyImage:false,brands:new Set()};
const $=s=>document.querySelector(s);
const grid=$('#grid'),q=$('#q'),chips=$('#categoryChips'),stats=$('#stats'),empty=$('#empty'),suggestions=$('#suggestions');
const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v)||0);
let fav=new Set(JSON.parse(localStorage.getItem('truper26-favs')||'[]'));
let cart=JSON.parse(localStorage.getItem('truper26-cart')||'{}');
let history=JSON.parse(localStorage.getItem('truper26-history')||'[]');
let compare=new Set(JSON.parse(localStorage.getItem('truper26-compare')||'[]'));

function categoryOf(p){
 if(p._cat)return p._cat;
 const t=normalize(`${p.descripcion||''} ${p.clave||''} ${p.categoria||''}`);
 const rules=[
 ['Eléctrico',/electr|volt|cable|contacto|apagador|extension|multimet|foco|lampara|amper/],
 ['Plomería',/plomer|tubo|valvula|llave.*agua|manguera|regadera|sanitario|grifo|hidraul|bomba.*agua/],
 ['Construcción',/cement|concret|albañ|cincel|marro|carretilla|nivel|mezcl|llana|cuchara|pala/],
 ['Jardinería',/jardin|poda|machete|azadon|rastrillo|aspersor|riego|desbroz/],
 ['Automotriz',/automotr|gato|matraca|bujia|mecan|llanta|aceite|compresor|dado/],
 ['Seguridad',/guante|casco|lente|proteccion|respirador|mascar|chaleco|seguridad/],
 ['Ferretería',/tornillo|abrazadera|tuerca|rondana|remache|cadena|candado|bisagra|gancho|armella|clavo/],
 ['Herramientas',/martillo|pinza|desarmador|llave|taladro|sierra|cortador|broca|punzon|cuchillo|herramient/]
 ];for(const [n,re] of rules)if(re.test(t))return p._cat=n;return p._cat='Otros'
}
function searchBlob(p){return p._search||(p._search=normalize([p.codigo,p.clave,p.descripcion,p.codigo_barras,p.marca,categoryOf(p)].join(' ')))}
function imageUrls(p){return p.imgs||[p.imagen].filter(Boolean)}
function imageOf(p){return imageUrls(p)[0]||''}
function findP(code){return ALL.find(p=>String(p.codigo)===String(code))}
function productBrand(p){return String(p.marca||'TRUPER').trim()||'TRUPER'}
function currentPrice(p){return Number(p.precios?.[priceMode]||0)}

function persist(){
 localStorage.setItem('truper26-favs',JSON.stringify([...fav]));
 localStorage.setItem('truper26-cart',JSON.stringify(cart));
 localStorage.setItem('truper26-history',JSON.stringify(history.slice(0,30)));
 localStorage.setItem('truper26-compare',JSON.stringify([...compare]));
 $('#favCount').textContent=fav.size;
 const qty=Object.values(cart).reduce((s,x)=>s+(x.qty||0),0);
 $('#cartCount').textContent=qty;$('#quickCartCount').textContent=`${qty} ${qty===1?'producto':'productos'}`;
 $('#compareCount').textContent=`${compare.size} seleccionados`;
}
function addHistory(p){history=history.filter(x=>String(x)!==String(p.codigo));history.unshift(String(p.codigo));history=history.slice(0,30);persist()}

function tryImg(img,urls,i,ph,state){
 if(!urls||i>=urls.length){img.style.display='none';ph.style.display='flex';state.textContent='Sin foto';state.className='photo-state bad';return}
 img.onload=()=>{state.textContent='Foto disponible';state.className='photo-state'};
 img.onerror=()=>tryImg(img,urls,i+1,ph,state);img.src=urls[i]
}
function priceHTML(p){
 const pr=p.precios||[],minis=[0,1,2,3].filter(i=>i!==priceMode).map(i=>`<div><small>${SHORT[i]}</small><b>${money(pr[i])}</b></div>`).join('');
 return `<div class="price-main"><span>${LABELS[priceMode]}</span><b>${money(pr[priceMode])}</b></div><div class="mini-prices">${minis}</div>`
}
function card(p){
 const code=String(p.codigo),e=document.createElement('article');e.className='card';
 e.innerHTML=`<span class="brand-pill">${esc(productBrand(p))}</span>
 <button class="heart ${fav.has(code)?'on':''}" data-fav="${esc(code)}">${fav.has(code)?'♥':'♡'}</button>
 <button class="compare-check ${compare.has(code)?'on':''}" data-compare="${esc(code)}">${compare.has(code)?'✓ CMP':'CMP'}</button>
 <div class="pic"><img loading="lazy" decoding="async" alt="${esc(p.descripcion)}"><div class="ph">Imagen no disponible</div></div>
 <div class="card-body"><div class="meta"><span class="key">${esc(p.clave)}</span><span class="code">#${esc(code)}</span></div>
 <div class="desc">${esc(p.descripcion)}</div>${priceHTML(p)}<div class="photo-state">Cargando foto…</div>
 <div class="card-actions"><button class="details" data-detail="${esc(code)}">Ver detalles</button><button class="add ${cart[code]?'added':''}" data-add="${esc(code)}">${cart[code]?'Agregado ✓':'Agregar'}</button></div></div>`;
 tryImg(e.querySelector('img'),imageUrls(p),0,e.querySelector('.ph'),e.querySelector('.photo-state'));return e
}

function candidateProducts(){
 const term=normalize(q.value.trim());
 return ALL.filter(p=>{
   if(term&&!searchBlob(p).includes(term))return false;
   if(category!=='Todos'&&categoryOf(p)!==category)return false;
   const price=currentPrice(p);
   if(filters.min!=null&&price<filters.min)return false;
   if(filters.max!=null&&price>filters.max)return false;
   if(filters.onlyImage&&!imageOf(p))return false;
   if(filters.brands.size&&!filters.brands.has(productBrand(p)))return false;
   return true;
 })
}
function apply(reset=true){
 filtered=candidateProducts();
 const sort=$('#sort').value;
 if(sort==='priceAsc')filtered.sort((a,b)=>currentPrice(a)-currentPrice(b));
 else if(sort==='priceDesc')filtered.sort((a,b)=>currentPrice(b)-currentPrice(a));
 else if(sort==='key')filtered.sort((a,b)=>String(a.clave).localeCompare(String(b.clave)));
 else if(q.value.trim()){
   const t=normalize(q.value.trim());
   filtered.sort((a,b)=>score(b,t)-score(a,t));
 }
 if(reset)visible=STEP;render()
}
function score(p,t){
 const k=normalize(p.clave),c=normalize(p.codigo),d=normalize(p.descripcion);
 if(k===t||c===t)return 100;if(k.startsWith(t)||c.startsWith(t))return 80;if(k.includes(t))return 60;if(d.startsWith(t))return 40;return 10
}
function render(){
 grid.innerHTML='';filtered.slice(0,visible).forEach(p=>grid.appendChild(card(p)));
 stats.textContent=`${filtered.length.toLocaleString('es-MX')} productos`;
 $('#resultContext').textContent=category!=='Todos'?category:'Catálogo completo';
 empty.hidden=filtered.length>0;$('#loadMore').hidden=visible>=filtered.length;renderApplied();persist()
}

function buildCategories(){['Todos','Herramientas','Ferretería','Eléctrico','Plomería','Construcción','Jardinería','Automotriz','Seguridad','Otros'].forEach(name=>{let b=document.createElement('button');b.className='chip'+(name==='Todos'?' active':'');b.textContent=name;b.onclick=()=>{category=name;[...chips.children].forEach(x=>x.classList.toggle('active',x===b));apply()};chips.appendChild(b)})}
function buildBrands(){
 const counts={};ALL.forEach(p=>counts[productBrand(p)]=(counts[productBrand(p)]||0)+1);
 $('#brandOptions').innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([b,n])=>`<label class="brandcheck"><input type="checkbox" data-brand="${esc(b)}"> ${esc(b)} <small>(${n})</small></label>`).join('')
}
function activeFilterCount(){let n=0;if(filters.min!=null)n++;if(filters.max!=null)n++;if(filters.onlyImage)n++;n+=filters.brands.size;if(priceMode!==3)n++;return n}
function renderApplied(){
 const a=[];
 if(priceMode!==3)a.push({k:'priceMode',t:`Precio: ${LABELS[priceMode]}`});
 if(filters.min!=null)a.push({k:'min',t:`Desde ${money(filters.min)}`});
 if(filters.max!=null)a.push({k:'max',t:`Hasta ${money(filters.max)}`});
 if(filters.onlyImage)a.push({k:'image',t:'Con imagen'});
 filters.brands.forEach(b=>a.push({k:'brand:'+b,t:b}));
 const wrap=$('#appliedFilters');wrap.hidden=!a.length;wrap.innerHTML=a.map(x=>`<button class="applied-chip" data-remove-filter="${esc(x.k)}">${esc(x.t)} <b>×</b></button>`).join('');
 const fc=activeFilterCount(),badge=$('#filterCount');badge.hidden=!fc;badge.textContent=fc
}
function updatePreview(){
 const old=filtered;const c=candidateProducts().length;$('#previewCount').textContent=c.toLocaleString('es-MX');filtered=old
}

/* SEARCH SUGGESTIONS */
function updateSuggestions(){
 const t=normalize(q.value.trim());if(t.length<2){suggestions.hidden=true;return}
 const list=ALL.filter(p=>searchBlob(p).includes(t)).sort((a,b)=>score(b,t)-score(a,t)).slice(0,6);
 if(!list.length){suggestions.hidden=true;return}
 suggestions.innerHTML=list.map(p=>`<button class="suggestion" data-suggest="${esc(p.codigo)}"><strong>${esc(p.clave)}</strong><span>${esc(p.descripcion)}</span></button>`).join('');suggestions.hidden=false
}
suggestions.onclick=e=>{const b=e.target.closest('[data-suggest]');if(!b)return;const p=findP(b.dataset.suggest);q.value=p.clave;suggestions.hidden=true;apply();openProduct(p)};

/* PRODUCT */
function openProduct(p){if(!p)return;addHistory(p);const pr=p.precios||[];$('#productBody').innerHTML=`<img class="detail-img" src="${esc(imageOf(p))}" alt=""><span class="detail-brand">${esc(productBrand(p))}</span><div class="detail-head"><h2>${esc(p.clave)}</h2><span>#${esc(p.codigo)}</span></div><p class="detail-desc">${esc(p.descripcion)}</p><div class="detail-prices">${[0,1,2,3].map(i=>`<div class="${i===3?'public':''}"><small>${LABELS[i]}</small><b>${money(pr[i])}</b></div>`).join('')}</div><div class="detail-meta">Categoría: ${esc(categoryOf(p))}<br>Marca: ${esc(productBrand(p))}<br>Código de barras: ${esc(p.codigo_barras||'No disponible')}</div><div class="detail-actions"><button class="detail-copy" data-copy="${esc(p.codigo)}">Copiar datos</button><button class="detail-add" data-add-detail="${esc(p.codigo)}">${cart[String(p.codigo)]?'Agregado ✓':'Agregar'}</button>${p.ficha?`<a class="official-link" href="${esc(p.ficha)}" target="_blank" rel="noopener">Ficha oficial Truper</a>`:''}</div>`;$('#productModal').hidden=false;document.body.style.overflow='hidden'}
function closeModal(id){$(id).hidden=true;document.body.style.overflow=''}

/* CART */
function addCart(p){const c=String(p.codigo);cart[c]?cart[c].qty++:cart[c]={qty:1};persist();render();renderCart()}
function changeQty(c,d){if(!cart[c])return;cart[c].qty+=d;if(cart[c].qty<=0)delete cart[c];persist();renderCart();render()}
function renderCart(){
 const entries=Object.entries(cart).filter(([c])=>findP(c));
 const qty=entries.reduce((s,[,x])=>s+x.qty,0);$('#cartSubtitle').textContent=`${qty} ${qty===1?'producto':'productos'}`;
 const body=$('#cartBody'),summary=$('#cartSummary');if(!entries.length){body.innerHTML='<div class="empty-cart"><h3>Tu selección está vacía</h3><p>Agrega productos desde el catálogo.</p></div>';summary.hidden=true;return}
 let total=0;body.innerHTML=entries.map(([c,it])=>{const p=findP(c),price=currentPrice(p),line=price*it.qty;total+=line;return `<div class="cart-row"><img src="${esc(imageOf(p))}" alt=""><div class="cart-info"><strong>${esc(p.clave)}</strong><span class="cart-desc">${esc(p.descripcion)}</span><span class="cart-price">${LABELS[priceMode]}: ${money(price)}</span></div><div class="cart-controls"><div class="qty"><button data-minus="${esc(c)}">−</button><span>${it.qty}</span><button data-plus="${esc(c)}">+</button></div><div class="line-total"><small>Subtotal</small><b>${money(line)}</b><button class="remove-item" data-remove-cart="${esc(c)}">Eliminar</button></div></div></div>`}).join('');
 $('#cartTotal').textContent=money(total);summary.hidden=false
}
function openCart(){renderCart();$('#cartModal').hidden=false;document.body.style.overflow='hidden'}

/* COMPARE */
function toggleCompare(c){c=String(c);if(compare.has(c))compare.delete(c);else{if(compare.size>=3){alert('Puedes comparar hasta 3 productos a la vez.');return}compare.add(c)}persist();render()}
function openCompare(){
 const ps=[...compare].map(findP).filter(Boolean),body=$('#compareBody');if(!ps.length){body.innerHTML='<div class="empty-cart"><h3>No hay productos para comparar</h3><p>Toca CMP en una tarjeta para agregar hasta 3 productos.</p></div>'}
 else{const cols=ps.length;body.innerHTML=`<div class="compare-scroll"><div class="compare-table" style="--cols:${cols}"><div class="compare-head"><div></div>${ps.map(p=>`<div><img src="${esc(imageOf(p))}"><strong>${esc(p.clave)}</strong><br><button class="compare-remove" data-remove-compare="${esc(p.codigo)}">Quitar</button></div>`).join('')}</div>${[['Código','codigo'],['Descripción','descripcion'],['Distribuidor',0],['Mayoreo',1],['Medio mayoreo',2],['Público',3]].map(([label,k])=>`<div class="compare-line"><div class="compare-label">${label}</div>${ps.map(p=>`<div class="${typeof k==='number'?'compare-price':''}">${typeof k==='number'?money(p.precios?.[k]):esc(p[k])}</div>`).join('')}</div>`).join('')}</div></div>`}
 $('#compareModal').hidden=false;document.body.style.overflow='hidden'
}

/* HISTORY */
function openHistory(){const ps=history.map(findP).filter(Boolean);$('#historyBody').innerHTML=ps.length?ps.map(p=>`<div class="history-item"><img src="${esc(imageOf(p))}"><div><strong>${esc(p.clave)}</strong><small>${esc(p.descripcion)}</small><small>${money(p.precios?.[3])}</small></div><button data-history-open="${esc(p.codigo)}">Abrir</button></div>`).join(''):'<div class="empty-cart"><h3>Aún no hay historial</h3><p>Los productos que abras aparecerán aquí.</p></div>';$('#historyModal').hidden=false;document.body.style.overflow='hidden'}

/* FILTERS */
function openFilters(){
 $('#minPrice').value=filters.min??'';$('#maxPrice').value=filters.max??'';$('#onlyImage').checked=filters.onlyImage;
 [...document.querySelectorAll('[data-price-mode]')].forEach(b=>b.classList.toggle('active',Number(b.dataset.priceMode)===priceMode));
 [...document.querySelectorAll('[data-brand]')].forEach(x=>x.checked=filters.brands.has(x.dataset.brand));updatePreview();$('#filterModal').hidden=false;document.body.style.overflow='hidden'
}
function readDraftFilters(){filters.min=$('#minPrice').value===''?null:Math.max(0,Number($('#minPrice').value)||0);filters.max=$('#maxPrice').value===''?null:Math.max(0,Number($('#maxPrice').value)||0);if(filters.max!=null&&filters.min!=null&&filters.max<filters.min)[filters.min,filters.max]=[filters.max,filters.min];filters.onlyImage=$('#onlyImage').checked;filters.brands=new Set([...document.querySelectorAll('[data-brand]:checked')].map(x=>x.dataset.brand))}
function resetFilters(){filters={min:null,max:null,onlyImage:false,brands:new Set()};priceMode=3;category='Todos';[...chips.children].forEach((x,i)=>x.classList.toggle('active',i===0));apply()}

/* SCANNER */
async function openScanner(){const m=$('#scannerModal'),v=$('#video'),s=$('#scanStatus');m.hidden=false;document.body.style.overflow='hidden';if(!navigator.mediaDevices?.getUserMedia){s.textContent='Cámara no disponible.';return}try{cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});v.srcObject=cameraStream;if('BarcodeDetector'in window){const d=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e']});const loop=async()=>{if(m.hidden)return;try{const c=await d.detect(v);if(c.length){q.value=c[0].rawValue;closeScanner();apply();return}}catch{}requestAnimationFrame(loop)};loop()}else s.textContent='Tu navegador no incluye detección automática de códigos.'}catch{s.textContent='No fue posible abrir la cámara. Revisa el permiso.'}}
function closeScanner(){$('#scannerModal').hidden=true;document.body.style.overflow='';if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}}

/* EVENTS */
grid.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.fav){const c=String(b.dataset.fav);fav.has(c)?fav.delete(c):fav.add(c);persist();render()}if(b.dataset.compare)toggleCompare(b.dataset.compare);if(b.dataset.detail)openProduct(findP(b.dataset.detail));if(b.dataset.add)addCart(findP(b.dataset.add))};
q.oninput=()=>{clearTimeout(window._st);window._st=setTimeout(()=>{apply();updateSuggestions()},80)};$('#clearSearch').onclick=()=>{q.value='';suggestions.hidden=true;apply();q.focus()};
$('#sort').onchange=()=>apply(false);$('#viewToggle').onclick=()=>{listView=!listView;grid.classList.toggle('list',listView);$('#viewToggle').textContent=listView?'☷':'▦'};
$('#loadMore').onclick=()=>{visible+=STEP;render()};$('#hideQuick').onclick=()=>$('#quickPanel').hidden=true;$('#filterBtn').onclick=openFilters;
document.querySelectorAll('[data-price-mode]').forEach(b=>b.onclick=()=>{priceMode=Number(b.dataset.priceMode);document.querySelectorAll('[data-price-mode]').forEach(x=>x.classList.toggle('active',x===b));readDraftFilters();updatePreview()});
['#minPrice','#maxPrice','#onlyImage'].forEach(s=>$(s).addEventListener('input',()=>{readDraftFilters();updatePreview()}));$('#brandOptions').addEventListener('change',()=>{readDraftFilters();updatePreview()});
$('#applyFilters').onclick=()=>{readDraftFilters();closeModal('#filterModal');apply()};$('#clearFilters').onclick=()=>{filters={min:null,max:null,onlyImage:false,brands:new Set()};priceMode=3;openFilters();updatePreview()};
$('#appliedFilters').onclick=e=>{const b=e.target.closest('[data-remove-filter]');if(!b)return;const k=b.dataset.removeFilter;if(k==='priceMode')priceMode=3;if(k==='min')filters.min=null;if(k==='max')filters.max=null;if(k==='image')filters.onlyImage=false;if(k.startsWith('brand:'))filters.brands.delete(k.slice(6));apply()};
$('#resetEmpty').onclick=resetFilters;

$('#favTop').onclick=$('#quickFavorites').onclick=$('#navFavs').onclick=()=>{filtered=ALL.filter(p=>fav.has(String(p.codigo)));visible=STEP;category='Todos';q.value='';render();$('#resultContext').textContent='Favoritos';scrollTo({top:0,behavior:'smooth'})};
$('#cartTop').onclick=$('#quickCart').onclick=openCart;$('#quickCompare').onclick=openCompare;$('#quickHistory').onclick=$('#navHistory').onclick=openHistory;
$('#navHome').onclick=()=>{q.value='';resetFilters();scrollTo({top:0,behavior:'smooth'})};$('#navCats').onclick=()=>{scrollTo({top:0,behavior:'smooth'});setTimeout(()=>chips.scrollIntoView({behavior:'smooth'}),100)};
$('#navMore').onclick=()=>{$('#moreModal').hidden=false;document.body.style.overflow='hidden'};$('#scanBtn').onclick=openScanner;$('#toTop').onclick=()=>scrollTo({top:0,behavior:'smooth'});addEventListener('scroll',()=>$('#toTop').classList.toggle('show',scrollY>450));

$('#productModal').onclick=async e=>{if(e.target.hasAttribute('data-close-product'))return closeModal('#productModal');const cp=e.target.closest('[data-copy]');if(cp){const p=findP(cp.dataset.copy),t=`${p.clave} | ${p.descripcion} | D ${money(p.precios?.[0])} | M ${money(p.precios?.[1])} | MM ${money(p.precios?.[2])} | P ${money(p.precios?.[3])}`;try{await navigator.clipboard.writeText(t);cp.textContent='Copiado ✓'}catch{}}const a=e.target.closest('[data-add-detail]');if(a){addCart(findP(a.dataset.addDetail));a.textContent='Agregado ✓'}};
$('#cartBody').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.minus)changeQty(String(b.dataset.minus),-1);if(b.dataset.plus)changeQty(String(b.dataset.plus),1);if(b.dataset.removeCart){delete cart[String(b.dataset.removeCart)];persist();renderCart();render()}};
$('#clearCart').onclick=()=>{cart={};persist();renderCart();render()};$('#copyCart').onclick=async()=>{const lines=Object.entries(cart).map(([c,it])=>{const p=findP(c);return p?`${it.qty} x ${p.clave} - ${p.descripcion} - ${money(currentPrice(p))}`:''}).filter(Boolean);try{await navigator.clipboard.writeText(lines.join('\n'));$('#copyCart').textContent='Copiado ✓'}catch{}};
$('#compareBody').onclick=e=>{const b=e.target.closest('[data-remove-compare]');if(b){compare.delete(String(b.dataset.removeCompare));persist();openCompare();render()}};
$('#historyBody').onclick=e=>{const b=e.target.closest('[data-history-open]');if(b){closeModal('#historyModal');openProduct(findP(b.dataset.historyOpen))}};

['filter','cart','compare','history','more'].forEach(n=>{const id='#'+n+'Modal';const attr='data-close-'+n;$(id).addEventListener('click',e=>{if(e.target.hasAttribute(attr))closeModal(id)})});
$('#scannerModal').onclick=e=>{if(e.target.hasAttribute('data-close-scanner'))closeScanner()};

function skeleton(){grid.innerHTML=Array.from({length:8},()=>'<article class="card"><div class="pic skeleton"></div><div class="card-body"><div class="skeleton" style="height:18px;border-radius:6px;margin-bottom:7px"></div><div class="skeleton" style="height:39px;border-radius:7px;margin-bottom:7px"></div><div class="skeleton" style="height:45px;border-radius:8px"></div></div></article>').join('')}
skeleton();
fetch('products.json').then(r=>r.json()).then(d=>{ALL=d;filtered=ALL;buildCategories();buildBrands();persist();render()}).catch(()=>{stats.textContent='Error cargando products.json';grid.innerHTML=''});
if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});