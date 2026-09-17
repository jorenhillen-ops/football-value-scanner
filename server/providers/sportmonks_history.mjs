const BASE='https://api.sportmonks.com/v3/football';

function norm(s=''){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b(fc|cf|afc|ac|sv|ssc|club|football|fk|sk|cd)\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function similarity(a,b){
  const A=norm(a).split(' ').filter(Boolean),B=norm(b).split(' ').filter(Boolean);
  if(!A.length||!B.length)return 0;
  if(norm(a)===norm(b))return 1;
  const bs=new Set(B);let n=0;
  for(const t of A)if(bs.has(t))n++;
  return n/Math.max(A.length,B.length);
}
function dateShift(dateISO,days){
  const d=new Date(dateISO+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);
  return d.toISOString().slice(0,10);
}
async function request(path,token,params={},timeoutMs=30000){
  const u=new URL(BASE+path);
  u.searchParams.set('api_token',token);
  Object.entries(params).forEach(([k,v])=>{
    if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));
  });
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const r=await fetch(u,{signal:ctrl.signal,headers:{accept:'application/json'}});
    const body=await r.text();
    if(!r.ok){
      const e=new Error(`Sportmonks history ${r.status}: ${body.slice(0,320)}`);
      e.status=r.status;throw e;
    }
    return body?JSON.parse(body):{};
  }finally{clearTimeout(timer)}
}
async function pageRange(token,start,end,leagueIds){
  let all=[],page=1,more=true;
  while(more&&page<=12){
    const raw=await request(`/fixtures/between/${start}/${end}`,token,{
      include:'participants;scores;league;statistics.type',
      filters:`fixtureLeagues:${leagueIds.join(',')}`,
      per_page:50,page,order:'asc'
    });
    all.push(...(Array.isArray(raw?.data)?raw.data:[]));
    more=Boolean(raw?.pagination?.has_more);
    page++;
  }
  return all;
}
function fullTimeScore(f){
  const scores=Array.isArray(f?.scores)?f.scores:[];
  const chosen=scores.filter(s=>String(s?.description||'').toUpperCase()==='CURRENT');
  const fallback=scores.filter(s=>String(s?.description||'').toUpperCase()==='2ND_HALF');
  const rows=chosen.length?chosen:fallback;
  let home=null,away=null;
  for(const s of rows){
    const loc=s?.score?.participant;
    const goals=Number(s?.score?.goals);
    if(!Number.isFinite(goals))continue;
    if(loc==='home')home=goals;
    if(loc==='away')away=goals;
  }
  return Number.isFinite(home)&&Number.isFinite(away)?{home,away}:null;
}
function fixtureStats(f){
  const out={home:{},away:{}};
  for(const x of Array.isArray(f?.statistics)?f.statistics:[]){
    const loc=x?.location||x?.meta?.location;if(loc!=='home'&&loc!=='away')continue;
    const code=x?.type?.code||x?.type?.developer_name||x?.type?.name||String(x?.type_id||'');
    const raw=x?.data?.value??x?.value??x?.data,n=Number(raw);
    out[loc][code]=Number.isFinite(n)?n:raw;
  }
  return out;
}
function parseFixture(f){
  const parts=Array.isArray(f?.participants)?f.participants:[];
  const H=parts.find(p=>p?.meta?.location==='home')||parts[0];
  const A=parts.find(p=>p?.meta?.location==='away')||parts[1];
  const score=fullTimeScore(f);
  if(!H||!A||!score)return null;
  return {
    leagueId:Number(f.league_id),leagueName:f?.league?.name||`League ${f.league_id}`,
    date:f.starting_at||'',home:H.name,away:A.name,hg:score.home,ag:score.away,stats:fixtureStats(f)
  };
}
function ensure(teams,name){
  return teams[name]??=( {
    name,homeGF:0,homeGA:0,homeN:0,awayGF:0,awayGA:0,awayN:0,recent:[],
    shotsFor:0,shotsAgainst:0,sotFor:0,sotAgainst:0,cornersFor:0,cornersAgainst:0,foulsFor:0,foulsAgainst:0,
    possession:0,dangerousAttacks:0,bigChances:0,passes:0,statsN:0,shotsN:0,sotN:0,cornersN:0,foulsN:0,possessionN:0,dangerN:0,bigChanceN:0,passesN:0
  } );
}
function sv(o,...keys){for(const k of keys){const n=Number(o?.[k]);if(Number.isFinite(n))return n}return null}
function addRichStats(team,own,opp){
  const shots=sv(own,'shots-total','SHOTS_TOTAL'),shotsA=sv(opp,'shots-total','SHOTS_TOTAL');
  const sot=sv(own,'shots-on-target','SHOTS_ON_TARGET'),sotA=sv(opp,'shots-on-target','SHOTS_ON_TARGET');
  const cor=sv(own,'corners','CORNERS'),corA=sv(opp,'corners','CORNERS');
  const fou=sv(own,'fouls','FOULS'),fouA=sv(opp,'fouls','FOULS');
  const pos=sv(own,'ball-possession','BALL_POSSESSION');
  const da=sv(own,'dangerous-attacks','DANGEROUS_ATTACKS');
  const bc=sv(own,'big-chances-created','BIG_CHANCES_CREATED');
  const passes=sv(own,'passes','PASSES');
  if([shots,shotsA,sot,sotA,cor,corA,fou,fouA,pos,da,bc,passes].some(x=>x!==null))team.statsN++;
  if(shots!==null&&shotsA!==null){team.shotsFor+=shots;team.shotsAgainst+=shotsA;team.shotsN++}
  if(sot!==null&&sotA!==null){team.sotFor+=sot;team.sotAgainst+=sotA;team.sotN++}
  if(cor!==null&&corA!==null){team.cornersFor+=cor;team.cornersAgainst+=corA;team.cornersN++}
  if(fou!==null&&fouA!==null){team.foulsFor+=fou;team.foulsAgainst+=fouA;team.foulsN++}
  if(pos!==null){team.possession+=pos;team.possessionN++}if(da!==null){team.dangerousAttacks+=da;team.dangerN++}if(bc!==null){team.bigChances+=bc;team.bigChanceN++}if(passes!==null){team.passes+=passes;team.passesN++}
}
function buildModels(matches){
  const groups=new Map();
  for(const m of matches){
    if(!groups.has(m.leagueId))groups.set(m.leagueId,{leagueId:m.leagueId,name:m.leagueName,matches:[]});
    groups.get(m.leagueId).matches.push(m);
  }
  const models=[];
  for(const g of groups.values()){
    if(g.matches.length<12)continue;
    let totalH=0,totalA=0;
    const teams={};
    g.matches.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    for(const m of g.matches){
      totalH+=m.hg;totalA+=m.ag;
      const H=ensure(teams,m.home),A=ensure(teams,m.away);
      H.homeGF+=m.hg;H.homeGA+=m.ag;H.homeN++;
      A.awayGF+=m.ag;A.awayGA+=m.hg;A.awayN++;
      const hp=m.hg>m.ag?3:m.hg===m.ag?1:0;
      const ap=m.ag>m.hg?3:m.hg===m.ag?1:0;
      H.recent.push({date:m.date,gf:m.hg,ga:m.ag,pts:hp,stats:m.stats?.home||{}});
      A.recent.push({date:m.date,gf:m.ag,ga:m.hg,pts:ap,stats:m.stats?.away||{}});
      addRichStats(H,m.stats?.home||{},m.stats?.away||{});addRichStats(A,m.stats?.away||{},m.stats?.home||{});
    }
    models.push({
      leagueId:g.leagueId,name:g.name,matches:g.matches.length,
      avgHome:totalH/g.matches.length,avgAway:totalA/g.matches.length,teams
    });
  }
  return models;
}
function teamMatch(model,name){
  let best=null,score=0;
  for(const n of Object.keys(model.teams)){
    const s=similarity(name,n);
    if(s>score){score=s;best=n}
  }
  return score>=.56?{name:best,score}:null;
}
function shrink(rate,n,prior){
  const k=7;
  return (rate*n+prior*k)/(n+k);
}
function form(team){
  const last=team.recent.slice(-6);
  if(!last.length)return 1;
  const ppg=last.reduce((a,x)=>a+x.pts,0)/last.length;
  const gd=last.reduce((a,x)=>a+x.gf-x.ga,0)/last.length;
  return Math.max(.90,Math.min(1.10,1+(ppg-1.35)*.025+gd*.015));
}
function richAdj(team){
  if(!team.statsN)return 1;
  if(!team.shotsN||!team.sotN)return 1;
  const sf=team.shotsFor/team.shotsN,sa=team.shotsAgainst/team.shotsN,sot=team.sotFor/team.sotN,sota=team.sotAgainst/team.sotN;
  const signal=(sf-sa)*.004+(sot-sota)*.012;
  return Math.max(.92,Math.min(1.08,1+signal));
}
function poisson(k,l){
  let f=1;for(let i=2;i<=k;i++)f*=i;
  return Math.exp(-l)*Math.pow(l,k)/f;
}
function probability(lh,la){
  let h=0,d=0,a=0;
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
    const p=poisson(i,lh)*poisson(j,la);
    if(i>j)h+=p;else if(i===j)d+=p;else a+=p;
  }
  const s=h+d+a;
  return {home:h/s*100,draw:d/s*100,away:a/s*100};
}
export function historicalPrediction(fixture,models=[]){
  let best=null,bestScore=0;
  for(const model of models){
    const hm=teamMatch(model,fixture.home),am=teamMatch(model,fixture.away);
    if(!hm||!am)continue;
    const score=(hm.score+am.score)/2;
    if(score<=bestScore)continue;
    const H=model.teams[hm.name],A=model.teams[am.name];
    const sample=Math.min(H.homeN+H.awayN,A.homeN+A.awayN);
    if(sample<6)continue;

    const hGF=shrink(H.homeN?H.homeGF/H.homeN:model.avgHome,H.homeN,model.avgHome);
    const hGA=shrink(H.homeN?H.homeGA/H.homeN:model.avgAway,H.homeN,model.avgAway);
    const aGF=shrink(A.awayN?A.awayGF/A.awayN:model.avgAway,A.awayN,model.avgAway);
    const aGA=shrink(A.awayN?A.awayGA/A.awayN:model.avgHome,A.awayN,model.avgHome);

    let xh=model.avgHome*(hGF/model.avgHome)*(aGA/model.avgHome)*form(H)*richAdj(H);
    let xa=model.avgAway*(aGF/model.avgAway)*(hGA/model.avgAway)*form(A)*richAdj(A);
    xh=Math.max(.25,Math.min(3.7,xh));xa=Math.max(.20,Math.min(3.4,xa));

    bestScore=score;
    best={
      predictions:probability(xh,xa),predictable:true,sportmonksHistory:true,
      historyLeague:model.name,expectedGoals:{home:xh,away:xa},
      matchedTeams:{home:hm.name,away:am.name,score},
      historicalFeatures:{
        homeShots:H.shotsN?H.shotsFor/H.shotsN:null,awayShots:A.shotsN?A.shotsFor/A.shotsN:null,
        homeSot:H.sotN?H.sotFor/H.sotN:null,awaySot:A.sotN?A.sotFor/A.sotN:null,
        homeCorners:H.cornersN?H.cornersFor/H.cornersN:null,awayCorners:A.cornersN?A.cornersFor/A.cornersN:null,
        homeFouls:H.foulsN?H.foulsFor/H.foulsN:null,awayFouls:A.foulsN?A.foulsFor/A.foulsN:null,
        homePossession:H.possessionN?H.possession/H.possessionN:null,awayPossession:A.possessionN?A.possession/A.possessionN:null,
        homeDangerousAttacks:H.dangerN?H.dangerousAttacks/H.dangerN:null,awayDangerousAttacks:A.dangerN?A.dangerousAttacks/A.dangerN:null
      },
      dataSignals:{
        expectedLineups:0,sidelined:0,xgItems:0,predictionAvailable:true,
        sampleMatches:sample,historyMatches:model.matches,teamStatistics:(H.statsN+A.statsN),
        shotsAvailable:H.shotsN>0&&A.shotsN>0,sotAvailable:H.sotN>0&&A.sotN>0,
        foulsAvailable:H.foulsN>0&&A.foulsN>0,cornersAvailable:H.cornersN>0&&A.cornersN>0
      }
    };
  }
  return best?{prediction:best,score:bestScore}:null;
}

export async function fetchSportmonksHistory(token,dateISO,leagueIds=[]){
  if(!token||!leagueIds.length)return {ok:false,reason:'Geen token/leagues',models:[],matches:0};
  // API maximum range is 100 days. Two windows give roughly five months of history.
  const end=dateShift(dateISO,-1);
  const mid=dateShift(end,-79);
  const start=dateShift(mid,-79);
  const [older,newer]=await Promise.all([
    pageRange(token,start,dateShift(mid,-1),leagueIds),
    pageRange(token,mid,end,leagueIds)
  ]);
  const parsed=[...older,...newer].map(parseFixture).filter(Boolean);
  const unique=new Map(parsed.map(x=>[`${x.date}|${x.home}|${x.away}`,x]));
  const matches=[...unique.values()];
  const models=buildModels(matches);
  return {
    ok:models.length>0,models,matches:matches.length,
    leagues:models.length,start,end,
    message:`${matches.length} historische wedstrijden · ${models.length} leagues`
  };
}
