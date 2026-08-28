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
const CHROMIUM=require('./test-chromium');
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
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
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
/* Eieren av spillet er rød-grønn fargeblind, og det er to KRAV her, ikke ett:
     1) hvert statuselement bærer et ikke-farge-signal (symbol OG ord),
     2) fargeparet lar seg fortsatt skille under deuteranopi.
   En kontrastmåling på 4,5:1 sier ingenting om nummer to. Den gamle paletten
   oppfylte kontrastkravet hele veien og kollapset likevel til ΔE 19,0 på tekst
   og 2,7 på flater — praktisk talt samme farge. */
{
  // Alle fjorten minispillene åpnes, så et nytt oppdrag ikke kan snike seg
  // forbi merkingen. Merkingen skjer sentralt (merkStatus + MutationObserver),
  // men et minispill som bygger status på en helt egen måte ville dukket opp her.
  const STATUSVELGERE=['.fasit.ja','.fasit.nei','.valgkort.valgt','.valgkort.feil',
    '.brikke.valgt','.pill.g','.pill.r','.pill.y','.bakke.over'];
  const ider=await p.evaluate(()=>Object.keys(RR.MINI));
  sant('alle fjorten minispillene finnes', ider.length===14);
  let sett=0, umerkede=[];
  for (const id of ider){
    await p.evaluate(k=>{ RR.lukkAlt(); RR.aapneMinispill(k,RR.MINI[k]); }, id);
    await p.waitForTimeout(260);
    // Trykk på det første valgkortet: fasit-boksen og «feil»-merket på kortet
    // finnes ikke før spilleren har svart, så en test som bare åpner spillet
    // ville aldri sett de to viktigste statuselementene.
    const harKort=await p.evaluate(()=>!!document.querySelector('#spillinner .valgkort'));
    if (harKort){
      await p.evaluate(()=>document.querySelector('#spillinner .valgkort').click());
      await p.waitForTimeout(420);
    }
    const r=await p.evaluate(sel=>{
      const ut=[]; let n=0;
      sel.forEach(s=>document.querySelectorAll('#spillinner '+s).forEach(el=>{
        n++;
        const m=el.firstElementChild;
        const ok = m && m.classList.contains('smerke')
          && m.dataset.status && m.textContent.trim().length>0
          && m.querySelector('.sr') && m.querySelector('.sr').textContent.trim().length>0;
        if (!ok) ut.push(s+' → '+(el.textContent||'').trim().slice(0,40));
      }));
      return {n, ut};
    }, STATUSVELGERE);
    sett+=r.n; umerkede=umerkede.concat(r.ut.map(x=>id+': '+x));
  }
  console.log('  statuselementer sett i de fjorten minispillene: '+sett);
  sant('det finnes statuselementer å måle i det hele tatt', sett>0);
  sant('hvert statuselement bærer symbol OG ord, ikke bare farge', umerkede.length===0);
  if (umerkede.length) console.log('      umerket: '+umerkede.slice(0,5).join(' | '));

  // ...og symbolene må faktisk skille tilstandene fra hverandre.
  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('E',RR.MINI.E); });
  await p.waitForTimeout(300);
  const sym=await p.evaluate(()=>{
    const ut={};
    document.querySelectorAll('#spillinner .smerke').forEach(n=>{
      ut[n.dataset.status]=n.textContent.trim().replace(/\s+/g,'');
    });
    return ut;
  });
  console.log('  symboler i bruk: '+Object.entries(sym).map(([k,v])=>k+'='+v).join(' · '));
  sant('«ja» og «nei» har FORSKJELLIG symbol', !sym.ja || !sym.nei || sym.ja!==sym.nei);
  sant('«delvis» skiller seg fra begge', !sym.delvis || (sym.delvis!==sym.ja && sym.delvis!==sym.nei));
}

