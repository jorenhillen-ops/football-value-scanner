import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const VERSION='15.6.0';
const read=f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):'';
const write=(f,s)=>{fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,s,'utf8')};

function patchServer(){
  const f=path.join(ROOT,'server','app.v15.mjs');
  let s=read(f);if(!s)return false;

  // Alle Sportmonks-competities met een huidig seizoen meenemen in dagelijks onderhoud.
  s=s.replace(".filter(c=>c?.sportmonksSeasonId&&(c?.currentTeams?.length||c?.allTeams?.length)).slice(0,12)",".filter(c=>c?.sportmonksSeasonId&&(c?.currentTeams?.length||c?.allTeams?.length)).slice(0,20)");

  if(!s.includes('FVS_156_SHARED_STATE')){
    const health="app.get('/health',(q,r)=>r.json({ok:true,time:new Date().toISOString(),settings:publicSettings()}));";
    if(!s.includes(health))throw new Error('V15.6 server anchor ontbreekt');
    const block=`// FVS_156_SHARED_STATE: desktop en iPhone delen bets, bankroll en leerfeedback via de lokale server.\nfunction fvs156Family(market=''){const s=String(market);if(/^1X2/i.test(s))return '1X2';if(/^BTTS/i.test(s))return 'BTTS';if(/^Over\\/Under/i.test(s))return 'OU';if(/^Asian Handicap/i.test(s))return 'AH';return s.split(' · ')[0]||'OTHER'}\nfunction fvs156Feedback(bets=[]){\n  const usable=(bets||[]).filter(b=>b&&b.type!=='COMBO'&&['WIN','LOSS'].includes(String(b.result||'').toUpperCase())&&Number(b.modelProb)>0&&Number(b.stake)>0);\n  const calc=rows=>{\n    if(!rows.length)return {n:0};let stake=0,net=0,brier=0,ll=0,pred=0,wins=0,clv=0,clvN=0;\n    for(const b of rows){const p=Math.max(.01,Math.min(.99,Number(b.modelProb)/100)),y=String(b.result).toUpperCase()==='WIN'?1:0;stake+=Number(b.stake||0);net+=Number(b.net||0);brier+=(p-y)**2;ll+=-(y*Math.log(p)+(1-y)*Math.log(1-p));pred+=p;wins+=y;if(Number.isFinite(Number(b.clvPct))){clv+=Number(b.clvPct);clvN++}}\n    const n=rows.length,hit=wins/n;return {n,hitRatePct:hit*100,avgPredictedPct:pred/n*100,calibrationBiasPct:(pred/n-hit)*100,brier:brier/n,logLoss:ll/n,roiPct:stake?net/stake*100:0,profit:net,stake,avgClvPct:clvN?clv/clvN:null};\n  };\n  const groups={};for(const b of usable){const k=fvs156Family(b.market);(groups[k]??=[]).push(b)}\n  return {updatedAt:new Date().toISOString(),overall:calc(usable),byMarket:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,calc(v)]))};\n}\napp.get('/api/user-state',(q,r)=>{const raw=readJson('ui-state-v15.json',null),exists=Boolean(raw&&typeof raw==='object'&&Array.isArray(raw.bets));r.json({ok:true,exists,state:exists?raw:{startBankroll:50,bankroll:50,bets:[],updatedAt:null}})});\napp.post('/api/user-state',(q,r)=>{\n  const body=q.body||{},startRaw=Number(body.startBankroll),start=Number.isFinite(startRaw)&&startRaw>0&&startRaw<100000?startRaw:50,bets=Array.isArray(body.bets)?body.bets.slice(-1200):[];\n  const settledNet=bets.filter(b=>b&&b.result!=='OPEN').reduce((a,b)=>a+Number(b.net||0),0),bankroll=start+settledNet,state={startBankroll:start,bankroll,bets,updatedAt:new Date().toISOString()};\n  writeJson('ui-state-v15.json',state);const feedback=fvs156Feedback(bets);writeJson('model-feedback-v15.json',feedback);r.json({ok:true,state,feedback});\n});\napp.get('/api/model-feedback',(q,r)=>r.json({ok:true,...readJson('model-feedback-v15.json',{updatedAt:null,overall:{n:0},byMarket:{}})}));\n\n${health}`;
    s=s.replace(health,block);
  }
  write(f,s);return true;
}

