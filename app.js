const STEP=40;
const LABELS=['Distribuidor','Mayoreo','Medio mayoreo','Público'];
const SHORT=['D','M','MM','P'];

let ALL=[],filtered=[],visible=STEP,category='Todos',showFavs=false,listView=false,priceMode=3;
let cameraStream=null;

const $=s=>document.querySelector(s);
const grid=$('#grid'),q=$('#q'),chips=$('#chips'),stats=$('#stats'),empty=$('#empty'),loadMore=$('#loadMore'),suggestions=$('#suggestions');

const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(v)||0);

let fav=new Set(JSON.parse(localStorage.getItem('truper26-favs')||'[]'));
let cart=JSON.parse(localStorage.getItem('truper26-cart')||'{}');
let history=JSON.parse(localStorage.getItem('truper26-history')||'[]');

function inferCategory(p){
  if(p._cat)return p._cat;
  const t=normalize(`${p.descripcion||''} ${p.clave||''} ${p.categoria||''}`);
  const rules=[
    ['Eléctrico',/electr|volt|cable|contacto|apagador|extension|multimet|foco|lampara|amper|conector electr/],
    ['Plomería',/plomer|tubo|valvula|llave.*agua|manguera|regadera|sanitario|grifo|hidraul|bomba.*agua/],
    ['Construcción',/cement|concret|albañ|cincel|marro|carretilla|nivel|mezcl|llana|cuchara|pala/],
    ['Jardinería',/jardin|poda|machete|azadon|rastrillo|aspersor|riego|desbroz|tijera.*poda/],
    ['Automotriz',/automotr|gato|matraca|bujia|mecan|llanta|aceite|compresor|dado/],
    ['Seguridad',/guante|casco|lente|proteccion|respirador|mascar|chaleco|seguridad/],
    ['Ferretería',/tornillo|abrazadera|tuerca|rondana|remache|cadena|candado|bisagra|gancho|armella|clavo/],
    ['Herramientas',/martillo|pinza|desarmador|llave|taladro|sierra|cortador|broca|punzon|cuchillo|herramient/]
  ];
  for(const [name,re] of rules)if(re.test(t))return p._cat=name;
  return p._cat='Otros';
}
function blob(p){return p._search||(p._search=normalize([p.codigo,p.clave,p.descripcion,p.codigo_barras,inferCategory(p)].join(' ')))}
function imageUrls(p){return p.imgs||[p.imagen].filter(Boolean)}
function imageOf(p){return imageUrls(p)[0]||''}
function findProduct(code){return ALL.find(p=>String(p.codigo)===String(code))}
function saveState(){
  localStorage.setItem('truper26-favs',JSON.stringify([...fav]));
  localStorage.setItem('truper26-cart',JSON.stringify(cart));
  localStorage.setItem('truper26-history',JSON.stringify(history.slice(0,30)));
  $('#favCount').textContent=fav.size;
  $('#cartCount').textContent=Object.values(cart).reduce((a,b)=>a+(b.qty||0),0);
}
function addHistory(p){
  history=history.filter(x=>String(x)!==String(p.codigo));
  history.unshift(String(p.codigo));history=history.slice(0,30);saveState();
}

function setImage(img,urls,i,ph,status){
  if(!urls||i>=urls.length){
    img.style.display='none';ph.style.display='flex';
    if(status){status.innerHTML='<span class="dot" style="background:#a83b3b"></span>Sin foto'}
    return;
  }
  img.onload=()=>{if(status)status.innerHTML='<span class="dot"></span>Foto disponible'};
  img.onerror=()=>setImage(img,urls,i+1,ph,status);
  img.src=urls[i];
}

function priceBlock(pr){
  const primary=Number(pr?.[priceMode]||0);
  const mini=[0,1,2,3].filter(i=>i!==priceMode).map(i=>`<div><small>${SHORT[i]}</small><b>${money(pr?.[i])}</b></div>`).join('');
  return `<div class="price-main"><span>${LABELS[priceMode]}</span><b>${money(primary)}</b></div><div class="price-mini">${mini}</div>`;
}