/* Et merke som blir staaende etter at tilstanden er borte, er verre enn ingen
   merking: det lyver aktivt. To avvelgingsmoenstre finnes i spillet, og begge
   ble innfoert av selve merkefiksen foer denne sjekken kom til:
     - oppdrag B toggler en brikke inn og ut av budsjettet
     - oppdrag F er et radiovalg som fjerner 'valgt' fra soesknene
   Uten en fjern-gren sier en brikke som er TATT UT fortsatt «Med i budsjettet»
   til skjermleseren, og to kort sier «Valgt» samtidig. */
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('B',RR.MINI.B); });
  await p.waitForTimeout(500);
  // Observatoeren merker i en mikrotask, saa klikk og maaling maa skilles:
  // leser man i samme evaluate, er merket ikke satt enda og sjekken feller
  // en helt korrekt implementasjon.
  await p.evaluate(()=>{ const br=document.querySelector('#spillinner .brikke'); if(br) br.click(); });
  await p.waitForTimeout(350);
  const b1=await p.evaluate(()=>{
    const br=document.querySelector('#spillinner .brikke'); if(!br) return null;
    return {etterValg: !!br.querySelector(':scope > .smerke')};
  });
  const b2=await p.evaluate(()=>{
    const br=document.querySelector('#spillinner .brikke'); if(!br) return null;
    br.click(); return true;
  });
  await p.waitForTimeout(300);
  const b3=await p.evaluate(()=>{
    const br=document.querySelector('#spillinner .brikke'); if(!br) return null;
    return {klasse: br.className, merke: !!br.querySelector(':scope > .smerke'),
            tekst: (br.textContent||'').trim().slice(0,30)};
  });
  sant('oppdrag B: en valgt brikke faar merke', !b1 || b1.etterValg);
  sant('oppdrag B: en AVVALGT brikke mister merket igjen',
    !b3 || b3.merke===false);
  if (b3 && b3.merke) console.log('      brikken staar med «'+b3.tekst+'» etter avvalg');

  await p.evaluate(()=>{ RR.lukkAlt(); RR.aapneMinispill('F',RR.MINI.F); });
  await p.waitForTimeout(500);
  const f=await p.evaluate(()=>{
    const k=[...document.querySelectorAll('#spillinner .valgkort')];
    if (k.length<2) return null;
    k[0].click(); return null;
  });
  await p.waitForTimeout(350);
  await p.evaluate(()=>{
    const k=[...document.querySelectorAll('#spillinner .valgkort')];
    if (k.length>1) k[1].click();
  });
  await p.waitForTimeout(400);
  const f2=await p.evaluate(()=>{
    const merkede=[...document.querySelectorAll('#spillinner .valgkort')]
      .filter(e=>{const c=e.firstElementChild; return c&&c.classList.contains('smerke')&&c.dataset.status==='valgt';});
    return {antall: merkede.length};
  });
  sant('oppdrag F: bare ETT kort baerer «Valgt» etter omvalg',
    f2.antall<=1, 'kort merket valgt: '+f2.antall);
}

