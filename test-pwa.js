// test-pwa.js — Renteriket uten nett (idé 77): manifest, ikoner og service worker.
//
// Service workere krever http(s), så testen starter sin egen server uansett om
// test-alle kjører mot file:// eller --http. Den serverer en kopi av spillet under
// /renteriket/, som i produksjon, med Cache-Control: max-age=600 og ETag slik GitHub
// Pages gjør. «Uten nett» er at serveren faktisk stenges, ikke en emulering: da
// feiler hver forespørsel, også de service workeren selv sender.
//
// Det som måles, er det spilleren merker: at spillet starter og kan spilles uten nett,
// at en ny utgave (nye satser i januar) kommer fram så snart nettet er tilbake, til tross
// for max-age, og at lærermodus verken registrerer noe eller skriver i kopien.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const CHROMIUM = require('./test-chromium');
let ok = 0, feil = 0;
function sant(n, x, info) { if (x) ok++; else { feil++; console.log('  ✗ ' + n + (info !== undefined ? ' (' + info + ')' : '')); } }

const les = (f) => fs.readFileSync(path.join(__dirname, f));
const kilde = les('index.html').toString('utf8');
const sw = les('sw.js').toString('utf8');

console.log('\n=== MANIFEST OG IKONER ===');
let man = {};
try { man = JSON.parse(les('manifest.webmanifest').toString('utf8')); sant('manifestet er gyldig JSON', true); }
catch (e) { sant('manifestet er gyldig JSON', false, e.message); }
sant('navn og kortnavn', man.name === 'Renteriket' && man.short_name === 'Renteriket');
sant('start og omfang er mappa spillet ligger i', man.start_url === './' && man.scope === './');
sant('vises som app (standalone)', man.display === 'standalone');
sant('norsk', man.lang === 'nb');
const tema = (kilde.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
sant('temafargen er den samme som sidens', man.theme_color === tema && man.background_color === tema, tema);
const png = (f) => { const b = les(f); return { sig: b.slice(1, 4).toString() === 'PNG', w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
for (const i of man.icons || []) {
  const p = png(i.src); const [w, h] = i.sizes.split('x').map(Number);
  sant(`${i.src}: PNG på ${i.sizes} som oppgitt`, p.sig && p.w === w && p.h === h, `${p.w}x${p.h}`);
}
const formaal = (man.icons || []).map((i) => i.sizes + ' ' + i.purpose);
sant('ikon 192 og 512 (any) og 512 (maskable)', ['192x192 any', '512x512 any', '512x512 maskable'].every((x) => formaal.includes(x)), formaal.join(', '));
sant('index.html lenker til manifestet', /<link rel="manifest" href="manifest\.webmanifest">/.test(kilde));
const apple = png('ikon-180.png');
sant('apple-touch-icon 180×180 finnes og er lenket', /<link rel="apple-touch-icon" href="ikon-180\.png">/.test(kilde) && apple.w === 180 && apple.h === 180);
const forhaand = JSON.parse((sw.match(/const FORHAAND = (\[[^\]]*\])/) || [, '[]'])[1].replace(/'/g, '"').replace(/\s+/g, ''));
sant('alt service workeren lagrer på forhånd, finnes', forhaand.length > 5 && forhaand.filter((f) => f !== './').every((f) => fs.existsSync(path.join(__dirname, f))), forhaand.join(', '));
sant('registreringen er vernet mot file:// og lærermodus', /\/\^https\?:\$\/\.test\(location\.protocol\) && !LAERER/.test(kilde));

// ---- server ----------------------------------------------------------------------------
const rot = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-pwa-'));
const mappe = path.join(rot, 'renteriket');
fs.mkdirSync(mappe);
for (const f of fs.readdirSync(__dirname)) {
  if (/\.(html|js|webmanifest|png)$/.test(f) && !/^test-|^sjekk-/.test(f)) fs.copyFileSync(path.join(__dirname, f), path.join(mappe, f));
}
const TYPE = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const logg = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  logg.push(u.pathname + u.search);
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith('/renteriket/')) { res.writeHead(404); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const fil = path.join(rot, p);
  if (!fil.startsWith(mappe) || !fs.existsSync(fil)) { res.writeHead(404); return res.end(); }
  const b = fs.readFileSync(fil);
  const etag = '"' + crypto.createHash('sha1').update(b).digest('hex').slice(0, 16) + '"';
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag, 'Cache-Control': 'max-age=600' }); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPE[path.extname(fil)] || 'application/octet-stream', ETag: etag, 'Cache-Control': 'max-age=600' });
  res.end(b);
});
const socks = new Set();
server.on('connection', (s) => { socks.add(s); s.on('close', () => socks.delete(s)); });
let PORT = 0;
const paa = () => new Promise((r) => server.listen(PORT, '127.0.0.1', () => { PORT = server.address().port; r(); }));
const av = () => new Promise((r) => { server.close(() => r()); for (const s of socks) s.destroy(); });
const nyUtgave = (merke) => {
  const f = path.join(mappe, 'index.html');
  const s = fs.readFileSync(f, 'utf8').replace(/<meta name="rr-utgave"[^>]*>\r?\n?/, '');
  fs.writeFileSync(f, s.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta name="rr-utgave" content="${merke}">`));
};
const utgave = (p) => p.evaluate(() => document.querySelector('meta[name=rr-utgave]')?.content || 'original');

(async () => {
  await paa();
  const BASE = `http://127.0.0.1:${PORT}/renteriket/`;
  const b = await chromium.launch({ executablePath: CHROMIUM });
  const sidefeil = [];
  const ny = async (ctx) => { const p = await ctx.newPage(); p.on('pageerror', (e) => sidefeil.push(e.message)); return p; };
  // `ready` svarer alt mens workeren er «activating»; vent til den er ferdig (maks 5 s).
  const klar = (p) => p.evaluate(() => navigator.serviceWorker.ready.then((r) => new Promise((res) => {
    const w = r.active;
    const svar = () => res({ state: w.state, scope: r.scope });
    if (w.state === 'activated') return svar();
    w.addEventListener('statechange', () => { if (w.state === 'activated') svar(); });
    setTimeout(svar, 5000);
  })));

  console.log('\n=== INSTALLERBAR ===');
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ny(ctx);
  await p.goto(BASE);
  const reg = await klar(p);
  sant('service workeren er aktiv', reg.state === 'activated', reg.state);
  sant('omfanget er /renteriket/, ikke hele evers.no', reg.scope === BASE, reg.scope);
  const cdp = await ctx.newCDPSession(p);
  const am = await cdp.send('Page.getAppManifest');
  sant('Chrome leser manifestet uten feil', am.errors.length === 0 && /Renteriket/.test(am.data || ''), JSON.stringify(am.errors));
  const inst = await cdp.send('Page.getInstallabilityErrors');
  // «in-incognito» kommer av at testkonteksten ikke har profil, ikke av siden.
  const hindre = inst.installabilityErrors.map((e) => e.errorId).filter((id) => id !== 'in-incognito');
  sant('Chrome finner ingenting som hindrer installering', hindre.length === 0, hindre.join(', '));
  await p.reload();
  sant('siden styres av service workeren etter omlasting', await p.evaluate(() => !!navigator.serviceWorker.controller));
  const navn = await p.evaluate(() => caches.keys());
  sant('kopien heter renteriket-1', navn.length === 1 && navn[0] === 'renteriket-1', navn.join(', '));
  const lagret = await p.evaluate(() => caches.open('renteriket-1').then((c) => c.keys()).then((ks) => ks.map((k) => new URL(k.url).pathname)));
  sant('spillet, manifestet og ikonene ligger i kopien', ['/renteriket/', '/renteriket/index.html', '/renteriket/manifest.webmanifest', '/renteriket/ikon-512.png'].every((x) => lagret.includes(x)), lagret.join(' '));
  await p.goto(BASE + 'julekalender.html');
  await p.waitForSelector('h1');
  await p.goto(BASE + '?ref=delt');
  await p.waitForSelector('#startknapp');
  const medQ = await p.evaluate(() => caches.open('renteriket-1').then((c) => c.keys()).then((ks) => ks.map((k) => k.url).filter((u) => u.includes('?'))));
  sant('kopien får ikke én oppføring per spørrestreng', medQ.length === 0, medQ.join(' '));

  console.log('\n=== UTEN NETT ===');
  await av();
  const svar = await p.goto(BASE).catch((e) => e);
  sant('spillet lastes uten nett', svar && !(svar instanceof Error) && svar.ok(), svar instanceof Error ? svar.message : svar && svar.status());
  await p.waitForSelector('#startknapp');
  // Som en spiller: START, mellomrom gjennom dialogen, gå.
  await p.click('#startknapp');
  await p.waitForTimeout(1100);
  sant('START virker uten nett', await p.evaluate(() => RR.tilstand.kjorer));
  for (let i = 0; i < 8 && await p.evaluate(() => RR.tilstand.dAapen); i++) { await p.keyboard.press('Space'); await p.waitForTimeout(140); }
  const f0 = await p.evaluate(() => RR.tilstand.pos);
  await p.keyboard.down('d'); await p.waitForTimeout(400); await p.keyboard.up('d');
  const f1 = await p.evaluate(() => RR.tilstand.pos);
  sant('man kan gå uten nett', f1[0] - f0[0] > 25, Math.round(f1[0] - f0[0]) + ' px');
  await p.waitForTimeout(6500); // spillet lagrer hvert sjette sekund
  sant('fremgangen lagres uten nett', await p.evaluate(() => Object.keys(localStorage).some((k) => /^rr/i.test(k))), await p.evaluate(() => Object.keys(localStorage).join(',')));
  const jul = await p.goto(BASE + 'julekalender.html').catch((e) => e);
  sant('julekalenderen (besøkt før) lastes uten nett', jul && !(jul instanceof Error) && jul.ok());
  const q = await p.goto(BASE + '?ref=delt').catch((e) => e);
  sant('lenke med spørrestreng lastes uten nett', q && !(q instanceof Error) && q.ok());
  // Lærersiden er aldri åpnet i denne konteksten. Den skal feile, ikke vise spillet.
  const ukjent = await p.goto(BASE + 'laerer.html').then(async (r) => (r && r.ok() ? await p.title() : 'feilet')).catch(() => 'feilet');
  sant('en side man aldri har åpnet, viser ikke spillet uten nett', ukjent === 'feilet', ukjent);
  // Den feilede navigasjonen går videre til Chromes feilside; vent den ut før neste side.
  await p.waitForTimeout(500); await p.goto('about:blank');

  console.log('\n=== NY UTGAVE NÅR NETTET ER TILBAKE ===');
  nyUtgave('2');
  await paa();
  await p.goto(BASE);
  sant('ny utgave vises med en gang, tross max-age=600', await utgave(p) === '2', await utgave(p));
  await av();
  await p.reload().catch(() => {});
  sant('kopien er den nye utgaven etterpå', await utgave(p) === '2', await utgave(p));
  await paa();

  console.log('\n=== LÆRERMODUS ===');
  nyUtgave('3');
  await p.goto(BASE + '?laerer');
  sant('lærermodus lastes (ny utgave fra nettet)', await utgave(p) === '3' && await p.evaluate(() => typeof RR === 'object'));
  await av();
  await p.goto(BASE).catch(() => {});
  sant('lærermodus skrev ingenting i kopien', await utgave(p) === '2', await utgave(p));
  await paa();
  const ctxL = await b.newContext();
  const l = await ny(ctxL);
  await l.goto(BASE + '?laerer');
  await l.waitForSelector('#startknapp');
  await l.waitForTimeout(1500);
  sant('lærermodus registrerer ingen service worker', await l.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length)) === 0);
  sant('lærermodus lager ingen kopi', (await l.evaluate(() => caches.keys())).length === 0);

  console.log('\n=== GAMLE KOPIER RYDDES, ANDRES STÅR ===');
  // Samme kontekst: lærermodus har ikke registrert noe, så nå legges to gamle cacher inn
  // før spillet besøkes normalt for første gang.
  await l.evaluate(() => Promise.all([caches.open('renteriket-0'), caches.open('annen-app')]));
  await l.goto(BASE);
  await klar(l);
  await l.waitForTimeout(300);
  const etter = await l.evaluate(() => caches.keys());
  sant('gammel renteriket-kopi er slettet', !etter.includes('renteriket-0'), etter.join(', '));
  sant('en annen apps cache står urørt', etter.includes('annen-app'), etter.join(', '));
  await ctxL.close();

  console.log('\n=== FILE:// ===');
  const ctxF = await b.newContext();
  const pf = await ny(ctxF);
  // Feilen fra register() svelges i spillet, så konsollen sier ingenting; tell kallene i stedet.
  await pf.addInitScript(() => {
    window.__reg = 0;
    if (navigator.serviceWorker) { const o = navigator.serviceWorker.register.bind(navigator.serviceWorker); navigator.serviceWorker.register = (...a) => { window.__reg++; return o(...a); }; }
  });
  await pf.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
  await pf.waitForSelector('#startknapp');
  await pf.waitForTimeout(800);
  sant('file:// prøver ikke å registrere noe', await pf.evaluate(() => window.__reg) === 0);
  await ctxF.close();

  console.log('\n=== MOBIL ===');
  const ctxM = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await ny(ctxM);
  await m.goto(BASE);
  sant('service workeren virker på mobil', (await klar(m)).state === 'activated');
  await ctxM.close();

  sant('ingen sidefeil', sidefeil.length === 0, sidefeil.join(' | '));
  await ctx.close();
  await b.close();
  await av();
  fs.rmSync(rot, { recursive: true, force: true });
  console.log(feil ? `\n✗ ${feil} feil, ${ok} OK` : `\n✓ alle ${ok} sjekker OK`);
  process.exit(feil ? 1 : 0);
})().catch(async (e) => { console.log('✗ krasj: ' + e.message); await av().catch(() => {}); process.exit(1); });
