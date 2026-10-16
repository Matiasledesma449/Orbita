# Resumen I2 — Datos de inversión al publicar ✅

I2 está terminado: tests en verde, contrato nuevo desplegado en testnet y el recorrido completo hecho con transacciones reales. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Tests

Pasan los 19 (los 13 de I1 y 6 nuevos). Los nuevos comprueban:
- que se guardan el tipo de retorno, las condiciones, y el mínimo comprometido y la fecha límite de cada etapa;
- que las fechas tienen que ser crecientes;
- que la fecha de la primera etapa tiene que ser posterior al plazo para juntar la plata;
- que las listas de etapas, montos, mínimos y fechas tienen que tener el mismo largo;
- que el mínimo comprometido no puede ser negativo;
- que las condiciones son obligatorias.

## CONTRACT_ID nuevo

`CD5GH4WGER5GBXZS4OIBP3DGEHH5J667G54AWFIR4352SWYRMQMSR6FS`
https://stellar.expert/explorer/testnet/contract/CD5GH4WGER5GBXZS4OIBP3DGEHH5J667G54AWFIR4352SWYRMQMSR6FS

## Prueba real en testnet

| Paso | Hash |
|---|---|
| Desplegar | [760a0839…](https://stellar.expert/explorer/testnet/tx/760a0839d5c3fbf90e70b7a74434280a7dae0a15d58d49cfd02c8f5665a0d60e) |
| **Crear proyecto con los datos de inversión** (préstamo al 10 %) | [ccb35b73…](https://stellar.expert/explorer/testnet/tx/ccb35b73adea7ae88ef8aaf51bcc1c0ffdf61ecb31f3a6615d1e3622d8291abf) |
| Aportar: Ana, 70 XLM | [01fa0212…](https://stellar.expert/explorer/testnet/tx/01fa02123c49e87b4a11d06bee202ac9b03b1371922ca4b42fdf811a57045bb9) |
| Aportar: Beto, 30 XLM | [3550dab9…](https://stellar.expert/explorer/testnet/tx/3550dab9f370b62bdfabb5aba14c61bd0125773d4eb232b1ceedc383613cb862) |
| Votar etapa 1 | [b1f26777…](https://stellar.expert/explorer/testnet/tx/b1f26777b0e63637eaaeed4cac20cf77fd62f4c0a347ca0630fff5ca8d2394ac) |
| Liberar etapa 1 (58,8 al dueño y 1,2 a Órbita) | [3b4016b1…](https://stellar.expert/explorer/testnet/tx/3b4016b1b290332eeff334b9e702bc444d4f0ba3bfda069770b2a49e3690a1a6) |
| Cargar evidencia de la etapa 1 | [eb0ef98a…](https://stellar.expert/explorer/testnet/tx/eb0ef98a4969237de4254bf14a5fcbd8d5c3c04880731faec6fd6583e2be7395) |
| Votar etapa 2 | [0acc6df9…](https://stellar.expert/explorer/testnet/tx/0acc6df99f432317a2941d79d6f6d474c498811543fa8eeaf4f8a6e8b2abcfc6) |
| Liberar etapa 2 (39,2 al dueño y 0,8 a Órbita) | [57a22851…](https://stellar.expert/explorer/testnet/tx/57a228510fa65117dc95f4d64ea345cd418f685fbfd206c51a772e14f6442032) |

**Lo que quedó guardado en el contrato** (leído después de la prueba):
- Tipo de retorno: Préstamo.
- Condiciones: "Préstamo al 10 %: devolvemos 66 XLM al terminar la etapa 1 y 44 XLM al terminar la etapa 2."
- Etapa 1: 60 XLM, mínimo comprometido 66 XLM, fecha límite 15/12/2026.
- Etapa 2: 40 XLM, mínimo comprometido 44 XLM, fecha límite 14/01/2027.

**Prueba de la web:** simulé contra este contrato un `crear_proyecto` armado igual que en la web, sin firmarlo ni enviarlo, y respondió bien.

## Qué cambió en el contrato

- Tipo nuevo `TipoRetorno`: Préstamo (0), Ventas (1), Ganancias (2) o Producto (3).
- `crear_proyecto` ahora pide además:
  - el tipo de retorno;
  - las condiciones (obligatorias, hasta 1.000 caracteres);
  - por cada etapa, el mínimo que el dueño se compromete a devolver o producir;
  - por cada etapa, una fecha límite, que sirve para la evidencia y para el pago.
- Validaciones: las fechas tienen que ser crecientes y posteriores al plazo para juntar la plata, y los mínimos no pueden ser negativos.
- Error nuevo: #17 "fechas inválidas".
- Por ahora estos datos solo se guardan y se muestran. Las reglas que los usan (vencimientos, pagos, "incumplido") llegan en I3, I4 e I5.

## Otros cambios

- `scripts/deploy.sh` publica la demo como un préstamo al 10 %, con mínimos de 66 y 44 XLM y fechas a 60 y 90 días.
- `docs/app.js`: lo mínimo para que no se rompa. Mientras el formulario no pida estos datos (T4), los proyectos creados desde la web se publican como tipo "Producto", con mínimo 0, una fecha cada 30 días y un texto de condiciones provisorio. También se agregó el mensaje del error #17.
- En la rama v2, `docs/config.js` apunta al contrato nuevo.
