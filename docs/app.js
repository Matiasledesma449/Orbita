import { CONFIG } from "./config.js";

const S = window.StellarSdk;
const F = window.freighterApi;
const { rpc, TransactionBuilder, Contract, nativeToScVal, scValToNative, BASE_FEE, Account, Keypair } = S;

const servidor = new rpc.Server(CONFIG.rpcUrl);
const contrato = new Contract(CONFIG.contractId);
const UNIDAD = 10n ** BigInt(CONFIG.decimales);
const ERRORES = {
  1: "El proyecto no existe.", 2: "Revisá las etapas (entre 1 y 10).", 3: "El monto tiene que ser mayor a cero.",
  4: "El proyecto ya no recibe inversiones.", 5: "Se terminó el plazo para invertir.", 6: "Ese monto supera lo que le falta al proyecto.",
  7: "El proyecto todavía no juntó toda la plata.", 8: "No tenés una parte en este proyecto.",
  9: "Ya votaste esta etapa.", 10: "La etapa todavía no tiene más de la mitad de los votos a favor.",
  11: "Todavía no tenés nada para cobrar.", 12: "El plazo tiene que ser una fecha futura.",
  13: "Revisá los textos: falta el nombre o alguno es demasiado largo.", 14: "Esa etapa todavía no se le pagó al equipo.",
  15: "El equipo todavía no mostró la prueba de la etapa anterior.", 16: "La prueba de esa etapa ya estaba cargada.",
  17: "Revisá las fechas: tienen que ir en orden y después del plazo para invertir.",
  18: "Venció la fecha para mostrar la prueba de esa etapa.",
  19: "Ese pago no existe en el historial.",
  20: "Ya hay 20 partes en venta en este proyecto.", 21: "Votaste la etapa que se está decidiendo: vas a poder vender cuando se resuelva.",
  22: "Esa parte ya no está en venta.", 23: "No podés comprarte a vos mismo.", 24: "La oferta cambió: revisá la cantidad y el precio.",
};

let cuenta = null;
let proyectosCache = [];
let pedido = 0; // para descartar respuestas viejas si el usuario cambió de página
const $ = (id) => document.getElementById(id);

