# 🪐 Órbita

**Tokenizamos proyectos de personas y empresas argentinas. La plata se libera solo cuando cumplen.**

Proyecto para el **Stellar Track · NEA Tech 2026 (Corrientes)**.

---

## El problema

En Argentina sobran ideas y falta financiamiento. Un emprendedor, una cooperativa o una PyME que necesita USD 2.000 para arrancar no consigue crédito bancario, y si pide plata a la comunidad aparece el otro problema: **nadie confía en que la plata se use para lo prometido**. La mayoría de los proyectos que nacen en una hackathon mueren la semana siguiente por esto.

## La solución

Órbita es un financiamiento colectivo **por hitos**, sobre un contrato inteligente en Stellar:

1. **El dueño publica su proyecto** dividido en etapas (hitos), cada una con su monto.
2. **La comunidad aporta** y recibe **participaciones** 1:1. Las participaciones son el token del proyecto: definen el voto y el reembolso de cada aportante.
3. **La plata queda en el contrato**, no en la cuenta del dueño.
4. **Cada etapa se vota.** Si más del 50% de las participaciones aprueba, el dueño cobra esa etapa.
5. **Si más del 50% rechaza**, o si el plazo vence sin juntar la meta, cada aportante recupera su parte proporcional de lo que no se liberó.

Nadie, ni el dueño ni nosotros, puede mover la plata por fuera de esas reglas.

## Validación

> Completar con los resultados de las entrevistas y la encuesta del evento.

- Personas entrevistadas: **_N_**
- Frases destacadas: _"..."_
- ¿Usarían Órbita para financiar su proyecto? Promedio: **_X/10_**
- Evidencia (fotos, audios, formulario): _link_

## Demo en testnet

| Dato | Valor |
|---|---|
| Demo funcional | _link (Netlify / Vercel / GitHub Pages)_ |
| Contract ID | `CAACEJBBUWX4XGU7IPD7CMMYVCDLVZNDR5T2CIWSGNLPQTL3JTQ63HTZ` |
| Contrato en el explorador | https://stellar.expert/explorer/testnet/contract/CAACEJBBUWX4XGU7IPD7CMMYVCDLVZNDR5T2CIWSGNLPQTL3JTQ63HTZ |
| Transacción de ejemplo (aporte) | [`1736d2de223f…`](https://stellar.expert/explorer/testnet/tx/1736d2de223fa5f65563ac7b53ddf1d61f834fa13671a1b277b93ad74c7578c9) |
| Transacción de ejemplo (liberar hito) | [`d216cde29001…`](https://stellar.expert/explorer/testnet/tx/d216cde29001cee63b4a1cbf90374e0da9acb740fd91795ee281cc9c2bd54cd2) |
| Cuenta dueño | `GATS2EHF42FROT74AQMSGJ4V5MGVHFROPRXVTS2ZFQ2JBZLHO4CRD4TT` |
| Cuentas aportantes | Ana: `GDHJ7NAITECFMK6WTNPXCVNESY3YZV5KMABFM3OQ6MPSIY6PBRCYDXLL`, Beto: `GDJHGY7FDKMM3OR44KVJDWYUHZJ6PTGQIEDORRYXLLEBZ72LBVKMXOCM` |
| Video demo | _link YouTube / Drive_ |

## Herramientas de Stellar que usamos

- **Soroban** (smart contract en **Rust**, `soroban-sdk`)
- **Stellar CLI** para compilar, desplegar e invocar
- **Stellar SDK (JavaScript)** para leer y enviar transacciones desde el frontend
- **Stellar RPC** de testnet
- **Freighter** para firmar con la billetera del usuario
- **Stellar Asset Contract (SAC)**: el contrato mueve XLM nativo en testnet; en producción, USDC

## Arquitectura

```
Usuario ──(Freighter firma)──> Frontend (HTML + Stellar SDK)
                                   │
                                   ▼
                         Stellar RPC (testnet)
                                   │
                                   ▼
                    Contrato Soroban "Órbita"
                    ├─ crear_proyecto(dueno, titulo, plazo, hitos, montos)
                    ├─ aportar(id, aportante, monto)       → participaciones
                    ├─ votar(id, aportante, aprobar)       → peso = participación
                    ├─ liberar(id)                          → paga el hito al dueño
                    ├─ reembolsar(id, aportante)            → parte proporcional
                    └─ lecturas: proyecto, cantidad, participacion, ya_voto, token
                                   │
                                   ▼
                     Token (XLM SAC en testnet / USDC)
```

## Estructura del repo

```
contracts/orbita/src/lib.rs   contrato Soroban
contracts/orbita/src/test.rs  tests unitarios
scripts/deploy.sh              despliegue + demo completa en testnet
docs/                          app web (index.html, app.js, config.js), publicada con GitHub Pages
```

## Instalación

Requisitos: Rust, Stellar CLI y Node (solo para servir el frontend localmente).

```bash
# Rust y target de Soroban
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none

# Stellar CLI (una de las dos)
brew install stellar-cli
cargo install --locked stellar-cli
```

## Testing

```bash
cargo test
```

Los tests cubren: flujo exitoso completo, hito rechazado con reembolso proporcional, reembolso por plazo vencido, no liberar sin mayoría, no votar dos veces y no superar la meta.

## Despliegue en testnet

```bash
bash scripts/deploy.sh
```

El script crea y fondea tres cuentas (`dueno`, `ana`, `beto`), compila, despliega el contrato y corre una demo completa: crea un proyecto, recibe dos aportes, aprueba el primer hito y lo libera. Imprime el **CONTRACT_ID** y guarda todo en `deploy.log`.

## Frontend

La demo pública se sirve con **GitHub Pages** desde la carpeta `/docs` de la rama `main`.

1. Pegá el CONTRACT_ID en `docs/config.js` (ya está cargado el del despliegue en testnet).
2. Servilo localmente:
   ```bash
   cd docs && npx serve .
   ```
3. Instalá [Freighter](https://freighter.app), elegí la red **Testnet** y conectá.
4. Para publicarlo: GitHub Pages ya sirve `/docs` desde `main` (también se puede arrastrar la carpeta `docs` a Netlify Drop).

## Qué se hizo durante la hackathon

Todo el proyecto es nuevo: idea, contrato, tests, frontend y scripts se desarrollaron entre el jueves 15/10 y el viernes 16/10 durante NEA Tech.

## Uso de inteligencia artificial

Usamos **Claude (Anthropic)** como asistente para analizar las bases, idear el proyecto, escribir el contrato, los tests, el frontend y este README. El equipo revisó, compiló, probó y desplegó el código.

## Próximos pasos

- **Participaciones transferibles** con la interfaz estándar de tokens de Stellar (SEP-41), para un mercado secundario.
- **USDC y anchors (SEP-24)** para aportar y cobrar en pesos argentinos sin tocar cripto.
- **Passkeys** para entrar sin frase semilla.
- **Versión de inversión** dentro del régimen de tokenización de la CNV.
- **Evidencia por hito**: que el dueño suba fotos o documentos y los aportantes voten viéndolos.

## Licencia

MIT
