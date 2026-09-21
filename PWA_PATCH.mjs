import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PUB=path.join(ROOT,'public');
const VERSION='15.3.0';
const mark='<!-- V15.3 IPHONE APP -->';

const mobileCss=`
:root{--mobilebar-h:68px}
#fvs-mobilebar,#fvs-mobilesheet{display:none}
@media(max-width:820px){
  html,body{max-width:100%;overflow-x:hidden}
  body{padding-bottom:calc(var(--mobilebar-h) + env(safe-area-inset-bottom,0px))!important}
  main,.main,.content,.page-content{max-width:100%!important;margin-left:0!important;padding-left:12px!important;padding-right:12px!important}
  aside,.sidebar,.side-nav{display:none!important}
  table{display:block;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
  button,input,select,a{min-height:42px}
  #fvs-mobilebar{display:grid;grid-template-columns:repeat(4,1fr);position:fixed;left:0;right:0;bottom:0;z-index:10000;background:rgba(10,16,24,.97);backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.12);padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));gap:6px}
  #fvs-mobilebar button{border:0;border-radius:12px;background:transparent;color:#fff;font:inherit;font-size:12px;padding:7px 4px}
  #fvs-mobilebar button strong{display:block;font-size:18px;line-height:20px}
  #fvs-mobilesheet{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.55);padding:72px 12px calc(86px + env(safe-area-inset-bottom,0px));overflow:auto}
  #fvs-mobilesheet.open{display:block}
  #fvs-mobilesheet .panel{max-width:520px;margin:auto;background:#111a24;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:14px;box-shadow:0 24px 80px rgba(0,0,0,.45)}
  #fvs-mobilesheet .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;color:#fff}
  #fvs-mobilesheet .items{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  #fvs-mobilesheet .items button{background:#182433;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:12px;text-align:left;padding:12px}
  .card,.panel,.bet-card,.match-card{max-width:100%!important}
}
@media(display-mode:standalone){body{overscroll-behavior-y:none}}
`;

const mobileJs=`(()=>{
  const label=e=>(e.innerText||e.textContent||'').trim().replace(/\\s+/g,' ');
  const visible=e=>!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length);
  function navCandidates(){
    const nodes=[...document.querySelectorAll('aside a,aside button,.sidebar a,.sidebar button,.side-nav a,.side-nav button,nav a,nav button')];
    const seen=new Set();
    return nodes.filter(e=>{const t=label(e);if(!t||t.length>42||seen.has(t))return false;seen.add(t);return true;});
  }
  function clickByText(re){const el=navCandidates().find(e=>re.test(label(e)));if(el){el.click();return true}return false}
  function build(){if(document.getElementById('fvs-mobilebar'))return;
    const bar=document.createElement('div');bar.id='fvs-mobilebar';bar.innerHTML='<button data-act="dashboard"><strong>⌂</strong>Home</button><button data-act="bets"><strong>✓</strong>Bets</button><button data-act="clubs"><strong>♟</strong>Clubs</button><button data-act="menu"><strong>☰</strong>Menu</button>';
    const sheet=document.createElement('div');sheet.id='fvs-mobilesheet';sheet.innerHTML='<div class="panel"><div class="head"><b>Football Value Scanner</b><button data-close>✕</button></div><div class="items"></div></div>';
    document.body.append(sheet,bar);
    const items=sheet.querySelector('.items');
    navCandidates().forEach(orig=>{const b=document.createElement('button');b.textContent=label(orig);b.onclick=()=>{orig.click();sheet.classList.remove('open')};items.appendChild(b)});
    bar.onclick=e=>{const a=e.target.closest('button')?.dataset.act;if(!a)return;if(a==='menu')sheet.classList.add('open');if(a==='dashboard')clickByText(/dashboard|home/i);if(a==='bets')clickByText(/mijn bets|speelbare bets|bets/i);if(a==='clubs')clickByText(/clubs|club.*data/i)};
    sheet.onclick=e=>{if(e.target===sheet||e.target.closest('[data-close]'))sheet.classList.remove('open')};
  }
  window.addEventListener('DOMContentLoaded',build);
  window.addEventListener('hashchange',()=>setTimeout(build,0));
  if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('/sw.js').catch(()=>{});
})();`;

const manifest=JSON.stringify({name:'Football Value Scanner',short_name:'Value Scanner',start_url:'/',scope:'/',display:'standalone',background_color:'#0a1018',theme_color:'#0a1018',description:'Football value betting dashboard',icons:[{src:'/app-icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]},null,2);
const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="108" fill="#0a1018"/><circle cx="256" cy="256" r="170" fill="none" stroke="#fff" stroke-width="18"/><path d="M256 132l58 42-22 68h-72l-22-68 58-42zm-128 98l70 12 22 68-55 46-61-40 24-86zm256 0l24 86-61 40-55-46 22-68 70-12zM184 366l36-56h72l36 56-72 42-72-42z" fill="#fff"/></svg>`;
const sw=`const C='fvs-v15.3';self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['/','/mobile-app.css','/mobile-app.js','/manifest.webmanifest','/app-icon.svg']).catch(()=>{}))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const x=r.clone();caches.open(C).then(c=>c.put(e.request,x)).catch(()=>{});return r}).catch(()=>caches.match(e.request)))})`;

function write(name,content){fs.mkdirSync(PUB,{recursive:true});fs.writeFileSync(path.join(PUB,name),content,'utf8')}
function injectHtml(){const f=path.join(PUB,'index.html');if(!fs.existsSync(f))return false;let s=fs.readFileSync(f,'utf8');if(s.includes(mark))return true;const head=`${mark}\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#0a1018">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="Value Scanner">\n<link rel="manifest" href="/manifest.webmanifest">\n<link rel="icon" href="/app-icon.svg" type="image/svg+xml">\n<link rel="stylesheet" href="/mobile-app.css">`;
  s=s.includes('</head>')?s.replace('</head>',head+'\n</head>'):head+s;
  const script='<script src="/mobile-app.js" defer></script>';
  s=s.includes('</body>')?s=s.replace('</body>',script+'\n</body>'):s+=script;
  fs.writeFileSync(f,s,'utf8');return true;
}
export function applyPwaPatch(){write('mobile-app.css',mobileCss);write('mobile-app.js',mobileJs);write('manifest.webmanifest',manifest);write('app-icon.svg',icon);write('sw.js',sw);injectHtml();return {ok:true,version:VERSION}}
if(process.argv.includes('--apply'))console.log(JSON.stringify(applyPwaPatch(),null,2));
