# renteriket — spillet som gjør deg til investor

Et originalt læringsspill om privatøkonomi og investering, for voksne som starter
på null. Du kommer til byen med tom lommebok og ingen aning; fjorten oppdrag
senere vet du hvordan penger faktisk virker.

Åtte bydeler, tjuefem bygninger du kan gå inn i, femten figurer, **fjorten
oppdrag med hvert sitt minispill**, og **førti kunnskapskort** gjemt rundt om.
Én `index.html`, ingen avhengigheter, ingen eksterne ressurser, ingen byggesteg —
du åpner fila og spiller.

Universelle prinsipper i bunn, norsk virkelighet oppå: renters rente og
diversifisering står side om side med aksjeskatt på 37,84 %, egenkapitalkrav på
10 %, gjeldstak på fem ganger inntekten og IPS-grensen som ble hevet til
25 000 kroner i 2026.

## Byen

| Bydel | Hva som bor der | Tema |
|---|---|---|
| **STARTGATA** | Leiligheten, Jobbsenteret, Kafé Krona, Butikken | lønn, budsjett, kjøpekraft, alternativkostnad |
| **BANKGATA** | Sparebanken, Kvikklån AS, BSU-luka, Vern & Vakt | rente, buffer, gjeld, forsikring |
| **BOLIGFELTET** | Meglerkontoret, Visningsboligen, Bygg & Bo, Borettslaget | egenkapital, vedlikehold, fellesgjeld |
| **SKATTEKVARTALET** | Skatteetaten, ASK-kontoret, IPS-hvelvet | skatt, kontotyper, skjerming |
| **PENSJONSHØYDEN** | Pensjonstårnet, Tidsmaskinen, Trygdekontoret | tid, nåverdi, folketrygd |
| **RENTETORGET** | Statuen, Rentetreet, Oppslagstavla | byens midtpunkt |
| **BØRSTORGET** | Børshuset, Fondsbutikken, Indeksbiblioteket | risiko, spredning, gebyrer |
| **BAKGATA** | Kryptokjelleren, Telefonkiosken, Kasino Fortuna, Opptur Nettverk | svindel, spekulasjon, forventningsverdi |

**Rentetreet** på torget er like høyt som formuen din. Det er hele HUD-en i ett
bilde, og det er ikke pynt: du ser på det og vet hvor du står.

Verdenen går sin egen gang. **Klokka** løper — ett døgn på seksten minutter, sola
går ned og gatelysene tennes. **Kalenderen** går også: hver syttifemte sekund
kommer en ny måned med lønn inn, faste utgifter ut, avkastning på porteføljen,
renter på gjelden, og av og til et uhell. Har du buffer, blir uhellet en utgift.
Har du ikke, blir det et lån. **Markedet** løper hele tiden, med sjeldne krakk,
og indeksen står på MEGA-SKJERMEN over Børshuset enten du ser på den eller ikke.

## Oppdragene

Fjorten oppdrag, A til N. Hvert av dem er et minispill der du må gjøre noe som
faktisk krever forståelse — ikke en flervalgsprøve med tekst rundt.

| | Oppdrag | Hva du gjør | Hva det lærer |
|---|---|---|---|
| **A** | Den første lønnsslippen | Gjett nettolønna før du åpner slippen, og finn ut hva den neste tusenlappen er verdt | brutto mot netto, gjennomsnittsskatt mot marginalskatt |
| **B** | Budsjettet som holder | Et ryggsekkproblem: maksimer livskvalitet med minst 20 % sparing | at riktig svar ikke er «kutt alt» |
| **C** | Bufferstormen | Velg buffer, kjør tolv måneder med uhell | at bufferen koster noe uansett — renter eller tapt avkastning |
| **D** | Rentetrappa | Finn beløpet Bodil må spare for å ende likt med Ada | at ti års forsprang er verdt mer enn dobbelt så mye penger |
| **E** | Gjeldsraset | Sett nedbetalingsrekkefølgen på fire lån | at dyreste rente først alltid vinner, og hvor mye |
| **F** | Inflasjonstyven | Følg kjøpekraften i 25 år, fire steder å legge pengene | Fisher-formelen, og at sparekonto etter skatt taper realt |
| **G** | Kurven som lurer | Velg aksjeandel for tre sparemål med tre ulike krav | at horisonten bestemmer, ikke magefølelsen |
| **H** | Ikke alt i én kurv | Hundre brikker, fem år, ett sektorsjokk per år | at spredning fjerner selskapsrisiko, men ikke markedsrisiko |
| **I** | Gebyrlekkasjen | Finn året da gebyrforskjellen har spist 100 000 kroner | at gebyret er den eneste størrelsen du kjenner på forhånd |
| **J** | Panikkprøven | Tretti år, fire krakk, tre valg hver gang | at atferd slår kunnskap |
| **K** | Kontoen som sparer skatt | Fem sparere, fem kontotyper, riktig par | at kontovalget kan være verdt mer enn fondsvalget |
| **L** | Nøkkelen til boligen | Finn ut hvilken av tre skranker som faktisk stopper deg | at gjeldstaket og betjeningsevnen binder før egenkapitalen |
| **M** | Svindelsjekken | Fjorten meldinger, fem av dem ekte | mønsteret, ikke produktet |
| **N** | Tidsmaskinen | Seks valg, førti år, ett tall | alt sammen, satt sammen |

