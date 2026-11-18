// test-jul.js — julekalenderen (julekalender.html).
// Kalenderen er en egen fil som siterer spillet og regner med satsene for 2026.
// Slike filer råtner stille, så tre ting måles: at hvert kort heter det samme som
// i spillet, at hver fasit stemmer når den regnes ut på nytt med andre formler enn
// spillets, og at lukene åpner seg på riktig norsk dato, også over midnatt.
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }
const norm=s=>String(s).replace(/[\s  ]+/g,' ').trim();

const BASE=process.env.RR_URL||pathToFileURL(path.join(__dirname,'index.html')).href;
const JUL=new URL('julekalender.html',BASE).href;
const kilde=fs.readFileSync(path.join(__dirname,'julekalender.html'),'utf8');

// Satsene for 2026, skrevet inn her med vilje: fasiten skal ikke hvile på spillets
// egne tall. Så lenge spillet står på 2026, sjekkes det at de er like.
const S26={alminnelig:0.22,oppjustering:1.72,trygdeavgift:0.076,trygdNedre:99650,frikort:100000,
  personfradrag:114540,minstefradragSats:0.46,minstefradragMaks:95700,
  trinn:[[226100,0.017],[318300,0.040],[725050,0.137],[980100,0.168],[1467200,0.178]],
  bsuMaks:27500,bsuTotal:300000,bsuFradrag:0.10,bsuAlder:33,ipsMaks:25000,ipsAlder:62,
  egenkapital:0.10,belaaningsgrad:0.90,dokumentavgift:0.025,tinglysingSkjote:545,tinglysingPant:545,
  rentefradrag:0.22,folketrygdSats:0.181,folketrygdTak:7.1,grunnbelopSnitt:134419,otpMin:0.02,
  realAksjer:0.052,gebyrIndeks:0.0025,gebyrAktiv:0.013};

// Lønnsskatt 2026 regnet trinn for trinn (spillet bruker F.lonnsskatt).
function skatt(l){
  const minste=Math.min(l*S26.minstefradragSats,S26.minstefradragMaks);
  const alm=Math.max(0,l-minste-S26.personfradrag)*S26.alminnelig;
  let trinn=0;
  S26.trinn.forEach(([fra,sats],i)=>{ const til=i+1<S26.trinn.length?S26.trinn[i+1][0]:Infinity;
    if (l>fra) trinn+=(Math.min(l,til)-fra)*sats; });
  // Trygdeavgiften trappes opp med 25 % av det som overstiger nedre grense.
  const trygd=l<=S26.trygdNedre?0:Math.min(l*S26.trygdeavgift,(l-S26.trygdNedre)*0.25);
  return alm+trinn+trygd;
}
// Sparing med innskudd i slutten av hver periode, summert ledd for ledd.
function serie(beloep,rPer,n,start){ let v=0; for (let i=0;i<n;i++){ if (start) v+=beloep; v*=1+rPer; if (!start) v+=beloep; } return v; }
const mnd=r=>Math.pow(1+r,1/12)-1;
const tusen=x=>String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const kr=x=>tusen(x)+' kr';
const rundt=(x,steg)=>tusen(Math.round(x/steg)*steg);
const pst=(x,des)=>(x*100).toFixed(des).replace('.',',')+' %';
const mill=(x)=>(x/1e6).toFixed(2).replace('.',',')+' millioner';

