# Resumen I4 — Pagos del dueño y reparto acumulado ✅

I4 está terminado: tests en verde, contrato nuevo desplegado en testnet y probado con transacciones reales, tanto la devolución de un préstamo como un reembolso por vencimiento. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Tests

Pasan los 38 (los 28 anteriores y 10 nuevos). Los nuevos comprueban:
- que un pago de 1.100 se reparte 770 a Ana (70 %) y 330 a Beto (30 %), y el contrato queda en 0;
- que no se puede cobrar dos veces (la segunda vez: error #11, "nada para cobrar");
- que varios pagos se acumulan, aunque alguien cobre en el medio y otro cobre todo junto al final;
- que el reembolso y el retorno se cobran juntos con una sola operación;
- que la participación ya no se pierde al reembolsar: si después el dueño devuelve algo, el aportante igual cobra su parte;
- que cualquiera puede pagar en nombre del dueño;
- que no se puede pagar un retorno si el dueño todavía no recibió plata (#7);
- que el pago tiene que ser mayor a cero (#3);
- que quien no tiene participación no cobra (#8);
- que nunca se reparte más de lo que entra, con pagos de montos "incómodos" y cobros intercalados, y que el saldo del contrato siempre coincide con lo pagado menos lo cobrado.

Los tests anteriores de reembolso (voto en contra, plazo vencido, etapa vencida sin evidencia) siguen pasando con el mecanismo nuevo.

## CONTRACT_ID nuevo

`CAXKH46KM2NMLSYC6BDDFHLQCZCENZKI7N7HOWZH3BSMOLR2ZH3X3GX3`
https://stellar.expert/explorer/testnet/contract/CAXKH46KM2NMLSYC6BDDFHLQCZCENZKI7N7HOWZH3BSMOLR2ZH3X3GX3

## Prueba real en testnet 1: el dueño devuelve el préstamo (proyecto 0, `scripts/deploy.sh`)

| Paso | Hash |
|---|---|
| Desplegar | [68484f32…](https://stellar.expert/explorer/testnet/tx/68484f320dd83013c3b98b78720f5ea5d924ccd2ac241ccb7791c5b502997b3a) |
| Crear proyecto (préstamo al 10 %) | [a2f914a4…](https://stellar.expert/explorer/testnet/tx/a2f914a48dd3405a3000903be0983d185a3c84cdc3b1671d68d7a8bca65264e8) |
| Aportar: Ana, 70 XLM | [df356b4b…](https://stellar.expert/explorer/testnet/tx/df356b4b4d20aefb98d9b3d1561eb6d656136ab18ea020b5f60729d6198f4836) |
| Aportar: Beto, 30 XLM | [90f84445…](https://stellar.expert/explorer/testnet/tx/90f844457e8acfa5a3b77f65b842fc29994b76cef5fbf0f672d0f40a12ca47d3) |
| Votar etapa 1 | [82a54743…](https://stellar.expert/explorer/testnet/tx/82a54743891a3e9e2cc60cdf98712627c9cc7efb956f1a72491d1fc12df63070) |
| Liberar etapa 1 | [f3072c31…](https://stellar.expert/explorer/testnet/tx/f3072c31b08e43f937cdfc673dac38dad9cd43310425c6a874e8a1dd0004da46) |
| Cargar evidencia de la etapa 1 | [8016fa5e…](https://stellar.expert/explorer/testnet/tx/8016fa5e28e71d10c2896513dde1d58815bc1db5fcac72e5a5568af67981f519) |
| Votar etapa 2 | [9ecbccfc…](https://stellar.expert/explorer/testnet/tx/9ecbccfcedc2657e0be7e32fc1fa788d35b336650f36be55b429fc01515beea8) |
| Liberar etapa 2 | [df333801…](https://stellar.expert/explorer/testnet/tx/df333801440a6942f6649d92c2a2d9aecf75d1d7c4bcdd8300730911d5880140) |
| **El dueño paga 110 XLM** (devuelve el préstamo + 10 %) | [b9463726…](https://stellar.expert/explorer/testnet/tx/b9463726a8e2878cdf15653aa18a353bf894d83158f25b130aa263f4c710f271) |
| **Ana cobra 77 XLM** (70 %) | [f7c6a6d8…](https://stellar.expert/explorer/testnet/tx/f7c6a6d837623f4124d2cd0542a2126199c617c36ad2409794792e614f1e1164) |
| **Beto cobra 33 XLM** (30 %) | [91e138f0…](https://stellar.expert/explorer/testnet/tx/91e138f01caa0347e822b5aab506ea1ba54ac2da6ef89c8efb0ef7e5cd06652e) |

Verificado después en la red: total pagado 110 XLM, lo pendiente de Ana y Beto en 0 y **saldo del contrato en 0**. Se repartió exacto y no quedó nada trabado.

## Prueba real en testnet 2: los reembolsos con el mecanismo nuevo (proyecto 1, `scripts/demo-vencimiento.sh`)

I4 cambió cómo se calculan los reembolsos, así que repetí en vivo la regla de I3 con este contrato:

| Paso | Hash |
|---|---|
| Crear proyecto con fechas cortas | [dedf8481…](https://stellar.expert/explorer/testnet/tx/dedf8481093738851e916cc80c6d6de4b92e3c1610b676b8d5ed90d9767a7435) |
| Liberar etapa 1 | [dc7a34c9…](https://stellar.expert/explorer/testnet/tx/dc7a34c931be85986a23c941d9b42f75160935eacf5c610d49140c0595501f53) |
| *(la evidencia vence sin cargarse)* | — |
| `revisar` → Fallido (40 XLM reembolsables) | [cc1c9471…](https://stellar.expert/explorer/testnet/tx/cc1c9471f4e0903156aeb5f536ee95ce6cb596cd9672114059701a60599801f6) |
| **Ana retira 28 XLM** | [85a63b59…](https://stellar.expert/explorer/testnet/tx/85a63b595843c3f4f0fbde92ba346a3c061fb1184749f0bb7cb36a0b512cee0d) |
| **Beto retira 12 XLM** | [ce5ad3b2…](https://stellar.expert/explorer/testnet/tx/ce5ad3b2cf75c1e58ab48a7a6dff722247461c575b1c8b8c96f66b126e50042b) |

## Qué cambió en el contrato

- **`pagar_retorno(id, pagador, monto)`**: el dueño (o cualquiera en su nombre) paga al contrato y el contrato lo reparte entre los aportantes, en proporción a lo que pusieron. Solo se puede pagar si el dueño ya recibió plata. Evento `pago`.
- **`cobrar(id, aportante)`**: cada aportante cobra todo lo que le corresponde (reembolsos y retornos) en una sola operación. Primero se pone su saldo pendiente en cero y después se transfiere, así no se puede cobrar dos veces. Evento `cobro`.
- **`reembolsar`** quedó como sinónimo de `cobrar` (ADR-001, decisión 5), así la web sigue funcionando.
- **Reparto acumulado:** el proyecto guarda cuánto le corresponde a cada unidad de participación, y cada aportante guarda hasta dónde ya se le hizo la cuenta. Funciona aunque en el futuro las participaciones cambien de mano (I6).
- **Los reembolsos usan el mismo mecanismo.** Al fallar el proyecto, lo no liberado se reparte una sola vez. La participación ya no se pone en cero, así que si el dueño después devuelve algo, el aportante igual cobra su parte.
- **Redondeo sin pérdidas:** el test de montos "incómodos" mostró que, redondeando en cada cobro, se iban perdiendo fracciones de stroop que quedaban trabadas en el contrato. Ahora cada aportante guarda esa fracción (`resto`) y se le suma en el próximo cobro. Lo que queda trabado es, como mucho, menos de 1 stroop (0,0000001 XLM) por aportante, por más veces que cobre.
- Lecturas nuevas: `posicion(id, aportante)` y `pendiente(id, aportante)`. `proyecto` ahora muestra también `acumulado` y `total_pagado`.
- El error #11 mantiene su número, pero ahora significa "todavía no hay nada para cobrar".

## Otros cambios

- `scripts/deploy.sh`: al final de la demo, el dueño devuelve el préstamo (110 XLM) y Ana y Beto cobran.
- `docs/app.js`: nuevo texto del error #11 ("Todavía no tenés nada para cobrar"). El botón "Pedir reembolso" de la web sigue funcionando, porque llama a `reembolsar`. Los botones "Pagar retorno" y "Cobrar" llegan en T4.
- ADR-001: anoté la mejora del redondeo (`resto`) y el nuevo significado del error #11.
- En la rama v2, `docs/config.js` apunta al contrato nuevo.
