// test-tilgjengelighet.js — kan spillet brukes uten mus, og er teksten lesbar?
//
// Renteriket er en lærebok. Da holder det ikke at innholdet finnes; det må også
// kunne leses og betjenes. Kontrastene regnes ut fra de FAKTISKE fargene i DOM-en
// (getComputedStyle), ikke fra CSS-en jeg tror står der — en variabel som endres
// ett sted skal slå ut her.
//
// Krav: WCAG 2.1 AA — 4,5:1 for brødtekst, 3:1 for stor tekst (≥24px, eller
// ≥18,66px halvfet) og for grensesnittkomponenter.
const {chromium}=require('playwright');
const SPILL=process.env.RR_URL||('file://'+__dirname+'/index.html');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

// Regner ut kontrast i siden, med nedarvet bakgrunn der elementet er gjennomsiktig.
const KONTRAST=`(() => {
  const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  const lum=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
  const rgb=s=>{const m=s.match(/[\\d.]+/g);return m?m.slice(0,3).map(Number):null;};
  const alfa=s=>{const m=s.match(/[\\d.]+/g);return m&&m.length>3?+m[3]:1;};
  const bakgrunn=el=>{
    let e=el;
    while (e){
      const b=getComputedStyle(e).backgroundColor;
      if (b && b!=='transparent' && alfa(b)>0.55) return rgb(b);
      e=e.parentElement;
    }
    return [0,0,0];
  };
  window.__kontrast=(sel)=>{
    const el=document.querySelector(sel);
    if (!el) return null;
    const s=getComputedStyle(el);
    const f=rgb(s.color), b=bakgrunn(el);
    const lf=lum(f), lb=lum(b);
    const px=parseFloat(s.fontSize), vekt=parseInt(s.fontWeight,10)||400;
    const stor = px>=24 || (px>=18.66 && vekt>=700);
    return {
      forhold:(Math.max(lf,lb)+0.05)/(Math.min(lf,lb)+0.05),
      px, vekt, stor, krav: stor?3:4.5,
      tekst:(el.textContent||'').trim().slice(0,34)
    };
  };
})()`;

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:880}});
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR '+e.message); feil++; });
await p.goto(SPILL);

console.log('\n=== SEMANTIKK OG SPRÅK ===');
{
  const m=await p.evaluate(()=>({
    sprak:document.documentElement.lang,
    tittel:document.title,
    canvasRolle:document.getElementById('cv').getAttribute('role'),
    canvasLabel:(document.getElementById('cv').getAttribute('aria-label')||''),
    banner:document.getElementById('banner').getAttribute('aria-live'),
    hint:document.getElementById('hint').getAttribute('aria-live'),
    spillModal:document.getElementById('spill').getAttribute('aria-modal'),
    pauseModal:document.getElementById('pause').getAttribute('aria-modal'),
    viewport:(document.querySelector('meta[name=viewport]')||{}).content||''
  }));
  sant('siden er merket som norsk (nb)', m.sprak==='nb');
  sant('tittelen sier hva spillet er', /RENTERIKET/.test(m.tittel)&&m.tittel.length>20);
  sant('lerretet har en rolle', m.canvasRolle==='img');
  sant('lerretets alternativtekst forklarer hvordan man kommer til innholdet',
    m.canvasLabel.length>120 && /tastatur/.test(m.canvasLabel));
  sant('banneret annonseres høflig til skjermlesere', m.banner==='polite');
  sant('hintstripa annonseres høflig til skjermlesere', m.hint==='polite');
  sant('oppdragsvinduet er en modal dialog', m.spillModal==='true');
  sant('menyen er en modal dialog', m.pauseModal==='true');
  // user-scalable=no er en reell begrensning; canvas-spillet trenger det for at
  // touch-kontrollene ikke skal zoome. Verdt å vite om, ikke å skjule.
  console.log('  merk: viewport har '+(/user-scalable=no/.test(m.viewport)
    ? 'user-scalable=no — nødvendig for touch-kontrollene, men hindrer knipezoom'
    : 'ingen zoomlås'));
}

console.log('\n=== KONTRAST PÅ TITTELSKJERMEN ===');
await p.evaluate(KONTRAST);
for (const [navn,sel] of [['undertittel','#tittel .und'],['småtekst','#tittel .liten'],
                          ['tastehjelp','#tittel .tast'],['startknapp','#startknapp']]){
  const r=await p.evaluate(s=>window.__kontrast(s),sel);
  if (!r){ sant(navn+' finnes',false); continue; }
  console.log(`  ${navn.padEnd(14)} ${r.forhold.toFixed(2)}:1  (${r.px}px/${r.vekt}, krav ${r.krav}:1)`);
  sant(navn+' oppfyller AA', r.forhold>=r.krav);
}

