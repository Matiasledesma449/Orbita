# Resumen I3 — Etapa vencida sin evidencia → retiro sin votar ✅

I3 está terminado: tests en verde, contrato nuevo desplegado en testnet y la regla probada en vivo, esperando a que venciera una fecha real. Está en la rama `v2`. `main` y la web pública no cambiaron.

Antes de I3 se hizo la corrección **I2b** (fecha de devolución única). Su resumen está en `plan/RESUMEN-I2.md`.

## Tests

Pasan los 28 (los 21 anteriores y 7 nuevos). Los nuevos comprueban:
- que si la etapa 1 cobró y venció sin evidencia, `revisar` deja el proyecto "Fallido" y Ana y Beto retiran 280 y 120 (lo que quedaba), con el contrato en 0;
- que `reembolsar` aplica el vencimiento sola, aunque nadie haya llamado a `revisar`;
- que con la evidencia cargada a tiempo, el proyecto no vence y la etapa 2 se sigue votando;
- que justo en la fecha límite todavía está a tiempo;
- que sin vencer no se puede retirar (error #11);
- que la evidencia no se puede cargar después de la fecha límite (error nuevo #18);
- que `revisar` también marca "Fallido" si vence el plazo sin llegar a la meta.

## CONTRACT_ID nuevo

`CD6HQDUG2SY4MMEFUPGQFPW3VMBZKDMU3RC5LIU3U5YYVLPMLLZ3VSSM`
https://stellar.expert/explorer/testnet/contract/CD6HQDUG2SY4MMEFUPGQFPW3VMBZKDMU3RC5LIU3U5YYVLPMLLZ3VSSM

## Prueba real en testnet: la etapa vence sin evidencia (proyecto 1, script `scripts/demo-vencimiento.sh`)

Fechas de pocos minutos: la evidencia de la etapa 1 vencía a las 18:52 (hora Argentina).

| Paso | Hash |
|---|---|
| Crear proyecto con fechas cortas | [289e6743…](https://stellar.expert/explorer/testnet/tx/289e6743da101ecb150ee43d76b2ac4fc560e9f54a9d5f197c2cdeba9261ec56) |
| Aportar: Ana, 70 XLM | [f84d746a…](https://stellar.expert/explorer/testnet/tx/f84d746aa1c73cafeb8a2ece22c67cca03e14e59618c34410bf45e7bdf5370f7) |
| Aportar: Beto, 30 XLM | [f5333a39…](https://stellar.expert/explorer/testnet/tx/f5333a39c395c5f5c44d3a1a09bac3ea20f24f01d9352e88b499250015a6b31d) |
| Votar etapa 1 | [ecdf57dc…](https://stellar.expert/explorer/testnet/tx/ecdf57dc05f71fa5a5ecf618399d88a5b2119235816bd306792e9a996b9b74aa) |
| Liberar etapa 1 (58,8 al dueño y 1,2 a Órbita) | [20f7d3d9…](https://stellar.expert/explorer/testnet/tx/20f7d3d91397c0d70c2a670b63b35516bbc935d2a5a2359226a4117760623f41) |
| *(el dueño no carga la evidencia y la fecha vence)* | — |
| **`revisar`: el proyecto pasa a Fallido** (evento `vencido`: 40 XLM reembolsables) | [705ef752…](https://stellar.expert/explorer/testnet/tx/705ef7526aeb14d22e83c647c1627fe205fe80f47a4c8ede44377a48dc913e0c) |
| **Ana retira 28 XLM** (70 % de lo que quedaba), sin votar | [b8075985…](https://stellar.expert/explorer/testnet/tx/b8075985f2208b7c0a8ea5caac1fa5341c33dbfd4f00c33a539f3c2ac5c6b2b3) |
| **Beto retira 12 XLM** (30 %), sin votar | [5847252d…](https://stellar.expert/explorer/testnet/tx/5847252d88571ca1a3865860d7cc0c3c8eb38e53a7911a29717d39fc0b6ea23a) |

Estado final del proyecto 1: Fallido, 60 XLM liberados, 40 XLM devueltos y la evidencia de la etapa 1 vacía.

**Demo normal con el mismo contrato** (proyecto 0, `scripts/deploy.sh`): con la evidencia a tiempo, el recorrido completo sigue funcionando: [desplegar](https://stellar.expert/explorer/testnet/tx/260abcb54f06eef35b7842926abfd2fbf4093607b284f1a359d55e1f2cf9149c), [crear](https://stellar.expert/explorer/testnet/tx/93488d587419790fed89626e02994037cabfbc2ed83fe34e5d4450d65f1ca635), [liberar etapa 1](https://stellar.expert/explorer/testnet/tx/24cbbb092d1f063731336698e9a85649e1a51750523011c54881b7919fe35dc7), [evidencia](https://stellar.expert/explorer/testnet/tx/2665e22fef799fa81bc36cf3950683792e79e0cb881e1efd47d0eefc7c70b5e2) y [liberar etapa 2](https://stellar.expert/explorer/testnet/tx/978ea3d197005708096492d93ce286efb9b3b8896f718280ebed7285a5a541ce).

## Qué cambió en el contrato

- **Regla nueva:** si el dueño cobró una etapa y no cargó la evidencia antes de la fecha límite, el proyecto pasa a "Fallido". Cada aportante retira su parte de lo que queda **sin votar**.
- En Stellar, un contrato no "despierta" solo cuando pasa una fecha. Por eso los cambios por fecha se aplican en la próxima transacción que toca el proyecto: al votar, liberar o reembolsar.
- Función nueva `revisar(id)`: cualquiera la puede llamar para actualizar el estado. Avisa con un evento `vencido`.
- La regla que ya existía de "plazo vencido sin llegar a la meta" pasó a funcionar con el mismo mecanismo.
- La evidencia ya no se puede cargar después de la fecha límite (error nuevo #18). Así la regla es clara: o se carga a tiempo, o se habilita el retiro.

## Otros cambios

- Script nuevo `scripts/demo-vencimiento.sh <CONTRACT_ID>`: arma un proyecto con fechas de pocos minutos para mostrar la regla en vivo (tarda unos 5 minutos).
- `docs/app.js`: mensaje del error #18.
- En la rama v2, `docs/config.js` apunta al contrato nuevo.
- `.gitignore` suma `demo-vencimiento.log`.
- Un intento fallido del script de vencimiento: el CLI no acepta un texto vacío como argumento (`--imagen ""`), y el script se frenó antes de enviar ninguna transacción. Lo corregí usando la imagen de la huerta.