Oppdragene låser opp hverandre i en rekkefølge som er der av en grunn: du får
ikke regne på boliglån før du har vært gjennom gjeld og risiko, og
**Tidsmaskinen** i toppetasjen av Pensjonstårnet krever seks av de andre.

Ingen oppdrag kan løses ved å gjette. Der du kan svare feil, får du en forklaring
på hvorfor det var feil, og lov til å prøve igjen.

## Kunnskapskortene

Førti kort ligger gjemt rundt i byen, fem per bydel. Hvert kort er én setning som
står på egne bein — «Aksjeskatten er 37,84 %», «Et fall på 50 % krever 100 % opp»,
«Banken ber deg aldri flytte penger». Finner du dem, henger de på veggen i
Leiligheten, og de går inn i krøniken.

Plasseringene er **maskinkontrollert** (`sjekk-kort.js`): ingen kort ligger inni en
vegg, et tre eller utenfor kartet, og hvert kort har et fritt punkt innenfor
plukkeradiusen. Tre av de førti måtte flyttes etter første måling.

## Progresjonen

XP fra oppdrag, kort, bygninger du besøker og innskudd du gjør. Femten titler fra
**BLAKK** til **INVESTOR**, og hele stigen er 8 540 XP mot ca. 9 800 tilgjengelige
— en spiller som gjør alt, når toppen. (Første forsøk hadde en kurve der man
havnet på nivå 8 av 15 med alt løst. Det øverste nivået sto i menyen som noe
ingen kunne nå.)

**Krøniken** i pausemenyen får én linje for hvert oppdrag du løser og hvert kort
du finner. Til slutt er den en lesbar oppsummering av alt spillet har lært deg.

## Kontroller

- **WASD / piltaster** — gå · **Shift** — løp
- **Mellomrom / Enter** — snakk, gå inn, handle
- **Esc** — meny · **M** — lyd av/på
- **Mobil:** styrekors nede til venstre, HANDLE og MENY nede til høyre. Formue,
  kontanter og klokke oppe til venstre, klar av minikartet; XP og hintstripe over
  knappene.

## Pausemenyen

Seks faner: **oppdrag** med låst/åpen/løst-status, **kunnskapskort** med funn per
bydel, **krøniken**, **statistikk** (formue, måneder spilt, skritt, riktige svar),
**lyd og innstillinger** med nullstilling, og **satser og kilder** — hele
SATSER-blokka i lesbar form, med årstall og forbehold.

## Satser og kilder

Alle tall som kan endres av politikere står i **én blokk** øverst i fila
(`SATSER`), med årstall, og ingen andre steder. Verifisert **31. juli 2026** mot
Skatteetaten, Finansdepartementet, Finanstilsynet, Norges Bank, SSB, NAV og
Kartverket.

