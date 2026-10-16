#!/usr/bin/env bash
# Demo de la regla "incumplido": el dueño recibe la plata, carga la evidencia, pero no
# devuelve para la fecha de devolución. El proyecto queda marcado "incumplido" para
# siempre, aunque después pague. Las fechas son de pocos minutos para verlo en vivo.
# Uso: bash scripts/demo-incumplido.sh <CONTRACT_ID>   (el que imprime scripts/deploy.sh)
set -euo pipefail

CONTRATO=${1:?Falta el CONTRACT_ID}
RED=testnet
LOG=demo-incumplido.log
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
PLAZO=$(( AHORA + 120 ))       # 2 min para juntar la plata
FECHA1=$(( AHORA + 240 ))      # 4 min para cargar la evidencia
DEVOLUCION=$(( AHORA + 300 ))  # 5 min: fecha para devolver los 66 XLM prometidos
ID=$(stellar contract invoke --id "$CONTRATO" --source dueno --network "$RED" -- cantidad 2>/dev/null)

log "== 1. Proyecto $ID: préstamo de 60 XLM, devuelve 66 hasta las $(date -d @$DEVOLUCION +%H:%M:%S) =="
invocar dueno crear_proyecto --dueno "$DUENO" \
  --titulo "Demo: no devuelve a tiempo" \
  --descripcion "El dueño cumple la etapa pero no devuelve el préstamo a tiempo." \
  --imagen "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/huerta.svg" \
  --tipo_retorno 0 \
  --condiciones "Préstamo al 10 %: devolvemos 66 XLM antes de la fecha de devolución." \
  --plazo "$PLAZO" \
  --hitos '["Etapa única"]' \
  --montos '["600000000"]' \
  --minimos '["660000000"]' \
  --fechas "[$FECHA1]" \
  --fecha_devolucion "$DEVOLUCION"

log "== 2. Aportes, voto, liberación y evidencia a tiempo =="
invocar ana aportar --id "$ID" --aportante "$ANA" --monto 420000000
invocar beto aportar --id "$ID" --aportante "$BETO" --monto 180000000
invocar ana votar --id "$ID" --aportante "$ANA" --aprobar true
invocar dueno liberar --id "$ID"
invocar dueno cargar_evidencia --id "$ID" --hito 0 \
  --url "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/evidencia-etapa1.svg"

log "== 3. El dueño NO devuelve. Esperamos a que pase la fecha de devolución... =="
ESPERA=$(( DEVOLUCION + 30 - $(date +%s) ))
[ "$ESPERA" -gt 0 ] && sleep "$ESPERA"

log "== 4. Cualquiera llama a revisar: el proyecto queda incumplido =="
invocar ana revisar --id "$ID"

log "== 5. El dueño paga tarde los 66 XLM: la marca queda, el historial muestra la fecha =="
invocar dueno pagar_retorno --id "$ID" --pagador "$DUENO" --monto 660000000
invocar ana pago --id "$ID" --n 0

log "== 6. Ana (70 %) y Beto (30 %) cobran igual: 46,2 y 19,8 XLM =="
invocar ana cobrar --id "$ID" --aportante "$ANA"
invocar beto cobrar --id "$ID" --aportante "$BETO"

log "== 7. Estado final =="
invocar ana proyecto --id "$ID"
