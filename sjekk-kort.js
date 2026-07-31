// sjekk-kort.js — er alle førti kunnskapskortene fysisk mulige å plukke opp?
// Et kort inni en vegg er verre enn et kort som ikke finnes: spilleren leter
// etter noe som ikke kan tas. Derfor måles hvert kort, ikke bare ses over.
const {chromium}=require('playwright');
let feil=0, ok=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await b.newPage();
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR '+e.message); feil++; });
await p.goto('file://'+__dirname+'/index.html');

const kort=await p.evaluate(()=>RR.KORT);
const soner=await p.evaluate(()=>RR.SONER);
console.log('\n=== '+kort.length+' KUNNSKAPSKORT ===');
sant('det er førti kort', kort.length===40);
sant('kortnumrene er unike', new Set(kort.map(k=>k.n)).size===kort.length);
sant('numrene går fra 1 til 40', Math.min(...kort.map(k=>k.n))===1 && Math.max(...kort.map(k=>k.n))===40);
sant('alle kort har tittel og tekst', kort.every(k=>k.t&&k.s&&k.t.length>4&&k.s.length>30));

// 1) ligger kortet i et blokkert punkt?
const iVegg=[];
for (const k of kort){
  const b1=await p.evaluate(([x,y])=>RR.blokkert(x,y,14),[k.x,k.y]);
  if (b1) iVegg.push(k.n);
}
sant('ingen kort ligger inni en vegg eller rekvisitt', iVegg.length===0);
if (iVegg.length) console.log('      kort i vegg: '+iVegg.join(', '));

// 2) plukkeradiusen er 26 — finnes det et fritt punkt innenfor den?
const utenAdkomst=[];
for (const k of kort){
  let fri=false;
  for (let a=0;a<16 && !fri;a++){
    for (let r=0;r<=24 && !fri;r+=6){
      const x=k.x+Math.cos(a/16*Math.PI*2)*r, y=k.y+Math.sin(a/16*Math.PI*2)*r;
      if (!(await p.evaluate(([x,y])=>RR.blokkert(x,y,14),[x,y]))) fri=true;
    }
  }
  if (!fri) utenAdkomst.push(k.n);
}
sant('alle kort har et fritt punkt innenfor plukkeradiusen', utenAdkomst.length===0);
if (utenAdkomst.length) console.log('      uten adkomst: '+utenAdkomst.join(', '));

// 3) kortet skal ligge inne på kartet med margin
const utenfor=kort.filter(k=>k.x<150||k.y<150||k.x>3050||k.y>2250).map(k=>k.n);
sant('ingen kort ligger utenfor kartet', utenfor.length===0);
if (utenfor.length) console.log('      utenfor: '+utenfor.join(', '));

// 4) spredning: hver bydel skal ha kort
console.log('\n=== SPREDNING PER BYDEL ===');
for (const s of soner){
  const n=kort.filter(k=>k.x>=s.x&&k.x<=s.x+s.w&&k.y>=s.y&&k.y<=s.y+s.h).length;
  console.log('  '+s.navn.padEnd(18)+n+' kort');
  sant(s.navn+' har minst tre kort', n>=3);
}
const iSone=kort.filter(k=>soner.some(s=>k.x>=s.x&&k.x<=s.x+s.w&&k.y>=s.y&&k.y<=s.y+s.h)).length;
console.log('  til sammen i en bydel: '+iSone+' av '+kort.length);
sant('minst 34 av 40 kort ligger inne i en bydel (resten på gata)', iSone>=34);

// 5) kortene skal faktisk kunne plukkes opp i praksis — gå dit og sjekk
console.log('\n=== PLUKK ALLE FØRTI I PRAKSIS ===');
await p.evaluate(()=>{ RR.nullstill(); });
await p.reload();
await p.evaluate(()=>RR.start());
for (const k of kort){
  await p.evaluate(([x,y])=>RR.flyttTil(x,y),[k.x,k.y]);
  await p.waitForTimeout(34);
}
await p.waitForTimeout(300);
const tatt=await p.evaluate(()=>RR.tilstand.kort.length);
console.log('  plukket opp: '+tatt+' av '+kort.length);
sant('alle førti kortene ble plukket opp ved å gå til dem', tatt===kort.length);

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
