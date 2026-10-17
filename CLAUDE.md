# Órbita — reglas de trabajo

Órbita: financiamiento colectivo de proyectos por etapas sobre Stellar (contrato Soroban en Rust + web estática en `docs/`).
El plan está en `plan/TICKETS.md`.

## Reglas

1. **Un ticket por vez.** Nunca empezar el siguiente sin aprobación del usuario.
2. **Un ticket está terminado solo cuando funciona en Stellar TESTNET con una transacción real.** No alcanza con que compile. Evidencia obligatoria:
   - tests en verde (`cargo test`);
   - despliegue o prueba en testnet;
   - hash de la transacción (con link a `https://stellar.expert/explorer/testnet/tx/<HASH>`).
3. **Antes de escribir código de Stellar, consultar las skills de `stellar-dev`** (smart-contracts, dapp, assets, etc.). Como apoyo: https://developers.stellar.org/llms.txt y el MCP Raven si está conectado. Nada de prueba y error a ciegas: verificar versiones instaladas y documentación oficial antes de cambiar código.
4. **Trabajar en la rama `v2`.** Commit al terminar cada ticket. **Nunca tocar `main` sin aprobación del usuario**: `main` es la entrega de la hackathon y tiene que seguir funcionando (GitHub Pages publica desde `main` /docs).
   - **Aprobado por el usuario (17/10/2026) para las fases de la web:** al terminar cada fase, commit en `v2` + merge de `v2` en `main` + push. Antes de mergear, hacer `git fetch` y traer a `v2` lo que el compañero haya subido a `main` (respetando su trabajo).
   - Si algo se rompe en `main`, ver `plan/COMO-VOLVER-ATRAS.md` (tag `v1-estable`).
5. **Explicar todo en español simple y breve.** El usuario es poco técnico.
6. **Guardar el resumen de cada ticket en `plan/RESUMEN-T<n>.md`** con el mismo formato que `plan/RESUMEN-T1.md` (estado, tests, CONTRACT_ID si cambia, tabla de transacciones con links, qué cambió), incluirlo en el commit del ticket y mostrárselo al usuario.

## Datos útiles

- Toolchain: Rust 1.99, target `wasm32v1-none`, Stellar CLI 28.1.0, `soroban-sdk` 28.0.0 (Protocolo 29).
- Web: `@stellar/stellar-sdk` 17.2.1 y `@stellar/freighter-api` 6.0.1 por CDN, con versión fija.
- Cuentas de prueba del CLI: `dueno`, `ana`, `beto` y `orbita` (la plataforma, cobra la comisión del 2 %). Las claves viven en `~/.config/stellar`, nunca en el repo.
- Diseño de inversión aprobado: `plan/ADR-001-inversion.md`.
- Contrato v1 (en `main`): `CAACEJBBUWX4XGU7IPD7CMMYVCDLVZNDR5T2CIWSGNLPQTL3JTQ63HTZ`.
- Si cambian funciones o argumentos del contrato, actualizar también `docs/app.js` y `scripts/deploy.sh`.
- Nunca commitear claves secretas (`S...`), `target/`, `deploy.log` ni `.stellar/`.
