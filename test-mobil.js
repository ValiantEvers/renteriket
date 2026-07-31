// test-mobil.js — mobiloppsettet måles, ikke antas.
// Alle HUD-flater og kontrollflater hentes ut som rektangler på 390×844 og
// 360×640, og testen feiler hvis to av dem overlapper. Grunnen til at dette
// måles: en HUD som ligger oppå en knapp ser helt fin ut i en skjermdump.
const {chromium,devices}=require('playwright');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }
const overlapp=(a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);

const FLATER=['#hud','#minimap','#xpwrap','#oppdragsboks','#hint','#ctl .pad','#ctl .hoy'];

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});

for (const [navn,w,h] of [['iPhone-format 390×844',390,844],['liten Android 360×640',360,640],
                          ['nettbrett 820×1180',820,1180]]){
  console.log('\n=== '+navn+' ===');
  const p=await b.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true});
  const sideFeil=[]; p.on('pageerror',e=>sideFeil.push(e.message));
  await p.goto('file://'+__dirname+'/index.html');
  await p.evaluate(()=>RR.nullstill());
  await p.reload();
  sant('touch-modus oppdages', await p.evaluate(()=>document.body.classList.contains('touch')));
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(700);
  await p.evaluate(()=>RR.lukkAlt());
  // sett spilleren inntil en dør, så oppdragsboks og hint er synlige samtidig
  await p.evaluate(()=>{ RR.sett({harJobb:true}); RR.gaaTil('bank'); });
  await p.waitForTimeout(400);

  const bokser=await p.evaluate(sel=>sel.map(s=>{
    const e=document.querySelector(s);
    if (!e) return {s,finnes:false};
    const st=getComputedStyle(e);
    if (st.display==='none'||st.visibility==='hidden'||+st.opacity===0) return {s,synlig:false};
    const r=e.getBoundingClientRect();
    return {s,synlig:true,x:r.x,y:r.y,w:r.width,h:r.height};
  }),FLATER);
  const synlige=bokser.filter(x=>x.synlig);
  console.log('  synlige flater: '+synlige.map(x=>x.s).join(', '));
  sant('kontrollpanelet vises', bokser.find(x=>x.s==='#ctl .pad').synlig);
  sant('handleknappene vises', bokser.find(x=>x.s==='#ctl .hoy').synlig);
  sant('minikartet vises', bokser.find(x=>x.s==='#minimap').synlig);
  sant('hintstripa vises når du står i en dør', bokser.find(x=>x.s==='#hint').synlig);

  let kolli=[];
  for (let i=0;i<synlige.length;i++) for (let j=i+1;j<synlige.length;j++)
    if (overlapp(synlige[i],synlige[j])) kolli.push(synlige[i].s+' × '+synlige[j].s);
  sant('ingen HUD-flater overlapper', kolli.length===0);
  kolli.forEach(k=>console.log('      overlapp: '+k));

  const utenfor=synlige.filter(x=>x.x<-1||x.y<-1||x.x+x.w>w+1||x.y+x.h>h+1)
    .map(x=>x.s+' ('+Math.round(x.x)+','+Math.round(x.y)+' '+Math.round(x.w)+'×'+Math.round(x.h)+')');
  sant('ingen flate stikker utenfor skjermen', utenfor.length===0);
  utenfor.forEach(u=>console.log('      utenfor: '+u));

  // knappene skal være store nok å treffe med en tommel (44 px er vanlig krav)
  const knapper=await p.evaluate(()=>[...document.querySelectorAll('#ctl button')]
    .filter(b=>!b.classList.contains('sp'))
    .map(b=>{const r=b.getBoundingClientRect(); return {t:b.textContent.trim(),w:r.width,h:r.height};}));
  const smaa=knapper.filter(k=>k.w<44||k.h<44).map(k=>k.t+' '+Math.round(k.w)+'×'+Math.round(k.h));
  sant('alle kontrollknapper er minst 44×44 px', smaa.length===0);
  smaa.forEach(x=>console.log('      for liten: '+x));

  // gassen skal faktisk gi bevegelse ved berøring
  for (const [merke,akse,retning] of [['▶',0,1],['▲',1,-1],['◀',0,-1],['▼',1,1]]){
    await p.evaluate(()=>{ RR.lukkAlt(); RR.flyttTil(1560,1460); });
    await p.waitForTimeout(80);
    const f=await p.evaluate(()=>RR.tilstand.pos);
    await p.evaluate(m=>{
      const b=[...document.querySelectorAll('#ctl .pad button')].find(x=>x.textContent.trim()===m);
      b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
    },merke);
    await p.waitForTimeout(420);
    await p.evaluate(m=>{
      const b=[...document.querySelectorAll('#ctl .pad button')].find(x=>x.textContent.trim()===m);
      b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true}));
    },merke);
    const e=await p.evaluate(()=>RR.tilstand.pos);
    const flyttet=(e[akse]-f[akse])*retning;
    sant('styreknappen '+merke+' flytter spilleren ('+Math.round(flyttet)+' px)', flyttet>25);
  }
  // HANDLE-knappen skal åpne en bygning
  // Plasser og trykk i SAMME steg: står vi og går, rekker spilleren å gå ut av
  // dørens rekkevidde mellom de to kallene, og testen måler noe annet enn den tror.
  await p.evaluate(()=>{
    RR.lukkAlt(); RR.gaaTil('bank');
    const b=[...document.querySelectorAll('#ctl .hoy button')].find(x=>x.dataset.t==='ok');
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(200);
  sant('HANDLE-knappen åpner bygningen', (await p.evaluate(()=>RR.minispillTekst())).length>200);
  // minispillet skal kunne skrolles og ikke være bredere enn skjermen
  const bredde=await p.evaluate(()=>({
    inner:document.getElementById('spillinner').scrollWidth,
    vindu:innerWidth, scroll:document.getElementById('spill').scrollHeight
  }));
  sant('minispillet er ikke bredere enn skjermen', bredde.inner<=bredde.vindu+1);
  sant('minispillet kan skrolles', bredde.scroll>0);
  // MENY-knappen skal lukke minispillet, ikke åpne pausemenyen oppå det
  await p.evaluate(()=>{
    const b=[...document.querySelectorAll('#ctl .hoy button')].find(x=>x.dataset.t==='meny');
    b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));
  });
  await p.waitForTimeout(150);
  const st=await p.evaluate(()=>RR.tilstand);
  sant('MENY lukker minispillet først', !st.mAapen && !st.pause);

  sant('ingen JavaScript-feil på '+navn, sideFeil.length===0);
  sideFeil.slice(0,5).forEach(f=>console.log('      '+f));
  await p.close();
}
await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
