import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const VERSION='15.7.0';
const read=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s,'utf8')};

function patchModel(){
  const f=path.join(ROOT,'server','model.mjs');
  let s=read(f);if(!s)return false;

  if(!s.includes('FVS_157_VALUE_GATE')){
    const old=`  if(prediction.adaptive){\n    // FVS_156_CONSERVATIVE_EDGE: een BET moet ook positief blijven aan de onderkant van de onzekerheidsmarge.\n    const unc=Number(sig.uncertaintyPct||99),sources=Number(sig.modelSources||0),consProb=Math.max(1,pick.prob-unc*.45),consEdge=(consProb/100*pick.odd-1)*100,strongPair=sources>=3||(sources>=2&&Number(sig.benchmarkBooks||0)>=1&&Number(sig.sampleMatches||0)>=18);\n    if(strongPair && unc<=9.2 && pick.value>=6.5 && consEdge>=2.0 && pick.prob>=34 && confidence>=71) status='BET';\n    else if(sources>=2 && unc<=12 && pick.value>=3.25 && consEdge>=0 && pick.prob>=30 && confidence>=64) status='VOORWAARDELIJK';\n  } else if(prediction.blended){`;
    const neu=`  if(prediction.adaptive){\n    // FVS_157_VALUE_GATE: terug naar de afgesproken value-drempels, maar met onzekerheids- en broncontrole.\n    const unc=Number(sig.uncertaintyPct||99),sources=Number(sig.modelSources||0),consProb=Math.max(1,pick.prob-unc*.35),consEdge=(consProb/100*pick.odd-1)*100;\n    if(sources>=2 && unc<=10.5 && pick.value>=6 && consEdge>=1.0 && pick.prob>=22 && confidence>=68) status='BET';\n    else if(sources>=2 && unc<=13 && pick.value>=2.5 && consEdge>=0 && pick.prob>=22 && confidence>=61) status='VOORWAARDELIJK';\n  } else if(prediction.blended){`;
    if(s.includes(old))s=s.replace(old,neu);
  }

  if(!s.includes('FVS_157_MULTIMARKET_GATE')){
    const old=`    // FVS_156_MULTIMARKET_GATE: multi-markten moeten ook na onzekerheidsaftrek positieve edge houden.\n    const unc=Number(prediction?.dataSignals?.uncertaintyPct||8),sources=Number(prediction?.dataSignals?.modelSources||1),consProb=Math.max(1,modelProb-unc*.35),consValue=(consProb/100*odd-1)*100;\n    if(sample>=14&&sources>=2&&confidence>=70&&unc<=10.5&&value>=7&&consValue>=2.5&&modelProb>=17)status='BET';\n    else if(sample>=9&&confidence>=64&&unc<=13&&value>=3.25&&consValue>=0&&modelProb>=16)status='VOORWAARDELIJK';`;
    const neu=`    // FVS_157_MULTIMARKET_GATE: voldoende sample + positieve ondergrens, zonder de markt onnodig dicht te zetten.\n    const unc=Number(prediction?.dataSignals?.uncertaintyPct||8),sources=Number(prediction?.dataSignals?.modelSources||1),consProb=Math.max(1,modelProb-unc*.30),consValue=(consProb/100*odd-1)*100;\n    if(sample>=12&&sources>=2&&confidence>=68&&unc<=11&&value>=6&&consValue>=1&&modelProb>=22)status='BET';\n    else if(sample>=8&&sources>=2&&confidence>=61&&unc<=13&&value>=2.5&&consValue>=0&&modelProb>=22)status='VOORWAARDELIJK'; // FVS_157_MULTIMARKET_GATE`;
    if(s.includes(old))s=s.replace(old,neu);
  }

  write(f,s);return true;
}

