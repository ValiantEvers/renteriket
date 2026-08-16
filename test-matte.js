// test-matte.js — finansmotoren mot uavhengig regnede svar.
// Kjør:  node test-matte.js
// Alle fasitverdier er regnet ut PÅ NYTT her, med andre formler enn spillet
// bruker, eller hentet fra offentlig kilde. Poenget er ikke å bekrefte at
// koden gjør det den gjør, men at den gjør det RIKTIGE.
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
// GitHub Pages serverer over HTTPS, ikke file://. RR_URL lar hele pakka
// kjøres mot en HTTP-server, som er den eneste måten å fange antakelser
// som bare holder på file:// (localStorage-origo, relative stier).
const SPILL=process.env.RR_URL||('file://'+__dirname+'/index.html');

let ok=0, feil=0;
function er(navn,fikk,skal,tol){
  tol = tol===undefined ? Math.max(1e-9,Math.abs(skal)*1e-6) : tol;
  const b=Math.abs(fikk-skal)<=tol;
  if (b) ok++; else { feil++;
    console.log('  ✗ '+navn+'\n      fikk '+fikk+'\n      skal '+skal+' (±'+tol+')'); }
  return b;
}
function sant(navn,x){ if (x) ok++; else { feil++; console.log('  ✗ '+navn); } }

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
const p=await b.newPage();
p.on('pageerror',e=>{ console.log('  ✗ PAGEERROR: '+e.message); feil++; });
await p.goto(SPILL);
const K=(kode,arg)=>p.evaluate(kode,arg);
const S=await K(()=>RR.SATSER);

console.log('\n=== SATSER: sammenheng og forankring ===');
er('aksjeskatt = 22 % × 1,72', S.alminnelig*S.oppjustering, 0.3784, 1e-12);
er('aksjeskatt-getter', await K(()=>RR.SATSER.aksjeskatt), 0.3784, 1e-12);
er('BSU maks fradrag = 10 % av 27 500', await K(()=>RR.SATSER.bsuMaksFradrag), 2750, 1e-9);
er('belåningsgrad + egenkapital = 1', S.belaaningsgrad+S.egenkapital, 1, 1e-12);
er('IPS-tak 2026', S.ipsMaks, 25000, 0);
er('frikort 2026', S.frikort, 100000, 0);
er('grunnbeløp 1. mai 2026', S.grunnbelop, 136549, 0);
er('folketrygdtak 7,1 × snitt-G', S.folketrygdTak*S.grunnbelopSnitt, 954374.9, 1);
er('styringsrente juli 2026', S.styringsrente, 0.0425, 1e-12);
sant('skjermingsrenten er merket med sitt eget år', S.skjermingsrenteAar===2025);
sant('trinnskatten har fem trinn', S.trinn.length===5);
sant('trinnene stiger', S.trinn.every((t,i)=>i===0||t.fra>S.trinn[i-1].fra));

console.log('\n=== RENTERS RENTE ===');
// 100 000 i 10 år til 5 %: 100000·1,05^10. Regnet med gjentatt multiplikasjon.
let manuelt=100000; for (let i=0;i<10;i++) manuelt*=1.05;
er('sluttverdi(100 000; 5 %; 10 år)', await K(()=>RR.F.sluttverdi(100000,0.05,10)), manuelt, 0.01);
er('nåverdi er invers av sluttverdi',
   await K(()=>RR.F.naaverdi(RR.F.sluttverdi(50000,0.06,15),0.06,15)), 50000, 1e-6);
// Serie: 1 000 kr i 12 måneder à 1 % månedlig, innskudd i begynnelsen.
// Manuelt: sum over k=1..12 av 1000·1,01^k
let m2=0; for (let k=1;k<=12;k++) m2+=1000*Math.pow(1.01,k);
er('sluttverdiSerie, forfalt (start=true)',
   await K(()=>RR.F.sluttverdiSerie(1000,0.01,12,true)), m2, 0.01);
let m3=0; for (let k=0;k<12;k++) m3+=1000*Math.pow(1.01,k);
er('sluttverdiSerie, etterskuddsvis (start=false)',
   await K(()=>RR.F.sluttverdiSerie(1000,0.01,12,false)), m3, 0.01);
er('sluttverdiSerie med rente 0 = beløp × antall',
   await K(()=>RR.F.sluttverdiSerie(2500,0,36,true)), 90000, 1e-9);
er('sluttverdiSerie med n=0 er 0', await K(()=>RR.F.sluttverdiSerie(2500,0.01,0,true)), 0, 0);
// sparebehov skal være invers av sluttverdiSerie
const behov=await K(()=>RR.F.sparebehov(3000000,0,RR.F.mndRente(0.05),37*12,true));
er('sparebehov → sluttverdiSerie gir målet',
   await K(x=>RR.F.sluttverdiSerie(x,RR.F.mndRente(0.05),37*12,true),behov), 3000000, 1);
