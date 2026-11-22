(function(){
  "use strict";
  const button=document.getElementById("pronunciationToggle");
  const word=document.getElementById("word");
  if(!button||!word)return;

  // Escrita de apoio à pronúncia brasileira aproximada, não transcrição em IPA.
  // Exceções revistas manualmente para as palavras iniciais e grafias ambíguas.
  const exceptions={
    "pato":"pá-tu","gato":"gá-tu","bola":"BO-la","mesa":"ME-za",
    "sol":"sóu","mar":"mar","flor":"flor","papel":"pa-péu",
    "festa":"FES-ta","porta":"POR-ta","carta":"cár-ta","vento":"VEN-tu",
    "campo":"CAN-pu","filme":"FIL-mi","prato":"prá-tu","preto":"PRE-tu",
    "primo":"prí-mu","fruta":"frú-ta","bruxa":"brú-cha","braço":"brá-su",
    "bloco":"BLO-cu","planta":"PLAN-ta","trigo":"trí-gu","grito":"grí-tu",
    "cravo":"crá-vu","claro":"clá-ru","chuva":"CHU-va","chave":"chá-vi",
    "ninho":"ní-nhu","banho":"bá-nhu","palha":"pá-lha","folha":"FO-lha",
    "carro":"CAR-ru","terra":"TER-ra","queijo":"KEI-ju","guerra":"gué-rra",
    "quadro":"quá-dru","grande":"GRAN-di","branco":"BRAN-cu","triste":"TRIS-ti",
    "estrela":"is-TRE-la","presente":"pre-ZEN-ti","problema":"pro-BLE-ma",
    "criança":"cri-AN-sa","livro":"lí-vru","palavra":"pa-lá-vra",
    "gabriela":"ga-bri-é-la","silábica":"si-lá-bi-ca","açúcar":"a-sú-car",
    "casa":"cá-za","sapato":"sa-pá-tu","cidade":"si-dá-di",
    "gente":"JEN-ti","noite":"NOI-ti","dia":"dí-a","tia":"tí-a",
    "leite":"LEI-ti","amigo":"a-mí-gu","pão":"pãu","mãe":"mãi",
    "não":"nãu","coração":"co-ra-SÃU","exame":"e-ZA-mi",
    "xícara":"chí-ca-ra","táxi":"ták-si","texto":"TEKS-tu",
    "máximo":"má-si-mu","próximo":"pró-si-mu","excesso":"e-SE-su",
    "fixo":"FIK-su"
  };
  const vowels="aeiouáàâãéêíóôõúü";
  const vowel=c=>vowels.includes(c||"");
  const onset=/^(?:br|cr|dr|fr|gr|pr|tr|vr|bl|cl|fl|gl|pl|ch|lh|nh)$/;
  const diphthongs=new Set(["ai","ei","oi","ui","au","eu","ou","iu","ão","ãe","õe","ua","ue","uo"]);
  function groups(s){
    const cuts=[];
    for(let p=0;p<s.length-1;p++){
      if(!vowel(s[p]))continue;
      let q=p+1;
      while(q<s.length&&!vowel(s[q]))q++;
      if(q>=s.length)break;
      const between=s.slice(p+1,q);
      let cut;
      if(!between.length){
        const pair=s.slice(p,q+1);
        if(diphthongs.has(pair))continue;
        cut=q;
      }else if(between.length===1)cut=p+1;
      else if(between.length===2)cut=onset.test(between)?p+1:p+2;
      else cut=onset.test(between.slice(-2))?q-2:q-1;
      if(cut>0&&cut<s.length)cuts.push(cut);
      p=q-1;
    }
    const unique=[...new Set(cuts)].sort((a,b)=>a-b);
    let start=0;
    return [...unique,s.length].map(end=>{const part=s.slice(start,end);start=end;return part}).filter(Boolean);
  }
  function respell(input){
    let s=input.toLocaleLowerCase("pt-BR").normalize("NFC");
    if(exceptions[s])return exceptions[s];
    // Protege SS, Ç e C suave para não transformar esses S em Z.
    s=s.replace(/ss/g,"§").replace(/ç/g,"§").replace(/sc(?=[eiéêí])/g,"§");
    s=s.replace(/c(?=[eiéêí])/g,"§");
    s=s.replace(/([aeiouáàâãéêíóôõú])s(?=[aeiouáàâãéêíóôõú])/g,"$1z");
    s=s.replace(/§/g,"s");
    s=s.replace(/gu(?=[eiéêí])/g,"g").replace(/qu(?=[eiéêí])/g,"k");
    s=s.replace(/g(?=[eiéêí])/g,"j");
    s=s.replace(/l(?!h)(?=[^aeiouáàâãéêíóôõúü]|$)/g,"u");
    s=s.replace(/^es(?=[bcdfghjklmnpqrstvwxyz])/,"is");
    s=s.replace(/e$/,"i").replace(/o$/,"u");
    s=s.replace(/z$/,"s");
    const parts=groups(s);
    if(parts.length===0)return input;
    const accented=/[áàâéêíóôú]/;
    let stressed=parts.findIndex(x=>accented.test(x));
    if(stressed<0){
      const nasal=parts.findIndex(x=>/[ãõ]/.test(x));
      if(nasal>=0)stressed=nasal;
    }
    if(stressed<0){
      const penult=/(?:a|e|o|as|es|os|am|em|ens)$/i.test(input);
      stressed=penult&&parts.length>1?parts.length-2:parts.length-1;
    }
    if(parts.length>1&&!/[áàâãéêíóôõú]/.test(parts[stressed])){
      const chunk=parts[stressed];
      const match=chunk.match(/[aeiou]/);
      if(match){
        const v=match[0];
        if(v==="a"||v==="i"||v==="u"){
          const marks={a:"á",i:"í",u:"ú"};
          parts[stressed]=chunk.slice(0,match.index)+marks[v]+chunk.slice(match.index+1);
        }else parts[stressed]=chunk.toLocaleUpperCase("pt-BR");
      }
    }
    return parts.join("-");
  }
  let active=false;
  let original="";
  function reset(){
    active=false;
    original=word.textContent;
    button.textContent="Ver pronúncia";
    button.setAttribute("aria-pressed","false");
  }
  const observer=new MutationObserver(()=>{
    if(!active){original=word.textContent;return}
    if(word.textContent!==respell(original))reset();
  });
  observer.observe(word,{childList:true,characterData:true,subtree:true});
  button.addEventListener("click",()=>{
    if(!active){
      original=word.textContent;
      if(!original)return;
      const shown=respell(original);
      if(!shown)return;
      active=true;
      word.textContent=shown;
      button.textContent="Mostrar palavra";
      button.setAttribute("aria-pressed","true");
    }else{
      active=false;
      word.textContent=original;
      reset();
    }
  });
  document.querySelectorAll("[data-result]").forEach(b=>b.addEventListener("click",()=>{active=false;reset()},true));
})();