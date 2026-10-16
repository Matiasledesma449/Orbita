# Resumen I5 — Historial de pagos e "incumplido" ✅

I5 está terminado: tests en verde, contrato nuevo desplegado en testnet y la regla probada en vivo, esperando a que venciera una fecha de devolución real. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Tests

Pasan los 48 (los 38 anteriores y 10 nuevos). Los nuevos comprueban:
- que el historial guarda cada pago con quién pagó, el monto y la fecha, en orden;
- que pedir un pago que no existe da error (#19, nuevo);
- que pagando todo a tiempo no queda incumplido;
- que justo en la fecha de devolución todavía está a tiempo;
- que sin pagar queda incumplido, y la marca sigue aunque después pague (los aportantes igual cobran);
- que un pago parcial (1.099 de 1.100) también queda incumplido;
- que si el dueño paga tarde, el mismo pago deja la marca, aunque nadie haya llamado a `revisar`;
- que solo cuenta lo prometido por etapas **liberadas**: si la etapa 2 se rechaza, el dueño debe solo el mínimo de la etapa 1;
- que en el tipo "Producto", el incumplido se marca si una etapa liberada vence sin evidencia;
- que en el tipo "Producto" con la evidencia a tiempo, no depende de pagos.

## CONTRACT_ID nuevo

`CDXJK2RXXPH7DNYBEOAJQVQB35MQTU4UG5TV3MU6VKGUUKFZ5XUCVPHM`
https://stellar.expert/explorer/testnet/contract/CDXJK2RXXPH7DNYBEOAJQVQB35MQTU4UG5TV3MU6VKGUUKFZ5XUCVPHM

## Prueba real en testnet 1: el dueño no devuelve a tiempo (proyecto 1, `scripts/demo-incumplido.sh`)

Préstamo de 60 XLM: el dueño se comprometió a devolver 66 XLM, con una fecha de devolución a los 5 minutos.

| Paso | Hash |
|---|---|
| Crear proyecto (devolución a los 5 min) | [58050964…](https://stellar.expert/explorer/testnet/tx/580509640babd9f03efd01630c832c248e5a60f5be5d910c9c97617f0142c291) |
| Aportar: Ana, 42 XLM | [129c59d3…](https://stellar.expert/explorer/testnet/tx/129c59d31e1a02cf273ceb336b269eb299d4c437a93166f30b9785d65db23a6e) |
| Aportar: Beto, 18 XLM | [b924ee90…](https://stellar.expert/explorer/testnet/tx/b924ee90aedc6f31c0dd3a0648b8b90c6c05ed69f8fd65cf8bd9fb5ea90ef6bc) |
| Votar | [340b2add…](https://stellar.expert/explorer/testnet/tx/340b2add1148c8b5b9310bd7eece9fc62ba7dfaf6c93ef627cd759f780a9e407) |
| Liberar | [5048a996…](https://stellar.expert/explorer/testnet/tx/5048a9960fbfcf30883ff79e0b1fe3ef65401ec23689e475da90f32556caeaa0) |
| Cargar evidencia (a tiempo) | [c2a36330…](https://stellar.expert/explorer/testnet/tx/c2a36330dfeaeb3b8fd0e4c28f1c9fb2c911d3c81fea9d446e89989458fbb489) |
| *(pasa la fecha de devolución sin pago)* | — |
| **`revisar`: queda incumplido** (evento: prometido 66, pagado 0) | [1d7be0e4…](https://stellar.expert/explorer/testnet/tx/1d7be0e4a2e2cfb9f3700f09e477a7c83895755389c484e63f13b0364202cbbd) |
| **El dueño paga tarde 66 XLM** (41 segundos después de la fecha) | [ae9d9fa1…](https://stellar.expert/explorer/testnet/tx/ae9d9fa10fcc9f8c1ad73aa5631b7c91f304f571daa6defc65d8c0b9b2faaa86) |
| Ana cobra 46,2 XLM (70 %) | [aa28d3a6…](https://stellar.expert/explorer/testnet/tx/aa28d3a6c8b58a1f19aabe07f33cd076a64df5da718ef9fc18b2655204c79775) |
| Beto cobra 19,8 XLM (30 %) | [95741fa1…](https://stellar.expert/explorer/testnet/tx/95741fa160bca5b183a21f27e8a968a5e4b76326cd2f8852f7095825f794c0b1) |

Estado final del proyecto 1: **incumplido = sí** (la marca quedó aunque pagó), total pagado 66 XLM y 1 pago en el historial, con fecha posterior a la de devolución.

## Prueba real en testnet 2: el dueño devuelve a tiempo (proyecto 0, `scripts/deploy.sh`)

| Paso | Hash |
|---|---|
| Desplegar | [22b75d6d…](https://stellar.expert/explorer/testnet/tx/22b75d6d330c05fe9178c5f42c55b226a6724c3f170c99f1773f40777e9d7ef4) |
| Crear proyecto (préstamo al 10 %, devolución a 180 días) | [02303f97…](https://stellar.expert/explorer/testnet/tx/02303f9717d8727739ef40572d5c0a52e2a05e916dd9222fc0429134a1473e6a) |
| Liberar etapa 1 | [186d8ac8…](https://stellar.expert/explorer/testnet/tx/186d8ac89918a7ab93988b8a5a5e4f64512c1af57bcfea281c670ff710ca5885) |
| Liberar etapa 2 | [091c24d8…](https://stellar.expert/explorer/testnet/tx/091c24d89c21035641833e32780719643d3905acf80d004e22304aee0bde075e) |
| **El dueño paga 110 XLM a tiempo** | [63846944…](https://stellar.expert/explorer/testnet/tx/638469447abe2381dd0434b6dc4dd1d25e5f7dd1d5d15b41944b8dbf2559470c) |
| Ana cobra 77 XLM | [cc6b1262…](https://stellar.expert/explorer/testnet/tx/cc6b126242efe5e85c8cd9b085f1e71919c93c628936caf13dc46fbbb640976d) |
| Beto cobra 33 XLM | [c6a405fc…](https://stellar.expert/explorer/testnet/tx/c6a405fc3c116d908e4d2b449f8b3174183f6256954d774732d9748bbe7b441a) |

Historial leído de la red: prometido 110 XLM; pago 1 de 110 XLM del dueño, el 16/10/2026 a las 19:55; **incumplido = no**.

## Qué cambió en el contrato

- **Historial público de pagos:** cada `pagar_retorno` guarda quién pagó, cuánto y cuándo. Lecturas nuevas: `pago(id, n)` (el pago número n, empezando en 0) y `prometido(id)` (la suma de los mínimos de las etapas liberadas). `proyecto` ahora muestra también `cantidad_pagos` e `incumplido`.
- **Marca "incumplido"** (según la decisión 1 corregida del ADR):
  - Préstamo, ventas o ganancias: si pasó la fecha de devolución y el dueño no pagó lo prometido por las etapas liberadas.
  - Producto: si una etapa liberada venció sin evidencia.
  - Se aplica en la próxima operación sobre el proyecto (`revisar`, pagar, cobrar, votar o liberar). Si el dueño paga tarde, el mismo pago deja la marca.
  - Queda marcado para siempre. El historial muestra cuándo se puso al día.
  - Evento `incumplio` con lo prometido y lo pagado en ese momento.
- Error nuevo: #19 "ese pago no existe".

## Otros cambios

- `scripts/deploy.sh`: al final muestra lo prometido y el primer pago del historial.
- Script nuevo `scripts/demo-incumplido.sh <CONTRACT_ID>`: muestra en vivo un dueño que no devuelve a tiempo (tarda unos 6 minutos).
- `docs/app.js`: mensaje del error #19.
- En la rama v2, `docs/config.js` apunta al contrato nuevo.
- `.gitignore` suma `demo-incumplido.log`.
