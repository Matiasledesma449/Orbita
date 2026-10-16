#!/usr/bin/env bash
# Demo de la regla "etapa vencida sin evidencia": el dueño cobra la etapa 1, no carga la
# evidencia a tiempo y cada aportante retira su parte de lo que queda, sin votar.
# Las fechas son de pocos minutos para poder verlo en vivo en testnet.
# Uso: bash scripts/demo-vencimiento.sh <CONTRACT_ID>   (el que imprime scripts/deploy.sh)
set -euo pipefail

CONTRATO=${1:?Falta el CONTRACT_ID}
RED=testnet
LOG=demo-vencimiento.log
: > "$LOG"
log() { echo "$@" | tee -a "$LOG"; }
invocar() { # $1 = cuenta firmante, resto = funcion y argumentos
  local firmante=$1; shift
  stellar contract invoke --id "$CONTRATO" --source "$firmante" --network "$RED" -- "$@" 2>&1 | tee -a "$LOG"
}
DUENO=$(stellar keys address dueno)
ANA=$(stellar keys address ana)
BETO=$(stellar keys address beto)

AHORA=$(date +%s)
PLAZO=$(( AHORA + 120 ))      # 2 min para juntar la plata
FECHA1=$(( AHORA + 240 ))     # 4 min: vence la evidencia de la etapa 1
FECHA2=$(( AHORA + 360 ))
DEVOLUCION=$(( AHORA + 480 ))
ID=$(stellar contract invoke --id "$CONTRATO" --source dueno --network "$RED" -- cantidad 2>/dev/null)

log "== 1. Proyecto $ID con fechas cortas (evidencia de la etapa 1 hasta $(date -d @$FECHA1 +%H:%M:%S)) =="
invocar dueno crear_proyecto --dueno "$DUENO" \
  --titulo "Demo: etapa vencida sin evidencia" \
  --descripcion "El dueño cobra la etapa 1 y no muestra lo que hizo." \
  --imagen "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/huerta.svg" \
  --tipo_retorno 0 \
  --condiciones "Préstamo al 10 % (demo de vencimiento)." \
  --plazo "$PLAZO" \
  --hitos '["Etapa 1","Etapa 2"]' \
  --montos '["600000000","400000000"]' \
  --minimos '["660000000","440000000"]' \
  --fechas "[$FECHA1,$FECHA2]" \
  --fecha_devolucion "$DEVOLUCION"

log "== 2. Aportes, voto y liberación de la etapa 1 =="
invocar ana aportar --id "$ID" --aportante "$ANA" --monto 700000000
invocar beto aportar --id "$ID" --aportante "$BETO" --monto 300000000
invocar ana votar --id "$ID" --aportante "$ANA" --aprobar true
invocar dueno liberar --id "$ID"

log "== 3. El dueño NO carga la evidencia. Esperamos a que venza la fecha... =="
ESPERA=$(( FECHA1 + 30 - $(date +%s) ))
[ "$ESPERA" -gt 0 ] && sleep "$ESPERA"

log "== 4. Cualquiera llama a revisar: el proyecto pasa a Fallido (3) =="
invocar ana revisar --id "$ID"

log "== 5. Ana y Beto retiran su parte de lo que quedaba (40 XLM), sin votar =="
invocar ana reembolsar --id "$ID" --aportante "$ANA"
invocar beto reembolsar --id "$ID" --aportante "$BETO"

log "== 6. Estado final =="
invocar ana proyecto --id "$ID"
