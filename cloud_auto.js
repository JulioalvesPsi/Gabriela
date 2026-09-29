const ACCESS_KEY='gabriela_family_access_v1';
let directConnected=false;

function getAccessCode(){
  try{return localStorage.getItem(ACCESS_KEY)||''}catch{return''}
}

function hideOldLoginUi(){
  try{
    const card=document.querySelector('.cloudCard');
    if(!card)return;
    card.querySelectorAll('.row').forEach(x=>x.classList.add('hidden'));
    ['sbSave','sbLogin','sbSignup','sbLogout'].forEach(id=>document.getElementById(id)?.classList.add('hidden'));
    const p=card.querySelector('p.muted');
    if(p)p.textContent='A nuvem conecta automaticamente pelo link do aplicativo. Não é necessário login, e mail ou senha.';
    const note=card.querySelector('.note');
    if(note)note.textContent='Palavras, resultados e tempos ficam salvos na nuvem. Se a internet falhar, o aplicativo continua salvando neste aparelho e sincroniza depois.';
  }catch{}
}

renderCloudState=function(){
  hideOldLoginUi();
  if(directConnected){
    cloudBadge.textContent='Nuvem conectada';
    cloudBadge.className='cloudBadge online';
    syncState.textContent='conectada';
    sbSync.classList.remove('hidden');
  }else{
    cloudBadge.textContent=navigator.onLine?'Conectando à nuvem':'Sem internet';
    cloudBadge.className='cloudBadge offline';
    syncState.textContent=navigator.onLine?'conectando':'offline';
    sbSync.classList.add('hidden');
  }
};

syncCloud=async function(showMessage=true){
  if(!sb||syncBusy)return;
  const accessCode=getAccessCode();
  if(!accessCode){
    directConnected=false;
    renderCloudState();
    cloudMsg.textContent='Abra o link privado do aplicativo uma vez neste aparelho para ativar a nuvem.';
    return;
  }

  syncBusy=true;
  if(showMessage)cloudMsg.textContent='Sincronizando...';
  try{
    const words=db.words.map(w=>({word:w.w,source:w.source||'manual'}));
    const attempts=[];
    db.words.forEach(w=>w.history.forEach(h=>{
      if(!h.synced)attempts.push({
        event_id:h.eventId,
        word:w.w,
        result:h.result,
        who:h.who,
        duration_ms:h.durationMs||null,
        created_at:h.date
      });
    }));

    const {data,error}=await sb.rpc('gabriela_sync',{
      p_code:accessCode,
      p_words:words,
      p_attempts:attempts,
      p_case_mode:db.settings.caseMode,
      p_adaptive:db.settings.adaptive
    });
    if(error)throw error;

    const payload=data||{};
    const map=new Map(db.words.map(w=>[w.w,w]));

    (payload.words||[]).forEach(r=>{
      if(!map.has(r.word)){
        const obj={w:r.word,history:[],source:r.source||'cloud'};
        db.words.push(obj);
        map.set(r.word,obj);
      }
    });

    const localEvents=new Set();
    db.words.forEach(w=>w.history.forEach(h=>localEvents.add(h.eventId)));

    (payload.attempts||[]).forEach(r=>{
      if(localEvents.has(r.event_id))return;
      let w=map.get(r.word);
      if(!w){
        w={w:r.word,history:[],source:'cloud'};
        db.words.push(w);
        map.set(r.word,w);
      }
      w.history.push({
        eventId:r.event_id,
        date:r.created_at,
        result:r.result,
        who:r.who,
        durationMs:r.duration_ms,
        synced:true
      });
      localEvents.add(r.event_id);
    });

    db.words.forEach(w=>w.history.forEach(h=>h.synced=true));

    if(payload.settings){
      db.settings.caseMode=payload.settings.case_mode==='upper'?'upper':'lower';
      db.settings.adaptive=payload.settings.adaptive!==false;
    }

    directConnected=true;
    persist();
    render();
    if(showMessage)cloudMsg.textContent='Sincronização concluída.';
  }catch(e){
    directConnected=false;
    renderCloudState();
    cloudMsg.textContent='Falha ao sincronizar. Os dados continuam salvos neste aparelho. '+(e.message||'');
  }finally{
    syncBusy=false;
  }
};

save=function(){
  persist();
  render();
  syncCloud(false);
};

async function connectAutomatically(){
  const cfg=cloudConfig();
  if(!cfg.url||!cfg.key||!window.supabase){
    cloudMsg.textContent='Configuração da nuvem indisponível.';
    renderCloudState();
    return;
  }
  try{
    sb=window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    sbUser={id:'direct'};
    renderCloudState();
    await syncCloud(true);
  }catch(e){
    directConnected=false;
    cloudMsg.textContent='Não foi possível conectar à nuvem. '+(e.message||'');
    renderCloudState();
  }
}

window.addEventListener('online',()=>syncCloud(false));
window.addEventListener('offline',()=>renderCloudState());

hideOldLoginUi();
connectAutomatically();
