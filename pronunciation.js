(function(){
"use strict";
const manual={"água":"á-gua","pessoa":"pes-so-a","parque":"par-que","pablo":"pa-blo","prato":"pra-to","silábica":"si-lá-bi-ca","gabriela":"ga-bri-e-la","açúcar":"a-çú-car","pato":"pa-to","gato":"ga-to","bola":"bo-la","mesa":"me-sa","sol":"sol","mar":"mar","flor":"flor","papel":"pa-pel","festa":"fes-ta","porta":"por-ta","carta":"car-ta","vento":"ven-to","campo":"cam-po","filme":"fil-me","preto":"pre-to","primo":"pri-mo","fruta":"fru-ta","bruxa":"bru-xa","braço":"bra-ço","bloco":"blo-co","planta":"plan-ta","trigo":"tri-go","grito":"gri-to","cravo":"cra-vo","claro":"cla-ro","chuva":"chu-va","chave":"cha-ve","ninho":"ni-nho","banho":"ba-nho","palha":"pa-lha","folha":"fo-lha","carro":"car-ro","terra":"ter-ra","queijo":"quei-jo","guerra":"guer-ra","quadro":"qua-dro","grande":"gran-de","branco":"bran-co","triste":"tris-te","estrela":"es-tre-la","presente":"pre-sen-te","problema":"pro-ble-ma","criança":"cri-an-ça","livro":"li-vro","palavra":"pa-la-vra","casa":"ca-sa","sapato":"sa-pa-to","cidade":"ci-da-de","gente":"gen-te","noite":"noi-te","dia":"di-a","tia":"ti-a","leite":"lei-te","amigo":"a-mi-go","pão":"pão","mãe":"mãe","não":"não","coração":"co-ra-ção","exame":"e-xa-me","xícara":"xí-ca-ra","táxi":"tá-xi","texto":"tex-to","máximo":"má-xi-mo","próximo":"pró-xi-mo","excesso":"ex-ces-so","fixo":"fi-xo","história":"his-tó-ria","família":"fa-mí-lia","aquário":"a-quá-rio","saúde":"sa-ú-de","país":"pa-ís","poeta":"po-e-ta","ideia":"i-dei-a","muito":"mui-to","rua":"ru-a","quase":"qua-se","guarda":"guar-da","guitarra":"gui-tar-ra","caderno":"ca-der-no","computador":"com-pu-ta-dor","nascimento":"nas-ci-men-to","sorriso":"sor-ri-so","carinho":"ca-ri-nho","paulo":"pau-lo","pedro":"pe-dro","bruno":"bru-no","clara":"cla-ra","laura":"lau-ra","maria":"ma-ri-a","lucas":"lu-cas","gabriel":"ga-bri-el","marina":"ma-ri-na","carla":"car-la","felipe":"fe-li-pe","rafael":"ra-fa-el","bianca":"bi-an-ca","daniel":"da-ni-el","helena":"he-le-na","juliana":"ju-li-a-na","renata":"re-na-ta","camila":"ca-mi-la","marcos":"mar-cos","alice":"a-li-ce","ana":"a-na","joão":"jo-ão","davi":"da-vi","sofia":"so-fi-a","luiza":"lu-i-za","beatriz":"be-a-triz","caio":"cai-o","leo":"le-o","lara":"la-ra"};
const vowels="aeiouáàâãéêíóôõúü";
const diphthongs=new Set(["ai","ei","oi","ui","au","eu","ou","iu","ão","ãe","õe","ãi","õi"]);
const validOnsets=new Set(["br","cr","dr","fr","gr","pr","tr","vr","bl","cl","fl","gl","pl","tl","ch","lh","nh","qu","gu"]);
function separateForReading(input){
  const s=String(input||"").normalize("NFC");
  const lower=s.toLocaleLowerCase("pt-BR");
  if(manual[lower]){
    const parts=manual[lower].split("-");
    if(parts.join("").length===s.length){
      let pos=0;
      return parts.map(p=>{const v=s.slice(pos,pos+p.length);pos+=p.length;return v}).join("-");
    }
  }
  if(!/^[a-záàâãéêíóôõúüç]+$/i.test(s))return s;
  const nuclei=[];
  for(let i=0;i<lower.length;i++){
    const c=lower[i];
    if(!vowels.includes(c))continue;
    if(c==="u"&&i>0&&/[qg]/.test(lower[i-1])&&vowels.includes(lower[i+1]||""))continue;
    const prev=nuclei[nuclei.length-1];
    if(prev&&prev.end===i-1&&diphthongs.has(lower.slice(i-1,i+1))&&!/[áéíóú]/.test(c)){
      prev.end=i;
    }else nuclei.push({start:i,end:i});
  }
  if(nuclei.length<2)return s;
  const cuts=[];
  for(let k=0;k<nuclei.length-1;k++){
    const prev=nuclei[k],next=nuclei[k+1];
    const middle=lower.slice(prev.end+1,next.start);
    let cut;
    if(!middle.length)cut=next.start;
    else if(middle.length===1)cut=prev.end+1;
    else if(validOnsets.has(middle))cut=prev.end+1;
    else if(middle.length===2)cut=prev.end+2;
    else if(validOnsets.has(middle.slice(-2)))cut=next.start-2;
    else cut=next.start-1;
    if(cut>0&&cut<s.length)cuts.push(cut);
  }
  const unique=[...new Set(cuts)].sort((a,b)=>a-b);
  let start=0;
  return [...unique,s.length].map(end=>{const chunk=s.slice(start,end);start=end;return chunk}).filter(Boolean).join("-");
}
const button=document.getElementById("readingChunksToggle");
const word=document.getElementById("word");
if(!button||!word)return;
let active=false;
let original="";
function reset(){active=false;original=word.textContent;button.textContent="Separar para ler";button.setAttribute("aria-pressed","false");}
const observer=new MutationObserver(()=>{if(!active){original=word.textContent;return;}if(word.textContent!==separateForReading(original))reset();});
observer.observe(word,{childList:true,characterData:true,subtree:true});
button.addEventListener("click",()=>{
 if(!active){original=word.textContent;if(!original)return;active=true;word.textContent=separateForReading(original);button.textContent="Mostrar palavra";button.setAttribute("aria-pressed","true");}
 else{active=false;word.textContent=original;reset();}
});
document.querySelectorAll("[data-result]").forEach(b=>b.addEventListener("click",()=>{active=false;reset();},true));
})();
