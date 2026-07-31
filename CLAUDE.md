# renteriket — kjøreregler

Læringsspill om privatøkonomi. **Én `index.html`**, canvas 2D for byen og ekte DOM
for minispillene. Ingen avhengigheter i spillet, ingen eksterne ressurser, ingen
byggesteg. Playwright er kun testavhengighet.

## Regler som er lette å bryte

- **Alle tallfestede satser hører i `SATSER`-blokka øverst**, med årstall — aldri
  skrevet inn i en tekststreng. Skal en tekst nevne et tall, skal den regne det ut
  fra `SATSER` eller fra `F`. Bryter man dette, råtner spillet stille når satsene
  endres.
- **Alt spillet påstår om penger skal komme fra `F`**, som er rene funksjoner uten
  tilstand. Ingen finansmatte i tegne- eller DOM-koden.
- **Rentekonvensjonene er ikke utbyttbare:** `mndRente` (geometrisk) for
  avkastning, `mndFraNominell` (nominell/12) for lån. Blander man dem, blir
  tallene subtilt gale på en måte ingen oppdager.
- **Nye minispill må ikke kunne vinnes ved åpning.** `MINI.N` gjorde det i første
  utgave. Krever spillet et valg, må valget faktisk tas.
- **Nye samleobjekter må gjennom `sjekk-kort.js`** før de anses plassert.
- **Nytt interaktivt element skal være en `<button>` eller en `<input>`**, ikke en
  `<div>` med `onclick`. `test-tilgjengelighet.js` krever at alt klikkbart i alle
  fjorten oppdrag kan nås med Tab.
- **Nye farger måles, ikke antas.** Kontrastsjekken leser de faktiske fargene fra
  DOM-en, så en variabel som endres ett sted slår ut der.
- **Nullstilling må rydde både lagring og tilstanden i minnet.** Sletter man bare
  nøklene, skriver spillet den gamle tilstanden tilbake ved neste lagring.
- **Ingen `Co-Authored-By`-trailer i commits. Push aldri uten godkjenning.**

## Før noe skrives av som ferdig

`bash test-alle.sh` **og** `bash test-alle.sh --http` skal begge være helt grønne —
åtte filer, 838 sjekker. HTTP-modus er ikke pynt: siden serveres over HTTPS i
produksjon, og `file://` har sitt eget origo-oppsett for `localStorage`.

Legger du til innhold, legg til sjekken som beviser at det virker. Fire spillfeil i
første utgave ble funnet av testene og ikke av øyet, nitten av en faglig gjennomgang,
og to av å faktisk spille (se README, «Testing»).

**Og spill det.** Den verste feilen i første utgave — at utforsking ga 21 000 kr i
gjeld i måneden før man hadde funnet Jobbsenteret — var usynlig for alle de andre sjekkene og
åpenbar etter to minutters spilling.

## Årlig ettersyn

Sjekk `SATSER` mot Skatteetaten hver januar, og skjermingsrenten når den fastsettes.
Se README, avsnittet «Satser og kilder».
