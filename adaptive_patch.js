// Ajustes adaptativos: menos repetição após acerto e mais variedade.
const GABRIELA_NAMES=['pablo','paulo','pedro','bruno','clara','laura','maria','lucas','gabriel','marina','carla','felipe','rafael','bianca','daniel','helena','juliana','renata','camila','marcos','alice','ana','joão','davi','sofia','luiza','beatriz','caio','leo','lara'];

function recentlySucceeded(w,hours=12){
  const h=ch(w);
  if(!h.length)return false;
  const x=h[h.length-1];
  if(x.result!=='lido'||!x.date)return false;
  return Date.now()-new Date(x.date).getTime()<hours*3600000;
}

function exposureCount(w){return ch(w).length}

addAdaptiveWords=function(n){
  if(!db.settings.adaptive||totalAttempts()<8||n<=0)return[];
  const existing=new Set(db.words.map(x=>x.w));
  const targets=targetPatterns();
  const names=GABRIELA_NAMES.filter(w=>!existing.has(w));
  let candidates=[...names,...bank.filter(w=>!existing.has(w))];
  candidates=[...new Set(candidates)];
  if(targets.length){
    const matched=candidates.filter(w=>patternsOf(w).some(k=>targets.includes(k)));
    // Mantém parte da novidade livre para não transformar toda sessão em treino do mesmo padrão.
    if(matched.length>=n)candidates=[...shuffle(matched).slice(0,Math.max(n*4,20)),...shuffle(candidates).slice(0,Math.max(n*4,20))];
  }
  // Em cerca de metade das sessões com novidade, tenta incluir um nome próprio ainda não visto.
  const picked=[];
  if(names.length&&n>0&&Math.random()<0.55)picked.push(shuffle(names)[0]);
  const rest=shuffle(candidates.filter(w=>!picked.includes(w))).slice(0,n-picked.length);
  picked.push(...rest);
  picked.forEach(w=>db.words.push({w,history:[],source:GABRIELA_NAMES.includes(w)?'nome':'bank'}));
  persist();
  return picked.map(w=>db.words.find(x=>x.w===w));
};

makeQueue=function(n){
  const canAdd=db.settings.adaptive&&totalAttempts()>=8;
  // Antes eram até 20 por cento de novas e 70 por cento das restantes vinham das mais difíceis.
  // Agora a sessão de 10 tende a trazer 3 novas, cerca de 2 ou 3 difíceis e o restante variado.
  const newN=canAdd?Math.min(4,Math.max(2,Math.round(n*.30))):0;
  const newItems=addAdaptiveWords(newN);
  const remaining=Math.max(0,n-newItems.length);
  const newSet=new Set(newItems.map(w=>w.w));
  const existing=db.words.filter(w=>!newSet.has(w.w));

  // Um acerto recente dá descanso à palavra. Erros continuam elegíveis para revisão.
  let eligible=existing.filter(w=>!recentlySucceeded(w,12));
  if(eligible.length<remaining)eligible=[...eligible,...shuffle(existing.filter(w=>recentlySucceeded(w,12)))];

  const hard=eligible
    .filter(w=>latest(w)?.result==='nao'||difficulty(w)>=45)
    .sort((a,b)=>difficulty(b)-difficulty(a));
  const hardN=Math.min(hard.length,Math.ceil(remaining*.35));
  const hardPick=hard.slice(0,hardN);
  const hardSet=new Set(hardPick.map(w=>w.w));

  // Para a parte de variedade, favorece palavras pouco apresentadas.
  const variety=eligible
    .filter(w=>!hardSet.has(w.w))
    .sort((a,b)=>exposureCount(a)-exposureCount(b)||Math.random()-.5);
  let q=[...hardPick,...variety.slice(0,remaining-hardN),...newItems];

  const seen=new Set();
  q=q.filter(x=>!seen.has(x.w)&&seen.add(x.w));
  if(q.length<n){
    const fill=shuffle(db.words.filter(x=>!seen.has(x.w))).slice(0,n-q.length);
    q.push(...fill);
  }
  return shuffle(q.slice(0,Math.min(n,db.words.length)));
};
