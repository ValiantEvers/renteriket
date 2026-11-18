// test-budrunden.js — øvingsrommet for budrunden (budrunden.html, idé 72).
// Siden har sin egen kopi av fire satser og av F.maksBud. Slike kopier råtner stille, så
// testen sammenligner dem med spillet. Motbyderne er en modell, så det som måles er det
// siden lover: at den som holder grensen aldri får feil, at den som byr over alltid får det,
// og at den som gir opp før grensen blir fortalt det. Og at det kan spilles med ekte klikk,
// med og uten tidspress, med tastatur og på mobil, uten at noe sendes eller lagres.
const path=require('path');
const fs=require('fs');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const CHROMIUM=require('./test-chromium');
let ok=0, feil=0;
function sant(n,x,info){ if (x) ok++; else { feil++; console.log('  ✗ '+n+(info!==undefined?' ('+info+')':'')); } }

const BASE=process.env.RR_URL||pathToFileURL(path.join(__dirname,'index.html')).href;
const BR=new URL('budrunden.html',BASE).href;
const kilde=fs.readFileSync(path.join(__dirname,'budrunden.html'),'utf8');
const spillKilde=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

function luminans(rgb){ const [r,g,b]=rgb.map(v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); });
  return 0.2126*r+0.7152*g+0.0722*b; }
