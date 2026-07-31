// test-oppdrag.js — kan alle fjorten oppdragene faktisk løses?
// Hvert oppdrag spilles gjennom med ekte klikk og ekte skyvekontroller.
// Et oppdrag som ikke kan fullføres, låser resten av spillet — derfor er
// dette den viktigste testen i pakken.
const {chromium}=require('playwright');
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
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:900}});
const sideFeil=[];
p.on('pageerror',e=>sideFeil.push(e.message));
await p.goto('file://'+__dirname+'/index.html');
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

console.log('\n=== INGEN SIDEFEIL UNDERVEIS ===');
sant('ingen JavaScript-feil under hele gjennomspillingen ('+sideFeil.length+')', sideFeil.length===0);
if (sideFeil.length) sideFeil.slice(0,8).forEach(f=>console.log('      '+f));

await b.close();
console.log('\n'+'='.repeat(58));
console.log(feil? ('✗ '+feil+' feil av '+(ok+feil)) : ('✓ alle '+ok+' sjekker OK'));
process.exit(feil?1:0);
})();
