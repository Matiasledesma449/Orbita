#!/usr/bin/env bash
# Demo de la regla del mercado: quien votó la etapa en curso no puede vender hasta que
# la etapa se resuelva. Beto vota, intenta vender (rechazado), se libera la etapa y
# entonces sí vende y Ana compra.
# Uso: bash scripts/demo-mercado.sh <CONTRACT_ID>   (el que imprime scripts/deploy.sh)
set -euo pipefail

CONTRATO=${1:?Falta el CONTRACT_ID}
RED=testnet
LOG=demo-mercado.log
: > "$LOG"
log() { echo "$@" | tee -a "$LOG"; }
invocar() { # $1 = cuenta firmante, resto = funcion y argumentos
  local firmante=$1; shift
  stellar contract invoke --id "$CONTRATO" --source "$firmante" --network "$RED" -- "$@" 2>&1 | tee -a "$LOG"
}
DUENO=$(stellar keys address dueno)
ANA=$(stellar keys address ana)
BETO=$(stellar keys address beto)

DIA=$(( 24 * 3600 ))
PLAZO=$(( $(date +%s) + 30 * DIA ))
ID=$(stellar contract invoke --id "$CONTRATO" --source dueno --network "$RED" -- cantidad 2>/dev/null)

log "== 1. Proyecto $ID financiado: Ana 70 XLM, Beto 30 XLM =="
invocar dueno crear_proyecto --dueno "$DUENO" \
  --titulo "Demo: mercado de participaciones" \
  --descripcion "Beto vota y quiere vender su participación." \
  --imagen "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/huerta.svg" \
  --tipo_retorno 1 \
  --condiciones "5 % de las ventas durante un año." \
  --plazo "$PLAZO" \
  --hitos '["Etapa 1","Etapa 2"]' \
  --montos '["600000000","400000000"]' \
  --minimos '["50000000","50000000"]' \
  --fechas "[$(( PLAZO + 30 * DIA )),$(( PLAZO + 60 * DIA ))]" \
  --fecha_devolucion "$(( PLAZO + 365 * DIA ))"
invocar ana aportar --id "$ID" --aportante "$ANA" --monto 700000000
invocar beto aportar --id "$ID" --aportante "$BETO" --monto 300000000

log "== 2. Beto vota la etapa 1 =="
invocar beto votar --id "$ID" --aportante "$BETO" --aprobar true

log "== 3. Beto intenta vender: tiene que ser RECHAZADO (error #21, votó la etapa en curso) =="
if invocar beto ofrecer_venta --id "$ID" --vendedor "$BETO" --cantidad 300000000 --precio 320000000; then
  log "ERROR: la venta debió ser rechazada"; exit 1
fi
log "Rechazada, como se esperaba. No se envió ninguna transacción."

log "== 4. Ana vota y el dueño libera la etapa 1: la etapa se resolvió =="
invocar ana votar --id "$ID" --aportante "$ANA" --aprobar true
invocar dueno liberar --id "$ID"

log "== 5. Ahora Beto sí puede vender, y Ana compra =="
invocar beto ofrecer_venta --id "$ID" --vendedor "$BETO" --cantidad 300000000 --precio 320000000
invocar ana comprar --id "$ID" --comprador "$ANA" --vendedor "$BETO" --cantidad 300000000 --precio_max 320000000

log "== 6. Participaciones finales =="
log "Ana:"; invocar ana participacion --id "$ID" --aportante "$ANA"
log "Beto:"; invocar ana participacion --id "$ID" --aportante "$BETO"
