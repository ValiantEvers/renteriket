// Renteriket uten nett (idé 77). Service workeren gjør to ting og ikke mer:
//
// 1. NETTET FØRST. Satsene i SATSER skifter hver januar, og en spiller skal aldri bli
//    sittende med fjorårets tall fordi en lagret kopi svarte først. Hvert vellykket svar
//    legges i kopien, så den alltid er den sist hentede utgaven. Kopien brukes bare når
//    nettet svikter.
// 2. LÆRERMODUS RØRES IKKE. Forespørsler med ?laerer går rett til nettet og lagres ikke;
//    spillet registrerer heller ingen service worker i lærermodus (se index.html).
//
// Bytt VERSJON når FORHAAND-lista endres. Ved activate slettes eldre renteriket-cacher,
// og bare dem: evers.no deler origo med andre apper.
const VERSJON = 'renteriket-1';
const FORHAAND = ['./', 'index.html', 'manifest.webmanifest',
  'ikon-180.png', 'ikon-192.png', 'ikon-512.png', 'ikon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSJON)
    .then((c) => c.addAll(FORHAAND.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('renteriket-') && k !== VERSJON)
      .map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(self.registration.scope)) return;
  const url = new URL(r.url);
  if (url.searchParams.has('laerer')) return;
  // Samme fil uansett spørrestreng (statisk side), så kopien lagres uten den.
  url.search = '';
  // En navigasjon kan ikke sendes videre med egne innstillinger, derfor URL-en.
  const nett = r.mode === 'navigate' ? fetch(r.url, { cache: 'no-cache' }) : fetch(r, { cache: 'no-cache' });
  e.respondWith(nett.then((svar) => {
    if (svar.ok) {
      const kopi = svar.clone();
      e.waitUntil(caches.open(VERSJON).then((c) => c.put(url.href, kopi)));
    }
    return svar;
  }).catch(() => caches.match(url.href)
    .then((t) => t || (r.mode === 'navigate' ? caches.match('./') : undefined))
    .then((t) => t || Response.error())));
});
