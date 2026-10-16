# Órbita v2 — Tickets

Reglas: un ticket por vez, en orden, en la rama `v2`. Cada ticket se cierra solo con **tests en verde + prueba en testnet + hash de transacción**. Ver `CLAUDE.md`.

Estado: ⬜ pendiente · 🔄 en curso · ✅ terminado

---

## T1. Contrato v2: descripción, imagen y evidencia por etapa ⬜

**Objetivo:** que cada proyecto cuente qué es y muestre una imagen, y que el dueño suba una prueba de lo que hizo antes de pedir plata. El voto pasa a significar "liberar la plata de la próxima etapa".

**Qué cambia**
- `Proyecto` suma `descripcion: String` e `imagen: String` (URL).
- `Hito` suma `evidencia: String` (URL, vacía al principio).
- Nueva función `cargar_evidencia(id, n_hito, url)`, que solo puede llamar el dueño.
- Votar significa "liberar la plata de la próxima etapa". Propuesta, a confirmar al empezar el ticket: solo se puede votar la etapa actual después de que el dueño cargó su evidencia. El resto de la lógica (mayoría >50 %, rechazo → reembolso proporcional) queda igual.
- Límites de largo en los textos, para no gastar de más en almacenamiento.
- Tests nuevos: cargar evidencia, que nadie más que el dueño pueda hacerlo, y no votar sin evidencia.
- Actualizar `scripts/deploy.sh` (nuevos argumentos) y lo mínimo de `docs/app.js` para que no se rompa.

**Cómo se prueba en testnet**
- `cargo test` en verde.
- Desplegar el contrato v2 en testnet (contrato nuevo; el v1 de `main` no se toca).
- Demo con el CLI: crear proyecto con descripción e imagen → aportes → el dueño carga evidencia → voto → liberar.
- Evidencia: CONTRACT_ID v2 y los hashes de `cargar_evidencia` y `liberar`.

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

## T3. Stellar Wallets Kit (Freighter y otras billeteras) ⬜

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

## T4. Web: descripción, imagen y evidencia ⬜

**Objetivo:** que la web muestre todo lo nuevo del contrato y que el dueño pueda cargar su evidencia sin usar la consola.

**Qué cambia**
- Tarjeta de proyecto con imagen, descripción y, por cada etapa, el link "Ver evidencia".
- Formulario de publicación con descripción e imagen (URL).
- Para el dueño: campo y botón "Cargar evidencia" en la etapa actual.
- Textos claros junto al voto: "Votar a favor = liberar la plata de esta etapa al equipo. Votar en contra = si más de la mitad rechaza, se devuelve lo que queda a todos los aportantes".

**Cómo se prueba en testnet**
- Desde la web: publicar un proyecto con imagen → el dueño carga la evidencia → un aportante vota.
- Evidencia: hashes de `crear_proyecto`, `cargar_evidencia` y `votar` hechos desde la web.

---

## T5. Confianza: números, "Ver en la blockchain", reglas y FAQ ⬜

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

## T6. (Opcional) Entrar con passkeys ⬜

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