// Fasiten, regnet ut her. Hver rad: dag → tekster som skal stå i svaret (s) eller forklaringen (f).
function fasit(){
  const F={};
  const l5=skatt(500000);
  F[1]={s:['Rundt '+rundt(l5,100)+' kr i skatt','rundt '+rundt((500000-l5)/12,50)+' kr i måneden'],
        f:[pst(S26.alminnelig,0),pst(S26.trygdeavgift,1)]};
  F[2]={s:[kr(skatt(90000))],f:[pst(S26.minstefradragSats,0),kr(S26.personfradrag),kr(S26.trygdNedre),kr(S26.frikort)]};
  const marg=(skatt(601000)-skatt(600000))/1000;
  F[3]={s:[kr(10000*(1-marg))],f:[pst(marg,1),pst(S26.trinn[1][1],0)]};
  F[4]={s:[kr(3*18000)]};
  const r5=mnd(0.05);
  F[5]={s:[kr(1000*480),'rundt '+mill(serie(1000,r5,480,false))],f:['rundt '+rundt(serie(1000,r5,120,false),1000)+' kr']};
  F[6]={s:[pst(Math.pow(1.01,12)-1,2)],f:[(Math.pow(1.01,12)).toFixed(4).replace('.',',')]};
  F[7]={s:[pst(1/0.6-1,1)]};
  F[8]={s:[pst(1.04/1.03-1,2)],f:[(1.04/1.03).toFixed(4).replace('.',',')]};
  F[9]={s:[kr(60000*S26.rentefradrag)],f:[Math.round(100*(1-S26.rentefradrag))+' øre']};
  F[10]={s:[kr(S26.bsuMaks*S26.bsuFradrag)],f:[kr(S26.bsuMaks),kr(S26.bsuTotal),'fyller '+S26.bsuAlder]};
  const tl=S26.tinglysingSkjote+S26.tinglysingPant;
  F[11]={s:[kr(4e6*S26.egenkapital+4e6*S26.dokumentavgift+tl)],
         f:[kr(4e6*S26.egenkapital),kr(4e6*S26.dokumentavgift),kr(S26.tinglysingSkjote)]};
  // Borettslag: lån + fellesgjeld ≤ belåningsgraden × totalprisen, tinglysing kommer i tillegg.
  const tot=2.8e6+0.9e6;
  F[12]={s:['Totalprisen er '+kr(tot),kr((1-S26.belaaningsgrad)*tot+tl)],f:[pst(S26.belaaningsgrad,0),kr(tl)]};
  F[13]={s:[kr(5e6*S26.dokumentavgift)+' på selveier','0 kr på borettslag']};
  F[14]={s:[kr(20000*S26.alminnelig*S26.oppjustering)],
         f:[String(S26.oppjustering).replace('.',','),pst(S26.alminnelig*S26.oppjustering,2)]};
  F[15]={s:['0 kr']};
  F[16]={s:[kr(S26.ipsMaks*S26.alminnelig)],f:['du er '+S26.ipsAlder]};
  F[17]={s:[kr(Math.min(550000,S26.folketrygdTak*S26.grunnbelopSnitt)*S26.folketrygdSats)],
         f:[kr(S26.folketrygdTak*S26.grunnbelopSnitt),pst(S26.folketrygdSats,1)]};
  F[18]={s:[kr(550000*S26.otpMin)],f:[pst(S26.otpMin,0)]};
  const r7=mnd(0.07), ida=serie(1000,r7,42*12,false), jonas=serie(1000,r7,32*12,false);
  F[19]={s:['Ida har rundt '+mill(ida),'Jonas rundt '+mill(jonas)],f:[kr(120*1000)]};
  sant('luke 19: Ida har over dobbelt så mye ('+(ida/jonas).toFixed(2)+')',ida/jonas>2);
  const a=serie(30000,0.07-S26.gebyrIndeks,30,true), b=serie(30000,0.07-S26.gebyrAktiv,30,true);
  F[20]={s:['Rundt '+rundt(a-b,1000)+' kr mer',mill(a)+' mot '+mill(b)],f:[pst((a-b)/a,1)]};
  F[21]={s:['Legg på']};
  F[22]={s:['Rundt '+Math.round((Math.pow(1.03,52)-1)*100)+' % i året'],f:[Math.pow(1.03,52).toFixed(2).replace('.',',')]};
  F[23]={s:['Rundt '+rundt(1e5*Math.pow(1+S26.realAksjer,30),1000)+' kr'],
         f:[Math.pow(1+S26.realAksjer,30).toFixed(2).replace('.',',')]};
  F[24]={s:['Rundt '+rundt(serie(1000,S26.realAksjer,18,true),50)+' kr',kr(18000)+' i gaver'],
         f:['rundt '+rundt(1000*Math.pow(1+S26.realAksjer,18),10)+' kr']};
  return F;
}

