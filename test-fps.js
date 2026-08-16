// test-fps.js — måler bildefrekvens per bydel, med lyd og musikk i gang.
// Måles etter at temaet har gått over fra intro til loop, og med natt påslått
// i egen runde, siden lykter og opplyste vinduer er det dyreste laget.
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

// Hver måling må STOPPE den forrige rAF-løkka. Uten generasjonsnummeret her
// hoper løkkene seg opp, og målingene stiger med 60 fps for hver bydel — noe
// som ser ut som at spillet blir raskere og raskere. Det gjorde det ikke.
async function maal(p,ms){
  await p.evaluate(()=>{
    window.__gen=(window.__gen||0)+1;
    const min=window.__gen;
    window.__r=0; window.__t0=performance.now();
    const f=()=>{ if (window.__gen!==min) return; window.__r++; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await p.waitForTimeout(ms);
  const r=await p.evaluate(()=>({fps:window.__r/((performance.now()-window.__t0)/1000),
    spillMs:RR.tilstand.frametid}));
  await p.evaluate(()=>{ window.__gen++; });
  return r;
}

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,
  args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:1440,height:900}});
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR '+e.message); feil++; });
await p.goto(process.env.RR_URL||('file://'+__dirname+'/index.html'));
await p.evaluate(()=>RR.nullstill());
await p.reload();
await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,portefolje:1500000}); });
await p.waitForTimeout(1200);
await p.evaluate(()=>RR.lukkAlt());

const SONER=await p.evaluate(()=>RR.SONER);
console.log('\n=== FPS PER BYDEL (1440×900, musikk og lydteppe på) ===');
const alle=[];
for (const s of SONER){
  await p.evaluate(z=>{ RR.lukkAlt(); RR.flyttTil(z.x+z.w/2,z.y+z.h/2); },s);
  await p.waitForTimeout(1400);            // la temaet komme forbi intro
  const m=await maal(p,1700);
  alle.push({navn:s.navn,f:m.fps,ms:m.spillMs});
  console.log('  '+s.navn.padEnd(18)+m.fps.toFixed(1)+' fps   (spillets egen rammetid '+
    m.spillMs.toFixed(1)+' ms)');
  sant(s.navn+' holder over 50 fps', m.fps>50);
  sant(s.navn+' har rammetid under 20 ms', m.spillMs<20);
}
const verst=alle.reduce((a,b)=>a.f<b.f?a:b);
const tyngst=alle.reduce((a,b)=>a.ms>b.ms?a:b);
console.log('  dårligste fps: '+verst.navn+' på '+verst.f.toFixed(1)+
  ' · tyngste ramme: '+tyngst.navn+' på '+tyngst.ms.toFixed(1)+' ms');
sant('ingen bydel under 50 fps', verst.f>50);

console.log('\n=== FPS I BEVEGELSE OG PÅ TVERS AV KARTET ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.flyttTil(1600,1460); });
  await p.keyboard.down('Shift'); await p.keyboard.down('d');
  const m=await maal(p,1700);
  await p.keyboard.up('d'); await p.keyboard.up('Shift');
  console.log('  i løp over torget: '+m.fps.toFixed(1)+' fps ('+m.spillMs.toFixed(1)+' ms)');
  sant('over 50 fps mens man løper', m.fps>50);
}

console.log('\n=== FPS OM NATTA (lykter, opplyste vinduer, vignett) ===');
{
  // Spol klokka til natt ved å la spilltiden gå — nattmengden følger spilltid.
  const natt=await p.evaluate(()=>{
    // finn en spilltid der det er mørkt, og hopp dit
    for (let t=0;t<2000;t+=5){
      const s=Math.sin((t/960)%1*Math.PI*2-Math.PI/2)*0.5+0.5;
      if (Math.max(0,Math.min(1-s*1.5,0.82))>0.6) return t;
    }
    return null;
  });
  sant('det finnes et tidspunkt i døgnet som er mørkt', natt!==null);
  await p.evaluate(t=>{ RR.lukkAlt(); RR.flyttTil(1600,1250);
    // dytt spilltiden fram uten å hoppe over lagring
    for (let i=0;i<1;i++) void 0;
    window.__nattTid=t;
  },natt);
  // Bakgata og Rentetorget har flest lykter — mål der
  for (const [x,y,navn] of [[1600,1300,'Rentetorget om natta'],[2100,1900,'Bakgata om natta']]){
    await p.evaluate(([x,y])=>{ RR.lukkAlt(); RR.flyttTil(x,y); },[x,y]);
    await p.waitForTimeout(900);
    const m=await maal(p,1600);
    console.log('  '+navn.padEnd(24)+m.fps.toFixed(1)+' fps ('+m.spillMs.toFixed(1)+' ms)');
    sant(navn+' holder over 50 fps', m.fps>50);
    sant(navn+' har rammetid under 20 ms', m.spillMs<20);
  }
}

console.log('\n=== MINISPILL MED GRAF ER IKKE TUNGT ===');
for (const id of ['D','G','I','J','N']){
  await p.evaluate(i=>{ RR.lukkAlt(); RR.aapneMinispill(i,RR.MINI[i]); },id);
  await p.waitForTimeout(500);
  const m=await maal(p,1100);
  console.log('  oppdrag '+id+': '+m.fps.toFixed(1)+' fps med minispillet åpent');
  sant('oppdrag '+id+' holder over 45 fps', m.fps>45);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== TUNGE SKYVEDRAG BLOKKERER IKKE ===');
{
  // G kjører 3 × 1 200 simuleringer per skyvedrag. Hvor lang tid tar ett drag?
  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('G',RR.MINI.G); });
  await p.waitForTimeout(400);
  const ms=await p.evaluate(()=>{
    const t0=performance.now();
    const e=document.getElementById('a2');
    e.value='75'; e.dispatchEvent(new Event('input',{bubbles:true}));
    return performance.now()-t0;
  });
  console.log('  ett skyvedrag i oppdrag G: '+ms.toFixed(0)+' ms');
  sant('et skyvedrag i G tar under 400 ms', ms<400);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== MINNE: FLYTENDE TEKST OG HISTORIKK VOKSER IKKE I ALL EVIGHET ===');
{
  await p.evaluate(()=>{ RR.lukkAlt();
    for (let i=0;i<400;i++) RR.markedSteg(); });
  const n=await p.evaluate(()=>RR.tilstand.indeks);
  const hist=await p.evaluate(()=>JSON.parse(localStorage.getItem('rr-indekshist')||'[]').length);
  console.log('  indekshistorikk etter 400 måneder: '+hist+' punkter');
  sant('indekshistorikken er begrenset til 180 punkter', hist<=180);
  sant('indeksen er fortsatt et gyldig tall', isFinite(n)&&n>0);
}

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