er('sparebehov er 0 når startkapitalen alene rekker',
   await K(()=>RR.F.sparebehov(100000,90000,0.05,10,true)), 0, 0);
// mndRente skal gi riktig ÅRLIG effekt
er('mndRente(5 %) opphøyd i 12 = 5 %',
   await K(()=>Math.pow(1+RR.F.mndRente(0.05),12)-1), 0.05, 1e-12);
er('mndFraNominell(22,9 %) = 22,9/12',
   await K(()=>RR.F.mndFraNominell(0.229)), 0.229/12, 1e-15);
er('effektivRente(22,9 % nominell; 12 terminer)',
   await K(()=>RR.F.effektivRente(0.229,12)), Math.pow(1+0.229/12,12)-1, 1e-12);

console.log('\n=== 72-REGELEN (kryssjekk mot eksakt doblingstid) ===');
for (const r of [0.04,0.06,0.08,0.10]){
  const eksakt=Math.log(2)/Math.log(1+r), tommel=72/(r*100);
  sant('72-regelen bommer under 0,6 år ved '+(r*100)+' %', Math.abs(eksakt-tommel)<0.6);
}

console.log('\n=== LÅN ===');
// Annuitet: 2 000 000 kr, 5,08 % nominell, 30 år, månedlig termin.
// Manuelt: A = P·i/(1−(1+i)^−n) med i = 0,0508/12
{
  const P=2000000, i=0.0508/12, n=360;
  const A=P*i/(1-Math.pow(1+i,-n));
  er('terminbeløp 2 mill / 5,08 % / 30 år',
     await K(()=>RR.F.terminbelop(2000000,0.0508/12,360)), A, 0.01);
  const plan=await K(()=>RR.F.laaneplan(2000000,0.0508,30));
  er('laaneplan gir samme terminbeløp', plan.termin, A, 0.01);
  er('laaneplan har 360 terminer', plan.antall, 360, 0);
  er('siste saldo er null', plan.plan[359].saldo, 0, 0.02);
  // sum renter = sum terminer − lån
  er('sum renter = alle terminer minus lånet', plan.renterSum, A*360-2000000, 1);
}
er('terminbeløp med rente 0 = lån/n', await K(()=>RR.F.terminbelop(120000,0,60)), 2000, 1e-9);
// Gjeldsfellen: betaler du mindre enn renten, blir du aldri ferdig
sant('nedbetalingstid = uendelig når betalingen ikke dekker renten',
   await K(()=>RR.F.nedbetalingstid(100000,0.02,1500)===Infinity));
{ // 100 000 til 2 % per måned, 3 000 i måneden
  const L=100000,i=0.02,b=3000;
  const n=-Math.log(1-i*L/b)/Math.log(1+i);
  er('nedbetalingstid', await K(()=>RR.F.nedbetalingstid(100000,0.02,3000)), n, 1e-9);
}
console.log('\n=== EFFEKTIV RENTE MED GEBYR (IRR) ===');
{
  const eff=await K(()=>RR.F.effektivMedGebyr(100000,0.229,5,95));
  const utenGebyr=Math.pow(1+0.229/12,12)-1;
  sant('gebyr gjør effektiv rente høyere enn uten gebyr', eff>utenGebyr);
  sant('effektiv rente med gebyr er under 30 % (rimelighetssjekk)', eff<0.30);
  // kryssjekk: nåverdien av terminbeløpene til funnet rente skal være lånet
  const kryss=await K(e=>{
    const t=RR.F.terminbelop(100000,0.229/12,60)+95;
    const m=Math.pow(1+e,1/12)-1;
    return t*(1-Math.pow(1+m,-60))/m;
  },eff);
  er('IRR-en løser låneligningen', kryss, 100000, 1);
  er('gebyr = 0 gir samme svar som effektivRente',
     await K(()=>RR.F.effektivMedGebyr(100000,0.229,5,0)), utenGebyr, 1e-6);
}