// Tidspunkt i norsk tid (CET i desember, UTC+1).
const oslo=s=>new Date(s+'+01:00');
const BYDEL=s=>s.charAt(0)+s.slice(1).toLowerCase();

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
const sideFeil=[];
async function side(tid,opts={}){
  const ctx=await b.newContext({viewport:opts.viewport||{width:1280,height:900},
    reducedMotion:opts.reducedMotion||'no-preference',hasTouch:!!opts.mobil,isMobile:!!opts.mobil});
  const p=await ctx.newPage();
  p.on('pageerror',e=>sideFeil.push(e.message));
  if (opts.lopende) await p.clock.install({time:tid}); else await p.clock.setFixedTime(tid);
  await p.goto(JUL);
  return p;
}
const aapne=p=>p.$$eval('#hvelv .boks',bs=>bs.filter(x=>x.classList.contains('aapen')).map(x=>+x.dataset.dag).sort((a,b)=>a-b));

console.log('\n=== KALENDEREN MOT SPILLET ===');
{
  const p=await (await b.newContext()).newPage();
  await p.goto(BASE);
  const spill=await p.evaluate(()=>({aar:RR.SATSER.aar,S:JSON.parse(JSON.stringify(RR.SATSER,(k,v)=>v)),
    trinn:RR.SATSER.trinn.map(t=>[t.fra,t.sats]),
    kort:RR.KORT.map(k=>({n:k.n,t:k.t,bydel:(RR.sonenPaa(k.x,k.y)||{}).navn}))}));
  await p.close();
  const q=await side(oslo('2026-12-24T12:00'));
  const {LUKER,VEGG}=await q.evaluate(()=>({LUKER,VEGG}));
  await q.context().close();
  sant('24 luker, dag 1 til 24 én gang hver',
    LUKER.length===24 && LUKER.map(l=>l.d).sort((a,b)=>a-b).every((d,i)=>d===i+1));
  sant('veggen har hver luke én gang', VEGG.length===24 && [...VEGG].sort((a,b)=>a-b).every((d,i)=>d===i+1));
  sant('ingen kort brukes to ganger', new Set(LUKER.map(l=>l.kort)).size===24);
  for (const l of LUKER){
    const k=spill.kort.find(x=>x.n===l.kort)||{};
    sant('luke '+l.d+': kort '+l.kort+' heter «'+norm(k.t)+'» i '+BYDEL(k.bydel||'?')+' (står: «'+l.tittel+'», '+l.bydel+')',
      norm(k.t)===norm(l.tittel) && BYDEL(k.bydel||'')===l.bydel);
  }
  // Testens satser mot spillets. Når spillet går over til 2027, gjelder kalenderen
  // fortsatt 2026 og sier det; da er det testens tall som står.
  const ulike=Object.keys(S26).filter(k=>k!=='trinn' && spill.S[k]!==S26[k]);
  if (JSON.stringify(spill.trinn)!==JSON.stringify(S26.trinn)) ulike.push('trinn');
  sant('fasiten regner med spillets satser'+(spill.aar===2026?' ('+(ulike.join(', ')||'alle like')+')':' (spillet står på '+spill.aar+', kalenderen gjelder 2026)'),
    spill.aar!==2026 || ulike.length===0);

  console.log('\n=== FASITEN, REGNET UT PÅ NYTT ===');
  const F=fasit();
  for (const l of LUKER){
    const f=F[l.d]||{s:[],f:[]};
    const sv=norm(l.svar), fk=norm(l.forkl);
    const mangler=[...(f.s||[]).filter(t=>!sv.includes(norm(t))).map(t=>'svar: '+t),
                   ...(f.f||[]).filter(t=>!fk.includes(norm(t))).map(t=>'forklaring: '+t)];
    sant('luke '+l.d+' ('+sv+')'+(mangler.length?' mangler '+mangler.join(' | '):''), (f.s||[]).length>0 && mangler.length===0);
  }
}

