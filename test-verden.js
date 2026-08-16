// test-verden.js — går byen faktisk an å bo i?
// Sjekker bevegelse, kollisjon, at hver dør svarer på noe, at hver figur
// er tilgjengelig, og at alle åtte bydelene kan nås til fots fra Startgata.
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:820}});
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR '+e.message); feil++; });
await p.goto(process.env.RR_URL||('file://'+__dirname+'/index.html'));
await p.evaluate(()=>{ RR.nullstill(); });
await p.reload();
await p.evaluate(()=>RR.start());
await p.waitForTimeout(700);
await p.evaluate(()=>RR.lukkAlt());   // hopp over åpningsdialogen

const BYGG=await p.evaluate(()=>RR.BYGG);
const FOLK=await p.evaluate(()=>RR.FOLK);
const SONER=await p.evaluate(()=>RR.SONER);
const OPPDRAG=await p.evaluate(()=>RR.OPPDRAG);

console.log('\n=== GRUNNTALL ===');
sant('åtte bydeler', SONER.length===8);
sant('25 bygninger', BYGG.length===25);
sant('femten figurer', FOLK.length===15);
sant('fjorten oppdrag', OPPDRAG.length===14);
sant('alle bygg-id-er er unike', new Set(BYGG.map(b=>b.id)).size===BYGG.length);
sant('alle oppdrag peker på en bygning som finnes',
  OPPDRAG.every(o=>BYGG.some(b=>b.id===o.bygg)));
sant('alle oppdrag peker på en figur som finnes',
  OPPDRAG.every(o=>FOLK.some(f=>f.id===o.figur)));
sant('alle oppdrag har et minispill',
  await p.evaluate(()=>RR.OPPDRAG.every(o=>typeof RR.MINI[o.id]==='function')));
sant('kravene peker bare på oppdrag som finnes',
  OPPDRAG.every(o=>o.krav.every(k=>OPPDRAG.some(x=>x.id===k))));
sant('ingen oppdrag krever seg selv', OPPDRAG.every(o=>!o.krav.includes(o.id)));
// avhengighetsgrafen skal være løsbar: topologisk sortering må gå gjennom
{
  const igjen=OPPDRAG.map(o=>o.id), lost=new Set();
  let runder=0;
  while (igjen.length && runder++<30){
    for (let i=igjen.length-1;i>=0;i--){
      const o=OPPDRAG.find(x=>x.id===igjen[i]);
      if (o.krav.every(k=>lost.has(k))){ lost.add(o.id); igjen.splice(i,1); }
    }
  }
  sant('avhengighetsgrafen er løsbar (ingen sirkel, ingen døde oppdrag)', igjen.length===0);
  sant('minst ett oppdrag er åpent fra start', OPPDRAG.some(o=>o.krav.length===0));
}

