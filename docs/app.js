import { CONFIG } from "./config.js";

const S = window.StellarSdk;
const F = window.freighterApi;
const { rpc, TransactionBuilder, Contract, nativeToScVal, scValToNative, xdr, BASE_FEE, Account, Keypair } = S;

const servidor = new rpc.Server(CONFIG.rpcUrl);
const contrato = new Contract(CONFIG.contractId);
const UNIDAD = 10n ** BigInt(CONFIG.decimales);
const ESTADOS = ["Juntando aportes", "Financiado · votando etapas", "Completado", "Fallido · reembolsando"];
const ERRORES = {
  1: "El proyecto no existe.", 2: "Revisá las etapas (entre 1 y 10).", 3: "El monto tiene que ser mayor a cero.",
  4: "El proyecto ya no recibe aportes.", 5: "El plazo para aportar venció.", 6: "Ese aporte supera la meta.",
  7: "El proyecto todavía no está financiado.", 8: "No tenés participación en este proyecto.",
  9: "Ya votaste esta etapa.", 10: "La etapa todavía no tiene mayoría a favor.",
  11: "Este proyecto no está en reembolso.", 12: "El plazo tiene que ser futuro.",
};

let cuenta = null;
const $ = (id) => document.getElementById(id);

// ---------- utilidades ----------
const aviso = (texto, ms = 4500) => { const a = $("aviso"); a.textContent = texto; a.style.display = "block"; clearTimeout(a._t); a._t = setTimeout(() => (a.style.display = "none"), ms); };
const corto = (g) => `${g.slice(0, 4)}…${g.slice(-4)}`;
const aMoneda = (v) => { const n = BigInt(v); const entero = n / UNIDAD; const resto = (n % UNIDAD).toString().padStart(CONFIG.decimales, "0").replace(/0+$/, ""); return resto ? `${entero},${resto.slice(0, 2)}` : `${entero}`; };
const aUnidades = (texto) => { const [e, d = ""] = String(texto).replace(",", ".").split("."); return BigInt(e || 0) * UNIDAD + BigInt((d + "0".repeat(CONFIG.decimales)).slice(0, CONFIG.decimales)); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const traducirError = (e) => { const m = String(e?.message || e).match(/Error\(Contract, #(\d+)\)/); return m ? ERRORES[m[1]] || `Error del contrato #${m[1]}` : String(e?.message || e); };

const sv = {
  address: (a) => nativeToScVal(a, { type: "address" }),
  u32: (n) => nativeToScVal(Number(n), { type: "u32" }),
  u64: (n) => nativeToScVal(BigInt(n), { type: "u64" }),
  i128: (n) => nativeToScVal(BigInt(n), { type: "i128" }),
  str: (s) => nativeToScVal(String(s), { type: "string" }),
  bool: (b) => xdr.ScVal.scvBool(Boolean(b)),
  vec: (arr) => xdr.ScVal.scvVec(arr),
};

// ---------- Stellar ----------
function armar(origen, metodo, args) {
  return new TransactionBuilder(origen, { fee: BASE_FEE, networkPassphrase: CONFIG.networkPassphrase })
    .addOperation(contrato.call(metodo, ...args))
    .setTimeout(60)
    .build();
}

async function leer(metodo, ...args) {
  const origen = new Account(cuenta || Keypair.random().publicKey(), "0");
  const sim = await servidor.simulateTransaction(armar(origen, metodo, args));
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return scValToNative(sim.result.retval);
}

async function firmar(xdrTx) {
  const r = await F.signTransaction(xdrTx, { networkPassphrase: CONFIG.networkPassphrase, address: cuenta });
  if (r?.error) throw new Error(r.error.message || r.error);
  return typeof r === "string" ? r : r.signedTxXdr;
}

async function escribir(metodo, ...args) {
  if (!cuenta) throw new Error("Conectá tu billetera Freighter primero.");
  const origen = await servidor.getAccount(cuenta);
  const preparada = await servidor.prepareTransaction(armar(origen, metodo, args));
  const firmada = TransactionBuilder.fromXDR(await firmar(preparada.toXDR()), CONFIG.networkPassphrase);
  const envio = await servidor.sendTransaction(firmada);
  if (envio.status === "ERROR") throw new Error("La red rechazó la transacción.");
  let r;
  for (let i = 0; i < 40; i++) {
    await esperar(1500);
    r = await servidor.getTransaction(envio.hash);
    if (r.status !== "NOT_FOUND") break;
  }
  registrar(metodo, envio.hash, r?.status);
  if (r?.status !== "SUCCESS") throw new Error("La transacción falló en la red.");
  return r.returnValue ? scValToNative(r.returnValue) : null;
}

function registrar(metodo, hash, estado) {
  const caja = $("registro");
  if (caja.dataset.vacio !== "no") { caja.innerHTML = ""; caja.dataset.vacio = "no"; }
  const d = document.createElement("div");
  d.innerHTML = `<strong>${metodo}</strong> · ${estado === "SUCCESS" ? "confirmada" : estado || "enviada"} · <a target="_blank" rel="noopener" href="${CONFIG.explorer}/tx/${hash}">${hash}</a>`;
  caja.prepend(d);
}

async function accion(boton, fn, okTexto) {
  boton.disabled = true;
  const original = boton.textContent;
  boton.textContent = "Firmando…";
  try { await fn(); aviso(okTexto); await cargarProyectos(); }
  catch (e) { console.error(e); aviso(traducirError(e), 7000); }
  finally { boton.disabled = false; boton.textContent = original; }
}

// ---------- guía para usuarios nuevos ----------
const esCelular = navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
$("guiaCelu").hidden = !esCelular;

function mostrarGuia() {
  const g = $("guia");
  g.hidden = false;
  g.scrollIntoView({ behavior: "smooth", block: "start" });
  g.classList.add("resaltada");
  clearTimeout(g._t);
  g._t = setTimeout(() => g.classList.remove("resaltada"), 4000);
}

// ---------- billetera ----------
async function conectar() {
  if (!F) { mostrarGuia(); return aviso("Primero instalá Freighter: seguí los 3 pasos de arriba.", 7000); }
  let r;
  try { r = await F.requestAccess(); }
  catch (e) { console.error(e); return aviso(`No se pudo conectar con Freighter: ${e?.message || e}`, 7000); }
  if (r?.error) return aviso(r.error.message || String(r.error), 7000);
  const direccion = typeof r === "string" ? r : r?.address;
  if (!direccion) return aviso("Freighter no devolvió ninguna cuenta. Abrí la extensión, desbloqueala y volvé a intentar.", 7000);
  cuenta = direccion;
  $("guia").hidden = true;
  $("cuenta").textContent = corto(cuenta);
  $("btnConectar").textContent = "Conectado";
  $("btnFondear").hidden = false;
  cargarProyectos();
}

async function fondear() {
  const b = $("btnFondear");
  b.disabled = true;
  try {
    const r = await fetch(`${CONFIG.friendbot}/?addr=${cuenta}`);
    aviso(r.ok ? "Listo: tu cuenta tiene XLM de prueba." : "La cuenta ya estaba fondeada.");
  } catch { aviso("No se pudo contactar a friendbot."); }
  b.disabled = false;
}

// ---------- proyectos ----------
async function cargarProyectos() {
  const caja = $("proyectos");
  if (CONFIG.contractId.startsWith("PEGAR")) { caja.innerHTML = `<div class="vacio">Falta configurar el CONTRACT_ID en config.js.</div>`; return; }
  try {
    const total = Number(await leer("cantidad"));
    if (!total) { caja.innerHTML = `<div class="vacio">Todavía no hay proyectos. ¡Publicá el primero!</div>`; return; }
    const ids = [...Array(total).keys()].reverse();
    const tarjetas = await Promise.all(ids.map(tarjetaProyecto));
    caja.innerHTML = "";
    tarjetas.forEach((t) => caja.append(t));
  } catch (e) {
    console.error(e);
    caja.innerHTML = `<div class="vacio">No pudimos leer el contrato: ${traducirError(e)}</div>`;
  }
}

async function tarjetaProyecto(id) {
  const p = await leer("proyecto", sv.u32(id));
  const estado = Number(p.estado);
  let mia = 0n, voto = false;
  if (cuenta) {
    mia = BigInt(await leer("participacion", sv.u32(id), sv.address(cuenta)));
    voto = await leer("ya_voto", sv.u32(id), sv.address(cuenta));
  }
  const esDueno = cuenta && p.dueno === cuenta;
  const pct = Number((BigInt(p.recaudado) * 100n) / BigInt(p.meta));
  const vence = new Date(Number(p.plazo) * 1000).toLocaleDateString("es-AR");
  const actual = Number(p.hito_actual);

  const t = document.createElement("article");
  t.className = "tarjeta";
  t.innerHTML = `
    <span class="estado e${estado}">${ESTADOS[estado]}</span>
    <h3>${escapar(p.titulo)}</h3>
    <div class="meta-linea"><span>${aMoneda(p.recaudado)} de ${aMoneda(p.meta)} ${CONFIG.moneda}</span><span>${pct}% · cierra ${vence}</span></div>
    <div class="barra"><i style="width:${Math.min(pct, 100)}%"></i></div>
    <ol class="hitos">${p.hitos.map((h, i) => {
      const clase = h.liberado ? "hecho" : (estado === 1 && i === actual ? "actual" : "");
      const votos = estado === 1 && i === actual ? `<span class="votos">👍 ${pctDe(h.a_favor, p.recaudado)}% · 👎 ${pctDe(h.en_contra, p.recaudado)}%</span>` : "";
      return `<li class="${clase}"><span>${i + 1}. ${escapar(h.descripcion)} · <b>${aMoneda(h.monto)}</b></span>${votos}</li>`;
    }).join("")}</ol>
    <div class="meta-linea"><span>Dueño: ${corto(p.dueno)}${esDueno ? " (vos)" : ""}</span><span>Liberado: ${aMoneda(p.liberado)}</span></div>
    ${mia > 0n ? `<div class="mio">Tu participación: ${aMoneda(mia)} ${CONFIG.moneda} (${pctDe(mia, p.recaudado || 1)}% del voto)</div>` : ""}
    <div class="acciones"></div>`;

  const acc = t.querySelector(".acciones");
  const boton = (texto, clase, fn, ok) => { const b = document.createElement("button"); b.textContent = texto; b.className = `chico ${clase}`; b.onclick = () => accion(b, fn, ok); acc.append(b); return b; };

  if (estado === 0) {
    const input = document.createElement("input");
    input.type = "number"; input.min = "0"; input.step = "0.1"; input.placeholder = `Monto en ${CONFIG.moneda}`; input.className = "monto"; input.style.maxWidth = "150px";
    acc.append(input);
    boton("Aportar", "", async () => {
      if (!input.value) throw new Error("Ingresá un monto.");
      await escribir("aportar", sv.u32(id), sv.address(cuenta), sv.i128(aUnidades(input.value)));
    }, "¡Aporte confirmado en Stellar!");
  }
  if (estado === 1 && mia > 0n && !voto) {
    boton("Aprobar etapa", "", () => escribir("votar", sv.u32(id), sv.address(cuenta), sv.bool(true)), "Voto registrado.");
    boton("Rechazar", "peligro", () => escribir("votar", sv.u32(id), sv.address(cuenta), sv.bool(false)), "Voto registrado.");
  }
  if (estado === 1 && esDueno) boton("Cobrar etapa", "sec", () => escribir("liberar", sv.u32(id)), "Etapa cobrada.");
  const vencido = estado === 0 && Date.now() / 1000 > Number(p.plazo);
  if ((estado === 3 || vencido) && mia > 0n) boton("Pedir reembolso", "sec", () => escribir("reembolsar", sv.u32(id), sv.address(cuenta)), "Reembolso enviado.");
  if (!cuenta) acc.innerHTML = `<span class="cuenta">Conectá Freighter para aportar o votar.</span>`;
  return t;
}

const pctDe = (a, b) => Number((BigInt(a) * 100n) / BigInt(b || 1));
const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- formulario ----------
function agregarHito(desc = "", monto = "") {
  const fila = document.createElement("div");
  fila.className = "fila";
  fila.innerHTML = `<input class="desc" placeholder="Qué se entrega en esta etapa" value="${escapar(desc)}" required maxlength="80">
    <input class="monto" type="number" min="0.1" step="0.1" placeholder="${CONFIG.moneda}" value="${monto}" required>
    <button type="button" class="sec chico" title="Quitar">✕</button>`;
  fila.querySelector("button").onclick = () => { if ($("hitosForm").children.length > 1) { fila.remove(); total(); } };
  fila.querySelector(".monto").oninput = total;
  $("hitosForm").append(fila);
  total();
}

function total() {
  const suma = [...document.querySelectorAll("#hitosForm .monto")].reduce((s, i) => s + (Number(i.value) || 0), 0);
  $("totalMeta").textContent = `Meta: ${suma.toLocaleString("es-AR")} ${CONFIG.moneda}`;
}

$("formCrear").onsubmit = (ev) => {
  ev.preventDefault();
  const f = ev.target;
  const filas = [...document.querySelectorAll("#hitosForm .fila")];
  const plazo = Math.floor(Date.now() / 1000) + Number(f.dias.value) * 86400;
  const boton = f.querySelector('button[type="submit"]');
  accion(boton, () => escribir("crear_proyecto",
    sv.address(cuenta),
    sv.str(f.titulo.value.trim()),
    sv.u64(plazo),
    sv.vec(filas.map((r) => sv.str(r.querySelector(".desc").value.trim()))),
    sv.vec(filas.map((r) => sv.i128(aUnidades(r.querySelector(".monto").value)))),
  ), "¡Proyecto publicado en Stellar!").then(() => f.reset());
};

$("btnHito").onclick = () => agregarHito();
$("btnConectar").onclick = conectar;
$("btnFondear").onclick = fondear;
$("btnRecargar").onclick = cargarProyectos;
agregarHito("Prototipo funcionando", "50");
agregarHito("Primeros 100 usuarios", "50");
cargarProyectos();
