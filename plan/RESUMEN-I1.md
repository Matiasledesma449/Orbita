# Resumen I1 — Comisión de Órbita: 2 % de cada etapa liberada ✅

I1 está terminado: tests en verde, contrato nuevo desplegado en testnet y el recorrido completo hecho con transacciones reales. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Tests

Pasan los 13 (los 12 de T1 y 1 nuevo). Comprueban:
- que con una etapa de 600, el dueño recibe 588 y la plataforma 12;
- que con las dos etapas (600 + 400), el dueño recibe 980 y la plataforma 20, y el contrato queda en 0;
- que la etapa liberada cuenta completa (600) para el retorno comprometido;
- que el reembolso cuando se rechaza una etapa sigue dando lo mismo que antes;
- que `plataforma()` devuelve la dirección que se fijó al desplegar.

## CONTRACT_ID nuevo

`CDH7F25PSURV5WNLP2ZEWAF3PAVWHEGYAH2LVMZUYOAVQGDYBWFAVW5A`
https://stellar.expert/explorer/testnet/contract/CDH7F25PSURV5WNLP2ZEWAF3PAVWHEGYAH2LVMZUYOAVQGDYBWFAVW5A

Cuenta de la plataforma (`orbita`): `GBWQLU5WVFSWYMMXVJ4DJFBRPHQJO6NYKJHZACG3CK67H6NFMV3EMWQZ`

## Prueba real en testnet

| Paso | Hash |
|---|---|
| Desplegar (con `--plataforma orbita`) | [0dd879e9…](https://stellar.expert/explorer/testnet/tx/0dd879e90de95018de43f8ab44a085f0898343733028e7bb947442f6e28cca7d) |
| Crear proyecto | [6ac9dd8d…](https://stellar.expert/explorer/testnet/tx/6ac9dd8d99edad6e7849479ad7a60e0e48933798db1d09f7e9a8b37cbdef4bd5) |
| Aportar: Ana, 70 XLM | [b2bea4ae…](https://stellar.expert/explorer/testnet/tx/b2bea4ae3591eae15ca53bf924bbeb6b68f67480eb27b72566477e77b7bbf9de) |
| Aportar: Beto, 30 XLM | [7be4b05c…](https://stellar.expert/explorer/testnet/tx/7be4b05c1f48a7fa254fcc1b54d87f08611dc57ecebd40b45b5b63f0f6463aff) |
| Votar etapa 1 | [755edd34…](https://stellar.expert/explorer/testnet/tx/755edd3437471a9888900c9762adb5b0de93f285bd86f326139cf7dac061d966) |
| **Liberar etapa 1:** 58,8 XLM al dueño y 1,2 XLM a Órbita | [628577a3…](https://stellar.expert/explorer/testnet/tx/628577a341641accf60d0951de16c96e7a60a9cc5c5520f14a203b1e577a4d39) |
| Cargar evidencia de la etapa 1 | [9aa40fe2…](https://stellar.expert/explorer/testnet/tx/9aa40fe23de32f33917308864e067323ba8788fcb55bb0a97df7983b9e193474) |
| Votar etapa 2 | [a43dc1cd…](https://stellar.expert/explorer/testnet/tx/a43dc1cdff47e40e7f79612d56631a56d85747076dd2357fb253181b55ffa1c3) |
| **Liberar etapa 2:** 39,2 XLM al dueño y 0,8 XLM a Órbita | [c1fa7fb1…](https://stellar.expert/explorer/testnet/tx/c1fa7fb16b2e2d05f83d6b2c0e5f5d8f093b23667ae13026dec34c74bea15035) |

Al final, el dueño cobró 98 XLM y Órbita 2 XLM de comisión (el script mide la diferencia de saldo de `orbita`: 20.000.000 stroops = 2 XLM).

## Qué cambió en el contrato

- Al desplegar, ahora se indica también la dirección de la plataforma: `__constructor(token, plataforma)`. Queda fija y nadie la puede cambiar después.
- `liberar` envía el 98 % de la etapa al dueño y el 2 % a la plataforma, en la misma transacción. Emite un evento `comision`.
- `liberar` ahora devuelve lo que recibió el dueño (el 98 %).
- La comisión es una constante del código (`COMISION_BPS = 200`).
- Lectura nueva: `plataforma()`.

## Otros cambios

- `scripts/deploy.sh` crea y fondea la cuenta `orbita`, la pasa al desplegar y al final muestra cuánta comisión cobró.
- En la rama v2, `docs/config.js` apunta al contrato nuevo. `docs/app.js` no necesitó cambios.
- `CLAUDE.md` suma la cuenta `orbita` y el link al ADR.
- El ADR-001 quedó como aprobado, con tus 5 decisiones anotadas.