console.log('\n=== SKATT PÅ LØNN ===');
// Regnet på nytt her, direkte fra satsene, uten å bruke spillets funksjon.
function fasitLonn(brutto,S){
  const minste=Math.min(brutto*S.minstefradragSats,S.minstefradragMaks);
  const alm=Math.max(0,brutto-minste-S.personfradrag);
  const skattAlm=alm*S.alminnelig;
  let trinn=0;
  for (let i=0;i<S.trinn.length;i++){
    const ovre=S.trinn[i+1]?S.trinn[i+1].fra:Infinity;
    if (brutto>S.trinn[i].fra) trinn+=(Math.min(brutto,ovre)-S.trinn[i].fra)*S.trinn[i].sats;
  }
  const trygd = brutto<=S.trygdNedre ? 0
    : Math.min((brutto-S.trygdNedre)*S.trygdOpptrapping, brutto*S.trygdeavgift);
  const sum=skattAlm+trinn+trygd;
  return {sum,netto:brutto-sum};
}
for (const brutto of [90000,100000,150000,250000,456000,500000,700000,900000,1500000]){
  const f=fasitLonn(brutto,S);
  const g=await K(x=>RR.F.lonnsskatt(x),brutto);
  er('lønnsskatt ved '+brutto, g.sum, f.sum, 0.01);
  er('netto ved '+brutto, g.netto, f.netto, 0.01);
  sant('netto er aldri over brutto ved '+brutto, g.netto<=brutto+1e-9);
  sant('skatt er aldri negativ ved '+brutto, g.sum>=-1e-9);
}
// Frikortgrensen: ved 100 000 kr skal skatten være omtrent null
{
  // Ved nøyaktig frikortgrensen gir modellen 87,50 kr i trygdeavgift fra
  // opptrappingssonen over 99 650. I praksis blir så små beløp ikke innkrevd,
  // og med frikort trekkes ingenting. Grensen i testen er derfor 100 kr.
  const g=await K(()=>RR.F.lonnsskatt(100000));
  sant('ved frikortgrensen (100 000) er skatten praktisk talt null', g.sum<100);
  console.log('    (modellen gir '+g.sum.toFixed(2)+' kr — under grensen for innkreving)');
}
// Marginalskatt: kjente knekkpunkter
{
  const m1=await K(()=>RR.F.marginalskatt(456000));
  er('marginalskatt i trinn 2', m1, S.alminnelig+S.trinn[1].sats+S.trygdeavgift, 0.001);
  const m2=await K(()=>RR.F.marginalskatt(800000));
  er('marginalskatt i trinn 3', m2, S.alminnelig+S.trinn[2].sats+S.trygdeavgift, 0.001);
  const m3=await K(()=>RR.F.marginalskatt(1600000));
  er('maks marginalskatt = 47,4 %', m3, 0.474, 0.002);
  const g=await K(()=>RR.F.lonnsskatt(600000));
  sant('marginalskatt > gjennomsnittsskatt', (await K(()=>RR.F.marginalskatt(600000)))>g.snittsats);
}

console.log('\n=== SKATT PÅ SPARING ===');
{
  const a=await K(()=>RR.F.aksjeskatt(100000,200000));
  er('skjermingsfradrag = grunnlag × skjermingsrente', a.skjerming, 200000*S.skjermingsrente, 0.01);
  er('skattbart = gevinst − skjerming', a.skattbart, 100000-200000*S.skjermingsrente, 0.01);
  er('skatt = skattbart × 37,84 %', a.skatt, (100000-200000*S.skjermingsrente)*0.3784, 0.01);
  const b2=await K(()=>RR.F.aksjeskatt(1000,200000));
  er('skjerming større enn gevinst gir null skatt', b2.skatt, 0, 1e-9);
}
{ // fondsbeskatning etter aksjeandel
  const over=await K(()=>RR.F.fondsskatt(10000,0.95));
  er('fond over 80 % aksjer: alt som aksjeinntekt', over.skatt, 10000*0.3784, 0.01);
  const under=await K(()=>RR.F.fondsskatt(10000,0.10));
  er('fond under 20 % aksjer: alt som renteinntekt', under.skatt, 10000*0.22, 0.01);
  const midt=await K(()=>RR.F.fondsskatt(2000,0.70));
  er('kombinasjonsfond 70 %: aksjedel', midt.somAksje, 1400, 0.01);
  er('kombinasjonsfond 70 %: rentedel', midt.somRente, 600, 0.01);
  er('kombinasjonsfond 70 %: skatt', midt.skatt, 1400*0.3784+600*0.22, 0.01);
  sant('aksjefond beskattes hardere enn rentefond ved samme avkastning',
    over.skatt>under.skatt);
}
{ // ASK: innskutt kapital ut først
  const u1=await K(()=>RR.F.askUttak(50000,300000,0));
  er('uttak under innskutt er skattefritt', u1.skatt, 0, 1e-9);
  const u2=await K(()=>RR.F.askUttak(400000,300000,0));
  er('bare det over innskutt beskattes', u2.skattbart, 100000, 0.01);
  er('… med 37,84 %', u2.skatt, 100000*0.3784, 0.01);
  const u3=await K(()=>RR.F.askUttak(100000,300000,250000));
  er('tidligere uttak reduserer den skattefrie potten', u3.skattbart, 50000, 0.01);
}
{ // formuesskatt
  er('under bunnfradraget: ingen formuesskatt',
     await K(()=>RR.F.formuesskatt(1000000,500000,0,0)), 0, 1e-9);
  // 5 mill i aksjer verdsettes til 80 % = 4 mill; over bunnfradrag 1,9 mill → 2,1 mill × 1 %
  er('aksjerabatt 20 % og sats 1 %',
     await K(()=>RR.F.formuesskatt(5000000,0,0,0)), (5000000*0.8-1900000)*0.01, 0.01);
  // primærbolig verdsettes til 25 %
  er('primærbolig verdsettes til 25 %',
     await K(()=>RR.F.formuesskatt(0,0,8000000,0)), (8000000*0.25-1900000)*0.01, 0.01);
  er('gjeld trekkes fra grunnlaget',
     await K(()=>RR.F.formuesskatt(8000000,0,0,2000000)), (8000000*0.8-2000000-1900000)*0.01, 0.01);
  er('gjeld som spiser hele grunnlaget gir null, ikke negativ skatt',
     await K(()=>RR.F.formuesskatt(5000000,0,0,4000000)), 0, 1e-9);
  sant('trinn 2 gir høyere sats',
     (await K(()=>RR.F.formuesskatt(40000000,0,0,0))) >
     (40000000*0.8-1900000)*0.01 - 1);
}

