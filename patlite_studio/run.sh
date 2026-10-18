#!/bin/sh
set -e
# Home Assistant writes add-on options to /data/options.json
if [ -f /data/options.json ]; then
  PATLITE_HOST=$(node -e 'try{process.stdout.write(require("/data/options.json").device_host||"")}catch(e){}')
  export PATLITE_HOST
fi
echo "PATLITE Light Show Studio on :${PORT} — tower ${PATLITE_HOST:-<set in app>}"
exec node /app/.output/server/index.mjs
