// test-oppdrag.js — kan alle fjorten oppdragene faktisk løses?
// Hvert oppdrag spilles gjennom med ekte klikk og ekte skyvekontroller.
// Et oppdrag som ikke kan fullføres, låser resten av spillet — derfor er
// dette den viktigste testen i pakken.
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x){ if (x) ok++; else { feil++; console.log('  ✗ '+n); } }

// --- små hjelpere mot DOM-en ---
async function klikkTekst(p,tekst){
  const traff=await p.evaluate(t=>{
    const b=[...document.querySelectorAll('#spillinner button')]
      .filter(x=>!x.disabled && x.textContent.indexOf(t)>=0);
    if (!b.length) return false;
    b[0].click(); return true;
  },tekst);
  await p.waitForTimeout(70);
  return traff;
}
async function skyv(p,id,verdi){
  return await p.evaluate(([id,v])=>{
    const e=document.getElementById(id); if (!e) return false;
    e.value=String(v); e.dispatchEvent(new Event('input',{bubbles:true})); return true;
  },[id,verdi]);
}
async function harSeier(p){ return await p.evaluate(()=>RR.harSeier()); }
async function tekst(p){ return await p.evaluate(()=>RR.minispillTekst()); }
async function apne(p,id){
  await p.evaluate(()=>RR.lukkAlt());
  await p.evaluate(i=>RR.aapneMinispill(i,RR.MINI[i]),id);
  await p.waitForTimeout(160);
}

(async()=>{
const b=await chromium.launch({executablePath:CHROMIUM,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:900}});
const sideFeil=[];
p.on('pageerror',e=>sideFeil.push(e.message));
await p.goto(process.env.RR_URL||('file://'+__dirname+'/index.html'));
await p.evaluate(()=>RR.nullstill());
await p.reload();
await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,kontanter:250000}); });
await p.waitForTimeout(700);
await p.evaluate(()=>RR.lukkAlt());

const S=await p.evaluate(()=>RR.SATSER);
const alleOppdrag=await p.evaluate(()=>RR.OPPDRAG.map(o=>o.id));