function card(p){
  const e=document.createElement('article');e.className='card';
  const code=String(p.codigo),isFav=fav.has(code),inCart=!!cart[code];
  e.innerHTML=`
    <span class="card-brand">${esc(p.marca||'TRUPER')}</span>
    <button class="heart ${isFav?'on':''}" data-fav="${esc(code)}">${isFav?'♥':'♡'}</button>
    <div class="pic"><img loading="lazy" decoding="async" alt="${esc(p.descripcion)}"><div class="ph">Imagen no disponible</div></div>
    <div class="card-body">
      <div class="meta"><span class="key">${esc(p.clave)}</span><span class="code">#${esc(code)}</span></div>
      <div class="desc">${esc(p.descripcion)}</div>
      ${priceBlock(p.precios)}
      <div class="card-status"><span class="dot"></span>Foto disponible</div>
      <div class="card-actions">
        <button class="details-btn" data-detail="${esc(code)}">Ver detalles</button>
        <button class="add-btn ${inCart?'added':''}" data-add="${esc(code)}">${inCart?'Agregado ✓':'Agregar'}</button>
      </div>
    </div>`;
  setImage(e.querySelector('img'),imageUrls(p),0,e.querySelector('.ph'),e.querySelector('.card-status'));
  return e;
}

function render(){
  grid.innerHTML='';
  filtered.slice(0,visible).forEach(p=>grid.appendChild(card(p)));
  stats.textContent=`${filtered.length.toLocaleString('es-MX')} productos`;
  $('#filterText').textContent=[showFavs?'Favoritos':'',category!=='Todos'?category:''].filter(Boolean).join(' · ');
  empty.hidden=filtered.length>0;
  loadMore.hidden=visible>=filtered.length;
  saveState();
}

function apply(resetVisible=true){
  const term=normalize(q.value.trim());
  filtered=ALL.filter(p=>{
    const hit=!term||blob(p).includes(term);
    const cat=category==='Todos'||inferCategory(p)===category;
    const fs=!showFavs||fav.has(String(p.codigo));
    return hit&&cat&&fs;
  });

  const sort=$('#sort').value;
  if(sort==='priceAsc')filtered.sort((a,b)=>(a.precios?.[priceMode]||0)-(b.precios?.[priceMode]||0));
  else if(sort==='priceDesc')filtered.sort((a,b)=>(b.precios?.[priceMode]||0)-(a.precios?.[priceMode]||0));
  else if(sort==='key')filtered.sort((a,b)=>String(a.clave).localeCompare(String(b.clave)));

  if(resetVisible)visible=STEP;
  render();
}

function buildCategories(){
  ['Todos','Herramientas','Ferretería','Eléctrico','Plomería','Construcción','Jardinería','Automotriz','Seguridad','Otros'].forEach(name=>{
    const b=document.createElement('button');
    b.className='chip'+(name==='Todos'?' active':'');
    b.textContent=name;
    b.onclick=()=>{
      category=name;showFavs=false;
      [...chips.children].forEach(x=>x.classList.toggle('active',x===b));
      apply();
    };
    chips.appendChild(b);
  });
}

function updateSuggestions(){
  const term=normalize(q.value.trim());
  if(term.length<2){suggestions.hidden=true;return}
  const list=ALL.filter(p=>blob(p).includes(term)).slice(0,6);
  if(!list.length){suggestions.hidden=true;return}
  suggestions.innerHTML=list.map(p=>`<button class="suggestion" data-suggest="${esc(p.codigo)}"><strong>${esc(p.clave)}</strong><span>${esc(p.descripcion).slice(0,55)}</span></button>`).join('');
  suggestions.hidden=false;
}

suggestions.addEventListener('click',e=>{
  const b=e.target.closest('[data-suggest]');if(!b)return;
  const p=findProduct(b.dataset.suggest);q.value=p.clave;suggestions.hidden=true;apply();openProduct(p);
});