function patchServer(){
  const f=path.join(ROOT,'server','app.v15.mjs');
  let s=read(f);if(!s)return false;

  // Dagelijkse club/speler onderhoudsinterval verkorten naar elke 4 uur; daadwerkelijke zware sync blijft 20u-gegate.
  s=s.replace("setInterval(()=>fvsRunDailyMaintenance().catch(()=>{}),6*60*60*1000);","setInterval(()=>fvsRunDailyMaintenance().catch(()=>{}),4*60*60*1000);");

  // Dashboard refresh minimaal elk uur zodat vandaag niet op een oude lokale cache blijft staan.
  s=s.replace("timer=setInterval(()=>refreshDashboard().catch(e=>console.log('Scheduled refresh:',e.message)),Math.max(30,mins)*60000);","timer=setInterval(()=>refreshDashboard().catch(e=>console.log('Scheduled refresh:',e.message)),Math.max(30,Math.min(60,mins))*60000);");

  if(!s.includes('FVS_157_HEALTH_DETAIL')){
    const old="app.get('/health',(q,r)=>r.json({ok:true,time:new Date().toISOString(),settings:publicSettings()}));";
    const neu="app.get('/health',(q,r)=>r.json({ok:true,time:new Date().toISOString(),version:'15.7.0',settings:publicSettings(),maintenance:readJson('daily-maintenance-v15.json',{}),dashboardUpdatedAt:readJson('dashboard.json',{}).updatedAt||null})); // FVS_157_HEALTH_DETAIL";
    if(s.includes(old))s=s.replace(old,neu);
  }
  write(f,s);return true;
}

function patchClient(){
  const f=path.join(ROOT,'public','app.js');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_157_FORCE_FRESH_START')){
    s+=`\n// FVS_157_FORCE_FRESH_START: desktop en iPhone laden dezelfde serverstaat en verversen na hervatten.\n(()=>{\n  async function syncShared(){try{const r=await fetch('/api/user-state?'+Date.now(),{cache:'no-store'});if(!r.ok)return;const x=await r.json();if(x?.exists&&x.state){const b=Array.isArray(x.state.bets)?x.state.bets:[];if(b.length){localStorage.setItem('fv_bets',JSON.stringify(b));localStorage.setItem('footballValueBets',JSON.stringify(b))}}}catch{}}\n  window.addEventListener('pageshow',()=>{syncShared();setTimeout(()=>{const b=document.getElementById('refresh');if(b&&!b.disabled)b.click()},700)});\n  document.addEventListener('visibilitychange',()=>{if(!document.hidden){syncShared();setTimeout(()=>{const b=document.getElementById('refresh');if(b&&!b.disabled)b.click()},500)}});\n})(); // FVS_157_FORCE_FRESH_START\n`;
  }
  write(f,s);return true;
}

function patchMobile(){
  const js=path.join(ROOT,'public','mobile-app.js');
  let s=read(js);if(s){
    if(!s.includes('FVS_157_MOBILE_SAME_BUILD'))s+=`\n// FVS_157_MOBILE_SAME_BUILD\n(async()=>{try{if('serviceWorker' in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}if('caches' in window){for(const k of await caches.keys())await caches.delete(k)}}catch{}})();\n`;
    write(js,s);
  }
  const html=path.join(ROOT,'public','index.html');let h=read(html);
  if(h){h=h.replace(/mobile-app\.css(?:\?v=[^\"']+)?/g,`mobile-app.css?v=${VERSION}`).replace(/mobile-app\.js(?:\?v=[^\"']+)?/g,`mobile-app.js?v=${VERSION}`).replace(/manifest\.webmanifest(?:\?v=[^\"']+)?/g,`manifest.webmanifest?v=${VERSION}`);write(html,h)}
  return true;
}

export function applyV157Patch(){return {ok:true,version:VERSION,model:patchModel(),server:patchServer(),client:patchClient(),mobile:patchMobile()}}
if(process.argv.includes('--apply'))console.log(JSON.stringify(applyV157Patch(),null,2));
