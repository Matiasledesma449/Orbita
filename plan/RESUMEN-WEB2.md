# Resumen Web — Fase 2: invertir, votar y cobrar ✅

La Fase 2 está terminada y probada **con transacciones reales en testnet, hechas con clics desde la web**. Está en `v2` y publicada en `main` (GitHub Pages).

## Antes de la fase: imágenes viejas

- `docs/img/huerta.svg` y `docs/img/evidencia-etapa1.svg` (las de antes del rediseño) **se usan**: los 5 proyectos del contrato guardan `huerta.svg` como imagen, 2 guardan `evidencia-etapa1.svg` como prueba, y los 4 scripts de demo también las usan.
- Lo guardado en la blockchain no se puede cambiar, así que **las redibujé con el estilo oscuro y naranja, con el mismo nombre de archivo**. No se rompió ningún link.

## Qué hay en la Fase 2

- **Ventana de confirmación** antes de cada firma, con una frase que explica qué va a pasar ("Vas a invertir 100 XLM en «Panadería La Esquina». La plata queda guardada en el contrato…"). Botones grandes: "Cancelar" / "Sí, invertir 100 XLM".
- **Mientras firma:** "Esperando tu firma… Se abrió Freighter: revisá y tocá Aprobar". Después: "Enviando…".
- **Al terminar:** "¡Listo!", una confirmación en palabras ("Invertiste 100 XLM… Ahora tu parte del proyecto es de 145 XLM") y el botón **"Ver comprobante ↗"** (stellar.expert).
- **Errores en palabras simples:**
  - firma cancelada: "Cancelaste la firma en Freighter. No se hizo nada.";
  - billetera en otra red: "Abrí Freighter, tocá el globo y elegí Testnet";
  - cuenta sin XLM: cómo cargar XLM de prueba;
  - saldo insuficiente;
  - demora de la red;
  - y los 24 errores del contrato traducidos.
- No se puede firmar dos veces seguidas mientras una operación está en curso.
- **Tu inversión** (en la ficha, con la billetera conectada): tu parte, cuánto pesa tu voto, cuánto tenés para cobrar y el botón **"Cobrar X XLM"**. Lo cobrable se calcula simulando el cobro, así que incluye los vencimientos que todavía nadie actualizó (por ejemplo, un plazo vencido sin llegar a la meta).
- **Invertir:** atajos (10, 50, 100 XLM y "Todo lo que falta"), campo de monto que acepta "25" o "25,5", y tu saldo. Valida antes de firmar: monto mayor a cero, que no supere lo que falta y que dejes 2 XLM para comisiones.
- **Votar:** "Sí, pagarle la etapa al equipo" (verde) y "No, cortar el proyecto" (rojo). La frase previa explica qué pasa con cada opción, cuánto pesa tu voto y que después no vas a poder vender tu parte hasta que la etapa se resuelva. Si ya votaste: "✓ Ya votaste esta etapa". Si no invertiste: "Votan solo las personas que invirtieron". Si falta la prueba de la etapa anterior, no se muestran los botones.

## Cómo se verificó

Prueba de punta a punta en **Chromium** con una billetera de prueba que firma con la cuenta de **Ana**. La clave se leyó en el momento desde el CLI y no se guardó en ningún archivo. Todo se hizo con clics, como lo haría una persona:

| Prueba | Resultado | Hash |
|---|---|---|
| Cancelar la firma | "Cancelaste la firma en Freighter. No se hizo nada." (sin transacción) | — |
| Billetera en otra red (Public) | "Tu billetera está en otra red… elegí Testnet" (sin transacción) | — |
| **Invertir 100 XLM** en «Panadería La Esquina» desde la web | "¡Listo! Invertiste 100 XLM… Ahora tu parte del proyecto es de 145 XLM" | [b64350b5…](https://stellar.expert/explorer/testnet/tx/b64350b551690bd723f0c262ace9a156801a1a7c73c60de9245bcf9ddffb5068) |
| *(Beto completa los 55 XLM que faltaban, desde el CLI)* | el proyecto pasa a "En marcha" | [b55a0d3c…](https://stellar.expert/explorer/testnet/tx/b55a0d3c50a83c3f9c44c24308c536be3b1a6ad4d1c7a73e5d88b4708c1159b6) |
| **Votar SÍ** la etapa 1 desde la web | "¡Listo! Votaste SÍ en la etapa 1". En la red: 145 de 200 XLM a favor. La web muestra "✓ Ya votaste esta etapa" | [efd9f741…](https://stellar.expert/explorer/testnet/tx/efd9f741d53634af1d810feb86b44441314b8bc7f9edae85bc584b3efec77737) |
| *(El dueño paga 5 XLM de retorno en el proyecto 1, desde el CLI)* | Ana tiene 5 XLM para cobrar | [e2cda6a6…](https://stellar.expert/explorer/testnet/tx/e2cda6a6b6fb4fa847766446e56f12a199738706d042c8dcd42f8bede1415998) |
| **Cobrar 5 XLM** desde la web | "¡Listo! Cobraste 5 XLM. Ya está en tu billetera." | [330b6cdf…](https://stellar.expert/explorer/testnet/tx/330b6cdf03e2649b8d5733f9c8323a14656f43fa001a724bae12ea8bb60e2c8f) |

Además:
- todas las páginas en computadora y celular sin errores en la consola y sin desborde;
- en celular con Beto conectado aparecen los botones de voto (todavía no votó), y en un proyecto donde no tiene parte no aparece ningún botón;
- el menú de billetera del compañero sigue funcionando.

## Pendiente para las próximas fases

- Fase 3: Publicar (formulario en 4 pasos), cobrar etapa (dueño), subir evidencia y devolver plata.
- Fase 4: Mi panel (con las transacciones de la sesión, que ya se están guardando), partes en venta (ofrecer, cancelar y comprar) y "Actualizar estado". En "Partes en venta" falta marcar "(vos)" cuando la oferta es tuya.
