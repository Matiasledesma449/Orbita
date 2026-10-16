#!/usr/bin/env bash
# Despliega Órbita en testnet y corre una demo completa:
# crear → aportar → votar → liberar etapa 1 → cargar evidencia → votar → liberar etapa 2
# → el dueño devuelve el préstamo → cada aportante cobra su parte.
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

log "== 4. Demo: préstamo al 10 % en 2 etapas (60 + 40 XLM) =="
DIA=$(( 24 * 3600 ))
PLAZO=$(( $(date +%s) + 30 * DIA ))        # para juntar la plata
FECHA1=$(( PLAZO + 30 * DIA ))             # etapa 1: fecha límite para la evidencia
FECHA2=$(( PLAZO + 60 * DIA ))             # etapa 2: fecha límite para la evidencia
DEVOLUCION=$(( $(date +%s) + 180 * DIA ))  # para esta fecha, devolver la suma de los mínimos
invocar dueno crear_proyecto --dueno "$DUENO" \
  --titulo "Huerta comunitaria Barrio Esperanza" \
  --descripcion "Huerta para 40 familias del barrio: semillas, herramientas y riego por goteo." \
  --imagen "https://raw.githubusercontent.com/Matiasledesma449/Orbita/v2/docs/img/huerta.svg" \
  --tipo_retorno 0 \
  --condiciones "Préstamo al 10 %: devolvemos 110 XLM (66 por la etapa 1 y 44 por la etapa 2) antes de la fecha de devolución, a 180 días." \
  --plazo "$PLAZO" \
  --hitos '["Compra de semillas y herramientas","Sistema de riego por goteo"]' \
  --montos '["600000000","400000000"]' \
  --minimos '["660000000","440000000"]' \
  --fechas "[$FECHA1,$FECHA2]" \
  --fecha_devolucion "$DEVOLUCION"

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

log "== 9. El dueño devuelve el préstamo: paga 110 XLM (60 + 40 + 10 %) al contrato =="
invocar dueno pagar_retorno --id 0 --pagador "$DUENO" --monto 1100000000

log "== 10. Cada uno cobra su parte: Ana 77 XLM (70 %) y Beto 33 XLM (30 %) =="
invocar ana cobrar --id 0 --aportante "$ANA"
invocar beto cobrar --id 0 --aportante "$BETO"

log "== 11. Historial público: lo prometido contra lo pagado =="
log "Prometido (mínimos de las etapas liberadas):"
invocar ana prometido --id 0
log "Pago 1 del historial:"
invocar ana pago --id 0 --n 0

log "== 12. Estado final =="
invocar dueno proyecto --id 0
ORBITA_DESPUES=$(saldo_orbita)
log "Comisión cobrada por Órbita: $(( ORBITA_DESPUES - ORBITA_ANTES )) stroops (1 XLM = 10.000.000)"

log ""
log "Listo. Contrato: https://stellar.expert/explorer/testnet/contract/$CONTRATO"
log "Copiá CONTRACT_ID en docs/config.js y en el README. Los hashes de cada transacción están en $LOG y en la pestaña de historial del explorador."
