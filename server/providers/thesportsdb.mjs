const BASE='https://www.thesportsdb.com/api/v1/json/123';

export async function fetchFreeDay(dateISO){
  const u=new URL(`${BASE}/eventsday.php`);
  u.searchParams.set('d',dateISO);
  u.searchParams.set('s','Soccer');
  const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetch(u,{signal:ctrl.signal,headers:{accept:'application/json'}});
    if(!r.ok) throw new Error(`TheSportsDB ${r.status}`);
    const x=await r.json();
    const events=Array.isArray(x?.events)?x.events:[];
    return {ok:true,fixtures:events.map(e=>({
      providerId:`tsdb-${e.idEvent}`,
      home:e.strHomeTeam, away:e.strAwayTeam,
      competition:e.strLeague||'Football',
      startTime:e.strTimestamp||`${e.dateEvent}T${e.strTime||'00:00:00'}Z`,
      napoleon:{home:null,draw:null,away:null,changedAt:null},
      source:'TheSportsDB free fallback',
      externalProviders:{theSportsDbId:e.idEvent}
    }))};
  }catch(e){
    return {ok:false,fixtures:[],reason:e.message};
  } finally { clearTimeout(t); }
}