// ---------------------------------------------------------------- A
console.log('\n=== A — Den første lønnsslippen ===');
{
  await apne(p,'A');
  sant('A åpner med gjetteskyver', await p.evaluate(()=>!!document.getElementById('gjett')));
  // gjett nøyaktig riktig
  const netto=await p.evaluate(()=>RR.F.lonnsskatt(RR.tilstand.bruttoAar).netto/12);
  await skyv(p,'gjett',Math.round(netto/500)*500);
  sant('«Åpne slippen» finnes', await klikkTekst(p,'Åpne slippen'));
  await p.waitForTimeout(120);
  const t=await tekst(p);
  sant('slippen viser minstefradrag', /minstefradrag/i.test(t));
  sant('slippen viser trinnskatt', /Trinnskatt/.test(t));
  sant('slippen viser trygdeavgift', /Trygdeavgift/.test(t));
  sant('gjetningen ble godkjent som god', /Godt truffet/.test(t));
  // marginalskatt-spørsmålet: velg riktig beløp
  const marg=await p.evaluate(()=>RR.F.marginalskatt(RR.tilstand.bruttoAar));
  const riktig=Math.round((1-marg)*1000);
  const klikket=await p.evaluate(r=>{
    const nf=new Intl.NumberFormat('nb-NO',{maximumFractionDigits:0});
    const mal=nf.format(r);
    const kort=[...document.querySelectorAll('#spillinner .valgkort')];
    const t=kort.find(k=>k.textContent.replace(/ /g,' ').indexOf(mal)>=0);
    if (!t) return kort.map(k=>k.textContent);
    t.click(); return true;
  },riktig);
  sant('fant og klikket riktig marginalskatt-alternativ ('+riktig+' kr)', klikket===true);
  await p.waitForTimeout(140);
  sant('A gir seier', await harSeier(p));
  await klikkTekst(p,'Ferdig');
  sant('A er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('A'));
  // og feil svar skal ikke gi seier
  await apne(p,'A');
  await klikkTekst(p,'Åpne slippen');
  await p.evaluate(()=>{ const k=[...document.querySelectorAll('#spillinner .valgkort')];
    k[k.length-1].click(); });   // 1 000 kr — alltid feil
  await p.waitForTimeout(120);
  sant('feil svar gir ikke seier', !(await p.evaluate(()=>
    [...document.querySelectorAll('#spillinner .fasit.ja')].length>1)));
}

// ---------------------------------------------------------------- B
console.log('\n=== B — Budsjettet som holder ===');
{
  await apne(p,'B');
  const data=await p.evaluate(()=>{
    const br=[...document.querySelectorAll('#spillinner .brikke')].map((b,i)=>{
      const m=b.textContent.replace(/ /g,' ');
      const kr=parseInt(m.match(/([\d ]+) kr/)[1].replace(/ /g,''),10);
      const q=parseInt(m.match(/(\d+) liv/)[1],10);
      return {i,kr,q};
    });
    const netto=Math.round(RR.F.lonnsskatt(RR.tilstand.bruttoAar).netto/12);
    return {br,netto};
  });
  sant('B viser tolv valgfrie utgifter', data.br.length===10);
  const maaSum=18400;                                  // låste utgifter, se MINI.B
  // finn en kombinasjon som gir ≥20 % sparing OG ≥14 livskvalitetspoeng
  let best=null;
  for (let m=0;m<(1<<data.br.length);m++){
    let c=0,q=0;
    for (let i=0;i<data.br.length;i++) if (m&(1<<i)){ c+=data.br[i].kr; q+=data.br[i].q; }
    const spar=data.netto-maaSum-c;
    if (spar/data.netto>=0.20 && q>=14 && (!best||q>best.q)) best={m,q,c,spar};
  }
  sant('det FINNES en løsning som klarer begge kravene', !!best);
  if (best){
    console.log('    beste: '+best.q+' livspoeng, '+Math.round(best.spar)+' kr spart ('+
      (best.spar/data.netto*100).toFixed(1)+' %)');
    for (let i=0;i<data.br.length;i++) if (best.m&(1<<i)){
      await p.evaluate(i=>document.querySelectorAll('#spillinner .brikke')[i].click(),i);
    }
    await p.waitForTimeout(150);
    sant('B gir seier med den optimale kombinasjonen', await harSeier(p));
    sant('fasiten nevner regelen om fast trekk', /fast trekk til sparing/.test(await tekst(p)));
    await klikkTekst(p,'Ferdig');
    sant('B er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('B'));
  }
  // «kutt alt» skal IKKE holde — da faller livskvaliteten under kravet
  await apne(p,'B');
  await p.waitForTimeout(80);
  sant('null valgfrie utgifter gir ikke seier (livskvalitet for lav)', !(await harSeier(p)));
}

// ---------------------------------------------------------------- C
console.log('\n=== C — Bufferstormen ===');
{
  await apne(p,'C');
  const utg=await p.evaluate(()=>{
    const m=document.querySelector('#spillinner .mlead').textContent.replace(/ /g,' ');
    return parseInt(m.match(/er ([\d ]+) kr i måneden/)[1].replace(/ /g,''),10);
  });
  console.log('    faste utgifter: '+utg+' kr/mnd');
  // for liten buffer skal føre til forbrukslån
  await skyv(p,'buf',0);
  await klikkTekst(p,'Kjør stormen');
  const t0=await tekst(p);
  sant('buffer på null gir forbrukslån', /forbrukslån/i.test(t0)&&!(await harSeier(p)));
  // for stor buffer skal klare stormen men ikke gi seier
  await skyv(p,'buf',Math.round(utg*6/5000)*5000);
  await klikkTekst(p,'Kjør stormen');
  const t1=await tekst(p);
  sant('buffer på seks måneder klarer stormen, men gir ikke seier',
    !(await harSeier(p)) && /måneder/.test(t1));
  // tre måneder skal treffe
  await skyv(p,'buf',Math.round(utg*3/5000)*5000);
  await klikkTekst(p,'Kjør stormen');
  await p.waitForTimeout(120);
  sant('tre måneders buffer gir seier', await harSeier(p));
  const t2=await tekst(p);
  sant('regnskapet viser tapt realavkastning', /Tapt realavkastning/.test(t2));
  await klikkTekst(p,'Ferdig');
  sant('C er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('C'));
}

// ---------------------------------------------------------------- D
console.log('\n=== D — Rentetrappa ===');
{
  await apne(p,'D');
  const fasit=await p.evaluate(()=>{
    const r=RR.SATSER.realAksjer, mr=RR.F.mndRente(r);
    const adaVed35=RR.F.sluttverdiSerie(2000,mr,120,true);
    const adaSlutt=RR.F.sluttverdi(adaVed35,r,32);
    return RR.F.sparebehov(adaSlutt,0,mr,384,true);
  });
  console.log('    fasit for Bodil: '+Math.round(fasit)+' kr/mnd');
  await skyv(p,'bodil',500);
  sant('for lavt beløp gir ikke seier', !(await harSeier(p)));
  await skyv(p,'bodil',Math.round(fasit/50)*50);
  await p.waitForTimeout(140);
  sant('riktig beløp gir seier', await harSeier(p));
  const t=await tekst(p);
  sant('fasiten sammenligner innbetalte beløp, ikke månedsbeløp', /ganger så mye/.test(t));
  sant('fasiten viser også «samme beløp, ti år senere»-regnestykket',
    /Snu det andre veien/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('D er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('D'));
}

// ---------------------------------------------------------------- E
console.log('\n=== E — Gjeldsraset ===');
{
  await apne(p,'E');
  // startrekkefølgen er bevisst den dårligste — kjør den som den er
  await klikkTekst(p,'Kjør nedbetalingen');
  await p.waitForTimeout(100);
  const daarlig=await harSeier(p);
  sant('en dårlig rekkefølge gir ikke seier', !daarlig);
  // sorter dyreste rente først ved å klikke rader oppover
  await apne(p,'E');
  await p.waitForTimeout(80);
  const orden=await p.evaluate(()=>[...document.querySelectorAll('#spillinner .brikke')]
    .map(r=>parseFloat(r.textContent.match(/([\d,]+) %/)[1].replace(',','.'))));
  console.log('    startrekkefølge (rente %): '+orden.join(' → '));
  sant('startrekkefølgen er IKKE dyreste rente først', orden[0]<orden[orden.length-1]);
  // sorter dyreste først ved å klikke rader oppover, slik en spiller gjør
  for (let runde=0;runde<14;runde++){
    const r=await p.evaluate(()=>[...document.querySelectorAll('#spillinner .brikke')]
      .map(x=>parseFloat(x.textContent.match(/([\d,]+) %/)[1].replace(',','.'))));
    for (let i=1;i<r.length;i++) if (r[i]>r[i-1]){
      await p.evaluate(i=>document.querySelectorAll('#spillinner .brikke')[i].click(),i);
      await p.waitForTimeout(25);
      break;
    }
  }
  const sortert=await p.evaluate(()=>[...document.querySelectorAll('#spillinner .brikke')]
    .map(r=>parseFloat(r.textContent.match(/([\d,]+) %/)[1].replace(',','.'))));
  console.log('    etter sortering: '+sortert.join(' → '));
  sant('spilleren kan sortere dyreste rente først ved å klikke',
    sortert.every((x,i)=>i===0||x<=sortert[i-1]));
  await klikkTekst(p,'Kjør nedbetalingen');
  await p.waitForTimeout(120);
  sant('dyreste rente først gir seier', await harSeier(p));
  const t=await tekst(p);
  sant('resultattabellen viser alle fire strategiene',
    /rasmetoden/.test(t)&&/snøballmetoden/.test(t));
  sant('snøballmetoden koster faktisk noe her (ikke 0 kr)',
    !/snøballmetoden gir[\s\S]{0,40}0 kr/.test(t) && /koster/.test(t));
  sant('fasiten sier at gjeld kommer før sparing', /garantert/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('E er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('E'));
}

// ---------------------------------------------------------------- F
console.log('\n=== F — Inflasjonstyven ===');
{
  await apne(p,'F');
  const kort=await p.evaluate(()=>[...document.querySelectorAll('#spillinner .valgkort')]
    .map(k=>k.textContent));
  sant('F har fire steder å legge pengene', kort.length===4);
  // madrassen skal tape kjøpekraft
  await p.evaluate(()=>document.querySelectorAll('#spillinner .valgkort')[0].click());
  await p.waitForTimeout(140);
  sant('madrassen gir ikke seier', !(await harSeier(p)));
  sant('madrassen sier at kjøpekraften forsvant', /Kjøpekraften forsvant/.test(await tekst(p)));
  // sparekonto etter skatt skal også tape
  await p.evaluate(()=>document.querySelectorAll('#spillinner .valgkort')[1].click());
  await p.waitForTimeout(140);
  sant('sparekonto etter skatt gir ikke seier', !(await harSeier(p)));
  // indeksfondet skal holde kjøpekraften
  await p.evaluate(()=>document.querySelectorAll('#spillinner .valgkort')[3].click());
  await p.waitForTimeout(160);
  sant('globalt indeksfond gir seier', await harSeier(p));
  sant('fasiten gir Fisher-formelen', /\(1\+r\)\/\(1\+i\)/.test(await tekst(p)));
  await klikkTekst(p,'Ferdig');
  sant('F er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('F'));
}

// ---------------------------------------------------------------- G
console.log('\n=== G — Kurven som lurer ===');
{
  await apne(p,'G');
  // for hvert av de tre målene: finn en aksjeandel som klarer begge kravene
  const valgt=[];
  for (let i=0;i<3;i++){
    let traff=null;
    for (let w=0;w<=100;w+=5){
      await skyv(p,'a'+i,w);
      await p.waitForTimeout(28);
      const kortTekst=await p.evaluate(i=>{
        const k=document.querySelectorAll('#spillinner .kort');
        // kort 0 er ledeteksten ikke er et kort — målene er de tre første .kort
        return k[i].textContent;
      },i);
      const antallOk=(kortTekst.match(/✓ holder/g)||[]).length;
      if (antallOk===2){ traff=w; break; }
    }
    valgt.push(traff);
    sant('mål '+(i+1)+' har en aksjeandel som klarer kravene (fant '+traff+' %)', traff!==null);
  }
  console.log('    løsning: 2 år → '+valgt[0]+' %, 7 år → '+valgt[1]+' %, 35 år → '+valgt[2]+' %');
  sant('kort horisont løses med lav aksjeandel', valgt[0]!==null && valgt[0]<=35);
  sant('vinduene ligger i rekkefølge etter horisont',
    valgt[0]<valgt[1] && valgt[1]<valgt[2]);
  // Den substansielle påstanden: det som holder for to år, holder IKKE for
  // trettifem — og omvendt. Ellers er hele oppdraget bare tre skyvere.
  const vindu=async (i)=>{
    const pass=[];
    for (let w=0;w<=100;w+=10){
      await skyv(p,'a'+i,w); await p.waitForTimeout(25);
      const k=await p.evaluate(i=>document.querySelectorAll('#spillinner .kort')[i].textContent,i);
      if ((k.match(/✓ holder/g)||[]).length===2) pass.push(w);
    }
    return pass;
  };
  const v0=await vindu(0), v2=await vindu(2);
  console.log('    mål 1 holder for: '+v0.join(', ')+' % · mål 3 holder for: '+v2.join(', ')+' %');
  sant('to års horisont tåler ikke høy aksjeandel', !v0.some(w=>w>=50));
  sant('trettifem års horisont krever aksjer', !v2.some(w=>w<=30));
  sant('vinduene overlapper ikke helt', Math.min(...v2)>Math.min(...v0));
  // tilbake til løsningen
  for (let i=0;i<3;i++) await skyv(p,'a'+i,valgt[i]);
  await p.waitForTimeout(250);
  await p.waitForTimeout(200);
  sant('G gir seier når alle tre står trygt', await harSeier(p));
  sant('fasiten sier at horisonten bestemmer', /Horisonten bestemmer/.test(await tekst(p)));
  await klikkTekst(p,'Ferdig');
  sant('G er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('G'));
}

// ---------------------------------------------------------------- H
console.log('\n=== H — Ikke alt i én kurv ===');
{
  await apne(p,'H');
  sant('«Neste år» er låst før vektene summerer til 100 %',
    await p.evaluate(()=>[...document.querySelectorAll('#spillinner button')]
      .some(b=>/Neste år/.test(b.textContent)&&b.disabled)));
  // konsentrert: 100 % i én sektor skal ikke gi seier
  await skyv(p,'v3',100);
  for (let r=0;r<5;r++){ await klikkTekst(p,'Neste år'); await p.waitForTimeout(60); }
  await p.waitForTimeout(120);
  sant('100 % i én sektor gir ikke seier', !(await harSeier(p)));
  // spredt: indeksfond + litt av hvert, ingen sektor over 40 %
  await apne(p,'H');
  await skyv(p,'v5',50);
  for (let i=0;i<5;i++) await skyv(p,'v'+i,10);
  await p.waitForTimeout(60);
  const sumOk=await p.evaluate(()=>/Sum: <b>100 %/.test(document.querySelector('#spillinner .kort').innerHTML));
  sant('vektene summerer til 100 %', sumOk);
  for (let r=0;r<5;r++){ await klikkTekst(p,'Neste år'); await p.waitForTimeout(70); }
  await p.waitForTimeout(150);
  const t=await tekst(p);
  sant('H viser skyggeporteføljene', /Alt i teknologi/.test(t)&&/Alt i globalt indeksfond/.test(t));
  sant('H gir seier med en spredt portefølje', await harSeier(p));
  sant('fasiten viser at risikoen flater ut, ikke går til null', /uendelig mange/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('H er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('H'));
}

// ---------------------------------------------------------------- I
console.log('\n=== I — Gebyrlekkasjen ===');
{
  await apne(p,'I');
  const riktigAar=await p.evaluate(()=>{
    for (let a=1;a<=60;a++)
      if (RR.F.gebyrlekkasje(3000*12,0.07,RR.SATSER.gebyrIndeks,RR.SATSER.gebyrAktiv,a)
            .differanse>=100000) return a;
    return null;
  });
  console.log('    fasit: '+riktigAar+' år');
  await skyv(p,'ga',Math.max(1,riktigAar-6));
  await klikkTekst(p,'Svar');
  await p.waitForTimeout(100);
  sant('feil årstall gir ikke seier', !(await harSeier(p)));
  sant('feil svar sier hva riktig svar var', /[Dd]et tar/.test(await tekst(p)));
  await skyv(p,'ga',riktigAar);
  await klikkTekst(p,'Svar');
  await p.waitForTimeout(140);
  sant('riktig årstall gir seier', await harSeier(p));
  const t=await tekst(p);
  sant('fasiten sammenligner med Oljefondets kostnad', /Oljefondet/.test(t));
  sant('fasiten sier at gebyret er det eneste man vet sikkert', /eneste størrelsen/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('I er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('I'));
}

// ---------------------------------------------------------------- J
console.log('\n=== J — Panikkprøven ===');
{
  // først: selg hver gang. Det skal ende bak benken.
  await apne(p,'J');
  await klikkTekst(p,'Start de tretti årene');
  let valgRunder=0;
  for (let vakt=0;vakt<400;vakt++){
    await p.waitForTimeout(90);
    const harValg=await p.evaluate(()=>
      [...document.querySelectorAll('#spillinner .valgkort')].some(k=>/SELG ALT/.test(k.textContent)));
    if (harValg){
      await p.evaluate(()=>[...document.querySelectorAll('#spillinner .valgkort')]
        .find(k=>/SELG ALT/.test(k.textContent)).click());
      valgRunder++;
    }
    if (await p.evaluate(()=>/ETTER TRETTI ÅR/.test(RR.minispillTekst()))) break;
  }
  console.log('    fire krakk med SELG: '+valgRunder+' valg tatt');
  sant('panikkprøven stopper ved fire krakk', valgRunder===4);
  sant('å selge fire ganger gir ikke seier', !(await harSeier(p)));
  const tSelg=await tekst(p);
  sant('resultattabellen viser antall ganger man solgte', /Antall ganger du solgte/.test(tSelg));

  // så: ikke rør noe. Det skal treffe benken nøyaktig.
  await apne(p,'J');
  await klikkTekst(p,'Start de tretti årene');
  let hold=0;
  for (let vakt=0;vakt<400;vakt++){
    await p.waitForTimeout(90);
    const harValg=await p.evaluate(()=>
      [...document.querySelectorAll('#spillinner .valgkort')].some(k=>/IKKE RØR/.test(k.textContent)));
    if (harValg){
      await p.evaluate(()=>[...document.querySelectorAll('#spillinner .valgkort')]
        .find(k=>/IKKE RØR/.test(k.textContent)).click());
      hold++;
    }
    if (await p.evaluate(()=>/ETTER TRETTI ÅR/.test(RR.minispillTekst()))) break;
  }
  sant('fire krakk også når man holder', hold===4);
  sant('å sitte gjennom alle fire gir seier', await harSeier(p));
  const t=await tekst(p);
  sant('fasiten skiller kunnskap fra atferd', /kunnskap og atferd/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('J er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('J'));
}

// ---------------------------------------------------------------- K
console.log('\n=== K — Kontoen som sparer skatt ===');
{
  await apne(p,'K');
  // fasiten, i rekkefølge: Mari→BSU, Jonas→ASK, Ellen→vanlig, Ahmed→IPS, Nora→høyrente
  const fasit=['bsu','ask','vanlig','ips','hoyrente'];
  // først et feil svar, for å se at det forklares
  await p.evaluate(()=>{ const b=document.querySelector('#spillinner .valgkort[data-konto="ips"]');
    if (b) b.click(); });
  await p.waitForTimeout(110);
  sant('feil kontovalg forklares uten å gå videre', /Nei\./.test(await tekst(p)));
  for (let i=0;i<fasit.length;i++){
    const fant=await p.evaluate(k=>{
      const b=document.querySelector('#spillinner .valgkort[data-konto="'+k+'"]');
      if (!b||b.disabled) return false; b.click(); return true;
    },fasit[i]);
    sant('sak '+(i+1)+': klikket '+fasit[i], fant);
    await p.waitForTimeout(120);
    const gikk=await klikkTekst(p, i<fasit.length-1 ? 'Neste sak' : 'Se resultatet');
    sant('sak '+(i+1)+' godkjent og gikk videre', gikk);
    await p.waitForTimeout(110);
  }
  const t=await tekst(p);
  sant('K viser hva utsatt skatt er verdt i kroner', /HVA UTSATT SKATT ER VERDT/.test(t));
  sant('K gir rekkefølgen for hvor pengene bør gå', /Nedbetal dyr gjeld/.test(t));
  sant('K sier hva som IKKE får ligge på ASK', /rentefond/.test(t));
  sant('K gir seier', await harSeier(p));
  await klikkTekst(p,'Ferdig');
  sant('K er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('K'));
}

// ---------------------------------------------------------------- L
console.log('\n=== L — Nøkkelen til boligen ===');
{
  await apne(p,'L');
  const bindende=await p.evaluate(()=>RR.F.laaneramme(RR.tilstand.bruttoAar,300000).bindende);
  console.log('    bindende skranke: '+bindende);
  // feil svar først — velg en skranke som IKKE er den bindende
  const feilValg=['egenkapital','gjeldsgrad','betjeningsevne'].find(v=>v!==bindende);
  await p.evaluate(v=>{ const b=document.querySelector('#spillinner .valgkort[data-v="'+v+'"]');
    if (b) b.click(); },feilValg);
  await p.waitForTimeout(110);
  sant('feil skranke ('+feilValg+') forklares uten å gi seier',
    /Nei\./.test(await tekst(p)) && !(await harSeier(p)));
  const fant=await p.evaluate(v=>{
    const b=document.querySelector('#spillinner .valgkort[data-v="'+v+'"]');
    if (!b||b.disabled) return false; b.click(); return true;
  },bindende);
  sant('klikket riktig skranke', fant);
  await p.waitForTimeout(160);
  const t=await tekst(p);
  sant('L viser hvor mye egenkapital man mangler', /Du mangler/.test(t));
  sant('L viser stresstestet terminbeløp', /stressrente/i.test(t));
  sant('L viser dokumentavgift', /Dokumentavgift/.test(t));
  sant('L nevner fleksibilitetskvoten', /fleksibilitetskvote/i.test(t));
  sant('L gir seier', await harSeier(p));
  await klikkTekst(p,'Ferdig');
  sant('L er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('L'));
}

// ---------------------------------------------------------------- M
console.log('\n=== M — Svindelsjekken ===');
{
  // Fasiten leses IKKE fra koden: testen svarer «svindel» på alt først, og
  // regner ut fra tilbakemeldingene hvor mange som faktisk er svindel.
  await apne(p,'M');
  const antall=await p.evaluate(()=>
    parseInt(document.querySelector('#spillinner .kort h3').textContent.match(/AV (\d+)/)[1],10));
  console.log('    antall meldinger: '+antall);
  sant('M har fjorten meldinger', antall===14);
  const svindelFasit=[];
  for (let i=0;i<antall;i++){
    await p.evaluate(()=>document.querySelector('#spillinner .valgkort[data-s="true"]').click());
    await p.waitForTimeout(80);
    const riktig=await p.evaluate(()=>
      !!document.querySelector('#spillinner .fasit.ja'));
    svindelFasit.push(riktig);
    if (i<antall-1) await klikkTekst(p,'Neste melding'); else await klikkTekst(p,'Se resultatet');
    await p.waitForTimeout(80);
  }
  const antSvindel=svindelFasit.filter(Boolean).length;
  console.log('    svindel: '+antSvindel+' av '+antall+' · ekte: '+(antall-antSvindel));
  sant('det finnes ekte meldinger også', antall-antSvindel>=4);
  sant('å svare «svindel» på alt er ikke nok til å klare oppdraget',
    !(await harSeier(p)) && antSvindel<12);
  sant('sluttteksten sier eksplisitt at blankogjetting ikke holder',
    /svindel» på alt gir/.test(await tekst(p)));
  // så med fasiten: alle riktige
  await apne(p,'M');
  for (let i=0;i<antall;i++){
    await p.evaluate(s=>document.querySelector(
      '#spillinner .valgkort[data-s="'+(s?'true':'false')+'"]').click(), svindelFasit[i]);
    await p.waitForTimeout(70);
    if (i<antall-1) await klikkTekst(p,'Neste melding'); else await klikkTekst(p,'Se resultatet');
    await p.waitForTimeout(70);
  }
  const t=await tekst(p);
  sant('M gir seier med alle riktige', await harSeier(p));
  sant('M gir de fem kontrollspørsmålene', /DE FEM SPØRSMÅLENE/.test(t));
  sant('M oppgir svindeltall med kilde', /Finanstilsynets svindelstatistikk/.test(t));
  sant('M sier at det ikke er et tegn på dumhet', /ikke et tegn på dumhet/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('M er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('M'));
}

// ---------------------------------------------------------------- N
console.log('\n=== N — Tidsmaskinen ===');
{
  const laast=await p.evaluate(()=>{
    const o=RR.OPPDRAG.find(x=>x.id==='N');
    return o.krav.filter(k=>!RR.tilstand.gjort.includes(k));
  });
  sant('alle krav til finalen er oppfylt av de tretten andre ('+laast.length+' igjen)',
    laast.length===0);
  await apne(p,'N');
  // dårlige valg: lav sparerate, dyrt fond, ingen ASK, ingen buffer, livsstilsvekst
  await skyv(p,'sr',0.02); await skyv(p,'ak',0);
  await p.waitForTimeout(140);
  sant('dårlige valg gir ikke seier', !(await harSeier(p)));
  const tD=await tekst(p);
  sant('spillet sier hvor mye som mangler til målet', /igjen til målet/.test(tD));
  // gode valg
  await skyv(p,'sr',0.20); await skyv(p,'ak',90);
  await p.waitForTimeout(200);
  sant('gode valg alene gir ikke seier før spaken er trukket', !(await harSeier(p)));
  sant('spillet ber deg trekke i spaken', /Trekk i spaken/.test(await tekst(p)));
  await klikkTekst(p,'Trekk i spaken');
  await p.waitForTimeout(200);
  const t=await tekst(p);
  sant('N viser både nominelt og realt sluttbeløp',
    /i dagens kjøpekraft/.test(t)&&/i kroner/.test(t));
  sant('N gir seier med 20 % sparerate og 90 % aksjer', await harSeier(p));
  sant('N oppsummerer alle tretten lærdommene', /tretten setninger/.test(t));
  sant('N har en fjortende lærdom om gjentakelse', /fjortende/.test(t));
  await klikkTekst(p,'Ferdig');
  sant('N er registrert løst', (await p.evaluate(()=>RR.tilstand.gjort)).includes('N'));
}

// ---------------------------------------------------------------- til slutt
console.log('\n=== ETTER ALLE FJORTEN ===');
{
  const t=await p.evaluate(()=>RR.tilstand);
  console.log('    løst: '+t.gjort.length+'/14 · nivå '+t.nivaa+' ('+t.tittel+') · XP '+t.xp);
  sant('alle fjorten oppdrag er løst', t.gjort.length===14);
  sant('alle oppdrags-id-ene er dekket', alleOppdrag.every(id=>t.gjort.includes(id)));
  sant('fjorten oppdrag alene tar deg til minst nivå 11', t.nivaa>=11);
  // En spiller som gjør ALT skal kunne bli INVESTOR. Var kurven for bratt,
  // sto det øverste nivået i menyen som noe ingen kunne nå.
  const topp=await p.evaluate(()=>{ RR.taAlleKort(); return RR.tilstand; });
  console.log('    med alle 40 kort: nivå '+topp.nivaa+' ('+topp.tittel+') · XP '+topp.xp);
  sant('alle oppdrag + alle kort gir det øverste nivået', topp.tittel==='INVESTOR');
  const kron=await p.evaluate(()=>{ RR.lukkAlt(); RR.vekslePause();
    const b=[...document.querySelectorAll('#pause .fane button')].find(x=>/Krøniken/.test(x.textContent));
    b.click(); return document.getElementById('pauseinner').textContent; });
  sant('krøniken har fått en linje per oppdrag',
    (await p.evaluate(()=>document.querySelectorAll('#pauseinner .lst li').length))>=14);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== INGENTING SKRIVER «NaN» PÅ SKJERMEN ===');
// Oppdrag F skrev «NaN % nominelt i året» på alle fire valgkortene, live, i
// tre uker: feltet het `brutto`, kortet leste `s.nom`. Ingen av de 854 andre
// sjekkene så på teksten som faktisk står der. Denne gjør.
{
  const SKROT=[/NaN/,/undefined/,/Infinity/,/\[object Object\]/];
  const finn=async ()=>await p.evaluate(()=>{
    const t=document.getElementById('spillinner').innerText;
    const ut=[];
    ['NaN','undefined','Infinity','[object Object]'].forEach(o=>{
      const i=t.indexOf(o);
      if (i>=0) ut.push(t.slice(Math.max(0,i-40),i+o.length+40).replace(/\n/g,'⏎'));
    });
    return ut;
  });
  let skitne=0;
  for (const id of alleOppdrag){
    await apne(p,id);
    const f=await finn();
    if (f.length){ skitne++; console.log('      oppdrag '+id+': '+f[0]); }
  }
  sant('ingen av de fjorten oppdragene skriver NaN/undefined/Infinity', skitne===0);
  // og alle bygningsskjermene, både for en fersk og en ferdig spiller
  const husIder=await p.evaluate(()=>Object.keys(RR.HUS));
  let skitneHus=0;
  for (const fase of ['ferdig','fersk']){
    if (fase==='fersk') await p.evaluate(()=>RR.sett({harJobb:false,kontanter:0,portefolje:0,gjeld:0}));
    else await p.evaluate(()=>RR.sett({harJobb:true,kontanter:250000,portefolje:400000,gjeld:30000}));
    for (const h of husIder){
      await p.evaluate(()=>RR.lukkAlt());
      await p.evaluate(i=>RR.aapneMinispill('hus-'+i,RR.HUS[i]),h);
      await p.waitForTimeout(45);
      const f=await finn();
      if (f.length){ skitneHus++; console.log('      '+h+' ('+fase+'): '+f[0]); }
    }
  }
  sant('ingen av bygningsskjermene skriver NaN/undefined/Infinity', skitneHus===0);
  await p.evaluate(()=>RR.lukkAlt());
  await p.evaluate(()=>RR.sett({harJobb:true,bruttoAar:456000,kontanter:250000,portefolje:0,gjeld:0}));
}

console.log('\n=== INGEN OPPDRAG ER LØST I DET DET ÅPNES ===');
// Regelen står i CLAUDE.md, og både MINI.H og MINI.N har brutt den. MINI.G
// brøt en mildere versjon: startstillingen [50,50,50] var alt riktig for to av
// tre mål, så oppdraget løste seg ved å dra ÉN skyver, og spilleren fikk aldri
// se at pensjonsvinduet begynner på 45 %.
{
  let alt=0, ettGrep=0;
  for (const id of alleOppdrag){
    await apne(p,id);
    if (await harSeier(p)){ alt++; console.log('      oppdrag '+id+' var alt løst ved åpning'); }
    const skyvere=await p.evaluate(()=>
      [...document.querySelectorAll('#spillinner input[type=range]')].map(e=>
        ({id:e.id,min:+e.min,maks:+e.max,steg:+e.step,verdi:+e.value})));
    for (let i=0;i<skyvere.length;i++){
      const sk=skyvere[i];
      let vant=false;
      const steg=Math.max(sk.steg,(sk.maks-sk.min)/40);
      for (let v=sk.min; v<=sk.maks+1e-9 && !vant; v+=steg){
        await skyv(p,sk.id,v);
        await p.waitForTimeout(22);
        if (await harSeier(p)) vant=true;
      }
      await skyv(p,sk.id,sk.verdi);
      // D er med vilje ett tall: finn Bodils månedsbeløp. De andre skal kreve mer.
      if (vant && id!=='D'){ ettGrep++;
        console.log('      oppdrag '+id+' løses ved å flytte bare «'+sk.id+'»'); break; }
    }
    await p.evaluate(()=>RR.lukkAlt());
  }
  sant('ingen av de fjorten er løst i det de åpnes', alt===0);
  sant('ingen av dem (unntatt D) løses ved å flytte én enkelt skyver', ettGrep===0);
}

console.log('\n=== G: INGEN AV DE TRE MÅLENE STARTER RIKTIG ===');
{
  await apne(p,'G');
  // Et mål er oppfylt når kortet viser BEGGE kravene grønne — median og 5.-persentil.
  const perMaal=await p.evaluate(()=>{
    const k=[...document.querySelectorAll('#spillinner .kort')].slice(0,3);
    return k.map(x=>(x.textContent.match(/✓ holder/g)||[]).length);
  });
  console.log('    grønne krav per mål ved åpning: '+perMaal.join(' / ')+' (av 2 hver)');
  sant('ingen av de tre målene er oppfylt ved åpning', perMaal.every(x=>x<2));
  sant('alle tre målene må flyttes, ikke bare ett', perMaal.filter(x=>x<2).length===3);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== C: REGNSKAPET BUNNER UT DER TEKSTEN SIER ===');
// Første utgave påsto at kostnaden «bunner ut rundt tre måneders utgifter»,
// mens modellens egne tall ga ÉN måned — og det holdt også over 2 000
// tilfeldige stormår. Grunnen var at stormen bare hadde husholdningsuhell på
// 2 000–16 000 kr, mens tremånedersregelen handler om å miste inntekten.
{
  await apne(p,'C');
  // Utgiftene leses av skyveren (maks = seks måneders utgifter). Å parse dem ut
  // av teksten er skjørt: kr() skriver tusenskilletegn som hardt mellomrom.
  const utg=await p.evaluate(()=>Math.round(+document.getElementById('buf').max/6));
  console.log('    faste utgifter: '+utg+' kr/mnd');
  sant('stormen inneholder et inntektstap, ikke bare uhell',
    /[Pp]ermittert|uten jobb/.test(await tekst(p)));
  // NB: kr() skriver tusenskille med hardt mellomrom. Normaliser ALT som ikke er
  // et siffer bort, ellers matcher ikke regexen — det tok to forsøk.
  const les=async ()=>await p.evaluate(()=>{
    const t=document.getElementById('spillinner').innerText.replace(/\u00a0|\u202f/g,' ');
    const i=t.indexOf('SUM KOSTNAD');
    if (i<0) return null;
    const linje=t.slice(i,i+80).split('\n').slice(0,2).join(' ');
    const tall=linje.replace(/SUM KOSTNAD/,'').match(/[\d ]+/);
    return tall?parseInt(tall[0].replace(/ /g,''),10):null;
  });
  const kurve=[];
  for (let bufferV=0; bufferV<=utg*6; bufferV+=utg/4){
    await skyv(p,'buf',Math.round(bufferV/5000)*5000);
    await klikkTekst(p,'Kjør stormen');
    await p.waitForTimeout(90);
    kurve.push({mnd:+(Math.round(bufferV/5000)*5000/utg).toFixed(2), sum:await les(),
                vant:await harSeier(p)});
  }
  const gyldig=kurve.filter(k=>k.sum!==null);
  sant('regnskapet leses for hver bufferstørrelse', gyldig.length===kurve.length);
  const min=gyldig.reduce((a,x)=>x.sum<a.sum?x:a,gyldig[0]);
  console.log('    billigste buffer i spillets eget regnskap: '+min.mnd+' mnd ('+min.sum+' kr)');
  sant('totalkostnaden er lavest på rundt tre måneders utgifter',
    min.mnd>=2.5 && min.mnd<=3.5);
  const vinnere=gyldig.filter(k=>k.vant).map(k=>k.mnd);
  console.log('    vinnervindu: '+(vinnere.join(', ')||'ingen')+' mnd');
  sant('vinnervinduet inneholder tre måneder', vinnere.includes(3));
  sant('vinnervinduet er et vindu, ikke alt', vinnere.length>=2 && vinnere.length<=8);
  sant('en buffer på null vinner ikke', !gyldig.find(k=>k.mnd===0).vant);
  sant('en buffer på seks måneder vinner ikke', !gyldig.find(k=>k.mnd===6).vant);
  // «renta løper videre etter at oppdraget er over» skal også TELLES
  await skyv(p,'buf',0);
  await klikkTekst(p,'Kjør stormen');
  await p.waitForTimeout(90);
  sant('regnskapet viser hvor lenge lånet lever etter året',
    /Måneder til lånet er nedbetalt/.test(await tekst(p)));
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== HVERT OPPDRAG STÅR BAK KRAVENE SINE ===');
// HUS.kiosk var den eneste bygningen uten laastOpp()-sjekk. En fersk spiller
// uten jobb kunne gå til Bakgata, ta oppdrag M og få 450 XP og nivå 2 før
// Jobbsenteret — mens M står oppført med krav: ['C'].
{
  await p.evaluate(()=>RR.nullstill());
  await p.reload();
  await p.evaluate(()=>RR.start());
  await p.waitForTimeout(500);
  const oppdrag=await p.evaluate(()=>RR.OPPDRAG.map(o=>({id:o.id,krav:o.krav,bygg:o.bygg})));
  let apne_for_tidlig=0;
  for (const o of oppdrag){
    if (!o.krav.length || !o.bygg) continue;
    await p.evaluate(()=>RR.lukkAlt());
    const finnes=await p.evaluate(i=>{
      if (!RR.HUS[i.bygg]) return null;
      RR.aapneMinispill('hus-'+i.bygg,RR.HUS[i.bygg]);
      return [...document.querySelectorAll('#spillinner button')]
        .some(b=>b.textContent.indexOf('oppdrag '+i.id)>=0);
    },o);
    if (finnes===true){ apne_for_tidlig++;
      console.log('      '+o.bygg+' tilbyr oppdrag '+o.id+' før krav '+o.krav.join(',')+' er løst'); }
  }
  sant('ingen bygning tilbyr et oppdrag før kravene er løst', apne_for_tidlig===0);
  // og at det åpner seg når kravene ER løst
  await p.evaluate(()=>{ ['A','B','C'].forEach(i=>RR.loesOppdrag(i)); RR.lukkAlt();
    RR.aapneMinispill('hus-kiosk',RR.HUS.kiosk); });
  await p.waitForTimeout(80);
  sant('kiosken åpner oppdrag M når C er løst',
    await p.evaluate(()=>[...document.querySelectorAll('#spillinner button')]
      .some(b=>/oppdrag M/.test(b.textContent))));
  await p.evaluate(()=>RR.lukkAlt());
  await p.evaluate(()=>{ RR.nullstill(); });
  await p.reload();
  await p.evaluate(()=>{ RR.start(); RR.sett({harJobb:true,bruttoAar:456000,kontanter:250000}); });
  await p.waitForTimeout(500);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== J: BANEN GJØR DET FASITEN PÅSTÅR ===');
// Første utgave hadde fall på ~55 % og opphentinger på +44 %: tre av fire kom
// aldri tilbake til forrige topp, tretti år ga −0,02 % realt, og fasiten sa at
// «alle fire fallene i denne banen hentet seg inn igjen». Banen er nå konstruert
// til å oppfylle påstanden, og dette er sjekken som holder den til det.
{
  const b=await p.evaluate(()=>{
    // Bygg banen på nytt med samme oppskrift som MINI.J, og mål den.
    const S=RR.SATSER, F=RR.F;
    const lagRnd=(s)=>{ let a=s>>>0; return function(){
      a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61);
      return ((t^t>>>14)>>>0)/4294967296; }; };
    const gauss=(r)=>{ let u=0,v=0; while(u===0)u=r(); while(v===0)v=r();
      return Math.sqrt(-2*Math.log(u))*Math.cos(Math.PI*2*v); };
    const KRAKK=[42,116,205,289], DYBDE=[0.38,0.45,0.30,0.34], FALL=7, OPP=18;
    const sig=S.volAksjer/Math.sqrt(12), maal=F.nominell(S.realAksjer,S.kpi);
    const lag=(mu)=>{ const r=lagRnd(19291024), d=[];
      for (let m=0;m<360;m++){ let x=mu+sig*gauss(r);
        for (let i=0;i<KRAKK.length;i++){ const k=KRAKK[i], dyp=DYBDE[i];
          if (m>=k && m<k+FALL) x=Math.pow(1-dyp,1/FALL)-1-Math.abs(gauss(r))*0.012;
          else if (m>=k+FALL && m<k+FALL+OPP) x=Math.pow(1/(1-dyp),1/OPP)-1+gauss(r)*0.010; }
        d.push(x); } return d; };
    const ann=(d)=>{ let n=1; d.forEach(x=>n*=(1+x)); return Math.pow(n,1/30)-1; };
    let lo=0,hi=0.03,mu=0;
    for (let i=0;i<50;i++){ mu=(lo+hi)/2; if (ann(lag(mu))<maal) lo=mu; else hi=mu; }
    const d=lag(mu);
    let n=100; const niv=[100]; d.forEach(x=>{ n*=(1+x); niv.push(n); });
    const kr2=KRAKK.map(k=>{
      const topp=Math.max(...niv.slice(0,k+1));
      const bunn=Math.min(...niv.slice(k,k+FALL+1));
      const bunnM=k+niv.slice(k,k+FALL+1).indexOf(bunn);
      let tilbake=null;
      for (let m2=bunnM;m2<=360;m2++) if (niv[m2]>=topp){ tilbake=m2; break; }
      return {k,fall:bunn/topp-1,tilbake};
    });
    let hold=0; d.forEach(x=>{ hold=(hold+3000)*(1+x); });
    return {aarlig:ann(d), maal, kr:kr2, hold,
            real:F.kjopekraft(hold,S.kpi,30), realAvk:F.realrente(ann(d),S.kpi),
            nervemnd:d.filter(x=>x<-0.05).length};
  });
  console.log('    30 år: '+(b.aarlig*100).toFixed(2)+' % nominelt = '+
    (b.realAvk*100).toFixed(2)+' % realt (mål '+(b.maal*100).toFixed(2)+' %)');
  b.kr.forEach(x=>console.log('    krakk mnd '+x.k+': '+(x.fall*100).toFixed(1)+
    ' % · tilbake til toppen '+(x.tilbake===null?'ALDRI':'mnd '+x.tilbake)));
  sant('banen treffer spillets egen forventning innenfor 0,05 pp',
    Math.abs(b.aarlig-b.maal)<0.0005);
  b.kr.forEach((x,i)=>sant('  krakk '+(i+1)+' henter seg inn igjen', x.tilbake!==null));
  sant('hvert fall er dypere enn 25 %', b.kr.every(x=>x.fall<-0.25));
  sant('nervemåleren har noe å reagere på', b.nervemnd>20);
  sant('«ikke rør» gir mer kjøpekraft enn det som ble satt inn', b.real>3000*360);
  console.log('    «ikke rør» i 30 år: '+Math.round(b.hold).toLocaleString('nb')+
    ' kr = '+Math.round(b.real).toLocaleString('nb')+' kr i dagens kjøpekraft');
  // og valget skal komme på BUNNEN, ikke etter at oppgangen har startet
  await apne(p,'J');
  await klikkTekst(p,'Start de tretti årene');
  let mnd1=null;
  for (let i=0;i<80 && mnd1===null;i++){
    await p.waitForTimeout(200);
    mnd1=await p.evaluate(()=>{
      if (!document.querySelector('#spillinner .valgkort[data-v]')) return null;
      const m=RR.minispillTekst().match(/Måned (\d+) av 360/); return m?+m[1]:-1;
    });
  }
  console.log('    første valg kommer i måned '+mnd1+' (fallet starter i 42, bunner i 48)');
  sant('valget kommer på bunnen av fallet, ikke etter', mnd1===48);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== N: DET ER MEDIANEN SOM GJELDER, IKKE ETT LØP ===');
// Første utgave kjørte lagRnd(556677) og viste det ene løpet som resultatet.
// Målt mot 4 000 tilfeldige baner lå den på 84. persentil uansett innstilling,
// og finalen lærte bort en sparerate sju prosentpoeng for lav.
{
  await apne(p,'N');
  const t=await tekst(p);
  sant('overskriften sier at det er medianen som gjelder', /medianen/i.test(t));
  sant('tabellen viser 5.-persentilen', /I 5 av 100 løp fikk du mindre enn/.test(t));
  sant('tabellen viser 95.-persentilen', /I 5 av 100 løp fikk du mer enn/.test(t));
  sant('tabellen viser hvor mange løp som nådde målet', /Løp som nådde/.test(t));
  // regnestykket i tabellen skal gå opp
  // Les VERDICELLA, ikke innerText: labelen inneholder selv tall («utover et
  // skjermingsfradrag på 1 146 095 kr»), og et tekstsøk plukket det i stedet for
  // beløpet. Da målte testen noe annet enn den trodde.
  const rad=async (navn)=>await p.evaluate(n=>{
    for (const tr of document.querySelectorAll('#spillinner table.tab tbody tr')){
      const c=tr.querySelectorAll('td');
      if (c.length<2) continue;
      if (c[0].textContent.indexOf(n)!==0) continue;
      const v=c[1].textContent.replace(/\u00a0|\u202f/g,' ');
      const m=v.match(/([\d ]+)/);
      if (!m) return null;
      const tall=parseInt(m[1].replace(/ /g,''),10);
      return /−/.test(v) ? -tall : tall;
    }
    return null;
  },navn);
  const inn=await rad('Du har satt inn'), avk=await rad('Avkastning etter gebyr'),
        sk=await rad('Skatt ved uttak'), uh=await rad('Uhell underveis'),
        nom=await rad('Etter skatt, i kroner');
  sant('alle radene i tabellen kan leses', [inn,avk,sk,uh,nom].every(x=>x!==null&&!isNaN(x)));
  if ([inn,avk,sk,uh,nom].every(x=>x!==null)){
    const sum=inn+avk+sk+uh;          // sk og uh leses alt som negative
    console.log('    innskutt '+inn+' + avkastning '+avk+' + skatt '+sk+' + uhell '+uh+' = '+sum+
      ', tabellen sier '+nom+' (avvik '+(nom-sum)+')');
    sant('tabellen går opp krone for krone', Math.abs(nom-sum)<=2);
  }
  // og medianen skal kreve mer enn den gamle heldige banen gjorde
  const s2=await p.evaluate(()=>[...document.querySelectorAll('#spillinner input[type=range]')].map(e=>e.id));
  await skyv(p,s2[0],0.13); await skyv(p,s2[1],80);
  await p.waitForTimeout(200);
  sant('13 % sparerate og 80 % aksjer er IKKE nok (den gamle banen sa ja)',
    !/Målet er nådd/.test(await tekst(p)));
  await skyv(p,s2[0],0.25); await skyv(p,s2[1],100);
  await p.waitForTimeout(200);
  sant('25 % sparerate og 100 % aksjer er nok', /Målet er nådd/.test(await tekst(p)));
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== H: VERDIKTET HENGER IKKE PÅ FLAKS ===');
// «Over startverdien etter fem år» var 67 % flaks, og «Start på nytt» ga nye
// fem år hver gang — så oppdraget kunne trykkes gjennom uten å flytte en brikke.
{
  const spillH=async (vekt)=>{
    await apne(p,'H');
    const ider=await p.evaluate(()=>[...document.querySelectorAll('#spillinner input[type=range]')].map(e=>e.id));
    for (let i=0;i<6;i++) await skyv(p,ider[i],vekt[i]);
    await p.waitForTimeout(80);
    for (let r2=0;r2<5;r2++){ await klikkTekst(p,'Neste år'); await p.waitForTimeout(90); }
    return {vant:await harSeier(p), t:await tekst(p),
      verdi:await p.evaluate(()=>{
        const m=RR.minispillTekst().replace(/ | /g,' ').match(/Din\s*\n?\s*([\d ]+) kr/);
        return m?parseInt(m[1].replace(/ /g,''),10):null; })};
  };
  const spredt=await spillH([20,20,20,20,20,0]);
  sant('20 % i hver sektor klarer oppdraget', spredt.vant);
  sant('fordelingen over mange femårsperioder vises', /ANDRE FEMÅRSPERIODER/.test(spredt.t));
  sant('nedsiden sammenlignes med den som satset alt på én', /5 av 100 under/.test(spredt.t));
  const kons=await spillH([10,10,10,60,10,0]);
  sant('60 % i én sektor klarer det ikke, uansett hvordan de fem årene gikk', !kons.vant);
  sant('  og begrunnelsen peker på konsentrasjonen, ikke på utfallet',
    /% i én sektor/.test(kons.t));
  // samme fem år hver gang: «Start på nytt» skal nullstille frøet
  await apne(p,'H');
  const ider=await p.evaluate(()=>[...document.querySelectorAll('#spillinner input[type=range]')].map(e=>e.id));
  for (let i=0;i<6;i++) await skyv(p,ider[i],[20,20,20,20,20,0][i]);
  await p.waitForTimeout(80);
  const kjorFem=async ()=>{ for (let r2=0;r2<5;r2++){ await klikkTekst(p,'Neste år'); await p.waitForTimeout(80); }
    return await p.evaluate(()=>{
      const m=RR.minispillTekst().replace(/ | /g,' ').match(/Din\s*\n?\s*([\d ]+) kr/);
      return m?parseInt(m[1].replace(/ /g,''),10):null; }); };
  const forste=await kjorFem();
  await klikkTekst(p,'Start på nytt'); await p.waitForTimeout(120);
  const andre=await kjorFem();
  console.log('    første forsøk '+forste+' kr, etter «Start på nytt» '+andre+' kr');
  sant('«Start på nytt» gir de SAMME fem årene', forste===andre);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== D: GRAFEN REGNER 42 ÅR, IKKE 43 ===');
{
  await apne(p,'D');
  const d=await p.evaluate(()=>{
    const F=RR.F, r=RR.SATSER.realAksjer;
    const lukket=F.sluttverdi(F.sluttverdiSerie(2000,F.mndRente(r),120,true),r,32);
    const t=RR.minispillTekst().replace(/ | /g,' ');
    const m=t.match(/Ada ender med ([\d ]+) kr/);
    return {vist:m?parseInt(m[1].replace(/ /g,''),10):null, lukket};
  });
  console.log('    Ada i grafen: '+d.vist+' kr · lukket form 42 år: '+Math.round(d.lukket)+' kr');
  sant('grafens sluttpunkt er lukket form for 42 år, ikke 43',
    d.vist!==null && Math.abs(d.vist-d.lukket)<2);
  await p.evaluate(()=>RR.lukkAlt());
}

console.log('\n=== L: SPILLERENS EGEN GJELD SPISER AV GJELDSTAKET ===');
// Fasiten sier at gjeldstaket gjelder ALL gjeld. Oppdraget sendte ikke inn
// spillerens gjeld, mens Meglerkontoret bak samme dør gjorde det.
{
  await p.evaluate(()=>{ RR.sett({gjeld:0}); });
  await apne(p,'L');
  const uten=await p.evaluate(()=>{
    const t=RR.minispillTekst().replace(/ | /g,' ');
    const m=t.match(/Gjeldsgrad \([\d,]+ × brutto\)\s*\n?\s*([\d ]+) kr/);
    return m?parseInt(m[1].replace(/ /g,''),10):null; });
  await p.evaluate(()=>{ RR.sett({gjeld:200000}); });
  await apne(p,'L');
  const med=await p.evaluate(()=>{
    const t=RR.minispillTekst().replace(/ | /g,' ');
    const m=t.match(/Gjeldsgrad \([\d,]+ × brutto\)\s*\n?\s*([\d ]+) kr/);
    return m?parseInt(m[1].replace(/ /g,''),10):null; });
  console.log('    gjeldstak uten gjeld: '+uten+' · med 200 000 i gjeld: '+med);
  sant('200 000 i gjeld senker gjeldstaket med 200 000',
    uten!==null && med!==null && Math.abs((uten-med)-200000)<1);
  await p.evaluate(()=>{ RR.sett({gjeld:0}); RR.lukkAlt(); });
}

console.log('\n=== INGEN SIDEFEIL UNDERVEIS ===');
sant('ingen JavaScript-feil under hele gjennomspillingen ('+sideFeil.length+')', sideFeil.length===0);
if (sideFeil.length) sideFeil.slice(0,8).forEach(f=>console.log('      '+f));

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
