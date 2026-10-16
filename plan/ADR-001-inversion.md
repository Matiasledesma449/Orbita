# ADR-001 — Órbita como herramienta de inversión

- **Estado:** propuesto (falta la aprobación del usuario)
- **Fecha:** 16/10/2026
- **Parte de:** contrato v2 (T1 ✅: descripción, imagen y evidencia por etapa)
- **Fuentes:** skill `stellar-dev:smart-contracts` (development.md, security.md: autorización, aritmética verificada, carreras entre transacciones, TTL, tokens de terceros)

## Contexto

Órbita deja de ser solo una colecta: quien aporta recibe participaciones que dan derecho a un **retorno** (interés, % de ventas, ganancias o producto). Esto suma seis reglas:

1. Al publicar: tipo de retorno, condiciones y, por etapa, un monto mínimo comprometido y una fecha límite.
2. Si una etapa vence sin evidencia, cada aportante puede retirar su parte de lo que queda, sin votar.
3. El dueño paga al contrato y el contrato reparte en proporción entre los dueños **actuales** de las participaciones.
4. Historial público de lo prometido contra lo pagado. Si una fecha de pago vence sin pago, el proyecto queda "incumplido".
5. Venta de participaciones entre usuarios, atómica, dentro del contrato. Quien ya votó la etapa en curso no puede vender hasta que la etapa se resuelva.
6. Comisión de Órbita: 2 % de cada etapa liberada, para una dirección definida al desplegar.

## Decisión

### Idea central: un solo "reparto acumulado" para todo lo que se le debe a los aportantes

Todo el dinero que sale del contrato hacia los aportantes (retornos del dueño **y** reembolsos cuando el proyecto falla) usa el mismo mecanismo: el patrón de **reparto acumulado** (también llamado "recompensa por participación").

- El proyecto guarda `acumulado`: cuánto dinero, en total, le corresponde a **cada unidad** de participación desde el inicio, multiplicado por `PRECISION = 10^12` para no perder decimales.
- Cada aportante guarda su `checkpoint` (el valor de `acumulado` la última vez que se le hizo la cuenta) y su `pendiente` (plata ya ganada y todavía no cobrada).
- **Asentar** a un aportante significa:
  `pendiente += participacion × (acumulado − checkpoint) / PRECISION` y después `checkpoint = acumulado`.
- Cuando entra dinero para repartir (`monto`): `acumulado += monto × PRECISION / total_participaciones`.
- **Antes de cambiar la participación de alguien** (aportar, comprar, vender) se lo asienta. Así lo ganado hasta ese momento queda a su nombre y el comprador solo gana desde que compra.

Con esto, el reembolso deja de "poner en cero" la participación. Se reparte como un pago más, y la persona sigue siendo dueña de su participación y de los retornos futuros (por ejemplo, el interés de un préstamo por la plata ya liberada).

### Datos que se guardan

**Configuración (instance, una vez al desplegar)**
- `Token`: el activo (XLM ahora, USDC desde T2).
- `Plataforma`: la dirección que cobra la comisión. Llega en el constructor: `__constructor(token, plataforma)`.
- `COMISION_BPS = 200` (2 %) es una constante del código: nadie la puede cambiar después.

**`Proyecto`** (persistent, una entrada por proyecto). Campos nuevos:

| Campo | Para qué |
|---|---|
| `tipo_retorno: TipoRetorno` | `Prestamo`, `Ventas`, `Ganancias` o `Producto` |
| `condiciones: String` | texto libre del dueño (máx. 1.000) |
| `acumulado: i128` | reparto acumulado por unidad × 10^12 |
| `total_pagado: i128` | suma de todo lo que pagó el dueño como retorno |
| `cantidad_pagos: u32` | cuántos pagos hay en el historial |
| `incumplido: bool` | se marca si vence una fecha sin el pago comprometido |
| `vendedores: Vec<Address>` | quiénes tienen una oferta de venta abierta (máximo 20) |

**`Hito`** (dentro del proyecto). Campos nuevos:

| Campo | Para qué |
|---|---|
| `minimo_retorno: i128` | lo que el dueño se compromete a devolver o producir por esa etapa |
| `fecha_limite: u64` | fecha (timestamp) para cargar la evidencia **y** pagar ese mínimo |

