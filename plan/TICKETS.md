# Órbita v2 — Tickets

Reglas: un ticket por vez, en orden, en la rama `v2`. Cada ticket se cierra solo con **tests en verde + prueba en testnet + hash de transacción**. Ver `CLAUDE.md`.

Estado: ⬜ pendiente · 🔄 en curso · ✅ terminado · 🌅 queda para después de las 6:00

## Orden y estimación

Estimación hecha el viernes 16/10 a las 18:20, con corte el sábado a las 6:00 (unas 11 h). Incluye la prueba en testnet de cada ticket, pero no el tiempo de espera de las aprobaciones.

| # | Ticket | Estimado | Antes de las 6:00 |
|---|---|---|---|
| T1 | Contrato v2: descripción, imagen y evidencia | — | ✅ hecho |
| I1 | Comisión de Órbita (2 %) | 40 min | ✅ hecho |
| I2 | Datos de inversión al publicar | 1 h | sí |
| I3 | Etapa vencida sin evidencia → retiro sin votar | 1 h | sí |
| I4 | Pagos del dueño y reparto acumulado (`pagar_retorno` / `cobrar`) | 2 h | sí |
| I5 | Historial de pagos e "incumplido" | 1 h | sí |
| T2 | USDC de testnet como moneda | 1 h 15 | sí |
| T4 | Web: lo de T1 + datos de inversión, pagos y cobro | 2 h 30 | ⚠️ justo (es lo último que entra) |
| I6 | Mercado de participaciones (ofrecer / comprar) | 2 h | 🌅 después |
| T3 | Stellar Wallets Kit | 2 h | 🌅 después |
| T5 | Confianza: números, reglas, FAQ | 1 h 30 | 🌅 después |
| T6 | (Opcional) Passkeys | 3 h | 🌅 después |
| T7 | README y pasar v2 a main | 45 min | 🌅 después (o antes, si sobra tiempo) |

Hasta T4 suman unas 9 h 25 de trabajo. Con las esperas de aprobación, se llega a las 6:00 bastante justo. El mercado (I6) es el ticket más complejo y el que más riesgo tiene: queda para después, para priorizar que la web muestre la inversión.

Diseño del contrato: ver `plan/ADR-001-inversion.md`.

---

## T1. Contrato v2: descripción, imagen y evidencia por etapa ✅

**Objetivo:** que cada proyecto cuente qué es y muestre una imagen, y que el dueño suba una prueba de lo que hizo antes de pedir plata. El voto pasa a significar "liberar la plata de la próxima etapa".

**Qué cambia**
- `Proyecto` suma `descripcion: String` e `imagen: String` (URL).
- `Hito` suma `evidencia: String` (URL, vacía al principio).
- Nueva función `cargar_evidencia(id, n_hito, url)`, que solo puede llamar el dueño.
- Votar significa "liberar la plata de la próxima etapa". Regla acordada: la etapa 1 se vota apenas el proyecto se financia; desde la etapa 2, el dueño tiene que haber cargado antes la evidencia de la etapa anterior. El resto de la lógica (mayoría >50 %, rechazo → reembolso proporcional) queda igual.
- Límites de largo en los textos, para no gastar de más en almacenamiento.
- Tests nuevos: cargar evidencia, que nadie más que el dueño pueda hacerlo, y no votar sin evidencia.
- Actualizar `scripts/deploy.sh` (nuevos argumentos) y lo mínimo de `docs/app.js` para que no se rompa.

**Cómo se prueba en testnet**
- `cargo test` en verde.
- Desplegar el contrato v2 en testnet (contrato nuevo; el v1 de `main` no se toca).
- Demo con el CLI: crear proyecto con descripción e imagen → aportes → el dueño carga evidencia → voto → liberar.
- Evidencia: CONTRACT_ID v2 y los hashes de `cargar_evidencia` y `liberar`.

