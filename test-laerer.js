// test-laerer.js — lærersiden og lærermodusen.
// Lærersiden (laerer.html) er en egen fil som omtaler spillet, og slike filer
// råtner stille: et oppdrag får nytt navn, et tall i fasiten slutter å stemme.
// Derfor leses den mot spillet selv. Lærermodusen (?laerer) lover to ting som
// begge må måles: at alt er åpent, og at elevens lagrede fremgang ikke røres.
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }
const overlapp=(a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);

const BASE=process.env.RR_URL||pathToFileURL(path.join(__dirname,'index.html')).href;
const LAERER_URL=BASE+'?laerer';
const side=fs.readFileSync(path.join(__dirname,'laerer.html'),'utf8');
const spill=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const TALLORD={14:'fjorten',15:'femten',16:'seksten',17:'sytten',18:'atten',19:'nitten',20:'tjue'};
// Kroner slik siden skriver dem: hele kroner, mellomrom som tusenskille.
const krTekst=x=>String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});

console.log('\n=== LÆRERSIDEN MOT SPILLET ===');
{
  const p=await b.newPage();
  await p.goto(BASE);
  const OPP=await p.evaluate(()=>RR.OPPDRAG.map(o=>({id:o.id,navn:o.navn})));
  await p.close();
  const rader=[...side.matchAll(/<tr><td class="id">([A-Z])<\/td><td>([^<]+)(?:<span class="ny">ny<\/span>)?<\/td>/g)]
    .map(m=>({id:m[1],navn:m[2].trim()}));
  sant('én rad per oppdrag ('+rader.length+' mot '+OPP.length+')', rader.length===OPP.length);
  OPP.forEach((o,i)=>{
    const r=rader[i]||{};
    sant('rad '+(i+1)+' er '+o.id+' «'+o.navn+'» (står: '+r.id+' «'+r.navn+'»)',
      r.id===o.id && r.navn===o.navn);
  });
  const ord=TALLORD[OPP.length];
  sant('siden sier «'+ord+' oppdrag»', !!ord && side.includes(ord+' oppdrag'));
  const andre=Object.values(TALLORD).filter(w=>w!==ord && new RegExp('\\b'+w+' oppdrag','i').test(side));
  sant('og ikke et annet antall ('+andre.join(', ')+')', andre.length===0);

  // Fasiten: hvert tall regnes ut på nytt her og må stå på siden.
  const fasit=side.slice(side.indexOf('<summary>Fasit</summary>'),side.indexOf('</details>'));
  sant('oppg. 1: 10 000 · 1,04^10 = '+krTekst(1e4*1.04**10)+' kr', fasit.includes('≈ '+krTekst(1e4*1.04**10)+' kr'));
  const aar=(()=>{ let n=0; while (1.07**n<2) n++; return n; })();
  sant('oppg. 2: '+aar+' år til dobling med 7 %', fasit.includes('<li>'+aar+' år.'));
  sant('oppg. 2: 1,07^10 og 1,07^11 med tre desimaler',
    fasit.includes((1.07**10).toFixed(3).replace('.',',')) && fasit.includes((1.07**11).toFixed(3).replace('.',',')));
  sant('oppg. 3: 1 prosentpoeng, '+((5-4)/4*100)+' %', fasit.includes('1 prosentpoeng, men '+((5-4)/4*100)+' %'));
  sant('oppg. 4: 25 000 / 1,03^5 = '+krTekst(25000/1.03**5)+' kr', fasit.includes('≈ '+krTekst(25000/1.03**5)+' kr'));

  // Spillet sender ingen data, sier siden. Da skal ikke siden selv gjøre det heller.
  sant('ingen skript på lærersiden', !/<script/i.test(side));
  sant('ingen eksterne bilder, stilark eller fonter',
    !/<img|<link[^>]+stylesheet|@import|url\(/i.test(side));
  const eksterne=[...side.matchAll(/href="(https?:[^"]+)"/g)].map(m=>m[1]);
  sant('eksterne lenker går bare til Udir ('+eksterne.length+')',
    eksterne.length>0 && eksterne.every(u=>u.startsWith('https://www.udir.no/')));

  // Det siden lover om spillet, skal finnes i spillet.
  const param=(side.match(/href="\/renteriket\/\?([a-z]+)"/)||[])[1];
  sant('lærermodus-lenken bruker parameteren spillet leser (?'+param+')',
    !!param && spill.includes("has('"+param+"')"));
  for (const t of ['Nullstill all fremgang','Satser og kilder'])
    sant('menyen har «'+t+'»', spill.includes(t));
  sant('M slår musikken av og på', /k===['"]m['"]/.test(spill));
}

console.log('\n=== LÆRERMODUS RØRER IKKE ELEVENS FREMGANG ===');
{
  const p=await b.newPage({viewport:{width:1280,height:860}});
  const sideFeil=[]; p.on('pageerror',e=>sideFeil.push(e.message));
  await p.goto(BASE);
  await p.evaluate(()=>{ RR.nullstill(); localStorage.clear();
    localStorage.setItem('rr-gjort',JSON.stringify(['A','B']));
    localStorage.setItem('rr-xp','777'); localStorage.setItem('rr-kontant','4321'); });
  const foer=await p.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));

  await p.goto(LAERER_URL);
  await p.click('#startknapp');
  await p.waitForTimeout(800);
  const t0=await p.evaluate(()=>RR.tilstand);
  sant('lærermodus leser ikke den lagrede fremgangen (gjort: '+t0.gjort.join(',')+')', t0.gjort.length===0);
  sant('… heller ikke XP eller kontanter', t0.xp===0 && t0.kontanter===0);
  sant('velkomsten forklarer lærermodus',
    await p.evaluate(()=>RR.tilstand.dAapen &&
      document.querySelector('#dialog .navn').textContent==='LÆRERMODUS' &&
      /ingenting lagres/i.test(document.querySelector('#dialog .txt').textContent)));
  await p.keyboard.press('Space'); await p.waitForTimeout(150);
  sant('andre linje viser vei til Åpne-knappen med Esc',
    await p.evaluate(()=>{ const t=document.querySelector('#dialog .txt').textContent;
      return /\(Esc\)/.test(t) && /Åpne/.test(t); }));
  // Gjennom dialogen med mellomrom, som en spiller.
  for (let i=0;i<8;i++){
    if (!(await p.evaluate(()=>RR.tilstand.dAapen))) break;
    await p.keyboard.press('Space'); await p.waitForTimeout(150);
  }
  sant('dialogen lukkes med mellomrom', !(await p.evaluate(()=>RR.tilstand.dAapen)));
  sant('merkelappen LÆRERMODUS står i HUD-en',
    await p.evaluate(()=>{ const c=document.getElementById('laererchip');
      return !!c && c.offsetParent!==null && /LÆRERMODUS/.test(c.textContent) && /lagres ikke/.test(c.textContent); }));

  // Esc → menyen står på Oppdrag, med alle åpne og én Åpne-knapp per oppdrag.
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // merkStatus() setter symbol foran pillene, så teksten leses med includes.
  const meny=await p.evaluate(()=>({
    aapne:[...document.querySelectorAll('#pauseinner .lst li .pill')].filter(x=>x.textContent.includes('åpen')).length,
    laast:[...document.querySelectorAll('#pauseinner .lst li .pill')].filter(x=>x.textContent.includes('låst')).length,
    knapper:[...document.querySelectorAll('#pauseinner .lst li button')].map(k=>k.textContent),
    n:RR.OPPDRAG.length }));
  sant('alle '+meny.n+' oppdrag står som åpne ('+meny.aapne+')', meny.aapne===meny.n && meny.laast===0);
  sant('én Åpne-knapp per oppdrag ('+meny.knapper.length+')',
    meny.knapper.length===meny.n && meny.knapper.every((t,i)=>t==='Åpne '+String.fromCharCode(65+i)));

  // Hvert oppdrag åpnes med et ekte klikk på knappen, og menyen lukker seg.
  const ids=await p.evaluate(()=>RR.OPPDRAG.map(o=>o.id));
  for (const id of ids){
    await p.evaluate(()=>{ RR.lukkAlt(); RR.vekslePause(); });
    await p.waitForTimeout(60);
    await p.click('#pauseinner .lst li button[aria-label^="Åpne oppdrag '+id+':"]');
    await p.waitForTimeout(120);
    const st=await p.evaluate(()=>({m:RR.tilstand.mAapen,pause:RR.tilstand.pause,
      kode:(document.querySelector('#spill .mkode')||{}).textContent}));
    sant(id+' åpnes fra menyen (åpent: '+st.m+', '+st.kode+')',
      st.m===id && !st.pause && st.kode==='OPPDRAG '+id);
  }
  await p.evaluate(()=>RR.lukkAlt());

  // Løs noe og la spillet lagre. Lagringen skal havne i minnet, ikke i nettleseren.
  await p.evaluate(()=>{ RR.loesOppdrag('N'); RR.loesOppdrag('O'); RR.aapneMinispill('A',RR.MINI.A); RR.lukkMinispill(); });
  await p.waitForTimeout(6500);
  const etter=await p.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort()));
  sant('localStorage er byte-likt etter en økt i lærermodus', etter===foer);
  sant('det løste står i minnet så lenge fanen lever',
    (await p.evaluate(()=>RR.tilstand.gjort)).includes('N'));
  // «Nullstill all fremgang» i lærermodus skal heller ikke nå elevens lagring.
  await p.evaluate(()=>RR.nullstill());
  sant('nullstilling i lærermodus sletter ikke elevens lagring',
    (await p.evaluate(()=>JSON.stringify(Object.entries(localStorage).sort())))===foer);

  // Tilbake til vanlig adresse: elevens fremgang er der, og alt er som før.
  await p.goto(BASE);
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(400);
  const t1=await p.evaluate(()=>RR.tilstand);
  sant('eleven har fortsatt A og B løst', t1.gjort.length===2 && t1.gjort.includes('A') && t1.gjort.includes('B'));
  sant('… og XP 777', t1.xp===777);
  await p.evaluate(()=>{ RR.lukkAlt(); RR.vekslePause(); });
  const vanlig=await p.evaluate(()=>({
    laast:[...document.querySelectorAll('#pauseinner .lst li .pill')].filter(x=>x.textContent.includes('låst')).length,
    knapper:document.querySelectorAll('#pauseinner .lst li button').length,
    chip:!!document.getElementById('laererchip'),
    tittel:(document.querySelector('#pauseinner .kort')||{}).textContent||'' }));
  sant('vanlig modus låser fortsatt ('+vanlig.laast+' låst)', vanlig.laast>0);
  sant('vanlig modus har ingen Åpne-knapper', vanlig.knapper===0);
  sant('vanlig modus har ingen lærermerkelapp', !vanlig.chip && !/LÆRERMODUS/.test(vanlig.tittel));
  await p.evaluate(()=>{ RR.lukkAlt(); RR.nullstill(); localStorage.clear(); });
  sant('ingen sidefeil ('+sideFeil.length+')', sideFeil.length===0);
  sideFeil.forEach(f=>console.log('      '+f));
  await p.close();
}