function kontrast(a,b){ const [x,y]=[luminans(a),luminans(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); }
const rgb=s=>s.match(/\d+(\.\d+)?/g).slice(0,3).map(Number);

(async()=>{
  const b=await chromium.launch({executablePath:CHROMIUM});
  const sidefeil=[];
  const ny=async(opt={})=>{ const ctx=await b.newContext({viewport:{width:1200,height:900},...opt});
    const p=await ctx.newPage(); p.on('pageerror',e=>sidefeil.push(e.message)); return [ctx,p]; };

  console.log('\n=== SIDEN MOT SPILLET ===');
  {
    const [ctx,p]=await ny();
    await p.goto(BASE); await p.waitForFunction(()=>window.RR&&RR.F);
    const spillS=await p.evaluate(()=>({d:RR.SATSER.dokumentavgift,s:RR.SATSER.tinglysingSkjote,
      p:RR.SATSER.tinglysingPant,b:RR.SATSER.belaaningsgrad}));
    const tilfeller=await p.evaluate(()=>{ const ut=[]; let a=7;
      const r=()=>{ a=(a*1103515245+12345)%2147483648; return a/2147483648; };
      for (let i=0;i<300;i++){ const selveier=r()<0.5, fg=selveier?0:Math.round(r()*2e6);
        const laan=Math.round(2e6+r()*3e6), ek=Math.round(1e5+r()*9e5);
        ut.push({laan,ek,selveier,fg,f:RR.F.maksBud(laan,ek,selveier,fg)}); }
      return ut; });
    await p.goto(BR+'?sak=11'); await p.waitForFunction(()=>window.BR);
    const sideS=await p.evaluate(()=>BR.SATS);
    sant('dokumentavgiften er spillets', sideS.dokumentavgift===spillS.d, sideS.dokumentavgift+' mot '+spillS.d);
    sant('tinglysingen (skjøte og pant) er spillets', sideS.tinglysingSkjote===spillS.s && sideS.tinglysingPant===spillS.p);
    sant('belåningsgraden er spillets', sideS.belaaningsgrad===spillS.b);
    const avvik=await p.evaluate(t=>t.filter(x=>{ const m=BR.maksBud(x.laan,x.ek,x.selveier,x.fg);
      return Math.abs(m.bud-x.f.bud)>1e-6||m.bindende!==x.f.bindende||Math.abs(m.dokumentavgift-x.f.dokumentavgift)>1e-6; }).length,tilfeller);
    sant('maksBud gir det samme som F.maksBud i 300 tilfeller (selveier og borettslag)', avvik===0, avvik+' avvik');
    sant('fasiten i oppdrag O lenker til øvingsrommet i ny fane',
      /href="budrunden\.html" target="_blank" rel="noopener" id="budrundelenke"/.test(spillKilde));
    sant('lenker i en fasit er understreket i spillet', /\.tips a,\.fasit a\{[^}]*text-decoration:underline/.test(spillKilde));
    sant('og får fokusring', /\.fasit a:focus-visible/.test(spillKilde));
    await ctx.close();
  }

  console.log('\n=== MOTOREN, 500 SAKER ===');
  {
    const [ctx,p]=await ny();
    await p.goto(BR+'?sak=11'); await p.waitForFunction(()=>window.BR);
    const m=await p.evaluate(()=>{
      const {lagSak,nyRunde,by,gaaUt,dom,MODELL}=BR;
      const stil={
        disiplin:(s,L)=>{ while(!s.ferdig){ if (s.hoyeste+MODELL.neste<=L) by(s,s.hoyeste+MODELL.neste); else gaaUt(s); } },
        gradig:(s)=>{ let n=0; while(!s.ferdig&&n++<60) by(s,s.hoyeste+25000); if(!s.ferdig) gaaUt(s); },
        girOpp:(s)=>gaaUt(s),
      };
      const res={}, feilJ=[]; let forhold=[], antall=new Set(), typer=new Set(), likt=0;
      for (const [navn,f] of Object.entries(stil)){ res[navn]={};
        for (let fro=1;fro<=500;fro++){ const sak=lagSak(fro); const s=nyRunde(sak); f(s,sak.grense);
          if (navn==='disiplin'){ forhold.push(sak.grense/sak.prisantydning); antall.add(sak.motbydere.length);
            sak.motbydere.forEach(x=>typer.add(x.type)); }
          // the journal: rising bids, whole thousands, time never goes back, deadline after the bid
          s.journal.forEach((j,i)=>{ const f0=s.journal[i-1];
            if (j.belop%1000||j.frist<j.tid||(f0&&(j.belop<=f0.belop||j.tid<f0.tid))) feilJ.push(fro); });
          const d=dom(s).kode; res[navn][d]=(res[navn][d]||0)+1; } }
      // the same seed and the same moves give the same round
      for (let fro=1;fro<=50;fro++){ const a=nyRunde(lagSak(fro)), c=nyRunde(lagSak(fro));
        stil.disiplin(a,a.sak.grense); stil.disiplin(c,c.sak.grense);
        if (JSON.stringify(a.journal)===JSON.stringify(c.journal)) likt++; }
      return {res, feilJ:feilJ.length, min:Math.min(...forhold), max:Math.max(...forhold),
        antall:[...antall].sort(), typer:[...typer].sort(), likt, start:nyRunde(lagSak(3)).journal[0].tid};
    });
    const dis=m.res.disiplin;
    sant('den som holder grensen, får aldri feil', !dis.over && !dis.tidlig, JSON.stringify(dis));
    sant('å holde grensen gir både kjøp og tap (hver minst 20 %)', (dis.kjopt||0)>=100 && (dis.riktig||0)>=100, JSON.stringify(dis));
    sant('den som byr videre over grensen, får «bød over» hver gang den ikke vant innenfor',
      m.res.gradig.over===dis.riktig && m.res.gradig.kjopt===dis.kjopt, JSON.stringify(m.res.gradig));
    sant('den som gir opp med en gang, får høre at det var før grensen', (m.res.girOpp.tidlig||0)>=450, JSON.stringify(m.res.girOpp));
    sant('budjournalen er alltid stigende, i hele tusen, med frist etter budet', m.feilJ===0, m.feilJ+' saker');
    sant('grensen ligger 97–111 % av prisantydningen', m.min>=0.97&&m.max<=1.11, m.min.toFixed(3)+'–'+m.max.toFixed(3));
    sant('én til tre motbydere, og alle tre typene forekommer', m.antall.join()==='1,2,3' && m.typer.length===3, m.antall+' / '+m.typer);
    sant('samme sak og samme valg gir samme budrunde (50 av 50)', m.likt===50, m.likt);
    sant('budrunden åpner kl. 12:00', m.start===0);
    await ctx.close();
  }

  // Seeds where holding the limit wins, and where it loses, found from the engine itself.
  const [ctx0,p0]=await ny(); await p0.goto(BR+'?sak=11'); await p0.waitForFunction(()=>window.BR);
  const fro=await p0.evaluate(()=>{ const {lagSak,nyRunde,by,gaaUt,dom,MODELL}=BR; let vinn=0,tap=0;
    for (let f=1;f<400&&(!vinn||!tap);f++){ const s=nyRunde(lagSak(f));
      while(!s.ferdig){ if (s.hoyeste+MODELL.neste<=s.sak.grense) by(s,s.hoyeste+MODELL.neste); else gaaUt(s); }
      const k=dom(s).kode; if (k==='kjopt'&&!vinn&&s.journal.length>=3) vinn=f; if (k==='riktig'&&!tap&&s.journal.length>=4) tap=f; }
    return {vinn,tap}; });
  await ctx0.close();

  // Play the way a player does: type the limit, click the bid buttons, read the result.
  async function spill(p, mal){
    for (let i=0;i<80;i++){
      if (await p.locator('#etterpaa').isVisible()) return;
      const st=await p.evaluate(()=>({h:BR.runde.hoyeste, L:BR.sak.grense}));
      if (mal==='over' || st.h+25000<=st.L) await p.click('#knapper button[data-pluss="25000"]');
      else await p.click('#gaaut');
      await p.waitForTimeout(30);
    }
  }
  const grense=async p=>p.evaluate(()=>BR.sak.grense);
  const nf=x=>new Intl.NumberFormat('nb-NO').format(x).replace(/ /g,' ');

  console.log('\n=== SOM EN SPILLER ===');
  {
    const [ctx,p]=await ny();
    await p.goto(BR+'?sak='+fro.vinn+'&x'); await p.waitForSelector('#sakfakta dd');
    sant('saken står med prisantydning, finansieringsbevis og egenkapital',
      /Prisantydning[\s\S]*Finansieringsbevis[\s\S]*Egenkapital/.test(await p.textContent('#sakfakta')));
    sant('budrunden er skjult til grensen er satt', await p.locator('#runde').isHidden());
    const L=await grense(p);
    await p.fill('#grensefelt', nf(L+50000)); await p.click('#sjekkgrense');
    sant('for høy grense: ✗ For høyt, med regnestykket', /✗ For høyt/.test(await p.textContent('#grensesvar')) &&
      await p.locator('#grensesvar .regn').count()===1);
    sant('budrunden starter ikke på feil grense', await p.locator('#runde').isHidden());
    await p.fill('#grensefelt', nf(L)); await p.press('#grensefelt','Enter');
    sant('riktig grense: ✓ Riktig', /✓ Riktig/.test(await p.textContent('#grensesvar')));
    sant('budrunden starter, og lappen viser grensen', await p.locator('#runde').isVisible() &&
      (await p.textContent('#lapptall')).replace(/\s/g,'')===nf(L).replace(/\s/g,'')+'kr');
    sant('første melding er klokka 12:00', /^12:00/.test(await p.textContent('#strom .sms .tid')));
    await p.check('#utenpress');
    await spill(p,'hold');
    const u=await p.textContent('#utfall');
    sant('holdt grensen og vant: «✓ Kjøpt innenfor grensen»', u==='✓ Kjøpt innenfor grensen', u);
    sant('fokus flyttes til utfallet', await p.evaluate(()=>document.activeElement&&document.activeElement.id==='utfall'));
    const rader=await p.locator('#journal tbody tr').count();
    sant('budjournalen har én rad per bud', rader===await p.evaluate(()=>BR.runde.journal.length) && rader>=3, rader);
    sant('budjournalen er anonymisert (Budgiver 2, 3 … og Du)', /Budgiver 2/.test(await p.textContent('#journal')) &&
      !/Bjarne|Bente/.test(await p.textContent('#journal')));
    sant('øvingsloggen teller runden', /1 runde, grensen holdt i 1/.test(await p.textContent('#loggsum')));

    // Same case again: same bidders, so the same moves give the same journal.
    const j1=await p.evaluate(()=>JSON.stringify(BR.runde.journal));
    await p.click('#sammesak'); await p.fill('#grensefelt', nf(L)); await p.click('#sjekkgrense');
    await spill(p,'hold');
    sant('«Samme sak igjen» gir samme motbydere og samme journal', await p.evaluate(()=>JSON.stringify(BR.runde.journal))===j1);
    sant('øvingsloggen har to runder', /2 runder, grensen holdt i 2/.test(await p.textContent('#loggsum')));

    // A case where the limit loses: holding it is right, and the page says so.
    await p.goto(BR+'?sak='+fro.tap); await p.waitForSelector('#sakfakta dd');
    const L2=await grense(p);
    await p.fill('#grensefelt', nf(L2-30000)); await p.click('#sjekkgrense');
    sant('for lav grense: ✗ For lavt', /✗ For lavt/.test(await p.textContent('#grensesvar')));
    await p.fill('#grensefelt', nf(L2+90000)); await p.click('#sjekkgrense');
    sant('to feil: fasiten vises og runden starter med riktig grense',
      /Fasiten/.test(await p.textContent('#grensesvar')) && await p.locator('#runde').isVisible() &&
      (await p.textContent('#lapptall')).replace(/\s/g,'')===nf(L2).replace(/\s/g,'')+'kr');
    await p.check('#utenpress');
    await spill(p,'hold');
    sant('tapte med grensen holdt: «✓ Riktig å tape»', (await p.textContent('#utfall'))==='✓ Riktig å tape');

    // Bid over the limit with your own amount: ✗, and the text says bids are binding.
    await p.click('#sammesak'); await p.fill('#grensefelt', nf(L2)); await p.click('#sjekkgrense'); await p.check('#utenpress');
    const h=await p.evaluate(()=>BR.runde.hoyeste);
    await p.fill('#egetbud', String(h+5000)); await p.click('#byeget');
    sant('eget bud under minstesteget avvises med beskjed', /⚠ Budet må være minst/.test(await p.textContent('#budfeil')) &&
      await p.locator('#valg').isVisible());
    await p.fill('#egetbud', nf(L2+100000)); await p.press('#egetbud','Enter');
    for (let i=0;i<40&&!(await p.locator('#etterpaa').isVisible());i++){ await p.click('#gaaut'); await p.waitForTimeout(30); }
    const u3=await p.textContent('#utfall');
    sant('bød over grensen: «✗ Du bød over grensen», med at bud er bindende', u3==='✗ Du bød over grensen' &&
      /bindende/.test(await p.textContent('#forklaring')), u3);

    // Give up right away while there is room.
    await p.click('#sammesak'); await p.fill('#grensefelt', nf(L2)); await p.click('#sjekkgrense'); await p.check('#utenpress');
    await p.click('#gaaut');
    sant('ga opp med rom igjen: «⚠ Du ga opp før grensen»', (await p.textContent('#utfall'))==='⚠ Du ga opp før grensen');
    sant('hvert utfall i loggen har symbol og ord', (await p.locator('#loggtab tbody td:last-child').allTextContents())
      .every(t=>/^[✓✗⚠] \S/.test(t)));
    await ctx.close();
  }

  console.log('\n=== TIDSPRESS ===');
  {
    const [ctx,p]=await ny();
    await p.clock.install({time:new Date('2026-11-18T10:00:00Z')});
    await p.goto(BR+'?sak='+fro.tap); await p.waitForSelector('#sakfakta dd');
    await p.fill('#grensefelt', nf(await grense(p))); await p.click('#sjekkgrense');
    sant('nedtellingen står i tekst («s igjen»), ikke bare som en stripe', /\d+ s<\/b> igjen/.test(await p.innerHTML('#frist')));
    await p.clock.runFor(10000);
    sant('etter 10 s er du fortsatt med', await p.locator('#valg').isVisible() && await p.locator('#etterpaa').isHidden());
    await p.clock.runFor(11000);
    sant('etter 21 s uten svar er du ute', await p.locator('#etterpaa').isVisible() &&
      /Vi hørte ikke fra deg/.test(await p.textContent('#strom')));
    await p.click('#sammesak'); await p.fill('#grensefelt', nf(await grense(p))); await p.click('#sjekkgrense');
    await p.check('#utenpress');
    await p.clock.runFor(120000);
    sant('uten tidspress: to minutter senere kan du fortsatt by', await p.locator('#valg').isVisible() &&
      await p.locator('#bar').isHidden());
    await ctx.close();
  }

  console.log('\n=== TASTATUR, KONTRAST OG MOBIL ===');
  {
    const [ctx,p]=await ny();
    await p.goto(BR+'?sak='+fro.vinn); await p.waitForSelector('#sakfakta dd');
    const naadd=[];
    for (let i=0;i<12;i++){ await p.keyboard.press('Tab'); naadd.push(await p.evaluate(()=>document.activeElement.id||document.activeElement.textContent)); }
    sant('grensefeltet og knappen nås med Tab', naadd.includes('grensefelt') && naadd.includes('sjekkgrense'), naadd.join(' | '));
    await p.focus('#grensefelt'); await p.keyboard.type(nf(await grense(p))); await p.keyboard.press('Enter');
    await p.check('#utenpress');
    const knapper=[];
    for (let i=0;i<14;i++){ await p.keyboard.press('Tab'); knapper.push(await p.evaluate(()=>document.activeElement.textContent.trim()||document.activeElement.id)); }
    sant('budknappene og «Gå ut» nås med Tab', ['By +25 000','Gå ut'].every(t=>knapper.includes(t)), knapper.join(' | '));
    await p.focus('#gaaut');
    sant('fokusring på knappene', await p.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle)==='solid');
    const par=await p.evaluate(()=>{ const f=(sel)=>{ const e=document.querySelector(sel); const c=getComputedStyle(e);
      let bg=c.backgroundColor, n=e; while ((bg==='rgba(0, 0, 0, 0)'||bg==='transparent')&&n.parentElement){ n=n.parentElement; bg=getComputedStyle(n).backgroundColor; }
      return [c.color,bg]; };
      return {tekst:f('.ingress'),liten:f('#modell .liten'),lapp:f('.lapp p'),sms:f('#strom .sms'),knapp:f('#knapper button'),
        frist:f('#frist'),lenke:f('.topp a')}; });
    for (const [n,[fg,bg]] of Object.entries(par)){ const k=kontrast(rgb(fg),rgb(bg)); sant('kontrast '+n+' ≥ 4,5:1', k>=4.5, k.toFixed(2)); }
    await ctx.close();
    for (const [w,h] of [[390,844],[360,640]]){
      const [c,m]=await ny({viewport:{width:w,height:h}});
      await m.goto(BR+'?sak='+fro.vinn); await m.waitForSelector('#sakfakta dd');
      await m.fill('#grensefelt', nf(await grense(m))); await m.click('#sjekkgrense'); await m.check('#utenpress');
      sant(w+' px: ingen sidelengs rulling under budrunden', await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const r=await m.locator('#gaaut').boundingBox();
      sant(w+' px: «Gå ut» er minst 44 px høy og innenfor skjermen', r&&r.height>=44&&r.x+r.width<=w);
      await c.close();
    }
    const [c2,m2]=await ny({reducedMotion:'reduce'});
    await m2.goto(BR+'?sak='+fro.vinn);
    sant('lappen står rett med redusert bevegelse', await m2.evaluate(()=>getComputedStyle(document.querySelector('.lapp')).transform)==='none');
    await c2.close();
  }

  console.log('\n=== MODELLEN STÅR PÅ SIDEN, INGENTING SENDES ELLER LAGRES ===');
  {
    const [ctx,p]=await ny();
    const foresporsler=[];
    p.on('request',r=>foresporsler.push(r.url()));
    await p.goto(BR+'?sak='+fro.vinn); await p.waitForSelector('#sakfakta dd');
    const modell=await p.textContent('#modelltekst');
    sant('modellteksten sier at motbyderne er anslag, ikke statistikk', /anslag/.test(modell) && /ikke statistikk/.test(modell));
    sant('modellteksten nevner regelen om budstart (§ 6-3)', /§ 6-3/.test(modell));
    const foer=await p.evaluate(()=>JSON.stringify({...localStorage}));
    await p.fill('#grensefelt', nf(await grense(p))); await p.click('#sjekkgrense'); await p.check('#utenpress');
    await spill(p,'hold');
    sant('ingenting skrevet til localStorage', await p.evaluate(()=>JSON.stringify({...localStorage}))===foer);
    sant('ingen forespørsler utover selve siden', foresporsler.every(u=>u.split('?')[0]===BR.split('?')[0]), foresporsler.join(' '));
    sant('ingen fetch, XHR, sendBeacon eller WebSocket i kilden', !/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(kilde));
    sant('ingen eksterne skript, stiler eller bilder', !/<(script|link|img)[^>]+(src|href)="https?:/.test(kilde.replace(/<link rel="canonical"[^>]*>/,'')));
    await ctx.close();
  }

  sant('ingen sidefeil', sidefeil.length===0, sidefeil.join(' | '));
  await b.close();
  console.log(feil?`\n✗ ${feil} feil, ${ok} OK`:`\n✓ alle ${ok} sjekker OK`);
  process.exit(feil?1:0);
})().catch(e=>{ console.log('✗ krasj: '+e.message); process.exit(1); });
