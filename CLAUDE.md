# renteriket — kjøreregler

Læringsspill om privatøkonomi. **Én `index.html`**, canvas 2D for byen og ekte DOM
for minispillene. Ingen avhengigheter i spillet, ingen eksterne ressurser, ingen
byggesteg. Playwright er kun testavhengighet.

## Regler som er lette å bryte

- **Alle tallfestede satser hører i `SATSER`-blokka øverst**, med årstall, aldri
  skrevet inn i en tekststreng. Skal en tekst nevne et tall, skal den regne det ut
  fra `SATSER` eller fra `F`. Bryter man dette, råtner spillet stille når satsene
  endres.
- **Alt spillet påstår om penger skal komme fra `F`**, som er rene funksjoner uten
  tilstand. Ingen finansmatte i tegne- eller DOM-koden.
- **Rentekonvensjonene er ikke utbyttbare:** `mndRente` (geometrisk) for
  avkastning, `mndFraNominell` (nominell/12) for lån. Blander man dem, blir
  tallene subtilt gale på en måte ingen oppdager.
- **Nominell av real er `F.nominell`, aldri `real + kpi`.** Spillet lærer bort i
  oppdrag F at realrenten ikke er «rente minus inflasjon», og brukte likevel
  `realAksjer + kpi` som drift i tre simuleringer. 8,04 % mot 7,90 %.
- **`F.mndDrift` returnerer en MÅNEDLIG forventning, ikke en årlig.** Den forrige
  utgaven het `drift()` og ga `g + σ²/2`, som kallerne delte på 12 — en
  førsteordens tilnærming som behandler `g` som en log-avkastning og bommer
  oppover: målt +0,28 pp på 7,9 % og σ 16 % over førti år, altså 471 208 kr på
  medianen i oppdrag N. Sjekken krever nå 0,05 pp, ikke 0,8.
- **Nye minispill må ikke kunne vinnes ved åpning.** `MINI.N` gjorde det i første
  utgave. Krever spillet et valg, må valget faktisk tas. Den milde varianten er
  like ille: `MINI.G` startet på `[50,50,50]`, som var riktig for to av tre mål,
  så oppdraget løste seg ved å dra én skyver, og spilleren fikk aldri se det
  vinduet oppdraget handler om. **Startstillingen skal være feil for hvert enkelt
  valg spilleren skal ta.**
- **Ingen tall skal vises uten at noe har regnet det ut.** `MINI.F` skrev
  «NaN % nominelt i året» på alle fire valgkortene i tre uker fordi feltet het
  `brutto` og kortet leste `s.nom`. Sjekken som fanger det leser den *rendrede*
  teksten i alle fjorten oppdrag og alle 25 bygninger, for både en fersk og en
  ferdig spiller. 854 sjekker hadde sett på tallene og ingen på skjermen.
- **Alt som slipper inn i et oppdrag skal stå bak `laastOpp()`.** `HUS.kiosk` var
  den eneste bygningen uten sjekken, og en fersk spiller uten jobb kunne ta
  oppdrag M først av alt og få 450 XP før Jobbsenteret.
- **Én tilfeldig bane er ikke et svar.** Oppdrag N viste ett løp som RESULTATET
  av spillerens seks valg; målt mot 4 000 baner lå det på 84. persentil uansett
  innstilling, og finalen lærte bort en sparerate sju prosentpoeng for lav.
  Oppdrag J kjørte en bane der tre av fire krakk aldri hentet seg inn, mens
  fasiten påsto at alle fire gjorde det — og tretti år ga −0,02 % realt i
  oppdraget som skal vise at man skal sitte stille. **Sier et oppdrag noe om en
  bane, skal en sjekk måle banen. Sier det noe om et utfall, skal utfallet være
  medianen av mange.**
- **Krev aldri flaks for å klare et oppdrag.** Oppdrag H krevde «over startverdien
  etter fem år». Målt over 20 000 femårsperioder klarte riktig spredning det i
  67 % av tilfellene, og alle seks alternativene har samme forventede avkastning
  i modellen — spredning slår «alt i teknologi» bare 55 % av gangene. Det
  spredning faktisk leverer, er nedsiden. Vinnervilkåret skal være noe spilleren
  styrer selv; fordelingen er det som beviser hvorfor regelen er verdt å følge.