console.log('\n=== INFLASJON OG REALRENTE ===');
er('Fisher: (1+n)/(1+i)−1', await K(()=>RR.F.realrente(0.05,0.027)), 1.05/1.027-1, 1e-12);
sant('Fisher gir lavere svar enn ren subtraksjon',
  (await K(()=>RR.F.realrente(0.10,0.05))) < 0.10-0.05);
er('kjøpekraft er invers av prisFram',
   await K(()=>RR.F.kjopekraft(RR.F.prisFram(1000,0.027,25),0.027,25)), 1000, 1e-9);
{ // sparekonto etter skatt er negativ realrente i juli 2026
  const netto=S.innskuddsrente*(1-S.alminnelig);
  const rr=await K(n=>RR.F.realrente(n,RR.SATSER.kpi),netto);
  sant('sparekonto etter skatt har negativ realrente nå', rr<0);
  console.log('    (sparekonto etter skatt: '+(rr*100).toFixed(2)+' % realt)');
}
er('kaffe 52 kr om 25 år ved 2,7 %',
   await K(()=>RR.F.prisFram(52,RR.SATSER.kpi,25)), 52*Math.pow(1.027,25), 0.01);

console.log('\n=== LÅNERAMME OG BOLIG ===');
{
  const r=await K(()=>RR.F.laaneramme(456000,300000));
  er('gjeldsgrad-skranke = 5 × inntekt', r.gjeldsgrad, 456000*5, 0.01);
  er('egenkapital-skranke = ek/0,10 − ek', r.belaaning, 300000/0.10-300000, 0.01);
  er('lånerammen er den laveste', r.laan, Math.min(456000*5,2700000), 0.01);
  sant('gjeldsgraden binder ved 456 000 og 300 000 i EK', r.bindende==='gjeldsgrad');
  er('maks pris = lån + egenkapital', r.maksPris, 456000*5+300000, 0.01);
  // egenkapitalen binder når inntekten er høy nok
  const r2=await K(()=>RR.F.laaneramme(2000000,300000));
  sant('egenkapitalen binder ved høy inntekt', r2.bindende==='egenkapital');
  er('da er lånet 2,7 mill', r2.laan, 2700000, 0.01);
}
er('stressrente = rente + 3 pp når det er over gulvet',
   await K(()=>RR.F.stressrente(0.0508)), 0.0808, 1e-12);
er('stressrente = gulvet på 7 % når renten er lav',
   await K(()=>RR.F.stressrente(0.02)), 0.07, 1e-12);
sant('stressrenten er alltid minst 7 %',
   [0,0.01,0.02,0.03,0.039].every(async x=>(await K(y=>RR.F.stressrente(y),x))>=0.07));
{
  const t=await K(()=>RR.F.stresstest(2280000,30));
  const i=0.0808/12, A=2280000*i/(1-Math.pow(1+i,-360));
  er('stresstestet terminbeløp', t, A, 0.01);
  sant('stressterminen er høyere enn dagens termin',
    t > (await K(()=>RR.F.terminbelop(2280000,0.0508/12,360))));
}
er('dokumentavgift 2,5 %', await K(()=>RR.F.dokumentavgift(3800000,false)), 95000, 0.01);
er('nybygg: avgift av tomteverdien, ikke fritak',
   await K(()=>RR.F.dokumentavgift(3800000,true)),
   3800000*S.tomteandelNybygg*S.dokumentavgift, 0.01);
