# Resumen Web — Fase 1: barra, Inicio, Cómo funciona, Proyectos, Ficha y Preguntas ✅

La Fase 1 está terminada y verificada contra el contrato real en testnet. Está en la rama `v2`. `main` y la web pública no cambiaron.

## Antes de empezar: el trabajo del compañero

- `git pull` / `fetch`: en `v2` no había nada nuevo. Los 4 commits del compañero estaban en **`main`** (16 y 17/10): tema oscuro con acentos naranja, letra Inter, tarjetas tipo "vidrio", barra con el logo a la izquierda y el menú al centro, botón de GitHub, portada grande "ÓRBITA" y etapas como línea de tiempo con íconos.
- Los traje a `v2` con un merge de `main` → `v2` (sin conflictos y sin tocar `main`). El rediseño se hizo **sobre su diseño**: mismos colores, fondo, tarjetas, portada, íconos de etapas y botón de GitHub.
- Conflictos que te consulté y cómo se resolvieron:
  1. Las secciones "Empezar" y "Transacciones" de su menú se **movieron**: la guía de 3 pasos está en "Cómo funciona" y en "Preguntas", y las transacciones van a "Mi panel" (fase 4).
  2. La letra pasó de 15 a **18 px**, manteniendo su estilo.
  3. En la portada quedaron tus botones: "Quiero invertir" y "Quiero financiar mi proyecto".

## Qué hay en la Fase 1

- **Barra fija arriba:** Inicio · Cómo funciona · Proyectos · Publicar · Mi panel · Preguntas · [Conectar billetera] · GitHub. En celular, menú ☰ que ocupa todo el ancho. Al conectar, el botón muestra la cuenta ("✓ GATS…D4TT").
- **Inicio:** "ÓRBITA" grande, "Una forma de financiar tus proyectos", los dos botones y 4 números leídos en vivo del contrato: proyectos publicados, plata invertida, pagado a los equipos y devuelto a los inversores.
- **Cómo funciona:** 4 pasos, las 3 protecciones del inversor y la guía "¿Primera vez? Empezá en 3 pasos", con el aviso para celulares y el botón "Cargar XLM de prueba" cuando hay billetera conectada.
- **Proyectos:** tarjetas con imagen, estado en palabras, tipo de retorno, barra de avance y "Ver proyecto".
- **Ficha del proyecto** (solo lectura), en este orden:
  1. Qué es y qué ganás: imagen, descripción, tipo de retorno explicado, la promesa en una frase ("Por cada 100 XLM que invertís…") y las condiciones del equipo.
  2. Invertir: cuánto se juntó, cuánto falta y hasta cuándo.
  3. Línea de tiempo de etapas: monto, lo que promete devolver, fecha para la prueba, link "Ver la prueba" y estado ("Se le pagó al equipo", "Ahora se está votando", "No mostró la prueba a tiempo"…).
  4. Votación: "¿Le pagamos al equipo la etapa N?", con barras de Sí y No, y el aviso si falta la prueba de la etapa anterior.
  5. Lo prometido y lo pagado: comparación, fecha límite, historial de pagos y cartel de "Incumplido".
  6. Partes en venta: lista de ofertas con monto y precio.
  7. "Ver en la blockchain" (stellar.expert).
- **Estados en palabras:** "Juntando plata", "En marcha: etapa X de Y", "Terminado", "No cumplió: podés recuperar tu plata" y la etiqueta roja "Incumplido".
- **Preguntas frecuentes:** 9 preguntas en lenguaje simple (plata de prueba, qué necesito, qué es "mi parte", quién tiene la plata, qué pasa si no cumple, cómo cobro, vender mi parte, comisión y cómo verificarlo).
- **Publicar** y **Mi panel** muestran por ahora un aviso de que llegan en las fases 3 y 4.

## Cómo se verificó

1. **Lecturas simuladas contra testnet** (contrato `CBN7TBFL…`): `cantidad`, `proyecto`, `prometido`, `pago` y `oferta` responden en los 5 proyectos, y los tipos de datos coinciden con lo que espera la web.
2. **Proyectos de demostración en testnet**, para ver todos los estados:
   - 0 "Huerta comunitaria", Terminado (con pago del dueño);
   - 1 "Demo: mercado", En marcha, con **una parte en venta** (Ana ofrece 20 XLM por 21);
   - 2 "Demo: etapa vencida sin evidencia", No cumplió;
   - 3 "Demo: no devuelve a tiempo", Terminado + **Incumplido**;
   - 4 "Panadería La Esquina", **Juntando plata** (45 de 200 XLM).
3. **Navegador real (Chromium)** en computadora (1366 px) y celular (390 px): recorrí las 11 vistas, sin errores en la consola, sin desborde hacia los costados y con letra base de 18 px.

| Dato creado para la prueba | Hash |
|---|---|
| Proyecto 4 "Panadería La Esquina" | ver en el [contrato](https://stellar.expert/explorer/testnet/contract/CBN7TBFLY7O7HZWQOH2N34IEDRUIRVVGQM5YWY6UOR6N2O5KA4ZVQXZC) |
| Ana ofrece una parte en el proyecto 1 | [309c3ed4…](https://stellar.expert/explorer/testnet/tx/309c3ed4a4ae4bfb5321f47fbe5c4abaaed1afda8ba6b1a6565e766d5f1f101e) |

## Problemas que encontré y arreglé durante la verificación

- El botón "Cargar XLM de prueba" se veía sin billetera conectada, porque el estilo de los botones pisaba el atributo que los oculta. La página se desbordaba 221 px en celular. **Arreglado.**
- El menú ☰ en celular se abría angosto. **Ahora ocupa todo el ancho.**
- Con la billetera conectada, la barra no entraba en una notebook de 1366 px. **"Cargar XLM de prueba" pasó a la guía, y el botón de conectar muestra la cuenta.**
- Si alguien pasaba rápido de un proyecto a otro, una respuesta lenta podía mostrar el proyecto anterior. **Ahora se descartan las respuestas viejas.**
- En los proyectos de ventas o ganancias, "se compromete a devolverte al menos 10 XLM" por cada 100 sonaba a pérdida. **Ahora dice "pagarte… de su venta"**, y aclara que no es la devolución de lo invertido.

## Cómo probarlo

La web pública (GitHub Pages) sale de `main`, así que esta versión todavía no está ahí. Para verla:
- **En el Codespace:** en la terminal, `cd docs && python3 -m http.server 8765`. En la pestaña "Puertos", abrí el 8765 (ícono del globo).