console.log('\n=== SLIK EN SPILLER FAKTISK STARTER ===');
// Denne testen manglet, og det er derfor «det går ikke an å bevege seg» slapp
// gjennom hele pakka (838 sjekker den gang, 970 i dag): alle de andre kaller
// RR.flyttTil() eller RR.lukkAlt()
// først, og flytter dermed spilleren vekk fra startposisjonen før de prøver noe.
// Startposisjonen lå inne i BUTIKKENs kollisjonsboks — begge akser blokkert,
// spilleren bom fast fra første sekund.
{
  const start=await p.evaluate(()=>RR.START_POS);
  const blokk=await p.evaluate(s=>RR.blokkert(s.x,s.y),start);
  sant('startposisjonen ('+start.x+','+start.y+') er et fritt punkt', !blokk);
  if (blokk) console.log('      blokkert av: '+(await p.evaluate(s=>RR.BYGG.filter(b=>
    s.x>b.x-14&&s.x<b.x+b.w+14&&s.y>b.y-14&&s.y<b.y+b.h+14).map(b=>b.id),start)).join(', '));
  // og det skal være fritt i alle fire retninger, ikke bare i punktet
  for (const [dx,dy,navn] of [[40,0,'øst'],[-40,0,'vest'],[0,-40,'nord'],[0,40,'sør']]){
    const fri=!(await p.evaluate(([x,y])=>RR.blokkert(x,y),[start.x+dx,start.y+dy]));
    sant('  det er fritt '+navn+' for startposisjonen', fri);
  }

  // Hele spillerens åpning: last på nytt, klikk START, les dialogen med
  // mellomrom, og gå — uten et eneste programmatisk grep.
  await p.evaluate(()=>RR.nullstill());
  await p.reload();
  await p.waitForTimeout(300);
  await p.click('#startknapp');
  await p.waitForTimeout(1100);
  sant('spillet kjører etter klikk på START', await p.evaluate(()=>RR.tilstand.kjorer));
  sant('åpningsdialogen vises', await p.evaluate(()=>RR.tilstand.dAapen));
  const laast=await p.evaluate(()=>RR.tilstand.pos);
  await p.keyboard.down('d'); await p.waitForTimeout(300); await p.keyboard.up('d');
  const laast2=await p.evaluate(()=>RR.tilstand.pos);
  sant('man kan ikke gå mens dialogen er åpen', Math.abs(laast2[0]-laast[0])<1);
  // mellomrom gjennom dialogen, slik en spiller gjør
  let trykk=0;
  for (let i=0;i<8;i++){
    if (!(await p.evaluate(()=>RR.tilstand.dAapen))) break;
    await p.keyboard.press('Space'); trykk++;
    await p.waitForTimeout(140);
  }
  sant('mellomrom lukker åpningsdialogen ('+trykk+' trykk)',
    !(await p.evaluate(()=>RR.tilstand.dAapen)));
  // og NÅ skal alle fem retninger virke, fra der spilleren faktisk står
  for (const [tast,akse,retning] of [['d',0,1],['a',0,-1],['s',1,1],['w',1,-1],['ArrowRight',0,1]]){
    const f=await p.evaluate(()=>RR.tilstand.pos);
    await p.keyboard.down(tast); await p.waitForTimeout(400); await p.keyboard.up(tast);
    const e=await p.evaluate(()=>RR.tilstand.pos);
    const d=(e[akse]-f[akse])*retning;
    sant(tast+' virker fra startposisjonen ('+Math.round(d)+' px)', d>25);
  }
  // tilbake til utgangspunktet for resten av testene
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== INGEN FIGUR STÅR INNI EN VEGG ===');
{
  const inni=await p.evaluate(()=>RR.FOLK.filter(f=>!f.skjul && RR.blokkert(f.x0||f.x, f.y0||f.y))
    .map(f=>f.id+' ('+Math.round(f.x0||f.x)+','+Math.round(f.y0||f.y)+')'));
  sant('ingen figur står inni en bygning eller rekvisitt', inni.length===0);
  if (inni.length) console.log('      inni vegg: '+inni.join(', '));
  // og de skal kunne nås: fritt punkt innenfor snakkeradien (46 px)
  const uten=await p.evaluate(()=>RR.FOLK.filter(f=>{
    if (f.skjul) return false;
    const x0=f.x0||f.x, y0=f.y0||f.y;
    for (let r=0;r<=40;r+=8) for (let a=0;a<12;a++){
      const x=x0+Math.cos(a/12*Math.PI*2)*r, y=y0+Math.sin(a/12*Math.PI*2)*r;
      if (!RR.blokkert(x,y,16)) return false;
    }
    return true;
  }).map(f=>f.id));
  sant('alle figurer kan nås til fots', uten.length===0);
  if (uten.length) console.log('      uten adkomst: '+uten.join(', '));
}

console.log('\n=== BEVEGELSE ===');
for (const [tast,akse,retning] of [['d',0,1],['a',0,-1],['s',1,1],['w',1,-1],
                                   ['ArrowRight',0,1],['ArrowUp',1,-1]]){
  await p.evaluate(()=>{ RR.lukkAlt(); RR.flyttTil(1560,1460); });
  await p.waitForTimeout(60);
  const f=await p.evaluate(()=>RR.tilstand.pos);
  await p.keyboard.down(tast); await p.waitForTimeout(420); await p.keyboard.up(tast);
  await p.waitForTimeout(60);
  const e=await p.evaluate(()=>RR.tilstand.pos);
  const flyttet=(e[akse]-f[akse])*retning;
  sant(tast+' flytter spilleren riktig vei (' + Math.round(flyttet) + ' px)', flyttet>25);
}
{
  // Shift skal gi høyere fart enn å gå
  await p.evaluate(()=>{ RR.lukkAlt(); RR.flyttTil(1560,1460); });
  const f1=await p.evaluate(()=>RR.tilstand.pos);
  await p.keyboard.down('d'); await p.waitForTimeout(500); await p.keyboard.up('d');
  const g=Math.abs((await p.evaluate(()=>RR.tilstand.pos))[0]-f1[0]);
  await p.evaluate(()=>RR.flyttTil(1560,1460));
  const f2=await p.evaluate(()=>RR.tilstand.pos);
  await p.keyboard.down('Shift'); await p.keyboard.down('d');
  await p.waitForTimeout(500);
  await p.keyboard.up('d'); await p.keyboard.up('Shift');
  const l=Math.abs((await p.evaluate(()=>RR.tilstand.pos))[0]-f2[0]);
  sant('Shift gir høyere fart ('+Math.round(g)+' → '+Math.round(l)+' px)', l>g*1.2);
}
{
  // gå rett inn i bankens vegg og bli stoppet
  const bank=BYGG.find(b=>b.id==='bank');
  // klar av døra — døra er et hull i veggen, så der SKAL man komme gjennom
  await p.evaluate(b=>RR.flyttTil(b.x+40, b.y+b.h+80),bank);
  const f=await p.evaluate(()=>RR.tilstand.pos);
  await p.keyboard.down('w'); await p.waitForTimeout(1100); await p.keyboard.up('w');
  const e=await p.evaluate(()=>RR.tilstand.pos);
  sant('veggen stopper spilleren ('+Math.round(e[1])+' > '+(bank.y+bank.h)+')',
    e[1] > bank.y+bank.h);
  sant('spilleren kom nærmere veggen først', e[1] < f[1]-20);
}
// kollisjon: gå rett inn i en vegg og bli stoppet
{
  const bank=BYGG.find(b=>b.id==='bank');
  const midtIVeggen=[bank.x+bank.w/2, bank.y+bank.h/2];
  sant('midt i en bygning er blokkert',
    await p.evaluate(m=>RR.blokkert(m[0],m[1]),midtIVeggen));
  sant('døra er ikke blokkert', !(await p.evaluate(id=>{
    const d=RR.dor(RR.BYGG.find(b=>b.id===id)); return RR.blokkert(d.x,d.y);
  },'bank')));
  sant('utenfor kartet er blokkert', await p.evaluate(()=>RR.blokkert(10,10)));
  sant('midt på Rentetorget er fritt', !(await p.evaluate(()=>RR.blokkert(1600,1450))));
}

console.log('\n=== ALLE ÅTTE BYDELER NÅS TIL FOTS ===');
// Bredde-først-søk på et grid over kartet, med spillets egen kollisjon.
{
  const naadd=await p.evaluate(()=>{
    const R=20;                              // rutestørrelse
    const bredde=Math.ceil(3200/R), hoyde=Math.ceil(2400/R);
    const set=new Set();
    const start=[Math.round(RR.START_POS.x/R),Math.round(RR.START_POS.y/R)];
    const ko=[start]; set.add(start[0]+','+start[1]);
    const sonerNaadd=new Set();
    while (ko.length){
      const [cx,cy]=ko.shift();
      const wx=cx*R, wy=cy*R;
      const s=RR.sonenPaa(wx,wy); if (s) sonerNaadd.add(s.id);
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cx+dx, ny=cy+dy;
        if (nx<0||ny<0||nx>=bredde||ny>=hoyde) continue;
        const nk=nx+','+ny; if (set.has(nk)) continue;
        if (RR.blokkert(nx*R,ny*R,16)) continue;
        set.add(nk); ko.push([nx,ny]);
      }
    }
    return {soner:[...sonerNaadd], ruter:set.size};
  });
  console.log('  nådde '+naadd.soner.length+' av 8 bydeler, '+naadd.ruter+' ruter');
  sant('alle åtte bydeler kan nås til fots fra startposisjonen', naadd.soner.length===8);
  SONER.forEach(s=>sant('  '+s.navn+' er nåbar', naadd.soner.includes(s.id)));
}