// ---------- utilidades ----------
const aviso = (texto, ms = 5000) => { const a = $("aviso"); a.textContent = texto; a.style.display = "block"; clearTimeout(a._t); a._t = setTimeout(() => (a.style.display = "none"), ms); };
const corto = (g) => `${g.slice(0, 4)}…${g.slice(-4)}`;
const aMoneda = (v) => {
  const n = BigInt(v); const entero = n / UNIDAD;
  const resto = (n % UNIDAD).toString().padStart(CONFIG.decimales, "0").slice(0, 2).replace(/0+$/, "");
  return `${entero.toLocaleString("es-AR")}${resto ? "," + resto : ""}`;
};
const plata = (v) => `${aMoneda(v)} ${CONFIG.moneda}`;
const fecha = (t) => new Date(Number(t) * 1000).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
const ahora = () => Math.floor(Date.now() / 1000);
const pctDe = (a, b) => Number((BigInt(a) * 100n) / BigInt(b || 1));
const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const urlSegura = (u) => (/^https?:\/\//i.test(String(u)) ? escapar(u) : "");
const traducirError = (e) => { const m = String(e?.message || e).match(/Error\(Contract, #(\d+)\)/); return m ? ERRORES[m[1]] || `Error del contrato #${m[1]}` : String(e?.message || e); };

const sv = {
  address: (a) => nativeToScVal(a, { type: "address" }),
  u32: (n) => nativeToScVal(Number(n), { type: "u32" }),
  i128: (n) => nativeToScVal(BigInt(n), { type: "i128" }),
  bool: (b) => S.xdr.ScVal.scvBool(Boolean(b)),
};
// "10,5" o "10.5" → unidades del token (7 decimales). Devuelve null si no es un número válido.
const aUnidades = (texto) => {
  const t = String(texto).trim().replace(/\./g, (m, i, str) => (str.indexOf(",") >= 0 ? "" : m)).replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const [e, d = ""] = t.split(".");
  return BigInt(e) * UNIDAD + BigInt((d + "0".repeat(CONFIG.decimales)).slice(0, CONFIG.decimales));
};

const ICONO = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  estrella: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z"/></svg>`,
  candado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  cruz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
};

// ---------- lectura del contrato ----------
// Las lecturas se simulan (no se firman ni cuestan nada).
async function leerDe(destino, metodo, ...args) {
  const origen = new Account(cuenta || Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(origen, { fee: BASE_FEE, networkPassphrase: CONFIG.networkPassphrase })
    .addOperation(destino.call(metodo, ...args)).setTimeout(60).build();
  let sim;
  for (let intento = 1; ; intento++) {
    try { sim = await servidor.simulateTransaction(tx); break; }
    catch (e) { if (intento >= 3) throw e; await new Promise((r) => setTimeout(r, 700 * intento)); } // falla de red: reintentar
  }
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}
const leer = (metodo, ...args) => leerDe(contrato, metodo, ...args);

// Cuánto cobraría ahora el usuario: se simula `cobrar` (no se firma). Incluye vencimientos
// todavía no aplicados (por ejemplo, un plazo que venció y nadie actualizó).
async function cobrable(id) {
  try { return BigInt(await leer("cobrar", sv.u32(id), sv.address(cuenta))); }
  catch (e) { if (/#(8|11)\)/.test(String(e.message))) return 0n; throw e; }
}

let tokenContrato = null;
async function miSaldo() {
  if (!tokenContrato) tokenContrato = new Contract(await leer("token"));
  return BigInt(await leerDe(tokenContrato, "balance", sv.address(cuenta)));
}

// ---------- firmar y enviar ----------
let ocupado = false;
const sesion = []; // transacciones firmadas en esta visita (se muestran en Mi panel)

function dialogo({ titulo, texto, botones, icono = "" }) {
  $("dialogoTitulo").textContent = titulo;
  $("dialogoTexto").innerHTML = texto;
  const ic = $("dialogoIcono");
  ic.hidden = !icono;
  ic.className = `icono ${icono}`;
  ic.innerHTML = icono === "ok" ? "✓" : icono === "mal" ? "!" : icono === "espera" ? `<div class="girando"></div>` : "";
  const caja = $("dialogoBotones");
  caja.innerHTML = "";
  $("dialogoFondo").hidden = false;
  return new Promise((resolver) => {
    for (const b of botones) {
      const el = document.createElement(b.href ? "a" : "button");
      el.textContent = b.texto;
      el.className = b.href ? "boton sec" : b.clase || "";
      if (b.href) { el.href = b.href; el.target = "_blank"; el.rel = "noopener"; }
      else el.onclick = () => { if (b.cierra !== false) $("dialogoFondo").hidden = true; resolver(b.valor); };
      caja.append(el);
    }
    caja.querySelector("button")?.focus();
  });
}
const cerrarDialogo = () => ($("dialogoFondo").hidden = true);

function explicarError(e) {
  const m = String(e?.message || e);
  if (/#\d+\)/.test(m)) return traducirError(e);
  if (/reject|declin|cancel/i.test(m)) return "Cancelaste la firma en Freighter. No se hizo nada.";
  if (/not found|404/i.test(m)) return "Tu cuenta todavía no tiene XLM de prueba. Abrí el menú de tu billetera (arriba a la derecha) y tocá \"Cargar XLM de prueba\".";
  if (/insufficient|balance/i.test(m)) return "No te alcanza el saldo. Recordá dejar al menos 2 XLM en tu billetera para las comisiones de la red.";
  if (/timeout|timed out|tardó/i.test(m)) return "La red tardó demasiado en responder. Revisá en Mi panel si la operación se hizo antes de intentar de nuevo.";
  return m;
}

// Explica qué va a pasar, pide la firma en Freighter, envía y confirma en palabras.
async function operar({ metodo, args, titulo, frase, boton, exito, despues }) {
  if (!cuenta) { aviso("Primero conectá tu billetera (botón de arriba a la derecha)."); return null; }
  if (ocupado) return null;
  const seguir = await dialogo({ titulo, texto: frase, botones: [
    { texto: "Cancelar", clase: "sec", valor: false },
    { texto: boton, valor: true },
  ] });
  if (!seguir) return null;
  ocupado = true;
  dialogo({ titulo: "Esperando tu firma…", icono: "espera", texto: "Se abrió Freighter: revisá y tocá <b>Aprobar</b>. Si no ves la ventana, hacé clic en el ícono de Freighter de tu navegador.", botones: [] });
  let hash = null;
  try {
    const red = await F.getNetworkDetails();
    if (red?.error) throw new Error(red.error.message || String(red.error));
    if (red.networkPassphrase !== CONFIG.networkPassphrase)
      throw new Error("Tu billetera está en otra red. Abrí Freighter, tocá el ícono del globo y elegí \"Testnet\". Después probá de nuevo.");
    const origen = await servidor.getAccount(cuenta);
    const tx = new TransactionBuilder(origen, { fee: BASE_FEE, networkPassphrase: CONFIG.networkPassphrase })
      .addOperation(contrato.call(metodo, ...args)).setTimeout(120).build();
    const preparada = await servidor.prepareTransaction(tx);
    const firma = await F.signTransaction(preparada.toXDR(), { networkPassphrase: CONFIG.networkPassphrase, address: cuenta });
    if (firma?.error) throw new Error(firma.error.message || String(firma.error));
    const firmada = TransactionBuilder.fromXDR(typeof firma === "string" ? firma : firma.signedTxXdr, CONFIG.networkPassphrase);
    dialogo({ titulo: "Enviando…", icono: "espera", texto: "La operación se está registrando en la red de Stellar. Tarda unos segundos.", botones: [] });
    const envio = await servidor.sendTransaction(firmada);
    hash = envio.hash;
    if (envio.status === "ERROR") throw new Error("La red rechazó la operación. No se movió plata.");
    const final = await servidor.pollTransaction(hash, { attempts: 40 });
    if (final.status !== "SUCCESS") throw new Error(final.status === "NOT_FOUND" ? "tardó" : "La operación falló en la red. No se movió plata.");
    const resultado = final.returnValue ? scValToNative(final.returnValue) : null;
    const texto = exito(resultado);
    const plano = document.createElement("div");
    plano.innerHTML = texto.replace(/<br\s*\/?>/g, " ");
    const quePaso = plano.textContent.split(/(?<=\.)\s/)[0];
    sesion.unshift({ metodo, titulo: escapar(quePaso), hash, cuando: new Date() });
    await dialogo({ titulo: "¡Listo!", icono: "ok", texto, botones: [
      { texto: "Ver comprobante ↗", href: `${CONFIG.explorer}/tx/${hash}` },
      { texto: "Cerrar", valor: true },
    ] });
    if (despues) despues(resultado); else irA(); // vuelve a leer todo del contrato
    return resultado;
  } catch (e) {
    console.error(e);
    const botones = [{ texto: "Entendido", valor: false }];
    if (hash) botones.unshift({ texto: "Ver comprobante ↗", href: `${CONFIG.explorer}/tx/${hash}` });
    await dialogo({ titulo: "No se pudo completar", icono: "mal", texto: escapar(explicarError(e)), botones });
    return null;
  } finally {
    ocupado = false;
  }
}

async function cargarTodos() {
  const total = Number(await leer("cantidad"));
  const ids = [...Array(total).keys()];
  proyectosCache = await Promise.all(ids.map(async (id) => ({ id, ...(await leer("proyecto", sv.u32(id))) })));
  return proyectosCache;
}

// ---------- textos en palabras ----------
const TIPOS = {
  0: { nombre: "Préstamo con interés", explica: "El equipo te devuelve lo que invertiste más un extra." },
  1: { nombre: "Parte de las ventas", explica: "El equipo reparte entre los inversores un porcentaje de lo que vende." },
  2: { nombre: "Parte de las ganancias", explica: "El equipo reparte entre los inversores una parte de lo que gana." },
  3: { nombre: "Producto", explica: "El equipo te paga con lo que produce." },
};
const esProducto = (p) => Number(p.tipo_retorno) === 3;
const sumaMinimos = (p) => p.hitos.reduce((s, h) => s + BigInt(h.minimo_retorno), 0n);

function estadoTexto(p) {
  const e = Number(p.estado); const n = p.hitos.length;
  if (e === 0) return "Juntando plata";
  if (e === 1) return `En marcha: etapa ${Math.min(Number(p.hito_actual) + 1, n)} de ${n}`;
  if (e === 2) return "Terminado";
  return "No cumplió: podés recuperar tu plata";
}
const chips = (p) => `<div class="chips"><span class="estado e${Number(p.estado)}">${estadoTexto(p)}</span>${p.incumplido ? `<span class="estado incumplido">Incumplido</span>` : ""}</div>`;

// ---------- páginas ----------
const PAGINAS = ["inicio", "como-funciona", "proyectos", "proyecto", "publicar", "panel", "preguntas"];

function irA() {
  const [pagina, param] = (location.hash.slice(1) || "inicio").split("/");
  const actual = PAGINAS.includes(pagina) ? pagina : "inicio";
  document.querySelectorAll(".pagina").forEach((s) => (s.hidden = s.dataset.pagina !== actual));
  const enMenu = actual === "proyecto" ? "proyectos" : actual;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === "#" + enMenu));
  cerrarMenu();
  window.scrollTo({ top: 0 });
  if (actual === "inicio") mostrarNumeros();
  if (actual === "proyectos") mostrarProyectos();
  if (actual === "proyecto") mostrarFicha(Number(param));
  if (actual === "publicar") mostrarPublicar();
  if (actual === "panel") mostrarPanel();
}

// ---------- inicio: números generales ----------
const esPrueba = (p) => (CONFIG.pruebas || []).includes(p.id);

async function mostrarNumeros() {
  try {
    const lista = (await cargarTodos()).filter((p) => !esPrueba(p));
    const suma = (campo) => lista.reduce((s, p) => s + BigInt(p[campo]), 0n);
    const valores = [String(lista.length), plata(suma("recaudado")), plata(suma("liberado")), plata(suma("total_pagado"))];
    document.querySelectorAll("#numeros .numero b").forEach((b, i) => (b.textContent = valores[i]));
  } catch (e) {
    console.error(e);
    document.querySelectorAll("#numeros .numero b").forEach((b) => (b.textContent = "—"));
  }
}

// ---------- proyectos ----------
async function mostrarProyectos() {
  const caja = $("proyectos");
  try {
    const todos = (await cargarTodos()).slice().reverse();
    const reales = todos.filter((p) => !esPrueba(p));
    const pruebas = todos.filter(esPrueba);
    caja.innerHTML = reales.length ? reales.map(tarjeta).join("") : `<div class="vacio">Todavía no hay proyectos. ¡Publicá el primero!</div>`;
    $("pruebasCantidad").textContent = pruebas.length;
    $("pruebasLista").innerHTML = pruebas.map(tarjeta).join("");
    $("pruebasSistema").hidden = !pruebas.length;
  } catch (e) {
    console.error(e);
    caja.innerHTML = `<div class="vacio">No pudimos leer los proyectos: ${escapar(traducirError(e))}</div>`;
  }
}

function tarjeta(p) {
  const pct = pctDe(p.recaudado, p.meta);
  const img = urlSegura(p.imagen);
  return `<article class="tarjeta proyecto">
    ${img ? `<img class="foto" src="${img}" alt="" loading="lazy">` : `<div class="foto"></div>`}
    <div class="cuerpo">
      ${chips(p)}
      <h3>${escapar(p.titulo)}</h3>
      <p class="nota">${escapar(TIPOS[Number(p.tipo_retorno)].nombre)}</p>
      <div class="barra" aria-hidden="true"><i style="width:${Math.min(pct, 100)}%"></i></div>
      <div class="linea"><span>${plata(p.recaudado)} de ${plata(p.meta)}</span><span>${pct}%</span></div>
      <a class="boton" href="#proyecto/${p.id}">Ver proyecto</a>
    </div>
  </article>`;
}

// ---------- ficha del proyecto (solo lectura) ----------
async function mostrarFicha(id) {
  const caja = $("ficha");
  const mio = ++pedido;
  caja.innerHTML = `<div class="vacio">Cargando el proyecto…</div>`;
  try {
    const p = { id, ...(await leer("proyecto", sv.u32(id))) };
    const [prometido, pagos, ofertas] = await Promise.all([
      leer("prometido", sv.u32(id)),
      Promise.all([...Array(Number(p.cantidad_pagos)).keys()].map((n) => leer("pago", sv.u32(id), sv.u32(n)))),
      Promise.all(p.vendedores.map(async (v) => ({ vendedor: v, ...(await leer("oferta", sv.u32(id), sv.address(v))) }))),
    ]);
    const yo = cuenta ? await datosMios(id, p) : null;
    if (mio !== pedido) return; // el usuario ya pidió otra cosa
    contextos.set(id, { p, yo, prometido: BigInt(prometido), ofertas });
    caja.innerHTML = `<div class="ficha" data-proyecto="${id}">
      ${bloqueQueEs(p)}
      ${bloqueActualizar(p, BigInt(prometido))}
      ${bloqueDueno(p, yo, BigInt(prometido))}
      ${bloqueTuInversion(p, yo)}
      ${bloqueInvertir(p, yo)}
      ${bloqueEtapas(p)}
      ${bloqueVotacion(p, yo)}
      ${bloquePagos(p, prometido, pagos)}
      ${bloqueVentas(p, ofertas)}
      <div class="tarjeta bloque">
        <h3>Ver en la blockchain</h3>
        <p class="nota">Todo lo de este proyecto queda registrado en Stellar y cualquiera lo puede revisar.</p>
        <a class="boton sec" href="${CONFIG.explorer}/contract/${CONFIG.contractId}" target="_blank" rel="noopener">Ver en la blockchain ↗</a>
      </div>
    </div>`;
  } catch (e) {
    console.error(e);
    if (mio !== pedido) return;
    caja.innerHTML = `<div class="vacio">No pudimos leer este proyecto: ${escapar(traducirError(e))}</div>`;
  }
}

// Datos del proyecto en pantalla (ficha o panel), para que los botones sepan sobre qué actuar.
const contextos = new Map();
const campo = (raiz, nombre) => raiz.querySelector(`[data-campo="${nombre}"]`);

async function datosMios(id, p) {
  const miOferta = p && p.vendedores.includes(cuenta) ? leer("oferta", sv.u32(id), sv.address(cuenta)) : null;
  const [pos, voto, cobro, saldo, oferta] = await Promise.all([
    leer("posicion", sv.u32(id), sv.address(cuenta)),
    leer("ya_voto", sv.u32(id), sv.address(cuenta)),
    cobrable(id),
    miSaldo().catch(() => null), // cuenta sin fondos todavía
    miOferta,
  ]);
  return { parte: BigInt(pos.participacion), yaVoto: voto, cobro, saldo, oferta };
}

function bloqueTuInversion(p, yo) {
  if (!cuenta) return `<div class="tarjeta bloque"><h3>Tu inversión</h3><p class="nota">Conectá tu billetera (arriba a la derecha) para ver tu parte, votar y cobrar.</p></div>`;
  if (yo.parte === 0n && yo.cobro === 0n) return "";
  const pct = pctDe(yo.parte, p.recaudado);
  const origen = Number(p.estado) === 3 || (Number(p.estado) === 0 && ahora() > Number(p.plazo))
    ? "Es lo que te corresponde de la plata que quedó guardada (y lo que haya devuelto el equipo)."
    : "Es tu parte de lo que devolvió el equipo.";
  return `<div class="tarjeta bloque mio">
    <h3>Tu inversión</h3>
    <div class="datos">
      <div class="dato"><span>Tu parte</span><b>${plata(yo.parte)}</b></div>
      <div class="dato"><span>Cuánto pesa tu voto</span><b>${pct}%</b></div>
      <div class="dato"><span>Para cobrar ahora</span><b>${plata(yo.cobro)}</b></div>
    </div>
    ${yo.cobro > 0n
      ? `<p>${origen}</p><button data-accion="cobrar">Cobrar ${plata(yo.cobro)}</button>`
      : `<p class="nota">Por ahora no tenés nada para cobrar. Cuando el equipo devuelva plata, va a aparecer acá.</p>`}
    ${bloqueVender(p, yo)}
  </div>`;
}

function bloqueVender(p, yo) {
  if (yo.parte === 0n) return "";
  if (yo.oferta) {
    return `<div class="tarea"><h4>Tu parte está en venta</h4>
      <p>Ofreciste una parte de <b>${plata(yo.oferta.cantidad)}</b> a <b>${plata(yo.oferta.precio)}</b>. Cuando alguien la compre, te llega la plata.</p>
      <button class="sec" data-accion="cancelar-venta">Cancelar la venta</button></div>`;
  }
  if (Number(p.estado) === 1 && yo.yaVoto) {
    return `<p class="nota">Votaste la etapa que se está decidiendo: vas a poder vender tu parte cuando se resuelva.</p>`;
  }
  return `<details class="tarea"><summary style="font-size:19px">Vender mi parte</summary>
    <p class="nota">Ponés en venta tu parte (o un pedazo) al precio que quieras. Quien la compre cobra desde ese momento lo que el equipo devuelva por esa parte. Lo que ganaste hasta la venta sigue siendo tuyo.</p>
    <div class="dos" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
      <label class="campo">¿Cuánto de tu parte? (de ${plata(yo.parte)}) <input data-campo="ventaCantidad" inputmode="decimal" value="${aMoneda(yo.parte).replace(/\./g, "")}"></label>
      <label class="campo">¿A qué precio? (${CONFIG.moneda}) <input data-campo="ventaPrecio" inputmode="decimal" placeholder="Ej: ${aMoneda(yo.parte).replace(/\./g, "")}"></label>
    </div>
    <button data-accion="vender">Poner en venta</button></details>`;
}

// ---------- vencimientos que el contrato todavía no registró ----------
// En Stellar un contrato no "despierta" solo: si venció una fecha, alguien tiene que
// llamar a `revisar` para que quede registrado. Esto detecta ese caso para mostrar
// el botón "Actualizar estado". Devuelve el motivo en palabras, o "".
function vencimientoPendiente(p, prometido) {
  const t = ahora(); const e = Number(p.estado); const n = Number(p.hito_actual);
  if (e === 0 && t > Number(p.plazo)) return `Se terminó el plazo para invertir (${fecha(p.plazo)}) sin juntar toda la plata.`;
  if (e === 1 && n > 0) {
    const h = p.hitos[n - 1];
    if (!h.evidencia && t > Number(h.fecha_limite)) return `El equipo no mostró la prueba de la etapa ${n} antes del ${fecha(h.fecha_limite)}.`;
  }
  if (!p.incumplido) {
    if (esProducto(p)) {
      const i = p.hitos.findIndex((h) => h.liberado && !h.evidencia && t > Number(h.fecha_limite));
      if (i >= 0) return `El equipo no mostró la prueba de la etapa ${i + 1} a tiempo.`;
    } else if (t > Number(p.fecha_devolucion) && BigInt(p.total_pagado) < BigInt(prometido)) {
      return `Pasó la fecha de devolución (${fecha(p.fecha_devolucion)}) y el equipo no devolvió todo lo prometido.`;
    }
  }
  return "";
}

function bloqueActualizar(p, prometido) {
  const motivo = vencimientoPendiente(p, prometido);
  if (!motivo) return "";
  return `<div class="tarjeta bloque" style="border-color:var(--naranja)">
    <h3>⏰ Hay que actualizar el estado</h3>
    <p>${motivo}</p>
    <p class="nota">La blockchain todavía no lo registró. Cualquier persona puede actualizarlo: no mueve plata, solo deja registrado lo que pasó${cuenta ? "" : " (necesitás tu billetera conectada)"}.</p>
    ${cuenta ? `<button data-accion="actualizar">Actualizar estado</button>` : `<button data-accion="conectar">Conectar billetera</button>`}
  </div>`;
}

// ---------- tareas del dueño ----------
function cuentaRegresiva(t) {
  const resta = Number(t) - ahora();
  if (resta < 0) return `<span class="cuenta-regresiva urgente">Venció el ${fecha(t)}</span>`;
  const dias = Math.floor(resta / DIA);
  const texto = dias >= 2 ? `Te quedan ${dias} días` : dias === 1 ? "Te queda 1 día" : `Te quedan ${Math.max(1, Math.floor(resta / 3600))} horas`;
  return `<span class="cuenta-regresiva ${dias < 3 ? "urgente" : ""}">⏳ ${texto} (hasta el ${fecha(t)})</span>`;
}

function bloqueDueno(p, yo, prometido) {
  if (!cuenta || p.dueno !== cuenta) return "";
  const e = Number(p.estado); const n = Number(p.hito_actual);
  const tareas = [];
  if (e === 0) {
    tareas.push(`<div class="tarea"><h4>Tu proyecto está juntando plata</h4>
      <p>Lleva <b>${plata(p.recaudado)}</b> de <b>${plata(p.meta)}</b>. Se puede invertir hasta el ${fecha(p.plazo)}.</p>
      <p class="nota">Compartí este link: <b>${escapar(location.origin + location.pathname)}#proyecto/${p.id}</b></p></div>`);
  }
  // Subir la prueba de las etapas cobradas que todavía no la tienen.
  p.hitos.forEach((h, i) => {
    if (!h.liberado || h.evidencia) return;
    const vencida = ahora() > Number(h.fecha_limite);
    tareas.push(vencida
      ? `<div class="tarea"><h4>Etapa ${i + 1}: la prueba no se subió a tiempo</h4><p>Venció el ${fecha(h.fecha_limite)}. El proyecto se corta y los inversores pueden recuperar lo que quedaba.</p></div>`
      : `<div class="tarea"><h4>Subí la prueba de la etapa ${i + 1}</h4>
        <p>«${escapar(h.descripcion)}». ${cuentaRegresiva(h.fecha_limite)}</p>
        <p class="nota">Pegá el link a la demo (un video o la app funcionando) o a tu repositorio de GitHub. Queda guardado para siempre y no se puede cambiar.${i + 1 < p.hitos.length ? " Hasta que la subas, los inversores no pueden votar la etapa siguiente." : ""}</p>
        <div class="fila-accion"><input data-campo="evidencia-${i}" placeholder="https://github.com/tu-usuario/tu-proyecto" autocomplete="off"><button data-accion="evidencia" data-hito="${i}">Subir la prueba</button></div></div>`);
  });
  // Cobrar la etapa en votación.
  if (e === 1) {
    const h = p.hitos[n];
    const faltaPrueba = n > 0 && !p.hitos[n - 1].evidencia;
    const si = pctDe(h.a_favor, p.recaudado);
    if (!faltaPrueba) {
      tareas.push(BigInt(h.a_favor) * 2n > BigInt(p.recaudado)
        ? `<div class="tarea"><h4>¡Los inversores aprobaron la etapa ${n + 1}!</h4><p>«${escapar(h.descripcion)}»: ${si}% votó que sí. Ya podés cobrarla.</p><button data-accion="liberar">Cobrar la etapa ${n + 1} (${plata(h.monto)})</button></div>`
        : `<div class="tarea"><h4>Etapa ${n + 1}: esperando votos</h4><p>Por ahora ${si}% votó que sí. Necesitás <b>más de la mitad</b> para cobrar. Contales a tus inversores qué van a hacer en esta etapa.</p></div>`);
    }
  }
  // Devolver plata.
  if (BigInt(p.liberado) > 0n) {
    const pagado = BigInt(p.total_pagado);
    const falta = prometido > pagado ? prometido - pagado : 0n;
    const producto = esProducto(p);
    tareas.push(`<div class="tarea"><h4>Devolver plata a los inversores</h4>
      ${producto
        ? `<p class="nota">En este proyecto devolvés con producto, fuera de Órbita. Si además querés devolver plata, podés hacerlo acá.</p>`
        : `<p>Prometiste devolver <b>${plata(prometido)}</b> por las etapas cobradas. Ya devolviste <b>${plata(pagado)}</b>${falta > 0n ? `: te falta <b>${plata(falta)}</b>` : " ✓"}.</p>
           <p>${falta > 0n ? cuentaRegresiva(p.fecha_devolucion) : `<span class="listo">✓ Ya cumpliste con lo prometido.</span> Si querés, podés devolver más.`}</p>`}
      <div class="fila-accion"><input data-campo="montoDevolver" inputmode="decimal" autocomplete="off" placeholder="Ej: 25" value="${falta > 0n ? aMoneda(falta).replace(/\./g, "") : ""}"><button data-accion="devolver">Devolver plata</button></div>
      <p class="chico">El contrato lo reparte solo entre los inversores, según la parte de cada uno.${yo.saldo !== null ? ` Tenés ${plata(yo.saldo)} en tu billetera.` : ""}</p></div>`);
  }
  if (!tareas.length) tareas.push(`<p class="nota">No tenés nada pendiente en este proyecto.</p>`);
  return `<div class="tarjeta bloque dueno"><h3>Sos el dueño de este proyecto</h3>${tareas.join("")}</div>`;
}

function bloqueQueEs(p) {
  const tipo = TIPOS[Number(p.tipo_retorno)];
  const total = sumaMinimos(p);
  const img = urlSegura(p.imagen);
  let promesa;
  if (esProducto(p)) {
    promesa = `El equipo se compromete a entregar al menos <b>${total.toLocaleString("es-AR")} unidades</b> en total, repartidas entre los inversores según la parte de cada uno.`;
  } else {
    const por100 = (total * 100n) / BigInt(p.meta);
    promesa = Number(p.tipo_retorno) === 0
      ? `Por cada <b>100 ${CONFIG.moneda}</b> que invertís, el equipo se compromete a devolverte al menos <b>${por100.toLocaleString("es-AR")} ${CONFIG.moneda}</b>, antes del <b>${fecha(p.fecha_devolucion)}</b>.`
      : `Por cada <b>100 ${CONFIG.moneda}</b> que invertís, el equipo se compromete a pagarte al menos <b>${por100.toLocaleString("es-AR")} ${CONFIG.moneda}</b> de su ${Number(p.tipo_retorno) === 1 ? "venta" : "ganancia"}, antes del <b>${fecha(p.fecha_devolucion)}</b>. Esto no es la devolución de lo que invertiste: es tu parte del negocio.`;
  }
  return `<div class="tarjeta">
    <div class="ficha-cabecera">
      ${img ? `<img src="${img}" alt="">` : ""}
      <div style="display:grid;gap:14px">
        ${chips(p)}
        <h2>${escapar(p.titulo)}</h2>
        ${p.descripcion ? `<p class="nota" style="font-size:20px">${escapar(p.descripcion)}</p>` : ""}
        <p class="chico">Publicado por la cuenta ${corto(p.dueno)}</p>
      </div>
    </div>
    <h3>Qué ganás</h3>
    <p><b>${tipo.nombre}.</b> ${tipo.explica}</p>
    <div class="destacado">${promesa}</div>
    <div>
      <p class="chico" style="margin-bottom:6px">Condiciones escritas por el equipo:</p>
      <div class="condiciones">${escapar(p.condiciones)}</div>
    </div>
  </div>`;
}

function bloqueInvertir(p, yo) {
  const pct = pctDe(p.recaudado, p.meta);
  const falta = BigInt(p.meta) - BigInt(p.recaudado);
  const abierto = Number(p.estado) === 0 && ahora() <= Number(p.plazo);
  return `<div class="tarjeta bloque">
    <h3>Invertir</h3>
    <div class="barra" aria-hidden="true"><i style="width:${Math.min(pct, 100)}%"></i></div>
    <div class="datos">
      <div class="dato"><span>Ya se juntó</span><b>${plata(p.recaudado)}</b></div>
      <div class="dato"><span>Necesita en total</span><b>${plata(p.meta)}</b></div>
      <div class="dato"><span>${abierto ? "Falta" : "Avance"}</span><b>${abierto ? plata(falta) : pct + "%"}</b></div>
      <div class="dato"><span>Se puede invertir hasta el</span><b>${fecha(p.plazo)}</b></div>
    </div>
    ${formInvertir(p, yo, abierto, falta)}
  </div>`;
}

function formInvertir(p, yo, abierto, falta) {
  if (!abierto) {
    return Number(p.estado) === 0
      ? `<p class="nota">Se terminó el plazo sin juntar toda la plata. Si invertiste, podés recuperar tu plata desde "Tu inversión".</p>`
      : `<p class="nota">Este proyecto ya no recibe inversiones.</p>`;
  }
  if (!cuenta) return `<p class="nota">Para invertir, conectá tu billetera.</p><button data-accion="conectar">Conectar billetera para invertir</button>`;
  const atajos = [10n, 50n, 100n].map((n) => n * UNIDAD).filter((m) => m < falta);
  return `<label>¿Cuánto querés invertir? (en ${CONFIG.moneda})</label>
    <div class="atajos">${atajos.map((m) => `<button class="sec" data-monto="${aMoneda(m).replace(/\./g, "")}">${plata(m)}</button>`).join("")}
      <button class="sec" data-monto="${aMoneda(falta).replace(/\./g, "")}">Todo lo que falta (${plata(falta)})</button></div>
    <div class="fila-accion">
      <input data-campo="montoInvertir" inputmode="decimal" autocomplete="off" placeholder="Ej: 25">
      <button data-accion="invertir">Invertir</button>
    </div>
    <p class="chico">${yo.saldo !== null ? `Tenés ${plata(yo.saldo)} en tu billetera. ` : ""}Dejá al menos 2 ${CONFIG.moneda} para las comisiones de la red.</p>`;
}

function estadoEtapa(p, h, i) {
  const e = Number(p.estado); const actual = Number(p.hito_actual);
  const vencida = ahora() > Number(h.fecha_limite);
  if (h.liberado) {
    if (h.evidencia) return { clase: "hecho", icono: ICONO.check, texto: `Se le pagó al equipo. Mostró la prueba: <a href="${urlSegura(h.evidencia)}" target="_blank" rel="noopener">Ver la prueba ↗</a>` };
    if (vencida) return { clase: "mal", icono: ICONO.cruz, texto: `Se le pagó al equipo, pero <b>no mostró la prueba a tiempo</b> (vencía el ${fecha(h.fecha_limite)}).` };
    return { clase: "hecho", icono: ICONO.check, texto: `Se le pagó al equipo. Tiene hasta el <b>${fecha(h.fecha_limite)}</b> para mostrar la prueba de lo que hizo.` };
  }
  if (e === 3) return { clase: "bloqueado", icono: ICONO.cruz, texto: "No se pagó: el proyecto se cortó." };
  if (e === 1 && i === actual) return { clase: "actual", icono: ICONO.estrella, texto: "Ahora se está votando si se le paga al equipo." };
  if (e === 0 && i === 0) return { clase: "actual", icono: "1", texto: "Se vota cuando el proyecto junte toda la plata." };
  return { clase: "bloqueado", icono: ICONO.candado, texto: "Todavía no empezó." };
}

function bloqueEtapas(p) {
  return `<div class="tarjeta bloque">
    <h3>Las etapas</h3>
    <p class="nota">La plata se le paga al equipo antes de cada etapa, si los inversores votan que sí. Después el equipo tiene que mostrar la prueba de lo que hizo antes de la fecha.</p>
    <ol class="etapas">${p.hitos.map((h, i) => {
      const est = estadoEtapa(p, h, i);
      const promete = esProducto(p) ? `${BigInt(h.minimo_retorno).toLocaleString("es-AR")} unidades` : plata(h.minimo_retorno);
      return `<li class="${est.clase}"><span class="marcador">${est.icono}</span>
        <div class="caja-etapa">
          <span class="tit">Etapa ${i + 1}: ${escapar(h.descripcion)}</span>
          <span>Se le paga al equipo: <b>${plata(h.monto)}</b> · Promete devolver: <b>${promete}</b></span>
          <span class="chico">Prueba hasta el ${fecha(h.fecha_limite)}</span>
          <span>${est.texto}</span>
        </div></li>`;
    }).join("")}</ol>
  </div>`;
}

function bloqueVotacion(p, yo) {
  const e = Number(p.estado); const n = Number(p.hito_actual);
  let cuerpo;
  if (e === 1) {
    const h = p.hitos[n];
    const si = pctDe(h.a_favor, p.recaudado); const no = pctDe(h.en_contra, p.recaudado);
    const faltaPrueba = n > 0 && !p.hitos[n - 1].evidencia;
    cuerpo = `<p class="pregunta">¿Le pagamos al equipo la etapa ${n + 1}?</p>
      <p>"${escapar(h.descripcion)}": <b>${plata(h.monto)}</b>.</p>
      ${faltaPrueba ? `<div class="destacado">Primero el equipo tiene que mostrar la prueba de la etapa ${n}. Recién ahí se puede votar.</div>` : ""}
      <div class="medidor">
        <div class="fila"><span>Sí</span><div class="barra"><i class="si" style="width:${si}%"></i></div><b>${si}%</b></div>
        <div class="fila"><span>No</span><div class="barra"><i class="no" style="width:${no}%"></i></div><b>${no}%</b></div>
      </div>
      <p class="nota">Cada inversor vota con el peso de su parte. Con <b>más de la mitad por el Sí</b>, el equipo cobra la etapa. Con más de la mitad por el No, el proyecto se corta y cada uno recupera su parte de lo que queda.</p>
      ${botonesVoto(p, yo, faltaPrueba)}`;
  } else if (e === 0) {
    cuerpo = `<p class="nota">La votación empieza cuando el proyecto junte toda la plata.</p>`;
  } else if (e === 2) {
    cuerpo = `<p class="nota">Ya se votaron y pagaron todas las etapas.</p>`;
  } else {
    cuerpo = `<p class="nota">El proyecto se cortó: ya no hay votaciones. Cada inversor puede recuperar su parte de lo que quedaba.</p>`;
  }
  return `<div class="tarjeta bloque"><h3>Votación</h3>${cuerpo}</div>`;
}

function botonesVoto(p, yo, faltaPrueba) {
  if (!cuenta) return `<p class="nota">Si invertiste en este proyecto, conectá tu billetera para votar.</p>`;
  if (yo.parte === 0n) return `<p class="nota">Votan solo las personas que invirtieron en este proyecto.</p>`;
  if (yo.yaVoto) return `<p class="listo">✓ Ya votaste esta etapa. Tu voto ya está contado.</p>`;
  if (faltaPrueba) return "";
  return `<div class="botones-voto">
    <button class="si" data-accion="votar-si">Sí, pagarle la etapa al equipo</button>
    <button class="peligro" data-accion="votar-no">No, cortar el proyecto</button>
  </div>
  <p class="chico">Tu voto pesa ${pctDe(yo.parte, p.recaudado)}%. Después de votar no vas a poder vender tu parte hasta que esta etapa se resuelva.</p>`;
}

// ---------- acciones de la ficha ----------
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-accion], [data-monto]");
  const raiz = b?.closest("[data-proyecto]");
  if (!b || !raiz) return;
  const ctx = contextos.get(Number(raiz.dataset.proyecto));
  if (!ctx) return;
  const { p, yo } = ctx;
  if (b.dataset.monto) { campo(raiz, "montoInvertir").value = b.dataset.monto; campo(raiz, "montoInvertir").focus(); return; }
  const accion = b.dataset.accion;
  const titulo = `«${escapar(p.titulo)}»`;
  if (accion === "conectar") return conectar();

  if (accion === "invertir") {
    const monto = aUnidades(campo(raiz, "montoInvertir").value);
    const falta = BigInt(p.meta) - BigInt(p.recaudado);
    if (!monto || monto <= 0n) return aviso("Escribí cuánto querés invertir, por ejemplo 25.");
    if (monto > falta) return aviso(`Al proyecto le faltan ${plata(falta)}: no podés invertir más que eso.`);
    if (yo.saldo !== null && monto + 2n * UNIDAD > yo.saldo) return aviso(`No te alcanza: tenés ${plata(yo.saldo)} y tenés que dejar al menos 2 ${CONFIG.moneda} para comisiones.`);
    return operar({
      metodo: "aportar", args: [sv.u32(p.id), sv.address(cuenta), sv.i128(monto)],
      titulo: "Confirmá tu inversión", boton: `Sí, invertir ${plata(monto)}`,
      frase: `Vas a invertir <b>${plata(monto)}</b> en ${titulo}.<br><br>La plata queda guardada en el contrato (el equipo todavía no la recibe) y vos recibís una parte del proyecto. Si el proyecto no junta toda la plata antes del <b>${fecha(p.plazo)}</b>, la podés recuperar.<br><br>Freighter te va a pedir que confirmes.`,
      exito: (parte) => `Invertiste <b>${plata(monto)}</b> en ${titulo}.<br>Ahora tu parte del proyecto es de <b>${plata(parte)}</b>.`,
    });
  }

  if (accion === "votar-si" || accion === "votar-no") {
    const n = Number(p.hito_actual); const h = p.hitos[n]; const si = accion === "votar-si";
    const fondo = BigInt(p.recaudado) - BigInt(p.liberado);
    return operar({
      metodo: "votar", args: [sv.u32(p.id), sv.address(cuenta), sv.bool(si)],
      titulo: si ? "Confirmá tu voto: SÍ" : "Confirmá tu voto: NO", boton: si ? "Sí, votar SÍ" : "Sí, votar NO",
      frase: si
        ? `Vas a votar <b>SÍ</b>: estás de acuerdo en que se le pague al equipo la etapa ${n + 1} («${escapar(h.descripcion)}», <b>${plata(h.monto)}</b>).<br><br>Tu voto pesa <b>${pctDe(yo.parte, p.recaudado)}%</b>. Cuando el Sí supere la mitad, el equipo podrá cobrar la etapa. Hasta que la etapa se resuelva no vas a poder vender tu parte.`
        : `Vas a votar <b>NO</b> a pagarle al equipo la etapa ${n + 1}.<br><br>Tu voto pesa <b>${pctDe(yo.parte, p.recaudado)}%</b>. Si el No supera la mitad, el proyecto se corta y cada inversor recupera su parte de lo que todavía no se pagó (hoy, <b>${plata(fondo)}</b> en total). Hasta que la etapa se resuelva no vas a poder vender tu parte.`,
      exito: (estado) => Number(estado) === 3
        ? `Votaste <b>NO</b>. Con tu voto, más de la mitad dijo que no: <b>el proyecto se cortó</b>. Ya podés recuperar tu parte desde "Tu inversión".`
        : `Votaste <b>${si ? "SÍ" : "NO"}</b> en la etapa ${n + 1}. Tu voto ya está contado.`,
    });
  }

  if (accion === "liberar") {
    const n = Number(p.hito_actual); const h = p.hitos[n];
    const comision = (BigInt(h.monto) * 200n) / 10000n; const neto = BigInt(h.monto) - comision;
    return operar({
      metodo: "liberar", args: [sv.u32(p.id)],
      titulo: `Cobrar la etapa ${n + 1}`, boton: `Sí, cobrar ${plata(neto)}`,
      frase: `Vas a cobrar la etapa ${n + 1} («${escapar(h.descripcion)}»): <b>${plata(h.monto)}</b>. Órbita se queda con el 2 % (<b>${plata(comision)}</b>) y a tu billetera llegan <b>${plata(neto)}</b>.<br><br>Después tenés hasta el <b>${fecha(h.fecha_limite)}</b> para subir la prueba de lo que hicieron (una demo o el link a GitHub). Si no la subís a tiempo, el proyecto se corta y los inversores recuperan lo que queda.`,
      exito: (recibido) => `Cobraste la etapa ${n + 1}: llegaron <b>${plata(recibido)}</b> a tu billetera.<br><br>Acordate de subir la prueba antes del <b>${fecha(h.fecha_limite)}</b>.`,
    });
  }

  if (accion === "evidencia") {
    const i = Number(b.dataset.hito); const h = p.hitos[i];
    const url = campo(raiz, `evidencia-${i}`).value.trim();
    if (!/^https?:\/\/\S+\.\S+/i.test(url)) return aviso("Pegá un link completo, que empiece con https:// (por ejemplo, el de tu repositorio de GitHub).");
    if (bytes(url) > 300) return aviso("El link es muy largo (máximo 300 caracteres).");
    return operar({
      metodo: "cargar_evidencia", args: [sv.u32(p.id), sv.u32(i), S.nativeToScVal(url, { type: "string" })],
      titulo: `Subir la prueba de la etapa ${i + 1}`, boton: "Sí, subir la prueba",
      frase: `Vas a subir este link como prueba de la etapa ${i + 1}:<br><b style="overflow-wrap:anywhere">${escapar(url)}</b><br><br>Queda guardado para siempre en la blockchain y <b>no se puede cambiar</b>. Revisá que sea el correcto.`,
      exito: () => `Subiste la prueba de la etapa ${i + 1}. Los inversores ya la pueden ver${i + 1 < p.hitos.length ? " y votar la etapa siguiente" : ""}.`,
    });
  }

  if (accion === "devolver") {
    const monto = aUnidades(campo(raiz, "montoDevolver").value);
    if (!monto || monto <= 0n) return aviso("Escribí cuánto querés devolver, por ejemplo 25.");
    if (yo.saldo !== null && monto + 2n * UNIDAD > yo.saldo) return aviso(`No te alcanza: tenés ${plata(yo.saldo)} y tenés que dejar al menos 2 ${CONFIG.moneda} para comisiones.`);
    const prometido = ctx.prometido; const pagado = BigInt(p.total_pagado);
    const tarde = ahora() > Number(p.fecha_devolucion) && pagado < prometido && !p.incumplido && !esProducto(p);
    return operar({
      metodo: "pagar_retorno", args: [sv.u32(p.id), sv.address(cuenta), sv.i128(monto)],
      titulo: "Devolver plata", boton: `Sí, devolver ${plata(monto)}`,
      frase: `Vas a devolver <b>${plata(monto)}</b> a los inversores de ${titulo}.<br><br>El contrato lo reparte solo entre los inversores, según la parte de cada uno, y queda en el historial público.${tarde ? "<br><br><b>Ojo:</b> ya pasó la fecha de devolución, así que el proyecto va a quedar marcado como \"Incumplido\" aunque pagues ahora." : ""}`,
      exito: (total) => {
        const queda = prometido > BigInt(total) ? prometido - BigInt(total) : 0n;
        return `Devolviste <b>${plata(monto)}</b>. En total ya devolviste <b>${plata(total)}</b>${esProducto(p) ? "." : queda > 0n ? `; te falta <b>${plata(queda)}</b>.` : ". ¡Cumpliste con todo lo prometido!"}`;
      },
    });
  }

  if (accion === "actualizar") {
    const motivo = vencimientoPendiente(p, ctx.prometido);
    return operar({
      metodo: "revisar", args: [sv.u32(p.id)],
      titulo: "Actualizar el estado", boton: "Sí, actualizar",
      frase: `Vas a registrar en la blockchain lo que pasó con ${titulo}:<br><b>${motivo}</b><br><br>No mueve plata. Después, si te corresponde, vas a poder recuperar o cobrar tu parte.`,
      exito: (estado) => {
        const q = { ...p, estado };
        return `Listo: el estado de ${titulo} quedó actualizado. Ahora dice: <b>${estadoTexto(q)}</b>.`;
      },
    });
  }

  if (accion === "vender") {
    const cantidad = aUnidades(campo(raiz, "ventaCantidad").value);
    const precio = aUnidades(campo(raiz, "ventaPrecio").value);
    if (!cantidad || cantidad <= 0n) return aviso("Escribí cuánto de tu parte querés vender.");
    if (cantidad > yo.parte) return aviso(`Tu parte es de ${plata(yo.parte)}: no podés vender más que eso.`);
    if (!precio || precio <= 0n) return aviso("Escribí a qué precio la vendés, por ejemplo 25.");
    return operar({
      metodo: "ofrecer_venta", args: [sv.u32(p.id), sv.address(cuenta), sv.i128(cantidad), sv.i128(precio)],
      titulo: "Poner tu parte en venta", boton: "Sí, poner en venta",
      frase: `Vas a poner en venta una parte de <b>${plata(cantidad)}</b> (de tus ${plata(yo.parte)}) en ${titulo}, a <b>${plata(precio)}</b>.<br><br>Cuando alguien la compre, te llegan ${plata(precio)} y esa parte pasa a ser suya. Lo que ganaste hasta ese momento sigue siendo tuyo. Podés cancelar la venta mientras nadie la compre.`,
      exito: () => `Tu parte de <b>${plata(cantidad)}</b> quedó en venta a <b>${plata(precio)}</b>. Aparece en "Partes en venta" de ${titulo}.`,
    });
  }

  if (accion === "cancelar-venta") {
    const o = yo?.oferta || ctx.ofertas?.find((x) => x.vendedor === cuenta);
    return operar({
      metodo: "cancelar_oferta", args: [sv.u32(p.id), sv.address(cuenta)],
      titulo: "Cancelar la venta", boton: "Sí, cancelar la venta",
      frase: `Vas a sacar de la venta tu parte${o ? ` de <b>${plata(o.cantidad)}</b>` : ""} en ${titulo}. La parte sigue siendo tuya.`,
      exito: () => `Listo: tu parte ya no está en venta en ${titulo}.`,
    });
  }

  if (accion === "comprar") {
    const o = ctx.ofertas.find((x) => x.vendedor === b.dataset.vendedor);
    if (!o) return aviso("Esa parte ya no está en venta.");
    if (yo.saldo !== null && BigInt(o.precio) + 2n * UNIDAD > yo.saldo) return aviso(`No te alcanza: tenés ${plata(yo.saldo)} y tenés que dejar al menos 2 ${CONFIG.moneda} para comisiones.`);
    return operar({
      metodo: "comprar", args: [sv.u32(p.id), sv.address(cuenta), sv.address(o.vendedor), sv.i128(o.cantidad), sv.i128(o.precio)],
      titulo: "Comprar una parte", boton: `Sí, comprar por ${plata(o.precio)}`,
      frase: `Vas a comprar una parte de <b>${plata(o.cantidad)}</b> invertidos en ${titulo}, por <b>${plata(o.precio)}</b>.<br><br>Le pagás directamente a quien vende (${corto(o.vendedor)}). Desde ahora cobrás lo que el equipo devuelva por esa parte y votás con ella. Si el precio cambia antes de que firmes, la compra se cancela sola.`,
      exito: () => `Compraste una parte de <b>${plata(o.cantidad)}</b> en ${titulo}. Ya la ves en "Tu inversión".`,
    });
  }

  if (accion === "cobrar") {
    return operar({
      metodo: "cobrar", args: [sv.u32(p.id), sv.address(cuenta)],
      titulo: "Confirmá el cobro", boton: `Sí, cobrar ${plata(yo.cobro)}`,
      frase: `Vas a cobrar <b>${plata(yo.cobro)}</b> de ${titulo}.<br><br>La plata llega a tu billetera. Tu parte del proyecto no cambia: si el equipo devuelve más plata, vas a poder volver a cobrar.`,
      exito: (monto) => `Cobraste <b>${plata(monto)}</b>. Ya está en tu billetera.`,
    });
  }
});

function bloquePagos(p, prometido, pagos) {
  const unidad = esProducto(p);
  const hoy = ahora() > Number(p.fecha_devolucion);
  let resumen;
  if (unidad) {
    resumen = `<p class="nota">En este proyecto el equipo paga con producto, fuera de Órbita. Lo que cuenta es que muestre la prueba de cada etapa a tiempo.</p>`;
  } else {
    resumen = `<div class="comparacion">
      <div class="dato"><span>Prometió devolver (por las etapas ya pagadas)</span><b>${plata(prometido)}</b></div>
      <div class="dato"><span>Devolvió hasta ahora</span><b>${plata(p.total_pagado)}</b></div>
    </div>
    <p class="nota">Fecha límite para devolver: <b>${fecha(p.fecha_devolucion)}</b>${hoy && BigInt(p.total_pagado) < BigInt(prometido) ? " (ya pasó)" : ""}.</p>`;
  }
  const lista = pagos.length
    ? `<ul class="historial">${pagos.map((x, i) => `<li><span>Pago ${i + 1} · ${fecha(x.fecha)}</span><b>${plata(x.monto)}</b></li>`).join("")}</ul>`
    : `<p class="nota">Todavía no hay pagos.</p>`;
  return `<div class="tarjeta bloque">
    <h3>Lo prometido y lo pagado</h3>
    ${p.incumplido ? `<div class="destacado" style="border-color:var(--rojo);background:rgba(255,90,78,.12)"><b style="color:var(--rojo)">Incumplido:</b> el equipo no cumplió a tiempo con lo que prometió. Queda marcado para siempre.</div>` : ""}
    ${resumen}
    <p class="chico">Historial de pagos del equipo:</p>
    ${lista}
  </div>`;
}

function bloqueVentas(p, ofertas) {
  const fila = (o) => {
    const mia = cuenta && o.vendedor === cuenta;
    const boton = !cuenta ? "" : mia
      ? `<button class="sec" data-accion="cancelar-venta" style="min-height:46px;padding:8px 18px;font-size:17px">Cancelar venta</button>`
      : `<button data-accion="comprar" data-vendedor="${o.vendedor}" style="min-height:46px;padding:8px 18px;font-size:17px">Comprar</button>`;
    return `<li style="align-items:center"><span>Una parte de <b>${plata(o.cantidad)}</b> invertidos · vende ${corto(o.vendedor)}${mia ? " <b>(vos)</b>" : ""}</span>
      <span style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><b>Precio: ${plata(o.precio)}</b>${boton}</span></li>`;
  };
  const lista = ofertas.length
    ? `<ul class="historial">${ofertas.map(fila).join("")}</ul>${cuenta ? "" : `<p class="nota">Para comprar una parte, conectá tu billetera.</p>`}`
    : `<p class="nota">Nadie está vendiendo su parte en este momento.</p>`;
  return `<div class="tarjeta bloque">
    <h3>Partes en venta</h3>
    <p class="nota">Algunos inversores venden su parte. Si comprás una, pasás a cobrar lo que el equipo devuelva por esa parte.</p>
    ${lista}
  </div>`;
}

// ---------- mi panel ----------
async function mostrarPanel() {
  const caja = $("panelContenido");
  if (!cuenta) {
    caja.innerHTML = `<div class="tarjeta"><h3>Conectá tu billetera para ver tu panel</h3>
      <p class="nota">Acá vas a ver tus inversiones, tus proyectos y lo que te toca hacer hoy.</p>
      <div class="fila-accion"><button data-pub="conectar" onclick="document.getElementById('btnConectar').click()">Conectar billetera</button><a class="boton sec" href="#como-funciona">¿Primera vez? Ver los 3 pasos</a></div></div>`;
    return;
  }
  const mio = ++pedido;
  caja.innerHTML = `<div class="vacio">Buscando tus inversiones y tus proyectos…</div>`;
  try {
    const todos = await cargarTodos();
    // Primero, en qué proyectos participás (parte, cobro pendiente u oferta) o sos dueño.
    const posiciones = await Promise.all(todos.map((p) => leer("posicion", sv.u32(p.id), sv.address(cuenta))));
    const candidatos = todos.filter((p, i) => p.dueno === cuenta || BigInt(posiciones[i].participacion) > 0n || BigInt(posiciones[i].pendiente) > 0n || p.vendedores.includes(cuenta));
    candidatos.sort((a, b) => Number(esPrueba(a)) - Number(esPrueba(b)) || b.id - a.id); // los reales primero
    const datos = await Promise.all(candidatos.map(async (p) => {
      const [yo, prometido, ofertas] = await Promise.all([
        datosMios(p.id, p), leer("prometido", sv.u32(p.id)),
        Promise.all(p.vendedores.map(async (v) => ({ vendedor: v, ...(await leer("oferta", sv.u32(p.id), sv.address(v))) }))),
      ]);
      const ctx = { p, yo, prometido: BigInt(prometido), ofertas };
      contextos.set(p.id, ctx);
      return ctx;
    }));
    const saldo = await miSaldo().catch(() => null);
    if (mio !== pedido) return;
    const inversiones = datos.filter((d) => d.yo.parte > 0n || d.yo.cobro > 0n || d.yo.oferta);
    const proyectos = datos.filter((d) => d.p.dueno === cuenta);
    caja.innerHTML = `<div class="panel">
      ${bloqueHoy(datos)}
      <div class="tarjeta"><h3>Tu billetera</h3>
        <div class="datos"><div class="dato"><span>Dirección</span><b style="font-size:18px;overflow-wrap:anywhere">${cuenta}</b></div>
        <div class="dato"><span>Saldo</span><b>${saldo === null ? "Sin fondos todavía" : plata(saldo)}</b></div></div>
        <div class="fila-accion"><button class="sec" onclick="document.getElementById('btnFondear').click()">Cargar XLM de prueba</button><button class="sec" onclick="document.getElementById('btnCopiar').click()">Copiar dirección</button></div>
      </div>
      <h2>Mis inversiones</h2>
      ${inversiones.length ? inversiones.map(itemInversion).join("") : `<div class="vacio">Todavía no invertiste en ningún proyecto. <a href="#proyectos">Ver proyectos</a></div>`}
      <h2>Mis proyectos</h2>
      ${proyectos.length ? proyectos.map(itemProyecto).join("") : `<div class="vacio">No publicaste ningún proyecto. <a href="#publicar">Publicar uno</a></div>`}
      <h2>Lo que hiciste en esta visita</h2>
      ${sesion.length
        ? `<ul class="historial">${sesion.map((t) => `<li><span>${t.cuando.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })} · ${t.titulo}</span><a href="${CONFIG.explorer}/tx/${t.hash}" target="_blank" rel="noopener">Ver comprobante ↗</a></li>`).join("")}</ul>`
        : `<div class="vacio">Todavía no firmaste ninguna operación en esta visita.</div>`}
    </div>`;
  } catch (e) {
    console.error(e);
    if (mio !== pedido) return;
    caja.innerHTML = `<div class="vacio">No pudimos leer tu panel: ${escapar(traducirError(e))}</div>`;
  }
}

const nombreProyecto = (p) => `<a href="#proyecto/${p.id}">«${escapar(p.titulo)}»</a>${esPrueba(p) ? ` <span class="etiqueta-prueba">(prueba del sistema)</span>` : ""}`;

// Lista de cosas para hacer hoy, con el botón para hacerlas.
function bloqueHoy(datos) {
  const tareas = [];
  for (const { p, yo, prometido } of datos) {
    const n = Number(p.hito_actual); const e = Number(p.estado);
    const envolver = (texto, boton) => tareas.push(`<li data-proyecto="${p.id}"><span>${texto}</span>${boton}</li>`);
    const motivo = vencimientoPendiente(p, prometido);
    if (motivo) envolver(`<b>Actualizá el estado</b> de ${nombreProyecto(p)}: ${motivo}`, `<button data-accion="actualizar">Actualizar estado</button>`);
    if (yo.cobro > 0n) envolver(`Tenés <b>${plata(yo.cobro)}</b> para cobrar en ${nombreProyecto(p)}.`, `<button data-accion="cobrar">Cobrar ${plata(yo.cobro)}</button>`);
    if (e === 1 && yo.parte > 0n && !yo.yaVoto && !(n > 0 && !p.hitos[n - 1].evidencia) && !motivo)
      envolver(`<b>Votá</b> si se le paga la etapa ${n + 1} al equipo de ${nombreProyecto(p)}.`, `<a class="boton" href="#proyecto/${p.id}">Ir a votar</a>`);
    if (p.dueno === cuenta) {
      if (e === 1 && !(n > 0 && !p.hitos[n - 1].evidencia) && BigInt(p.hitos[n].a_favor) * 2n > BigInt(p.recaudado))
        envolver(`Los inversores aprobaron la etapa ${n + 1} de ${nombreProyecto(p)}: <b>ya podés cobrarla</b>.`, `<button data-accion="liberar">Cobrar la etapa ${n + 1}</button>`);
      p.hitos.forEach((h, i) => {
        if (h.liberado && !h.evidencia && ahora() <= Number(h.fecha_limite))
          envolver(`<b>Subí la prueba</b> de la etapa ${i + 1} de ${nombreProyecto(p)}. ${cuentaRegresiva(h.fecha_limite)}`, `<a class="boton" href="#proyecto/${p.id}">Subir la prueba</a>`);
      });
      const falta = prometido - BigInt(p.total_pagado);
      if (BigInt(p.liberado) > 0n && falta > 0n && !esProducto(p))
        envolver(`<b>Devolvé ${plata(falta)}</b> a los inversores de ${nombreProyecto(p)}. ${cuentaRegresiva(p.fecha_devolucion)}`, `<a class="boton" href="#proyecto/${p.id}">Devolver plata</a>`);
    }
  }
  return `<div class="tarjeta hoy"><h3>Qué te toca hacer hoy</h3>
    ${tareas.length ? `<ul>${tareas.join("")}</ul>` : `<p class="listo">✓ Hoy no tenés nada pendiente.</p>`}</div>`;
}

function itemInversion({ p, yo }) {
  return `<div class="tarjeta item-panel" data-proyecto="${p.id}">
    <div class="cabeza"><h3>${nombreProyecto(p)}</h3>${chips(p)}</div>
    <div class="datos">
      <div class="dato"><span>Tu parte</span><b>${plata(yo.parte)}</b></div>
      <div class="dato"><span>Cuánto pesa tu voto</span><b>${pctDe(yo.parte, p.recaudado)}%</b></div>
      <div class="dato"><span>Para cobrar ahora</span><b>${plata(yo.cobro)}</b></div>
    </div>
    <div class="fila-accion">${yo.cobro > 0n ? `<button data-accion="cobrar">Cobrar ${plata(yo.cobro)}</button>` : ""}<a class="boton sec" href="#proyecto/${p.id}">Ver el proyecto</a></div>
    ${bloqueVender(p, yo)}
  </div>`;
}

function itemProyecto({ p, yo, prometido }) {
  return `<div class="item-panel" data-proyecto="${p.id}">
    <div class="tarjeta item-panel">
      <div class="cabeza"><h3>${nombreProyecto(p)}</h3>${chips(p)}</div>
      <div class="linea"><span>Juntó ${plata(p.recaudado)} de ${plata(p.meta)}</span><span>Cobraste ${plata(p.liberado)} · devolviste ${plata(p.total_pagado)}</span></div>
    </div>
    ${bloqueDueno(p, yo, prometido)}
  </div>`;
}

// ---------- publicar (formulario en 4 pasos) ----------
const bytes = (t) => new TextEncoder().encode(String(t)).length;
const DIA = 86400;
const IMAGENES = [
  { url: CONFIG.sitio + "img/software.svg", nombre: "Código" },
  { url: CONFIG.sitio + "img/turnos.svg", nombre: "App de celular" },
  { url: CONFIG.sitio + "img/apuntes.svg", nombre: "Plataforma web" },
];
const EJEMPLO_CONDICIONES = {
  0: "Ej: Préstamo al 8 %: devolvemos lo invertido más un 8 % antes de la fecha de devolución, con lo que cobremos de publicidad.",
  1: "Ej: Repartimos entre los inversores el 10 % de lo que cobremos por suscripciones durante los primeros 12 meses.",
  2: "Ej: Repartimos el 20 % de las ganancias del primer año. Publicamos los números cada 3 meses en el README del repositorio.",
  3: "Ej: Cada inversor recibe un año del plan premium gratis por cada 10 XLM invertidos.",
};
const aFechaInput = (t) => { const d = new Date(Number(t) * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const deFechaInput = (v) => { const [y, m, d] = String(v).split("-").map(Number); return y ? Math.floor(new Date(y, m - 1, d, 23, 59, 59).getTime() / 1000) : 0; };

function borradorNuevo() {
  const plazo = deFechaInput(aFechaInput(ahora() + 30 * DIA));
  return {
    paso: 1, titulo: "", descripcion: "", imagen: IMAGENES[0].url, tipo: 0, condiciones: "",
    etapas: [{ desc: "", monto: "", minimo: "" }, { desc: "", monto: "", minimo: "" }],
    plazo, fechas: [plazo + 45 * DIA, plazo + 90 * DIA], devolucion: plazo + 270 * DIA,
  };
}
let borrador = (() => { try { return JSON.parse(localStorage.getItem("orbita-borrador")) || borradorNuevo(); } catch { return borradorNuevo(); } })();
const guardarBorrador = () => { try { localStorage.setItem("orbita-borrador", JSON.stringify(borrador)); } catch {} };

function mostrarPublicar() {
  const caja = $("publicarContenido");
  if (!cuenta) {
    caja.innerHTML = `<div class="tarjeta"><h3>Primero conectá tu billetera</h3>
      <p class="nota">El proyecto se publica a nombre de tu billetera: es la que va a recibir la plata de cada etapa. Si es tu primera vez, seguí los 3 pasos de "Cómo funciona".</p>
      <div class="fila-accion"><button data-pub="conectar">Conectar billetera</button><a class="boton sec" href="#como-funciona">Ver los 3 pasos</a></div></div>`;
    return;
  }
  const b = borrador;
  const nombres = ["Tu proyecto", "Qué ofrecés", "Etapas", "Fechas"];
  const indicador = `<ol class="pasos-form">${nombres.map((n, i) => `<li class="${i + 1 < b.paso ? "hecho" : i + 1 === b.paso ? "actual" : ""}">${i + 1 < b.paso ? "✓" : `${i + 1}.`} ${n}</li>`).join("")}</ol>`;
  let cuerpo = "";
  if (b.paso === 1) cuerpo = `
    <h3>Paso 1: Tu proyecto</h3>
    <label class="campo">Nombre del proyecto <span class="ayuda">Corto y claro. Ej: "App de turnos para kioscos del barrio".</span>
      <input id="fTitulo" maxlength="80" value="${escapar(b.titulo)}" placeholder="Ej: Plataforma de apuntes para la facultad"></label>
    <label class="campo">¿Qué van a hacer y quiénes son? <span class="ayuda">Contalo como se lo contarías a alguien que no sabe de programación. Ej: "Una app web para que los clientes saquen turno desde el celular. La hacemos 3 estudiantes de Sistemas."</span>
      <textarea id="fDescripcion" maxlength="1000" placeholder="Ej: Un lugar para compartir apuntes y exámenes viejos de cada materia…">${escapar(b.descripcion)}</textarea></label>
    <div class="campo">Imagen del proyecto <span class="ayuda">Elegí una o pegá el link a una imagen tuya (por ejemplo, una captura de pantalla subida a GitHub).</span>
      <div class="opciones">${IMAGENES.map((im) => `<label class="opcion"><input type="radio" name="fImagen" value="${im.url}" ${b.imagen === im.url ? "checked" : ""}><img src="${im.url}" alt=""><strong>${im.nombre}</strong></label>`).join("")}</div>
      <input id="fImagenPropia" placeholder="O pegá un link: https://…" value="${IMAGENES.some((im) => im.url === b.imagen) ? "" : escapar(b.imagen)}"></div>`;
  if (b.paso === 2) cuerpo = `
    <h3>Paso 2: Qué ofrecés a cambio</h3>
    <div class="campo">¿Qué recibe quien invierte?
      <div class="opciones">${[0, 1, 2, 3].map((t) => `<label class="opcion"><input type="radio" name="fTipo" value="${t}" ${b.tipo === t ? "checked" : ""}><strong>${TIPOS[t].nombre}</strong><span>${TIPOS[t].explica}</span></label>`).join("")}</div></div>
    <label class="campo">Las condiciones, con tus palabras <span class="ayuda">Qué das, cuánto y cuándo. Esto lo leen los inversores antes de decidir.</span>
      <textarea id="fCondiciones" maxlength="1000" placeholder="${escapar(EJEMPLO_CONDICIONES[b.tipo])}">${escapar(b.condiciones)}</textarea></label>`;
  if (b.paso === 3) {
    const producto = b.tipo === 3;
    cuerpo = `
    <h3>Paso 3: Las etapas</h3>
    <p class="nota">Dividí el proyecto en etapas (hasta 10). Antes de cada etapa, los inversores votan si te pagan esa parte. Después mostrás la prueba: una demo y el link a tu código en GitHub.</p>
    ${b.etapas.map((e, i) => `<div class="etapa-form">
      <div class="cabeza"><strong>Etapa ${i + 1}</strong>${b.etapas.length > 1 ? `<button class="sec" data-pub="quitar" data-i="${i}" style="min-height:44px;padding:8px 16px;font-size:16px">Quitar</button>` : ""}</div>
      <label class="campo">¿Qué van a hacer en esta etapa? <input data-etapa="desc" data-i="${i}" maxlength="120" value="${escapar(e.desc)}" placeholder="${i === 0 ? "Ej: Prototipo con login y pantalla principal" : "Ej: Lanzamiento y primeros 100 usuarios"}"></label>
      <div class="dos">
        <label class="campo">Plata que necesitan (${CONFIG.moneda}) <input data-etapa="monto" data-i="${i}" inputmode="decimal" value="${escapar(e.monto)}" placeholder="Ej: 150"></label>
        <label class="campo">${producto ? "Unidades que se comprometen a entregar" : `Mínimo que se comprometen a devolver (${CONFIG.moneda})`} <input data-etapa="minimo" data-i="${i}" inputmode="decimal" value="${escapar(e.minimo)}" placeholder="${producto ? "Ej: 20" : "Ej: 165"}"></label>
      </div></div>`).join("")}
    ${b.etapas.length < 10 ? `<button class="sec" data-pub="agregar">+ Agregar otra etapa</button>` : ""}
    <p class="destacado" id="fTotales"></p>`;
  }
  if (b.paso === 4) cuerpo = `
    <h3>Paso 4: Las fechas</h3>
    <label class="campo">¿Hasta cuándo se puede invertir? <span class="ayuda">Si para esa fecha no se juntó toda la plata, cada inversor recupera lo suyo.</span>
      <input type="date" id="fPlazo" value="${aFechaInput(b.plazo)}"></label>
    ${b.etapas.map((e, i) => `<label class="campo">Etapa ${i + 1} (${escapar(e.desc) || "sin nombre"}): mostrar la prueba hasta el <span class="ayuda">Después de cobrar la etapa, para esta fecha tenés que subir la demo y el link a GitHub. Si no, el proyecto se corta.</span>
      <input type="date" data-fecha="${i}" value="${aFechaInput(b.fechas[i])}"></label>`).join("")}
    <label class="campo">Fecha para devolver lo prometido <span class="ayuda">Para esta fecha tenés que haber devuelto el mínimo de las etapas que cobraste. Si no, el proyecto queda marcado "Incumplido".</span>
      <input type="date" id="fDevolucion" value="${aFechaInput(b.devolucion)}"></label>`;
  if (b.paso === 5) cuerpo = resumenPublicar();
  const nav = b.paso <= 4
    ? `<div class="navegacion-form">${b.paso > 1 ? `<button class="sec" data-pub="atras">← Volver</button>` : `<button class="sec" data-pub="borrar">Empezar de nuevo</button>`}<button data-pub="siguiente">${b.paso === 4 ? "Ver el resumen →" : "Siguiente →"}</button></div>`
    : `<div class="navegacion-form"><button class="sec" data-pub="atras">← Corregir algo</button><button data-pub="publicar">Publicar en Stellar</button></div>`;
  caja.innerHTML = `${b.paso <= 4 ? indicador : ""}<div class="tarjeta">${cuerpo}<p class="error-campo" id="fError" role="alert"></p>${nav}</div>`;
  if (b.paso === 3) actualizarTotales();
}

function leerPaso() {
  const b = borrador;
  if (b.paso === 1) {
    b.titulo = $("fTitulo").value.trim();
    b.descripcion = $("fDescripcion").value.trim();
    const propia = $("fImagenPropia").value.trim();
    b.imagen = propia || document.querySelector('input[name="fImagen"]:checked')?.value || "";
  }
  if (b.paso === 2) {
    b.tipo = Number(document.querySelector('input[name="fTipo"]:checked')?.value ?? 0);
    b.condiciones = $("fCondiciones").value.trim();
  }
  if (b.paso === 3) document.querySelectorAll("[data-etapa]").forEach((el) => (b.etapas[Number(el.dataset.i)][el.dataset.etapa] = el.value.trim()));
  if (b.paso === 4) {
    b.plazo = deFechaInput($("fPlazo").value);
    document.querySelectorAll("[data-fecha]").forEach((el) => (b.fechas[Number(el.dataset.fecha)] = deFechaInput(el.value)));
    b.devolucion = deFechaInput($("fDevolucion").value);
  }
  guardarBorrador();
}

const minimoUnidades = (b, texto) => (b.tipo === 3 ? (/^\d+$/.test(String(texto).trim()) ? BigInt(String(texto).trim()) : null) : aUnidades(texto));

// Devuelve el texto del error del paso, o "" si está todo bien. Usa los mismos límites que el contrato.
function validarPaso(paso) {
  const b = borrador;
  if (paso === 1) {
    if (!b.titulo) return "Escribí el nombre del proyecto.";
    if (bytes(b.titulo) > 80) return "El nombre es muy largo: acortalo un poco.";
    if (bytes(b.descripcion) > 1000) return "La descripción es muy larga: acortala un poco.";
    if (b.imagen && !/^https?:\/\//i.test(b.imagen)) return "El link de la imagen tiene que empezar con https://";
    if (bytes(b.imagen) > 300) return "El link de la imagen es muy largo.";
  }
  if (paso === 2) {
    if (!b.condiciones) return "Escribí las condiciones: qué das, cuánto y cuándo.";
    if (bytes(b.condiciones) > 1000) return "Las condiciones son muy largas: acortalas un poco.";
  }
  if (paso === 3) {
    for (const [i, e] of b.etapas.entries()) {
      if (!e.desc) return `Escribí qué van a hacer en la etapa ${i + 1}.`;
      if (bytes(e.desc) > 120) return `La descripción de la etapa ${i + 1} es muy larga.`;
      const m = aUnidades(e.monto);
      if (!m || m <= 0n) return `Escribí cuánta plata necesitan en la etapa ${i + 1} (por ejemplo, 150).`;
      const min = minimoUnidades(b, e.minimo || "0");
      if (min === null || min < 0n) return `Revisá el mínimo de la etapa ${i + 1}: tiene que ser un número${b.tipo === 3 ? " entero de unidades" : ""}.`;
    }
  }
  if (paso === 4) {
    if (!b.plazo || b.plazo <= ahora()) return "La fecha para invertir tiene que ser futura.";
    let anterior = b.plazo;
    for (let i = 0; i < b.etapas.length; i++) {
      if (!b.fechas[i] || b.fechas[i] <= anterior) return `La fecha de la etapa ${i + 1} tiene que ser posterior a ${i === 0 ? "la fecha para invertir" : `la de la etapa ${i}`}.`;
      anterior = b.fechas[i];
    }
    if (!b.devolucion || b.devolucion <= anterior) return "La fecha para devolver tiene que ser posterior a la de la última etapa.";
  }
  return "";
}

function actualizarTotales() {
  const b = borrador;
  leerPaso();
  const meta = b.etapas.reduce((s, e) => s + (aUnidades(e.monto) || 0n), 0n);
  const prometido = b.etapas.reduce((s, e) => s + (minimoUnidades(b, e.minimo || "0") || 0n), 0n);
  const el = $("fTotales");
  if (!el) return;
  if (b.tipo === 3) el.innerHTML = `Meta total: <b>${plata(meta)}</b>. Se comprometen a entregar <b>${prometido.toLocaleString("es-AR")} unidades</b> en total.`;
  else el.innerHTML = `Meta total: <b>${plata(meta)}</b>. Se comprometen a devolver <b>${plata(prometido)}</b>${meta > 0n ? `: por cada 100 ${CONFIG.moneda} invertidos, <b>${((prometido * 100n) / meta).toLocaleString("es-AR")} ${CONFIG.moneda}</b>` : ""}.`;
}

function resumenPublicar() {
  const b = borrador;
  const meta = b.etapas.reduce((s, e) => s + aUnidades(e.monto), 0n);
  const producto = b.tipo === 3;
  return `<h3>Revisá antes de publicar</h3>
    <p class="nota">Una vez publicado, el proyecto <b>no se puede editar</b>: queda guardado en la blockchain. Si algo está mal, tocá "Corregir algo".</p>
    <div class="resumen"><dl>
      <dt>Proyecto</dt><dd>${escapar(b.titulo)}</dd>
      ${b.descripcion ? `<dt>Descripción</dt><dd>${escapar(b.descripcion)}</dd>` : ""}
      <dt>A cambio</dt><dd>${TIPOS[b.tipo].nombre}: ${escapar(b.condiciones)}</dd>
      <dt>Meta</dt><dd>${plata(meta)} · se puede invertir hasta el ${fecha(b.plazo)}</dd>
      ${b.etapas.map((e, i) => `<dt>Etapa ${i + 1}</dt><dd>${escapar(e.desc)}: ${plata(aUnidades(e.monto))}. Promete ${producto ? `${minimoUnidades(b, e.minimo || "0")} unidades` : plata(minimoUnidades(b, e.minimo || "0"))}. Prueba hasta el ${fecha(b.fechas[i])}.</dd>`).join("")}
      <dt>Devolución</dt><dd>Hasta el ${fecha(b.devolucion)}</dd>
      ${b.imagen ? `<dt>Imagen</dt><dd><img src="${urlSegura(b.imagen)}" alt="" style="max-width:280px;border-radius:12px"></dd>` : ""}
    </dl></div>`;
}

$("publicarContenido").addEventListener("input", (ev) => { if (ev.target.matches("[data-etapa]")) actualizarTotales(); });
$("publicarContenido").addEventListener("change", (ev) => {
  if (ev.target.name === "fImagen") $("fImagenPropia").value = "";
  if (ev.target.name === "fTipo") { $("fCondiciones").placeholder = EJEMPLO_CONDICIONES[ev.target.value]; }
});
$("publicarContenido").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("[data-pub]");
  if (!btn) return;
  const b = borrador;
  const accion = btn.dataset.pub;
  if (accion === "conectar") return conectar();
  if (accion !== "borrar" && b.paso <= 4) leerPaso();
  if (accion === "siguiente") {
    const error = validarPaso(b.paso);
    if (error) { $("fError").textContent = error; return; }
    b.paso += 1;
  }
  if (accion === "atras") b.paso -= 1;
  if (accion === "agregar") { const ult = b.fechas[b.fechas.length - 1] || b.plazo; b.etapas.push({ desc: "", monto: "", minimo: "" }); b.fechas.push(ult + 45 * DIA); if (b.devolucion <= ult + 45 * DIA) b.devolucion = ult + 225 * DIA; }
  if (accion === "quitar") { b.etapas.splice(Number(btn.dataset.i), 1); b.fechas.splice(Number(btn.dataset.i), 1); }
  if (accion === "borrar") borrador = borradorNuevo();
  if (accion === "publicar") {
    for (const paso of [1, 2, 3, 4]) { const error = validarPaso(paso); if (error) { b.paso = paso; guardarBorrador(); mostrarPublicar(); $("fError").textContent = error; return; } }
    const montos = b.etapas.map((e) => aUnidades(e.monto));
    const meta = montos.reduce((s, m) => s + m, 0n);
    const id = await operar({
      metodo: "crear_proyecto",
      args: [sv.address(cuenta), S.nativeToScVal(b.titulo, { type: "string" }), S.nativeToScVal(b.descripcion, { type: "string" }),
        S.nativeToScVal(b.imagen, { type: "string" }), sv.u32(b.tipo), S.nativeToScVal(b.condiciones, { type: "string" }),
        S.nativeToScVal(BigInt(b.plazo), { type: "u64" }),
        S.xdr.ScVal.scvVec(b.etapas.map((e) => S.nativeToScVal(e.desc, { type: "string" }))),
        S.xdr.ScVal.scvVec(montos.map(sv.i128)),
        S.xdr.ScVal.scvVec(b.etapas.map((e) => sv.i128(minimoUnidades(b, e.minimo || "0")))),
        S.xdr.ScVal.scvVec(b.fechas.slice(0, b.etapas.length).map((f) => S.nativeToScVal(BigInt(f), { type: "u64" }))),
        S.nativeToScVal(BigInt(b.devolucion), { type: "u64" })],
      titulo: "Confirmá la publicación", boton: "Sí, publicar",
      frase: `Vas a publicar <b>«${escapar(b.titulo)}»</b> para juntar <b>${plata(meta)}</b> hasta el <b>${fecha(b.plazo)}</b>.<br><br>Queda guardado en la blockchain y no se puede editar. La plata de cada etapa va a llegar a esta billetera, cuando los inversores voten que sí.`,
      exito: (nuevo) => `Tu proyecto <b>«${escapar(b.titulo)}»</b> ya está publicado (número ${nuevo}).<br><br>Compartí este link con quienes quieras que inviertan:<br><b>${escapar(location.origin + location.pathname)}#proyecto/${nuevo}</b>`,
      despues: (nuevo) => { borrador = borradorNuevo(); guardarBorrador(); location.hash = `#proyecto/${nuevo}`; },
    });
    if (id === null) return;
    return;
  }
  guardarBorrador();
  mostrarPublicar();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ---------- billetera ----------
const esCelular = navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
$("guiaCelu").hidden = !esCelular;

function mostrarGuia() {
  location.hash = "#como-funciona";
  setTimeout(() => {
    const g = $("guia");
    g.scrollIntoView({ behavior: "smooth", block: "start" });
    g.classList.add("resaltada");
    clearTimeout(g._t);
    g._t = setTimeout(() => g.classList.remove("resaltada"), 4000);
  }, 50);
}

async function conectar() {
  if (!F) { mostrarGuia(); return aviso("Primero instalá Freighter: seguí los 3 pasos.", 7000); }
  let r;
  try { r = await F.requestAccess(); }
  catch (e) { console.error(e); mostrarGuia(); return aviso(`No se pudo conectar con Freighter: ${e?.message || e}`, 7000); }
  if (r?.error) { mostrarGuia(); return aviso(r.error.message || String(r.error), 7000); }
  const direccion = typeof r === "string" ? r : r?.address;
  if (!direccion) { mostrarGuia(); return aviso("Freighter no devolvió ninguna cuenta. Abrí la extensión, desbloqueala y volvé a intentar.", 7000); }
  cuenta = direccion;
  $("btnConectar").textContent = `✓ ${corto(cuenta)}`;
  $("btnConectar").title = `Billetera conectada: ${cuenta}`;
  $("btnConectar").classList.add("conectado");
  $("menuDir").textContent = cuenta;
  $("btnFondearGuia").hidden = false;
  aviso("Listo: tu billetera está conectada.");
  irA();
}

// Menú de la billetera (de la rama main): copiar dirección, cargar XLM de prueba y desconectar.
function abrirMenuBilletera(abrir) {
  $("menuBilletera").hidden = !abrir;
  $("btnConectar").setAttribute("aria-expanded", String(abrir));
}

function desconectar() {
  cuenta = null;
  abrirMenuBilletera(false);
  $("btnConectar").textContent = "Conectar billetera";
  $("btnConectar").title = "";
  $("btnConectar").classList.remove("conectado");
  $("btnFondearGuia").hidden = true;
  aviso("Billetera desconectada de Órbita.");
  irA();
}

async function copiarDireccion() {
  abrirMenuBilletera(false);
  try { await navigator.clipboard.writeText(cuenta); aviso("Dirección copiada."); }
  catch { aviso(cuenta, 8000); }
}

async function fondear(ev) {
  abrirMenuBilletera(false);
  const b = ev.currentTarget;
  b.disabled = true;
  try {
    const r = await fetch(`${CONFIG.friendbot}/?addr=${cuenta}`);
    aviso(r.ok ? "Listo: tu cuenta tiene XLM de prueba." : "Tu cuenta ya tenía XLM de prueba.");
  } catch { aviso("No se pudo pedir XLM de prueba. Probá de nuevo en un rato."); }
  b.disabled = false;
}

// ---------- menú ----------
function cerrarMenu() { $("nav").classList.remove("abierto"); $("btnMenu").setAttribute("aria-expanded", "false"); }
$("btnMenu").onclick = () => { const abierto = $("nav").classList.toggle("abierto"); $("btnMenu").setAttribute("aria-expanded", String(abierto)); };

$("btnConectar").onclick = () => (cuenta ? abrirMenuBilletera($("menuBilletera").hidden) : conectar());
$("btnFondear").onclick = fondear;
$("btnFondearGuia").onclick = fondear;
$("btnDesconectar").onclick = desconectar;
$("btnCopiar").onclick = copiarDireccion;
document.addEventListener("click", (e) => { if (!e.target.closest(".billetera")) abrirMenuBilletera(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrirMenuBilletera(false); });
window.addEventListener("hashchange", irA);
irA();