**Evidencia (16/10/2026)**
- `cargo test`: 12 de 12 en verde (6 anteriores + 6 nuevos).
- Contrato v2 en testnet: [`CB343VI2B4A2KRPKPT6TI3DXSIOH443DDZLFMNEPTDDOU7GPS7UV2U7P`](https://stellar.expert/explorer/testnet/contract/CB343VI2B4A2KRPKPT6TI3DXSIOH443DDZLFMNEPTDDOU7GPS7UV2U7P)
- Transacciones:
  - crear_proyecto (con descripción e imagen): [`47434d48900c…`](https://stellar.expert/explorer/testnet/tx/47434d48900c567d1f1fa152d1d531603c52f585497e247a40299924e961a6ef)
  - aportar (Ana, 70 XLM): [`5ba06b8e7593…`](https://stellar.expert/explorer/testnet/tx/5ba06b8e75932a4edbd90804a8a60d900e1c6e8fb8bafaa2c53305a2eec01d0b)
  - aportar (Beto, 30 XLM): [`ec48eae93949…`](https://stellar.expert/explorer/testnet/tx/ec48eae93949527ad7f2035d82874c89e811229b0a440c4d801da0bf2b8ff05b)
  - votar etapa 1 (Ana): [`f9c80e5c5e11…`](https://stellar.expert/explorer/testnet/tx/f9c80e5c5e111a7cf48fca90b856b5ba676a2b78eb6e16d4da49c264a49dbdbb)
  - liberar etapa 1 (60 XLM): [`089d3961d34b…`](https://stellar.expert/explorer/testnet/tx/089d3961d34b13e3bfe9313280659f672a1c2244f73309491417f5f74e734118)
  - cargar_evidencia etapa 1: [`7eefed9db123…`](https://stellar.expert/explorer/testnet/tx/7eefed9db1238a8e98200f933a6e16935b80f52e9a526ab0b112c584d334806c)
  - votar etapa 2 (Ana): [`355e20fd16d7…`](https://stellar.expert/explorer/testnet/tx/355e20fd16d74a58d8c8eb255680ab3accb768e74e259f2ae5c8faf6a20e2dd2)
  - liberar etapa 2 (40 XLM): [`6a29708bca6d…`](https://stellar.expert/explorer/testnet/tx/6a29708bca6dbde80f6fd24d0dc7c5e732bdd546ec7950ae585378d51ecfe9a1)
- Estado final: proyecto Completado, 100 XLM liberados, evidencia de la etapa 1 guardada.

---

## I1. Comisión de Órbita: 2 % de cada etapa liberada ✅ (40 min)

**Objetivo:** que Órbita cobre su comisión automáticamente cada vez que se libera una etapa.

**Qué cambia**
- El constructor pasa a ser `__constructor(token, plataforma)`. La dirección de la plataforma se fija al desplegar.
- `liberar`: el 98 % va al dueño y el 2 % a la plataforma. Evento `comision`.
- Lectura `plataforma()`.
- `deploy.sh`: crea la cuenta `orbita` (plataforma) y la pasa al desplegar.

**Test**
- Etapa de 600: el dueño recibe 588 y la plataforma 12. Con las dos etapas (600 + 400): el dueño recibe 980 y la plataforma 20, y el contrato queda en 0.
- El retorno de `liberar` refleja lo que cobró el dueño.

**Prueba en testnet**
- Desplegar con `--plataforma orbita`, hacer el recorrido hasta liberar la etapa 1 y ver en stellar.expert las dos transferencias (dueño y plataforma).
- Evidencia: hash de `liberar` y saldo de la cuenta `orbita`.

**Evidencia (16/10/2026)**: 13/13 tests. Contrato [`CDH7F25P…`](https://stellar.expert/explorer/testnet/contract/CDH7F25PSURV5WNLP2ZEWAF3PAVWHEGYAH2LVMZUYOAVQGDYBWFAVW5A). `liberar` etapa 1: [`628577a3…`](https://stellar.expert/explorer/testnet/tx/628577a341641accf60d0951de16c96e7a60a9cc5c5520f14a203b1e577a4d39) (58,8 XLM al dueño y 1,2 a Órbita). `liberar` etapa 2: [`c1fa7fb1…`](https://stellar.expert/explorer/testnet/tx/c1fa7fb16b2e2d05f83d6b2c0e5f5d8f093b23667ae13026dec34c74bea15035) (39,2 XLM y 0,8). Detalle en `plan/RESUMEN-I1.md`.

---

## I2. Datos de inversión al publicar ⬜ (1 h)

**Objetivo:** que el dueño declare qué devuelve, en qué condiciones, cuánto mínimo por etapa y para cuándo.

**Qué cambia**
- `TipoRetorno`: `Prestamo`, `Ventas`, `Ganancias` o `Producto`.
- `crear_proyecto(..., tipo_retorno, condiciones, plazo, hitos, montos, minimos, fechas)`.
- `Hito` suma `minimo_retorno` y `fecha_limite`.
- Validaciones: listas del mismo largo, mínimos ≥ 0, fechas crecientes y posteriores al `plazo` para juntar la plata, y condiciones de 1.000 caracteres como máximo.
- `deploy.sh` y lo mínimo de `app.js` (valores por defecto) para que la web no se rompa.

**Test**
- Se guardan el tipo, las condiciones, los mínimos y las fechas.
- Error si las fechas no son crecientes, si una fecha es anterior al plazo o si los largos no coinciden.

**Prueba en testnet**
- `crear_proyecto` con tipo "Préstamo", condiciones y mínimos y fechas por etapa. Leer `proyecto` y mostrar los datos.
- Evidencia: hash de `crear_proyecto`.

---

## I3. Etapa vencida sin evidencia → retiro sin votar ⬜ (1 h)

**Objetivo:** proteger a los aportantes si el dueño cobra una etapa y desaparece.

**Qué cambia**
- Función interna `aplicar_vencimientos`, que corre al principio de las funciones que cambian el estado, y función pública `revisar(id)`.
- Si la última etapa liberada pasó su `fecha_limite` sin evidencia → `Fallido`, y lo que queda se vuelve reembolsable sin votar (evento `vencido`).
- `reembolsar` funciona en ese caso. Por ahora usa la cuenta proporcional de hoy; en I4 pasa al reparto acumulado.

**Test**
- Liberar la etapa 1, adelantar el reloj del test más allá de la fecha sin cargar evidencia → `revisar` deja el proyecto `Fallido` y cada uno recupera su parte de lo que queda.
- Con la evidencia cargada a tiempo, no pasa nada.

**Prueba en testnet**
- Proyecto con una fecha límite muy cercana (unos minutos). Se libera la etapa 1, se deja vencer, se llama a `revisar` y Ana y Beto reembolsan.
- Evidencia: hashes de `revisar` y de los dos `reembolsar`.

---

## I4. Pagos del dueño y reparto acumulado ⬜ (2 h)

**Objetivo:** que el dueño devuelva pagando al contrato y que cada aportante cobre su parte, aunque las participaciones cambien de mano.

**Qué cambia (ver ADR-001)**
- `Posicion { participacion, checkpoint, pendiente }` por aportante y `acumulado` por proyecto (× 10^12).
- `pagar_retorno(id, pagador, monto)`: entra plata y se suma a `acumulado` y `total_pagado`.
- `cobrar(id, aportante)`: cobra todo lo pendiente. `reembolsar` queda como sinónimo.
- Los reembolsos por falla (plazo, voto en contra, I3) pasan a repartirse con el mismo mecanismo. La participación ya no se pone en cero.
- Lecturas `posicion` y `pendiente`.

**Test**
- Ana 70 % y Beto 30 %: el dueño paga 100 → Ana cobra 70 y Beto 30. Cobrar dos veces da 0 la segunda.
- Pagos en distintos momentos con aportes en el medio: cada uno cobra solo lo que le toca desde que entró.
- Todos los tests de reembolso anteriores siguen pasando con el mecanismo nuevo.
- El "polvo" del redondeo nunca hace que se reparta de más (el saldo del contrato nunca queda negativo).

**Prueba en testnet**
- Recorrido completo y después `pagar_retorno` del dueño, `cobrar` de Ana y `cobrar` de Beto.
- Evidencia: hashes de `pagar_retorno` y de los dos `cobrar`.

---

## I5. Historial de pagos e "incumplido" ⬜ (1 h)

**Objetivo:** que cualquiera vea lo prometido contra lo pagado, y que quede marcado si el dueño no cumple.

**Qué cambia**
- Cada `pagar_retorno` guarda `Pago(id, n) = { monto, fecha }`. Lectura `pago(id, n)`.
- `aplicar_vencimientos` marca `incumplido = true` si a una fecha vencida no se llegó a la suma de mínimos comprometidos (evento `incumplido`). Para el tipo "Producto" solo cuenta la evidencia (a confirmar en el ADR).

**Test**
- Pagando a tiempo, no se marca. Sin pagar y pasada la fecha, `revisar` lo marca. Si paga tarde, la marca sigue.
- El historial devuelve los pagos en orden con su fecha.

**Prueba en testnet**
- Proyecto con una fecha de pago cercana. Se deja vencer sin pagar, se llama a `revisar` y queda "incumplido". Después el dueño paga y el historial lo muestra.
- Evidencia: hashes de `revisar` (incumplido) y de `pagar_retorno`.

---

## I6. Mercado de participaciones ⬜ 🌅 (2 h)

**Objetivo:** que un aportante pueda vender su participación a otra persona, de forma segura y en una sola operación.

**Qué cambia**
- `ofrecer_venta(id, vendedor, cantidad, precio)`, `cancelar_oferta(id, vendedor)` y `comprar(id, comprador, vendedor, cantidad, precio_max)`.
- Compra atómica: verifica la oferta y el precio máximo, asienta a los dos, pasa la plata al vendedor y la participación al comprador.
- Regla: quien votó la etapa en curso no puede vender hasta que se resuelva.
- Lista de vendedores con oferta abierta (máximo 20) para que la web los muestre.

**Test**
- La compra mueve la participación y la plata. Lo ganado antes de la venta queda con el vendedor.
- Error si el vendedor votó la etapa en curso. Se puede vender después de que la etapa se libera.
- Error si el precio cambió por encima de `precio_max` o si la cantidad no coincide.
- El comprador vota con su nueva participación y no se puede votar dos veces con la misma participación.

**Prueba en testnet**
- Beto ofrece su participación, Ana la compra, el dueño paga un retorno y Ana cobra la parte que antes era de Beto.
- Evidencia: hashes de `ofrecer_venta`, `comprar` y `cobrar`.

---

## T2. USDC de testnet como moneda ⬜

**Objetivo:** recaudar en USDC (dólar digital) en lugar de XLM, igual que se haría en producción.

**Investigado (skills stellar-dev, verificado con el CLI)**
- USDC de testnet de Circle, emisor clásico: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- Su contrato (SAC), que es el que usa Órbita: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (coincide con `stellar contract id asset --asset USDC:GBBD…`).
- Cómo consigue USDC de prueba un usuario: (1) cuenta fondeada con XLM (friendbot); (2) agregar la "trustline" de USDC (en la billetera o con un botón en la web); (3) pedir USDC en el faucet de Circle, https://faucet.circle.com/, eligiendo **Stellar testnet**. El faucet tiene captcha y no tiene API: lo hace la persona a mano.
- Importante: sin trustline de USDC, el dueño **no puede cobrar** (la transferencia falla con `op_no_trust`).

**Qué cambia**
- `scripts/deploy.sh`: desplegar con `--token CBIELTK6…` (USDC) y agregar las trustlines de `dueno`, `ana` y `beto`. Los USDC de prueba de ana y beto se cargan a mano desde el faucet.
- `docs/config.js`: moneda USDC, 7 decimales.
- Web: botón "Activar USDC" (agrega la trustline) y link al faucet de Circle en lugar de "Cargar XLM de prueba".

**Cómo se prueba en testnet**
- Contrato desplegado con token USDC.
- Un aporte y un `liberar` reales en USDC.
- Evidencia: hashes de la trustline, el aporte y la liberación, y saldo USDC del dueño en stellar.expert.

---

## T3. Stellar Wallets Kit (Freighter y otras billeteras) ⬜ 🌅

**Objetivo:** que el usuario pueda conectar Freighter, xBull, Lobstr, Albedo, etc. desde una sola ventana, en lugar de solo Freighter.

**Qué cambia**
- Reemplazar `@stellar/freighter-api` por **Stellar Wallets Kit v2** (`@creit-tech/stellar-wallets-kit`): `StellarWalletsKit.init({ modules: defaultModules() })`, `authModal()` para conectar y `signTransaction()` para firmar.
- Ojo: la v2 se publica en JSR (no en npm) y nuestra web no usa un empaquetador. Al empezar hay que verificar cómo cargarla en una web estática (CDN permitido o un bundle chico generado una sola vez) y fijar la versión exacta.
- Botón "Desconectar". La guía de 3 pasos pasa a nombrar varias billeteras.

**Cómo se prueba en testnet**
- Conectar con Freighter y con al menos otra billetera desde la web publicada en la rama v2 (o servida localmente).
- Firmar un aporte real desde la web.
- Evidencia: hash del aporte firmado con Wallets Kit.

---

## T4. Web: descripción, imagen, evidencia e inversión ⬜ ⚠️

**Objetivo:** que la web muestre todo lo nuevo del contrato y que el dueño pueda cargar su evidencia sin usar la consola.

**Suma por el ADR-001:** al publicar, elegir el tipo de retorno, las condiciones y el mínimo y la fecha por etapa; ver lo prometido contra lo pagado y la marca "incumplido"; botones "Pagar retorno" (dueño) y "Cobrar" (aportante); comisión del 2 % explicada. El mercado (I6) se suma a la web cuando se haga ese ticket.

**Qué cambia**
- Tarjeta de proyecto con imagen, descripción y, por cada etapa, el link "Ver evidencia".
- Formulario de publicación con descripción e imagen (URL).
- Para el dueño: campo y botón "Cargar evidencia" en la etapa actual.
- Textos claros junto al voto: "Votar a favor = liberar la plata de esta etapa al equipo. Votar en contra = si más de la mitad rechaza, se devuelve lo que queda a todos los aportantes".

**Cómo se prueba en testnet**
- Desde la web: publicar un proyecto con imagen → el dueño carga la evidencia → un aportante vota.
- Evidencia: hashes de `crear_proyecto`, `cargar_evidencia` y `votar` hechos desde la web.

---

## T5. Confianza: números, "Ver en la blockchain", reglas y FAQ ⬜ 🌅

**Objetivo:** que alguien que no conoce cripto entienda y confíe.

**Qué cambia**
- Números generales arriba: proyectos, total recaudado, total liberado y aportantes (leídos del contrato).
- Link "Ver en la blockchain" por proyecto (contrato en stellar.expert) y por cada transacción.
- Recuadro "Reglas" junto al voto: mayoría, reembolso y quién puede hacer qué.
- Sección de preguntas frecuentes: qué es Stellar, qué es USDC, qué pasa si el proyecto no cumple, cuánto cuesta, es plata real (no: testnet).

**Cómo se prueba en testnet**
- Los números coinciden con lo que muestra el contrato en stellar.expert.
- Hacer un aporte real y ver que los números se actualizan.
- Evidencia: hash del aporte y captura o descripción de los números antes y después.

---

## T6. (Opcional) Entrar con passkeys ⬜ 🌅

**Objetivo:** entrar con la huella o la cara del celular o la compu, sin instalar una billetera ni anotar 12 palabras.

**Qué cambia (según la skill dapp/smart-accounts)**
- Usar **Smart Account Kit** (`smart-account-kit`): `createWallet()` crea una cuenta inteligente con passkey y `connectWallet()` reconecta.
- Para que el usuario no necesite XLM para las comisiones: OpenZeppelin Relayer (fee sponsoring). Requiere configuración extra.
- Conviviría con Wallets Kit: "Entrar con passkey" o "Conectar billetera".
- Riesgo: necesita el WASM de la cuenta y el verificador WebAuthn desplegados en testnet, más un bundle JS. Se evalúa al empezar el ticket si entra en el tiempo.

**Cómo se prueba en testnet**
- Crear una cuenta con passkey desde la web y hacer un aporte real con ella.
- Evidencia: dirección C... de la smart account y hash del aporte.

---

## T7. README actualizado y pasar v2 a main ⬜

**Objetivo:** dejar v2 como la versión oficial.

**Qué cambia**
- README: qué hay de nuevo, nuevo CONTRACT_ID, tabla "Demo en testnet" con los hashes de v2, cómo conseguir USDC de prueba y capturas.
- `docs/config.js` apuntando al contrato v2.
- Merge de `v2` en `main`, **solo con aprobación del usuario**.

**Cómo se prueba en testnet**
- Después del merge, la web pública https://matiasledesma449.github.io/Orbita/ lee el contrato v2.
- Un aporte real desde la web pública.
- Evidencia: hash de ese aporte.
