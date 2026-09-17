import {fetchSportmonksTeamLogo} from './sportmonks.mjs';

const GH_TREE='https://api.github.com/repos/luukhopman/football-logos/git/trees/master?recursive=1';
const GUARDIAN_MANIFEST='https://raw.githubusercontent.com/guardian/football-assets/main/source/crests/crests.json';
let publicIndexPromise=null;

const ALIASES={
  'man city':'manchester city','man united':'manchester united','nottm forest':'nottingham forest','nottingham':'nottingham forest',
  'sheff utd':'sheffield united','sheff wed':'sheffield wednesday','west brom':'west bromwich albion','qpr':'queens park rangers',
  'wolves':'wolverhampton wanderers','tottenham':'tottenham hotspur','newcastle':'newcastle united','west ham':'west ham united',
  'leicester':'leicester city','norwich':'norwich city','swansea':'swansea city','birmingham':'birmingham city','stoke':'stoke city',
  'hull':'hull city','derby':'derby county','blackburn':'blackburn rovers','bolton':'bolton wanderers','ipswich':'ipswich town',
  'bayern munich':'bayern munchen','dortmund':'borussia dortmund','m gladbach':'borussia monchengladbach','gladbach':'borussia monchengladbach',
  'leverkusen':'bayer leverkusen','ein frankfurt':'eintracht frankfurt','union berlin':'union berlin','mainz':'mainz 05',
  'freiburg':'sc freiburg','hoffenheim':'tsg hoffenheim','stuttgart':'vfb stuttgart','hamburg':'hamburger sv',
  'inter':'inter milan','milan':'ac milan','roma':'as roma','lazio':'ss lazio','verona':'hellas verona','fiorentina':'acf fiorentina',
  'torino':'torino fc','genoa':'genoa cfc','parma':'parma calcio','napoli':'ssc napoli',
  'ath madrid':'atletico madrid','atletico':'atletico madrid','ath bilbao':'athletic bilbao','sociedad':'real sociedad','betis':'real betis',
  'celta':'celta vigo','vallecano':'rayo vallecano','alaves':'deportivo alaves','mallorca':'rcd mallorca','espanol':'rcd espanyol',
  'espanyol':'rcd espanyol','valladolid':'real valladolid','zaragoza':'real zaragoza','gijon':'sporting gijon','la coruna':'deportivo la coruna',
  'paris sg':'paris saint germain','psg':'paris saint germain','marseille':'olympique marseille','lyon':'olympique lyonnais','rennes':'stade rennais',
  'strasbourg':'rc strasbourg','brest':'stade brestois','lens':'rc lens','lille':'lille osc',
  'ajax':'ajax amsterdam','psv':'psv eindhoven','twente':'fc twente','utrecht':'fc utrecht','nijmegen':'nec nijmegen','waalwijk':'rkc waalwijk',
  'club brugge':'brugge','brugge':'brugge','gent':'gent','genk':'genk','anderlecht':'anderlecht','westerlo':'westerlo',
  'union sg':'union saint gilloise','st truiden':'sint truiden','standard':'standard liege','charleroi':'sporting charleroi',
  'mechelen':'mechelen','leuven':'oud heverlee leuven','oh leuven':'oud heverlee leuven','antwerp':'antwerp',
  'porto':'fc porto','benfica':'sl benfica','sp lisbon':'sporting cp','sporting lisbon':'sporting cp','braga':'sc braga',
  'guimaraes':'vitoria guimaraes','boavista':'boavista fc','galatasaray':'galatasaray','fenerbahce':'fenerbahce','besiktas':'besiktas',
  'olympiakos':'olympiacos','olympiacos':'olympiacos','aek':'aek athens','paok':'paok thessaloniki','aris':'aris thessaloniki',
  'ofi crete':'ofi crete','rangers':'rangers','hearts':'heart of midlothian','dundee utd':'dundee united','st mirren':'st mirren'
};