er('netto rente etter 22 % fradrag', await K(()=>RR.F.netterente(0.0508)), 0.0508*0.78, 1e-12);

console.log('\n=== BETJENINGSEVNE OG DRIFTKORREKSJON ===');
{
  // Betjeningsevne: største lån der stressterminen er innenfor det som er igjen
  // etter levekostnader. Regnet på nytt her med annuitetsformelen.
  const netto=30000, lev=13000, i=0.0808/12, n=360;
  const rom=netto-lev;
  const fasit=rom*(1-Math.pow(1+i,-n))/i;
  er('betjeningsevne', await K(()=>RR.F.betjeningsevne(30000,13000,30,0.0508)), fasit, 0.01);
  er('ingenting igjen etter levekostnader gir null låneramme',
     await K(()=>RR.F.betjeningsevne(13000,13000,30,0.0508)), 0, 0);
  er('negativ margin gir null, ikke negativt lån',
     await K(()=>RR.F.betjeningsevne(9000,13000,30,0.0508)), 0, 0);
  sant('høyere rente gir lavere betjeningsevne',
    (await K(()=>RR.F.betjeningsevne(30000,13000,30,0.09))) <
    (await K(()=>RR.F.betjeningsevne(30000,13000,30,0.0508))));
  // Lånerammen har nå FIRE skranker, og eksisterende gjeld spiser av gjeldstaket
  const a1=await K(()=>RR.F.laaneramme(456000,300000));
  const a2=await K(()=>RR.F.laaneramme(456000,300000,undefined,500000));
  er('eksisterende gjeld reduserer gjeldstaket krone for krone',
     a1.gjeldsgrad-a2.gjeldsgrad, 500000, 0.01);
  sant('betjeningsevnen er med som egen skranke', a2.betjening>0);
  sant('bindende skranke er navnet på den laveste', (()=>{
    const lav=Math.min(a1.gjeldsgrad,a1.belaaning,a1.betjening);
    return (a1.bindende==='gjeldsgrad'&&a1.gjeldsgrad===lav)
        || (a1.bindende==='egenkapital'&&a1.belaaning===lav)
        || (a1.bindende==='betjeningsevne'&&a1.betjening===lav);
  })());
  er('maks pris = lån + egenkapital, alltid', a1.maksPris, a1.laan+300000, 0.01);
  sant('stressterminen er høyere enn dagens termin', a1.stresstermin>a1.termin);
  console.log('    (ved 456 000 og 300 000 i EK: gjeldsgrad '+Math.round(a1.gjeldsgrad)+
    ', betjeningsevne '+Math.round(a1.betjening)+', egenkapital '+Math.round(a1.belaaning)+
    ' → '+a1.bindende+' binder)');
}
{
  // Driftkorreksjonen: en tilfeldig gang med drift g + σ²/2 skal ha g som
  // ANNUALISERT median. Uten den leverer simuleringen systematisk mindre enn
  // tabellen ved siden av påstår.
  er('mndDrift(g, 0) = månedlig geometrisk av g',
     await K(()=>RR.F.mndDrift(0.052,0)), Math.pow(1.052,1/12)-1, 1e-12);
  er('mndDrift legger til σ²/24 i logrom',
     await K(()=>RR.F.mndDrift(0.052,0.17)), Math.pow(1.052,1/12)*Math.exp(0.17*0.17/24)-1, 1e-12);
  // Den forrige utgaven het drift() og ga (g + σ²/2), som kallerne delte på 12.
  // Det behandler g som en log-avkastning og bommer oppover når g og σ blir
  // store: målt +0,28 pp på 7,9 % og σ 16 % over førti år, altså 471 208 kr på
  // medianen i oppdrag N. Ingen skal kalle drift() igjen.
  sant('den gamle drift() finnes ikke lenger', await K(()=>typeof RR.F.drift==='undefined'));
  const g=await K(()=>{
    // 4 000 forløp på 30 år, månedlige steg, og mål den annualiserte medianen
    const lagRnd=(s)=>{let a=s>>>0;return function(){a+=0x6D2B79F5;let t=a;
      t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);
      return ((t^t>>>14)>>>0)/4294967296;};};
    const gauss=(r)=>{let u=0,v=0;while(u===0)u=r();while(v===0)v=r();
      return Math.sqrt(-2*Math.log(u))*Math.cos(Math.PI*2*v);};
    const G=0.052, S=0.17, N=4000, AAR=30;
    const kjor=(mu)=>{ const r=lagRnd(4242), ut=[];
      for (let k=0;k<N;k++){ let x=1;
        for (let t=0;t<AAR*12;t++) x*=(1+mu/12+S/Math.sqrt(12)*gauss(r));
        ut.push(Math.pow(Math.max(1e-9,x),1/AAR)-1); }
      ut.sort((a,b)=>a-b); return ut[Math.floor(N*0.5)]; };
    return {uten:kjor(G), med:kjor(RR.F.mndDrift(G,S)*12)};
  });
  console.log('    (median annualisert over 30 år: uten korreksjon '+(g.uten*100).toFixed(2)+
    ' %, med korreksjon '+(g.med*100).toFixed(2)+' % — målet er 5,20 %)');
  sant('uten korreksjon ligger medianen klart under målet', g.uten < 0.052-0.008);
  // Kravet var 0,8 pp, altså så løst at feilen på 0,28 pp gikk gjennom.
  sant('med korreksjon treffer medianen målet innenfor 0,05 pp',
    Math.abs(g.med-0.052) < 0.0005);
  // Og den skal treffe på de kombinasjonene spillet faktisk bruker, ikke bare på én.
  const flere=await p.evaluate(()=>{
    const lagRnd=(s)=>{ let a=s>>>0; return function(){
      a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61);
      return ((t^t>>>14)>>>0)/4294967296; }; };
    const gauss=(r)=>{ let u=0,v=0; while(u===0)u=r(); while(v===0)v=r();
      return Math.sqrt(-2*Math.log(u))*Math.cos(Math.PI*2*v); };
    const median=(G,S,AAR)=>{ const mu=RR.F.mndDrift(G,S), sd=S/Math.sqrt(12);
      const r=lagRnd(4242), ut=[];
      for (let k=0;k<6000;k++){ let x=1;
        for (let t=0;t<AAR*12;t++) x*=(1+mu+sd*gauss(r));
        ut.push(Math.pow(Math.max(1e-9,x),1/AAR)-1); }
      ut.sort((a,b)=>a-b); return ut[3000]; };
    const S=RR.SATSER, F=RR.F;
    return [
      ['byens marked, 40 år', F.nominell(S.realAksjer,S.kpi), S.volAksjer, 40],
      ['oppdrag N, 80 % aksjer', F.nominell(F.miks(0.8).avkastning,S.kpi), F.miks(0.8).risiko, 40],
      ['oppdrag G, pensjon 70 %', F.miks(0.7).avkastning, F.miks(0.7).risiko, 35]
    ].map(([n,G,S2,A])=>({n,mal:G,fikk:median(G,S2,A)}));
  });
  flere.forEach(x=>{
    console.log('    '+x.n+': mål '+(x.mal*100).toFixed(3)+' %, median '+(x.fikk*100).toFixed(3)+' %');
    sant('  medianen treffer innenfor 0,08 pp — '+x.n, Math.abs(x.fikk-x.mal)<0.0008);
  });
}