console.log('\n=== LENKEN FRA SPILLET TIL LÆRERSIDEN ===');
// En lærerside ingen finner, er ikke laget. Lenken står i «Om spillet» under
// «Satser og kilder», og den skal virke slik en lærer bruker den: med mus og med Tab.
{
  const ctx=await b.newContext({viewport:{width:1280,height:860}});
  const p=await ctx.newPage();
  const sideFeil=[]; p.on('pageerror',e=>sideFeil.push(e.message));
  await p.goto(BASE);
  await p.evaluate(()=>{ RR.nullstill(); RR.start(); RR.lukkAlt(); RR.vekslePause(); });
  await p.waitForTimeout(150);
  await p.click('#pauseinner .fane button:has-text("Satser og kilder")');
  await p.waitForTimeout(100);
  const l=await p.evaluate(()=>{
    const a=document.getElementById('laererlenke'); if (!a) return null;
    // Kontrast mot kortet lenken står i (WCAG 2.x, relativ luminans).
    const rgb=s=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);
    const lum=c=>{ const v=c.map(x=>{ x/=255; return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4; });
      return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]; };
    const kort=a.closest('.kort');
    const L1=lum(rgb(getComputedStyle(a).color)), L2=lum(rgb(getComputedStyle(kort).backgroundColor));
    return { href:a.href, attr:a.getAttribute('href'), target:a.target, rel:a.rel,
      kort:kort.querySelector('h3')?kort.querySelector('h3').textContent:'',
      kontrast:(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05),
      understrek:getComputedStyle(a).textDecorationLine };
  });
  sant('lenken står i «Om spillet»', !!l && /OM SPILLET/.test(l.kort));
  sant('den peker på laerer.html ved siden av spillet ('+(l&&l.attr)+')',
    !!l && l.attr==='laerer.html' && l.href===new URL('laerer.html',BASE).href);
  sant('den åpner i ny fane med noopener', !!l && l.target==='_blank' && /noopener/.test(l.rel));
  sant('den er understreket, ikke bare farget', !!l && /underline/.test(l.understrek));
  sant('kontrasten mot kortet er minst 4,5:1 ('+(l?l.kontrast.toFixed(2):'?')+':1)', !!l && l.kontrast>=4.5);
  // Tab fra toppen av menyen skal nå lenken, og den skal få fokusringen.
  await p.evaluate(()=>document.activeElement&&document.activeElement.blur());
  let naadd=false;
  for (let i=0;i<60 && !naadd;i++){
    await p.keyboard.press('Tab');
    naadd=await p.evaluate(()=>document.activeElement&&document.activeElement.id==='laererlenke');
  }
  sant('lenken nås med Tab', naadd);
  sant('… og får fokusringen', naadd && await p.evaluate(()=>
    getComputedStyle(document.activeElement).outlineStyle==='solid'));
  // Et ekte klikk åpner lærersiden i en ny fane, og spillet blir stående.
  const [ny]=await Promise.all([ctx.waitForEvent('page'),p.click('#laererlenke')]);
  await ny.waitForLoadState();
  sant('klikket åpner lærersiden ('+(await ny.title())+')',
    ny.url()===new URL('laerer.html',BASE).href && (await ny.title())==='Renteriket i klasserommet');
  sant('spillet står i den første fanen', p.url()===BASE && await p.evaluate(()=>RR.tilstand.pause));
  await ny.close();
  // Samme lenke i lærermodus.
  await p.goto(LAERER_URL);
  await p.evaluate(()=>{ RR.start(); RR.lukkAlt(); RR.vekslePause(); });
  await p.click('#pauseinner .fane button:has-text("Satser og kilder")');
  sant('lenken finnes også i lærermodus', await p.evaluate(()=>!!document.getElementById('laererlenke')));
  sant('ingen sidefeil ('+sideFeil.length+')', sideFeil.length===0);
  await ctx.close();
}