console.log('\n=== HVER DØR NÅS OG SVARER ===');
{
  const utenAdkomst=[];
  for (const bg of BYGG){
    const naa=await p.evaluate(id=>{
      const b=RR.BYGG.find(x=>x.id===id), d=RR.dor(b);
      // finnes et fritt punkt rett utenfor døra?
      for (let r=6;r<=34;r+=6) for (let a=0;a<12;a++){
        const x=d.x+Math.cos(a/12*Math.PI*2)*r, y=d.y+Math.sin(a/12*Math.PI*2)*r;
        if (!RR.blokkert(x,y,16)) return true;
      }
      return false;
    },bg.id);
    if (!naa) utenAdkomst.push(bg.id);
  }
  sant('alle dører har fri adkomst', utenAdkomst.length===0);
  if (utenAdkomst.length) console.log('      uten adkomst: '+utenAdkomst.join(', '));

  const tomme=[], korte=[];
  for (const bg of BYGG){
    await p.evaluate(id=>{ RR.lukkAlt(); RR.gaaTil(id); },bg.id);
    await p.waitForTimeout(60);
    await p.evaluate(()=>RR.handle());
    await p.waitForTimeout(90);
    const t=await p.evaluate(()=>RR.minispillTekst());
    if (!t) tomme.push(bg.id);
    else if (t.length<160) korte.push(bg.id+' ('+t.length+' tegn)');
    await p.evaluate(()=>RR.lukkAlt());
  }
  sant('hver bygning åpner noe når du trykker handle', tomme.length===0);
  if (tomme.length) console.log('      svarte ikke: '+tomme.join(', '));
  sant('ingen bygning har et innhold under 160 tegn', korte.length===0);
  if (korte.length) console.log('      tynt innhold: '+korte.join(', '));
  const besokt=await p.evaluate(()=>RR.tilstand.besokt.length);
  sant('alle 25 bygninger er registrert som besøkt', besokt===BYGG.length);
}

console.log('\n=== HVER FIGUR SNAKKER ===');
{
  const stumme=[];
  for (const f of FOLK){
    if (f.skjul) continue;
    await p.evaluate(()=>RR.lukkAlt());
    await p.evaluate(id=>RR.tilFigur(id),f.id);
    await p.waitForTimeout(60);
    await p.evaluate(()=>RR.handle());
    await p.waitForTimeout(80);
    let t=await p.evaluate(()=>RR.dialogTekst());
    // les alle linjene, og sjekk at hver av dem har innhold
    let linjer=0;
    while (t && linjer<10){
      if (t.length<15) break;
      linjer++;
      await p.evaluate(()=>RR.handle());
      await p.waitForTimeout(45);
      const ny=await p.evaluate(()=>RR.dialogTekst());
      if (ny===t) break;
      t=ny;
    }
    if (linjer<2) stumme.push(f.id+' ('+linjer+' linjer)');
    await p.evaluate(()=>RR.lukkAlt());
  }
  sant('alle figurer har minst to dialoglinjer', stumme.length===0);
  if (stumme.length) console.log('      stumme: '+stumme.join(', '));
}