/* PRODUCT */
function openProduct(p){
  if(!p)return;addHistory(p);
  const pr=p.precios||[];
  const body=$('#productBody');
  body.innerHTML=`
    <img class="detail-img" src="${esc(imageOf(p))}" alt="${esc(p.descripcion)}">
    <span class="detail-brand">${esc(p.marca||'TRUPER')}</span>
    <div class="detail-head"><h2>${esc(p.clave)}</h2><span>#${esc(p.codigo)}</span></div>
    <p class="detail-desc">${esc(p.descripcion)}</p>
    <div class="detail-prices">
      ${[0,1,2,3].map(i=>`<div class="${i===3?'public':''}"><small>${LABELS[i]}</small><b>${money(pr[i])}</b></div>`).join('')}
    </div>
    <div class="detail-meta">
      Categoría: ${esc(inferCategory(p))}<br>
      Marca: ${esc(p.marca||'TRUPER')}<br>
      Código de barras: ${esc(p.codigo_barras||'No disponible')}
    </div>
    <div class="detail-actions">
      <button class="detail-copy" data-copy-product="${esc(p.codigo)}">Copiar datos</button>
      <button class="detail-add" data-detail-add="${esc(p.codigo)}">${cart[String(p.codigo)]?'Agregado ✓':'Agregar'}</button>
      ${p.ficha?`<a class="official-link" href="${esc(p.ficha)}" target="_blank" rel="noopener">Abrir ficha oficial Truper</a>`:''}
    </div>`;
  $('#productModal').hidden=false;document.body.style.overflow='hidden';
}

function closeProduct(){ $('#productModal').hidden=true;document.body.style.overflow='' }

/* CART */
function addToCart(p){
  const code=String(p.codigo);
  if(cart[code])cart[code].qty+=1;
  else cart[code]={qty:1};
  saveState();render();
}
function setQty(code,delta){
  if(!cart[code])return;
  cart[code].qty+=delta;
  if(cart[code].qty<=0)delete cart[code];
  saveState();renderCart();render();
}
function renderCart(){
  const body=$('#cartBody');
  const entries=Object.entries(cart);
  if(!entries.length){body.innerHTML='<div class="empty-cart"><h3>Tu selección está vacía</h3><p>Agrega productos desde el catálogo.</p></div>';return}
  let total=0;
  body.innerHTML=entries.map(([code,it])=>{
    const p=findProduct(code);if(!p)return '';
    const price=Number(p.precios?.[priceMode]||0);total+=price*it.qty;
    return `<div class="cart-item">
      <img src="${esc(imageOf(p))}" alt="">
      <div><strong>${esc(p.clave)}</strong><small>${esc(p.descripcion).slice(0,55)}</small><small>${LABELS[priceMode]}: ${money(price)}</small></div>
      <div class="qty"><button data-minus="${esc(code)}">−</button><span>${it.qty}</span><button data-plus="${esc(code)}">+</button></div>
    </div>`;
  }).join('')+`<div class="cart-total"><span>Total de referencia</span><b>${money(total)}</b></div>`;
}
function openCart(){renderCart();$('#cartModal').hidden=false;document.body.style.overflow='hidden'}
function closeCart(){$('#cartModal').hidden=true;document.body.style.overflow=''}

/* HISTORY */
function historyMode(){
  showFavs=false;category='Todos';q.value='';
  filtered=history.map(findProduct).filter(Boolean);
  visible=STEP;render();
  $('#filterText').textContent='Historial reciente';
  scrollTo({top:0,behavior:'smooth'});
}

/* SCANNER */
async function openScanner(){
  const modal=$('#scannerModal'),video=$('#video'),status=$('#scanStatus');
  modal.hidden=false;document.body.style.overflow='hidden';
  if(!navigator.mediaDevices?.getUserMedia){status.textContent='La cámara no está disponible en este navegador.';return}
  try{
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
    video.srcObject=cameraStream;
    if('BarcodeDetector'in window){
      const detector=new BarcodeDetector({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e']});
      const loop=async()=>{
        if(modal.hidden)return;
        try{
          const codes=await detector.detect(video);
          if(codes.length){q.value=codes[0].rawValue;closeScanner();apply();return}
        }catch{}
        requestAnimationFrame(loop);
      };
      loop();
    }else status.textContent='La cámara funciona, pero tu navegador no incluye detección automática de códigos.';
  }catch{status.textContent='No fue posible abrir la cámara. Revisa el permiso del navegador.'}
}
function closeScanner(){
  $('#scannerModal').hidden=true;document.body.style.overflow='';
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}
}

/* EVENTS */
grid.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.fav){
    const c=String(b.dataset.fav);fav.has(c)?fav.delete(c):fav.add(c);saveState();render();
  }
  if(b.dataset.detail)openProduct(findProduct(b.dataset.detail));
  if(b.dataset.add)addToCart(findProduct(b.dataset.add));
});

