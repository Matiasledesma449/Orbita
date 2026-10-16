# Resumen T1 — Contrato v2: descripción, imagen y evidencia por etapa ✅

T1 está terminado: tests en verde, contrato v2 desplegado en testnet y el recorrido completo hecho con transacciones reales. Está en la rama `v2` (commit `74eb7d1`). `main` y la web pública no cambiaron.

## Tests

Pasan los 12 (los 6 de antes y 6 nuevos). Los nuevos comprueban:
- que se guardan la descripción, la imagen y la evidencia;
- que solo el dueño puede cargar la evidencia;
- que no se puede votar la etapa 2 sin la evidencia de la etapa 1;
- que no se carga evidencia de una etapa que todavía no cobró;
- que la evidencia no se puede cargar dos veces;
- que no se puede crear un proyecto sin título.

## CONTRACT_ID nuevo

`CB343VI2B4A2KRPKPT6TI3DXSIOH443DDZLFMNEPTDDOU7GPS7UV2U7P`
https://stellar.expert/explorer/testnet/contract/CB343VI2B4A2KRPKPT6TI3DXSIOH443DDZLFMNEPTDDOU7GPS7UV2U7P

## Prueba real en testnet

| Paso | Hash |
|---|---|
| Crear proyecto (con descripción e imagen) | [47434d48…](https://stellar.expert/explorer/testnet/tx/47434d48900c567d1f1fa152d1d531603c52f585497e247a40299924e961a6ef) |
| Aportar: Ana, 70 XLM | [5ba06b8e…](https://stellar.expert/explorer/testnet/tx/5ba06b8e75932a4edbd90804a8a60d900e1c6e8fb8bafaa2c53305a2eec01d0b) |
| Aportar: Beto, 30 XLM | [ec48eae9…](https://stellar.expert/explorer/testnet/tx/ec48eae93949527ad7f2035d82874c89e811229b0a440c4d801da0bf2b8ff05b) |
| Votar etapa 1 (sin evidencia, como pediste) | [f9c80e5c…](https://stellar.expert/explorer/testnet/tx/f9c80e5c5e111a7cf48fca90b856b5ba676a2b78eb6e16d4da49c264a49dbdbb) |
| Liberar etapa 1 (60 XLM) | [089d3961…](https://stellar.expert/explorer/testnet/tx/089d3961d34b13e3bfe9313280659f672a1c2244f73309491417f5f74e734118) |
| Cargar evidencia de la etapa 1 | [7eefed9d…](https://stellar.expert/explorer/testnet/tx/7eefed9db1238a8e98200f933a6e16935b80f52e9a526ab0b112c584d334806c) |
| Votar etapa 2 | [355e20fd…](https://stellar.expert/explorer/testnet/tx/355e20fd16d74a58d8c8eb255680ab3accb768e74e259f2ae5c8faf6a20e2dd2) |
| Liberar etapa 2 (40 XLM) | [6a29708b…](https://stellar.expert/explorer/testnet/tx/6a29708bca6dbde80f6fd24d0dc7c5e732bdd546ec7950ae585378d51ecfe9a1) |

Al final, el proyecto quedó "Completado" con los 100 XLM liberados y la evidencia de la etapa 1 guardada.

## Qué cambió en el contrato

- Crear un proyecto ahora pide también una descripción y una imagen (un link).
- Función nueva `cargar_evidencia`:
  - solo la puede usar el dueño;
  - sirve únicamente para una etapa que ya cobró;
  - la evidencia se carga una sola vez y queda fija, para que nadie pueda cambiarla después de que la gente votó.
- La etapa 1 se vota apenas el proyecto se financia. Desde la etapa 2 en adelante, para votar hace falta la evidencia de la etapa anterior.
- Los textos tienen un largo máximo, para no gastar de más en almacenamiento.

## Otros cambios

- `scripts/deploy.sh` ahora hace el recorrido nuevo completo.
- En la rama v2, `docs/config.js` apunta al contrato nuevo. `docs/app.js` tiene lo mínimo para no romperse: los textos de los errores nuevos, y por ahora crea proyectos con descripción e imagen vacías. Eso se completa en T4.
- La imagen de ejemplo que encontré en internet resultó ser una bicicleta. Por eso hice dos ilustraciones propias (`docs/img/huerta.svg` y `docs/img/evidencia-etapa1.svg`) y las enlacé desde la rama v2.
