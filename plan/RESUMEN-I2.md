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

---

## Corrección I2b — Fecha de devolución única ✅

Con una sola fecha por etapa, el dueño tendría que devolver el mínimo antes de recibir la etapa siguiente, y eso no es realista. Por eso corregimos la decisión 1 del ADR:
- La `fecha_limite` de cada etapa queda **solo para la evidencia**.
- El proyecto suma una **`fecha_devolucion`** única, posterior a la última fecha de etapa. Para esa fecha, el dueño tiene que haber pagado la suma de los mínimos de las etapas liberadas. El control de "incumplido" llega en I5.
- Para el tipo "Producto", el incumplido depende solo de la evidencia.

**Tests:** 21/21. Los 2 nuevos comprueban que la devolución tiene que ser posterior a la última etapa (error #17) y que se acepta cualquier fecha posterior.

**CONTRACT_ID nuevo:** `CBW5OUVKDL3TLXEUGXMGAUQZ5PJ4ESDLOIZYEWLCUJCEEB4PSJMMIKLR`
https://stellar.expert/explorer/testnet/contract/CBW5OUVKDL3TLXEUGXMGAUQZ5PJ4ESDLOIZYEWLCUJCEEB4PSJMMIKLR

| Paso | Hash |
|---|---|
| Desplegar | [f29142d8…](https://stellar.expert/explorer/testnet/tx/f29142d80b8463b9a2b11a67763adfff12e05d14a0980b7f969fa3e417c8badb) |
| **Crear proyecto con fecha de devolución a 180 días** | [96554608…](https://stellar.expert/explorer/testnet/tx/96554608d2812c1d7d87b4bb74f25e5dde39a689009363d69709e90664d9c8ac) |
| Aportar: Ana | [8673c814…](https://stellar.expert/explorer/testnet/tx/8673c814b41604ef3a899994df6f3f6f5ea5ac2ed539099cf01379d8a6d677fb) |
| Aportar: Beto | [7a194e04…](https://stellar.expert/explorer/testnet/tx/7a194e044d47eab86618aeb96ad32c71162b4ffe5ed3e77af63608d12afb05cd) |
| Votar etapa 1 | [8301a90a…](https://stellar.expert/explorer/testnet/tx/8301a90ab962a6e90075819f308251cade289971803291c9a7ff0dbfa57a6448) |
| Liberar etapa 1 | [65b8f3b0…](https://stellar.expert/explorer/testnet/tx/65b8f3b035f3c42a19018f0481621e1f79ca5f0977e56b0f01847c6a1b393553) |
| Cargar evidencia de la etapa 1 | [9c75214d…](https://stellar.expert/explorer/testnet/tx/9c75214d2e98a93584a07ed11b111c9a2f71678b08fbae5bdb9504b321600bc6) |
| Votar etapa 2 | [e7c5b2fa…](https://stellar.expert/explorer/testnet/tx/e7c5b2fad0f39a5bc1260c363e7f23bd62fea7accbda7078cb88d0e7a5dfb0b8) |
| Liberar etapa 2 | [3dec5939…](https://stellar.expert/explorer/testnet/tx/3dec59390105784f0a6657376935d9b546c2ba5e20f52ff906fe13151a87f7a6) |

**Lo que quedó guardado:** evidencia de la etapa 1 hasta el 15/12/2026, evidencia de la etapa 2 hasta el 14/01/2027 y **devolución de 110 XLM hasta el 14/04/2027**.

**Otros cambios:** `deploy.sh` (devolución a 180 días), `app.js` (mientras el formulario no la pida, propone devolver 90 días después de la última etapa) y el ADR-001 (decisión 1 corregida).