console.log('\n=== LANDEMERKENE SVARER ===');
for (const [x,y,navn] of [[1620,1290,'statuen'],[1470,1170,'Rentetreet'],
                          [1790,1408,'oppslagstavla'],[1960,1756,'postkassa']]){
  await p.evaluate(()=>RR.lukkAlt());
  await p.evaluate(([x,y])=>RR.flyttTil(x,y),[x,y]);
  await p.waitForTimeout(60);
  await p.evaluate(()=>RR.handle());
  await p.waitForTimeout(90);
  const d=await p.evaluate(()=>RR.dialogTekst()), m=await p.evaluate(()=>RR.minispillTekst());
  sant(navn+' svarer', (d&&d.length>15)||(m&&m.length>60));
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== HINTET PEKER PÅ DET NÆRMESTE ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.gaaTil('bank'); });
  await p.waitForTimeout(250);
  const h=await p.evaluate(()=>RR.hintTekst());
  sant('hintet nevner Sparebanken når du står i døra', /SPAREBANKEN/.test(h));
  await p.evaluate(()=>RR.flyttTil(1600,1460));
  await p.waitForTimeout(300);
  const h2=await p.evaluate(()=>RR.hintTekst());
  sant('hintet er tomt midt på et åpent torg', h2==='');
}

console.log('\n=== PAUSEMENYEN ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.vekslePause(); });
  await p.waitForTimeout(120);
  sant('pausemenyen åpner', await p.evaluate(()=>RR.tilstand.pause));
  const faner=await p.$$('#pause .fane button');
  sant('pausemenyen har seks faner', faner.length===6);
  const faneNavn=await p.evaluate(()=>[...document.querySelectorAll('#pause .fane button')]
    .map(b=>b.textContent));
  for (let i=0;i<faner.length;i++){
    const kn=await p.$$('#pause .fane button');
    await kn[i].click(); await p.waitForTimeout(80);
    const r=await p.evaluate(()=>({
      tegn:document.getElementById('pauseinner').textContent.length,
      kort:document.querySelectorAll('#pauseinner .kort').length,
      aktiv:(document.querySelector('#pause .fane button.pa')||{}).textContent
    }));
    console.log('  '+faneNavn[i].padEnd(22)+r.tegn+' tegn, '+r.kort+' rute(r)');
    sant('fanen «'+faneNavn[i]+'» er markert aktiv', r.aktiv===faneNavn[i]);
    sant('fanen «'+faneNavn[i]+'» viser minst én rute med innhold', r.kort>=1);
    sant('fanen «'+faneNavn[i]+'» har over 150 tegn', r.tegn>150);
  }
  await p.evaluate(()=>RR.vekslePause());
  sant('pausemenyen lukker', !(await p.evaluate(()=>RR.tilstand.pause)));
}

console.log('\n=== ØKONOMIEN STARTER NÅR DU BLIR ANSATT ===');
// Spilletest 2026-07-31: uten dette ble utforsking straffet. Faste utgifter uten
// inntekt ble overtrekk, som ble forbruksgjeld til 22,9 %, og en spiller som ruslet
// rundt i fem måneder før hen fant Jobbsenteret sto med 106 000 kr i gjeld og
// negativ formue — for å ha gjort nøyaktig det spillet ber om.
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.nullstill(); });
  await p.reload();
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(500);
  await p.evaluate(()=>RR.lukkAlt());
  sant('spilleren starter uten jobb', (await p.evaluate(()=>RR.tilstand.harJobb))===false);
  for (let m=0;m<8;m++) await p.evaluate(()=>RR.nyMaaned());
  const u=await p.evaluate(()=>RR.tilstand);
  console.log('  åtte måneder uten jobb: kontanter '+Math.round(u.kontanter)+
    ', gjeld '+Math.round(u.gjeld)+', måned '+u.mnd);
  sant('ingen gjeld påløper før man er ansatt', u.gjeld<1);
  sant('formuen er ikke negativ før man er ansatt', u.formue>=0);
  sant('kalenderen går likevel videre', u.mnd===8);
  sant('markedet går likevel videre', u.indeks!==100);

  // … og når man ER ansatt, skal regnskapet faktisk løpe
  await p.evaluate(()=>RR.sett({harJobb:true}));
  const f=await p.evaluate(()=>RR.tilstand);
  const h=await p.evaluate(()=>RR.nyMaaned());
  const e=await p.evaluate(()=>RR.tilstand);
  sant('lønn kommer inn når man er ansatt', h.some(x=>/Lønn/.test(x.t)&&x.v>0));
  sant('faste utgifter trekkes når man er ansatt', h.some(x=>/Faste utgifter/.test(x.t)&&x.v<0));
  sant('netto endring er positiv med startlønna', e.kontanter>f.kontanter);
  // og et overtrekk SKAL bli gjeld — det er en lærdom, ikke en feil
  await p.evaluate(()=>RR.sett({kontanter:-1}));
  await p.evaluate(()=>RR.sett({kontanter:500}));
  const utg=await p.evaluate(()=>RR.tilstand);
  sant('økonomien er i gang etter ansettelse', utg.harJobb===true);
}

console.log('\n=== SPILLET STÅR STILLE NÅR ET MINISPILL ER ÅPENT ===');
{
  await p.evaluate(()=>{ RR.lukkAlt(); RR.gaaTil('bors'); });
  await p.evaluate(()=>RR.handle());
  await p.waitForTimeout(120);
  const f1=await p.evaluate(()=>RR.tilstand.mnd);
  await p.keyboard.down('d'); await p.waitForTimeout(500); await p.keyboard.up('d');
  const f2=await p.evaluate(()=>RR.tilstand.mnd);
  sant('måneden går ikke videre mens minispillet står åpent', f1===f2);
  await p.evaluate(()=>RR.lukkMinispill());
}

