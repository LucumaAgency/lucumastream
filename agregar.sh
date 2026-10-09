#!/bin/bash
# Uso: ./agregar.sh "tema" < preguntas.txt   (una pregunta por línea)
source ~/.lucumastream.env
TEMA="${1:-}"
python3 -c 'import sys,json;print(json.dumps({"texto":sys.stdin.read(),"tema":sys.argv[1],"autor":"Lucuma Agency Bot"}))' "$TEMA" \
 | curl -sk -X POST "$LUCUMASTREAM_URL/api/preguntas/bulk" -H "content-type: application/json" -H "x-admin-token: $LUCUMASTREAM_TOKEN" -d @-
echo
