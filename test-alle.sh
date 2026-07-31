#!/usr/bin/env bash
# Hele testpakken. Kjør: bash test-alle.sh
# Krever «npm i -D playwright» én gang. Bruker Chromium fra
# PLAYWRIGHT_BROWSERS_PATH hvis den finnes, ellers Playwrights egen.
set -u
cd "$(dirname "$0")"
FEIL=0
for t in test-matte.js test-verden.js sjekk-kort.js test-oppdrag.js \
         test-mobil.js test-lagring.js test-fps.js; do
  printf '\n\033[1m════ %s ════\033[0m\n' "$t"
  if node "$t"; then :; else FEIL=$((FEIL+1)); fi
done
printf '\n════════════════════════════════════════\n'
if [ "$FEIL" -eq 0 ]; then echo "✓ hele pakken er grønn"; else echo "✗ $FEIL testfil(er) feilet"; fi
exit "$FEIL"