console.log('\n=== LUKENE ÅPNER PÅ NORSK DATO ===');
for (const [navn,tid,forvent,status] of [
  ['18. november',oslo('2026-11-18T12:00'),[],/om 13 dager/],
  ['30. november',oslo('2026-11-30T23:00'),[],/i morgen/],
  ['1. desember kl. 00:05',oslo('2026-12-01T00:05'),[1],/Luke 1 er åpen/],
  ['4. des. 23:30 UTC = 5. des. i Norge',new Date('2026-12-04T23:30:00Z'),[1,2,3,4,5],/5\. desember/],
  ['julaften',oslo('2026-12-24T08:00'),[...Array(24).keys()].map(i=>i+1),/Julaften/],
  ['10. januar 2027',oslo('2027-01-10T12:00'),[...Array(24).keys()].map(i=>i+1),/gjelder 2026/]]){
  const p=await side(tid);
  const aa=await aapne(p), st=norm(await p.textContent('#status'));
  sant(navn+': åpne '+(aa.length?aa[0]+'–'+aa[aa.length-1]:'ingen')+', «'+st+'»',
    JSON.stringify(aa)===JSON.stringify(forvent) && status.test(st));
  await p.context().close();
}
{
  // Står siden åpen over midnatt, skal neste luke åpne seg uten omlasting.
  const p=await side(oslo('2026-12-05T23:59:00'),{lopende:true});
  const foer=await aapne(p);
  await p.clock.runFor(2*60*1000);
  const etter=await aapne(p);
  sant('over midnatt: '+foer.length+' → '+etter.length+' åpne, og 6 er dagens',
    foer.length===5 && etter.length===6 && await p.$eval('.boks[data-dag="6"]',x=>x.classList.contains('idag')));
  await p.context().close();
}

