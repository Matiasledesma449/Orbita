# 🪐 Órbita

**Estudiantes con proyectos de software consiguen inversión por etapas. Invierte cualquier persona o empresa, de cualquier país.**

Proyecto para el **Stellar Track · NEA Tech 2026 (Corrientes)**.

🌐 **Web:** https://matiasledesma449.github.io/Orbita/
📜 **Contrato en testnet:** [`CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC`](https://stellar.expert/explorer/testnet/contract/CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC)

---

## Qué es Órbita

Un grupo de estudiantes tiene una idea de software (una app de turnos, una plataforma de apuntes) y le falta plata para hacerla. Del otro lado hay personas y empresas que quieren apoyarlos: una software factory que busca talento, una aceleradora, un egresado que vive afuera. El problema es la **confianza**: ¿cómo sé que la plata se usa para lo prometido?

En Órbita:

1. **Los estudiantes publican su proyecto**, dividido en etapas, y dicen qué devuelven a cambio: un préstamo con interés, una parte de las ventas, una parte de las ganancias o producto.
2. **Cualquiera invierte** y recibe **su parte** del proyecto.
3. **La plata queda guardada en un contrato** en la blockchain de Stellar, no en la cuenta del equipo.
4. **Antes de cada etapa, los inversores votan** si se le paga al equipo. Desde la segunda etapa, el equipo tiene que mostrar antes la **prueba** de lo que hizo (una demo y el link a su código en GitHub).
5. **El equipo devuelve lo prometido** pagando al contrato, y el contrato lo **reparte solo** entre los inversores.

**Las 3 protecciones del inversor:**
- 🔒 **La plata está guardada:** nadie la puede mover sin el voto de la mayoría.
- ↩️ **Si no cumple, recuperás lo que queda:** si la mayoría vota que no, o el equipo no muestra la prueba a tiempo, cada inversor recupera su parte de lo que no se pagó.
- 📋 **Todo queda a la vista:** lo prometido y lo pagado son públicos. Si el equipo no devuelve a tiempo, queda marcado **"Incumplido"** para siempre.

Además, **cada inversor puede vender su parte** a otra persona, y Órbita cobra una **comisión del 2 %** de cada etapa que se le paga al equipo.

## Probalo en 3 pasos (red de prueba, plata no real)

1. **Instalá [Freighter](https://freighter.app)**, la billetera de Stellar, en tu navegador (Chrome, Brave o Firefox). Creá una billetera y anotá tus 12 palabras.
2. **Elegí la red de prueba:** en Freighter, tocá el ícono del globo y elegí **"Testnet"**.
3. **Entrá a https://matiasledesma449.github.io/Orbita/**, tocá **"Conectar billetera"** y, en el menú de tu billetera (arriba a la derecha), tocá **"Cargar XLM de prueba"**.

Listo. Probá:
- **Invertir** en «App de turnos para kioscos del barrio» o en «Plataforma de apuntes para la facultad». Están juntando plata hasta el 16/11/2026.
- **Publicar** tu propio proyecto con el formulario de 4 pasos y después, como dueño, cobrar la etapa, subir la prueba y devolver plata.
- **Mi panel:** ver tus inversiones y "qué te toca hacer hoy", cobrar, vender tu parte y comprar la de otros.

Antes de cada firma, la web explica en una frase qué va a pasar. Después confirma en palabras y muestra el link **"Ver comprobante"** (stellar.expert).

> Los proyectos que se usaron para probar cada regla del contrato (huerta, panadería y demos) están al final de "Proyectos", en la sección colapsada **"Pruebas del sistema"**.

## Demo en testnet

| Dato | Valor |
|---|---|
| Web | https://matiasledesma449.github.io/Orbita/ |
| Contract ID | `CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC` |
| Contrato en el explorador | https://stellar.expert/explorer/testnet/contract/CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC |
| Moneda | XLM de testnet (en producción: USDC) |
| Cuenta de la plataforma (cobra el 2 %) | `GBWQLU5WVFSWYMMXVJ4DJFBRPHQJO6NYKJHZACG3CK67H6NFMV3EMWQZ` |
| Proyectos de estudiantes | #5 «App de turnos para kioscos del barrio» · #6 «Plataforma de apuntes para la facultad» |
| Video demo | _link YouTube / Drive_ |

## Funciones del contrato y transacciones reales

Todas estas transacciones son del contrato actual (`CBN7TBFL…`). Las verificamos en la red: salieron bien y cada una llamó a la función indicada. Las marcadas con 🖱️ se hicieron **con clics desde la web**, firmando como lo haría una persona.

| Función | Para qué sirve | Transacción real |
|---|---|---|
| `__constructor(token, plataforma)` | Se ejecuta al desplegar: fija la moneda y la cuenta que cobra el 2 % | [4953b317…](https://stellar.expert/explorer/testnet/tx/4953b317cd54141534ac1198d2d802fb91480a20f2f0ffb3fea585a825376d55) |
| `crear_proyecto(...)` | Publica un proyecto: descripción, imagen, tipo de retorno, condiciones, etapas con monto, mínimo a devolver y fecha para la prueba, y fecha de devolución | 🖱️ [ee2b94a0…](https://stellar.expert/explorer/testnet/tx/ee2b94a00e9a2ca21faa8740dadae973a1b6cccb1d1556badc66a92822aba4a7) · App de turnos [6974fab0…](https://stellar.expert/explorer/testnet/tx/6974fab0b3c01706de01a982da4b721f6c35c34eaeae9a3655d655497ef52ed9) · Apuntes [54908883…](https://stellar.expert/explorer/testnet/tx/5490888309c88b3dc3b96ed242e605fa1595e3e6eba936ac651e69ffd2e37474) |
| `aportar(id, aportante, monto)` | Invertir: la plata queda en el contrato y el inversor recibe su parte | 🖱️ [b64350b5…](https://stellar.expert/explorer/testnet/tx/b64350b551690bd723f0c262ace9a156801a1a7c73c60de9245bcf9ddffb5068) |
| `votar(id, aportante, aprobar)` | Votar si se le paga la etapa al equipo (el voto pesa según la parte de cada uno) | 🖱️ [efd9f741…](https://stellar.expert/explorer/testnet/tx/efd9f741d53634af1d810feb86b44441314b8bc7f9edae85bc584b3efec77737) |
| `liberar(id)` | El equipo cobra la etapa aprobada: 98 % para el equipo y 2 % para Órbita | 🖱️ [f37ae33d…](https://stellar.expert/explorer/testnet/tx/f37ae33d48a0a7d9d16365e88b8941ca53f3f0b7a3f532c64cb909a2e62d3b68) |
| `cargar_evidencia(id, hito, url)` | El equipo sube la prueba de la etapa cobrada (una sola vez, antes de la fecha) | 🖱️ [4392d194…](https://stellar.expert/explorer/testnet/tx/4392d194b70b08974377f38c53efee05880d0dd8cf996bfa936945e66537d6e2) |
| `pagar_retorno(id, pagador, monto)` | El equipo devuelve plata; queda en el historial público | 🖱️ [99ab0265…](https://stellar.expert/explorer/testnet/tx/99ab0265ce0209047e7d5f22bd2e70e04a910230d5aa306d461b18463ea1b5a6) |
| `cobrar(id, aportante)` | El inversor cobra lo que le toca: retornos y reembolsos (`reembolsar` es un sinónimo) | 🖱️ retorno [330b6cdf…](https://stellar.expert/explorer/testnet/tx/330b6cdf03e2649b8d5733f9c8323a14656f43fa001a724bae12ea8bb60e2c8f) · 🖱️ reembolso [5fa2fc3e…](https://stellar.expert/explorer/testnet/tx/5fa2fc3edf45e0b9c6b9faedad9688aa024a6112419ffddfcea19a371419e708) |
| `revisar(id)` | "Actualizar estado": registra un vencimiento (plazo sin juntar la plata, etapa sin prueba, devolución atrasada) | 🖱️ [b3e2de5b…](https://stellar.expert/explorer/testnet/tx/b3e2de5bdc636134ef3a65e7a1febfabe27e3c20c22ded4e89e6544bb69c4fb1) |
| `ofrecer_venta(id, vendedor, cantidad, precio)` | Poner en venta tu parte | 🖱️ [f105c478…](https://stellar.expert/explorer/testnet/tx/f105c47846ada5e447244e78a9c3ca397df7dac50009fb7943a9cebfb882cd1c) |
| `comprar(id, comprador, vendedor, cantidad, precio_max)` | Comprar una parte, todo en una sola operación (si el precio cambió, se cancela) | 🖱️ [1fd1465f…](https://stellar.expert/explorer/testnet/tx/1fd1465fee2f57a730eb35cc962e1f5a037ad2efc5f8adbc1b4163fec505c6cb) |
| `cancelar_oferta(id, vendedor)` | Sacar tu parte de la venta | 🖱️ [0c0571f2…](https://stellar.expert/explorer/testnet/tx/0c0571f2cfacead9f9f1b2ba347976d235f5532b98e43ef5817464f05adf580c) |
| Lecturas | `proyecto`, `cantidad`, `posicion`, `participacion`, `pendiente`, `prometido`, `pago`, `oferta`, `ya_voto`, `token`, `plataforma` | (no son transacciones: se leen gratis) |

**Reglas que el contrato hace cumplir:**
- Una persona no vota dos veces la misma etapa, y **quien votó no puede vender su parte** hasta que la etapa se resuelva. Así ninguna parte vota dos veces.
- La plata que devuelve el equipo se reparte con un **reparto acumulado**: funciona aunque las partes cambien de mano, nadie cobra dos veces y el redondeo nunca reparte de más.
- Si el equipo cobra una etapa y no sube la prueba a tiempo, el proyecto se corta y cada inversor recupera su parte de lo que queda, **sin votar**.
- Si el equipo no devuelve lo prometido para la fecha, queda **"Incumplido"** para siempre (en los proyectos de tipo Producto cuenta la prueba, no los pagos).

El diseño completo está en [`plan/ADR-001-inversion.md`](plan/ADR-001-inversion.md).

## Tests: 62

```bash
cargo test
```

Los **62 tests** cubren:
- el flujo completo;
- la comisión del 2 %;
- los datos de inversión y las fechas;
- la evidencia por etapa;
- los vencimientos (plazo, prueba y devolución) y la marca "Incumplido";
- el reparto de pagos y reembolsos, incluido que nunca se reparta más de lo que entra;
- el mercado de partes (compra, venta, cancelación, bloqueo por voto y protección del comprador si cambia el precio);
- y cada error del contrato.

Para correrlos:

```bash
# 1. Rust y el target de los contratos de Stellar
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32v1-none
# 2. Los tests
cargo test
```

Versiones: Rust 1.99, `soroban-sdk` 28.0.0 (Protocolo 29), Stellar CLI 28.1.0.

## Herramientas de Stellar que usamos

- **Contrato inteligente en Rust** (`soroban-sdk`), con constructor, almacenamiento persistente con TTL y eventos.
- **Stellar CLI** para compilar, desplegar e invocar.
- **Stellar SDK de JavaScript** (17.2.1) y **Stellar RPC** de testnet para leer, simular y enviar transacciones desde la web.
- **Freighter** (6.0.1) para que cada persona firme con su billetera.
- **Stellar Asset Contract (SAC):** el contrato mueve XLM nativo en testnet; en producción, USDC.

## Arquitectura

```
Persona ──(firma con Freighter)──> Web estática (docs/, GitHub Pages)
                                         │  Stellar SDK: simula, firma y envía
                                         ▼
                                Stellar RPC (testnet)
                                         │
                                         ▼
                          Contrato "Órbita" (Rust)
                          ├─ proyectos, etapas, votos y pruebas
                          ├─ reparto acumulado de pagos y reembolsos
                          ├─ mercado de partes
                          └─ vencimientos e "Incumplido"
                                         │
                                         ▼
                          Moneda (XLM SAC en testnet / USDC)
```

## Estructura del repo

```
contracts/orbita/src/lib.rs     el contrato
contracts/orbita/src/test.rs    los 62 tests
docs/                           la web (index.html, app.js, config.js, img/), publicada con GitHub Pages
scripts/deploy.sh               despliega un contrato nuevo y corre la demo completa
scripts/demo-vencimiento.sh     demo en vivo: etapa sin prueba → los inversores recuperan su plata
scripts/demo-incumplido.sh      demo en vivo: el equipo no devuelve a tiempo → "Incumplido"
scripts/demo-mercado.sh         demo en vivo: quien votó no puede vender hasta que la etapa se resuelva
plan/                           tickets, diseño (ADR) y resumen de cada paso con sus transacciones
```

`docs/config.js` define el contrato que usa la web y la lista de proyectos de prueba. `scripts/deploy.sh` despliega un contrato **nuevo**: para usarlo en la web, hay que copiar su ID en `docs/config.js`.

## Validación

> Completar con los resultados de las entrevistas y la encuesta del evento.

- Personas entrevistadas: **_N_**
- Frases destacadas: _"..."_
- ¿Usarían Órbita para financiar su proyecto? Promedio: **_X/10_**
- Evidencia (fotos, audios, formulario): _link_

## Qué hicimos durante el evento

Todo el proyecto es nuevo y se hizo durante NEA Tech, del 15 al 17 de octubre de 2026:

1. **Versión 1** (`main`, tag `v1-estable`): un contrato de financiamiento por etapas con votos y reembolsos, una web simple y un despliegue en testnet.
2. **Versión 2:** la convertimos en una herramienta de inversión, en **tickets chicos**:
   - evidencia por etapa;
   - comisión del 2 %;
   - tipo de retorno y fechas;
   - vencimientos;
   - reparto acumulado de pagos;
   - historial e "Incumplido";
   - mercado de partes.
3. **Rediseño completo de la web en 4 fases**, sobre el diseño visual de un compañero del equipo, pensado para que lo entienda una persona mayor que no usa tecnología: lenguaje simple, letra grande, una frase antes de cada firma y el comprobante después.
4. **Enfoque final:** estudiantes con proyectos de software.

Cada ticket tiene su resumen con las transacciones de prueba en [`plan/`](plan/).

## Cómo usamos IA

Trabajamos con **Claude Code** (Anthropic) y las **Stellar Skills** (el plugin `stellar-dev`, con guías oficiales de contratos, dapps y activos de Stellar), con un método de trabajo estricto:

- **Un ticket por vez**, con un plan escrito ([`plan/TICKETS.md`](plan/TICKETS.md)) y un documento de diseño aprobado por el equipo antes de programar ([`plan/ADR-001-inversion.md`](plan/ADR-001-inversion.md)).
- **Nada de prueba y error a ciegas:** antes de cada cambio, se consultaron las skills de Stellar y la documentación oficial, y se verificaron las versiones instaladas.
- **Cada cambio, probado en testnet con una transacción real:** un ticket no se daba por terminado con que compilara. Hacían falta tests en verde, el despliegue o la prueba en testnet y el hash de la transacción como evidencia.
- **La web también se probó con clics:** en un navegador automático, con una billetera de prueba, en computadora y celular.
- El equipo **revisó y aprobó cada paso**, y tomó las decisiones de producto: por ejemplo, separar la fecha de la prueba de la fecha de devolución, o el enfoque en estudiantes de software.

Las reglas de trabajo para la IA están en [`CLAUDE.md`](CLAUDE.md).

## Próximos pasos

- **USDC y anchors (SEP-24):** invertir y cobrar en dólares digitales, entrando y saliendo con pesos u otras monedas locales, sin tocar cripto.
- **Passkeys:** entrar con la huella o la cara, sin instalar una billetera ni anotar 12 palabras.
- **Verificación de identidad (KYC)** de equipos e inversores, según las leyes de cada país.
- **Garantía del dueño:** que el equipo deje un depósito que se reparte entre los inversores si no cumple.
- **Revisores y disputas:** mentores o docentes que validen la prueba de cada etapa, y un mecanismo para resolver desacuerdos.
- **Auditoría** de seguridad del contrato antes de usar plata real.
- **Régimen de tokenización de la CNV:** encuadrar la versión de inversión dentro de la regulación argentina.

## Licencia

MIT