console.log('\n=== KONTRAST I SPILLET OG I ET OPPDRAG ===');
await p.evaluate(()=>RR.nullstill());
await p.reload(); await p.evaluate(KONTRAST);
await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,kontanter:250000,gjeld:40000}); });
await p.waitForTimeout(700);
await p.evaluate(()=>RR.lukkAlt());
await p.evaluate(()=>{ RR.gaaTil('bank'); });
await p.waitForTimeout(400);
for (const [navn,sel] of [['formue-chip','#formue'],['kontant-chip','#kontant'],
                          ['gjeld-chip','#gjeld'],['dato-chip','#dato'],
                          ['XP-tittel','#xptitle'],['hintstripe','#hint'],
                          ['oppdragstittel','#obtit'],['oppdragsmål','#obmal']]){
  const r=await p.evaluate(s=>window.__kontrast(s),sel);
  if (!r){ sant(navn+' finnes',false); continue; }
  console.log(`  ${navn.padEnd(16)} ${r.forhold.toFixed(2)}:1  (${r.px}px/${r.vekt}, krav ${r.krav}:1)`);
  sant(navn+' oppfyller AA', r.forhold>=r.krav);
}
await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('C',RR.MINI.C); });
await p.waitForTimeout(400);
await p.evaluate(()=>{
  const b=[...document.querySelectorAll('#spillinner button')].find(x=>/Kjør stormen/.test(x.textContent));
  if (b) b.click();
});
await p.waitForTimeout(400);
for (const [navn,sel] of [['ledetekst','#spillinner .mlead'],['ruteoverskrift','#spillinner .kort h3'],
                          ['tabellhode','#spillinner table.tab th'],['tabelltall','#spillinner table.tab td.n'],
                          ['tips-tekst','#spillinner .tips'],['skyver-verdi','#spillinner .verd'],
                          ['fasit','#spillinner .fasit'],['knapp','#spillinner .knapp'],
                          ['kode-merke','#spillinner .mkode'],['oppdragstittel','#spillinner .mtit']]){
  const r=await p.evaluate(s=>window.__kontrast(s),sel);
  if (!r){ console.log('  '+navn+': fantes ikke i dette oppdraget'); continue; }
  console.log(`  ${navn.padEnd(16)} ${r.forhold.toFixed(2)}:1  (${r.px}px/${r.vekt}, krav ${r.krav}:1)  «${r.tekst}»`);
  sant(navn+' oppfyller AA', r.forhold>=r.krav);
}

console.log('\n=== ALT SOM ER INTERAKTIVT KAN NÅS MED TAB ===');
for (const id of ['A','B','C','D','E','F','G','H','I','J','K','L','M','N']){
  const r=await p.evaluate(async i=>{
    RR.lukkAlt(); RR.aapneMinispill(i,RR.MINI[i]);
    await new Promise(r=>setTimeout(r,180));
    const alle=[...document.querySelectorAll('#spillinner *')];
    const klikkbare=alle.filter(e=>e.onclick||e.tagName==='BUTTON'||e.tagName==='INPUT');
    const naabare=klikkbare.filter(e=>{
      if (e.disabled) return true;                        // låst med vilje, ikke utilgjengelig
      const t=e.tabIndex;
      return (e.tagName==='BUTTON'||e.tagName==='INPUT'||t>=0);
    });
    return {klikkbare:klikkbare.length, naabare:naabare.length,
            utenfor:klikkbare.filter(e=>!(e.tagName==='BUTTON'||e.tagName==='INPUT'||e.tabIndex>=0))
                             .map(e=>e.tagName+'.'+e.className).slice(0,3)};
  },id);
  sant('oppdrag '+id+': alle '+r.klikkbare+' klikkbare elementer kan nås med Tab',
    r.naabare===r.klikkbare);
  if (r.naabare!==r.klikkbare) console.log('      utenfor tabrekkefølgen: '+r.utenfor.join(', '));
}

console.log('\n=== ENTER OG MELLOMROM AKTIVERER, OG FOKUS ER SYNLIG ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('B',RR.MINI.B); });
  await p.waitForTimeout(300);
  // finn første brikke, gi den fokus, og sjekk at Enter faktisk veksler den
  const veksler=await p.evaluate(async ()=>{
    const b=document.querySelector('#spillinner .brikke');
    b.focus();
    const fokusert=document.activeElement===b;
    const for1=b.classList.contains('valgt');
    b.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    b.click();                                   // det Enter gjør på en <button>
    await new Promise(r=>setTimeout(r,80));
    const etter=b.classList.contains('valgt');
    const s=getComputedStyle(b);
    return {fokusert, endret:for1!==etter, tag:b.tagName};
  });
  sant('brikkene er ekte knapper', veksler.tag==='BUTTON');
  sant('en brikke kan få tastaturfokus', veksler.fokusert);
  sant('aktivering veksler brikken', veksler.endret);
  const ring=await p.evaluate(()=>{
    const b=document.querySelector('#spillinner .knapp');
    b.focus();
    // :focus-visible slår ikke inn på programmatisk fokus i alle nettlesere,
    // så vi sjekker at REGELEN finnes i stilarket i stedet for å måle den.
    let regel=false;
    for (const ss of document.styleSheets)
      try{ for (const r of ss.cssRules)
        if (r.selectorText && /focus-visible/.test(r.selectorText)
            && /outline/.test(r.style.cssText||'')) regel=true;
      }catch(e){}
    return regel;
  });
  sant('det finnes en :focus-visible-regel som gir synlig omriss', ring);
}

console.log('\n=== BETYDNING LIGGER IKKE I FARGE ALENE ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('G',RR.MINI.G); });
  await p.waitForTimeout(900);
  const merker=await p.evaluate(()=>
    [...document.querySelectorAll('#spillinner .pill')].map(e=>e.textContent.trim()));
  console.log('  merker i bruk: '+[...new Set(merker)].join(' · '));
  sant('grønne og røde merker har tekst, ikke bare farge',
    merker.length>0 && merker.every(t=>t.replace(/[✓✗\s]/g,'').length>0));
}

console.log('\n=== REDUSERT BEVEGELSE RESPEKTERES ===');
{
  const q=await b.newPage({viewport:{width:1100,height:760},
    reducedMotion:'reduce'});
  const rf=[]; q.on('pageerror',e=>rf.push(e.message));
  await q.goto(SPILL);
  await q.evaluate(()=>{ RR.nullstill(); });
  await q.reload();
  await q.evaluate(()=>RR.start());
  await q.waitForTimeout(900);
  sant('spillet starter med prefers-reduced-motion', await q.evaluate(()=>RR.tilstand.kjorer));
  sant('ingen feil med redusert bevegelse', rf.length===0);
  await q.close();
}

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
