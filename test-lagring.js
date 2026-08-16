// test-lagring.js — tåler spillet en ødelagt lagring, og husker det som skal huskes?
// Cars-lærdommen bak denne: en ødelagt nøkkel tok ned hele pausemenyen, og
// «nullstill» slettet lagringen men ikke tilstanden i minnet — som skrev seg
// selv tilbake ti sekunder senere.
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }
const NØKLER=['rr-kontant','rr-buffer','rr-portfolio','rr-gjeld','rr-innskutt','rr-xp',
  'rr-gjort','rr-kort','rr-kronikk','rr-livsstil','rr-stat','rr-mnd','rr-besokt',
  'rr-lonn','rr-jobb','rr-indeks','rr-indekshist','rr-vol','rr-mute','rr-bsu','rr-ips'];

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1200,height:800}});
let sideFeil=[];
p.on('pageerror',e=>sideFeil.push(e.message));
await p.goto(process.env.RR_URL||('file://'+__dirname+'/index.html'));

console.log('\n=== FREMGANG OVERLEVER OMLASTING ===');
await p.evaluate(()=>RR.nullstill());
await p.reload();
await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,kontanter:123456,buffer:60000,
  portefolje:400000,innskutt:300000,gjeld:25000}); RR.loesOppdrag('A'); RR.loesOppdrag('B'); });
await p.waitForTimeout(300);
// tving en lagring ved å la spillet gå litt
await p.waitForTimeout(7000);
const f1=await p.evaluate(()=>RR.tilstand);
await p.reload();
await p.evaluate(()=>RR.start());
await p.waitForTimeout(400);
const f2=await p.evaluate(()=>RR.tilstand);
sant('kontanter huskes', Math.round(f2.kontanter)===Math.round(f1.kontanter));
sant('buffer huskes', f2.buffer===f1.buffer);
sant('portefølje huskes', Math.round(f2.portefolje)===Math.round(f1.portefolje));
sant('gjeld huskes', Math.round(f2.gjeld)===Math.round(f1.gjeld));
sant('løste oppdrag huskes', f2.gjort.length===f1.gjort.length && f2.gjort.includes('A'));
sant('XP huskes', f2.xp===f1.xp);
sant('at du har jobb huskes', f2.harJobb===true);
sant('markedsindeksen huskes', Math.abs(f2.indeks-f1.indeks)<1e-6);

console.log('\n=== ØDELAGT LAGRING TAR IKKE NED SPILLET ===');
// Hver nøkkel settes til noe som IKKE er den typen spillet forventer, én om
// gangen, og spillet skal fortsatt starte, tegne og åpne pausemenyen.
const SØPPEL=['"tekst"','42','null','true','[]','{}','[1,2,3]','{"a":1}',
  '"[unclosed"','[null,null]','["a","b"]','1e999','-1','[{"x":1}]'];
for (const n of NØKLER){
  for (const verdi of SØPPEL){
    sideFeil=[];
    await p.evaluate(([n,v])=>{
      RR.nullstill();
      try{ localStorage.setItem(n,v); }catch(e){}
    },[n,verdi]);
    await p.reload();
    const startet=await p.evaluate(()=>{
      try{ RR.start(); return true; }catch(e){ return 'FEIL: '+e.message; }
    });
    await p.waitForTimeout(90);
    const meny=await p.evaluate(()=>{
      try{ RR.vekslePause(); const t=document.getElementById('pauseinner').textContent.length;
        RR.lukkAlt(); return t; }catch(e){ return 'FEIL: '+e.message; }
    });
    const alleFaner=await p.evaluate(()=>{
      try{ RR.vekslePause();
        const kn=[...document.querySelectorAll('#pause .fane button')];
        kn.forEach(k=>k.click());
        RR.lukkAlt(); return kn.length;
      }catch(e){ return 'FEIL: '+e.message; }
    });
    const bra = startet===true && typeof meny==='number' && meny>150 && alleFaner===6
                && sideFeil.length===0;
    if (!bra){
      feil++;
      console.log('  ✗ '+n+' = '+verdi+'  → start:'+startet+' meny:'+meny+
        ' faner:'+alleFaner+(sideFeil.length?' feil:'+sideFeil[0]:''));
    } else ok++;
  }
}
console.log('  testet '+NØKLER.length+' nøkler × '+SØPPEL.length+' søppelverdier = '+
  (NØKLER.length*SØPPEL.length)+' kombinasjoner');

