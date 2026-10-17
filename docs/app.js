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
};

const ICONO = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
  estrella: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1-4.5-4.3 6.1-.8z"/></svg>`,
  candado: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`,
  cruz: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
};

// ---------- lectura del contrato ----------
// Las lecturas se simulan (no se firman ni cuestan nada).
async function leer(metodo, ...args) {
  const origen = new Account(cuenta || Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(origen, { fee: BASE_FEE, networkPassphrase: CONFIG.networkPassphrase })
    .addOperation(contrato.call(metodo, ...args)).setTimeout(60).build();
  const sim = await servidor.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
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
}

// ---------- inicio: números generales ----------
async function mostrarNumeros() {
  try {
    const lista = await cargarTodos();
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
    const lista = await cargarTodos();
    if (!lista.length) { caja.innerHTML = `<div class="vacio">Todavía no hay proyectos. ¡Publicá el primero!</div>`; return; }
    caja.innerHTML = lista.slice().reverse().map(tarjeta).join("");
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
    if (mio !== pedido) return; // el usuario ya pidió otra cosa
    caja.innerHTML = `<div class="ficha">
      ${bloqueQueEs(p)}
      ${bloqueInvertir(p)}
      ${bloqueEtapas(p)}
      ${bloqueVotacion(p)}
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

function bloqueInvertir(p) {
  const pct = pctDe(p.recaudado, p.meta);
  const falta = BigInt(p.meta) - BigInt(p.recaudado);
  const abierto = Number(p.estado) === 0;
  return `<div class="tarjeta bloque">
    <h3>Invertir</h3>
    <div class="barra" aria-hidden="true"><i style="width:${Math.min(pct, 100)}%"></i></div>
    <div class="datos">
      <div class="dato"><span>Ya se juntó</span><b>${plata(p.recaudado)}</b></div>
      <div class="dato"><span>Necesita en total</span><b>${plata(p.meta)}</b></div>
      <div class="dato"><span>${abierto ? "Falta" : "Avance"}</span><b>${abierto ? plata(falta) : pct + "%"}</b></div>
      <div class="dato"><span>Se puede invertir hasta el</span><b>${fecha(p.plazo)}</b></div>
    </div>
    <p class="nota">${abierto ? "Este proyecto todavía está juntando plata. Para invertir vas a necesitar tu billetera conectada." : "Este proyecto ya no recibe inversiones."}</p>
  </div>`;
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

function bloqueVotacion(p) {
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
      <p class="nota">Cada inversor vota con el peso de su parte. Con <b>más de la mitad por el Sí</b>, el equipo cobra la etapa. Con más de la mitad por el No, el proyecto se corta y cada uno recupera su parte de lo que queda.</p>`;
  } else if (e === 0) {
    cuerpo = `<p class="nota">La votación empieza cuando el proyecto junte toda la plata.</p>`;
  } else if (e === 2) {
    cuerpo = `<p class="nota">Ya se votaron y pagaron todas las etapas.</p>`;
  } else {
    cuerpo = `<p class="nota">El proyecto se cortó: ya no hay votaciones. Cada inversor puede recuperar su parte de lo que quedaba.</p>`;
  }
  return `<div class="tarjeta bloque"><h3>Votación</h3>${cuerpo}</div>`;
}

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
  const lista = ofertas.length
    ? `<ul class="historial">${ofertas.map((o) => `<li><span>Una parte de <b>${plata(o.cantidad)}</b> invertidos · vende ${corto(o.vendedor)}</span><b>Precio: ${plata(o.precio)}</b></li>`).join("")}</ul>`
    : `<p class="nota">Nadie está vendiendo su parte en este momento.</p>`;
  return `<div class="tarjeta bloque">
    <h3>Partes en venta</h3>
    <p class="nota">Algunos inversores venden su parte. Si comprás una, pasás a cobrar lo que el equipo devuelva por esa parte.</p>
    ${lista}
  </div>`;
}

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
  $("btnFondearGuia").hidden = false;
  aviso("Listo: tu billetera está conectada.");
  irA();
}

async function fondear(ev) {
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

$("btnConectar").onclick = conectar;
$("btnFondearGuia").onclick = fondear;
window.addEventListener("hashchange", irA);
irA();
