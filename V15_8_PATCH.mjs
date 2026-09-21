import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const VERSION='15.8.0';
const read=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s,'utf8')};

function patchOddsProvider(){
  const f=path.join(ROOT,'server','providers','oddspapi.mjs');
  let s=read(f);if(!s)return false;
  if(s.includes('FVS_158_ODDS_THROTTLE'))return true;

  const sleepAnchor="const sleep=ms=>new Promise(r=>setTimeout(r,ms));";
  if(!s.includes(sleepAnchor))throw new Error('V15.8 OddsPapi sleep anchor ontbreekt');
  s=s.replace(sleepAnchor,`${sleepAnchor}\n\n// FVS_158_ODDS_THROTTLE: één gedeelde requestpoort voor refresh, live-checks en iPhone/desktop.\n// Dit voorkomt dat meerdere gelijktijdige schermen samen de OddsPapi burst-limit raken.\nlet fvs158Gate=Promise.resolve(),fvs158LastRequestAt=0,fvs158BlockedUntil=0;\nconst FVS158_MIN_GAP_MS=1150;\nasync function fvs158Pace(){\n  const turn=fvs158Gate.then(async()=>{\n    const now=Date.now(),wait=Math.max(0,FVS158_MIN_GAP_MS-(now-fvs158LastRequestAt),fvs158BlockedUntil-now);\n    if(wait>0)await sleep(wait);\n    fvs158LastRequestAt=Date.now();\n  });\n  fvs158Gate=turn.catch(()=>{});\n  return turn;\n}\nlet fvs158AccountCache={key:null,at:0,value:null};\nasync function fvs158CachedAccount(apiKey){\n  if(fvs158AccountCache.value&&fvs158AccountCache.key===apiKey&&Date.now()-fvs158AccountCache.at<20*60*1000)return fvs158AccountCache.value;\n  const value=await fetchOddsPapiAccount(apiKey);fvs158AccountCache={key:apiKey,at:Date.now(),value};return value;\n}\nconst fvs158ExactCache=new Map();\nfunction fvs158ExactKey(apiKey,fixtureId){return String(apiKey||'').slice(-8)+':'+String(fixtureId||'')}\n`);

  const fetchAnchor="    try{\n      const r=await fetch(u,{signal:ctrl.signal,headers:{accept:'application/json'}});";
  if(!s.includes(fetchAnchor))throw new Error('V15.8 OddsPapi fetch anchor ontbreekt');
  s=s.replace(fetchAnchor,"    try{\n      await fvs158Pace();\n      const r=await fetch(u,{signal:ctrl.signal,headers:{accept:'application/json'}});");

  const pauseAnchor="        const pause=(Number.isFinite(hdr)&&hdr>0?hdr*1000:waitFromBody(body))+attempt*250;\n        last=new Error(`OddsPapi rate limit; retry in ${pause}ms`);\n        await sleep(pause);";
  if(!s.includes(pauseAnchor))throw new Error('V15.8 OddsPapi 429 anchor ontbreekt');
  s=s.replace(pauseAnchor,"        const pause=Math.max(2800,(Number.isFinite(hdr)&&hdr>0?hdr*1000:waitFromBody(body))+attempt*650);\n        fvs158BlockedUntil=Math.max(fvs158BlockedUntil,Date.now()+pause);\n        last=new Error(`OddsPapi tijdelijke rate limit; automatische retry in ${pause}ms`);\n        await sleep(pause);");

  const accountAnchor="  const account=await fetchOddsPapiAccount(apiKey);";
  if(!s.includes(accountAnchor))throw new Error('V15.8 account-cache anchor ontbreekt');
  s=s.replace(accountAnchor,"  const account=await fvs158CachedAccount(apiKey); // FVS_158_ACCOUNT_CACHE");

  const exactAnchor="  const row=await getJson('/odds',{fixtureId,bookmakers:'napoleonsports.be',language:'nl',verbosity:3,oddsFormat:'decimal'},apiKey);";
  if(!s.includes(exactAnchor))throw new Error('V15.8 exact-odds cache anchor ontbreekt');
  s=s.replace(exactAnchor,"  const fvs158Key=fvs158ExactKey(apiKey,fixtureId),fvs158Hit=fvs158ExactCache.get(fvs158Key);\n  let row;\n  if(fvs158Hit&&Date.now()-fvs158Hit.at<90*1000)row=fvs158Hit.row;\n  else{row=await getJson('/odds',{fixtureId,bookmakers:'napoleonsports.be',language:'nl',verbosity:3,oddsFormat:'decimal'},apiKey);fvs158ExactCache.set(fvs158Key,{at:Date.now(),row});if(fvs158ExactCache.size>80){const k=fvs158ExactCache.keys().next().value;fvs158ExactCache.delete(k)}} // FVS_158_EXACT_CACHE");

  write(f,s);return true;
}