| Post | Verdi | Merknad |
|---|---|---|
| Alminnelig inntekt | 22 % | |
| Aksjeinntekt | 37,84 % | 22 % × oppjusteringsfaktor 1,72 |
| Trygdeavgift, lønn | 7,6 % | ned fra 7,7 % i 2025 |
| Frikortgrense | 100 000 kr | 100 000 f.o.m. 2025; 70 000 i 2024 |
| Personfradrag | 114 540 kr | |
| Minstefradrag, maks | 95 700 kr | 46 % av lønn |
| Trinnskatt | fem trinn fra 226 100 kr | 1,7 % → 17,8 % |
| Skjermingsrente | 3,6 % | **gjelder 2025.** 2026-satsen fastsettes i januar 2027 |
| IPS, maks per år | 25 000 kr | hevet fra 15 000 i 2026 |
| BSU | 10 % av inntil 27 500 kr, tak 300 000 kr | t.o.m. året du fyller 33 |
| Formuesskatt | bunnfradrag 1 900 000 kr, 1,0 % | omlagt mellom stat og kommune i 2026, samlet sats uendret |
| Egenkapitalkrav bolig | 10 % | ned fra 15 % ved årsskiftet 2024/25 |
| Maks gjeldsgrad | 5 × brutto årsinntekt | uendret — og det er ofte denne som binder |
| Rentestresstest | +3 prosentpoeng, minimum 7 % | brukes i betjeningsevnekravet |
| Dokumentavgift | 2,5 % | fritak: nybygg ikke tatt i bruk, og borettslagsandeler |
| Rentefradrag | 22 % | |
| Folketrygd | 18,1 % opp til 7,1 G | G per 1. mai 2026: 136 549 kr |
| OTP, minimum | 2 % fra første krone | |
| Styringsrente | 4,25 % | hevet 6. mai 2026 |
| Boliglånsrente | 5,08 % | snitt utestående, mai 2026 (SSB) |
| KPI | 2,7 % | juni 2026 (SSB), mål 2,0 % |
| Realavkastning aksjer | 5,2 % | DMS verdensindeks 1900–2024 |
| Oljefondet, netto realt | 4,34 % | faktisk oppnådd siden 1998 (NBIM) |
| Forvaltningshonorar | 0,25 % indeks / 1,30 % aktiv | Finanstilsynets prisundersøkelse nov. 2024: globale indeksfond 0,18–0,61 %, aktive globale 0,75–2,00 % |

**Årlig ettersyn.** Sjekk `SATSER` mot Skatteetaten hver januar. Det som endres
oftest: trinnskattens innslagspunkt, personfradrag, minstefradrag, skjermingsrente,
grunnbeløpet (1. mai) og styringsrenten. Endrer du ett tall der, følger hele
spillet etter — ingen tall er skrevet inn i noen tekst.

Tre forbehold står også i spillet selv, fordi de er ærligere enn å late som:
skjermingsrenten for inneværende år **finnes ikke** før januar året etter;
gebyrtallene er fra november 2024, som er den nyeste prisundersøkelsen som finnes;
og verdensindeksens 5,2 % er **ikke** MSCI World, som er en annen indeks med en
annen starttid.

## Modellvalg som er verdt å vite om

Tre steder gjør spillet noe som ikke er åpenbart, og der et enklere valg ville
gjort tallene subtilt gale.

**Driftkorreksjonen.** 5,2 % fra DMS er *annualisert* avkastning. Mates den rett
inn som drift i en tilfeldig gang, mister medianen σ²/2 ≈ 1,4 prosentpoeng i året,
og simuleringen leverer systematisk mindre enn tabellen ved siden av påstår.
`F.drift(g, σ)` legger til σ²/2 slik at **medianutfallet** treffer det spillet
lærer bort. Målt av `test-matte.js` over 4 000 forløp på tretti år: uten
korreksjonen ligger medianen på 3,78 %, med den på 5,29 %.

**Fire lånskranker, ikke to.** Utlånsforskriften § 5 er et krav om *betjeningsevne*
— du skal ha nok igjen til å leve etter at renta har steget tre prosentpoeng — og
i praksis er det ofte den som stopper folk, ikke egenkapitalen. `F.laaneramme`
regner derfor egenkapital, gjeldsgrad *og* betjeningsevne, og lar eksisterende
gjeld spise av gjeldstaket. Ved startlønna i spillet ligger gjeldsgraden på
2 280 000 og betjeningsevnen på 2 301 590 — tjueen tusen fra hverandre. Det er
nettopp derfor banker sier nei til lån de to første kravene godtar.