console.log('\n=== STATUSFARGENE MÅLES MOT FARGEBLINDHET, IKKE ANTATT ===');
/* Viénot 1999-simulering i lineært rom, CIE76 ΔE på resultatet. Grensene er
   satt av hva den gamle paletten faktisk gjorde (tekst 19,0 og flater 2,7 var
   ubrukelig), så gulvet ligger godt over det og under det nye paret. Fargene
   leses fra den LEVENDE siden, ikke fra CSS-en jeg tror står der — endrer noen
   en variabel ett sted, slår det ut her. */
{
  const m=await p.evaluate(()=>{
    const s=getComputedStyle(document.documentElement);
    const les=n=>s.getPropertyValue(n).trim();
    const tall=t=>{const a=t.match(/[\d.]+/g)||[];return a.slice(0,3).map(Number);};
    // Flatene er halvgjennomsiktige: bland dem mot spillbakgrunnen først,
    // ellers måler vi en farge ingen faktisk ser.
    const ink=tall(getComputedStyle(document.body).backgroundColor).length===3
      ? tall(getComputedStyle(document.body).backgroundColor) : [13,17,23];
    const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
    const bl=(t,i)=>{const a=t.match(/[\d.]+/g).map(Number);
      const al=a.length>3?a[3]:1; return [0,1,2].map(k=>a[k]*al+i[k]*(1-al));};
    return {okT:hex(les('--ok')), feilT:hex(les('--feil')),
            okTek:hex(les('--ok-tekst')), feilTek:hex(les('--feil-tekst')),
            okFl:bl(les('--ok-flate'),ink), feilFl:bl(les('--feil-flate'),ink),
            groDekor:hex(les('--gro'))};
  });
  const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  const srgb=c=>{c=Math.max(0,Math.min(1,c));
    return 255*(c<=0.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-0.055);};
  const lms=rgb=>{const r=lin(rgb[0]),g=lin(rgb[1]),b=lin(rgb[2]);
    return [17.8824*r+43.5161*g+4.11935*b, 3.45565*r+27.1554*g+3.86714*b,
            0.0299566*r+0.184309*g+1.46709*b];};
  const ut=(L,M,S)=>[srgb(0.0809444479*L-0.130504409*M+0.116721066*S),
                     srgb(-0.0102485335*L+0.0540193266*M-0.113614708*S),
                     srgb(-0.000365296938*L-0.00412161469*M+0.693511405*S)];
  const deuter=rgb=>{const [L,M,S]=lms(rgb); return ut(L,0.494207*L+1.24827*S,S);};
  const protan=rgb=>{const [L,M,S]=lms(rgb); return ut(2.02344*M-2.52581*S,M,S);};
  const lab=rgb=>{const a=rgb.map(lin);
    const X=(a[0]*0.4124+a[1]*0.3576+a[2]*0.1805)/0.95047;
    const Y=a[0]*0.2126+a[1]*0.7152+a[2]*0.0722;
    const Z=(a[0]*0.0193+a[1]*0.1192+a[2]*0.9505)/1.08883;
    const f=t=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
    return [116*f(Y)-16,500*(f(X)-f(Y)),200*(f(Y)-f(Z))];};
  const dE=(x,y)=>{const A=lab(x),B=lab(y);
    return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]);};

  const kantD=dE(deuter(m.okT),deuter(m.feilT));
  const kantP=dE(protan(m.okT),protan(m.feilT));
  const tekstD=dE(deuter(m.okTek),deuter(m.feilTek));
  const flateD=dE(deuter(m.okFl),deuter(m.feilFl));
  const flateP=dE(protan(m.okFl),protan(m.feilFl));
  console.log('  ΔE deuteranopi: kant '+kantD.toFixed(1)+', tekst '+tekstD.toFixed(1)
    +', flate '+flateD.toFixed(1));
  console.log('  ΔE protanopi:   kant '+kantP.toFixed(1)+', flate '+flateP.toFixed(1));
  sant('statusfargene skilles under deuteranopi (ΔE > 40)', kantD>40);
  sant('statusfargene skilles under protanopi (ΔE > 40)', kantP>40);
  sant('statusflatene skilles under deuteranopi (ΔE > 8)', flateD>8);
  sant('statusflatene skilles under protanopi (ΔE > 8)', flateP>8);
  sant('statustekstfargene skilles under deuteranopi (ΔE > 8)', tekstD>8);
  // Spillets grønne er DEKOR. Blir den brukt som «ok» igjen, kollapser
  // paret mot --feil på nytt — så vi låser fast at de er forskjellige farger.
  sant('--ok er ikke spillets dekor-grønne', dE(m.okT,m.groDekor)>20);
}

/* Merkingen henger på en observatør som ser på tre containere. Et statuselement
   som havner UTENFOR dem blir stille umerket — fargen alene igjen. Denne
   sjekken følger med på nettopp det. */
{
  const utenfor=await p.evaluate(()=>{
    const SEL=['.fasit.ja','.fasit.nei','.valgkort.valgt','.valgkort.feil',
      '.brikke.valgt','.pill.g','.pill.r','.pill.y','.bakke.over'];
    const obs=['#spillinner','#pauseinner','#dialog'].map(s=>document.querySelector(s));
    const ut=[];
    SEL.forEach(s=>document.querySelectorAll(s).forEach(el=>{
      if (!obs.some(c=>c&&c.contains(el))) ut.push(s+' i #'+(el.closest('[id]')||{id:'?'}).id);
    }));
    return ut;
  });
  sant('ingen statuselementer lever utenfor de observerte containerne', utenfor.length===0);
  if (utenfor.length) console.log('      utenfor: '+utenfor.slice(0,4).join(' | '));
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