console.log('\n=== LÆRERMODUS PÅ MOBIL ===');
for (const [navn,w,h] of [['390×844',390,844],['360×640',360,640]]){
  const p=await b.newPage({viewport:{width:w,height:h},hasTouch:true,isMobile:true});
  const sideFeil=[]; p.on('pageerror',e=>sideFeil.push(e.message));
  await p.goto(LAERER_URL);
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(700);
  await p.keyboard.press('Space'); await p.waitForTimeout(150);
  sant(navn+': velkomsten viser MENY, ikke Esc',
    await p.evaluate(()=>{ const t=document.querySelector('#dialog .txt').textContent;
      return /\(MENY\)/.test(t) && !/Esc/.test(t); }));
  await p.evaluate(()=>RR.lukkAlt());
  await p.evaluate(()=>{ RR.sett({harJobb:true}); RR.gaaTil('bank'); });
  await p.waitForTimeout(400);
  const FLATER=['#hud','#minimap','#xpwrap','#oppdragsboks','#hint','#ctl .pad','#ctl .hoy'];
  const bokser=await p.evaluate(sel=>sel.map(s=>{
    const e=document.querySelector(s); if (!e) return {s,synlig:false};
    const st=getComputedStyle(e);
    if (st.display==='none'||st.visibility==='hidden'||+st.opacity===0) return {s,synlig:false};
    const r=e.getBoundingClientRect(); return {s,synlig:true,x:r.x,y:r.y,w:r.width,h:r.height};
  }),FLATER);
  const synlige=bokser.filter(x=>x.synlig), kolli=[];
  for (let i=0;i<synlige.length;i++) for (let j=i+1;j<synlige.length;j++)
    if (overlapp(synlige[i],synlige[j])) kolli.push(synlige[i].s+' × '+synlige[j].s);
  sant(navn+': merkelappen står over MENY-knappen, ikke i HUD-en',
    await p.evaluate(()=>{ const c=document.querySelector('#ctl .hoy #laererchip');
      return !!c && !document.querySelector('#hud #laererchip') &&
        c.getBoundingClientRect().bottom<=document.querySelector('#ctl .hoy button').getBoundingClientRect().top; }));
  sant(navn+': ingen HUD-flater overlapper med merkelappen', kolli.length===0);
  kolli.forEach(k=>console.log('      overlapp: '+k));
  // Med gjeld synlig brekker HUD-en til tre rader på 360 px også uten lærermodus, så
  // rammen rundt den sier lite. Her måles hver brikke for seg mot de andre flatene.
  await p.evaluate(()=>RR.sett({gjeld:25000}));
  await p.waitForTimeout(200);
  const brikker=await p.evaluate(()=>{
    const r=e=>{ const b=e.getBoundingClientRect(); return {s:'#'+e.id,x:b.x,y:b.y,w:b.width,h:b.height}; };
    const syn=e=>e && getComputedStyle(e).display!=='none';
    return { chips:[...document.querySelectorAll('#hud .chip, #laererchip')].filter(syn).map(r),
      // Merkelappen bor i #ctl .hoy, så den måles mot knappene der, ikke mot kolonnen.
      andre:['#minimap','#xpwrap','#oppdragsboks','#hint','#ctl .pad',...document.querySelectorAll('#ctl .hoy button')]
        .map(s=>typeof s==='string'?document.querySelector(s):s).filter(syn)
        .map(e=>({...r(e),s:e.id||e.className||e.textContent})) };
  });
  const kolli2=[];
  for (const c of brikker.chips) for (const a of brikker.andre) if (overlapp(c,a)) kolli2.push(c.s+' × '+a.s);
  sant(navn+': med gjeld synlig overlapper ingen brikke ('+brikker.chips.length+' brikker)',
    brikker.chips.some(c=>c.s==='#gjeld') && brikker.chips.some(c=>c.s==='#laererchip') && kolli2.length===0);
  kolli2.forEach(k=>console.log('      overlapp: '+k));
  sant(navn+': ingen sidefeil', sideFeil.length===0);
  await p.close();
}

await b.close();
console.log('\n==========================================================');
if (feil) { console.log('✗ '+feil+' av '+(ok+feil)+' sjekker feilet'); process.exit(1); }
console.log('✓ alle '+ok+' sjekker OK');
})().catch(e=>{ console.error(e); process.exit(1); });