- **Kolonner med kroner skal kunne legges sammen.** Oppdrag N viste «Avkastning»
  netto etter uhell OG uhellene som egen minuslinje, og skjermingsfradraget som
  en pengelinje enda det bare senker skattegrunnlaget. Tabellen bommet med
  nøyaktig uhellskostnaden.
- **En modell som skal begrunne en tommelfingerregel, må faktisk gi den.**
  `MINI.C` påsto at bufferkostnaden «bunner ut rundt tre måneders utgifter», mens
  modellens egne tall ga én måned, fordi stormen bare hadde husholdningsuhell,
  og tremånedersregelen handler om å miste inntekten. Sier teksten hvor
  regnestykket bunner ut, skal en sjekk måle bunnpunktet.
- **Er en modellparameter et anslag, skal spilleren se det.** Skjermingsfaktoren
  på 0,35 i `MINI.N` sto bare i en kodekommentar. Alt annet i spillet sier fra
  når en modell er en modell.
- **Nye samleobjekter må gjennom `sjekk-kort.js`** før de anses plassert — og
  **nye rekvisitter må gjennom den samme sjekken**, fordi en rekvisitt kan legge
  seg oppå et kort. OKSEN havnet 32 px fra kort 31 og gjorde det uplukkelig;
  sjekken fanget det på første kjøring.
- **Skygger, lys og natt leser fra `lys()` og `nattMengde()`, ikke fra faste
  tall.** Hver bygning kastet før samme skygge — 7 px høyre, 11 px ned — hele
  døgnet, så klokka 00:49 pekte skyggene som om sola sto høyt. Tegner du noe nytt
  som skal kaste skygge, bruk `L.dx`, `L.dy` og `L.styrke`. Rekvisittløkka har en
  `skygge()`-hjelper som gjør det for deg.
- **Et vindu skal ikke lyse i en stengt bygning.** `apentNaa(b)` avgjør det.
  Kasino Fortuna er åpen 16–04, kontorene 08–17.
- **Severdigheter som viser tilstand er verdt tre som bare står der.** Oksen og
  bjørnen leser `markedStemning`, klokketårnet viser klokka, rentesøyla viser
  styringsrenta, tickersøyla viser indeksen. Legger du til en severdighet, spør
  først om den kan si noe.
- **Byen har en tegnebudsjett-sjekk.** `test-verden.js` måler `RR.maalTegning()`
  per bydel, dag og natt, og krever under 4 ms av de 16,7 som finnes ved 60 fps.
  Målt etter at lys, skygge, seks severdigheter, sju bymøbler og 62 lyktestolper
  kom inn: 0,68 ms i verste tilfelle. Det er plass til mer.
- **Nytt interaktivt element skal være en `<button>` eller en `<input>`**, ikke en
  `<div>` med `onclick`. `test-tilgjengelighet.js` krever at alt klikkbart i alle
  fjorten oppdrag kan nås med Tab.
- **Nye farger måles, ikke antas.** Kontrastsjekken leser de faktiske fargene fra
  DOM-en, så en variabel som endres ett sted slår ut der.
- **Status skal ALDRI bæres av farge alene.** Eieren er rød-grønn fargeblind, og
  kontrast og fargeblindhet er to FORSKJELLIGE krav: den gamle grønn/rød-paletten
  oppfylte 4,5:1 hele veien og kollapset likevel til ΔE 19,0 på tekst og 2,7 på
  flater under deuteranopi. To regler følger:
  1. **`--gro` er DEKOR** (knapper, skyvere, XP, figurer, grafserier) og bærer
     ingen status. Alt som sier riktig/galt bruker `--ok`/`--feil` (blå/oransje,
     ΔE 96,8 under deuteranopi og 74,8 under protanopi).
  2. **Hvert statuselement bærer symbol OG ord**, som ekte tekst i DOM-en — ikke
     `::before`, som verken alle skjermlesere eller sjekken kan lese. Merkingen
     skjer sentralt i `merkStatus()` + en MutationObserver, ikke per kallsted, så
     nye minispill arver den gratis. **Innfører du en ny statusklasse, legg den
     i `SMERKER`-lista** — ellers står den udekket, og
     `test-tilgjengelighet.js` åpner alle fjorten minispillene og feller den.
  `test-tilgjengelighet.js` simulerer bade deuteranopi og protanopi (Viénot 1999
  + CIE76) på de LEVENDE fargene og måler ΔE — den antar ingenting.