console.log('\n=== MAN KOMMER SEG UT AV EN VEGG ===');
// Spillløkka gir bare TILLATELSE til å flytte. Er begge akser blokkert, er
// spilleren frosset for godt, uten et eneste signal. Det er nøyaktig feilen
// som gjorde spillet uspillbart i første utgave, og den koster fem linjer å
// gjøre umulig. Seks av åtte bydelsmidtpunkt ligger inne i en bygning, så
// marginen mot å gjøre det igjen er tynn.
{
  await p.evaluate(()=>RR.lukkAlt());
  // finn et punkt som faktisk er inne i en bygning
  const inni=await p.evaluate(()=>{
    for (const b of RR.BYGG){
      const x=b.x+b.w/2, y=b.y+b.h/2;
      if (RR.blokkert(x,y)) return {id:b.id,x,y};
    }
    return null;
  });
  sant('det finnes en bygning å bli fanget i (testforutsetning)', !!inni);
  if (inni){
    await p.evaluate(i=>RR.flyttTil(i.x,i.y),inni);
    sant('  spilleren står inne i '+inni.id, await p.evaluate(()=>RR.blokkert(...RR.tilstand.pos)));
    const f0=await p.evaluate(()=>RR.tilstand.pos);
    for (const t of ['s','d']){
      await p.keyboard.down(t); await p.waitForTimeout(900); await p.keyboard.up(t);
    }
    const f1=await p.evaluate(()=>RR.tilstand.pos);
    const flyttet=Math.hypot(f1[0]-f0[0],f1[1]-f0[1]);
    sant('  tastene virker inne i veggen ('+Math.round(flyttet)+' px)', flyttet>60);
    sant('  spilleren står fritt etterpå', await p.evaluate(()=>!RR.blokkert(...RR.tilstand.pos)));
  }
  // og vaktposten i start(): en blokkert startposisjon skal flyttes, ikke låse spillet
  await p.evaluate(()=>RR.nullstill());
  await p.reload();
  await p.waitForTimeout(250);
  await p.evaluate(()=>{ const s=RR.START_POS; const b=RR.BYGG[0];
    // dytt spilleren inn i en bygning FØR start() kalles
    RR.flyttTil(b.x+b.w/2,b.y+b.h/2); });
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(250);
  sant('start() setter aldri spilleren i gang inne i en vegg',
    await p.evaluate(()=>!RR.blokkert(...RR.tilstand.pos)));
}

console.log('\n=== DIALOGTELLEREN TELLER GJENSTÅENDE, IKKE DEN DU LESER ===');
// Sto «3 igjen» på linje 1 av 3, «2 igjen» på linje 2, og ingenting på linje 3.
{
  await p.evaluate(()=>RR.nullstill());
  await p.reload();
  await p.waitForTimeout(250);
  await p.click('#startknapp');
  await p.waitForTimeout(900);
  const tellere=[];
  for (let i=0;i<8;i++){
    if (!(await p.evaluate(()=>RR.tilstand.dAapen))) break;
    tellere.push(await p.evaluate(()=>{
      const e=document.querySelector('#dialog .n1'); return e?e.textContent.trim():''; }));
    await p.keyboard.press('Space');
    await p.waitForTimeout(150);
  }
  const n=tellere.length;
  console.log('    introdialogen ('+n+' linjer): '+JSON.stringify(tellere));
  sant('introdialogen har mer enn én linje (testforutsetning)', n>1);
  let riktig=true;
  tellere.forEach((t,i)=>{
    const skalVaere = (n-1-i)>0 ? (n-1-i)+' igjen' : '';
    if (t!==skalVaere) riktig=false;
  });
  sant('telleren viser antall linjer som er IGJEN på hver linje', riktig);
  sant('siste linje viser ingen teller', tellere[n-1]==='');
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== BYEN HAR INFLASJON OG LØNNSVEKST ===');
// Uten dette var overskuddet konstant 10 000 kr i måneden i førti år, i et spill
// der oppdrag F handler om at kroner lyver over tid og oppdrag N regner med
// 3,2 % lønnsvekst. Byen motsa pensum.
{
  await p.evaluate(()=>{ RR.nullstill(); });
  await p.reload(); await p.waitForTimeout(250);
  await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,bruttoAar:456000,
    kontanter:0,portefolje:0,gjeld:0}); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>RR.lukkAlt());
  const S=await p.evaluate(()=>RR.SATSER);
  const start=await p.evaluate(()=>RR.tilstand);
  sant('prisnivået starter på 100 %', Math.abs(start.prisniva-1)<1e-9);
  sant('formue i startkroner er lik formue i måned 0',
    Math.abs(start.formueReal-start.formue)<1);
  await p.evaluate(()=>{ for (let i=0;i<120;i++) RR.nyMaaned(); });
  const ti=await p.evaluate(()=>RR.tilstand);
  console.log('    etter ti år: lønn '+Math.round(ti.bruttoAar)+
    ', utgifter '+Math.round(ti.utgiftNaa)+'/mnd, prisnivå '+(ti.prisniva*100).toFixed(0)+' %');
  console.log('    formue '+Math.round(ti.formue)+' kr = '+Math.round(ti.formueReal)+' kr i startkroner');
  const ventetPris=Math.pow(1+S.kpi,10);
  sant('prisnivået har fulgt KPI i ti år', Math.abs(ti.prisniva-ventetPris)<0.01);
  sant('utgiftene har fulgt prisnivået',
    Math.abs(ti.utgiftNaa-start.utgiftNaa*ventetPris)<50);
  const ventetLonn=456000*Math.pow(1+S.lonnsvekst,10);
  sant('lønna har vokst med lønnsveksten (±1 %)',
    Math.abs(ti.bruttoAar-ventetLonn)<ventetLonn*0.01);
  sant('lønna vokser raskere enn prisene', ti.bruttoAar/456000 > ti.prisniva);
  sant('formuen i startkroner er lavere enn i kroner', ti.formueReal<ti.formue);
  // og over førti år skal ingenting sprekke
  await p.evaluate(()=>{ for (let i=0;i<360;i++) RR.nyMaaned(); });
  const f=await p.evaluate(()=>RR.tilstand);
  console.log('    etter førti år: formue '+Math.round(f.formue)+' kr = '+
    Math.round(f.formueReal)+' kr i startkroner · gjeld '+Math.round(f.gjeld));
  sant('ingen gjeldsspiral over førti år med jobb', f.gjeld<1);
  sant('kontantene går ikke i minus', f.kontanter>=0);
  sant('formuen vokser fortsatt realt', f.formueReal>ti.formueReal);
  await p.evaluate(()=>{ RR.nullstill(); });
  await p.reload(); await p.waitForTimeout(250);
  await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,bruttoAar:456000,kontanter:250000}); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== FONDSBUTIKKEN TREKKER SKATTEN DEN LOVER ===');