**Por aportante** (persistent): `Posicion(id, direccion) → { participacion, checkpoint, pendiente }`. Reemplaza a la clave `Participacion` de T1.

**Historial de pagos** (persistent, una entrada por pago): `Pago(id, n) → { monto, fecha }`. Cada pago es una entrada propia, así el proyecto no crece sin límite.

**Ofertas** (persistent): `Oferta(id, vendedor) → { cantidad, precio }`. Una oferta por vendedor y por proyecto.

**Votos**: igual que hoy, `Voto(id, etapa, direccion)`.

### Funciones

| Función | Quién | Qué hace |
|---|---|---|
| `__constructor(token, plataforma)` | al desplegar | guarda el token y la dirección de la plataforma |
| `crear_proyecto(dueno, titulo, descripcion, imagen, tipo_retorno, condiciones, plazo, hitos, montos, minimos, fechas)` | dueño | igual que T1 más los datos de inversión. Valida: largos iguales, mínimos ≥ 0 y fechas crecientes y posteriores al `plazo` |
| `aportar` | aportante | igual que hoy; asienta al aportante antes de sumarle participación |
| `votar` | aportante | igual que T1, más el bloqueo de venta (ver abajo) |
| `liberar(id)` | dueño | transfiere el 98 % al dueño y el 2 % a `Plataforma` |
| `cargar_evidencia` | dueño | igual que T1 |
| `revisar(id)` | cualquiera | aplica los cambios que dependen de la fecha (ver abajo) y guarda el resultado. La web la usa como "actualizar estado" |
| `pagar_retorno(id, pagador, monto)` | cualquiera, normalmente el dueño | transfiere `monto` al contrato, suma a `acumulado` y a `total_pagado`, y anota el pago en el historial |
| `cobrar(id, aportante)` | aportante | asienta y le transfiere todo su `pendiente` (retornos + reembolsos) |
| `reembolsar(id, aportante)` | aportante | se mantiene por compatibilidad con la web: hace lo mismo que `cobrar` |
| `ofrecer_venta(id, vendedor, cantidad, precio)` | vendedor | crea o reemplaza su oferta |
| `cancelar_oferta(id, vendedor)` | vendedor | borra su oferta |
| `comprar(id, comprador, vendedor, cantidad, precio_max)` | comprador | compra la oferta entera, de forma atómica (ver abajo) |
| Lecturas | cualquiera | `proyecto`, `posicion`, `pendiente`, `pago(id, n)`, `oferta(id, vendedor)`, `plataforma`, `token`, `cantidad`, `ya_voto` |

### Cambios que dependen de la fecha (`revisar`)

En Stellar, un contrato no "despierta" solo cuando pasa una fecha: el cambio se aplica en la próxima transacción que toca el proyecto. Por eso, una función interna `aplicar_vencimientos` corre al principio de `votar`, `liberar`, `cobrar`, `pagar_retorno`, `comprar` y `revisar`:

1. **Abierto y venció el plazo sin llegar a la meta** → `Fallido`, y todo lo recaudado se reparte en `acumulado` (reembolso completo).
2. **Regla 2 (etapa vencida sin evidencia):** si la última etapa liberada pasó su `fecha_limite` y no tiene evidencia → `Fallido`, y lo que queda en el contrato (`recaudado − liberado`) se reparte en `acumulado`. Cada aportante lo retira con `cobrar`, sin votar.
3. **Regla 4 (incumplido):** si pasó la `fecha_limite` de alguna etapa ya liberada y `total_pagado` es menor que la suma de los `minimo_retorno` de las etapas vencidas → `incumplido = true`. Queda marcado para siempre, aunque después pague. El historial muestra cuándo se puso al día.

### Cómo se evita el doble voto

- Como hoy, `Voto(id, etapa, direccion)` impide votar dos veces la misma etapa.
- **Regla 5:** `comprar` falla si el vendedor ya votó la etapa en curso y el proyecto está `Financiado`. Así una misma participación no puede votar dos veces la misma etapa: primero con el vendedor y después con el comprador.
- El bloqueo se levanta solo cuando la etapa se resuelve: al liberarse, `hito_actual` avanza y el voto viejo ya no cuenta para la etapa nueva. Si el proyecto falla, ya no hay votación.
- Si un comprador ya había votado y compra más, las participaciones nuevas no suman a su voto (el voto quedó fijo). Es la opción conservadora.