- **Nullstilling må rydde både lagring og tilstanden i minnet.** Sletter man bare
  nøklene, skriver spillet den gamle tilstanden tilbake ved neste lagring.
- **Spilleren skal alltid kunne komme seg ut av en vegg.** Nødutgangen i
  `oppdater()` ligger *før* akse-testene, og rekkefølgen er ikke likegyldig: lagt
  etter dem har `sp.vx*=-0.15` alt drept farten, og spilleren kryper 32 px på
  2,4 sekunder i stedet for 291. `start()` har i tillegg en vaktpost mot en
  blokkert startposisjon. Fjern ingen av dem: seks av åtte bydelsmidtpunkt ligger
  inne i en bygning, og ett feilplassert tall gjorde hele spillet uspillbart én
  gang alt.
- **Test-API-et må gi samme utfall som å spille.** `taAlleKort()` gir XP fordi en
  test ellers måler et annet spill; `loesAlle()` gjorde det ikke, og «alt løst»
  målte nivå 8 av 15. Legger du til en snarvei i `RR`, skal den gi samme
  sidevirkninger som veien spilleren går.
- **Lang tankestrek (—) i spillertekst er et BEVISST avvik fra husets praksis.**
  Besluttet av Valiant 2026-08-17, etter en kartlegging: renteriket har **59 lange
  og 14 korte** streker i brukertekst (99/10 i kommentarer). Resten av huset går
  motsatt vei — evers.no-hovedsiden har 45 korte og 0 lange i brukertekst,
  aksjeskatt 13 korte og 0 lange, og `/klima/` har et nedskrevet totalforbud.
  Renteriket er det eneste repoet som bruker lang strek i spillertekst, og det er
  **ikke slurv**: `906951a` (31.07) kuttet 207 em-streker i spillertekst ned til
  60 med vilje, og beholdt streken kun der den faktisk skiller to ledd — etiketter
  i knapper og tabellrader («Ferdig — tilbake til byen»), korttitler («STEG 1 —
  GJETT FØRST»). De 14 korte er utelukkende tallintervall (1900–2024, 30–40 år),
  så de konkurrerer ikke med de lange; de to tegnene gjør ulike jobber.
  **Spillet har egen stemme og beholder den.** Ingen test pinner tekst med strek,
  så en konvertering ville vært gratis teknisk — den er avvist av innholdsgrunner,
  ikke tekniske. Ikke «rett opp» dette, og ikke flagg det som inkonsistens.
- **Ingen `Co-Authored-By`-trailer i commits. Push aldri uten godkjenning.**

## Før noe skrives av som ferdig

`bash test-alle.sh` **og** `bash test-alle.sh --http` skal begge være helt grønne:
åtte filer, 1004 sjekker. HTTP-modus er ikke pynt: siden serveres over HTTPS i
produksjon, og `file://` har sitt eget origo-oppsett for `localStorage`.

Legger du til innhold, legg til sjekken som beviser at det virker. Fire spillfeil i
første utgave ble funnet av testene og ikke av øyet, nitten av en faglig gjennomgang,
to av å faktisk spille, sju av å spille gjennom hele spillet i produksjon etter at
det var ute, og **fjorten av en systematisk jakt på logiske brister** — der tre
oppdrag lærte bort noe annet enn de trodde (se README, «Testing»). Hver gang var
alle sjekkene grønne.

**Og spill det.** To av de verste feilene i første utgave var usynlige for alle
sjekkene og åpenbare i det noen faktisk spilte: at utforsking ga 21 000 kr i gjeld
i måneden før man hadde funnet Jobbsenteret, og at **startposisjonen lå inne i en
bygning, så spilleren ikke kunne bevege seg i det hele tatt.**

Lærdommen fra den siste er verdt å skrive ned: en test som flytter spilleren før
den måler noe, måler ikke spillet. Gjør minst én test som gjør det en spiller gjør:
last siden, klikk START, trykk mellomrom, gå, uten et eneste programmatisk grep.

## Årlig ettersyn

Sjekk `SATSER` mot Skatteetaten hver januar, og skjermingsrenten når den fastsettes.
Se README, avsnittet «Satser og kilder».