const ORG=new Set(['fc','cf','afc','ac','sc','ssc','ss','sv','fk','sk','cd','kv','kvc','ksv','rsc','rfc','krc','kaa','rc','vfb','tsg','oh','fcv','gfs']);
function baseNorm(s=''){
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/[’']/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
}
function canonical(s=''){
  let n=baseNorm(s)
    .replace(/\bnottm\b/g,'nottingham').replace(/\bm gladbach\b/g,'monchengladbach')
    .replace(/\bst\b/g,'saint').replace(/\butd\b/g,'united');
  if(ALIASES[n])n=ALIASES[n];
  let toks=n.split(' ').filter(Boolean);
  toks=toks.filter((t,i)=>!ORG.has(t) && t!=='football' && t!=='club' && t!=='calcio' && t!=='royal' && t!=='royale');
  n=toks.join(' ');
  if(ALIASES[n])n=ALIASES[n];
  return n;
}
function tokens(s){return new Set(canonical(s).split(' ').filter(Boolean))}
function tokenScore(a,b){
  const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;
  let same=0;for(const x of A)if(B.has(x))same++;
  return (2*same)/(A.size+B.size);
}
function safeEquivalent(a,b){
  const A=canonical(a),B=canonical(b);if(!A||!B)return false;if(A===B)return true;
  const ta=A.split(' '),tb=B.split(' ');
  if(ta.length>=2&&tb.length>=2&&tokenScore(A,B)>=.94)return true;
  return false;
}
async function fetchJson(url,timeoutMs=24000){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{signal:ctrl.signal,headers:{accept:'application/json','user-agent':'FootballValueScanner/14.1'}});
    if(!r.ok)throw new Error(`Logo source ${r.status}`);return await r.json();
  }finally{clearTimeout(timer)}
}
function rawGithub(owner,repo,branch,path){return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.split('/').map(encodeURIComponent).join('/')}`}
async function publicIndex(){
  if(publicIndexPromise)return publicIndexPromise;
  publicIndexPromise=(async()=>{
    const out={current:[],guardian:[],errors:[]};
    try{
      const tree=await fetchJson(GH_TREE);
      for(const x of Array.isArray(tree?.tree)?tree.tree:[]){
        if(x?.type!=='blob'||!/^logos\//i.test(x.path||'')||!/[.]png$/i.test(x.path||''))continue;
        const seg=String(x.path).split('/'),file=seg.pop(),league=seg.slice(1).join(' / '),name=file.replace(/[.]png$/i,'');
        out.current.push({name,league,path:x.path,image:rawGithub('luukhopman','football-logos','master',x.path),source:'2026/27 current-season crest set'});
      }
    }catch(e){out.errors.push(`current:${e.message}`)}
    try{
      const g=await fetchJson(GUARDIAN_MANIFEST);
      for(const x of Array.isArray(g?.crests)?g.crests:[]){if(!x?.team||!x?.filename)continue;out.guardian.push({name:x.team,image:`https://raw.githubusercontent.com/guardian/football-assets/main/source/crests/${encodeURIComponent(x.filename)}`,source:'Guardian football crest archive'});}
    }catch(e){out.errors.push(`guardian:${e.message}`)}
    return out;
  })();
  return publicIndexPromise;
}
function chooseVerified(teamName,rows=[]){
  const exact=rows.filter(x=>safeEquivalent(teamName,x.name));
  if(exact.length===1)return {...exact[0],score:1};
  if(exact.length>1){
    const ranked=exact.map(x=>({...x,score:tokenScore(teamName,x.name)})).sort((a,b)=>b.score-a.score);
    if(ranked[0].score>ranked[1].score+.04)return ranked[0];
  }
  const ranked=rows.map(x=>({...x,score:tokenScore(teamName,x.name)})).sort((a,b)=>b.score-a.score);
  const best=ranked[0],second=ranked[1];
  if(best && best.score>=.965 && (!second||best.score-second.score>=.08))return best;
  return null;
}
export async function resolvePublicTeamLogo({teamName}){
  const idx=await publicIndex();
  const current=chooseVerified(teamName,idx.current);
  if(current)return {ok:true,verified:true,image:current.image,name:current.name,score:current.score,source:current.source};
  const guardian=chooseVerified(teamName,idx.guardian);
  if(guardian)return {ok:true,verified:true,image:guardian.image,name:guardian.name,score:guardian.score,source:guardian.source};
  return {ok:false,verified:false,reason:'Geen veilig geverifieerde crest-match in de openbare logo-index',sourceErrors:idx.errors};
}
export async function resolveTeamLogo({token,teamName,country}){
  // Public manifests first: deterministic and no paid API request per badge.
  const pub=await resolvePublicTeamLogo({teamName,country});
  if(pub?.ok)return pub;
  // Sportmonks is the authoritative fallback when the user plan covers this club.
  const sm=await fetchSportmonksTeamLogo(token,teamName,{country});
  if(sm?.ok)return {...sm,verified:true};
  // Never guess a crest. Initials are safer than attaching the wrong badge to a club.
  return {ok:false,verified:false,reason:sm?.reason||pub?.reason||'Geen geverifieerd logo gevonden'};
}
