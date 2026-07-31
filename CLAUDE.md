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
- **Nye samleobjekter må gjennom `sjekk-kort.js`** før de anses plassert.
- **Nytt interaktivt element skal være en `<button>` eller en `<input>`**, ikke en
  `<div>` med `onclick`. `test-tilgjengelighet.js` krever at alt klikkbart i alle
  fjorten oppdrag kan nås med Tab.
- **Nye farger måles, ikke antas.** Kontrastsjekken leser de faktiske fargene fra
  DOM-en, så en variabel som endres ett sted slår ut der.
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
- **Ingen `Co-Authored-By`-trailer i commits. Push aldri uten godkjenning.**

## Før noe skrives av som ferdig

`bash test-alle.sh` **og** `bash test-alle.sh --http` skal begge være helt grønne:
åtte filer, 926 sjekker. HTTP-modus er ikke pynt: siden serveres over HTTPS i
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
