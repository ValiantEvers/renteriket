// test-verden.js — går byen faktisk an å bo i?
// Sjekker bevegelse, kollisjon, at hver dør svarer på noe, at hver figur
// er tilgjengelig, og at alle åtte bydelene kan nås til fots fra Startgata.
const {chromium}=require('playwright');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:820}});
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR '+e.message); feil++; });
await p.goto('file://'+__dirname+'/index.html');
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
    const start=[Math.round(470/R),Math.round(2020/R)];
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

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