function patchRefresh(){
  const f=path.join(ROOT,'server','refresh.mjs');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_158_ACTIONABLE_PRIORITY')){
    const old="    const actionable=rows.filter(m=>['BET','VOORWAARDELIJK'].includes(m.status)||(m.opportunities||[]).some(o=>['BET','VOORWAARDELIJK'].includes(o.status)));";
    const neu="    const actionable=rows.filter(m=>['BET','VOORWAARDELIJK'].includes(m.status)||(m.opportunities||[]).some(o=>['BET','VOORWAARDELIJK'].includes(o.status))).sort((a,b)=>{const r=x=>x?.status==='BET'?2:x?.status==='VOORWAARDELIJK'?1:0;return r(b)-r(a)||Number(b?.value||0)-Number(a?.value||0)}); // FVS_158_ACTIONABLE_PRIORITY";
    if(!s.includes(old))throw new Error('V15.8 actionable anchor ontbreekt');
    s=s.replace(old,neu);
  }
  s=s.replace("const maxFixtures=Math.max(0,Math.min(actionable.length,20,Math.max(0,remaining-8)));","const maxFixtures=Math.max(0,Math.min(actionable.length,8,Math.max(0,remaining-4))); // FVS_158_EXACT_BUDGET");
  write(f,s);return true;
}

function patchServer(){
  const f=path.join(ROOT,'server','app.v15.mjs');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_158_REFRESH_COOLDOWN')){
    const anchor="  if(syncState.running)return r.status(202).json({running:true,message:'Data-sync is al bezig.'});";
    if(!s.includes(anchor))throw new Error('V15.8 refresh endpoint anchor ontbreekt');
    const addition=`${anchor}\n  const fvs158Cached=readJson('dashboard.json',null),fvs158Age=fvs158Cached?.updatedAt?Date.now()-Date.parse(fvs158Cached.updatedAt):Infinity;\n  if(q.body?.force!==true&&fvs158Cached&&fvs158Age>=0&&fvs158Age<2*60*1000)return r.json({...fvs158Cached,refreshReused:true,refreshAgeMs:fvs158Age}); // FVS_158_REFRESH_COOLDOWN`;
    s=s.replace(anchor,addition);
  }
  s=s.replace("version:'15.7.0'","version:'15.8.0'");
  write(f,s);return true;
}

function patchClient(){
  const f=path.join(ROOT,'public','app.js');let s=read(f);if(!s)return false;
  if(!s.includes('FVS_158_RATE_LIMIT_COPY')){
    s+=`\n// FVS_158_RATE_LIMIT_COPY: tijdelijke feedbegrenzing is geen kapotte API-key.\n(()=>{\n  window.fvs158FriendlyError=function(msg=''){const z=String(msg||'');return /rate limit|429/i.test(z)?'OddsPapi is tijdelijk begrensd. De scanner wacht automatisch en probeert opnieuw; klik niet herhaaldelijk op vernieuwen.':z};\n})(); // FVS_158_RATE_LIMIT_COPY\n`;
  }
  write(f,s);return true;
}

function patchMobile(){
  const html=path.join(ROOT,'public','index.html');let h=read(html);if(!h)return false;
  h=h.replace(/(?:\.\/)?app\.js(?:\?v=[^\"']+)?/g,`app.js?v=${VERSION}`)
     .replace(/(?:\.\/)?style\.css(?:\?v=[^\"']+)?/g,`style.css?v=${VERSION}`)
     .replace(/mobile-app\.css(?:\?v=[^\"']+)?/g,`mobile-app.css?v=${VERSION}`)
     .replace(/mobile-app\.js(?:\?v=[^\"']+)?/g,`mobile-app.js?v=${VERSION}`)
     .replace(/manifest\.webmanifest(?:\?v=[^\"']+)?/g,`manifest.webmanifest?v=${VERSION}`);
  write(html,h);return true;
}

export function applyV158Patch(){return {ok:true,version:VERSION,provider:patchOddsProvider(),refresh:patchRefresh(),server:patchServer(),client:patchClient(),mobile:patchMobile()}}
if(process.argv.includes('--apply'))console.log(JSON.stringify(applyV158Patch(),null,2));
