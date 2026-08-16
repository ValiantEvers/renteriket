// Hvilken Chromium testpakka skal starte.
//
// Stien var hardkodet til '/opt/pw-browsers/chromium' i alle åtte testfilene, så pakka
// kunne bare kjøres på Linux-maskinen den sist ble kjørt på. På Windows feilet alle åtte
// på to sekunder — «browserType.launch: Failed to launch chromium because executable
// doesn't exist» — uten at én eneste av de 967 sjekkene kjørte. Kommentaren i
// test-alle.sh lovet allerede oppførselen under; nå stemmer den med koden.
//
//   RR_CHROMIUM=<sti>          overstyrer alt
//   /opt/pw-browsers/chromium  brukes hvis den finnes (Linux-oppsettet, uendret)
//   ellers                     undefined → Playwright finner sin egen nedlastede browser
//
// Siste ledd krever at browseren er hentet én gang: `npx playwright install chromium`.
// Merk at revisjonen må matche playwright-versjonen i package.json — 1.62.1 vil ha
// chromium-1234, og en eldre nedlastet revisjon holder ikke.
const fs = require('fs');

const LINUX = '/opt/pw-browsers/chromium';

function chromiumPath() {
  if (process.env.RR_CHROMIUM) return process.env.RR_CHROMIUM;
  if (fs.existsSync(LINUX)) return LINUX;
  return undefined;
}

module.exports = chromiumPath();