function patchModel(){
  const f=path.join(ROOT,'server','model.mjs');
  let s=read(f);if(!s)return false;

  if(!s.includes('FVS_156_DYNAMIC_WEIGHTS')){
    const old=`  const baseWeights={footballData:.46,sportmonks:.25,history:.18,market:.11};\n  if(!components.footballData){baseWeights.history+=.20;baseWeights.sportmonks+=.15}\n  const quality=Number(footballData?.dataSignals?.dataCompleteness||0);if(components.footballData&&quality<45)baseWeights.footballData*=.72;`;
    const neu=`  // FVS_156_DYNAMIC_WEIGHTS: brongewicht volgt actuele dekking, sample en marktkwaliteit in plaats van één vaste mix.\n  const quality=Number(footballData?.dataSignals?.dataCompleteness||0),histSample=Math.max(Number(history?.dataSignals?.sampleMatches||0),Number(footballData?.dataSignals?.sampleMatches||0)),books=Number(market?.dataSignals?.benchmarkBooks||0);\n  const baseWeights={footballData:.40,sportmonks:.18,history:.16,market:.26};\n  if(components.footballData)baseWeights.footballData*=clamp(.72+quality/100*.58,.72,1.30);\n  if(components.history)baseWeights.history*=clamp(.72+histSample/60,.72,1.28);\n  if(components.market)baseWeights.market*=books>=2?1.28:books===1?1.0:.62;\n  if(components.sportmonks){const rich=Number(matchIntel?.lineups?.length||matchIntel?.expectedLineups?.length||0)>0||Number(matchIntel?.xg?.length||0)>0;baseWeights.sportmonks*=rich?1.18:.90}\n  if(!components.footballData){baseWeights.history+=.16;baseWeights.sportmonks+=.10;baseWeights.market+=.10}`;
    if(!s.includes(old))throw new Error('V15.6 model weight anchor ontbreekt');
    s=s.replace(old,neu);
  }

  if(!s.includes('FVS_156_UNCERTAINTY')){
    const old="  const disagreement=sourceDisagreement(available.map(([,p])=>p)),uncertainty=clamp(disagreement*1.15+Math.abs(hp.penalty-ap.penalty)*25+2.2,2.5,14);";
    const neu="  // FVS_156_UNCERTAINTY: onzekerheid stijgt bij weinig bronnen, lage dekking en onbekende line-ups.\n  const disagreement=sourceDisagreement(available.map(([,p])=>p)),sourcePenalty=available.length<=1?4:available.length===2?1.6:.4,lineupPenalty=matchIntel?(Number(matchIntel?.lineups?.length||matchIntel?.expectedLineups?.length||0)>0?.2:1.2):1.6,dataPenalty=quality<45?1.8:quality<65?.8:0,uncertainty=clamp(disagreement*1.15+Math.abs(hp.penalty-ap.penalty)*25+2.0+sourcePenalty+lineupPenalty+dataPenalty,2.5,16); // FVS_156_UNCERTAINTY";
    if(!s.includes(old))throw new Error('V15.6 uncertainty anchor ontbreekt');
    s=s.replace(old,neu);
  }

  if(!s.includes('FVS_156_CONSERVATIVE_EDGE')){
    const old=`  if(prediction.adaptive){\n    const unc=Number(sig.uncertaintyPct||99),sources=Number(sig.modelSources||0);\n    if(sources>=2 && unc<=9 && pick.value>=6 && pick.prob>=34 && confidence>=70) status='BET';\n    else if(sources>=2 && unc<=12 && pick.value>=3 && pick.prob>=30 && confidence>=64) status='VOORWAARDELIJK';\n  } else if(prediction.blended){`;
    const neu=`  if(prediction.adaptive){\n    // FVS_156_CONSERVATIVE_EDGE: een BET moet ook positief blijven aan de onderkant van de onzekerheidsmarge.\n    const unc=Number(sig.uncertaintyPct||99),sources=Number(sig.modelSources||0),consProb=Math.max(1,pick.prob-unc*.45),consEdge=(consProb/100*pick.odd-1)*100,strongPair=sources>=3||(sources>=2&&Number(sig.benchmarkBooks||0)>=1&&Number(sig.sampleMatches||0)>=18);\n    if(strongPair && unc<=9.2 && pick.value>=6.5 && consEdge>=2.0 && pick.prob>=34 && confidence>=71) status='BET';\n    else if(sources>=2 && unc<=12 && pick.value>=3.25 && consEdge>=0 && pick.prob>=30 && confidence>=64) status='VOORWAARDELIJK';\n  } else if(prediction.blended){`;
    if(!s.includes(old))throw new Error('V15.6 adaptive gate anchor ontbreekt');
    s=s.replace(old,neu);
  }

  if(!s.includes('FVS_156_FRACTIONAL_KELLY')){
    const old=`  let stakePct=0;\n  if(status==='BET') stakePct=pick.value>=10?1.5:pick.value>=7?1.25:1.0;\n  if(status==='VOORWAARDELIJK') stakePct=.5;`;
    const neu=`  // FVS_156_FRACTIONAL_KELLY: kleine fractie van Kelly, extra geremd door modelonzekerheid.\n  let stakePct=0;const pKelly=clamp(pick.prob/100,.01,.99),bKelly=Math.max(.01,pick.odd-1),kelly=Math.max(0,(bKelly*pKelly-(1-pKelly))/bKelly),riskDiscount=clamp(1-Number(sig.uncertaintyPct||8)/20,.30,.85);\n  if(status==='BET') stakePct=clamp(kelly*100*.18*riskDiscount,.35,1.25);\n  if(status==='VOORWAARDELIJK') stakePct=clamp(kelly*100*.10*riskDiscount,.20,.50); // FVS_156_FRACTIONAL_KELLY`;
    if(!s.includes(old))throw new Error('V15.6 stake anchor ontbreekt');
    s=s.replace(old,neu);
  }

  if(!s.includes('FVS_156_MULTIMARKET_GATE')){
    const old=`    let status='NO BET';\n    // Historical multi-market model is deliberately conservative; more markets, not weaker standards.\n    if(sample>=12&&confidence>=70&&value>=6.5&&modelProb>=17)status='BET';\n    else if(sample>=8&&confidence>=64&&value>=3&&modelProb>=16)status='VOORWAARDELIJK';\n    const stakePct=status==='BET'?(value>=11?1.25:1):status==='VOORWAARDELIJK'?.5:0;`;
    const neu=`    let status='NO BET';\n    // FVS_156_MULTIMARKET_GATE: multi-markten moeten ook na onzekerheidsaftrek positieve edge houden.\n    const unc=Number(prediction?.dataSignals?.uncertaintyPct||8),sources=Number(prediction?.dataSignals?.modelSources||1),consProb=Math.max(1,modelProb-unc*.35),consValue=(consProb/100*odd-1)*100;\n    if(sample>=14&&sources>=2&&confidence>=70&&unc<=10.5&&value>=7&&consValue>=2.5&&modelProb>=17)status='BET';\n    else if(sample>=9&&confidence>=64&&unc<=13&&value>=3.25&&consValue>=0&&modelProb>=16)status='VOORWAARDELIJK';\n    const pK=clamp(modelProb/100,.01,.99),bK=Math.max(.01,odd-1),k=Math.max(0,(bK*pK-(1-pK))/bK),stakePct=status==='BET'?clamp(k*100*.16,.30,1.10):status==='VOORWAARDELIJK'?clamp(k*100*.08,.20,.45):0;`;
    if(!s.includes(old))throw new Error('V15.6 multi-market anchor ontbreekt');
    s=s.replace(old,neu);
  }

  write(f,s);return true;
}