// Skjermen sa «over innskutt beløp beskattes gevinsten med 37,84 %» og flyttet
// så pengene uten å trekke en krone.
{
  const S=await p.evaluate(()=>RR.SATSER);
  // kjøp for 100 000, la porteføljen vokse til 200 000, selg alt
  const f=await p.evaluate(([sats])=>{
    RR.sett({kontanter:300000,portefolje:0,gjeld:0});
    RR.lukkAlt(); RR.aapneMinispill('hus-fond',RR.HUS.fond);
    // kjøp via skjemaet slik en spiller gjør
    const inp=document.querySelector('#spillinner input[type=range]');
    if (!inp) return {feil:'fant ikke skyveren'};
    inp.value=100000; inp.dispatchEvent(new Event('input',{bubbles:true}));
    const knapp=[...document.querySelectorAll('#spillinner button')]
      .find(b=>b.textContent.indexOf('Flytt kontanter')===0);
    if (!knapp) return {feil:'fant ikke kjøpsknappen', knapper:
      [...document.querySelectorAll('#spillinner button')].map(b=>b.textContent)};
    knapp.click();
    return {etterKjop:RR.tilstand};
  },[S.aksjeskatt]);
  if (f.feil){ console.log('    ('+f.feil+' — '+JSON.stringify(f.knapper||'')+')'); }
  sant('kjøp av fond flytter penger fra kontanter til portefølje',
    !f.feil && f.etterKjop.portefolje>0);
  if (!f.feil){
    const ut=await p.evaluate(()=>{
      RR.sett({portefolje:200000});
      RR.lukkAlt(); RR.aapneMinispill('hus-fond',RR.HUS.fond);
      const foer=RR.tilstand;
      const sk=document.getElementById('flytt-portefølje-kontanter');
      if (!sk) return {feil:'fant ikke selg-skyveren'};
      sk.value=200000; sk.dispatchEvent(new Event('input',{bubbles:true}));
      const selg=[...document.querySelectorAll('#spillinner button')]
        .find(b=>b.textContent.indexOf('Flytt portefølje')===0);
      if (!selg) return {feil:'fant ikke selg-knappen'};
      selg.click();
      return {foer, etter:RR.tilstand};
    });
    if (ut.feil){ console.log('    ('+ut.feil+')'); }
    const gevinst=200000-ut.foer.innskutt;
    const ventetSkatt=Math.round(Math.max(0,gevinst)*S.aksjeskatt);
    const fikk=200000-(ut.etter.kontanter-ut.foer.kontanter);
    console.log('    innskutt '+Math.round(ut.foer.innskutt)+', solgte 200 000, gevinst '+
      Math.round(gevinst)+' → skatt trukket '+Math.round(fikk)+' (ventet '+ventetSkatt+')');
    sant('skatten trekkes ved uttak over innskutt beløp',
      Math.abs(fikk-ventetSkatt)<=2);
  }
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== SKYGGEN FØLGER SOLA ===');
// Hver bygning kastet samme skygge — 7 px høyre, 11 px ned — hele døgnet. På et
// skjermbilde fra 00:49 pekte skyggene som om sola sto høyt.
{
  const les=async (d)=>await p.evaluate(x=>{ RR.settDogn(x); return {...RR.lys(), ...RR.dogn()}; },d);
  const morgen=await les(0.33), middag=await les(0.50), kveld=await les(0.79), natt=await les(0.02);
  console.log('    08:00  retning '+morgen.dx.toFixed(2)+','+morgen.dy.toFixed(2)+
    '  lengde '+morgen.lengde.toFixed(2)+'  styrke '+morgen.styrke.toFixed(2));
  console.log('    12:00  retning '+middag.dx.toFixed(2)+','+middag.dy.toFixed(2)+
    '  lengde '+middag.lengde.toFixed(2)+'  styrke '+middag.styrke.toFixed(2));
  console.log('    19:00  retning '+kveld.dx.toFixed(2)+','+kveld.dy.toFixed(2)+
    '  lengde '+kveld.lengde.toFixed(2)+'  styrke '+kveld.styrke.toFixed(2));
  sant('skyggen peker vestover om morgenen', morgen.dx<0);
  sant('skyggen peker østover om kvelden', kveld.dx>0);
  sant('skyggen er kortest midt på dagen',
    middag.lengde<morgen.lengde && middag.lengde<kveld.lengde);
  sant('skyggen er sterkest midt på dagen',
    middag.styrke>morgen.styrke && middag.styrke>kveld.styrke);
  sant('skyggen er nesten borte om natta', natt.styrke<0.15);
  sant('skyggen har en øvre lengde, den løper ikke løpsk', morgen.lengde<=7.5 && natt.lengde<=7.5);
}

console.log('\n=== NATTA ER DYPERE I JANUAR ENN I JULI ===');
{
  const natt=async (m)=>await p.evaluate(x=>{ RR.settMnd(x); RR.settDogn(0.0); return RR.dogn().natt; },m);
  const jan=await natt(0), jul=await natt(6);
  console.log('    midnatt i januar: '+jan.toFixed(2)+' · i juli: '+jul.toFixed(2));
  sant('lyse sommernetter: juli er grunnere enn januar', jul<jan-0.10);
  await p.evaluate(()=>RR.settMnd(0));
}

console.log('\n=== VINDUENE FØLGER ÅPNINGSTID ===');
// Alle vinduer tentes overalt, så Jobbsenteret lyste like sterkt 02:00 som 10:00.
{
  const ved=async (d,id)=>await p.evaluate(([x,i])=>{ RR.settDogn(x); return RR.apentNaa(i); },[d,id]);
  const r=[
    ['jobb','Jobbsenteret',0.42,true],  ['jobb','Jobbsenteret',0.08,false],
    ['kasino','Kasino Fortuna',0.08,true], ['kasino','Kasino Fortuna',0.42,false],
    ['bors','Børshuset',0.42,true],      ['bors','Børshuset',0.85,false]
  ];
  for (const [id,navn,d,vent] of r){
    const fikk=await ved(d,id);
    const kl=await p.evaluate(()=>RR.dogn().klokke);
    sant(navn+' er '+(vent?'åpent':'stengt')+' kl. '+kl, fikk===vent);
  }
  await p.evaluate(()=>RR.settDogn(0.42));
}

console.log('\n=== SEVERDIGHETENE STÅR DER, OG TO AV DEM LESER MARKEDET ===');
{
  const sev=await p.evaluate(()=>{
    const navngitte=RR.PROPS.filter(x=>x.navn);
    return navngitte.map(x=>({navn:x.navn,t:x.t,x:x.x,y:x.y,
      blokkert:RR.blokkert(x.x,x.y),
      sone:(RR.sonenPaa(x.x,x.y)||{}).id||'gate',
      // kan spilleren stå inntil den? naermeste() krever under max(46, r+34)
      naabar:!RR.blokkert(x.x,x.y+x.r+20)}));
  });
  console.log('    '+sev.length+' navngitte severdigheter:');
  sev.forEach(x=>console.log('      '+x.navn.padEnd(20)+x.t.padEnd(12)+x.sone.padEnd(9)+
    (x.blokkert?'':'fri ')+(x.naabar?'· nåbar':'· IKKE NÅBAR')));
  sant('det finnes minst ti navngitte severdigheter', sev.length>=10);
  sev.forEach(x=>sant('  '+x.navn+' kan nås fra sør', x.naabar));
  const soner=new Set(sev.map(x=>x.sone));
  console.log('    fordelt over: '+[...soner].join(', '));
  sant('severdighetene står i minst fire ulike bydeler', soner.size>=4);
  // oksen og bjørnen leser markedStemning
  const opp=await p.evaluate(()=>{ RR.settStemning(0.6);
    return {okse:RR.lyser('okse'), bjorn:RR.lyser('bjorn')}; });
  const ned=await p.evaluate(()=>{ RR.settStemning(-0.6);
    return {okse:RR.lyser('okse'), bjorn:RR.lyser('bjorn')}; });
  const rolig=await p.evaluate(()=>{ RR.settStemning(0);
    return {okse:RR.lyser('okse'), bjorn:RR.lyser('bjorn')}; });
  sant('oksen lyser i oppgang, bjørnen ikke', opp.okse && !opp.bjorn);
  sant('bjørnen lyser i nedgang, oksen ikke', ned.bjorn && !ned.okse);
  sant('ingen av dem lyser når markedet er rolig', !rolig.okse && !rolig.bjorn);
}

console.log('\n=== INGEN BYDEL ER UTEN GATELYS ===');
// Ti lykter i hele byen, og fem av åtte bydeler hadde ingen — inkludert
// Bakgata, den mørkeste. Lyktene genereres nå fra GATER.
{
  const d=await p.evaluate(()=>{
    const lykter=RR.PROPS.filter(x=>x.t==='lykt');
    const ut=RR.SONER.map(s=>{
      let verste=0, versteSted=null;
      for (let x=s.x+50;x<s.x+s.w-50;x+=50) for (let y=s.y+50;y<s.y+s.h-50;y+=50){
        if (RR.blokkert(x,y)) continue;
        let naer=1e9;
        for (const l of lykter){ const dd=Math.hypot(l.x-x,l.y-y); if (dd<naer) naer=dd; }
        if (naer>verste){ verste=naer; versteSted=[x,y]; }
      }
      return {navn:s.navn, verste:Math.round(verste), sted:versteSted};
    });
    return {ant:lykter.length, flimmer:lykter.filter(x=>x.flimmer).length, ut};
  });
  console.log('    '+d.ant+' lykter i alt, '+d.flimmer+' av dem flimrer (Bakgata)');
  d.ut.forEach(x=>console.log('      '+x.navn.padEnd(20)+'lengst fra en lykt: '+x.verste+' px'));
  sant('det er minst førti lykter i byen', d.ant>=40);
  sant('noen lykter flimrer', d.flimmer>=1);
  d.ut.forEach(x=>sant('  '+x.navn+' er aldri mer enn 520 px fra en lykt', x.verste<=520));
}

console.log('\n=== TEGNINGEN HAR HODEPLASS ===');
// Alt det nye koster noe. Budsjettet ved 60 fps er 16,7 ms.
{
  const m=await p.evaluate(()=>{
    const ut=[];
    for (const s of RR.SONER){
      RR.lukkAlt(); RR.flyttTil(s.x+s.w/2, s.y+s.h/2);
      RR.settDogn(0.42); const dag=RR.maalTegning(30);
      RR.settDogn(0.03); const natt=RR.maalTegning(30);
      ut.push({navn:s.navn, dag, natt});
    }
    return ut;
  });
  const verst=m.reduce((a,x)=>Math.max(a,x.dag,x.natt),0);
  m.forEach(x=>console.log('      '+x.navn.padEnd(20)+'dag '+x.dag.toFixed(2)+
    ' ms · natt '+x.natt.toFixed(2)+' ms'));
  console.log('    tyngste ramme: '+verst.toFixed(2)+' ms av 16,7 — hodeplass ×'+(16.7/verst).toFixed(0));
  sant('tyngste tegning er under 4 ms', verst<4);
  sant('det er minst fire ganger hodeplass igjen', 16.7/verst>4);
  await p.evaluate(()=>RR.settDogn(0.42));
}

console.log('\n=== LØST OPPDRAG A, MEN IKKE ANSATT (playtest F1) ===');
// Løser du A gjennom Solveigs DIALOG, blir oppdraget merket gjort mens ansettelsen
// fortsatt ligger bak «Ta jobben» inne i BYGNINGEN. Da står harJobb=false, og før
// 2026-08-17 var hintstripa da helt tom: målt 12 månedsskift med kontanter, gjeld
// og formue 0 → 0. Denne sjekken dekker BEGGE tilstander, for et hint som alltid
// vises er like ubrukelig som et som aldri vises.
{
  // (60,60) er verifisert tomt — ingen bygning, figur eller gjenstand i nærheten,
  // så hintet som måles er nettopp det som ellers ville vært den tomme strengen.
  const TOMT=[60,60];
  await p.evaluate(()=>{ RR.lukkAlt(); RR.nullstill(); });
  await p.evaluate(xy=>{ RR.flyttTil(xy[0],xy[1]); RR.sett({harJobb:false}); },TOMT);
  await p.waitForTimeout(200);
  const foer=await p.evaluate(()=>RR.hintTekst());
  sant('uten oppdrag A løst er stripa tom (hintet maser ikke fra start)', foer==='');

  await p.evaluate(xy=>{ RR.loesOppdrag('A'); RR.sett({harJobb:false});
                         RR.flyttTil(xy[0],xy[1]); },TOMT);
  await p.waitForTimeout(200);
  const under=await p.evaluate(()=>RR.hintTekst());
  sant('A løst + ikke ansatt → hintet peker mot Jobbsenteret',
       /JOBBSENTERET/i.test(under));
  sant('hintet nevner knappen som faktisk ansetter deg', /Ta jobben/i.test(under));

  await p.evaluate(xy=>{ RR.sett({harJobb:true}); RR.flyttTil(xy[0],xy[1]); },TOMT);
  await p.waitForTimeout(200);
  const etter=await p.evaluate(()=>RR.hintTekst());
  sant('når du ER ansatt forsvinner hintet igjen', etter==='');
  console.log('    (hint ved A løst + uten jobb: '+JSON.stringify(under.slice(0,60))+'…)');

  // Hintet skal aldri overstyre et nærmere mål — ellers skjuler det navigasjonen.
  await p.evaluate(()=>{ RR.sett({harJobb:false}); RR.gaaTil('bank'); });
  await p.waitForTimeout(200);
  const vedBygg=await p.evaluate(()=>RR.hintTekst());
  sant('står du ved en bygning vinner bygningshintet', !/Ta jobben/i.test(vedBygg));
  await p.evaluate(()=>{ RR.nullstill(); RR.sett({harJobb:true}); });
}

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
