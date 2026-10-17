# Resumen Web — Fase 4: Mi panel, partes en venta y "Actualizar estado" + README final ✅

La Fase 4 está terminada y probada **con transacciones reales en testnet, hechas con clics desde la web**. El README para el jurado está listo. Todo está en `v2` y publicado en `main`.

## Antes de empezar: el trabajo del compañero

Tu compañero ya trabaja en `v2` y subió 2 commits: las tarjetas de números se elevan y brillan al pasar el mouse, e Inicio entra en una sola pantalla con el título más chico. Los integré tal cual (fast-forward, sin conflictos). Para que Inicio entre en la pantalla del celular, sus números usan letra de 14–16 px; lo respeté.

## Qué hay en la Fase 4

**Mi panel** (con la billetera conectada):
- **Qué te toca hacer hoy:** junta las tareas de todos tus proyectos, cada una con su botón:
  - actualizar el estado si venció una fecha;
  - cobrar lo que tenés pendiente;
  - votar la etapa en curso;
  - y, si sos dueño: cobrar la etapa aprobada, subir la prueba (con cuenta regresiva) y devolver lo que falta.
  - Si no hay nada: "✓ Hoy no tenés nada pendiente".
- **Tu billetera:** dirección, saldo, "Cargar XLM de prueba" y "Copiar dirección".
- **Mis inversiones:** por proyecto, tu parte, cuánto pesa tu voto y cuánto tenés para cobrar, con "Cobrar", "Ver el proyecto" y "Vender mi parte" o "Cancelar la venta".
- **Mis proyectos:** por proyecto, cuánto juntaste, cobraste y devolviste, con las tareas del dueño de la Fase 3.
- **Lo que hiciste en esta visita:** hora, qué pasó ("Cobraste 5 XLM") y "Ver comprobante".
- Los proyectos reales aparecen primero; los de prueba llevan la etiqueta "(prueba del sistema)".

**Partes en venta:**
- **Vender mi parte** (en la ficha y en el panel): cuánto de tu parte y a qué precio. Si votaste la etapa en curso, explica que vas a poder vender cuando se resuelva.
- **En la lista de la ficha:** tus ofertas dicen **"(vos)"** y tienen "Cancelar venta"; las de otros tienen "Comprar".
- **Comprar:** la frase previa explica que le pagás directamente a quien vende, que desde ahora cobrás y votás con esa parte, y que si el precio cambia la compra se cancela sola.

**Actualizar estado:**
- Ya no es un botón suelto. La web detecta cuando venció una fecha que la blockchain todavía no registró:
  - el plazo terminó sin juntar la plata;
  - el equipo no mostró la prueba a tiempo;
  - pasó la fecha de devolución sin el pago (o, en Producto, sin la prueba).
- Entonces muestra **"⏰ Hay que actualizar el estado"** con el motivo en palabras, en la ficha y en "Qué te toca hacer hoy".

**Mejora técnica:** si una lectura falla por la red (pasó una vez en la Fase 3 con el servidor público de Stellar), la web la reintenta hasta 3 veces antes de mostrar un error.

## Cómo se verificó

Pruebas de punta a punta en **Chromium** con billeteras de prueba que firman con las cuentas de Ana y Beto. Las claves se leyeron en el momento desde el CLI y no se guardaron en ningún archivo.

| Prueba (con clics en la web) | Resultado | Hash |
|---|---|---|
| **Ana pone en venta** 10 XLM de su parte en «App de turnos», a 11 XLM | En "Partes en venta": "vende GDHJ…DXLL **(vos)** · Precio: 11 XLM · Cancelar venta" | [f105c478…](https://stellar.expert/explorer/testnet/tx/f105c47846ada5e447244e78a9c3ca397df7dac50009fb7943a9cebfb882cd1c) |
| **Beto compra** esa parte | "Compraste una parte de 10 XLM…". Tu inversión: 10 XLM, 40 % del voto | [1fd1465f…](https://stellar.expert/explorer/testnet/tx/1fd1465fee2f57a730eb35cc962e1f5a037ad2efc5f8adbc1b4163fec505c6cb) |
| *(Prueba 8: el plazo vence a los 2 minutos sin juntar la plata; Ana había invertido 5 XLM)* | — | [crear 5e970fde…](https://stellar.expert/explorer/testnet/tx/5e970fde21cc9bea1858aa19529f7266f25bfddbe0db42ed6d395c9bb6835859) |
| **Actualizar estado** desde "Qué te toca hacer hoy" | "…quedó actualizado. Ahora dice: No cumplió: podés recuperar tu plata". La tarea desaparece de la lista | [b3e2de5b…](https://stellar.expert/explorer/testnet/tx/b3e2de5bdc636134ef3a65e7a1febfabe27e3c20c22ded4e89e6544bb69c4fb1) |
| **Cobrar 5 XLM** (reembolso) desde "Qué te toca hacer hoy" | "Cobraste 5 XLM. Ya está en tu billetera." | [5fa2fc3e…](https://stellar.expert/explorer/testnet/tx/5fa2fc3edf45e0b9c6b9faedad9688aa024a6112419ffddfcea19a371419e708) |
| **Cancelar la venta** desde "Mis inversiones" (la oferta de 20 XLM de Ana en la prueba 1) | "Listo: tu parte ya no está en venta…" | [0c0571f2…](https://stellar.expert/explorer/testnet/tx/0c0571f2cfacead9f9f1b2ba347976d235f5532b98e43ef5817464f05adf580c) |

Además:
- **Panel de `estudiante1`** (dueño de «App de turnos», que está juntando plata): "✓ Hoy no tenés nada pendiente" y su proyecto en "Mis proyectos".
- **Panel de `dueno`** (pruebas del sistema): muestra sus tareas reales, como subir las pruebas con cuenta regresiva y una devolución vencida.
- Las 9 páginas en computadora y celular, y el panel en celular con billetera: sin errores en la consola y sin desborde.

## README final para el jurado

`README.md` reescrito en español simple:
- qué es Órbita (estudiantes con proyectos de software; invierte cualquiera, de cualquier país) y las 3 protecciones;
- link a la web y al contrato actual;
- cómo probarlo en 3 pasos con Freighter en testnet;
- **las 12 funciones del contrato con una transacción real de cada una**. Verifiqué las 15 transacciones en la red: salieron bien, son del contrato `CBN7TBFL…` y llaman a la función indicada. 13 se hicieron con clics desde la web;
- los 62 tests y cómo correrlos;
- herramientas de Stellar, arquitectura y estructura del repo;
- qué hicimos durante el evento y cómo usamos IA (Claude Code + Stellar Skills, tickets y cada cambio probado en testnet);
- próximos pasos: USDC y anchors, passkeys, KYC, garantía del dueño, revisores y disputas, auditoría y régimen de tokenización de la CNV.
- Se mantienen para que el equipo las complete: "Validación" (entrevistas) y el link al video.

**Revisión de que todo coincida**, comparado contra el contrato real:
- el mismo contrato en `docs/config.js`, el README y la web, y ningún otro contrato mencionado en `docs/`;
- la cuenta de la plataforma del README es la que devuelve `plataforma()`;
- los proyectos #5 y #6 tienen esos nombres y se puede invertir hasta el 16/11/2026;
- los tests son 62.
- `CLAUDE.md` decía que `main` usaba el contrato v1: lo corregí.
