#!/bin/sh
# Runs both routes at every level on every sample; prints one JSON line per run with peak RSS.
cd "$(dirname "$0")"
mkdir -p out
for f in text-only scan-20 scan-100 scan-300; do
  for level in smaller balanced best; do
    for r in gs pdflib; do
      res=$( { /usr/bin/time -l node --max-old-space-size=8192 run-$r.mjs samples/$f.pdf $level out/$r-$f-$level.pdf 2>&1; echo "exit=$?"; } )
      json=$(echo "$res" | grep '^{')
      rss=$(echo "$res" | awk '/maximum resident/ {printf "%d", $1/1e6}')
      [ -z "$json" ] && json="{\"route\":\"$r\",\"level\":\"$level\",\"error\":\"$(echo "$res" | grep -m1 -iE 'error|abort|memory' | tr -d '"' | cut -c1-120)\"}"
      echo "{\"file\":\"$f\",\"peakRssMB\":$rss,\"run\":$json}"
    done
  done
done