console.log('\n=== MED MUS OG TASTATUR, SOM EN LESER ===');
{
  const p=await side(oslo('2026-12-10T07:30'));
  const LUKER=await p.evaluate(()=>LUKER), VEGG=await p.evaluate(()=>VEGG);
  // Hver boks sier status i tekst, ikke bare med farge eller form.
  const merker=await p.$$eval('#hvelv .boks',bs=>bs.map(x=>({d:+x.dataset.dag,t:x.querySelector('.merke').textContent,
    a:x.getAttribute('aria-label'),dis:x.getAttribute('aria-disabled')})));
  sant('hver boks sier ÅPNE eller LÅST i tekst',
    merker.every(m=>m.d<=10?/ÅPNE/.test(m.t)&&!m.dis:/LÅST/.test(m.t)&&m.dis==='true'));
  sant('dagens luke sier I DAG, og bare den', merker.filter(m=>/I DAG/.test(m.t)).map(m=>m.d).join()==='10');
  sant('skjermleseren får dato på låste luker', merker.filter(m=>m.d>10).every(m=>m.a.includes('låst til '+m.d+'. desember')));
  // Tab går langs veggen i samme rekkefølge som øyet leser den.
  const tab=[];
  for (let i=0;i<24;i++){ await p.keyboard.press('Tab'); tab.push(await p.evaluate(()=>+(document.activeElement.dataset.dag||0))); }
  sant('Tab følger veggen ('+tab.slice(0,6).join(',')+' …)', JSON.stringify(tab)===JSON.stringify(VEGG));
  // Fokus på luke 10 og Enter: luka går opp, svaret er skjult til man ber om det.
  await p.focus('.boks[data-dag="10"]');
  await p.keyboard.press('Enter');
  await p.waitForSelector('#luke[open]',{timeout:2000});
  const l10=LUKER.find(l=>l.d===10);
  const d=await p.evaluate(()=>({tit:document.getElementById('ltit').textContent,
    kode:document.getElementById('lkode').textContent,opp:document.getElementById('loppg').textContent,
    svarSynlig:document.getElementById('lsvar').checkVisibility()}));
  sant('Enter åpner luke 10 med kortet og oppgaven', d.tit===l10.tittel && /LUKE 10/.test(d.kode) && norm(d.opp)===norm(l10.oppgave));
  sant('svaret er skjult til man ber om det', !d.svarSynlig);
  await p.click('#ldet summary');
  sant('«Vis svaret» viser svaret', norm(await p.textContent('#lsvar'))===norm(l10.svar) &&
    await p.evaluate(()=>document.getElementById('lsvar').checkVisibility()));
  sant('svaret bruker harde mellomrom i tall', /2 750 kr/.test(await p.textContent('#lsvar')));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  sant('Esc lukker, og fokus går tilbake til luke 10',
    await p.evaluate(()=>!document.getElementById('luke').open && document.activeElement.dataset.dag==='10'));
  // Klikk med musa på en annen åpen luke, og lukk med ✕.
  await p.click('.boks[data-dag="3"]');
  await p.waitForSelector('#luke[open]',{timeout:2000});
  sant('klikk åpner luke 3', (await p.textContent('#ltit'))===LUKER.find(l=>l.d===3).tittel);
  sant('svaret er lukket igjen i neste luke', !(await p.evaluate(()=>document.getElementById('ldet').open)));
  await p.click('#luke .lukk');
  sant('✕ lukker luka', !(await p.evaluate(()=>document.getElementById('luke').open)));
  // En låst luke åpner ingenting og sier når den åpner.
  // force: Playwright regner aria-disabled som «ikke klikkbar», men en bruker kan klikke.
  await p.click('.boks[data-dag="11"]',{force:true});
  await p.waitForTimeout(300);
  sant('låst luke 11 åpner ikke, men sier «åpner 11. desember»',
    !(await p.evaluate(()=>document.getElementById('luke').open)) && /åpner 11\. desember/.test(await p.textContent('#melding')));
  sant('lenken til spillet går til /renteriket/', await p.$eval('.tilspill a',a=>a.getAttribute('href'))==='/renteriket/');
  await p.context().close();
}
{
  const p=await side(oslo('2026-12-10T07:30'),{reducedMotion:'reduce'});
  await p.click('.boks[data-dag="2"]');
  sant('med redusert bevegelse åpner luka uten dør-animasjon',
    await p.evaluate(()=>document.getElementById('luke').open && !document.querySelector('.gaar-opp')));
  await p.context().close();
}

