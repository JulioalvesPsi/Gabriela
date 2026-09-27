const FAMILY_ID='91cb1562-7220-4bd9-8faa-8eb3886086bb';
let familyId=FAMILY_ID;

function hideOldLoginUi(){
  try{
    const card=document.querySelector('.cloudCard');
    if(!card)return;
    card.querySelectorAll('.row').forEach(x=>x.classList.add('hidden'));
    ['sbSave','sbLogin','sbSignup','sbLogout'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
    const p=card.querySelector('p.muted');
    if(p)p.textContent='A nuvem conecta automaticamente ao abrir o aplicativo. Não é necessário informar e mail ou senha.';
    const note=card.querySelector('.note');
    if(note)note.textContent='A identificação técnica é criada automaticamente pelo Supabase e fica invisível para quem usa o aplicativo.';
  }catch{}
}

renderCloudState=function(){
  hideOldLoginUi();
  if(sbUser&&familyId){
    cloudBadge.textContent='Nuvem conectada';
    cloudBadge.className='cloudBadge online';
    syncState.textContent='conectada';
    sbSync.classList.remove('hidden');
  }else{
    cloudBadge.textContent='Conectando à nuvem';
    cloudBadge.className='cloudBadge offline';
    syncState.textContent='conectando';
    sbSync.classList.add('hidden');
  }
};

syncCloud=async function(showMessage=true){
  if(!sb||!sbUser||!familyId||syncBusy)return;
  syncBusy=true;
  if(showMessage)cloudMsg.textContent='Sincronizando...';
  try{
    const fid=familyId;
    const wordRows=db.words.map(w=>({family_id:fid,word:w.w,source:w.source||'manual'}));
    if(wordRows.length){
      const {error}=await sb.from('family_words').upsert(wordRows,{onConflict:'family_id,word'});
      if(error)throw error;
    }
    let unsynced=[];
    db.words.forEach(w=>w.history.forEach(h=>{
      if(!h.synced)unsynced.push({event_id:h.eventId,family_id:fid,word:w.w,result:h.result,who:h.who,duration_ms:h.durationMs||null,created_at:h.date});
    }));
    if(unsynced.length){
      for(let start=0;start<unsynced.length;start+=300){
        const {error}=await sb.from('family_attempts').upsert(unsynced.slice(start,start+300),{onConflict:'event_id'});
        if(error)throw error;
      }
    }
    const {error:setErr}=await sb.from('family_settings').upsert({family_id:fid,case_mode:db.settings.caseMode,adaptive:db.settings.adaptive,updated_at:new Date().toISOString()},{onConflict:'family_id'});
    if(setErr)throw setErr;
    const [{data:cloudWords,error:wErr},{data:cloudAttempts,error:aErr},{data:cloudSettings,error:sErr}]=await Promise.all([
      sb.from('family_words').select('word,source').eq('family_id',fid),
      sb.from('family_attempts').select('event_id,word,result,who,duration_ms,created_at').eq('family_id',fid).order('created_at',{ascending:true}),
      sb.from('family_settings').select('case_mode,adaptive').eq('family_id',fid).maybeSingle()
    ]);
    if(wErr)throw wErr;if(aErr)throw aErr;if(sErr)throw sErr;
    const map=new Map(db.words.map(w=>[w.w,w]));
    (cloudWords||[]).forEach(r=>{
      if(!map.has(r.word)){
        const obj={w:r.word,history:[],source:r.source||'cloud'};
        db.words.push(obj);map.set(r.word,obj);
      }
    });
    const localEvents=new Set();
    db.words.forEach(w=>w.history.forEach(h=>localEvents.add(h.eventId)));
    (cloudAttempts||[]).forEach(r=>{
      if(localEvents.has(r.event_id))return;
      let w=map.get(r.word);
      if(!w){w={w:r.word,history:[],source:'cloud'};db.words.push(w);map.set(r.word,w)}
      w.history.push({eventId:r.event_id,date:r.created_at,result:r.result,who:r.who,durationMs:r.duration_ms,synced:true});
      localEvents.add(r.event_id);
    });
    db.words.forEach(w=>w.history.forEach(h=>h.synced=true));
    if(cloudSettings){
      db.settings.caseMode=cloudSettings.case_mode==='upper'?'upper':'lower';
      db.settings.adaptive=cloudSettings.adaptive!==false;
    }
    persist();render();
    if(showMessage)cloudMsg.textContent='Sincronização concluída.';
  }catch(e){
    cloudMsg.textContent='Falha ao sincronizar. Os dados continuam salvos neste aparelho. '+(e.message||'');
  }finally{syncBusy=false}
};

async function connectAutomatically(){
  const cfg=cloudConfig();
  if(!cfg.url||!cfg.key||!window.supabase){
    cloudMsg.textContent='Configuração da nuvem indisponível.';
    renderCloudState();
    return;
  }
  try{
    if(!sb)sb=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    let {data:{session},error}=await sb.auth.getSession();
    if(error)throw error;
    if(!session){
      const res=await sb.auth.signInAnonymously();
      if(res.error)throw res.error;
      session=res.data.session;
    }
    sbUser=session?.user||null;
    if(!sbUser)throw new Error('Não foi possível iniciar a conexão automática.');
    renderCloudState();
    await syncCloud(true);
  }catch(e){
    sbUser=null;
    cloudMsg.textContent='Não foi possível conectar à nuvem. '+(e.message||'');
    renderCloudState();
  }
}

hideOldLoginUi();
connectAutomatically();
