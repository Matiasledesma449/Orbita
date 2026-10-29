// Globo de puntos para el Inicio: continentes en puntitos naranjas, arcos que salen de
// Argentina hacia el mundo (estudiantes de acá, inversores de cualquier país).
// No usa librerías ni datos externos: los continentes son contornos simplificados.

const CONTINENTES = [
  // América del Norte
  [[-168,66],[-162,70],[-140,70],[-125,70],[-95,72],[-80,73],[-62,60],[-56,52],[-66,45],[-70,42],[-76,35],[-81,30],[-80,25],[-82,27],[-84,30],[-90,29],[-97,27],[-97,22],[-94,18],[-88,21],[-87,15],[-83,10],[-79,8],[-82,8],[-86,12],[-92,15],[-105,20],[-110,24],[-112,30],[-117,32],[-121,36],[-124,40],[-124,48],[-130,55],[-140,59],[-152,58],[-158,56],[-165,60]],
  // Groenlandia
  [[-73,78],[-60,82],[-30,83],[-20,75],[-22,70],[-40,65],[-44,60],[-52,64],[-58,70],[-68,76]],
  // América del Sur
  [[-80,9],[-75,11],[-62,11],[-52,5],[-50,0],[-44,-2],[-35,-5],[-35,-9],[-39,-14],[-41,-22],[-48,-26],[-53,-34],[-58,-38],[-62,-39],[-65,-42],[-66,-47],[-69,-51],[-68,-55],[-73,-53],[-75,-46],[-73,-38],[-71,-30],[-70,-18],[-76,-14],[-81,-6],[-80,-2],[-78,2],[-77,8]],
  // Europa y Asia
  [[-10,36],[-9,43],[-2,44],[-5,48],[2,51],[5,53],[8,57],[5,62],[14,68],[25,71],[40,68],[45,68],[60,70],[70,73],[80,73],[100,77],[115,74],[130,72],[140,72],[160,70],[170,70],[180,66],[178,62],[163,59],[162,54],[156,51],[155,58],[142,59],[135,54],[141,48],[130,42],[127,39],[129,35],[126,35],[122,40],[119,38],[122,31],[120,25],[115,22],[108,21],[106,17],[109,12],[105,9],[100,13],[100,7],[103,1],[98,8],[98,16],[94,17],[92,22],[87,22],[80,15],[77,8],[73,16],[72,21],[66,25],[57,26],[56,24],[59,22],[52,16],[44,12],[42,15],[39,21],[35,28],[34,31],[36,35],[30,36],[27,37],[26,40],[23,40],[22,37],[19,42],[14,45],[12,44],[18,40],[15,38],[10,44],[5,43],[3,42],[-1,37],[-6,36]],
  // África
  [[-17,21],[-13,28],[-9,32],[-6,36],[0,36],[10,37],[11,33],[20,31],[25,32],[32,31],[34,28],[38,22],[43,12],[51,12],[48,5],[41,-2],[40,-11],[35,-20],[33,-27],[27,-34],[20,-35],[17,-29],[12,-17],[13,-8],[9,-1],[9,4],[5,6],[-4,5],[-8,4],[-13,8],[-17,14]],
  // Australia
  [[114,-22],[114,-34],[118,-35],[124,-34],[131,-31],[138,-35],[141,-38],[147,-38],[150,-37],[153,-31],[153,-25],[146,-19],[142,-11],[136,-12],[136,-15],[130,-12],[125,-15],[122,-18]],
  // Islas grandes
  [[-5,50],[1,51],[2,53],[-1,55],[-2,58],[-5,58],[-6,56],[-3,54],[-5,52]],
  [[-24,64],[-14,64],[-14,66.5],[-22,66.5]],
  [[130,31],[135,34],[140,35],[142,40],[141,45],[144,44],[140,41],[136,37],[132,34]],
  [[109,1],[110,-3],[116,-4],[119,1],[117,7],[113,3]],
  [[95,5],[98,4],[104,-2],[106,-6],[102,-4],[97,1]],
  [[131,-1],[141,-2],[150,-6],[147,-9],[141,-9],[137,-5]],
  [[44,-25],[47,-25],[50,-15],[49,-12],[44,-17]],
  [[172,-34],[178,-38],[174,-41],[167,-46],[172,-42]],
  [[120,18],[122,18],[126,7],[122,7]],
];