**Indeksfondet er ikke et gratis aktivum.** I oppdrag H er indeksfondets
avkastning definert som den likevektede snittet av de fem sektorene. Det betyr at
det ikke er immunt mot at en sektor faller — det er bare aldri avhengig av at én
av dem ikke gjør det. Første utgave ga indeksfondet sin egen, mildere avkastning,
og «beviste» dermed diversifisering ved å dele ut noe gratis. Den varianten tåler
ikke at spilleren regner etter.

## Teknisk

- Canvas 2D for byen, **ekte DOM for minispillene**. Det gir lesbare tall,
  tastaturnavigasjon gratis, og lar testene klikke seg gjennom med vanlige
  selektorer. Grafene inne i minispillene er små lerret med en egen linjemotor.
- **Finansmotoren (`F`) er rene funksjoner uten tilstand og uten tegning.** Alt
  spillet påstår om penger kommer derfra, aldri fra en tekststreng. Det er derfor
  `test-matte.js` kan bevise 162 påstander uten å åpne spillet.
- **Rentekonvensjon, holdt fra hverandre med vilje:** avkastning regnes
  geometrisk (`mndRente`), fordi den oppgitte avkastningen *er* den årlige. Lån
  regnes nominelt/12 (`mndFraNominell`), fordi det er slik norske lån oppgis — og
  differansen er ikke avrunding: 22,9 % nominelt er 25,5 % effektivt. Effektiv
  rente **med** termingebyr løses numerisk som en IRR, fordi den ikke har lukket form.
- **Spillet startet ved midnatt.** Døgnfasen manglet en forskyvning, så
  `nattMengde()` sto på maksimum i sekundet du trykket START. Førsteinntrykket var
  en svart skjerm med noen gule lapper i. Nå åpner byen klokka 07:12.
- **Verden tegnes ikke under et overlegg.** Minispillene ligger over hele skjermen
  med `backdrop-filter`, og nettleseren måtte regne om uskarpheten for hver ramme
  fordi lerretet under fortsatte å endre seg. Målt: **21 fps med tegning, 60 uten.**
  Lerretet er urørt, så det står ferdig tegnet i det overlegget lukkes.
- **`createLinearGradient` per bygning per ramme** var den dyreste linja i Bakgata
  om natta. Erstattet med tre flate bånd som ser like ut på disse størrelsene:
  22,4 → 16,7 ms. Glødesprites på vinduer og lykter kulles på avstand, siden en
  natt-skjerm full av opplyste vinduer bare gir kostnad, ikke bilde.
- **Bakken bygges én gang** til et eget lerret i halv oppløsning, glødene bakes
  til sprites, og vignetten caches per vindusstørrelse.
- **Musikken planlegges én takt av gangen** med ca. to sekunders forsprang. Legger
  man ut hele runden, ligger hundrevis av noder i lydgrafen samtidig og lydtråden
  går gjennom alle for hver sampleblokk. Fire temaer, ett per bydelstype, alt i en
  liten WebAudio-synth — ingen lydfiler. Forgasserdalens etterkommer: Startgata er
  varm og enkel, Bankgata kjølig og ordnet, Børstorget har puls, Bakgata er urolig.
- **Lagring skjer på timer, ikke i løkka** — hvert sjette sekund. Målt: 15
  skrivinger på 391 rammer. All lesing går gjennom `lesTall`/`lesSett`/`lesObj`,
  som gir standardverdien i stedet for å krasje. `test-lagring.js` planter 294
  kombinasjoner av ødelagte nøkler og krever at spillet fortsatt starter og at alle
  seks fanene i menyen åpner.
- **Nullstilling rydder både lagring og minne.** Sletter man bare nøklene, skriver
  tilstanden i minnet seg selv tilbake ved neste lagring seks sekunder senere.
  Testen venter åtte sekunder nettopp for å fange det.
- **Tastelyttere hopper av hvis hendelsen kommer fra et `<input>`.** Uten det spiser
  W, A, S, D og mellomrom tegnene i skyvekontrollene inne i minispillene.
- **Landemerkene hadde et handlingsfelt fire piksler bredt.** Kollisjonsradiusen
  rundt statuen og treet var nesten like stor som radiusen der man kunne trykke
  handle, så de føltes ødelagte. Handlingsfeltet ligger nå klar av kollisjonen.