console.log('\n=== NULLSTILL RYDDER BÅDE LAGRING OG MINNE ===');
await p.evaluate(()=>RR.nullstill());
await p.reload();
await p.evaluate(()=>{ RR.start(); RR.sett({kontanter:999999,xp:5000,harJobb:true});
  RR.loesAlle(); RR.taAlleKort(); });
await p.waitForTimeout(300);
sant('alt er løst før nullstilling', (await p.evaluate(()=>RR.tilstand.gjort)).length===14);
// nullstill via pausemenyen, slik en spiller ville gjort det
await p.evaluate(()=>{
  RR.lukkAlt(); RR.vekslePause();
  [...document.querySelectorAll('#pause .fane button')].find(b=>/Lyd/.test(b.textContent)).click();
});
await p.waitForTimeout(120);
await p.evaluate(()=>[...document.querySelectorAll('#pauseinner button')]
  .find(b=>/Nullstill all fremgang/.test(b.textContent)).click());
await p.waitForTimeout(200);
const e1=await p.evaluate(()=>RR.tilstand);
sant('oppdrag nullstilt i minnet', e1.gjort.length===0);
sant('kort nullstilt i minnet', e1.kort.length===0);
sant('XP nullstilt i minnet', e1.xp===0);
sant('kontanter nullstilt i minnet', e1.kontanter===0);
sant('jobben er borte', e1.harJobb===false);
sant('markedet er tilbake på 100', Math.abs(e1.indeks-100)<1e-9);
// dette er kjernen: la spillet gå lenger enn lagringsintervallet, og se at
// den gamle tilstanden IKKE skriver seg tilbake
await p.waitForTimeout(8000);
const lagret=await p.evaluate(()=>({xp:localStorage.getItem('rr-xp'),
  gjort:localStorage.getItem('rr-gjort'),kontant:localStorage.getItem('rr-kontant')}));
sant('lagringen skriver ikke den gamle tilstanden tilbake etterpå',
  (lagret.xp===null||+lagret.xp===0) &&
  (lagret.gjort===null||lagret.gjort==='[]') &&
  (lagret.kontant===null||+lagret.kontant===0));
await p.reload();
await p.evaluate(()=>RR.start());
await p.waitForTimeout(300);
const e2=await p.evaluate(()=>RR.tilstand);
sant('etter omlasting er alt fortsatt nullstilt',
  e2.gjort.length===0 && e2.xp===0 && e2.kontanter===0);

console.log('\n=== LAGRING SKJER PÅ TIMER, IKKE I LØKKA ===');
{
  await p.evaluate(()=>{ RR.nullstill(); });
  await p.reload();
  await p.evaluate(()=>{
    RR.start();
    window.__skriv=0;
    const ekte=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){ if (String(k).indexOf('rr-')===0) window.__skriv++;
      return ekte.call(this,k,v); };
  });
  await p.waitForTimeout(6500);
  const n=await p.evaluate(()=>window.__skriv);
  const rammer=await p.evaluate(()=>Math.round(RR.tilstand.spilltid*60));
  console.log('  '+n+' skrivinger på ca. '+rammer+' rammer');
  sant('under 120 skrivinger på seks sekunder (ikke én per ramme)', n<120);
  sant('men noe blir faktisk lagret', n>0);
}

console.log('\n=== LYDINNSTILLINGER HUSKES ===');
await p.evaluate(()=>{ RR.lukkAlt(); RR.vekslePause();
  [...document.querySelectorAll('#pause .fane button')].find(b=>/Lyd/.test(b.textContent)).click(); });
await p.waitForTimeout(100);
await p.evaluate(()=>{ const s=document.getElementById('vol');
  s.value='0.25'; s.dispatchEvent(new Event('input',{bubbles:true})); });
await p.evaluate(()=>[...document.querySelectorAll('#pauseinner button')]
  .find(b=>/Slå lyden av/.test(b.textContent)).click());
await p.waitForTimeout(150);
const lyd=await p.evaluate(()=>({v:localStorage.getItem('rr-vol'),m:localStorage.getItem('rr-mute')}));
sant('volum lagres', Math.abs(+lyd.v-0.25)<1e-9);
sant('demping lagres', lyd.m==='true');
await p.reload();
await p.evaluate(()=>RR.start());
await p.waitForTimeout(200);
sant('lyden er fortsatt dempet etter omlasting',
  await p.evaluate(()=>localStorage.getItem('rr-mute')==='true'));

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
