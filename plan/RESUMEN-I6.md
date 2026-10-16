# Resumen I6 — Mercado de participaciones ✅

I6 está terminado: tests en verde, contrato nuevo desplegado en testnet, y probados en vivo la compraventa y el bloqueo por voto. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Tests

Pasan los 62 (los 48 anteriores y 14 nuevos). Los nuevos comprueban:
- que la compra mueve la participación y la plata, y borra la oferta;
- que lo ganado antes de vender queda con el vendedor y lo que viene después es del comprador (y el contrato queda en 0);
- que quien votó la etapa en curso no puede ofrecer (#21);
- que si vota con la oferta ya abierta, nadie le puede comprar (#21);
- que cuando la etapa se libera, el bloqueo se levanta y puede vender;
- que el comprador vota con lo que compró;
- que el vendedor ya no puede votar con lo que vendió (#8);
- que si el comprador ya había votado, lo que compra no suma a su voto (no hay doble voto);
- que el comprador está protegido si el vendedor sube el precio justo antes (#24);
- que la cantidad tiene que coincidir con la oferta (#24);
- que no se puede ofrecer más de lo que se tiene (#8);
- que cancelar la oferta la borra (#22);
- que nadie se puede comprar a sí mismo (#23);
- que hay como mucho 20 ofertas abiertas por proyecto (#20), aunque una existente se puede reemplazar.

## CONTRACT_ID nuevo

`CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC`
https://stellar.expert/explorer/testnet/contract/CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC

## Prueba real en testnet 1: Beto vende, Ana compra y cobra la parte de Beto (proyecto 0, `scripts/deploy.sh`)

| Paso | Hash |
|---|---|
| Desplegar | [4953b317…](https://stellar.expert/explorer/testnet/tx/4953b317cd54141534ac1198d2d802fb91480a20f2f0ffb3fea585a825376d55) |
| Crear proyecto (préstamo al 10 %) | [815363ed…](https://stellar.expert/explorer/testnet/tx/815363ed4979440571392b398cf4265aa3d6baf0719f7467bee1cde65724d298) |
| Aportar: Ana 70, Beto 30 | [a693702b…](https://stellar.expert/explorer/testnet/tx/a693702b1ca3f0513262ea306856dda106f7e88ff3c2cee15172a598966b5e8b) · [e5c8a244…](https://stellar.expert/explorer/testnet/tx/e5c8a244d99945f8a2c39195497746ddc9d7d3ef63dac814a24b5f6b8e638f87) |
| Liberar etapa 1 y etapa 2 | [0d24f12d…](https://stellar.expert/explorer/testnet/tx/0d24f12dda68d7d3f508bdab75b340b0e0cb10e47b838d486c50492e06832238) · [1d2f92f3…](https://stellar.expert/explorer/testnet/tx/1d2f92f3ab2aebdac28cead4683a8621705d27ae4692026734df46243736c06f) |
| **Beto ofrece su 30 % por 31 XLM** | [c7b35a24…](https://stellar.expert/explorer/testnet/tx/c7b35a24a7471e9dfbe63f1245a59603fcddd22615206e1ef95ae35b16a16c8a) |
| **Ana compra** (31 XLM de Ana a Beto, participación de Beto a Ana) | [1a09352a…](https://stellar.expert/explorer/testnet/tx/1a09352a23c0d0f9d29b43c4dbccf445d03114da9ee14e79b02488622297de9f) |
| El dueño devuelve 110 XLM | [825c56e6…](https://stellar.expert/explorer/testnet/tx/825c56e6bbdf2683e2bb644cf6a0aa328ae69ce36cd44fb6c4ee923e664041ba) |
| **Ana cobra los 110 XLM** (su 70 % y el 30 % que compró) | [f6134028…](https://stellar.expert/explorer/testnet/tx/f613402821a594bd59d466109b431327efe4423aab1229b8c114b88473528548) |

Verificado en la red: transferencia de 31 XLM de Ana a Beto en la compra, 110 XLM del contrato a Ana en el cobro, y **saldo final del contrato en 0**.

## Prueba real en testnet 2: el bloqueo por voto (proyecto 1, `scripts/demo-mercado.sh`)

| Paso | Hash |
|---|---|
| Crear proyecto (5 % de ventas) | [f21b39b7…](https://stellar.expert/explorer/testnet/tx/f21b39b7fd513f8e323782522eeb2ea6bc314e8510683a83197febcbbd043222) |
| Aportar: Ana 70, Beto 30 | [c48ca22a…](https://stellar.expert/explorer/testnet/tx/c48ca22ac1390b59d7c64cc7f06546f7aed8d64163c86c1ba33190be3d9f7824) · [fce36640…](https://stellar.expert/explorer/testnet/tx/fce36640cc5f41ccdb7a44229dfc3946028617502f42bda6afb80cbc2ed5f1d9) |
| **Beto vota la etapa 1** | [ae34bc0d…](https://stellar.expert/explorer/testnet/tx/ae34bc0dda54383fc663110bc2b895573216b271344843a3937304ade27a68cb) |
| **Beto intenta vender → RECHAZADO** con `Error(Contract, #21)` | *(sin hash: la red lo rechaza en la simulación y no se envía nada)* |
| Ana vota | [250c6605…](https://stellar.expert/explorer/testnet/tx/250c6605342cca7bada103ad841a9963059f80cf081e41b1cfa083cc414a15ca) |
| Se libera la etapa 1 (la etapa se resolvió) | [c4905688…](https://stellar.expert/explorer/testnet/tx/c49056882404e855905d1ecbad29e8fa647a3e662743ddb4938d3b9004cb7968) |
| **Ahora Beto sí ofrece** (30 % por 32 XLM) | [688f41cb…](https://stellar.expert/explorer/testnet/tx/688f41cbbbac0d710ec1c4b071ae8f4e41f1aae88400edccf4b1c496650b007e) |
| **Ana compra** | [4ea02106…](https://stellar.expert/explorer/testnet/tx/4ea02106adf1a32efddaee25478a530d4c2f4ec22e46c84760f3b44707128478) |

Participaciones finales en el proyecto 1: Ana 100 XLM (el 100 %) y Beto 0.

## Qué cambió en el contrato

- **`ofrecer_venta(id, vendedor, cantidad, precio)`:** publica (o reemplaza) la oferta del vendedor. Rechaza si ofrece más de lo que tiene o si está bloqueado por haber votado. Evento `oferta`.
- **`cancelar_oferta(id, vendedor)`:** retira la oferta. Evento `cancela`.
- **`comprar(id, comprador, vendedor, cantidad, precio_max)`:** compra la oferta entera en una sola transacción. Verifica la oferta, protege al comprador con la cantidad y el precio máximo, verifica el bloqueo por voto, le hace la cuenta a los dos (lo ganado hasta ese momento queda con el vendedor), mueve la participación y le paga al vendedor. Si algo falla, no pasa nada. Evento `compra`.
- **Regla del voto:** quien votó la etapa en curso no puede vender hasta que la etapa se resuelva (se libere o el proyecto falle). Así ninguna participación vota dos veces la misma etapa.
- **Lista de vendedores** en `proyecto(id).vendedores` (como mucho 20) y lectura `oferta(id, vendedor)`, para que la web muestre las ofertas.
- Errores nuevos: #20 ofertas llenas, #21 vendedor bloqueado, #22 oferta inexistente, #23 compra propia, #24 la oferta cambió.
- Un detalle no previsto en el ADR: **ofrecer** también se rechaza si el vendedor está bloqueado. El ADR solo lo pedía al comprar, pero así el vendedor se entera en el momento. Al comprar se vuelve a verificar, por si vota con la oferta abierta.

## Otros cambios

- `scripts/deploy.sh`: la demo ahora incluye el mercado. Beto le vende a Ana antes de la devolución, y Ana cobra los 110 XLM.
- Script nuevo `scripts/demo-mercado.sh <CONTRACT_ID>`: muestra el bloqueo por voto en vivo (no hace falta esperar ninguna fecha).
- `docs/app.js`: mensajes de los errores #20 a #24. Los botones de compra y venta en la web no estaban en el alcance de T4; quedan para un ticket de web aparte.
- En la rama v2, `docs/config.js` apunta al contrato nuevo.
- `.gitignore` suma `demo-mercado.log`.
