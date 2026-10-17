# Resumen Web — Fase 3: enfoque en software de estudiantes + Publicar, cobrar etapa, subir prueba y devolver plata ✅

La Fase 3 está terminada y probada **con transacciones reales en testnet, hechas con clics desde la web**. Está en `v2` y publicada en `main`.

## 1. Proyectos viejos → "Pruebas del sistema"

- En `docs/config.js` hay una lista `pruebas: [0, 1, 2, 3, 4, 7]`. El contrato no se tocó.
- Esos proyectos (huerta, panadería, demos y la prueba del formulario) ya **no aparecen en la lista principal** ni cuentan en los números de Inicio. Están al final de "Proyectos", en una sección **colapsada** "Pruebas del sistema (6)", con la aclaración de que son pruebas técnicas del contrato.
- Para mandar otro proyecto a pruebas, se agrega su número a esa lista.

## 2. Dos proyectos de estudiantes en testnet ("Juntando plata")

| # | Proyecto | Publica | Retorno | Meta | Etapas | Invertido | Hash |
|---|---|---|---|---|---|---|---|
| 5 | **App de turnos para kioscos del barrio** | `estudiante1` | Parte de las ventas (10 % de las suscripciones por 12 meses, mínimo 10 XLM por cada 100) | 300 XLM | Prototipo con turnos y avisos por WhatsApp (180) · Lanzamiento en 10 kioscos de Corrientes (120) | Ana 25 XLM | [crear 6974fab0…](https://stellar.expert/explorer/testnet/tx/6974fab0b3c01706de01a982da4b721f6c35c34eaeae9a3655d655497ef52ed9) · [inversión 92f4b447…](https://stellar.expert/explorer/testnet/tx/92f4b44734e35a5d55ccc7922428cf4d107238348eb42adddaac542dd6944329) |
| 6 | **Plataforma de apuntes para la facultad** | `estudiante2` | Préstamo al 8 % (324 XLM en total) | 300 XLM | Versión web con buscador de apuntes (200) · App para celular y plan premium (100) | Beto 15 XLM | [crear 54908883…](https://stellar.expert/explorer/testnet/tx/5490888309c88b3dc3b96ed242e605fa1595e3e6eba936ac651e69ffd2e37474) · [inversión 010f6313…](https://stellar.expert/explorer/testnet/tx/010f631392f75ac971154d894a9003a37c6fd23f0128329eede9e0acfde6bc31) |

- Se puede invertir hasta el **16/11/2026**, así que el jurado puede probar invertir y votar.
- Imágenes nuevas con el estilo oscuro y naranja: `docs/img/turnos.svg`, `docs/img/apuntes.svg` y una genérica `docs/img/software.svg`. Se cargan desde la web pública.
- Las cuentas `estudiante1` y `estudiante2` son nuevas, fondeadas con friendbot. Sus claves están solo en `~/.config/stellar`.

## 3. Textos

- **Inicio**, bajo el título: "Para estudiantes con proyectos de software. Puede invertir cualquier persona o empresa, de cualquier país."
- **Cómo funciona:**
  - la bajada habla de estudiantes con proyectos de software (antes decía "emprendedores, cooperativas y PyMEs");
  - recuadro nuevo "¿Quién invierte?": una software factory, una aceleradora, un egresado que vive afuera;
  - en los pasos: "los estudiantes publican su proyecto", y la prueba de cada etapa es "una demo y el link a su código en GitHub".
- **Preguntas frecuentes** suma:
  - **"¿Quién puede invertir?"**: cualquier persona o empresa de cualquier país con billetera Stellar; en esta versión es plata de prueba; en la versión real se pedirá verificación de identidad (KYC) según las leyes de cada país;
  - "¿Qué proyectos hay en Órbita?".
- No quedan ejemplos de huerta ni de panadería en la web. Solo aparecen en los datos de los proyectos de prueba.

## 4. Fase 3: lo nuevo en la web

**Publicar: formulario en 4 pasos**
1. **Tu proyecto:** nombre, qué van a hacer y quiénes son (con ejemplos de software), e imagen (3 ilustraciones para elegir o un link propio).
2. **Qué ofrecés:** 4 opciones grandes (Préstamo con interés, Parte de las ventas, Parte de las ganancias, Producto) y las condiciones, con un ejemplo distinto según la opción.
3. **Etapas:** qué van a hacer, plata que necesitan y mínimo a devolver (o unidades, si es Producto). Hasta 10 etapas. Muestra la meta total y "por cada 100 XLM invertidos, X XLM".
4. **Fechas:** hasta cuándo se puede invertir, hasta cuándo mostrar la prueba de cada etapa y la fecha para devolver. Vienen con fechas propuestas.
- **Resumen** antes de confirmar, avisando que una vez publicado no se puede editar.
- Cada paso se valida con mensajes claros y con los mismos límites del contrato (largo en bytes, fechas en orden, montos).
- Guarda un borrador en el navegador por si se recarga la página.
- Si no hay billetera conectada, explica por qué hace falta y ofrece conectarla.

**Tareas del dueño** (recuadro naranja "Sos el dueño de este proyecto", solo para la billetera que publicó):
- Juntando plata: cuánto lleva y el link para compartir.
- **Cobrar la etapa:** cuando más de la mitad votó que sí. La frase previa explica la comisión del 2 % y la fecha para subir la prueba. Si no alcanza, muestra "Esperando votos: X % votó que sí".
- **Subir la prueba** de cada etapa cobrada, con **cuenta regresiva** ("⏳ Te quedan 74 días"; en rojo si quedan menos de 3). Pide un link https:// (demo o GitHub) y avisa que queda para siempre.
- **Devolver plata:** cuánto prometió, cuánto devolvió y cuánto falta (sugerido en el campo), con cuenta regresiva hasta la fecha de devolución. Si ya pasó la fecha, avisa que va a quedar "Incumplido".

## Cómo se verificó

Prueba de punta a punta en **Chromium** con una billetera de prueba que firma con la cuenta `dueno`. La clave se leyó en el momento desde el CLI y no se guardó en ningún archivo.

| Prueba (con clics en la web) | Resultado | Hash |
|---|---|---|
| **Cobrar la etapa 1** de «Panadería La Esquina» (prueba 4) | "Cobraste la etapa 1: llegaron 147 XLM" (150 − 2 %) | [f37ae33d…](https://stellar.expert/explorer/testnet/tx/f37ae33d48a0a7d9d16365e88b8941ca53f3f0b7a3f532c64cb909a2e62d3b68) |
| **Subir la prueba** (link de GitHub), con "⏳ Te quedan 74 días" | "Subiste la prueba de la etapa 1…" | [4392d194…](https://stellar.expert/explorer/testnet/tx/4392d194b70b08974377f38c53efee05880d0dd8cf996bfa936945e66537d6e2) |
| **Devolver 15 XLM** (sugerido: lo que faltaba) | "Devolviste 15 XLM… ¡Cumpliste con todo lo prometido!" | [99ab0265…](https://stellar.expert/explorer/testnet/tx/99ab0265ce0209047e7d5f22bd2e70e04a910230d5aa306d461b18463ea1b5a6) |
| **Publicar** con el formulario completo (primero sin nombre: "Escribí el nombre del proyecto.") | "Tu proyecto… ya está publicado (número 7)", y la página salta a su ficha | [ee2b94a0…](https://stellar.expert/explorer/testnet/tx/ee2b94a00e9a2ca21faa8740dadae973a1b6cccb1d1556badc66a92822aba4a7) |

Además:
- leí en la red el proyecto 7: el monto de 60,5 XLM, los mínimos, las fechas y la imagen (link a la web pública) quedaron bien;
- el recuadro del dueño aparece para el dueño y **no** aparece para Beto;
- todas las páginas en computadora y celular sin errores en la consola y sin desborde;
- la lista principal muestra solo los 2 proyectos de estudiantes, y las 6 pruebas quedan colapsadas.

## Detalles que encontré y arreglé

- Las imágenes para elegir en el formulario armaban su link a partir de la dirección donde estaba abierta la página. Si alguien publicaba desde una copia local, en la blockchain quedaba un link que no funciona para nadie más. **Ahora siempre apuntan a la web pública** (`CONFIG.sitio`).
- El indicador de pasos mostraba "✓. Tu proyecto", con un punto de más. **Arreglado.**

## Decisión que tomé (avisame si preferís otra)

- Los **números de Inicio** tampoco cuentan los proyectos de prueba. Por eso hoy muestran 2 proyectos y 40 XLM invertidos, con 0 pagado y 0 devuelto. Si preferís que sumen todo el contrato, es un cambio de una línea.

## Pendiente: Fase 4

Mi panel (mis inversiones, mis proyectos, "qué te toca hacer hoy" y transacciones de la sesión), partes en venta (ofrecer, cancelar y comprar) y "Actualizar estado".
