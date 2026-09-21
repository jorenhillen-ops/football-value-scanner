import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const VERSION='15.4.0';
const read=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s,'utf8')};

function patchServer(){
  const f=path.join(ROOT,'server','app.v15.mjs');
  let s=read(f);if(!s)return false;

  // iPhone/LAN: expliciet op alle lokale interfaces luisteren.
  s=s.replace("app.listen(PORT,()=>{","app.listen(PORT,'0.0.0.0',()=>{");

  if(!s.includes('FVS_154_NOCACHE')){
    const needle='const app=express();';
    const middleware=`${needle}\n// FVS_154_NOCACHE: desktop en iPhone moeten altijd dezelfde actuele runtime/data zien.\napp.use((q,r,next)=>{\n  if(q.path==='/'||q.path==='/index.html'||q.path.startsWith('/api/')||/\\.(?:js|css|webmanifest)$/.test(q.path)){\n    r.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');\n    r.set('Pragma','no-cache');r.set('Expires','0');\n  }\n  next();\n});`;
    if(s.includes(needle))s=s.replace(needle,middleware);
  }

  if(!s.includes('FVS_154_DAILY_MAINTENANCE')){
    const health="app.get('/health',(q,r)=>r.json({ok:true,time:new Date().toISOString(),settings:publicSettings()}));";
    const block=`// FVS_154_DAILY_MAINTENANCE\nlet fvsDailyMaintenance={running:false,lastRun:null,lastError:null,lastCatalog:null,leaguesDone:0};\nasync function fvsRunDailyMaintenance({force=false}={}){\n  if(fvsDailyMaintenance.running)return fvsDailyMaintenance;\n  const settings=readJson('settings.json',{});\n  if(!settings.sportmonksToken){fvsDailyMaintenance.lastError='Sportmonks niet ingesteld';return fvsDailyMaintenance}\n  const stamp=readJson('daily-maintenance-v15.json',{}),lastMs=Date.parse(stamp.lastRun||0);\n  if(!force&&Number.isFinite(lastMs)&&Date.now()-lastMs<20*60*60*1000)return {...fvsDailyMaintenance,lastRun:stamp.lastRun,lastCatalog:stamp.lastCatalog||null,leaguesDone:stamp.leaguesDone||0};\n  fvsDailyMaintenance={running:true,lastRun:stamp.lastRun||null,lastError:null,lastCatalog:null,leaguesDone:0};\n  try{\n    const cat=await syncSportmonksCatalog({force:true});\n    fvsDailyMaintenance.lastCatalog=new Date().toISOString();\n    const comps=mergedCompetitions().filter(c=>c?.sportmonksSeasonId&&(c?.currentTeams?.length||c?.allTeams?.length)).slice(0,12);\n    for(const c of comps){\n      try{await syncCompetitionSquads(c.code);fvsDailyMaintenance.leaguesDone++}catch(e){console.log('Dagelijkse squad-sync '+c.code+':',e.message)}\n      await new Promise(res=>setTimeout(res,500));\n    }\n    const lastRun=new Date().toISOString();\n    writeJson('daily-maintenance-v15.json',{lastRun,lastCatalog:fvsDailyMaintenance.lastCatalog,leaguesDone:fvsDailyMaintenance.leaguesDone,catalogTeams:cat?.teams||null});\n    fvsDailyMaintenance={...fvsDailyMaintenance,running:false,lastRun,lastError:null};\n  }catch(e){fvsDailyMaintenance={...fvsDailyMaintenance,running:false,lastError:e.message};console.log('Dagelijks club/speler onderhoud:',e.message)}\n  return fvsDailyMaintenance;\n}\napp.get('/api/maintenance-status',(q,r)=>r.json({ok:true,...fvsDailyMaintenance,stored:readJson('daily-maintenance-v15.json',{})}));\napp.post('/api/maintenance-now',async(q,r)=>{fvsRunDailyMaintenance({force:true}).catch(()=>{});r.json({ok:true,started:true,...fvsDailyMaintenance})});\nsetTimeout(()=>fvsRunDailyMaintenance().catch(()=>{}),15000);\nsetInterval(()=>fvsRunDailyMaintenance().catch(()=>{}),6*60*60*1000);\n\n${health}`;
    if(s.includes(health))s=s.replace(health,block);
  }
  write(f,s);return true;
}

function patchClient(){
  const f=path.join(ROOT,'public','app.js');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_154_PLAYABLE_DIAGNOSTICS')){
    const old="'<div class=\"empty\"><strong>Nog geen speelbare markt gevonden</strong>De scanner heeft meerdere markten gecontroleerd maar forceert geen bet zonder positieve edge.</div>'";
    const neu="`<div class=\"empty\"><strong>Nog geen speelbare bet volgens de ingestelde kwaliteitsfilter</strong>${(()=>{const ms=D?.matches||[],priced=ms.filter(m=>m.odds?.napoleon).length,modeled=ms.filter(m=>Number(m.modelProb)>0).length,conditional=ms.filter(m=>m.status==='VOORWAARDELIJK').length;return `${ms.length} actuele wedstrijden · ${priced} met Napoleon-prijs · ${modeled} met modelkans · ${conditional} voorwaardelijk. De scanner verlaagt de drempels niet om kunstmatig bets te maken.`})()}</div>`/* FVS_154_PLAYABLE_DIAGNOSTICS */";
    if(s.includes(old))s=s.replace(old,neu);
  }
  if(!s.includes('FVS_154_MOBILE_RESUME')){
    s+=`\n// FVS_154_MOBILE_RESUME: geïnstalleerde iPhone-webapp haalt dezelfde live data als desktop.\n(()=>{let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenAt=Date.now();return}if(hiddenAt&&Date.now()-hiddenAt>5*60*1000){const b=document.getElementById('refresh');if(b&&!b.disabled)b.click()}});window.addEventListener('pageshow',e=>{if(e.persisted){const b=document.getElementById('refresh');if(b&&!b.disabled)b.click()}})})();\n`;
  }
  write(f,s);return true;
}

function patchMobile(){
  const html=path.join(ROOT,'public','index.html');let h=read(html);
  if(h){
    h=h.replace(/mobile-app\.css(?:\?v=[^\"']+)?/g,`mobile-app.css?v=${VERSION}`)
       .replace(/mobile-app\.js(?:\?v=[^\"']+)?/g,`mobile-app.js?v=${VERSION}`)
       .replace(/manifest\.webmanifest(?:\?v=[^\"']+)?/g,`manifest.webmanifest?v=${VERSION}`);
    write(html,h);
  }
  const mf=path.join(ROOT,'public','mobile-app.js');let m=read(mf);
  if(m&&!m.includes('FVS_154_UNREGISTER_STALE_SW')){
    m+=`\n// FVS_154_UNREGISTER_STALE_SW: voorkom dat een oude homescreen-cache afwijkt van desktop.\n(async()=>{try{if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}if('caches' in window){for(const k of await caches.keys())await caches.delete(k)}}catch{}})();\n`;
    write(mf,m);
  }
  return true;
}

export function applyV154Patch(){return {ok:true,version:VERSION,server:patchServer(),client:patchClient(),mobile:patchMobile()}}
if(process.argv.includes('--apply'))console.log(JSON.stringify(applyV154Patch(),null,2));