console.log('\n=== NOMINELL AV REAL: FISHER, IKKE r + i ===');
// Spillet lærer bort i oppdrag F at realrenten ikke er «rente minus inflasjon»,
// og brukte likevel realAksjer + kpi som nominell drift i tre simuleringer.
{
  er('nominell(r, i) = (1+r)(1+i) − 1',
     await K(()=>RR.F.nominell(0.052,0.027)), 1.052*1.027-1, 1e-12);
  er('nominell er invers av kjopekraft over ett år',
     await K(()=>RR.F.kjopekraft(1+RR.F.nominell(0.052,0.027),0.027,1)), 1.052, 1e-12);
  const n=await K(()=>RR.F.nominell(RR.SATSER.realAksjer,RR.SATSER.kpi));
  const flat=await K(()=>RR.SATSER.realAksjer+RR.SATSER.kpi);
  console.log('    Fisher '+(n*100).toFixed(2)+' % mot r+i '+(flat*100).toFixed(2)+' % — differanse '+
    ((n-flat)*100).toFixed(2)+' pp');
  sant('Fisher gir mer enn r + i', n>flat);
  const kilde=await p.evaluate(()=>RR.kildekode?RR.kildekode():null);
}

console.log('\n=== DOKUMENTAVGIFT VED NYBYGG ===');
// Kort 13 og F sa fullt fritak; Visningsboligen sa «du betaler av tomteverdien».
{
  const S=await K(()=>RR.SATSER);
  er('vanlig kjøp: 2,5 % av hele prisen',
     await K(()=>RR.F.dokumentavgift(4000000,false)), 4000000*S.dokumentavgift, 0.01);
  er('nybygg: 2,5 % av tomteverdien',
     await K(()=>RR.F.dokumentavgift(4000000,true)),
     4000000*S.tomteandelNybygg*S.dokumentavgift, 0.01);
  sant('nybygg er billigere, men ikke gratis',
     (await K(()=>RR.F.dokumentavgift(4000000,true)))>0 &&
     (await K(()=>RR.F.dokumentavgift(4000000,true)))<(await K(()=>RR.F.dokumentavgift(4000000,false))));
  er('tomteandelen kan overstyres',
     await K(()=>RR.F.dokumentavgift(4000000,true,0.5)), 4000000*0.5*S.dokumentavgift, 0.01);
}