// Corrientes y Buenos Aires hacia el mundo
const ORIGENES = [[-58.8, -27.5], [-58.4, -34.6]];
const DESTINOS = [[-3.7, 40.4], [-74, 40.7], [-46.6, -23.5], [-99.1, 19.4], [-0.1, 51.5], [13.4, 52.5], [-122.4, 37.8], [-70.6, -33.4], [-74.1, 4.7], [3.4, 6.5], [18.4, -33.9]];

const RAD = Math.PI / 180;

function dentro([lon, lat], poli) {
  let si = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) si = !si;
  }
  return si;
}

function puntosDeTierra(paso) {
  const lista = [];
  for (let lat = -58; lat <= 82; lat += paso) {
    const pasoLon = paso / Math.max(Math.cos(lat * RAD), 0.2);
    for (let lon = -180; lon < 180; lon += pasoLon) {
      if (CONTINENTES.some((p) => dentro([lon, lat], p))) lista.push(aVector(lon, lat));
    }
  }
  return lista;
}

function aVector(lon, lat) {
  const l = lon * RAD, f = lat * RAD;
  return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)];
}

function arco(a, b, n = 90) {
  const va = aVector(...a), vb = aVector(...b);
  const ang = Math.acos(Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const s = Math.sin(ang) || 1;
  const puntos = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const k1 = Math.sin((1 - t) * ang) / s, k2 = Math.sin(t * ang) / s;
    const alto = 1 + Math.sin(Math.PI * t) * (0.03 + ang * 0.035);
    puntos.push([(k1 * va[0] + k2 * vb[0]) * alto, (k1 * va[1] + k2 * vb[1]) * alto, (k1 * va[2] + k2 * vb[2]) * alto]);
  }
  return puntos;
}

