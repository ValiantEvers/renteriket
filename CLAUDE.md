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
- **Nullstilling må rydde både lagring og tilstanden i minnet.** Sletter man bare
  nøklene, skriver spillet den gamle tilstanden tilbake ved neste lagring.
- **Ingen `Co-Authored-By`-trailer i commits. Push aldri uten godkjenning.**

## Før noe skrives av som ferdig

`bash test-alle.sh` skal være helt grønn — sju filer, 778 sjekker. Legger du til
innhold, legg til sjekken som beviser at det virker; fire reelle spillfeil i første
utgave ble funnet av testene og ikke av øyet (se README, «Testing»).

## Årlig ettersyn

Sjekk `SATSER` mot Skatteetaten hver januar, og skjermingsrenten når den fastsettes.
Se README, avsnittet «Satser og kilder».