### Cómo se evita el doble cobro

- **Etapas:** `liberar` marca la etapa como `liberado` y avanza `hito_actual` en la misma transacción. No hay forma de liberar dos veces.
- **Retornos y reembolsos:** se asienta antes de cualquier cambio de participación y `cobrar` deja `pendiente = 0` **antes** de transferir. Al vender, lo ganado hasta ese momento queda con el vendedor y el comprador arranca con `checkpoint = acumulado`. Nadie puede cobrar dos veces el mismo peso.
- **Reembolso por falla:** se reparte una sola vez, en el momento de pasar a `Fallido` (el cambio de estado ocurre una sola vez).
- **Comisión:** se calcula dentro de `liberar`, una vez por etapa.
- **Redondeo:** la división siempre redondea hacia abajo. El "polvo" que sobra queda en el contrato; nunca se reparte de más.

### Compra atómica (regla 5)

`comprar(id, comprador, vendedor, cantidad, precio_max)`, todo en una sola transacción:

1. `comprador.require_auth()`.
2. Lee la oferta. Exige `oferta.cantidad == cantidad` y `oferta.precio <= precio_max`. Esto protege al comprador si el vendedor cambia la oferta justo antes (carrera entre transacciones, security.md §7).
3. Verifica que el vendedor todavía tiene esa participación y que no está bloqueado por haber votado.
4. Asienta al vendedor y al comprador.
5. Transfiere `precio` en el token del proyecto del comprador al vendedor.
6. Mueve la participación, borra la oferta y la saca de `vendedores`.

Si cualquier paso falla, no pasa nada (la transacción entera se revierte). La compra es de la oferta completa; las compras parciales quedan para después.

### Comisión (regla 6)

En `liberar`: `comision = monto × 200 / 10_000`. Se transfiere `monto − comision` al dueño y `comision` a `Plataforma`. El retorno comprometido (`minimo_retorno`) sigue calculándose sobre el monto de la etapa: la comisión la absorbe el dueño.

### Seguridad (checklist de la skill)

- Toda función que mueve plata de alguien pide `require_auth()` de esa persona. Las funciones del dueño lo leen del proyecto guardado.
- Montos: se rechazan los negativos y los cero. Las cuentas usan `checked_*` y el release ya tiene `overflow-checks`. Con `PRECISION = 10^12`, `participacion ≤ total` acota el producto (≈ 10^28 para metas enormes), lejos del límite de `i128` (≈ 1,7 × 10^38).
- El token se fija en el constructor (no es un parámetro que cualquiera pueda cambiar).
- Las listas tienen límite: hasta 10 etapas y 20 ofertas abiertas. El historial de pagos usa una entrada por pago, sin recorrer listas.
- Errores nuevos con códigos 17 en adelante. Nunca se renumeran los que ya existen.
- Eventos para cada cambio auditable: `comision`, `pago`, `cobro`, `oferta`, `compra`, `vencido`, `incumplido`.
- Las fechas límite se guardan en el valor y se comparan con `env.ledger().timestamp()`, nunca con el TTL (security.md §8).

## Preguntas abiertas (necesitan la aprobación del usuario)

1. **Una sola fecha por etapa**, que sirve para la evidencia y para el pago. ¿O preferís dos fechas separadas?
2. **Tipo "Producto":** el mínimo comprometido son unidades, y no se paga a través del contrato. Propuesta: para este tipo, "incumplido" depende solo de la evidencia y no de pagos.
3. **Comisión descontada** del monto de la etapa (el dueño recibe el 98 %). ¿O se suma aparte?
4. **Compra de la oferta entera** (sin compras parciales) para empezar.
5. Mantener `reembolsar` como sinónimo de `cobrar`, para no romper la web.

## Consecuencias

- Cada ticket de contrato despliega un **contrato nuevo** en testnet: cambia el constructor y los datos guardados. El de `main` (v1) no se toca.
- La web (T4) tiene más trabajo: elegir el retorno, ver pagos, cobrar y comprar o vender.
- No es un contrato auditado. Antes de usar plata real hace falta una auditoría (security.md, "Audits and bounties").