export function iniciarGlobo(lienzo) {
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tierra = puntosDeTierra(1.05);
  const arcos = [];
  DESTINOS.forEach((d, i) => arcos.push({ puntos: arco(ORIGENES[i % 2], d), fase: i / DESTINOS.length }));
  const nodos = [...ORIGENES, ...DESTINOS].map((p, i) => ({ v: aVector(...p), origen: i < ORIGENES.length }));

  let ancho = 0, alto = 0, dpr = 1, giro = -22, cuadro = 0;
  const inclinacion = -31 * RAD; // Argentina queda cerca del centro y los arcos suben hacia el norte
  const ci = Math.cos(inclinacion), si = Math.sin(inclinacion);
  let fondo = null;   // halo + esfera: se dibujan una sola vez por tamaño de pantalla
  let chispa = null;  // brillo redondo ya dibujado, se reutiliza para la luz que viaja y las ciudades
  const NIVELES = 6;  // los puntos de tierra se agrupan por brillo para dibujarlos de a montones

  function medir() {
    const r = lienzo.getBoundingClientRect();
    ancho = r.width; alto = r.height;
    // resolución limitada: el globo es grande y no hace falta más para que se vea nítido
    dpr = Math.min(devicePixelRatio || 1, 1.5, 2600 / Math.max(ancho, 1));
    lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    prepararFondo();
  }

  function prepararFondo() {
    const R = ancho * 0.40, cx = ancho / 2, cy = alto / 2;
    fondo = document.createElement("canvas");
    fondo.width = lienzo.width; fondo.height = lienzo.height;
    const f = fondo.getContext("2d");
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    const halo = f.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.15);
    halo.addColorStop(0, "rgba(255,107,26,0.35)"); halo.addColorStop(0.35, "rgba(255,107,26,0.12)"); halo.addColorStop(1, "rgba(255,107,26,0)");
    f.fillStyle = halo; f.beginPath(); f.arc(cx, cy, R * 1.15, 0, Math.PI * 2); f.fill();
    const esfera = f.createRadialGradient(cx, cy - R * 0.55, R * 0.1, cx, cy, R);
    esfera.addColorStop(0, "#2a1a12"); esfera.addColorStop(0.6, "#151312"); esfera.addColorStop(1, "#0d0d0f");
    f.fillStyle = esfera; f.beginPath(); f.arc(cx, cy, R, 0, Math.PI * 2); f.fill();
    f.strokeStyle = "rgba(255,150,90,0.45)"; f.lineWidth = 1.2; f.stroke();

    chispa = document.createElement("canvas");
    const c = 64; chispa.width = chispa.height = c;
    const g = chispa.getContext("2d");
    const brillo = g.createRadialGradient(c / 2, c / 2, 0, c / 2, c / 2, c / 2);
    brillo.addColorStop(0, "rgba(255,240,225,1)"); brillo.addColorStop(0.12, "rgba(255,200,150,0.95)");
    brillo.addColorStop(0.35, "rgba(255,107,26,0.45)"); brillo.addColorStop(1, "rgba(255,107,26,0)");
    g.fillStyle = brillo; g.fillRect(0, 0, c, c);
  }

  function dibujar(t) {
    if (!ancho || !fondo) return;
    const R = ancho * 0.40, cx = ancho / 2, cy = alto / 2;
    const g = giro * RAD, cg = Math.cos(g), sg = Math.sin(g);
    const proyectar = (x, y, z) => {
      const x1 = x * cg - z * sg, z1 = x * sg + z * cg;
      return [cx + x1 * R, cy - (y * ci - z1 * si) * R, y * si + z1 * ci];
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.drawImage(fondo, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // continentes: un solo trazo por nivel de brillo (miles de puntos en pocas llamadas)
    const tam = Math.max(1.3, R / 250);
    const caminos = Array.from({ length: NIVELES }, () => new Path2D());
    for (const p of tierra) {
      const x1 = p[0] * cg - p[2] * sg, z1 = p[0] * sg + p[2] * cg;
      const z = p[1] * si + z1 * ci;
      if (z <= 0.02) continue;
      const luz = Math.min(1, z * 1.3);
      const nivel = Math.min(NIVELES - 1, Math.floor(luz * NIVELES));
      const x = cx + x1 * R, y = cy - (p[1] * ci - z1 * si) * R, r = (tam / 2) * (0.7 + 0.3 * luz);
      caminos[nivel].rect(x - r, y - r, r * 2, r * 2); // a este tamaño un cuadradito se ve como un punto y es mucho más rápido
    }
    for (let n = 0; n < NIVELES; n++) {
      const luz = (n + 0.5) / NIVELES;
      ctx.fillStyle = `rgba(255,${125 + Math.round(75 * luz)},${80 + Math.round(70 * luz)},${(0.22 + 0.7 * luz).toFixed(3)})`;
      ctx.fill(caminos[n]);
    }

    // arcos: un trazo ancho y suave abajo + uno fino arriba (brillo sin sombras pesadas)
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const luces = [];
    for (const a of arcos) {
      const pts = a.puntos.map((q) => proyectar(q[0], q[1], q[2]));
      const linea = new Path2D();
      let dibujando = false;
      for (const [x, y, z] of pts) {
        if (z > -0.05) { dibujando ? linea.lineTo(x, y) : linea.moveTo(x, y); dibujando = true; } else dibujando = false;
      }
      ctx.strokeStyle = "rgba(255,107,26,0.16)"; ctx.lineWidth = 5; ctx.stroke(linea);
      ctx.strokeStyle = "rgba(255,150,80,0.6)"; ctx.lineWidth = 1.3; ctx.stroke(linea);
      // la luz avanza suave: se ubica entre dos puntos del arco, no salta de uno a otro
      const k = ((t / 4200 + a.fase) % 1) * (pts.length - 1);
      const i = Math.floor(k), f = k - i, A = pts[i], B = pts[Math.min(i + 1, pts.length - 1)];
      const z = A[2] + (B[2] - A[2]) * f;
      if (z > 0) luces.push([A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, 22]);
    }

    // ciudades que laten
    for (const n of nodos) {
      const [x, y, z] = proyectar(n.v[0], n.v[1], n.v[2]);
      if (z <= 0) continue;
      const pulso = (Math.sin(t / 520 + n.v[0] * 9) + 1) / 2;
      luces.push([x, y, (n.origen ? 34 : 22) * (0.85 + 0.3 * pulso)]);
    }
    ctx.globalCompositeOperation = "lighter";
    for (const [x, y, d] of luces) ctx.drawImage(chispa, x - d / 2, y - d / 2, d, d);
    ctx.globalCompositeOperation = "source-over";

  }

  function bucle(t) {
    cuadro = requestAnimationFrame(bucle);
    if (document.hidden || lienzo.offsetParent === null) return;
    giro = -22 + 14 * Math.sin(t / 26000); // vaivén suave entre América, Europa y África
    dibujar(t);
  }

  medir();
  addEventListener("resize", () => { medir(); dibujar(performance.now()); });
  if (quieto) dibujar(1200);
  else cuadro = requestAnimationFrame(bucle);
  return () => cancelAnimationFrame(cuadro);
}

const lienzo = document.getElementById("globo");
if (lienzo) iniciarGlobo(lienzo);

// Luz que gira alrededor de la palabra ÓRBITA: un anillo inclinado con una estela.
// Se dibuja en dos capas: la mitad de atrás pasa por detrás de las letras y la de adelante por delante.
export function iniciarAnilloTitulo(atras, frente) {
  const ca = atras.getContext("2d"), cf = frente.getContext("2d");
  if (!ca || !cf) return;
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, dpr = 1;
  const INCL = -7 * RAD, VUELTA = 9000, ESTELA = 26;
  // brillo de la luz ya dibujado una vez (se reutiliza en cada cuadro)
  const brillo = document.createElement("canvas"); brillo.width = brillo.height = 64;
  { const b = brillo.getContext("2d"), g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,245,235,0.95)"); g.addColorStop(0.2, "rgba(255,170,100,0.6)"); g.addColorStop(1, "rgba(255,107,26,0)");
    b.fillStyle = g; b.fillRect(0, 0, 64, 64); }

  let fijoA = null, fijoF = null, zona = null; // anillo ya dibujado y zona que ocupa la luz

  function medir() {
    const r = atras.getBoundingClientRect();
    w = r.width; h = r.height; dpr = Math.min(devicePixelRatio || 1, 1.5);
    for (const c of [atras, frente]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); }
    // el anillo no se mueve: se dibuja una vez (tenue atrás, un poco más visible adelante)
    [fijoA, fijoF] = [false, true].map((adelante) => {
      const c = document.createElement("canvas"); c.width = atras.width; c.height = atras.height;
      const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.beginPath(); let empezado = false;
      for (let i = 0; i <= 240; i++) {
        const [x, y, f] = punto((i / 240) * Math.PI * 2);
        if (f !== adelante) { empezado = false; continue; }
        empezado ? g.lineTo(x, y) : g.moveTo(x, y); empezado = true;
      }
      g.strokeStyle = adelante ? "rgba(255,170,110,0.45)" : "rgba(255,170,110,0.18)"; g.lineWidth = adelante ? 1.4 : 1; g.stroke();
      return c;
    });
    for (const [c, fijo] of [[ca, fijoA], [cf, fijoF]]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, atras.width, atras.height); c.drawImage(fijo, 0, 0); c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    zona = null;
  }
  const punto = (th) => {
    const ax = w * 0.47, ay = h * 0.2, x = Math.cos(th) * ax, y = Math.sin(th) * ay;
    return [w / 2 + x * Math.cos(INCL) - y * Math.sin(INCL), h * 0.56 + x * Math.sin(INCL) + y * Math.cos(INCL), Math.sin(th) > 0];
  };

  function dibujar(t) {
    if (!w || !fijoA) return;
    const th = (t / VUELTA) * Math.PI * 2;
    const pts = [];
    for (let k = ESTELA; k >= 0; k--) pts.push([...punto(th - k * 0.022), 1 - k / ESTELA]);
    // solo se repinta la zona donde estaba y donde está la luz
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const ahora = [x0 - 30, y0 - 30, x1 + 30, y1 + 30];
    const z = zona ? [Math.min(zona[0], ahora[0]), Math.min(zona[1], ahora[1]), Math.max(zona[2], ahora[2]), Math.max(zona[3], ahora[3])] : ahora;
    zona = ahora;
    const sx = Math.max(0, Math.floor(z[0] * dpr)), sy = Math.max(0, Math.floor(z[1] * dpr));
    const sw = Math.min(atras.width, Math.ceil(z[2] * dpr)) - sx, sh = Math.min(atras.height, Math.ceil(z[3] * dpr)) - sy;
    if (sw <= 0 || sh <= 0) return;
    for (const [c, fijo] of [[ca, fijoA], [cf, fijoF]]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(sx, sy, sw, sh); c.drawImage(fijo, sx, sy, sw, sh, sx, sy, sw, sh);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // la luz con su estela
    for (const [x, y, f, a] of pts) {
      const c = f ? cf : ca, r = 1.2 + 3.2 * a;
      c.fillStyle = `rgba(255,${150 + Math.round(90 * a)},${90 + Math.round(120 * a)},${(0.85 * a * a).toFixed(3)})`;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    const [x, y, f] = punto(th);
    (f ? cf : ca).drawImage(brillo, x - 26, y - 26, 52, 52);
  }

  function bucle(t) { requestAnimationFrame(bucle); if (!document.hidden && atras.offsetParent !== null) dibujar(t); }
  medir();
  addEventListener("resize", () => { medir(); dibujar(performance.now()); });
  if (quieto) dibujar(VUELTA * 0.15); else requestAnimationFrame(bucle);
}

const anilloAtras = document.getElementById("anilloAtras"), anilloFrente = document.getElementById("anilloFrente");
if (anilloAtras && anilloFrente) iniciarAnilloTitulo(anilloAtras, anilloFrente);