- Mobil-layouten er **målt, ikke antatt**: `test-mobil.js` henter bokser for alle
  HUD- og kontrollflater på 390×844, 360×640 og 820×1180 og feiler hvis to
  overlapper. Både `#hud × #minimap` og `#xpwrap × #hint` var reelle overlapp som
  ble funnet slik. Alle kontrollknapper er minst 44×44 px.
- Auto-pause ved fanebytte, `prefers-reduced-motion` respekteres, indekshistorikken
  er begrenset til 180 punkter.
- **Minispillene er ekte DOM, og det er også et tilgjengelighetsvalg.** Alle
  klikkbare elementer i alle fjorten oppdrag kan nås med Tab, brikkene i
  budsjettpuslespillet er `<button>` og ikke `<div>`, og det finnes en
  `:focus-visible`-regel så man ser hvor man står. Lerretet har en
  alternativtekst som sier hvordan man kommer til innholdet, siden et canvas
  ikke kan leses. To farger måtte lysnes for å komme over 4,5:1 — `--fare`
  lå på 4,44 og småteksten på tittelskjermen på 3,57. Fare-knappen har sin egen,
  mørkere bakgrunn, fordi hvit tekst på den lysere rødfargen bare gir 3,7:1.
- Én kjent begrensning: `user-scalable=no` i viewport-taggen. Touch-kontrollene
  trenger det for at gassknappen ikke skal zoome, men det hindrer knipezoom.
  `test-tilgjengelighet.js` skriver det ut ved hver kjøring i stedet for å skjule det.

## Testing

Åtte filer, 838 sjekker. `bash test-alle.sh` kjører alt over `file://`,
`bash test-alle.sh --http` starter en lokal server og kjører alt på nytt over HTTP.
Begge må være grønne: siden serveres over HTTPS i produksjon, og `file://` har sitt
eget origo-oppsett for `localStorage`.

| Fil | Hva den beviser |
|---|---|
| `test-matte.js` | Finansmotoren mot **uavhengig regnede** fasitverdier — samme svar, andre formler. Skatt på ni inntektsnivåer, annuitetsplaner, IRR med gebyr, ASK-uttak, formuesskatt, Fisher, lånerammer, stresstest, diversifiseringsgrense. Sjekker også hver tallpåstand spillet gjør i **tekst**. |
| `test-verden.js` | Bevegelse i seks retninger, at Shift faktisk er raskere, at vegger stopper og dører ikke gjør det, at **alle åtte bydeler kan nås til fots** (bredde-først-søk gjennom spillets egen kollisjon), at hver av de 25 dørene svarer med minst 160 tegn innhold, og at hver figur har minst to dialoglinjer. |
| `sjekk-kort.js` | Alle førti kort er fysisk mulige å plukke opp, ligger inne på kartet, er spredt over bydelene — og plukkes faktisk opp når man går dit. |
| `test-oppdrag.js` | **Alle fjorten oppdrag spilles gjennom med ekte klikk.** For hvert av dem sjekkes også at et *feil* svar ikke gir seier, og at fasitteksten sier det den skal. Til slutt: at fjorten oppdrag gir nivå 12, og at alt løst pluss alle kort gir INVESTOR. |
| `test-mobil.js` | Ingen HUD-overlapp på tre skjermstørrelser, ingen flate utenfor skjermen, alle knapper minst 44×44, at styrekorset faktisk flytter spilleren, og at MENY lukker minispillet i stedet for å legge menyen oppå det. |
| `test-lagring.js` | Fremgang overlever omlasting; 294 kombinasjoner av ødelagt lagring tar ikke ned spillet; nullstilling rydder minne så vel som lagring og skriver ikke tilbake etterpå; lagring skjer på timer. |
| `test-tilgjengelighet.js` | Kontrast regnet ut fra de **faktiske** fargene i DOM-en, ikke fra CSS-en man tror står der — 22 elementer mot WCGA 2.1 AA. At alle klikkbare elementer i alle fjorten oppdrag kan nås med Tab, at brikkene er ekte knapper, at det finnes en `:focus-visible`-regel, at grønt og rødt alltid har tekst ved siden av, og at spillet starter med `prefers-reduced-motion`. |
| `test-fps.js` | Fps per bydel med musikk på, i løp, om natta, og med hvert graftunge minispill åpent. Måler også spillets egen rammetid og at et skyvedrag i oppdrag G — som kjører 3 × 1 200 simuleringer — tar under 400 ms. |