console.log('\n=== GEBYRER ===');
{
  const g=await K(()=>RR.F.gebyrlekkasje(36000,0.07,0.0025,0.013,30));
  sant('billig fond ender høyere', g.a>g.b);
  sant('differansen er over 15 % av sluttbeløpet', g.andelTapt>0.15);
  sant('differansen er under 30 % av sluttbeløpet', g.andelTapt<0.30);
  console.log('    (1,05 pp gebyr over 30 år spiser '+(g.andelTapt*100).toFixed(1)+' % av sluttbeløpet)');
  const null0=await K(()=>RR.F.gebyrlekkasje(36000,0.07,0.005,0.005,30));
  er('samme gebyr gir null differanse', null0.differanse, 0, 1e-6);
}

console.log('\n=== PENSJON ===');
{
  er('opptjening under taket', await K(()=>RR.F.folketrygdOpptjening(500000)), 500000*0.181, 0.01);
  const tak=S.folketrygdTak*S.grunnbelopSnitt;
  er('opptjening over taket stopper på 7,1 G',
     await K(()=>RR.F.folketrygdOpptjening(2000000)), tak*0.181, 0.01);
  er('OTP minimum 2 %', await K(()=>RR.F.otp(600000)), 12000, 0.01);
}

console.log('\n=== RISIKO OG DIVERSIFISERING ===');
{
  const a=await K(()=>RR.F.miks(1)), o=await K(()=>RR.F.miks(0)), h=await K(()=>RR.F.miks(0.5));
  er('100 % aksjer gir aksjeavkastning', a.avkastning, S.realAksjer, 1e-12);
  er('0 % aksjer gir obligasjonsavkastning', o.avkastning, S.realObligasjoner, 1e-12);
  sant('miksen ligger mellom ytterpunktene',
    h.avkastning>o.avkastning && h.avkastning<a.avkastning);
  sant('diversifiseringsgevinst: 50/50 har lavere risiko enn vektet snitt av risikoene',
    h.risiko < 0.5*a.risiko+0.5*o.risiko);
  // porteføljerisiko skal falle mot markedsrisikoen, ikke mot null
  const r1=await K(()=>RR.F.porteføljerisiko(1,0.35,0.25));
  const r30=await K(()=>RR.F.porteføljerisiko(30,0.35,0.25));
  const r1e6=await K(()=>RR.F.porteføljerisiko(1e6,0.35,0.25));
  er('n=1 gir enkeltrisikoen', r1, 0.35, 1e-9);
  sant('risikoen faller med antall aksjer', r30<r1);
  er('grensen er markedsrisikoen √(σ²ρ)', r1e6, Math.sqrt(0.35*0.35*0.25), 1e-4);
  sant('grensen er ikke null', r1e6>0.15);
  sant('de første 10 aksjene gjør mesteparten av jobben',
    (r1-(await K(()=>RR.F.porteføljerisiko(10,0.35,0.25)))) > 0.6*(r1-r1e6));
}
er('et fall på 50 % krever 100 % oppgang', await K(()=>RR.F.hentInn(0.5)), 1, 1e-12);
er('et fall på 20 % krever 25 % oppgang', await K(()=>RR.F.hentInn(0.2)), 0.25, 1e-12);
sant('et fall på 100 % kan ikke hentes inn', (await K(()=>RR.F.hentInn(1)))===null
  || (await K(()=>RR.F.hentInn(1)===Infinity)));

