#!/usr/bin/env bash
# Despliega Órbita en testnet y corre una demo completa:
# crear → aportar → votar → liberar etapa 1 → cargar evidencia → votar → liberar etapa 2.
# Requiere: stellar CLI y rustup target add wasm32v1-none
set -euo pipefail

RED=testnet
LOG=deploy.log
: > "$LOG"
log() { echo "$@" | tee -a "$LOG"; }

log "== 1. Cuentas de prueba (fondeadas con friendbot) =="
for cuenta in dueno ana beto orbita; do
  stellar keys generate "$cuenta" --network "$RED" --fund 2>/dev/null || stellar keys fund "$cuenta" --network "$RED" || true
  log "$cuenta: $(stellar keys address "$cuenta")"
done
DUENO=$(stellar keys address dueno)
ANA=$(stellar keys address ana)
BETO=$(stellar keys address beto)
ORBITA=$(stellar keys address orbita) # plataforma: cobra el 2 % de cada etapa liberada

log "== 2. Compilar contrato =="
stellar contract build
WASM=$(find target -name orbita.wasm -path "*release*" | head -n 1)
log "wasm: $WASM"

log "== 3. Desplegar (token = XLM nativo de testnet) =="
TOKEN=$(stellar contract id asset --asset native --network "$RED")
log "token: $TOKEN"
CONTRATO=$(stellar contract deploy --wasm "$WASM" --source dueno --network "$RED" -- --token "$TOKEN" --plataforma "$ORBITA")
log "CONTRACT_ID: $CONTRATO"
saldo_orbita() { stellar contract invoke --id "$TOKEN" --source dueno --network "$RED" -- balance --id "$ORBITA" 2>/dev/null | tr -d '"'; }
ORBITA_ANTES=$(saldo_orbita)

invocar() { # $1 = cuenta firmante, resto = funcion y argumentos
  local firmante=$1; shift
  stellar contract invoke --id "$CONTRATO" --source "$firmante" --network "$RED" -- "$@" 2>&1 | tee -a "$LOG"
}

log "== 4. Demo: proyecto con 2 etapas (60 + 40 XLM) =="
PLAZO=$(( $(date +%s) + 30 * 24 * 3600 ))
invocar dueno crear_proyecto --dueno "$DUENO" \
  --titulo "Huerta comunitaria Barrio Esperanza" \
  --descripcion "Huerta para 40 familias del barrio: semillas, herramientas y riego por goteo." \
  --imagen "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/huerta.svg" \
  --plazo "$PLAZO" \
  --hitos '["Compra de semillas y herramientas","Sistema de riego por goteo"]' \
  --montos '["600000000","400000000"]'

log "== 5. Aportes (Ana 70 XLM, Beto 30 XLM) =="
invocar ana aportar --id 0 --aportante "$ANA" --monto 700000000
invocar beto aportar --id 0 --aportante "$BETO" --monto 300000000

log "== 6. Etapa 1: Ana vota liberar la plata y el dueño cobra =="
invocar ana votar --id 0 --aportante "$ANA" --aprobar true
invocar dueno liberar --id 0

log "== 7. El dueño carga la evidencia de la etapa 1 =="
invocar dueno cargar_evidencia --id 0 --hito 0 \
  --url "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/evidencia-etapa1.svg"

log "== 8. Etapa 2: Ana vota liberar la plata y el dueño cobra =="
invocar ana votar --id 0 --aportante "$ANA" --aprobar true
invocar dueno liberar --id 0

log "== 9. Estado final =="
invocar dueno proyecto --id 0
ORBITA_DESPUES=$(saldo_orbita)
log "Comisión cobrada por Órbita: $(( ORBITA_DESPUES - ORBITA_ANTES )) stroops (1 XLM = 10.000.000)"

log ""
log "Listo. Contrato: https://stellar.expert/explorer/testnet/contract/$CONTRATO"
log "Copiá CONTRACT_ID en docs/config.js y en el README. Los hashes de cada transacción están en $LOG y en la pestaña de historial del explorador."