### Fire spillfeil funnet av testene, ikke av øyet

1. **Oppdrag D var uløselig.** Skyveren gikk i steg på 100 kroner, og fasiten på
   1 645 lå 2,7 % fra nærmeste posisjon — mens kravet var 2 %. Ingen kunne klare det.
2. **Oppdrag G hadde mål som ikke kunne nås.** Depositumet krevde 120 000 kroner
   av 108 000 innbetalt, uansett aksjeandel. Målene og kravene er nå satt etter å
   ha *målt* fordelingen for hver aksjeandel, så hvert mål har et vindu — og
   vinduene flytter seg oppover med horisonten: 0–35 %, 40–60 %, 65–90 %.
3. **Finalen løste seg selv.** `MINI.N` tegnet forhåndsvisningen ved åpning, og
   standardvalgene nådde målet — så oppdraget var fullført før spilleren rørte
   noe. Nå må du trekke i spaken.
4. **Diversifisering var jukset til.** Indeksfondet i oppdrag H hadde sin egen,
   mildere avkastning, uavhengig av sektorene. Se «Modellvalg» over.

### To funnet ved å spille

Testene beviser at spillet virker, ikke at det er til å holde ut. En gjennomspilling
av de første minuttene fant to ting ingen sjekk så etter:

- **Å utforske ble straffet.** Faste utgifter løp fra første måned, også før man
  hadde tatt jobben på Jobbsenteret. Uten inntekt ble de overtrekk, og overtrekk
  ble forbruksgjeld til 22,9 %. En spiller som gjorde nøyaktig det spillet ber om
  — se deg rundt — sto etter fem spilte måneder med **106 000 kroner i gjeld og
  negativ formue**. Nå starter økonomien når du blir ansatt; før det bor du på
  ingenting. `test-verden.js` har fått en seksjon som holder fella ute.
- **Oppdrag G møtte deg med 409 ord.** Nesten to minutters lesing før du fikk røre
  en skyver, mot 42–178 ord i de tretten andre. Kuttet til 288; kravene sto
  allerede i tabellen under hver skyver.

### Og nitten funnet av en uavhengig gjennomgang

Da spillet var ferdig og testpakken grønn, gikk en egen gjennomgang over alt
faglig innhold — hver sats mot kilden, hver formel, og hvert tall som står i
*tekst* mot det motoren faktisk regner. Den fant nitten ting. De alvorligste var
ikke kodefeil, men steder der spillet lærte noe galt:

- **Borettslaget lærte feil egenkapitalkrav.** Tabellen viste at en
  borettslagsleilighet krever mindre egenkapital i kroner enn en selveier til
  samme totalpris. Det er den vanligste misforståelsen på boligmarkedet, og den er
  gal: fellesgjeld regnes med i *både* gjeldsgraden og belåningsgraden. Kravet er
  10 % av totalprisen i begge tilfeller. Borettslagets ene reelle fordel er
  dokumentavgiften.
- **ASK-gevinsten var fem ganger for stor.** Tabellen sammenlignet beløpet på ASK
  *før* uttak med en vanlig konto *etter* skatt, og oppga differansen som
  gevinsten ved utsatt skatt. Latent skatt er ikke formue. Riktig sammenligning
  gir en femtedel av tallet — og gevinsten er fortsatt reell.
- **Stresstesten var oppført som et feil svar.** Oppdrag L lærte at
  betjeningsevnen ikke betyr noe, i et regnestykke der stressterminen var 56 % av
  nettolønna. Løsningen var å modellere kravet, ikke å omskrive teksten.
- **IPS ble begrunnet med skattetrinn.** Fradraget gis i alminnelig inntekt med
  22 % uansett hvilket trinn du er i, og uttaket beskattes med de samme 22 %.
  Gevinsten ligger i formuesskattefritaket og den utsatte skatten — spillet sa det
  riktig ett sted og galt et annet.
- **All gjeld kostet boliglånsrente.** Låner du 50 000 av Rolf i Kvikklån til
  22,9 %, tok månedsoppgjøret 5,08 %. Spillet gjorde forbruksgjeld fire og en halv
  gang mindre farlig enn den er, i et spill der ett av oppdragene handler om
  nettopp det.