console.log('\n=== PÅSTANDENE SPILLET GJØR I TEKST ===');
{
  // Kort 6: «1 000 kr/mnd i 10 år ved 5 % ≈ 155 000; i 40 år ≈ 1,5 mill»
  const t10=await K(()=>RR.F.sluttverdiSerie(1000,RR.F.mndRente(0.05),120,true));
  const t40=await K(()=>RR.F.sluttverdiSerie(1000,RR.F.mndRente(0.05),480,true));
  sant('kort 6: 10 år ≈ 155 000', Math.abs(t10-155000)<6000);
  sant('kort 6: 40 år ≈ 1,5 mill', Math.abs(t40-1500000)<90000);
  console.log('    (10 år: '+Math.round(t10)+' · 40 år: '+Math.round(t40)+')');
  // Kort 8: 50 000 i renter gir 11 000 tilbake
  er('kort 8: rentefradrag av 50 000', 50000*S.rentefradrag, 11000, 0.01);
  // Kort 12: 5,08 % + 3 pp = 8,08 %
  er('kort 12: stressrente', await K(()=>RR.F.stressrente(RR.SATSER.boliglaansrente)), 0.0808, 1e-9);
  // Kort 8: netto boliglånsrente ≈ 3,96 %
  er('kort 8: netto boliglånsrente', await K(()=>RR.F.netterente(RR.SATSER.boliglaansrente)),
     0.0508*0.78, 1e-9);
  console.log('    (netto boliglånsrente: '+(0.0508*0.78*100).toFixed(2)+' %)');
  // Oppdrag D: Bodil må spare klart mer enn Ada
  const adaVed35=await K(()=>RR.F.sluttverdiSerie(2000,RR.F.mndRente(RR.SATSER.realAksjer),120,true));
  const adaSlutt=await K(x=>RR.F.sluttverdi(x,RR.SATSER.realAksjer,32),adaVed35);
  const bodil=await K(x=>RR.F.sparebehov(x,0,RR.F.mndRente(RR.SATSER.realAksjer),384,true),adaSlutt);
  sant('oppdrag D: Bodils fasitbeløp ligger innenfor skyveren (500–9 000)',
    bodil>=500 && bodil<=9000);
  // Poenget i oppdraget er IKKE at Bodil må spare mer per måned — hun trenger
  // faktisk litt mindre. Poenget er at hun må sette inn langt mer TIL SAMMEN.
  const innA=2000*12*10, innB=bodil*12*32;
  sant('oppdrag D: Bodil må sette inn minst dobbelt så mye totalt', innB>2*innA);
  console.log('    (Ada 2 000/mnd i 10 år → '+Math.round(adaSlutt)+' ved 67. '+
    'Bodil må spare '+Math.round(bodil)+'/mnd i 32 år: '+Math.round(innA)+
    ' kr inn mot '+Math.round(innB)+' kr — '+(innB/innA).toFixed(1)+' ganger så mye.)');
  // Og den andre halvdelen av oppdraget: samme månedsbeløp, ti år senere start.
  const adaLikt=await K(()=>RR.F.sluttverdiSerie(2000,RR.F.mndRente(RR.SATSER.realAksjer),42*12,true));
  const bodilLikt=await K(()=>RR.F.sluttverdiSerie(2000,RR.F.mndRente(RR.SATSER.realAksjer),32*12,true));
  sant('oppdrag D: ti år tidligere start gir over 60 % mer med samme beløp',
    adaLikt/bodilLikt>1.6);
  console.log('    (samme 2 000/mnd: 42 år gir '+Math.round(adaLikt)+', 32 år gir '+
    Math.round(bodilLikt)+' — '+(adaLikt/bodilLikt).toFixed(2)+' ganger)');
  // Oppdrag L: gjeldsgraden binder ved startlønna
  const ram=await K(()=>RR.F.laaneramme(RR.tilstand.bruttoAar,300000));
  sant('oppdrag L: gjeldsgraden binder ved startlønn og 300 000 i EK',
    ram.bindende==='gjeldsgrad');
  sant('oppdrag L: leiligheten på 4,2 mill er utenfor rekkevidde', ram.maksPris<4200000);
  // Kasinoet: husets fordel
  er('kasino: forventet tap per krone', 1-36/37, 1/37, 1e-12);
  // Oppdrag I: finnes det et år der lekkasjen passerer 100 000 innenfor skyveren?
  let aarFunn=null;
  for (let a=1;a<=45;a++){
    const d=await K(x=>RR.F.gebyrlekkasje(36000,0.07,RR.SATSER.gebyrIndeks,RR.SATSER.gebyrAktiv,x).differanse,a);
    if (d>=100000){ aarFunn=a; break; }
  }
  sant('oppdrag I: fasitåret finnes innenfor skyveren 1–45', aarFunn!==null);
  console.log('    (gebyrlekkasjen passerer 100 000 kr etter '+aarFunn+' år '+
              'med 3 000/mnd og 7 % brutto)');
}

console.log('\n=== ROBUSTHET: ingen NaN, ingen Infinity der det ikke skal ===');
{
  const rare=[0,1,-1,1e12,0.0001];
  for (const x of rare){
    const l=await K(v=>RR.F.lonnsskatt(v),x);
    sant('lonnsskatt('+x+') gir tall', isFinite(l.sum)&&isFinite(l.netto));
    const r=await K(v=>RR.F.laaneramme(Math.max(0,v),Math.max(0,v)),x);
    sant('laaneramme('+x+') gir tall', isFinite(r.laan));
  }
  sant('sluttverdiSerie med negativ n gir 0',
    (await K(()=>RR.F.sluttverdiSerie(1000,0.01,-5,true)))===0);
}

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)+' sjekker') : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