console.log('\n=== KONTRAST OG MOBIL ===');
{
  const p=await side(oslo('2026-12-10T07:30'));
  // Kontrast mot de mørkeste/lyseste stoppene i gradientene, lest fra CSS-variablene.
  const k=await p.evaluate(()=>{
    const rgb=s=>{ s=s.trim(); if (s[0]==='#'){ const h=s.slice(1); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)); }
      return s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number); };
    const lum=c=>{ const v=c.map(x=>{ x/=255; return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4; });
      return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]; };
    const kf=(a,b)=>{ const A=lum(rgb(a)),B=lum(rgb(b)); return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05); };
    const v=n=>getComputedStyle(document.documentElement).getPropertyValue(n);
    const farge=s=>getComputedStyle(document.querySelector(s)).color;
    const verst=(f,bg)=>Math.min(...bg.map(x=>kf(f,x)));
    return {
      'merke på låst boks':verst(farge('.laast .merke'),[v('--staal'),v('--staal2')]),
      'merke på åpen boks':verst(farge('.aapen .merke'),[v('--staal'),v('--staal2')]),
      'merke på dagens boks':verst(farge('.idag .merke'),[v('--staal'),v('--staal2')]),
      'nummerskiltet':verst(farge('.skilt'),['#ecd08a',v('--messing'),v('--messing2')]),
      'statuslinja':verst(farge('#status'),[v('--ink')]),
      'ingressen':verst(farge('.ingress'),[v('--ink')]),
      'bunnteksten':verst(farge('footer'),[v('--ink')]),
      'forklaringen i luka':verst(farge('.forkl'),[v('--ink2')]),
      'kilden i luka':verst(farge('.kilde'),[v('--ink2')]) };
  });
  for (const [n,x] of Object.entries(k)) sant(n+': '+x.toFixed(2)+':1 (krav 4,5)', x>=4.5);
  await p.context().close();
}
for (const [navn,w,h] of [['390×844',390,844],['360×640',360,640]]){
  const p=await side(oslo('2026-12-10T07:30'),{viewport:{width:w,height:h},mobil:true});
  const m=await p.evaluate(()=>{
    const r=[...document.querySelectorAll('#hvelv .boks')].map(x=>x.getBoundingClientRect());
    let kolli=0; for (let i=0;i<r.length;i++) for (let j=i+1;j<r.length;j++)
      if (!(r[i].right<=r[j].left||r[j].right<=r[i].left||r[i].bottom<=r[j].top||r[j].bottom<=r[i].top)) kolli++;
    const merkeUt=[...document.querySelectorAll('#hvelv .boks')].filter(x=>{ const a=x.getBoundingClientRect(),
      b=x.querySelector('.merke').getBoundingClientRect(); return b.right>a.right+0.5||b.bottom>a.bottom+0.5; }).length;
    return {bredde:document.documentElement.scrollWidth, minst:Math.min(...r.map(x=>Math.min(x.width,x.height))), kolli, merkeUt};
  });
  sant(navn+': ingen sideveis rulling ('+m.bredde+' px)', m.bredde<=w);
  sant(navn+': boksene overlapper ikke, og den minste er '+Math.round(m.minst)+' px (krav 44)', m.kolli===0 && m.minst>=44);
  sant(navn+': statusteksten får plass i boksen', m.merkeUt===0);
  await p.tap('.boks[data-dag="1"]');
  await p.waitForSelector('#luke[open]',{timeout:2000});
  sant(navn+': luka får plass på skjermen', await p.evaluate(([w,h])=>{ const r=document.getElementById('luke').getBoundingClientRect();
    return r.left>=0 && r.right<=w && r.top>=0 && r.bottom<=h; },[w,h]));
  await p.context().close();
}

console.log('\n=== INGENTING SENDES, INGENTING LAGRES ===');
sant('ingen eksterne skript, stilark, bilder eller fonter',
  !/<script[^>]+src|<link[^>]+stylesheet|<img|@import|@font-face|url\(\s*['"]?https?:/i.test(kilde));
sant('ingen nettverkskall i koden', !/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(kilde));
sant('ingen lagring i nettleseren', !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(kilde));
sant('ingen lenker ut av evers.no', [...kilde.matchAll(/href="([^"]+)"/g)].every(m=>/^\/renteriket\/$|^https:\/\/www\.evers\.no\//.test(m[1])));
sant('ingen sidefeil ('+sideFeil.length+')', sideFeil.length===0);
sideFeil.forEach(f=>console.log('      '+f));

await b.close();
console.log('\n==========================================================');
if (feil) { console.log('✗ '+feil+' av '+(ok+feil)+' sjekker feilet'); process.exit(1); }
console.log('✓ alle '+ok+' sjekker OK');
})().catch(e=>{ console.error(e); process.exit(1); });