- **BSU og IPS var ikke bundet.** BSU-innskudd havnet i bufferen, så et uhell
  kunne betale tannlegen med dem; IPS havnet i porteføljen og kunne selges i
  Fondsbutikken — samtidig som skjermen sa «låst til 62 år». Begge har nå egne
  saldoer som teller i formuen, men ikke kan brukes.
- **Kryptoveddemålet hadde positiv forventningsverdi.** De sju utfallene ga et
  aritmetisk snitt på 1,22. Bakgata belønnet altså spekulasjon med 22 % forventet
  gevinst. Utfallene er skalert til snitt 1,00, og skjermen viser nå både
  medianen og det geometriske snittet, som begge er tap.
- **Rasmetoden og snøballmetoden ga identisk svar** i oppdrag E, fordi
  kredittkortet var både det dyreste og det minste lånet. Fasitsetningen om hva
  snøballmetoden koster skrev «0 kr». Beløpene er endret, og startrekkefølgen er
  ikke lenger den riktige — tre av fjorten oppdrag kunne løses med ett klikk.
- **«KJØP MER» vant på penger, ikke på atferd.** Valget skjøt inn kapital som
  aldri ble bokført, og fasiten krediterte differansen til mot. Nå er det tørt
  krutt du har én gang, det telles med, og benken får det samme liggende i
  kontanter.
- **Rentefondet var skattefritt** i oppdraget om realavkastning etter skatt, mens
  sparekontoen ble beskattet. Alle fire alternativene behandles nå som de faktisk
  gjør.
- **Vedlikeholdstabellen summerte til 1,4 %** under en tekst som sa at
  tommelfingerregelen på 1 % «stemmer». Nå står det at 1 % er den snille enden.
- **«Eie er ofte billigere enn å leie»** sto rett under en tabell som viste det
  motsatte, og begrunnelsen pekte på avdraget — nettopp posten som var holdt
  utenfor. Regnestykket er ferdigregnet nå, med alternativkostnaden på
  egenkapitalen, og konklusjonen er at spørsmålet ikke avgjøres av
  månedskostnaden.

Resten var mindre: forholdstall i to kunnskapskort, to gebyrintervaller som ikke
stemte med kilden de oppga, en aksjerisikopremie regnet på et annet tidsvindu enn
tallene rundt den, tre ulike avrundinger av samme prosenttall, en 5.-persentil
omtalt som «de fem prosent verste», og et par etterlatte tall i krøniken.

Gjennomgangen bekreftet samtidig at hele `SATSER`-blokka stemmer mot kilde, at
finansmotorens formler er riktige, og at rentekonvensjonene er konsekvente. Det
var innholdet rundt tallene som trengte arbeid — ikke tallene.

## Om universet

Alle personer, firmaer og steder er oppdiktet for dette spillet: Solveig, Halvard,
Gro, Rolf «Rask», Ingrid, Tobias, Fru Åkre, Kjell, Nervøse Nils, Amina, Bente, Odd,
Signe, Vera og Primus — og Kvikklån AS, Opptur Nettverk og Kasino Fortuna.
Statuen på torget er **Den ukjente spareren**: hun satte av litt, hver måned, i
førti år, og ingen skrev om henne i avisen. Det er ingen historie der, og det er
poenget.

Navnene på ekte institusjoner — Skatteetaten, Norges Bank, NAV, Finanstilsynet,
Lånekassen — brukes bare der spillet gjengir hva de faktisk gjør eller sier.
Svindelmeldingene i oppdrag M er skrevet etter mønstrene Finans Norge og
Finanstilsynet beskriver, ikke etter virkelige enkeltsaker.

## Ansvar

Renteriket er en lærebok med føtter, ikke finansiell rådgivning. Tallene er ekte,
men forenklet der forenklingen ikke endrer poenget — og der den *kunne* endret
poenget, står forbeholdet i teksten. Simuleringene bruker historisk avkastning og
volatilitet; virkeligheten har fetere haler enn en normalfordeling, så de virkelig
dårlige årene er verre og kommer oftere enn modellen tror. Bruk tallene til å
forstå mekanikken, ikke til å spå. Og sjekk alltid Skatteetaten før du gjør noe
med egne penger.
