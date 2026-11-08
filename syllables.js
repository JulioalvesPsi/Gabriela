(function(){
const btn=document.getElementById('syllableToggle'), word=document.getElementById('word');
if(!btn||!word)return;
let original='', active=false;
const known={'silábica':'si-lá-bi-ca','prato':'pra-to','bruxa':'bru-xa','açúcar':'a-çú-car','livro':'li-vro','palavra':'pa-la-vra','gabriela':'ga-bri-e-la'};
function splitPortuguese(input){
 const s=input.toLocaleLowerCase('pt-BR');
 if(known[s])return known[s];
 const vowels='aeiouáàâãéêíóôõúü';
 const isV=c=>vowels.includes(c||'');
 let cuts=[],start=0;
 for(let i=1;i<s.length;i++){
   if(!isV(s[i]))continue;
   let prev=i-1;while(prev>=0&&!isV(s[prev]))prev--;
   if(prev<0)continue;
   const between=s.slice(prev+1,i);
   let cut=-1;
   if(between.length===0)cut=i;
   else if(between.length===1)cut=prev+1;
   else if(between.length===2){
     cut=(/^(br|cr|dr|fr|gr|pr|tr|vr|bl|cl|fl|gl|pl|tl|ch|lh|nh)$/).test(between)?prev+1:prev+2;
   }else cut=i-2;
   if(cut>start&&cut<s.length){cuts.push(cut);start=cut;}
 }
 let out='',last=0;for(const p of cuts){out+=s.slice(last,p)+'-';last=p}return out+s.slice(last);
}
function reset(){active=false;original=word.textContent;btn.textContent='Separar sílabas';btn.setAttribute('aria-pressed','false')}
const obs=new MutationObserver(()=>{if(!active){original=word.textContent;return}if(word.textContent!==splitPortuguese(original)){reset()}});
obs.observe(word,{childList:true,characterData:true,subtree:true});
btn.addEventListener('click',()=>{
 if(!active){original=word.textContent;if(!original)return;active=true;word.textContent=splitPortuguese(original);btn.textContent='Mostrar palavra inteira';btn.setAttribute('aria-pressed','true')}
 else{active=false;word.textContent=original;btn.textContent='Separar sílabas';btn.setAttribute('aria-pressed','false')}
});
document.querySelectorAll('[data-result]').forEach(b=>b.addEventListener('click',()=>{active=false;btn.textContent='Separar sílabas';btn.setAttribute('aria-pressed','false')},true));
})();