function patchRefresh(){
  const f=path.join(ROOT,'server','refresh.mjs');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_156_FEEDBACK_GATE')){
    const needle="  const logoCache=readJson('team-logo-cache.json',{});";
    if(!s.includes(needle))throw new Error('V15.6 refresh anchor ontbreekt');
    const block=`  // FVS_156_FEEDBACK_GATE: eigen gerealiseerde resultaten worden pas na voldoende sample als conservatieve risicogate gebruikt; nooit om een bet te promoveren.\n  const fvs156Feedback=readJson('model-feedback-v15.json',{overall:{n:0},byMarket:{}});\n  const fvs156Family=m=>{const z=String(m||'');if(/^1X2/i.test(z))return '1X2';if(/^BTTS/i.test(z))return 'BTTS';if(/^Over\\/Under/i.test(z))return 'OU';if(/^Asian Handicap/i.test(z))return 'AH';return z.split(' · ')[0]||'OTHER'};\n  const fvs156Gate=item=>{\n    if(!item||!['BET','VOORWAARDELIJK'].includes(item.status))return;const fb=fvs156Feedback.byMarket?.[fvs156Family(item.market)]||fvs156Feedback.overall||{},n=Number(fb.n||0);if(n<25)return;\n    item.learningSample=n;item.learningClv=fb.avgClvPct??null;item.learningBrier=fb.brier??null;\n    const bias=Number(fb.calibrationBiasPct||0),odd=Number(item.napoleonOdd||item.odds?.napoleon||0);\n    if(n>=40&&bias>4&&Number(item.modelProb)>0&&odd>1){const cut=Math.min(3.5,bias*.35),p=Math.max(1,Number(item.modelProb)-cut);item.modelProb=p;item.fairOdd=100/p;item.value=(p/100*odd-1)*100;item.feedbackCalibrationCut=cut;if(item.status==='BET'&&item.value<6.5)item.status=item.value>=3.25?'VOORWAARDELIJK':'NO BET'}\n    if(n>=30&&Number.isFinite(Number(fb.avgClvPct))&&Number(fb.avgClvPct)<-1&&item.status==='BET'){item.status='VOORWAARDELIJK';item.stakePct=Math.min(Number(item.stakePct||.5),.5);item.feedbackReason='Negatieve CLV in recente eigen sample'}\n    if(n>=50&&Number(fb.roiPct)<-12&&Number(fb.avgClvPct)<-2.5){item.status='NO BET';item.stakePct=0;item.feedbackReason='Markt tijdelijk geblokkeerd door zwakke ROI + CLV sample'}\n  };\n  for(const m of rows){fvs156Gate(m);for(const o of m.opportunities||[])fvs156Gate(o);m.opportunities=(m.opportunities||[]).filter(o=>['BET','VOORWAARDELIJK'].includes(o.status)&&o.napoleonOdd)}\n  providerStatus.learning={configured:true,sample:Number(fvs156Feedback.overall?.n||0),message:Number(fvs156Feedback.overall?.n||0)>=25?'Eigen settlement-feedback actief als risicogate':'Feedback wordt verzameld; minimaal 25 afgerekende single bets nodig'};\n\n${needle}`;
    s=s.replace(needle,block);
  }
  write(f,s);return true;
}