$('#productModal').addEventListener('click',async e=>{
  if(e.target.hasAttribute('data-close-product')){closeProduct();return}
  const copy=e.target.closest('[data-copy-product]');
  if(copy){
    const p=findProduct(copy.dataset.copyProduct);
    const t=`${p.clave} | ${p.descripcion} | D ${money(p.precios?.[0])} | M ${money(p.precios?.[1])} | MM ${money(p.precios?.[2])} | P ${money(p.precios?.[3])}`;
    try{await navigator.clipboard.writeText(t);copy.textContent='Copiado ✓'}catch{}
  }
  const add=e.target.closest('[data-detail-add]');
  if(add){addToCart(findProduct(add.dataset.detailAdd));add.textContent='Agregado ✓'}
});

$('#cartBody').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.minus)setQty(String(b.dataset.minus),-1);
  if(b.dataset.plus)setQty(String(b.dataset.plus),1);
});
$('#clearCart').onclick=()=>{cart={};saveState();renderCart();render()};

q.addEventListener('input',()=>{
  clearTimeout(window._searchTimer);
  window._searchTimer=setTimeout(()=>{apply();updateSuggestions()},80);
});
$('#clear').onclick=()=>{q.value='';suggestions.hidden=true;apply();q.focus()};
$('#sort').onchange=()=>apply(false);
$('#priceMode').onchange=()=>{priceMode=Number($('#priceMode').value);apply(false);renderCart()};
$('#view').onclick=()=>{listView=!listView;grid.classList.toggle('list',listView);$('#view').textContent=listView?'☷':'▦'};
loadMore.onclick=()=>{visible+=STEP;render()};
$('#favTop').onclick=$('#navFavs').onclick=()=>{showFavs=true;category='Todos';q.value='';[...chips.children].forEach(x=>x.classList.remove('active'));apply();scrollTo({top:0,behavior:'smooth'})};
$('#cartTop').onclick=openCart;
$('#scanBtn').onclick=openScanner;
$('#navHome').onclick=()=>{showFavs=false;category='Todos';q.value='';[...chips.children].forEach((x,i)=>x.classList.toggle('active',i===0));apply();scrollTo({top:0,behavior:'smooth'})};
$('#navCats').onclick=()=>{scrollTo({top:0,behavior:'smooth'});setTimeout(()=>chips.scrollIntoView({behavior:'smooth'}),120)};
$('#navHistory').onclick=historyMode;
$('#navMore').onclick=()=>{$('#moreModal').hidden=false;document.body.style.overflow='hidden'};
$('#toTop').onclick=()=>scrollTo({top:0,behavior:'smooth'});
addEventListener('scroll',()=>$('#toTop').classList.toggle('show',scrollY>450));

$('#cartModal').addEventListener('click',e=>{if(e.target.hasAttribute('data-close-cart'))closeCart()});
$('#scannerModal').addEventListener('click',e=>{if(e.target.hasAttribute('data-close-scanner'))closeScanner()});
$('#moreModal').addEventListener('click',e=>{if(e.target.hasAttribute('data-close-more')){$('#moreModal').hidden=true;document.body.style.overflow=''}});

function skeletons(){
  grid.innerHTML=Array.from({length:8},()=>`
    <article class="card">
      <div class="pic skeleton"></div>
      <div class="card-body">
        <div class="skeleton" style="height:17px;border-radius:6px;margin-bottom:7px"></div>
        <div class="skeleton" style="height:38px;border-radius:7px;margin-bottom:7px"></div>
        <div class="skeleton" style="height:43px;border-radius:8px"></div>
      </div>
    </article>`).join('');
}

skeletons();
fetch('products.json')
  .then(r=>r.json())
  .then(data=>{
    ALL=data;
    filtered=ALL;
    buildCategories();
    saveState();
    render();
  })
  .catch(()=>{
    stats.textContent='Error cargando products.json';
    grid.innerHTML='';
  });

if('serviceWorker'in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
