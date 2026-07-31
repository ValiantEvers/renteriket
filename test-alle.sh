#!/usr/bin/env bash
# Hele testpakken.
#   bash test-alle.sh              kjører mot file://
#   bash test-alle.sh --http       starter en lokal HTTP-server og kjører mot den
#
# Krever «npm i -D playwright» én gang. Bruker Chromium fra
# PLAYWRIGHT_BROWSERS_PATH hvis den finnes, ellers Playwrights egen.
#
# --http er ikke pynt: siden serveres over HTTPS i produksjon, og file:// har sitt
# eget origo-oppsett for localStorage. Kjør begge før noe skrives av som ferdig.
set -u
cd "$(dirname "$0")"
FEIL=0
SRV=""
if [ "${1:-}" = "--http" ]; then
  PORT=${PORT:-8731}
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  SRV=$!
  trap 'kill $SRV 2>/dev/null' EXIT INT TERM
  sleep 1
  export RR_URL="http://127.0.0.1:$PORT/index.html"
  printf 'kjører mot %s\n' "$RR_URL"
fi
for t in test-matte.js test-verden.js sjekk-kort.js test-oppdrag.js \
         test-mobil.js test-tilgjengelighet.js test-lagring.js test-fps.js; do
  printf '\n\033[1m════ %s ════\033[0m\n' "$t"
  if node "$t"; then :; else FEIL=$((FEIL+1)); fi
done
printf '\n════════════════════════════════════════\n'
if [ "$FEIL" -eq 0 ]; then echo "✓ hele pakken er grønn"; else echo "✗ $FEIL testfil(er) feilet"; fi
exit "$FEIL"