function patchClient(){
  const f=path.join(ROOT,'public','app.js');
  let s=read(f);if(!s)return false;
  if(!s.includes('FVS_156_SHARED_CLIENT')){
    const old="function save(){localStorage.setItem('fv6bets',JSON.stringify(B));localStorage.setItem('fv6bank',String(BANK))}";
    const neu=`// FVS_156_SHARED_CLIENT: browser-local mirror + server-side gedeelde toestand voor pc/iPhone.\nlet FVS_STATE_SAVE_TIMER=null;\nfunction fvsPersistSharedState(){clearTimeout(FVS_STATE_SAVE_TIMER);FVS_STATE_SAVE_TIMER=setTimeout(()=>fetch('/api/user-state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({startBankroll:START,bankroll:BANK,bets:B})}).catch(()=>{}),180)}\nasync function fvsLoadSharedState(){try{const r=await fetch('/api/user-state?'+Date.now(),{cache:'no-store'}),x=await r.json();if(!r.ok||!x.ok)return;if(x.exists&&x.state){START=Number(x.state.startBankroll||50);B=Array.isArray(x.state.bets)?x.state.bets:[];BANK=Number(x.state.bankroll||START);localStorage.setItem('fv6bets',JSON.stringify(B));localStorage.setItem('fv6bank',String(BANK));return}if(B.length||Math.abs(BANK-START)>.001)fvsPersistSharedState()}catch{}}\nfunction save(){localStorage.setItem('fv6bets',JSON.stringify(B));localStorage.setItem('fv6bank',String(BANK));fvsPersistSharedState()}`;
    if(!s.includes(old))throw new Error('V15.6 client save anchor ontbreekt');
    s=s.replace(old,neu);
    s=s.replace("async function load(){\n  try{","async function load(){\n  try{await fvsLoadSharedState();");
    s=s.replace("modelProb:m.modelProb,value:m.value,type:'SINGLE'","modelProb:m.modelProb,value:m.value,modelSource:m.modelSource||null,confidence:m.confidence||null,statusAtPlay:m.status||null,exactOddsVerified:Boolean(m.exactOddsVerified),type:'SINGLE'");
    s=s.replace("modelProb:o.modelProb,value:o.value,type:'SINGLE'","modelProb:o.modelProb,value:o.value,modelSource:o.modelSource||mm?.modelSource||null,confidence:o.confidence||null,statusAtPlay:o.status||null,exactOddsVerified:Boolean(o.exactOddsVerified),type:'SINGLE'");
  }
  write(f,s);return true;
}

export function applyV156Patch(){return {ok:true,version:VERSION,server:patchServer(),model:patchModel(),refresh:patchRefresh(),client:patchClient()}}
if(process.argv.includes('--apply'))console.log(JSON.stringify(applyV156Patch(),null,2));
