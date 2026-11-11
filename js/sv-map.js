// Cantera JOB · Mapa 3D de El Salvador (rutas de entrega + selector de departamento)
// ES module autocontenido. Uso:
//   import { mountSVMap, zoneForDepartment, kmForDepartment } from './js/sv-map.js';
//   const map = mountSVMap(el, { mode: 'routes', onStats: s => ... });
// Three.js r160 + d3-geo vía jsDelivr (+esm reescribe 'three' a una sola instancia; no requiere import map).

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { Line2 } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/lines/Line2.js/+esm';
import { LineMaterial } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/lines/LineMaterial.js/+esm';
import { LineGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/lines/LineGeometry.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import { geoMercator } from 'https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/+esm';

/* ------------------------------------------------------------------ */
/* Datos comerciales (horneados desde OSRM: km por carretera a la      */
/* cabecera departamental desde la cantera)                            */
/* ------------------------------------------------------------------ */
export const ZONES = {
  A: { id: 'A', label: 'Zona A', range: '0–15 km', flete: 20 },
  B: { id: 'B', label: 'Zona B', range: '15–30 km', flete: 30 },
  C: { id: 'C', label: 'Zona C', range: '30–45 km', flete: 40 },
  D: { id: 'D', label: 'Zona D', range: '+45 km', flete: null },
};

export const DEPARTMENTS = {
  'la-libertad':  { name: 'La Libertad',  capital: 'Santa Tecla',          km: 32.0,  minutes: 37,  zone: 'B' },
  'santa-ana':    { name: 'Santa Ana',    capital: 'Santa Ana',            km: 28.0,  minutes: 32,  zone: 'C' },
  'san-salvador': { name: 'San Salvador', capital: 'San Salvador',         km: 47.8,  minutes: 49,  zone: 'C' },
  'sonsonate':    { name: 'Sonsonate',    capital: 'Sonsonate',            km: 56.7,  minutes: 57,  zone: 'D' },
  'ahuachapan':   { name: 'Ahuachapán',   capital: 'Ahuachapán',           km: 58.2,  minutes: 56,  zone: 'D' },
  'cuscatlan':    { name: 'Cuscatlán',    capital: 'Cojutepeque',          km: 78.9,  minutes: 76,  zone: 'D' },
  'la-paz':       { name: 'La Paz',       capital: 'Zacatecoluca',         km: 96.3,  minutes: 107, zone: 'D' },
  'san-vicente':  { name: 'San Vicente',  capital: 'San Vicente',          km: 101.9, minutes: 98,  zone: 'D' },
  'chalatenango': { name: 'Chalatenango', capital: 'Chalatenango',         km: 105.8, minutes: 100, zone: 'D' },
  'cabanas':      { name: 'Cabañas',      capital: 'Sensuntepeque',        km: 125.4, minutes: 130, zone: 'D' },
  'usulutan':     { name: 'Usulután',     capital: 'Usulután',             km: 153.3, minutes: 174, zone: 'D' },
  'san-miguel':   { name: 'San Miguel',   capital: 'San Miguel',           km: 177.8, minutes: 168, zone: 'D' },
  'morazan':      { name: 'Morazán',      capital: 'San Francisco Gotera', km: 207.3, minutes: 194, zone: 'D' },
  'la-union':     { name: 'La Unión',     capital: 'La Unión',             km: 223.1, minutes: 206, zone: 'D' },
};

/** Zona comercial (A/B/C/D) del departamento, o null si no existe. */
export function zoneForDepartment(id) { return DEPARTMENTS[id]?.zone ?? null; }
/** Km aproximados por carretera desde la cantera a la cabecera del departamento. */
export function kmForDepartment(id) { return DEPARTMENTS[id]?.km ?? null; }
/** Flete por viaje en USD para la zona (null = cotizar). */
export function fleteForZone(z) { return ZONES[z]?.flete ?? null; }

/* ------------------------------------------------------------------ */
const C = {
  ink: '#0b1118', navy: '#101b27', steel: '#1b2a3a', brand: '#2463d0', blueLight: '#4d8df5',
  cyan: '#7cc4ff', amber: '#e09a3e', stone: '#e9e6e1',
};
const FONT_UI = `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`;
const FONT_H = `'Archivo', 'Inter', system-ui, sans-serif`;
const FONT_MONO = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`;

const MAP_W = 100;          // ancho del país en unidades de mundo
const DEPTH = 2.4;          // altura de extrusión
const BEVEL = 0.1;
const TOP = DEPTH + BEVEL;  // y de la cara superior
const GAP = 0.11;           // medio-hueco entre departamentos

const fmtFlete = (z) => (ZONES[z]?.flete ? `$${ZONES[z].flete}` : 'Cotizar');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
// Aditivo que no escribe alfa: la luz se suma sobre el fondo del host (canvas transparente)
const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

/* ------------------------------------------------------------------ */
/* Estilos (scoped svm-)                                               */
/* ------------------------------------------------------------------ */
const STYLE_ID = 'svm-styles-v1';
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
.svm-root{position:absolute;inset:0;overflow:hidden;font-family:${FONT_UI};-webkit-font-smoothing:antialiased;color:#fff;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.svm-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:pan-y}
.svm-root.svm-hot canvas{cursor:pointer}
.svm-layer{position:absolute;inset:0;pointer-events:none;contain:layout style}
.svm-lbl{position:absolute;left:0;top:0;white-space:nowrap;will-change:transform,opacity;transition:opacity .35s ease;opacity:0}
.svm-lbl.svm-on{opacity:1}
.svm-dept{font:600 9.5px/1 ${FONT_UI};letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42);text-shadow:0 1px 6px rgba(5,10,16,.9)}
.svm-dept.svm-strong{color:rgba(255,255,255,.88)}
.svm-dest{font:500 11px/1 ${FONT_UI};color:rgba(255,255,255,.78);text-shadow:0 1px 8px rgba(5,10,16,.95);padding-left:2px}
.svm-dest.svm-hl{color:#fff}
.svm-q{display:flex;align-items:center;gap:8px;padding:7px 11px 7px 9px;border-radius:999px;background:rgba(11,17,24,.78);border:1px solid rgba(224,154,62,.45);box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 0 4px rgba(224,154,62,.06);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:500 12px/1 ${FONT_UI};color:rgba(255,255,255,.72)}
.svm-q b{font:700 12.5px/1 ${FONT_H};color:#fff;letter-spacing:.01em}
.svm-q i{width:8px;height:8px;border-radius:50%;background:${C.amber};box-shadow:0 0 0 3px rgba(224,154,62,.25),0 0 12px ${C.amber};flex:none;animation:svm-blink 2.2s ease-in-out infinite}
.svm-anchor{display:flex;align-items:center;gap:7px;padding:5px 9px 5px 6px;border-radius:8px;background:rgba(11,17,24,.72);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:600 11px/1 ${FONT_UI};color:#fff}
.svm-anchor em{font-style:normal;font:700 8.5px/1 ${FONT_UI};letter-spacing:.14em;text-transform:uppercase;color:${C.ink};background:${C.amber};padding:4px 5px;border-radius:4px}
@keyframes svm-blink{0%,100%{box-shadow:0 0 0 3px rgba(224,154,62,.25),0 0 12px ${C.amber}}50%{box-shadow:0 0 0 6px rgba(224,154,62,.08),0 0 18px ${C.amber}}}
.svm-pop{position:absolute;left:0;top:0;pointer-events:none;opacity:0;transform:translate3d(-9999px,0,0);transition:opacity .18s ease;will-change:transform,opacity;z-index:5}
.svm-pop.svm-on{opacity:1}
.svm-card{min-width:228px;max-width:270px;padding:14px 15px 13px;border-radius:14px;background:linear-gradient(180deg,rgba(20,32,46,.92),rgba(11,17,24,.92));border:1px solid rgba(255,255,255,.1);box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.svm-k{font:600 9.5px/1 ${FONT_UI};letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:7px}
.svm-t{font:700 17px/1.15 ${FONT_H};color:#fff;margin-top:8px;letter-spacing:-.005em}
.svm-sub{font:500 11.5px/1.3 ${FONT_UI};color:${C.amber};margin-top:4px}
.svm-grid{display:grid;grid-template-columns:repeat(3,auto);gap:10px 16px;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.08)}
.svm-grid span{display:block;font:500 9.5px/1 ${FONT_UI};letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:6px}
.svm-grid b{font:600 14px/1 ${FONT_MONO};color:#fff;letter-spacing:-.02em}
.svm-grid b.svm-amber{color:${C.amber}}
.svm-chip{display:inline-flex;align-items:center;justify-content:center;font:700 9px/1 ${FONT_UI};letter-spacing:.12em;text-transform:uppercase;padding:4px 6px;border-radius:5px;color:#fff;background:rgba(77,141,245,.22);border:1px solid rgba(124,196,255,.35)}
.svm-chip.z-A{background:rgba(36,99,208,.55);border-color:rgba(124,196,255,.6)}
.svm-chip.z-B{background:rgba(36,99,208,.35)}
.svm-chip.z-C{background:rgba(77,141,245,.16)}
.svm-chip.z-D{background:rgba(224,154,62,.16);border-color:rgba(224,154,62,.45);color:#f3c88d}
.svm-tip{padding:10px 12px 10px;border-radius:11px;background:rgba(11,17,24,.88);border:1px solid rgba(255,255,255,.1);box-shadow:0 12px 34px rgba(0,0,0,.5);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);min-width:170px}
.svm-tip .svm-t{font-size:14.5px;margin-top:6px}
.svm-row{display:flex;align-items:center;gap:8px;margin-top:8px;font:500 11.5px/1 ${FONT_UI};color:rgba(255,255,255,.6)}
.svm-mono{font-family:${FONT_MONO};color:#fff;font-size:12px}
.svm-row .svm-amber{color:${C.amber};font-family:${FONT_MONO};font-size:12px}
.svm-hint{margin-top:8px;font:500 10.5px/1 ${FONT_UI};color:rgba(124,196,255,.85)}
@media (max-width:640px){.svm-card{min-width:200px;padding:12px 13px}.svm-t{font-size:15px}.svm-grid b{font-size:13px}.svm-q{font-size:11px;padding:6px 9px 6px 8px}.svm-q b{font-size:11.5px}}
@media (prefers-reduced-motion:reduce){.svm-q i{animation:none}.svm-lbl,.svm-pop{transition:none}}
`;
  document.head.appendChild(s);
}

/* ------------------------------------------------------------------ */
/* Geometría 2D                                                        */
/* ------------------------------------------------------------------ */
function cleanRing(ring) {
  const out = [];
  for (const p of ring) {
    const l = out[out.length - 1];
    if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > 1e-4) out.push(p);
  }
  const f = out[0], l = out[out.length - 1];
  if (out.length > 1 && Math.hypot(f[0] - l[0], f[1] - l[1]) < 1e-4) out.pop();
  return out;
}
function signedArea(r) {
  let a = 0;
  for (let i = 0, n = r.length; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}
// Desplazamiento hacia adentro con inglete limitado (sirve para huecos entre losas)
function insetRing(r, d) {
  const n = r.length, s = signedArea(r) > 0 ? 1 : -1, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n], b = r[i], c = r[(i + 1) % n];
    let e1x = b[0] - a[0], e1y = b[1] - a[1], e2x = c[0] - b[0], e2y = c[1] - b[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    const n1x = -e1y * s, n1y = e1x * s, n2x = -e2y * s, n2y = e2x * s;
    let bx = n1x + n2x, by = n1y + n2y; const bl = Math.hypot(bx, by);
    if (bl < 1e-6) { bx = n1x; by = n1y; } else { bx /= bl; by /= bl; }
    const cosH = Math.max(bx * n1x + by * n1y, 0.4);
    const len = d / cosH;
    out[i] = [b[0] + bx * len, b[1] + by * len];
  }
  return out;
}
function centroid(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const p = r[i], q = r[(i + 1) % n], f = p[0] * q[1] - q[0] * p[1];
    a += f; cx += (p[0] + q[0]) * f; cy += (p[1] + q[1]) * f;
  }
  a /= 2; return [cx / (6 * a), cy / (6 * a)];
}

// Cinta plana (ribbon) sobre el plano XZ para las rutas
function ribbonGeometry(pts, width) {
  const n = pts.length, cum = new Float32Array(n);
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const total = cum[n - 1] || 1, hw = width / 2;
  const pos = new Float32Array(n * 2 * 3), aT = new Float32Array(n * 2), aSide = new Float32Array(n * 2), aD = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    // normal promedio de los dos segmentos (inglete limitado)
    let nx = 0, nz = 0;
    const seg = (u, v) => { const dx = v[0] - u[0], dz = v[1] - u[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
    if (i > 0) { const s = seg(a, p); nx += s[0]; nz += s[1]; }
    if (i < n - 1) { const s = seg(p, b); nx += s[0]; nz += s[1]; }
    let l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    let m = 1;
    if (i > 0 && i < n - 1) { const s = seg(p, b); m = 1 / Math.max(0.55, nx * s[0] + nz * s[1]); }
    for (let k = 0; k < 2; k++) {
      const sd = k === 0 ? -1 : 1, j = i * 2 + k;
      pos[j * 3] = p[0] + nx * hw * m * sd; pos[j * 3 + 1] = 0; pos[j * 3 + 2] = p[1] + nz * hw * m * sd;
      aT[j] = cum[i] / total; aSide[j] = sd; aD[j] = cum[i];
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aSide', new THREE.BufferAttribute(aSide, 1));
  g.setAttribute('aD', new THREE.BufferAttribute(aD, 1));
  g.setIndex(idx);
  return { geometry: g, cum, total };
}

// Fusiona cajas/cilindros coloreados en un solo BufferGeometry (camión low-poly)
function mergeColored(parts) {
  const P = [], N = [], Cc = [];
  for (const { geo, color } of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const col = new THREE.Color(color);
    const p = g.attributes.position.array, nn = g.attributes.normal.array;
    for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(nn[i]); }
    for (let i = 0; i < p.length / 3; i++) Cc.push(col.r, col.g, col.b);
    g.dispose(); if (g !== geo) geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  return out;
}
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return g; }
const TRUCK_DARK = { chassis: '#2a3542', cab: C.stone, glass: '#8fd0ff', roof: '#ffffff', bedFloor: '#b46f22', bedSide: C.amber, bedBack: '#c9852f', bedFront: '#d38d34', wheel: '#0d1117', load: '#cfc7b8' };
function truckGeometries(pal = TRUCK_DARK) {
  // local: +x adelante, y arriba, largo ≈ 1
  const body = [
    { geo: box(1.0, 0.1, 0.36, 0, 0.13, 0), color: pal.chassis },            // chasis
    { geo: box(0.27, 0.27, 0.37, 0.36, 0.32, 0), color: pal.cab },           // cabina
    { geo: box(0.03, 0.12, 0.31, 0.5, 0.36, 0), color: pal.glass },          // parabrisas
    { geo: box(0.2, 0.05, 0.38, 0.37, 0.47, 0), color: pal.roof },           // techo
    { geo: box(0.62, 0.05, 0.4, -0.15, 0.2, 0), color: pal.bedFloor },       // piso de tolva
    { geo: box(0.62, 0.22, 0.04, -0.15, 0.32, 0.18), color: pal.bedSide },   // laterales
    { geo: box(0.62, 0.22, 0.04, -0.15, 0.32, -0.18), color: pal.bedSide },
    { geo: box(0.04, 0.22, 0.4, -0.45, 0.32, 0), color: pal.bedBack },
    { geo: box(0.05, 0.28, 0.4, 0.15, 0.35, 0), color: pal.bedFront },       // frente tolva
  ];
  for (const x of [0.33, -0.12, -0.33]) for (const z of [0.17, -0.17]) {
    const w = new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10); w.rotateX(Math.PI / 2); w.translate(x, 0.085, z);
    body.push({ geo: w, color: pal.wheel });
  }
  const loadG = new THREE.CylinderGeometry(0.0, 0.26, 0.16, 6, 1); loadG.scale(1.25, 1, 0.7); loadG.translate(-0.15, 0.48, 0);
  const load = mergeColored([{ geo: loadG, color: pal.load }]);
  return { body: mergeColored(body), load };
}

/* ------------------------------------------------------------------ */
/* Shaders                                                             */
/* ------------------------------------------------------------------ */
const ROUTE_VS = `
attribute float aT; attribute float aSide; attribute float aD;
varying float vT; varying float vSide; varying float vD;
void main(){ vT=aT; vSide=aSide; vD=aD; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const ROUTE_FS = `
uniform float uTime; uniform float uDraw; uniform float uOpacity; uniform float uHl; uniform float uMotion; uniform float uLen; uniform float uPhase;
uniform vec3 uCol; uniform vec3 uPulse;
varying float vT; varying float vSide; varying float vD;
void main(){
  if (vT > uDraw) discard;
  float s = abs(vSide);
  float cw = mix(0.34, 0.5, uHl);
  float core = 1.0 - smoothstep(cw*0.55, cw, s);
  float glow = exp(-s*s*mix(5.0, 3.0, uHl));
  float p = fract(vD/7.0 - uTime*0.42 + uPhase);
  float pulse = pow(p, 14.0) * uMotion;
  float head = uDraw < 0.999 ? exp(-max(uDraw - vT, 0.0)*uLen*0.9) : 0.0;
  float start = smoothstep(0.0, 1.2, vD); // se funde al salir de la cantera
  vec3 col = uCol*(core*0.62 + glow*0.14)*(1.0+uHl*1.1)
           + uPulse*pulse*(core*1.5 + glow*0.5)
           + vec3(1.0,0.86,0.62)*head*(core*1.8+glow*0.8);
  gl_FragColor = vec4(col*uOpacity*mix(0.35,1.0,start), 1.0);
}`;
const RING_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const RING_FS = `
uniform float uTime; uniform float uSpeed; uniform float uPhase; uniform vec3 uCol; uniform float uOpacity; uniform float uCount; uniform float uCore;
varying vec2 vUv;
void main(){
  float d = length(vUv-0.5)*2.0;
  float a = 0.0;
  for (int i=0;i<3;i++){
    if (float(i) >= uCount) break;
    float r = fract(uTime*uSpeed + uPhase + float(i)/uCount);
    float w = 0.035 + r*0.03;
    a += (1.0 - smoothstep(0.0, w, abs(d - r))) * pow(1.0 - r, 1.6);
  }
  a += exp(-d*d*28.0)*uCore;
  a *= 1.0 - smoothstep(0.92, 1.0, d);
  gl_FragColor = vec4(uCol*a*uOpacity, 1.0);
}`;
const GLOW_FS = `
uniform vec3 uCol; uniform float uOpacity; uniform float uPow; varying vec2 vUv;
void main(){ float d = length(vUv-0.5)*2.0; float a = pow(max(1.0-d,0.0), uPow); gl_FragColor = vec4(uCol*a*uOpacity,1.0); }`;
const BEAM_FS = `
uniform vec3 uCol; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
void main(){
  float a = pow(1.0 - vUv.y, 2.2);
  float flick = 0.85 + 0.15*sin(uTime*3.0 + vUv.y*14.0);
  float edge = 1.0 - abs(vUv.x*2.0-1.0);
  gl_FragColor = vec4(uCol*a*flick*uOpacity*(0.35+0.65*edge),1.0);
}`;
const HALO_VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }`;
const GRID_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const GRID_FS = `
uniform float uOpacity; uniform vec3 uCol; varying vec3 vW;
void main(){
  vec2 g = vW.xz/5.0; vec2 f = abs(fract(g-0.5)-0.5)/fwidth(g);
  float line = 1.0 - min(min(f.x,f.y),1.0);
  vec2 G = vW.xz/25.0; vec2 F = abs(fract(G-0.5)-0.5)/fwidth(G);
  float major = 1.0 - min(min(F.x,F.y),1.0);
  float fade = exp(-length(vW.xz*vec2(0.85,1.25))/52.0);
  gl_FragColor = vec4(uCol*(line*0.35+major*0.6)*fade*uOpacity,1.0);
}`;

/* ------------------------------------------------------------------ */
/* mountSVMap                                                          */
/* ------------------------------------------------------------------ */
/**
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {'routes'|'select'} [options.mode='routes']
 * @param {'dark'|'light'} [options.theme='dark']  'light' (sólo mode 'routes'): estilo Martin Marietta sobre fondo claro; añade showDestination()/listDestinations()
 * @param {string} [options.geoUrl]      GeoJSON de departamentos (default ../data/sv-departamentos.geojson relativo a este módulo)
 * @param {string} [options.routesUrl]   rutas.json (default ../data/rutas.json)
 * @param {boolean} [options.intro=true] animación de entrada automática al ser visible por primera vez
 * @param {boolean} [options.labels=true]
 * @param {number}  [options.trucks]     cantidad de camiones (default 30 desktop / 12 móvil)
 * @param {string}  [options.selected]   id de departamento preseleccionado (modo select)
 * @param {(s:{routes:number,km:number,trucksActive:number})=>void} [options.onStats]
 * @param {(d:{id:string,name:string,km_from_quarry_approx:number,zone:string,capital:string,flete:number|null})=>void} [options.onSelect]
 * @param {(ctrl:object)=>void} [options.onReady]
 */
export function mountSVMap(container, options = {}) {
  const opt = {
    mode: 'routes', intro: true, labels: true,
    geoUrl: new URL('../data/sv-departamentos.geojson', import.meta.url).href,
    routesUrl: new URL('../data/rutas.json', import.meta.url).href,
    ...options,
  };
  const MODE = opt.mode === 'select' ? 'select' : 'routes';
  if (opt.theme === 'light' && MODE === 'routes') return mountLight(container, opt);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const mobile = window.matchMedia?.('(max-width: 760px), (pointer: coarse)').matches ?? false;
  const motion = !reduced;

  injectStyles();
  if (!hasWebGL()) return mountFallback(container, opt, MODE);
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const root = document.createElement('div');
  root.className = 'svm-root svm-mode-' + MODE;
  const layer = document.createElement('div');
  layer.className = 'svm-layer';
  const pop = document.createElement('div');
  pop.className = 'svm-pop';
  layer.appendChild(pop);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxDpr = 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  root.appendChild(renderer.domElement);
  root.appendChild(layer);
  container.appendChild(root);
  renderer.domElement.setAttribute('aria-label', MODE === 'routes' ? 'Mapa 3D de rutas de entrega de Cantera JOB en El Salvador' : 'Mapa de El Salvador para seleccionar departamento');
  renderer.domElement.setAttribute('role', 'img');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(MODE === 'routes' ? 26 : 24, 1, 1, 2000);

  // Luces de estudio
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b1118, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(-38, 90, -30);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -64, right: 64, top: 44, bottom: -44, near: 10, far: 220 });
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7cc4ff, 0.9); rim.position.set(30, 25, -70); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe2bf, 0.35); fill.position.set(40, 30, 60); scene.add(fill);

  const world = new THREE.Group(); scene.add(world);
  const U = { uTime: { value: 0 }, uQ: { value: new THREE.Vector2() }, uMotion: { value: motion ? 1 : 0 } };

  // ---------- estado ----------
  const S = {
    ready: false, destroyed: false, visible: false, tabVisible: !document.hidden, raf: 0, last: 0, time: 0,
    introDone: false, introT: -1, deptIntroT: -1, focus: null, hoverDept: null, hoverRoute: null, selected: null,
    pointer: { x: 0, y: 0, nx: 0, ny: 0, inside: false, dirty: false, touch: false },
    parallax: { x: 0, y: 0 }, size: { w: 1, h: 1 }, statsKey: '', statsT: 0,
    pending: [],
  };
  const depts = new Map();      // id -> {id,name,group,caps,sides,edgeMat,meshes,lift,center,tier}
  const routes = [];            // {data, mesh, mat, pts, cum, total, draw, opacity, pin, labelIdx}
  const labels = [];            // {el, pos:Vector3, prio, kind, show, w, h, x, y, on}
  const trucks = [];
  let truckBody = null, truckLoad = null, truckHalo = null;
  const quarry = {};
  const disposables = [];
  let bbox = null, projection = null, center2 = [0, 0];
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), upY = new THREE.Vector3(0, 1, 0);

  const toXZ = (lon, lat) => { const p = projection([lon, lat]); return [p[0] - center2[0], p[1] - center2[1]]; };

  // ---------- materiales de departamento ----------
  const TIER_COLORS = MODE === 'routes'
    ? ['#2c6ce2', '#22529f', '#1d4177', '#19335b', '#162a45']
    : ['#1f3a5a', '#1d3654', '#1b324e', '#1a2f49', '#192c45'];
  function tierFor(id) {
    if (id === 'la-libertad') return 0;
    const km = DEPARTMENTS[id]?.km ?? 999;
    return km < 50 ? 1 : km < 60 ? 2 : km < 110 ? 3 : 4;
  }
  function makeCapMaterial(color) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.22 });
    const uHl = { value: 0 }, uSel = { value: 0 }, uDim = { value: 0 };
    m.userData = { uHl, uSel, uDim, base: new THREE.Color(color) };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uQ = U.uQ; sh.uniforms.uMotion = U.uMotion;
      sh.uniforms.uHl = m.userData.uHl; sh.uniforms.uSel = m.userData.uSel; sh.uniforms.uDim = m.userData.uDim;
      sh.uniforms.uSonar = { value: MODE === 'routes' ? 1 : 0.35 };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; uniform float uTime; uniform vec2 uQ; uniform float uMotion; uniform float uHl; uniform float uSel; uniform float uDim; uniform float uSonar;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec2 g = vWPos.xz;
          vec2 cell = fract(g / 1.25) - 0.5;
          float dotm = 1.0 - smoothstep(0.045, 0.1, length(cell));
          float dq = length(g - uQ);
          float heat = exp(-dq / 13.0);
          float w = fract(dq / 30.0 - uTime * 0.09);
          float sonar = pow(w, 160.0) * 0.8 * exp(-dq / 40.0) * uSonar * uMotion;
          vec3 glowC = vec3(0.30, 0.56, 1.0);
          totalEmissiveRadiance += glowC * (heat * 0.10 + sonar * 0.22) * (1.0 - uDim * 0.8);
          totalEmissiveRadiance += vec3(0.75, 0.88, 1.0) * dotm * (0.05 + uHl * 0.04) * (1.0 - uDim * 0.7);
          totalEmissiveRadiance += glowC * uHl * 0.07 + vec3(0.08, 0.26, 0.80) * uSel * 0.2;`);
    };
    m.customProgramCacheKey = () => 'svm-cap-' + MODE;
    return m;
  }
  function makeSideMaterial(color) {
    const c = new THREE.Color(color).multiplyScalar(0.42);
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.15, envMapIntensity: 0.35 });
    const uHl = { value: 0 }, uSel = { value: 0 };
    m.userData = { uHl, uSel, base: c.clone() };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHl = uHl; sh.uniforms.uSel = uSel;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vLy;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvLy = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vLy; uniform float uHl; uniform float uSel;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float topF = smoothstep(${(DEPTH * 0.35).toFixed(3)}, ${(DEPTH + BEVEL).toFixed(3)}, vLy);
          totalEmissiveRadiance += vec3(0.24,0.5,1.0) * topF * (0.08 + uHl*0.22 + uSel*0.45);`);
    };
    m.customProgramCacheKey = () => 'svm-side';
    return m;
  }

  // ---------- construcción ----------
  function build(geo, rdata) {
    const all = [];
    for (const f of geo.features) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      for (const p of polys) for (const c of p[0]) all.push(c);
    }
    projection = geoMercator().fitWidth(MAP_W, { type: 'MultiPoint', coordinates: all });
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const c of all) { const p = projection(c); minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    center2 = [(minX + maxX) / 2, (minY + maxY) / 2];
    bbox = { minX: minX - center2[0], maxX: maxX - center2[0], minZ: minY - center2[1], maxZ: maxY - center2[1] };
    const q = toXZ(rdata.origin.lon, rdata.origin.lat);
    U.uQ.value.set(q[0], q[1]);

    // Departamentos
    for (const f of geo.features) {
      const id = f.properties.id, name = f.properties.name || DEPARTMENTS[id]?.name || id;
      const tier = tierFor(id), color = TIER_COLORS[tier];
      const capMat = makeCapMaterial(color), sideMat = makeSideMaterial(color);
      const edgeMat = new LineMaterial({ color: new THREE.Color(C.cyan), linewidth: mobile ? 0.9 : 1.1, transparent: true, opacity: MODE === 'routes' ? 0.38 : 0.3, depthWrite: false });
      const group = new THREE.Group();
      group.userData.id = id;
      const meshes = [];
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      let bestArea = 0, labelPt = [0, 0];
      for (const poly of polys) {
        const ringXZ = cleanRing(poly[0].map((c) => toXZ(c[0], c[1])));
        if (ringXZ.length < 3) continue;
        const area = Math.abs(signedArea(ringXZ));
        const small = area < 3;
        const gap = small ? GAP * 0.35 : GAP;
        const ringShape = insetRing(ringXZ.map((p) => [p[0], -p[1]]), gap);
        const shape = new THREE.Shape(ringShape.map((p) => new THREE.Vector2(p[0], p[1])));
        const g = new THREE.ExtrudeGeometry(shape, small
          ? { depth: DEPTH, bevelEnabled: false, curveSegments: 1 }
          : { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: -BEVEL, bevelSegments: 2, curveSegments: 1 });
        if (small) g.translate(0, 0, BEVEL * 0.0);
        g.rotateX(-Math.PI / 2);
        disposables.push(g);
        const mesh = new THREE.Mesh(g, [capMat, sideMat]);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData.id = id;
        group.add(mesh); meshes.push(mesh);
        // borde superior
        const edgeRing = small ? ringShape : insetRing(ringShape, BEVEL);
        const yEdge = (small ? DEPTH : TOP) + 0.035;
        const ptsE = [];
        for (const p of edgeRing.concat([edgeRing[0]])) ptsE.push(p[0], yEdge, -p[1]);
        const lg = new LineGeometry(); lg.setPositions(ptsE);
        disposables.push(lg);
        const line = new Line2(lg, edgeMat); line.computeLineDistances(); line.renderOrder = 1;
        group.add(line);
        if (area > bestArea) { bestArea = area; labelPt = centroid(ringXZ); }
      }
      // Ajustes de etiqueta para formas alargadas
      const LABEL_NUDGE = { 'la-libertad': [0.6, 2.2], 'san-salvador': [0.4, -0.6], 'la-union': [-1.2, -0.6], 'usulutan': [0, -1.2], 'la-paz': [0, 0.5] };
      if (LABEL_NUDGE[id]) { labelPt[0] += LABEL_NUDGE[id][0]; labelPt[1] += LABEL_NUDGE[id][1]; }
      world.add(group);
      disposables.push(capMat, sideMat, edgeMat);
      const d = { id, name, group, capMat, sideMat, edgeMat, meshes, tier, lift: 0, liftT: 0, grow: 1, labelPt };
      depts.set(id, d);
      if (opt.labels) addLabel({ kind: 'dept', id, html: name, pos: new THREE.Vector3(labelPt[0], TOP + 0.2, labelPt[1]), prio: MODE === 'select' ? 60 : 20 });
    }
    // orden de crecimiento por distancia a la cantera
    const order = [...depts.values()].sort((a, b) => Math.hypot(a.labelPt[0] - q[0], a.labelPt[1] - q[1]) - Math.hypot(b.labelPt[0] - q[0], b.labelPt[1] - q[1]));
    order.forEach((d, i) => { d.growDelay = i * 0.07; });

    buildGround();
    buildQuarry(q, rdata.origin);
    if (MODE === 'routes') { buildRoutes(rdata); if (motion) buildTrucks(); }
  }

  function buildGround() {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), new THREE.ShadowMaterial({ opacity: 0.55, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -0.12; sh.receiveShadow = true; sh.renderOrder = -2;
    world.add(sh); disposables.push(sh.geometry, sh.material);
    const gridMat = new THREE.ShaderMaterial({
      vertexShader: GRID_VS, fragmentShader: GRID_FS, transparent: true, depthWrite: false, ...ADD,
      uniforms: { uOpacity: { value: MODE === 'routes' ? 0.16 : 0.1 }, uCol: { value: new THREE.Color(C.cyan) } },
    });
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(260, 180), gridMat);
    grid.rotation.x = -Math.PI / 2; grid.position.y = -0.16; grid.renderOrder = -3;
    world.add(grid); disposables.push(grid.geometry, gridMat);
    // halo azul bajo el país
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(150, 95), new THREE.ShaderMaterial({
      vertexShader: RING_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, ...ADD,
      uniforms: { uCol: { value: new THREE.Color('#1f5fd0') }, uOpacity: { value: 0.22 }, uPow: { value: 2.2 } },
    }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = -0.2; halo.renderOrder = -4;
    world.add(halo); disposables.push(halo.geometry, halo.material);
  }

  function addGlowPlane(size, color, opacity, pow) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
      vertexShader: RING_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, depthTest: false, ...ADD,
      uniforms: { uCol: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uPow: { value: pow } },
    }));
    m.rotation.x = -Math.PI / 2;
    disposables.push(m.geometry, m.material);
    return m;
  }
  function addRings(size, color, opacity, speed, count, core, phase = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
      vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, depthTest: false, ...ADD,
      uniforms: { uTime: U.uTime, uSpeed: { value: speed }, uPhase: { value: phase }, uCol: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uCount: { value: count }, uCore: { value: core } },
    }));
    m.rotation.x = -Math.PI / 2;
    disposables.push(m.geometry, m.material);
    return m;
  }

  function buildQuarry(q, origin) {
    const g = new THREE.Group(); g.position.set(q[0], TOP, q[1]);
    const glow = addGlowPlane(MODE === 'routes' ? 9 : 6, C.amber, 0.38, 2.8); glow.position.y = 0.06; glow.renderOrder = 4; g.add(glow);
    const rings = addRings(MODE === 'routes' ? 13 : 8, C.amber, motion ? 1.0 : 0.6, motion ? 0.32 : 0, 3, 0.9); rings.position.y = 0.08; rings.renderOrder = 4; g.add(rings);
    const hexG = new THREE.CylinderGeometry(0.62, 0.78, 0.55, 6); hexG.translate(0, 0.28, 0);
    const hexM = new THREE.MeshStandardMaterial({ color: C.amber, emissive: new THREE.Color(C.amber), emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.2 });
    const hex = new THREE.Mesh(hexG, hexM); hex.castShadow = true; g.add(hex);
    const capG = new THREE.CylinderGeometry(0.34, 0.5, 0.3, 6); capG.translate(0, 0.7, 0);
    const cap = new THREE.Mesh(capG, new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0.9, roughness: 0.3 }));
    g.add(cap);
    const beamH = MODE === 'routes' ? 9 : 5;
    const beamG = new THREE.CylinderGeometry(0.42, 0.42, beamH, 24, 1, true); beamG.translate(0, beamH / 2 + 0.3, 0);
    const beamM = new THREE.ShaderMaterial({
      vertexShader: RING_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false, ...ADD, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(C.amber) }, uOpacity: { value: 0.75 }, uTime: U.uTime },
    });
    const beam = new THREE.Mesh(beamG, beamM); beam.renderOrder = 5; g.add(beam);
    disposables.push(hexG, hexM, capG, cap.material, beamG, beamM);
    world.add(g);
    Object.assign(quarry, { group: g, hex, beam, beamM, rings, glow, pos: q });
    addLabel({ kind: 'quarry', html: `<div class="svm-q"><i></i><b>Cantera JOB</b><span>· Ciudad Arce</span></div>`, pos: new THREE.Vector3(q[0], TOP + (MODE === 'routes' ? 2.4 : 1.6), q[1]), prio: 1000, anchor: 'topleft' });
  }

  function buildRoutes(rdata) {
    const sorted = [...rdata.routes].sort((a, b) => a.km - b.km);
    sorted.forEach((r, i) => {
      const pts = r.coordinates.map((c) => toXZ(c[0], c[1]));
      const { geometry, cum, total } = ribbonGeometry(pts, mobile ? 1.15 : 0.95);
      const mat = new THREE.ShaderMaterial({
        vertexShader: ROUTE_VS, fragmentShader: ROUTE_FS, transparent: true, depthWrite: false, depthTest: false, ...ADD, side: THREE.DoubleSide,
        uniforms: {
          uTime: U.uTime, uMotion: U.uMotion, uDraw: { value: motion ? 0 : 1 }, uOpacity: { value: 1 }, uHl: { value: 0 },
          uLen: { value: total }, uPhase: { value: (i * 0.137) % 1 },
          uCol: { value: new THREE.Color(r.anchor ? '#9fd4ff' : C.blueLight) }, uPulse: { value: new THREE.Color(C.amber) },
        },
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.y = TOP + 0.06; mesh.renderOrder = 2;
      world.add(mesh); disposables.push(geometry, mat);
      // pin de destino
      const d = toXZ(r.dest[0], r.dest[1]);
      const end = pts[pts.length - 1];
      const pinPos = [end[0], end[1]];
      const pg = new THREE.Group(); pg.position.set(pinPos[0], TOP, pinPos[1]);
      const ring = addRings(r.anchor ? 5 : 3.2, r.anchor ? C.amber : C.cyan, r.anchor ? 0.9 : 0.55, motion ? (r.anchor ? 0.38 : 0.22) : 0, r.anchor ? 2 : 1, 0.8, (i * 0.31) % 1);
      ring.position.y = 0.07; ring.renderOrder = 3; pg.add(ring);
      const dotG = new THREE.SphereGeometry(r.anchor ? 0.3 : 0.2, 16, 12); dotG.translate(0, 0.32, 0);
      const dotM = new THREE.MeshBasicMaterial({ color: r.anchor ? '#ffd9a3' : '#e6f4ff' });
      const dot = new THREE.Mesh(dotG, dotM); pg.add(dot);
      disposables.push(dotG, dotM);
      world.add(pg);
      const startAt = 0.9 + i * 0.17;
      const drawDur = 0.55 + 1.1 * Math.sqrt(total / 70);
      const route = { data: r, mesh, mat, pts, cum, total, pin: pg, pinRing: ring, dot, startAt, drawDur, opacity: 1, hl: 0, drawn: !motion, dest: d };
      routes.push(route);
      if (opt.labels) {
        route.label = addLabel({
          kind: 'dest', id: r.id,
          html: r.anchor ? `<div class="svm-anchor"><em>Cliente ancla</em>Condado Quetzal</div>` : r.name,
          pos: new THREE.Vector3(pinPos[0], TOP + (r.anchor ? 0.8 : 0.5), pinPos[1]),
          prio: r.anchor ? 500 : (r.zone === 'D' && r.km > 60 ? 40 : 10), anchor: r.anchor ? 'topright' : 'right', route,
        });
      }
    });
  }

  function buildTrucks() {
    const n = opt.trucks ?? (mobile ? 12 : 30);
    // reparto: 1 por ruta, extras para el cliente ancla y rutas largas
    const assign = routes.map((r) => r);
    const anchor = routes.find((r) => r.data.anchor);
    const extra = [];
    if (anchor) extra.push(anchor, anchor);
    const long = [...routes].sort((a, b) => b.total - a.total);
    let k = 0;
    while (assign.length + extra.length < n) { extra.push(long[k % Math.min(8, long.length)]); k++; }
    const list = assign.concat(extra).slice(0, n);
    const geos = truckGeometries();
    disposables.push(geos.body, geos.load);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.15, emissive: new THREE.Color('#1a1408'), envMapIntensity: 0.9 });
    const lmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
    truckBody = new THREE.InstancedMesh(geos.body, mat, list.length);
    truckLoad = new THREE.InstancedMesh(geos.load, lmat, list.length);
    truckBody.castShadow = !mobile; truckBody.renderOrder = 6; truckLoad.renderOrder = 6;
    truckBody.frustumCulled = false; truckLoad.frustumCulled = false;
    const hg = new THREE.PlaneGeometry(1, 1); hg.rotateX(-Math.PI / 2);
    const hmat = new THREE.ShaderMaterial({
      vertexShader: HALO_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, depthTest: false, ...ADD,
      uniforms: { uCol: { value: new THREE.Color(C.amber) }, uOpacity: { value: 0.75 }, uPow: { value: 2.6 } },
    });
    truckHalo = new THREE.InstancedMesh(hg, hmat, list.length);
    truckHalo.renderOrder = 5; truckHalo.frustumCulled = false;
    disposables.push(mat, lmat, hg, hmat);
    world.add(truckHalo, truckBody, truckLoad);
    const seen = new Map();
    list.forEach((r, i) => {
      const nth = seen.get(r) || 0; seen.set(r, nth + 1);
      const oneWay = clamp(r.total / 4.2, 3.2, 17);
      const pause = 1.1;
      const period = 2 * oneWay + 2 * pause;
      trucks.push({ r, oneWay, pause, period, offset: (nth * 0.37 + (i * 0.618) % 1) * period, vis: 0, moving: false, yaw: 0 });
    });
  }

  // ---------- etiquetas ----------
  function addLabel(o) {
    const el = document.createElement('div');
    el.className = 'svm-lbl ' + (o.kind === 'dept' ? 'svm-dept' : o.kind === 'dest' && !o.route?.data.anchor ? 'svm-dest' : '');
    el.innerHTML = o.html;
    layer.insertBefore(el, pop);
    const L = { ...o, el, w: 0, h: 0, x: -1e4, y: -1e4, on: false, force: false, hide: false };
    labels.push(L);
    return L;
  }
  function layoutLabels() {
    const { w: W, h: H } = S.size;
    const placed = [];
    const rank = (L) => L.prio + (L.force ? 2000 : 0) + (S.focus && L.route && L.route.data.zone === S.focus ? 100 : 0);
    const list = labels.slice().sort((a, b) => rank(b) - rank(a));
    for (const L of list) {
      if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      let want = !L.hide && (S.introDone || !motion || L.kind === 'quarry' || L.kind === 'dept');
      if (L.kind === 'dept') {
        const d = depts.get(L.id);
        if (d && d.grow < 0.6) want = false;
      }
      if (L.kind === 'dest' && L.route) {
        if (!L.route.drawn) want = false;
        if (L.route.opacity < 0.5) want = false;
        const zoneOn = S.focus && L.route.data.zone === S.focus;
        if (L.prio <= 10 && !L.force && !zoneOn) want = false; // ciudades cercanas: sólo al hover o con su zona enfocada
      }
      tmpV.copy(L.pos);
      if (L.kind === 'dept') { const d = depts.get(L.id); tmpV.y = (TOP + 0.2) * (d?.grow ?? 1) + (d?.lift ?? 0); }
      tmpV.project(camera);
      let x = (tmpV.x * 0.5 + 0.5) * W, y = (-tmpV.y * 0.5 + 0.5) * H;
      if (L.anchor === 'bottom') { x -= L.w / 2; y -= L.h; }
      else if (L.anchor === 'topleft') { x -= L.w - 18; y -= L.h + 6; }
      else if (L.anchor === 'topright') { x += 6; y -= L.h + 4; }
      else if (L.anchor === 'right') { x += 9; y -= L.h / 2; }
      else { x -= L.w / 2; y -= L.h / 2; }
      const pad = 3;
      const rect = [x - pad, y - pad, x + L.w + pad, y + L.h + pad];
      if (want && tmpV.z < 1) {
        for (const p of placed) if (rect[0] < p[2] && rect[2] > p[0] && rect[1] < p[3] && rect[3] > p[1]) { want = false; break; }
        if (rect[0] < 0 || rect[2] > W || rect[1] < 0 || rect[3] > H) want = L.kind === 'quarry';
      } else want = false;
      if (want) placed.push(rect);
      if (Math.abs(x - L.x) > 0.25 || Math.abs(y - L.y) > 0.25) { L.x = x; L.y = y; L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; }
      if (want !== L.on) { L.on = want; L.el.classList.toggle('svm-on', want); }
    }
  }

  // ---------- cámara ----------
  const CAM = MODE === 'routes'
    ? { polar: THREE.MathUtils.degToRad(mobile ? 36 : 40), az: THREE.MathUtils.degToRad(mobile ? -8 : -16), margin: mobile ? 0.015 : 0.03, shiftZ: 0 }
    : { polar: THREE.MathUtils.degToRad(24), az: THREE.MathUtils.degToRad(-6), margin: 0.03, shiftZ: 0 };
  let camDist = 150;
  const target = new THREE.Vector3();
  function placeCamera(polar, az, dist) {
    camera.position.set(target.x + dist * Math.sin(polar) * Math.sin(az), target.y + dist * Math.cos(polar), target.z + dist * Math.sin(polar) * Math.cos(az));
    camera.lookAt(target);
  }
  const CAM_BASE = { ...CAM };
  function fitCamera() {
    if (!bbox) return;
    // contenedores verticales (móvil): diagonal más marcada para usar la altura
    const portrait = camera.aspect < 1.1;
    CAM.az = portrait ? THREE.MathUtils.degToRad(MODE === 'routes' ? -26 : -20) : CAM_BASE.az;
    CAM.polar = portrait ? THREE.MathUtils.degToRad(MODE === 'routes' ? 44 : 34) : CAM_BASE.polar;
    target.set((bbox.minX + bbox.maxX) / 2, 0, (bbox.minZ + bbox.maxZ) / 2 + CAM.shiftZ);
    const corners = [];
    for (const x of [bbox.minX, bbox.maxX]) for (const z of [bbox.minZ, bbox.maxZ]) for (const y of [-0.2, TOP + 1]) corners.push(new THREE.Vector3(x, y, z));
    // muestras del contorno real (más justo que la caja)
    for (const d of depts.values()) for (const m of d.meshes) {
      const pa = m.geometry.attributes.position.array;
      for (let i = 0; i < pa.length; i += 3 * 37) corners.push(new THREE.Vector3(pa[i], pa[i + 1] > 0.5 ? TOP : 0, pa[i + 2]));
    }
    const lim = 1 - CAM.margin * 2;
    const right = new THREE.Vector3(), fwd = new THREE.Vector3();
    for (let pass = 0; pass < 3; pass++) {
      let lo = 10, hi = 1500;
      for (let i = 0; i < 36; i++) {
        const mid = (lo + hi) / 2;
        placeCamera(CAM.polar, CAM.az, mid); camera.updateMatrixWorld();
        let mnx = 9, mxx = -9, mny = 9, mxy = -9;
        for (const c of corners) { tmpV.copy(c).project(camera); mnx = Math.min(mnx, tmpV.x); mxx = Math.max(mxx, tmpV.x); mny = Math.min(mny, tmpV.y); mxy = Math.max(mxy, tmpV.y); }
        if ((mxx - mnx) / 2 <= lim && (mxy - mny) / 2 <= lim) hi = mid; else lo = mid;
      }
      camDist = hi;
      placeCamera(CAM.polar, CAM.az, camDist); camera.updateMatrixWorld();
      let mnx = 9, mxx = -9, mny = 9, mxy = -9;
      for (const c of corners) { tmpV.copy(c).project(camera); mnx = Math.min(mnx, tmpV.x); mxx = Math.max(mxx, tmpV.x); mny = Math.min(mny, tmpV.y); mxy = Math.max(mxy, tmpV.y); }
      const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2;
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camDist, halfW = halfH * camera.aspect;
      right.setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
      fwd.set(-Math.sin(CAM.az), 0, -Math.cos(CAM.az));
      target.addScaledVector(right, cx * halfW);
      target.addScaledVector(fwd, cy * halfH / Math.cos(CAM.polar));
    }
    placeCamera(CAM.polar, CAM.az, camDist);
  }

  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    S.size = { w, h };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const d of depts.values()) d.edgeMat.resolution.set(w, h);
    fitCamera();
    for (const L of labels) { L.w = 0; }
    if (S.ready) renderFrame(0);
  }

  // ---------- interacción ----------
  function setPointer(e) {
    const r = renderer.domElement.getBoundingClientRect();
    S.pointer.x = e.clientX - r.left; S.pointer.y = e.clientY - r.top;
    S.pointer.nx = (S.pointer.x / r.width) * 2 - 1; S.pointer.ny = -(S.pointer.y / r.height) * 2 + 1;
    S.pointer.inside = true; S.pointer.dirty = true;
  }
  const onMove = (e) => { S.pointer.touch = e.pointerType === 'touch'; if (S.pointer.touch) return; setPointer(e); };
  const onLeave = () => { S.pointer.inside = false; S.pointer.dirty = true; };
  let downAt = null;
  const onDown = (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t;
    downAt = null;
    if (moved > 10 || dt > 600) return;
    setPointer(e); S.pointer.touch = e.pointerType === 'touch';
    pick(true);
    if (MODE === 'select' && S.hoverDept) select(S.hoverDept, true);
  };
  const cvs = renderer.domElement;
  cvs.addEventListener('pointermove', onMove);
  cvs.addEventListener('pointerleave', onLeave);
  cvs.addEventListener('pointerdown', onDown);
  cvs.addEventListener('pointerup', onUp);

  function screenOf(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x * 0.5 + 0.5) * S.size.w, (-tmpV.y * 0.5 + 0.5) * S.size.h]; }
  function distToSeg(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l2, 0, 1);
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }
  function pick(fromTap = false) {
    S.pointer.dirty = false;
    let hr = null, hd = null;
    if (S.pointer.inside) {
      const { x, y } = S.pointer;
      if (MODE === 'routes') {
        let best = fromTap ? 26 : 16;
        for (const r of routes) {
          if (!r.drawn || r.opacity < 0.4) continue;
          const p = screenOf(r.pts[r.pts.length - 1][0], TOP, r.pts[r.pts.length - 1][1]);
          const d = Math.hypot(p[0] - x, p[1] - y);
          if (d < best) { best = d; hr = r; }
        }
        if (!hr) {
          let bestL = fromTap ? 14 : 7;
          for (const r of routes) {
            if (!r.drawn || r.opacity < 0.4) continue;
            let prev = null;
            for (let i = 0; i < r.pts.length; i++) {
              const p = screenOf(r.pts[i][0], TOP, r.pts[i][1]);
              if (prev) { const d = distToSeg(x, y, prev, p); if (d < bestL) { bestL = d; hr = r; } }
              prev = p;
            }
          }
        }
      }
      if (!hr) {
        raycaster.setFromCamera({ x: S.pointer.nx, y: S.pointer.ny }, camera);
        const meshes = []; for (const d of depts.values()) meshes.push(...d.meshes);
        const hit = raycaster.intersectObjects(meshes, false)[0];
        if (hit) hd = hit.object.userData.id;
      }
    }
    if (hr !== S.hoverRoute || hd !== S.hoverDept) {
      S.hoverRoute = hr; S.hoverDept = hd;
      root.classList.toggle('svm-hot', !!(hr || hd));
      for (const L of labels) if (L.kind === 'dest') { L.force = !!hr && L.route === hr; L.el.classList.toggle('svm-hl', L.force); }
      for (const L of labels) if (L.kind === 'dept') L.el.classList.toggle('svm-strong', L.id === hd || L.id === S.selected);
      renderPop();
    }
    if (S.hoverDept && !S.hoverRoute) positionPop();
  }
  function renderPop() {
    if (S.hoverRoute) {
      const r = S.hoverRoute.data, z = r.zone;
      pop.innerHTML = `<div class="svm-card">
        <div class="svm-k"><span class="svm-chip z-${z}">Zona ${z}</span>Ruta desde Ciudad Arce</div>
        <div class="svm-t">${r.anchor ? 'Condado Quetzal' : r.name}</div>
        ${r.anchor ? `<div class="svm-sub">Quezaltepeque · desarrollo propio del grupo</div>` : ''}
        <div class="svm-grid">
          <div><span>Distancia</span><b>${r.km.toFixed(1)} km</b></div>
          <div><span>Tiempo</span><b>${r.minutes} min</b></div>
          <div><span>Flete/viaje</span><b class="svm-amber">${fmtFlete(z)}</b></div>
        </div></div>`;
      pop.classList.add('svm-on');
      positionPop();
    } else if (S.hoverDept) {
      const info = DEPARTMENTS[S.hoverDept] || {}, d = depts.get(S.hoverDept), z = info.zone || 'D';
      pop.innerHTML = MODE === 'routes'
        ? `<div class="svm-tip"><div class="svm-k">Departamento</div><div class="svm-t">${d?.name || ''}</div>
            <div class="svm-row"><span class="svm-chip z-${z}">Zona ${z}</span><span class="svm-mono">~${Math.round(info.km)} km</span><span>a ${info.capital}</span></div>
            <div class="svm-row">Flete aprox. <span class="svm-amber">${fmtFlete(z)}${ZONES[z]?.flete ? ' / viaje' : ''}</span></div></div>`
        : `<div class="svm-tip"><div class="svm-k">Departamento</div><div class="svm-t">${d?.name || ''}</div>
            <div class="svm-row"><span class="svm-chip z-${z}">Zona ${z}</span><span class="svm-mono">~${Math.round(info.km)} km</span></div>
            <div class="svm-hint">${S.selected === S.hoverDept ? 'Seleccionado' : 'Clic para seleccionar'}</div></div>`;
      pop.classList.add('svm-on');
      positionPop();
    } else {
      pop.classList.remove('svm-on');
    }
  }
  function positionPop() {
    const { w: W, h: H } = S.size;
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x, y;
    if (S.hoverRoute) {
      const e = S.hoverRoute.pts[S.hoverRoute.pts.length - 1];
      const p = screenOf(e[0], TOP + 0.5, e[1]);
      x = p[0] + 18; y = p[1] - ph - 14;
      if (x + pw > W - 8) x = p[0] - pw - 18;
      if (y < 8) y = p[1] + 18;
    } else {
      x = S.pointer.x + 16; y = S.pointer.y + 18;
      if (x + pw > W - 8) x = S.pointer.x - pw - 16;
      if (y + ph > H - 8) y = S.pointer.y - ph - 14;
    }
    x = clamp(x, 6, Math.max(6, W - pw - 6)); y = clamp(y, 6, Math.max(6, H - ph - 6));
    pop.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  }

  // ---------- selección / foco ----------
  function select(id, emit = false) {
    if (!S.ready) { S.pending.push(() => select(id, emit)); return; }
    if (id && !depts.has(id)) return;
    S.selected = id || null;
    for (const L of labels) if (L.kind === 'dept') L.el.classList.toggle('svm-strong', L.id === S.selected || L.id === S.hoverDept);
    if (S.hoverDept) renderPop();
    if (emit && id && typeof opt.onSelect === 'function') {
      const info = DEPARTMENTS[id];
      opt.onSelect({ id, name: depts.get(id).name, km_from_quarry_approx: info?.km ?? null, zone: info?.zone ?? null, capital: info?.capital ?? null, flete: fleteForZone(info?.zone) });
    }
  }
  function focusZone(z) {
    if (!S.ready) { S.pending.push(() => focusZone(z)); return; }
    S.focus = z && ZONES[z] ? z : null;
  }
  function playIntro() {
    if (!S.ready) { S.pending.push(() => playIntro()); return; }
    if (!motion) return;
    S.introT = 0; S.introDone = false;
    for (const r of routes) { r.drawn = false; r.mat.uniforms.uDraw.value = 0; }
  }
  if (opt.selected) select(opt.selected);

  // ---------- loop ----------
  function inFocus(r) { return !S.focus || r.data.zone === S.focus; }
  function posOnRoute(r, s, out) {
    const d = s * r.total, cum = r.cum;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / seg;
    out[0] = r.pts[lo][0] + (r.pts[hi][0] - r.pts[lo][0]) * t;
    out[1] = r.pts[lo][1] + (r.pts[hi][1] - r.pts[lo][1]) * t;
    return out;
  }
  const pA = [0, 0], pB = [0, 0];

  function update(dt) {
    S.time += motion ? dt : 0;
    U.uTime.value = S.time;
    const t = S.time;

    // intro: crecimiento de departamentos
    if (S.deptIntroT >= 0) {
      S.deptIntroT += dt;
      for (const d of depts.values()) d.grow = 0.02 + 0.98 * easeOut((S.deptIntroT - d.growDelay) / 1.1);
      if (S.deptIntroT > 2.4) S.deptIntroT = -1;
    }
    // intro: rutas
    if (S.introT >= 0) {
      S.introT += dt;
      let all = true;
      for (const r of routes) {
        const k = easeInOut((S.introT - r.startAt) / r.drawDur);
        r.mat.uniforms.uDraw.value = k;
        if (k >= 1) r.drawn = true; else all = false;
      }
      const qk = easeOut((S.introT - 0.3) / 0.9);
      if (quarry.group) quarry.group.scale.setScalar(Math.max(0.001, qk));
      if (all && S.introT > 1) { S.introT = -1; S.introDone = true; }
    }

    // departamentos: lift / highlight / dim
    const selMode = MODE === 'select';
    for (const d of depts.values()) {
      const hov = d.id === S.hoverDept && !S.hoverRoute;
      const sel = d.id === S.selected;
      const liftT = sel ? 0.9 : hov ? (selMode ? 0.6 : 0.42) : 0;
      d.lift = reduced ? liftT : damp(d.lift, liftT, 10, dt);
      d.group.position.y = d.lift;
      d.group.scale.y = d.grow;
      const cu = d.capMat.userData, su = d.sideMat.userData;
      cu.uHl.value = damp(cu.uHl.value, hov ? 1 : 0, 12, dt);
      cu.uSel.value = damp(cu.uSel.value, sel ? 1 : 0, 10, dt);
      su.uHl.value = cu.uHl.value; su.uSel.value = cu.uSel.value;
      const dimT = selMode && S.selected && !sel ? 1 : 0;
      cu.uDim.value = damp(cu.uDim.value, dimT, 8, dt);
      // color: seleccionado -> azul de marca; otros atenuados
      const tgtC = sel ? BRAND : cu.base;
      d.capMat.color.lerp(tgtC, 1 - Math.exp(-10 * dt));
      if (dimT) d.capMat.color.lerp(DIM, (1 - Math.exp(-6 * dt)) * 0.6);
      d.edgeMat.opacity = damp(d.edgeMat.opacity, sel ? 1 : hov ? 0.95 : (dimT ? 0.16 : (selMode ? 0.3 : 0.38)), 10, dt);
      d.edgeMat.color.lerp(sel || hov ? WHITEISH : CYAN, 1 - Math.exp(-10 * dt));
    }

    // rutas: foco / hover
    let km = 0, nRoutes = 0;
    for (const r of routes) {
      const f = inFocus(r);
      if (f) { km += r.data.km; nRoutes++; }
      const hov = r === S.hoverRoute;
      const tgtO = !f ? 0.07 : S.hoverRoute && !hov ? 0.3 : 1;
      r.opacity = damp(r.opacity, tgtO, 8, dt);
      r.hl = damp(r.hl, hov ? 1 : (S.focus && f ? 0.35 : 0), 10, dt);
      r.mat.uniforms.uOpacity.value = r.opacity;
      r.mat.uniforms.uHl.value = r.hl;
      const show = r.drawn ? 1 : 0;
      const ps = (0.001 + show * (0.55 + 0.45 * r.opacity)) * (1 + r.hl * 0.35);
      r.pin.scale.setScalar(ps);
    }

    // camiones
    let active = 0;
    if (truckBody) {
      const sc = mobile ? 1.9 : 1.25;
      trucks.forEach((tk, i) => {
        const r = tk.r;
        const wantVis = r.drawn && inFocus(r) && (!S.hoverRoute || S.hoverRoute === r) ? 1 : (r.drawn && inFocus(r) ? 0.35 : 0);
        tk.vis = damp(tk.vis, wantVis, 5, dt);
        const u = ((t + tk.offset) % tk.period + tk.period) % tk.period;
        let s, out = true, moving = true;
        if (u < tk.oneWay) s = easeInOut(u / tk.oneWay);
        else if (u < tk.oneWay + tk.pause) { s = 1; moving = false; }
        else if (u < 2 * tk.oneWay + tk.pause) { s = 1 - easeInOut((u - tk.oneWay - tk.pause) / tk.oneWay); out = false; }
        else { s = 0; moving = false; out = true; }
        posOnRoute(r, s, pA);
        const look = 0.7 / r.total;
        posOnRoute(r, clamp(s + (out ? look : -look), 0, 1), pB);
        let dx = pB[0] - pA[0], dz = pB[1] - pA[1];
        if (Math.hypot(dx, dz) > 1e-4) {
          const yaw = Math.atan2(-dz, dx);
          let dy = yaw - tk.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          tk.yaw += dy * (1 - Math.exp(-14 * dt));
        }
        const v = tk.vis;
        if (r.drawn && inFocus(r) && moving) active++;
        const scale = sc * Math.max(0.0001, Math.min(1, v * 1.4)) * (0.85 + 0.15 * Math.min(1, v));
        tmpQ.setFromAxisAngle(upY, tk.yaw);
        tmpS.setScalar(scale);
        tmpV.set(pA[0], TOP + 0.06, pA[1]);
        tmpM.compose(tmpV, tmpQ, tmpS);
        truckBody.setMatrixAt(i, tmpM);
        tmpS.setScalar(out && s < 0.999 && moving ? scale : (out && !moving && s === 0 ? scale : 0.0001));
        tmpM.compose(tmpV, tmpQ, tmpS);
        truckLoad.setMatrixAt(i, tmpM);
        tmpS.set(3.0 * sc * v, 1, 3.0 * sc * v);
        tmpV.y = TOP + 0.07;
        tmpM.compose(tmpV, tmpQ, tmpS);
        truckHalo.setMatrixAt(i, tmpM);
      });
      truckBody.instanceMatrix.needsUpdate = true; truckLoad.instanceMatrix.needsUpdate = true; truckHalo.instanceMatrix.needsUpdate = true;
    }

    // cámara: parallax suave + deriva
    const px = S.pointer.inside && !S.pointer.touch && motion ? S.pointer.nx : 0;
    const py = S.pointer.inside && !S.pointer.touch && motion ? S.pointer.ny : 0;
    S.parallax.x = damp(S.parallax.x, px, 2.2, dt);
    S.parallax.y = damp(S.parallax.y, py, 2.2, dt);
    const drift = motion && MODE === 'routes' ? Math.sin(t * 0.11) * 0.025 : 0;
    const k = MODE === 'routes' ? 1 : 0.6;
    placeCamera(CAM.polar - S.parallax.y * 0.05 * k, CAM.az + S.parallax.x * 0.085 * k + drift, camDist);

    // stats
    S.statsT += dt;
    if (opt.onStats && S.statsT > 0.25) {
      S.statsT = 0;
      const stats = { routes: nRoutes, km: Math.round(km), trucksActive: active };
      const key = `${stats.routes}|${stats.km}|${stats.trucksActive}`;
      if (key !== S.statsKey) { S.statsKey = key; try { opt.onStats(stats); } catch (e) { console.warn(e); } }
    }
  }
  const BRAND = new THREE.Color(C.brand), DIM = new THREE.Color('#142233'), CYAN = new THREE.Color(C.cyan), WHITEISH = new THREE.Color('#dff1ff');

  function renderFrame(dt) {
    update(dt);
    camera.updateMatrixWorld();
    if (S.pointer.dirty) pick();
    else if (S.hoverRoute) positionPop();
    renderer.render(scene, camera);
    layoutLabels();
  }
  function loop(now) {
    S.raf = 0;
    if (S.destroyed || !S.visible || !S.tabVisible) return;
    const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016);
    S.last = now;
    renderFrame(dt);
    S.raf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!S.raf && S.ready && S.visible && S.tabVisible && !S.destroyed) { S.last = 0; S.raf = requestAnimationFrame(loop); } }
  function stopLoop() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }

  function beginIntro() {
    if (S.introDone || S.introT >= 0) return;
    if (!motion || opt.intro === false) {
      for (const d of depts.values()) d.grow = 1;
      for (const r of routes) { r.drawn = true; r.mat.uniforms.uDraw.value = 1; }
      S.introDone = true; return;
    }
    S.deptIntroT = 0;
    for (const d of depts.values()) d.grow = 0.02;
    if (MODE === 'routes') playIntro(); else { S.introDone = true; }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      S.visible = e.isIntersecting;
      if (S.visible) { if (S.ready && !S._introStarted) { S._introStarted = true; beginIntro(); } startLoop(); }
      else stopLoop();
    }
  }, { threshold: 0.12 });
  const onVis = () => { S.tabVisible = !document.hidden; if (S.tabVisible) startLoop(); else stopLoop(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => resize());

  // ---------- carga ----------
  const ready = Promise.all([
    fetch(opt.geoUrl).then((r) => { if (!r.ok) throw new Error('GeoJSON ' + r.status); return r.json(); }),
    fetch(opt.routesUrl).then((r) => { if (!r.ok) throw new Error('rutas ' + r.status); return r.json(); }),
  ]).then(([geo, rdata]) => {
    if (S.destroyed) return ctrl;
    build(geo, rdata);
    // estado previo a la intro
    if (motion && opt.intro !== false) {
      for (const d of depts.values()) d.grow = 0.02;
      if (quarry.group) quarry.group.scale.setScalar(MODE === 'routes' ? 0.001 : 1);
    } else {
      S.introDone = true;
      for (const r of routes) { r.drawn = true; r.mat.uniforms.uDraw.value = 1; }
    }
    S.ready = true;
    resize();
    ro.observe(container);
    io.observe(container);
    const p = S.pending.splice(0); p.forEach((fn) => fn());
    if (typeof opt.onReady === 'function') opt.onReady(ctrl);
    return ctrl;
  }).catch((err) => { console.warn('[sv-map]', err); throw err; });
  ready.catch(() => {});

  function destroy() {
    if (S.destroyed) return;
    S.destroyed = true;
    stopLoop();
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    cvs.removeEventListener('pointermove', onMove); cvs.removeEventListener('pointerleave', onLeave);
    cvs.removeEventListener('pointerdown', onDown); cvs.removeEventListener('pointerup', onUp);
    for (const d of disposables) d.dispose?.();
    if (truckBody) truckBody.dispose(); if (truckLoad) truckLoad.dispose(); if (truckHalo) truckHalo.dispose();
    envTex.dispose(); pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss?.();
    root.remove();
  }

  const ctrl = {
    ready,
    destroy,
    resize: () => resize(),
    focusZone,
    playIntro,
    select: (id, emit = false) => select(id, emit),
    get selected() { return S.selected; },
    get mode() { return MODE; },
    get state() { return { ready: S.ready, visible: S.visible, tabVisible: S.tabVisible, running: !!S.raf, introDone: S.introDone, focus: S.focus }; },
  };
  return ctrl;
}

/* ================================================================== */
/* TEMA CLARO (theme: 'light', mode: 'routes')                         */
/* Estilo "Locations" de Martin Marietta: losas mate de colores planos */
/* con muros altos, pines blancos, rutas azules con camiones.          */
/* ================================================================== */
export const LIGHT_PALETTE = {
  zone: { A: '#4fc79a', B: '#5fb0e8', C: '#11679f', D: '#4a5058' },
  idle: '#c9ccd0',       // departamentos sin destino de ruta
  brand: '#2463d0', pulse: '#a9d4ff', ink: '#0b1118',
};
const LIGHT_DEPTH = 3.4, LIGHT_BEVEL = 0.06, LIGHT_GAP = 0.05;
const ZORDER = { A: 0, B: 1, C: 2, D: 3 };
const TRUCK_LIGHT = { chassis: '#3a4048', cab: '#ffffff', glass: '#9cc3e6', roof: '#f3f5f7', bedFloor: '#1b4aa0', bedSide: '#2463d0', bedBack: '#1d55bb', bedFront: '#2d6fe2', wheel: '#1a1d21', load: '#9ea3a8' };

const LROUTE_FS = `
uniform float uTime; uniform float uDraw; uniform float uOpacity; uniform float uHl; uniform float uMotion; uniform float uLen; uniform float uPhase; uniform float uCasing;
uniform vec3 uCol; uniform vec3 uPulse;
varying float vT; varying float vSide; varying float vD;
void main(){
  if (vT > uDraw) discard;
  float s = abs(vSide);
  float aa = max(fwidth(vSide) * 1.5, 0.03);
  float head = uDraw < 0.999 ? smoothstep(0.0, 0.7, (uDraw - vT) * uLen) : 1.0;
  if (uCasing > 0.5) {
    float a = 1.0 - smoothstep(1.0 - aa, 1.0, s);
    gl_FragColor = vec4(1.0, 1.0, 1.0, a * uOpacity * head);
  } else {
    float cr = mix(0.5, 0.64, uHl);
    float a = 1.0 - smoothstep(cr - aa, cr, s);
    float p = fract(vD / 6.5 - uTime * 0.32 + uPhase);
    float pulse = smoothstep(0.45, 0.97, p) * (1.0 - smoothstep(0.97, 1.0, p)) * uMotion;
    vec3 col = mix(uCol, uPulse, pulse * 0.85);
    gl_FragColor = vec4(col, a * uOpacity * head);
  }
  #include <colorspace_fragment>
}`;
const LRING_FS = `
uniform float uTime; uniform float uSpeed; uniform float uPhase; uniform vec3 uCol; uniform float uOpacity;
varying vec2 vUv;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = 0.0;
  for (int i = 0; i < 2; i++) {
    float r = fract(uTime * uSpeed + uPhase + float(i) * 0.5);
    a += (1.0 - smoothstep(0.0, 0.045, abs(d - r))) * pow(1.0 - r, 1.3) * 0.85;
    a += (1.0 - smoothstep(0.0, r, d)) * pow(1.0 - r, 2.0) * 0.12;
  }
  a *= 1.0 - smoothstep(0.94, 1.0, d);
  gl_FragColor = vec4(uCol, a * uOpacity);
  #include <colorspace_fragment>
}`;
const BLOB_FS = `
uniform float uOpacity; uniform vec3 uCol; varying vec2 vUv;
void main(){ float d = length((vUv - 0.5) * 2.0); float a = 1.0 - smoothstep(0.1, 1.0, d); gl_FragColor = vec4(uCol, a * a * uOpacity);
  #include <colorspace_fragment>
}`;

const LIGHT_STYLE_ID = 'svm-styles-light-v1';
function injectLightStyles() {
  if (document.getElementById(LIGHT_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = LIGHT_STYLE_ID;
  const Z = LIGHT_PALETTE.zone;
  s.textContent = `
.svm-light{color:#0b1118}
.svm-light .svm-dept{font:700 9px/1 ${FONT_UI};letter-spacing:.16em;text-transform:uppercase;color:rgba(16,27,39,.58);text-shadow:0 1px 0 rgba(255,255,255,.45)}
.svm-light .svm-dept.svm-ondark{color:rgba(255,255,255,.82);text-shadow:0 1px 2px rgba(0,0,0,.25)}
.svm-light .svm-dept.svm-strong{color:#0b1118}
.svm-light .svm-dept.svm-ondark.svm-strong{color:#fff}
.svm-light .svm-ldest{font:600 11.5px/1 ${FONT_UI};color:#0b1118;background:rgba(255,255,255,.96);padding:5px 8px;border-radius:7px;box-shadow:0 6px 18px rgba(16,27,39,.16),0 1px 2px rgba(16,27,39,.08)}
.svm-light .svm-lq{display:flex;align-items:center;gap:9px;padding:7px 13px 7px 8px;border-radius:999px;background:#fff;box-shadow:0 12px 32px rgba(16,27,39,.18),0 1px 3px rgba(16,27,39,.1);font:500 12px/1 ${FONT_UI};color:rgba(16,27,39,.6)}
.svm-light .svm-lq b{font:700 13px/1 ${FONT_H};color:#0b1118;letter-spacing:.005em}
.svm-light .svm-lq i{width:10px;height:10px;border-radius:50%;background:${LIGHT_PALETTE.brand};box-shadow:0 0 0 3px rgba(36,99,208,.18);flex:none}
.svm-light .svm-lanchor{display:flex;align-items:center;gap:7px;padding:5px 9px 5px 5px;border-radius:8px;background:#fff;box-shadow:0 8px 22px rgba(16,27,39,.16),0 1px 2px rgba(16,27,39,.08);font:600 11.5px/1 ${FONT_UI};color:#0b1118}
.svm-light .svm-lanchor em{font-style:normal;font:700 8.5px/1 ${FONT_UI};letter-spacing:.14em;text-transform:uppercase;color:#fff;background:${LIGHT_PALETTE.brand};padding:4px 6px;border-radius:5px}
.svm-lcard{min-width:236px;max-width:280px;padding:15px 16px 14px;border-radius:14px;background:#fff;color:#0b1118;border:1px solid rgba(16,27,39,.06);box-shadow:0 20px 48px rgba(16,27,39,.18),0 2px 6px rgba(16,27,39,.08)}
.svm-lcard .svm-k{color:rgba(16,27,39,.5);white-space:nowrap}
.svm-lcard .svm-row{flex-wrap:wrap;white-space:nowrap;row-gap:6px}
.svm-lcard .svm-t{color:#0b1118}
.svm-lcard .svm-sub{color:${LIGHT_PALETTE.brand}}
.svm-lcard .svm-grid{border-top-color:rgba(16,27,39,.08)}
.svm-lcard .svm-grid span{color:rgba(16,27,39,.48)}
.svm-lcard .svm-grid b{color:#0b1118}
.svm-lcard .svm-grid b.svm-blue{color:${LIGHT_PALETTE.brand}}
.svm-lcard .svm-row{color:rgba(16,27,39,.62)}
.svm-lcard .svm-mono{color:#0b1118}
.svm-lcard .svm-row .svm-blue{color:${LIGHT_PALETTE.brand};font-family:${FONT_MONO};font-size:12px;font-weight:600}
.svm-lcard.svm-ltip{min-width:220px;max-width:300px;padding:11px 13px 11px}
.svm-lcard.svm-ltip .svm-t{font-size:15px;margin-top:6px}
.svm-lchip{display:inline-flex;align-items:center;white-space:nowrap;flex:none;font:700 9px/1 ${FONT_UI};letter-spacing:.12em;text-transform:uppercase;padding:4px 7px;border-radius:5px;color:#fff;background:${LIGHT_PALETTE.brand}}
.svm-lchip.z-A{background:${Z.A};color:#05301f}.svm-lchip.z-B{background:${Z.B};color:#062a44}.svm-lchip.z-C{background:${Z.C}}.svm-lchip.z-D{background:${Z.D}}.svm-lchip.z-none{background:${LIGHT_PALETTE.idle};color:#1b2a3a}
.svm-lpin{display:inline-flex;align-items:center;gap:6px;font:600 9.5px/1 ${FONT_UI};letter-spacing:.14em;text-transform:uppercase;color:${LIGHT_PALETTE.brand}}
@media (max-width:640px){.svm-lcard{min-width:206px;padding:12px 13px}.svm-light .svm-lq{font-size:11px;padding:5px 10px 5px 7px;gap:7px}.svm-light .svm-lq b{font-size:11.5px}.svm-light .svm-lq span{display:none}.svm-light .svm-lanchor{font-size:10px;padding:4px 7px 4px 4px;gap:5px}.svm-light .svm-lanchor em{font-size:7.5px;padding:3px 4px}.svm-light .svm-dept{font-size:8px;letter-spacing:.12em}}
`;
  document.head.appendChild(s);
}

// Pin tipo gota (canvas → textura de sprite). Devuelve {canvas, tipFrac}
function drawPin(canvas, { fill, dot, ring, logo }) {
  const w = canvas.width, h = canvas.height, g = canvas.getContext('2d');
  g.clearRect(0, 0, w, h);
  const cx = w / 2, r = w * 0.32, cy = r + w * 0.12, tipY = h * 0.93;
  const path = () => {
    g.beginPath();
    g.moveTo(cx, tipY);
    g.bezierCurveTo(cx - r * 0.3, tipY - (tipY - cy) * 0.42, cx - r, cy + r * 0.62, cx - r, cy);
    g.arc(cx, cy, r, Math.PI, 0);
    g.bezierCurveTo(cx + r, cy + r * 0.62, cx + r * 0.3, tipY - (tipY - cy) * 0.42, cx, tipY);
    g.closePath();
  };
  g.save();
  g.shadowColor = 'rgba(16,27,39,0.34)'; g.shadowBlur = w * 0.09; g.shadowOffsetY = w * 0.035;
  path(); g.fillStyle = fill; g.fill();
  g.restore();
  path(); g.lineWidth = Math.max(1.5, w * 0.014); g.strokeStyle = 'rgba(16,27,39,0.10)'; g.stroke();
  if (ring) { g.beginPath(); g.arc(cx, cy, r * 0.72, 0, Math.PI * 2); g.fillStyle = ring; g.fill(); }
  if (logo) {
    const s = r * 1.02, ar = logo.naturalWidth / logo.naturalHeight || 1;
    g.drawImage(logo, cx - (s * ar) / 2, cy - s / 2, s * ar, s);
  } else if (dot) {
    g.beginPath(); g.arc(cx, cy, r * (ring ? 0.5 : 0.4), 0, Math.PI * 2); g.fillStyle = dot; g.fill();
  }
  return 1 - tipY / h;
}

// Sombra de contacto horneada: silueta del país desenfocada (sin ctx.filter → compatible con Safari)
function bakeShadowTexture(rings, bb, radiusFrac) {
  const pad = 0.14, W = 512;
  const bw = (bb.maxX - bb.minX) * (1 + pad * 2), bh = (bb.maxZ - bb.minZ) * (1 + pad * 2) + 8;
  const H = Math.max(64, Math.round(W * bh / bw));
  const ox = bb.minX - (bb.maxX - bb.minX) * pad, oz = bb.minZ - (bb.maxZ - bb.minZ) * pad - 4;
  const sil = document.createElement('canvas'); sil.width = W; sil.height = H;
  const sg = sil.getContext('2d'); sg.fillStyle = '#000';
  for (const ring of rings) {
    sg.beginPath();
    ring.forEach((p, i) => { const x = (p[0] - ox) / bw * W, y = (p[1] - oz) / bh * H; i ? sg.lineTo(x, y) : sg.moveTo(x, y); });
    sg.closePath(); sg.fill();
  }
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d');
  const R = radiusFrac * W, rings3 = [0.25, 0.55, 0.85, 1.15], steps = 14;
  og.globalAlpha = 0.07;
  for (const k of rings3) for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 + k;
    og.drawImage(sil, Math.cos(a) * R * k, Math.sin(a) * R * k);
  }
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, cx: ox + bw / 2, cz: oz + bh / 2, w: bw, h: bh };
}

function mountLight(container, opt) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const mobile = window.matchMedia?.('(max-width: 760px), (pointer: coarse)').matches ?? false;
  const motion = !reduced;
  const P = LIGHT_PALETTE;
  const DEPTH = LIGHT_DEPTH, BEVEL = LIGHT_BEVEL, TOP = DEPTH + BEVEL;

  injectStyles(); injectLightStyles();
  if (!hasWebGL()) return mountFallback(container, opt, 'routes');
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const root = document.createElement('div');
  root.className = 'svm-root svm-light svm-mode-routes';
  const layer = document.createElement('div'); layer.className = 'svm-layer';
  const pop = document.createElement('div'); pop.className = 'svm-pop';
  layer.appendChild(pop);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const maxDpr = 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  root.appendChild(renderer.domElement); root.appendChild(layer); container.appendChild(root);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Mapa 3D de El Salvador con las rutas de entrega de Cantera JOB desde Ciudad Arce');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  const camera = new THREE.PerspectiveCamera(22, 1, 1, 3000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dee5, 0.92));
  const key = new THREE.DirectionalLight(0xffffff, 1.14); key.position.set(-30, 90, 40); scene.add(key);
  const world = new THREE.Group(); scene.add(world);
  const U = { uTime: { value: 0 }, uMotion: { value: motion ? 1 : 0 } };

  const S = {
    ready: false, destroyed: false, visible: false, tabVisible: !document.hidden, raf: 0, last: 0, time: 0,
    introDone: false, introT: -1, deptIntroT: -1, introStarted: false, focus: null, hoverDept: null, hoverRoute: null,
    pinned: null, featured: null, featIdx: -1, featT: 0, selected: null,
    pointer: { x: 0, y: 0, nx: 0, ny: 0, inside: false, dirty: false, touch: false },
    parallax: { x: 0, y: 0 }, size: { w: 1, h: 1 }, statsKey: '', statsT: 0, pending: [], popKey: '',
  };
  const depts = new Map(), routes = [], labels = [], trucks = [], disposables = [];
  const quarry = {};
  let truckBody = null, truckLoad = null, truckBlob = null;
  let bbox = null, projection = null, center2 = [0, 0];
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), upY = new THREE.Vector3(0, 1, 0);
  const toXZ = (lon, lat) => { const p = projection([lon, lat]); return [p[0] - center2[0], p[1] - center2[1]]; };
  const PIN_H = mobile ? 4.4 : 2.7, QPIN_H = mobile ? 7.6 : 5.4;

  // ---------- materiales ----------
  function capMaterial(color) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0, envMapIntensity: 0.4 });
    const uHl = { value: 0 };
    m.userData = { uHl };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uHl = uHl;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uHl;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0) * uHl * 0.07;');
    };
    m.customProgramCacheKey = () => 'svm-lcap';
    return m;
  }
  function sideMaterial(color) {
    const c = new THREE.Color(color), hsl = {}; c.getHSL(hsl);
    c.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), hsl.l * 0.68);
    const m = new THREE.MeshBasicMaterial({ color: c });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vLy;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvLy = position.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vLy;')
        .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb *= mix(0.74, 1.04, smoothstep(${(-BEVEL).toFixed(3)}, ${TOP.toFixed(3)}, vLy));`);
    };
    m.customProgramCacheKey = () => 'svm-lside';
    return m;
  }

  // ---------- construcción ----------
  function build(geo, rdata) {
    const all = [];
    for (const f of geo.features) for (const p of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) all.push(...p[0]);
    projection = geoMercator().fitWidth(MAP_W, { type: 'MultiPoint', coordinates: all });
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const c of all) { const p = projection(c); minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    center2 = [(minX + maxX) / 2, (minY + maxY) / 2];
    bbox = { minX: minX - center2[0], maxX: maxX - center2[0], minZ: minY - center2[1], maxZ: maxY - center2[1] };
    const q = toXZ(rdata.origin.lon, rdata.origin.lat);

    // zona "servida" por departamento (la más cercana entre sus destinos); La Libertad = A (cantera)
    const served = new Map();
    for (const r of rdata.routes) {
      const cur = served.get(r.department);
      if (!cur || ZORDER[r.zone] < ZORDER[cur.zone]) served.set(r.department, { zone: r.zone, count: (cur?.count || 0) + 1 });
      else cur.count++;
    }
    if (served.has('la-libertad')) served.get('la-libertad').zone = 'A'; else served.set('la-libertad', { zone: 'A', count: 0 });

    const silRings = [];
    for (const f of geo.features) {
      const id = f.properties.id, name = f.properties.name || DEPARTMENTS[id]?.name || id;
      const sv = served.get(id) || null;
      const color = sv ? P.zone[sv.zone] : P.idle;
      const capMat = capMaterial(color), sideMat = sideMaterial(color);
      const edgeMat = new LineMaterial({ color: 0xffffff, linewidth: mobile ? 1.0 : 1.35, transparent: true, opacity: 0.92, depthWrite: false });
      const group = new THREE.Group();
      const meshes = [];
      let bestArea = 0, labelPt = [0, 0];
      for (const poly of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) {
        const ringXZ = cleanRing(poly[0].map((c) => toXZ(c[0], c[1])));
        if (ringXZ.length < 3) continue;
        silRings.push(ringXZ);
        const area = Math.abs(signedArea(ringXZ)), small = area < 3;
        const ringShape = insetRing(ringXZ.map((p) => [p[0], -p[1]]), small ? LIGHT_GAP * 0.4 : LIGHT_GAP);
        const shape = new THREE.Shape(ringShape.map((p) => new THREE.Vector2(p[0], p[1])));
        const g = new THREE.ExtrudeGeometry(shape, small
          ? { depth: DEPTH, bevelEnabled: false, curveSegments: 1 }
          : { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: -BEVEL, bevelSegments: 1, curveSegments: 1 });
        g.rotateX(-Math.PI / 2);
        disposables.push(g);
        const mesh = new THREE.Mesh(g, [capMat, sideMat]);
        mesh.userData.id = id;
        group.add(mesh); meshes.push(mesh);
        const edgeRing = small ? ringShape : insetRing(ringShape, BEVEL);
        const yE = (small ? DEPTH : TOP) + 0.03, ptsE = [];
        for (const p of edgeRing.concat([edgeRing[0]])) ptsE.push(p[0], yE, -p[1]);
        const lg = new LineGeometry(); lg.setPositions(ptsE); disposables.push(lg);
        const line = new Line2(lg, edgeMat); line.renderOrder = 1; group.add(line);
        if (area > bestArea) { bestArea = area; labelPt = centroid(ringXZ); }
      }
      const NUDGE = { 'la-libertad': [0.6, 3.2], 'san-salvador': [0.6, 0.6], 'la-union': [-1.2, -0.6], 'usulutan': [0.5, -1.4], 'la-paz': [0.2, 1.2], 'santa-ana': [0.6, -1.4], 'sonsonate': [-0.6, 0.4] };
      if (NUDGE[id]) { labelPt[0] += NUDGE[id][0]; labelPt[1] += NUDGE[id][1]; }
      world.add(group);
      disposables.push(capMat, sideMat, edgeMat);
      const dark = !sv ? false : (sv.zone === 'C' || sv.zone === 'D');
      depts.set(id, { id, name, group, capMat, sideMat, edgeMat, meshes, lift: 0, grow: 1, labelPt, served: sv });
      if (opt.labels !== false && !mobile) addLabel({ kind: 'dept', id, cls: 'svm-dept' + (dark ? ' svm-ondark' : ''), html: name, pos: new THREE.Vector3(labelPt[0], TOP + 0.1, labelPt[1]), prio: 20 });
    }
    const order = [...depts.values()].sort((a, b) => Math.hypot(a.labelPt[0] - q[0], a.labelPt[1] - q[1]) - Math.hypot(b.labelPt[0] - q[0], b.labelPt[1] - q[1]));
    order.forEach((d, i) => { d.growDelay = i * 0.05; });

    // Sombra de contacto (dos capas: amplia + ajustada)
    for (const [rad, op, dz] of [[0.03, 0.26, 2.6], [0.008, 0.42, 0.6]]) {
      const b = bakeShadowTexture(silRings, bbox, rad);
      const m = new THREE.MeshBasicMaterial({ map: b.tex, color: '#1a2633', transparent: true, opacity: op, depthWrite: false });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), m);
      pl.rotation.x = -Math.PI / 2; pl.position.set(b.cx, -BEVEL - 0.03, b.cz + dz); pl.renderOrder = -2;
      world.add(pl); disposables.push(pl.geometry, m, b.tex);
    }

    buildQuarry(q);
    buildRoutes(rdata);
    if (motion) buildTrucks();
  }

  function ringMesh(size, color, opacity, speed, phase = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShaderMaterial({
      vertexShader: RING_VS, fragmentShader: LRING_FS, transparent: true, depthWrite: false, depthTest: false,
      uniforms: { uTime: U.uTime, uSpeed: { value: speed }, uPhase: { value: phase }, uCol: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    }));
    m.rotation.x = -Math.PI / 2;
    disposables.push(m.geometry, m.material);
    return m;
  }
  const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2); disposables.push(blobGeo);
  const blobMat = new THREE.ShaderMaterial({ vertexShader: RING_VS, fragmentShader: BLOB_FS, transparent: true, depthWrite: false, depthTest: false, uniforms: { uOpacity: { value: 0.32 }, uCol: { value: new THREE.Color('#0e1a26') } } });
  disposables.push(blobMat);

  function buildQuarry(q) {
    const g = new THREE.Group(); g.position.set(q[0], TOP, q[1]);
    const rings = ringMesh(mobile ? 14 : 10, P.brand, motion ? 0.55 : 0.3, motion ? 0.35 : 0); rings.position.y = 0.06; rings.renderOrder = 3; g.add(rings);
    const discG = new THREE.CircleGeometry(mobile ? 1.6 : 1.05, 40); discG.rotateX(-Math.PI / 2);
    const disc = new THREE.Mesh(discG, new THREE.MeshBasicMaterial({ color: P.brand, depthTest: false, transparent: true }));
    const ringG = new THREE.RingGeometry(mobile ? 1.6 : 1.05, mobile ? 2.1 : 1.38, 40); ringG.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
    disc.position.y = ring.position.y = 0.08; disc.renderOrder = ring.renderOrder = 5;
    g.add(ring, disc);
    // pin grande azul con la "C" de la marca
    const cv = document.createElement('canvas'); cv.width = 192; cv.height = 240;
    const tip = drawPin(cv, { fill: P.brand, ring: '#ffffff', dot: P.brand });
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sm = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const pin = new THREE.Sprite(sm); pin.center.set(0.5, tip);
    const base = new THREE.Vector2(QPIN_H * cv.width / cv.height, QPIN_H);
    pin.scale.set(base.x, base.y, 1); pin.position.y = 0.1; pin.renderOrder = 9;
    g.add(pin);
    const logo = new Image();
    logo.onload = () => { if (S.destroyed) return; drawPin(cv, { fill: P.brand, ring: '#ffffff', logo }); tex.needsUpdate = true; if (S.ready) renderFrame(0); };
    logo.src = new URL('../assets/brand/logo-color-iso.png', import.meta.url).href;
    disposables.push(discG, ringG, disc.material, ring.material, tex, sm);
    world.add(g);
    Object.assign(quarry, { group: g, pin, pinBase: base, pos: q });
    addLabel({ kind: 'quarry', cls: '', html: `<div class="svm-lq"><i></i><b>Cantera JOB</b><span>· Ciudad Arce</span></div>`, pos: new THREE.Vector3(q[0], TOP + QPIN_H * 1.02, q[1]), prio: 1000, anchor: 'top' });
  }

  function buildRoutes(rdata) {
    const pinCanvas = document.createElement('canvas'); pinCanvas.width = 128; pinCanvas.height = 160;
    const tip = drawPin(pinCanvas, { fill: '#ffffff', dot: P.brand });
    const pinTex = new THREE.CanvasTexture(pinCanvas); pinTex.colorSpace = THREE.SRGBColorSpace; pinTex.anisotropy = 4;
    disposables.push(pinTex);
    const W = mobile ? 1.3 : 0.76;
    const sorted = [...rdata.routes].sort((a, b) => a.km - b.km);
    sorted.forEach((r, i) => {
      const pts = r.coordinates.map((c) => toXZ(c[0], c[1]));
      const { geometry, cum, total } = ribbonGeometry(pts, W);
      const shared = {
        uTime: U.uTime, uMotion: U.uMotion, uDraw: { value: motion ? 0 : 1 }, uOpacity: { value: 1 }, uHl: { value: 0 },
        uLen: { value: total }, uPhase: { value: (i * 0.173) % 1 }, uCol: { value: new THREE.Color(P.brand) }, uPulse: { value: new THREE.Color(P.pulse) },
      };
      const mk = (casing) => new THREE.ShaderMaterial({ vertexShader: ROUTE_VS, fragmentShader: LROUTE_FS, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, uniforms: { ...shared, uCasing: { value: casing } } });
      const casing = new THREE.Mesh(geometry, mk(1)), core = new THREE.Mesh(geometry, mk(0));
      casing.position.y = core.position.y = TOP + 0.05;
      casing.renderOrder = 3; core.renderOrder = 4;
      world.add(casing, core); disposables.push(geometry, casing.material, core.material);
      const end = pts[pts.length - 1];
      const pg = new THREE.Group(); pg.position.set(end[0], TOP, end[1]);
      const sm = new THREE.SpriteMaterial({ map: pinTex, transparent: true, depthWrite: false });
      const pin = new THREE.Sprite(sm); pin.center.set(0.5, tip); pin.renderOrder = 9;
      const ph = PIN_H * (r.anchor ? 1.25 : 1);
      const base = new THREE.Vector2(ph * pinCanvas.width / pinCanvas.height, ph);
      pin.scale.set(0.0001, 0.0001, 1); pin.position.y = 0.06;
      const blob = new THREE.Mesh(blobGeo, blobMat); blob.scale.set(base.x * 0.9, 1, base.x * 0.5); blob.position.y = 0.07; blob.renderOrder = 5;
      pg.add(blob, pin); world.add(pg); disposables.push(sm);
      // destino pegado a la cantera (p. ej. Ciudad Arce): sin pin propio para no tapar el marcador
      const nearQ = Math.hypot(end[0] - quarry.pos[0], end[1] - quarry.pos[1]) < (mobile ? 3.2 : 2.4);
      if (nearQ) pg.visible = false;
      const route = {
        data: r, casing, core, U: shared, pts, cum, total, pg, pin, pinMat: sm, blob, pinBase: base, pinH: ph,
        startAt: 0.75 + i * 0.1, drawDur: 0.45 + 0.85 * Math.sqrt(total / 70), drawn: !motion, popT: motion ? -1 : -10, opacity: 1, hl: 0,
      };
      routes.push(route);
      route.label = addLabel({
        kind: 'dest', route,
        cls: r.anchor ? '' : 'svm-ldest',
        html: r.anchor ? `<div class="svm-lanchor"><em>Cliente ancla</em>Condado Quetzal</div>` : r.name,
        pos: new THREE.Vector3(end[0], TOP + ph * 0.66, end[1]),
        prio: r.anchor ? 500 : 10, anchor: 'right',
      });
    });
  }

  function buildTrucks() {
    const n = opt.trucks ?? (mobile ? 14 : 36);
    const list = routes.slice();
    const anchor = routes.find((r) => r.data.anchor);
    if (anchor) list.push(anchor, anchor);
    const long = [...routes].sort((a, b) => b.total - a.total).slice(0, 10);
    let k = 0;
    while (list.length < n) list.push(long[k++ % long.length]);
    list.length = Math.min(list.length, n);
    const geos = truckGeometries(TRUCK_LIGHT);
    disposables.push(geos.body, geos.load);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05, envMapIntensity: 0.6 });
    const lmat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    const count = list.length + 1; // +1 camión de "demostración" para showDestination()
    truckBody = new THREE.InstancedMesh(geos.body, mat, count);
    truckLoad = new THREE.InstancedMesh(geos.load, lmat, count);
    truckBlob = new THREE.InstancedMesh(blobGeo, new THREE.ShaderMaterial({ vertexShader: HALO_VS, fragmentShader: BLOB_FS, transparent: true, depthWrite: false, depthTest: false, uniforms: { uOpacity: { value: 0.34 }, uCol: { value: new THREE.Color('#0e1a26') } } }), count);
    for (const m of [truckBody, truckLoad, truckBlob]) m.frustumCulled = false;
    truckBlob.renderOrder = 5; truckBody.renderOrder = 6; truckLoad.renderOrder = 6;
    disposables.push(mat, lmat, truckBlob.material);
    world.add(truckBlob, truckBody, truckLoad);
    const seen = new Map();
    list.forEach((r, i) => {
      const nth = seen.get(r) || 0; seen.set(r, nth + 1);
      const oneWay = clamp(r.total / 4.4, 3.4, 16), pause = 1.2, period = 2 * oneWay + 2 * pause;
      trucks.push({ r, oneWay, pause, period, offset: (nth * 0.41 + (i * 0.618) % 1) * period, vis: 0, yaw: 0 });
    });
    trucks.push({ r: null, special: true, t0: 0, oneWay: 1, pause: 1.2, period: 1, offset: 0, vis: 0, yaw: 0 });
  }

  // ---------- etiquetas ----------
  function addLabel(o) {
    const el = document.createElement('div');
    el.className = 'svm-lbl ' + (o.cls || '');
    el.innerHTML = o.html;
    layer.insertBefore(el, pop);
    const L = { ...o, el, w: 0, h: 0, x: -1e4, y: -1e4, on: false };
    labels.push(L); return L;
  }
  const activeRoute = () => S.hoverRoute || S.pinned;
  function layoutLabels() {
    const { w: W, h: H } = S.size, placed = [];
    const act = activeRoute();
    const rank = (L) => L.prio + (L.route && (L.route === act) ? 3000 : 0) + (L.route && L.route === S.featured ? 400 : 0) + (S.focus && L.route && L.route.data.zone === S.focus ? 100 : 0);
    for (const L of labels.slice().sort((a, b) => rank(b) - rank(a))) {
      if (!L.w) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; }
      let want = S.introDone || !motion || L.kind !== 'dest';
      if (L.kind === 'dept') { const d = depts.get(L.id); if (d.grow < 0.7) want = false; }
      if (L.kind === 'quarry' && quarry.group && quarry.group.scale.x < 0.5) want = false;
      if (L.kind === 'dest') {
        const r = L.route;
        if (!r.drawn || r.opacity < 0.5) want = false;
        const special = r === act || r === S.featured || (S.focus && r.data.zone === S.focus) || r.data.anchor;
        if (!special) want = false;
      }
      tmpV.copy(L.pos);
      if (L.kind === 'dept') { const d = depts.get(L.id); tmpV.y = TOP * d.grow + d.lift + 0.1; }
      if (L.kind === 'dest') { const d = depts.get(L.route.data.department); tmpV.y = L.pos.y; }
      tmpV.project(camera);
      let x = (tmpV.x * 0.5 + 0.5) * W, y = (-tmpV.y * 0.5 + 0.5) * H;
      if (L.anchor === 'left') { x -= L.w + 16; y -= L.h / 2; }
      else if (L.anchor === 'top') { x -= L.w / 2; y -= L.h + 6; }
      else if (L.anchor === 'right') { x += 12; y -= L.h / 2; }
      // etiquetas fijas (cantera / cliente ancla) se reacomodan dentro del lienzo en vez de ocultarse
      if (L.kind === 'quarry' || L.route?.data.anchor) { x = clamp(x, 4, W - L.w - 4); y = clamp(y, 4, H - L.h - 4); }
      else { x -= L.w / 2; y -= L.h / 2; }
      const rect = [x - 3, y - 3, x + L.w + 3, y + L.h + 3];
      if (want && tmpV.z < 1) {
        for (const p of placed) if (rect[0] < p[2] && rect[2] > p[0] && rect[1] < p[3] && rect[3] > p[1]) { want = false; break; }
        if (rect[0] < 0 || rect[2] > W || rect[1] < 0 || rect[3] > H) want = L.kind === 'quarry';
      } else want = false;
      if (want) placed.push(rect);
      if (Math.abs(x - L.x) > 0.25 || Math.abs(y - L.y) > 0.25) { L.x = x; L.y = y; L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; }
      if (want !== L.on) { L.on = want; L.el.classList.toggle('svm-on', want); }
    }
  }

  // ---------- cámara ----------
  const CAM = { polar: 0, az: 0, margin: 0.02 };
  let camDist = 160;
  const target = new THREE.Vector3();
  function placeCamera(polar, az, dist) {
    camera.position.set(target.x + dist * Math.sin(polar) * Math.sin(az), target.y + dist * Math.cos(polar), target.z + dist * Math.sin(polar) * Math.cos(az));
    camera.lookAt(target);
  }
  function fitCamera() {
    if (!bbox) return;
    const a = camera.aspect, deg = THREE.MathUtils.degToRad;
    if (a >= 1.6) { CAM.polar = deg(53); CAM.az = deg(-9); }
    else if (a >= 1.1) { CAM.polar = deg(47); CAM.az = deg(-13); }
    else { CAM.polar = deg(42); CAM.az = deg(-20); }
    CAM.margin = a >= 1.6 ? 0.015 : 0.025;
    target.set((bbox.minX + bbox.maxX) / 2, 0, (bbox.minZ + bbox.maxZ) / 2);
    const pts = [];
    for (const d of depts.values()) for (const m of d.meshes) {
      const pa = m.geometry.attributes.position.array;
      for (let i = 0; i < pa.length; i += 3 * 29) pts.push(new THREE.Vector3(pa[i], pa[i + 1] > 0.5 ? TOP : -BEVEL, pa[i + 2]));
    }
    if (quarry.pos) pts.push(new THREE.Vector3(quarry.pos[0], TOP + QPIN_H, quarry.pos[1]));
    const lim = 1 - CAM.margin * 2, right = new THREE.Vector3(), fwd = new THREE.Vector3();
    const ext = () => { let a0 = 9, a1 = -9, b0 = 9, b1 = -9; for (const c of pts) { tmpV.copy(c).project(camera); a0 = Math.min(a0, tmpV.x); a1 = Math.max(a1, tmpV.x); b0 = Math.min(b0, tmpV.y); b1 = Math.max(b1, tmpV.y); } return [a0, a1, b0, b1]; };
    for (let pass = 0; pass < 3; pass++) {
      let lo = 10, hi = 2000;
      for (let i = 0; i < 36; i++) {
        const mid = (lo + hi) / 2; placeCamera(CAM.polar, CAM.az, mid); camera.updateMatrixWorld();
        const e = ext(); if ((e[1] - e[0]) / 2 <= lim && (e[3] - e[2]) / 2 <= lim) hi = mid; else lo = mid;
      }
      camDist = hi; placeCamera(CAM.polar, CAM.az, camDist); camera.updateMatrixWorld();
      const e = ext(), cx = (e[0] + e[1]) / 2, cy = (e[2] + e[3]) / 2;
      const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camDist, halfW = halfH * camera.aspect;
      right.setFromMatrixColumn(camera.matrixWorld, 0); right.y = 0; right.normalize();
      fwd.set(-Math.sin(CAM.az), 0, -Math.cos(CAM.az));
      target.addScaledVector(right, cx * halfW);
      target.addScaledVector(fwd, cy * halfH / Math.cos(CAM.polar));
    }
    placeCamera(CAM.polar, CAM.az, camDist);
  }
  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    S.size = { w, h };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const d of depts.values()) d.edgeMat.resolution.set(w, h);
    fitCamera();
    for (const L of labels) L.w = 0;
    if (S.ready) renderFrame(0);
  }

  // ---------- interacción ----------
  const cvs = renderer.domElement;
  function setPointer(e) {
    const r = cvs.getBoundingClientRect();
    S.pointer.x = e.clientX - r.left; S.pointer.y = e.clientY - r.top;
    S.pointer.nx = (S.pointer.x / r.width) * 2 - 1; S.pointer.ny = -(S.pointer.y / r.height) * 2 + 1;
    S.pointer.inside = true; S.pointer.dirty = true;
  }
  const onMove = (e) => { S.pointer.touch = e.pointerType === 'touch'; if (!S.pointer.touch) setPointer(e); };
  const onLeave = () => { S.pointer.inside = false; S.pointer.dirty = true; };
  let downAt = null;
  const onDown = (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t;
    downAt = null;
    if (moved > 10 || dt > 600) return;
    setPointer(e); S.pointer.touch = e.pointerType === 'touch';
    pick(true);
  };
  cvs.addEventListener('pointermove', onMove); cvs.addEventListener('pointerleave', onLeave);
  cvs.addEventListener('pointerdown', onDown); cvs.addEventListener('pointerup', onUp);

  function screenOf(x, y, z) { tmpV.set(x, y, z).project(camera); return [(tmpV.x * 0.5 + 0.5) * S.size.w, (-tmpV.y * 0.5 + 0.5) * S.size.h]; }
  function distToSeg(px, py, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l2, 0, 1);
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }
  const inFocus = (r) => !S.focus || r.data.zone === S.focus;
  function pick(fromTap = false) {
    S.pointer.dirty = false;
    let hr = null, hd = null;
    if (S.pointer.inside) {
      const { x, y } = S.pointer;
      let best = fromTap ? 26 : 16;
      for (const r of routes) {
        if (!r.drawn || !inFocus(r)) continue;
        const e = r.pts[r.pts.length - 1];
        for (const hgt of [r.pinH * 0.62, 0.3]) {
          const p = screenOf(e[0], TOP + hgt, e[1]); const d = Math.hypot(p[0] - x, p[1] - y);
          if (d < best) { best = d; hr = r; }
        }
      }
      if (!hr) {
        let bestL = fromTap ? 14 : 7;
        for (const r of routes) {
          if (!r.drawn || !inFocus(r)) continue;
          let prev = null;
          for (const pt of r.pts) { const p = screenOf(pt[0], TOP, pt[1]); if (prev) { const d = distToSeg(x, y, prev, p); if (d < bestL) { bestL = d; hr = r; } } prev = p; }
        }
      }
      if (!hr) {
        raycaster.setFromCamera({ x: S.pointer.nx, y: S.pointer.ny }, camera);
        const meshes = []; for (const d of depts.values()) meshes.push(...d.meshes);
        const hit = raycaster.intersectObjects(meshes, false)[0];
        if (hit) hd = hit.object.userData.id;
      }
    }
    if (hr !== S.hoverRoute || hd !== S.hoverDept) {
      S.hoverRoute = hr; S.hoverDept = hd;
      root.classList.toggle('svm-hot', !!(hr || hd));
      for (const L of labels) if (L.kind === 'dept') L.el.classList.toggle('svm-strong', L.id === hd);
      renderPop();
    }
  }
  function routeCard(r, pinned) {
    const z = r.zone;
    return `<div class="svm-lcard">
      <div class="svm-k"><span class="svm-lchip z-${z}">Zona ${z}</span>${pinned ? 'Tu obra · desde Ciudad Arce' : 'Desde Ciudad Arce'}</div>
      <div class="svm-t">${r.anchor ? 'Condado Quetzal' : r.name}</div>
      ${r.anchor ? `<div class="svm-sub">Quezaltepeque · desarrollo propio del grupo</div>` : `<div class="svm-sub" style="color:rgba(16,27,39,.5)">${DEPARTMENTS[r.department]?.name || ''}</div>`}
      <div class="svm-grid">
        <div><span>Distancia</span><b>${r.km.toFixed(1)} km</b></div>
        <div><span>Tiempo</span><b>${r.minutes} min</b></div>
        <div><span>Flete/viaje</span><b class="svm-blue">${fmtFlete(z)}</b></div>
      </div></div>`;
  }
  function renderPop() {
    const act = activeRoute();
    let key = '', html = '';
    if (S.hoverRoute || (S.pinned && !S.hoverDept)) {
      key = 'r:' + act.data.id + (act === S.pinned && !S.hoverRoute ? ':p' : '');
      html = routeCard(act.data, act === S.pinned && !S.hoverRoute);
    } else if (S.hoverDept) {
      const d = depts.get(S.hoverDept), info = DEPARTMENTS[S.hoverDept] || {}, sv = d?.served;
      const zl = sv?.zone;
      const n = routes.filter((r) => r.data.department === S.hoverDept).length;
      key = 'd:' + S.hoverDept;
      html = `<div class="svm-lcard svm-ltip"><div class="svm-k">Departamento</div><div class="svm-t">${d?.name || ''}</div>
        <div class="svm-row">${zl ? `<span class="svm-lchip z-${zl}">Desde zona ${zl}</span>` : `<span class="svm-lchip z-none">Bajo cotización</span>`}<span class="svm-mono">~${Math.round(info.km)} km</span><span>a ${info.capital}</span></div>
        <div class="svm-row">${n ? `${n} destino${n > 1 ? 's' : ''} · ` : ''}Flete <span class="svm-blue">${zl && ZONES[zl].flete ? `desde $${ZONES[zl].flete}` : 'a cotizar'}</span></div></div>`;
    }
    if (key !== S.popKey) { S.popKey = key; if (html) pop.innerHTML = html; }
    pop.classList.toggle('svm-on', !!html);
    if (html) positionPop();
  }
  function positionPop() {
    const { w: W, h: H } = S.size, pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x, y;
    const act = activeRoute();
    if (act && (S.hoverRoute || !S.hoverDept)) {
      const e = act.pts[act.pts.length - 1];
      const p = screenOf(e[0], TOP + act.pinH * 1.05, e[1]);
      x = p[0] + 16; y = p[1] - ph - 6;
      if (x + pw > W - 8) x = p[0] - pw - 16;
      if (y < 8) y = p[1] + act.pinH * 6;
    } else {
      x = S.pointer.x + 16; y = S.pointer.y + 18;
      if (x + pw > W - 8) x = S.pointer.x - pw - 16;
      if (y + ph > H - 8) y = S.pointer.y - ph - 14;
    }
    x = clamp(x, 6, Math.max(6, W - pw - 6)); y = clamp(y, 6, Math.max(6, H - ph - 6));
    pop.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
  }

  // ---------- API ----------
  function focusZone(z) { if (!S.ready) { S.pending.push(() => focusZone(z)); return; } S.focus = z && ZONES[z] ? z : null; S.featured = null; }
  function playIntro() {
    if (!S.ready) { S.pending.push(() => playIntro()); return; }
    if (!motion) return;
    S.introT = 0; S.introDone = false;
    for (const r of routes) { r.drawn = false; r.U.uDraw.value = 0; r.popT = -1; }
  }
  function showDestination(id) {
    if (!S.ready) { S.pending.push(() => showDestination(id)); return; }
    const r = id ? routes.find((x) => x.data.id === id) : null;
    S.pinned = r || null;
    if (r) {
      if (!r.drawn) { r.drawn = true; r.U.uDraw.value = 1; r.popT = S.time; }
      if (S.focus && r.data.zone !== S.focus) S.focus = null;
      const sp = trucks.find((t) => t.special);
      if (sp) { sp.r = r; sp.t0 = S.time; sp.oneWay = clamp(r.total / 4.4, 3.4, 16); sp.period = 2 * sp.oneWay + 2 * sp.pause; sp.vis = 0; }
    }
    S.popKey = ''; renderPop();
    if (S.ready && !S.raf) renderFrame(0);
  }
  function listDestinations() {
    return routes.map((r) => ({ id: r.data.id, name: r.data.anchor ? 'Condado Quetzal (Quezaltepeque)' : r.data.name, department: r.data.department, zone: r.data.zone, km: r.data.km, minutes: r.data.minutes, flete: fleteForZone(r.data.zone), anchor: !!r.data.anchor }))
      .sort((a, b) => a.km - b.km);
  }
  function select(id, emit = false) {
    if (!S.ready) { S.pending.push(() => select(id, emit)); return; }
    S.selected = id && depts.has(id) ? id : null;
    if (emit && S.selected && typeof opt.onSelect === 'function') {
      const info = DEPARTMENTS[id];
      opt.onSelect({ id, name: depts.get(id).name, km_from_quarry_approx: info?.km ?? null, zone: info?.zone ?? null, capital: info?.capital ?? null, flete: fleteForZone(info?.zone) });
    }
  }

  // ---------- loop ----------
  function posOnRoute(r, s, out) {
    const d = s * r.total, cum = r.cum;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1, t = (d - cum[lo]) / seg;
    out[0] = r.pts[lo][0] + (r.pts[hi][0] - r.pts[lo][0]) * t;
    out[1] = r.pts[lo][1] + (r.pts[hi][1] - r.pts[lo][1]) * t;
    return out;
  }
  const easeOutBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const pA = [0, 0], pB = [0, 0];

  function update(dt) {
    S.time += motion ? dt : 0;
    U.uTime.value = S.time;
    const t = S.time;
    if (S.deptIntroT >= 0) {
      S.deptIntroT += dt;
      for (const d of depts.values()) d.grow = 0.02 + 0.98 * easeOut((S.deptIntroT - d.growDelay) / 0.9);
      if (S.deptIntroT > 2) S.deptIntroT = -1;
    }
    if (S.introT >= 0) {
      S.introT += dt;
      let all = true;
      for (const r of routes) {
        const k = easeInOut((S.introT - r.startAt) / r.drawDur);
        r.U.uDraw.value = k;
        if (k >= 1 && !r.drawn) { r.drawn = true; r.popT = t; }
        if (k < 1) all = false;
      }
      if (quarry.group) quarry.group.scale.setScalar(Math.max(0.001, easeOutBack((S.introT - 0.35) / 0.55)));
      if (all) { S.introT = -1; S.introDone = true; S.featT = 0; }
    }
    // ruta destacada que va rotando (sólo si nadie interactúa)
    if (motion && S.introDone && !S.hoverRoute && !S.pinned) {
      S.featT -= dt;
      if (S.featT <= 0) {
        const pool = routes.filter(inFocus);
        if (pool.length) { S.featIdx = (S.featIdx + 1 + Math.floor(pool.length / 3)) % pool.length; S.featured = pool[S.featIdx]; }
        S.featT = 4.2;
      }
    } else if (S.hoverRoute || S.pinned) S.featured = null;

    for (const d of depts.values()) {
      const hov = d.id === S.hoverDept && !S.hoverRoute;
      const tl = d.id === S.selected ? 0.7 : hov ? 0.55 : 0;
      d.lift = reduced ? tl : damp(d.lift, tl, 10, dt);
      d.group.position.y = d.lift; d.group.scale.y = d.grow;
      d.capMat.userData.uHl.value = damp(d.capMat.userData.uHl.value, hov ? 1 : 0, 12, dt);
    }
    const act = activeRoute();
    let km = 0, nR = 0;
    for (const r of routes) {
      const f = inFocus(r);
      if (f) { km += r.data.km; nR++; }
      const tgtO = !f ? 0.12 : act && r !== act ? 0.35 : 1;
      r.opacity = reduced ? tgtO : damp(r.opacity, tgtO, 8, dt);
      r.hl = damp(r.hl, r === act ? 1 : r === S.featured ? 0.6 : 0, 8, dt);
      r.U.uOpacity.value = r.opacity; r.U.uHl.value = r.hl;
      const pk = r.popT <= -5 ? 1 : r.popT < 0 ? 0 : easeOutBack((t - r.popT) / 0.5);
      const bob = r === act || r === S.featured ? 1 + 0.12 * r.hl + (motion ? Math.sin(t * 5) * 0.03 * r.hl : 0) : 1;
      const s = Math.max(0.0001, pk * bob * (0.82 + 0.18 * r.opacity));
      r.pin.scale.set(r.pinBase.x * s, r.pinBase.y * s, 1);
      r.pinMat.opacity = clamp(r.opacity * 1.15, 0, 1);
      r.blob.visible = pk > 0.05;
    }
    // camiones
    let active = 0;
    if (truckBody) {
      const sc = mobile ? 2.9 : 1.95;
      trucks.forEach((tk, i) => {
        const r = tk.r;
        let u, want;
        if (tk.special) {
          if (!r) { want = 0; u = 0; }
          else { u = t - tk.t0; want = u < tk.period ? 1 : 0; if (!want) tk.r = null; }
        } else {
          want = r.drawn && inFocus(r) ? 1 : 0;
          u = ((t + tk.offset) % tk.period + tk.period) % tk.period;
        }
        tk.vis = damp(tk.vis, want, 6, dt);
        if (!r || tk.vis < 0.01) { tmpM.makeScale(0, 0, 0); truckBody.setMatrixAt(i, tmpM); truckLoad.setMatrixAt(i, tmpM); truckBlob.setMatrixAt(i, tmpM); return; }
        let s, out = true, moving = true;
        if (u < tk.oneWay) s = easeInOut(u / tk.oneWay);
        else if (u < tk.oneWay + tk.pause) { s = 1; moving = false; }
        else if (u < 2 * tk.oneWay + tk.pause) { s = 1 - easeInOut((u - tk.oneWay - tk.pause) / tk.oneWay); out = false; }
        else { s = 0; moving = false; }
        posOnRoute(r, s, pA);
        const look = 0.8 / r.total;
        posOnRoute(r, clamp(s + (out ? look : -look), 0, 1), pB);
        const dx = pB[0] - pA[0], dz = pB[1] - pA[1];
        if (Math.hypot(dx, dz) > 1e-4) { let dy = Math.atan2(-dz, dx) - tk.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); tk.yaw += dy * (1 - Math.exp(-14 * dt)); }
        if (want && moving) active++;
        const scale = sc * Math.max(0.0001, Math.min(1, tk.vis * 1.3));
        tmpQ.setFromAxisAngle(upY, tk.yaw);
        tmpV.set(pA[0], TOP + 0.06, pA[1]);
        tmpS.setScalar(scale); tmpM.compose(tmpV, tmpQ, tmpS); truckBody.setMatrixAt(i, tmpM);
        const loaded = out && !(s >= 1 && !moving);
        tmpS.setScalar(loaded ? scale : 0.0001); tmpM.compose(tmpV, tmpQ, tmpS); truckLoad.setMatrixAt(i, tmpM);
        tmpS.set(scale * 1.45, 1, scale * 0.78); tmpV.set(pA[0] + 0.12 * scale, TOP + 0.07, pA[1] + 0.1 * scale);
        tmpM.compose(tmpV, tmpQ, tmpS); truckBlob.setMatrixAt(i, tmpM);
      });
      truckBody.instanceMatrix.needsUpdate = truckLoad.instanceMatrix.needsUpdate = truckBlob.instanceMatrix.needsUpdate = true;
    }
    const px = S.pointer.inside && !S.pointer.touch && motion ? S.pointer.nx : 0;
    const py = S.pointer.inside && !S.pointer.touch && motion ? S.pointer.ny : 0;
    S.parallax.x = damp(S.parallax.x, px, 2, dt); S.parallax.y = damp(S.parallax.y, py, 2, dt);
    const drift = motion ? Math.sin(t * 0.1) * 0.018 : 0;
    placeCamera(CAM.polar - S.parallax.y * 0.035, CAM.az + S.parallax.x * 0.06 + drift, camDist);

    S.statsT += dt;
    if (opt.onStats && (S.statsT > 0.25 || dt === 0)) {
      S.statsT = 0;
      const st = { routes: nR, km: Math.round(km), trucksActive: active };
      const k = `${st.routes}|${st.km}|${st.trucksActive}`;
      if (k !== S.statsKey) { S.statsKey = k; try { opt.onStats(st); } catch (e) { console.warn(e); } }
    }
  }
  function renderFrame(dt) {
    update(dt);
    camera.updateMatrixWorld();
    if (S.pointer.dirty) pick();
    if (pop.classList.contains('svm-on')) { renderPop(); }
    renderer.render(scene, camera);
    layoutLabels();
  }
  function loop(now) {
    S.raf = 0;
    if (S.destroyed || !S.visible || !S.tabVisible) return;
    const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016);
    S.last = now; renderFrame(dt);
    S.raf = requestAnimationFrame(loop);
  }
  function startLoop() { if (!S.raf && S.ready && S.visible && S.tabVisible && !S.destroyed) { S.last = 0; S.raf = requestAnimationFrame(loop); } }
  function stopLoop() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }
  function beginIntro() {
    if (S.introStarted) return; S.introStarted = true;
    if (!motion || opt.intro === false) return;
    S.deptIntroT = 0; for (const d of depts.values()) d.grow = 0.02;
    playIntro();
  }
  const io = new IntersectionObserver((es) => { for (const e of es) { S.visible = e.isIntersecting; if (S.visible) { if (S.ready) beginIntro(); startLoop(); } else stopLoop(); } }, { threshold: 0.12 });
  const onVis = () => { S.tabVisible = !document.hidden; if (S.tabVisible) startLoop(); else stopLoop(); };
  document.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => resize());

  const ready = Promise.all([
    fetch(opt.geoUrl).then((r) => { if (!r.ok) throw new Error('GeoJSON ' + r.status); return r.json(); }),
    fetch(opt.routesUrl).then((r) => { if (!r.ok) throw new Error('rutas ' + r.status); return r.json(); }),
  ]).then(([geo, rdata]) => {
    if (S.destroyed) return ctrl;
    build(geo, rdata);
    if (motion && opt.intro !== false) {
      for (const d of depts.values()) d.grow = 0.02;
      if (quarry.group) quarry.group.scale.setScalar(0.001);
    } else {
      S.introDone = true;
      for (const r of routes) { r.drawn = true; r.U.uDraw.value = 1; r.popT = -10; }
    }
    S.ready = true;
    resize(); ro.observe(container); io.observe(container);
    S.pending.splice(0).forEach((fn) => fn());
    if (typeof opt.onReady === 'function') opt.onReady(ctrl);
    return ctrl;
  }).catch((err) => { console.warn('[sv-map]', err); throw err; });
  ready.catch(() => {});

  function destroy() {
    if (S.destroyed) return;
    S.destroyed = true; stopLoop(); io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    cvs.removeEventListener('pointermove', onMove); cvs.removeEventListener('pointerleave', onLeave);
    cvs.removeEventListener('pointerdown', onDown); cvs.removeEventListener('pointerup', onUp);
    for (const d of disposables) d.dispose?.();
    for (const m of [truckBody, truckLoad, truckBlob]) m?.dispose();
    envTex.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    root.remove();
  }
  const ctrl = {
    ready, destroy, resize: () => resize(), focusZone, playIntro, showDestination, listDestinations,
    select: (id, emit = false) => select(id, emit),
    get selected() { return S.selected; }, get mode() { return 'routes'; }, get theme() { return 'light'; },
    get state() { return { ready: S.ready, visible: S.visible, running: !!S.raf, introDone: S.introDone, focus: S.focus, pinned: S.pinned?.data.id ?? null }; },
  };
  return ctrl;
}

/* ------------------------------------------------------------------ */
/* Respaldo sin WebGL: SVG 2D con la misma API                         */
/* ------------------------------------------------------------------ */
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function mountFallback(container, opt, MODE) {
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const root = document.createElement('div');
  root.className = 'svm-root svm-fallback';
  container.appendChild(root);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.position = 'absolute'; svg.style.inset = '0';
  root.appendChild(svg);
  const fills = ['#2c6ce2', '#22529f', '#1d4177', '#19335b', '#162a45'];
  const tier = (id) => (id === 'la-libertad' ? 0 : (DEPARTMENTS[id]?.km ?? 999) < 50 ? 1 : (DEPARTMENTS[id]?.km ?? 999) < 60 ? 2 : (DEPARTMENTS[id]?.km ?? 999) < 110 ? 3 : 4);
  const paths = new Map();
  let selected = null, focus = null, destroyed = false;
  const routeEls = [];
  const paint = () => {
    for (const [id, el] of paths) {
      const sel = id === selected;
      el.setAttribute('fill', sel ? C.brand : MODE === 'select' ? (selected ? '#142233' : '#1f3a5a') : fills[tier(id)]);
      el.setAttribute('stroke', sel ? '#dff1ff' : 'rgba(124,196,255,.45)');
    }
    for (const r of routeEls) r.el.setAttribute('opacity', !focus || r.zone === focus ? 0.95 : 0.1);
  };
  const ready = Promise.all([fetch(opt.geoUrl).then((r) => r.json()), fetch(opt.routesUrl).then((r) => r.json())]).then(([geo, rd]) => {
    if (destroyed) return ctrl;
    const all = [];
    for (const f of geo.features) for (const p of (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)) all.push(...p[0]);
    const proj = geoMercator().fitExtent([[8, 8], [992, 492]], { type: 'MultiPoint', coordinates: all });
    svg.setAttribute('viewBox', '0 0 1000 500');
    const d = (ring) => 'M' + ring.map((c) => proj(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z';
    for (const f of geo.features) {
      const id = f.properties.id;
      const el = document.createElementNS(NS, 'path');
      el.setAttribute('d', (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map((p) => d(p[0])).join(''));
      el.setAttribute('stroke-width', '1');
      if (MODE === 'select') { el.style.cursor = 'pointer'; el.addEventListener('click', () => ctrl.select(id, true)); }
      const t = document.createElementNS(NS, 'title'); t.textContent = f.properties.name; el.appendChild(t);
      svg.appendChild(el); paths.set(id, el);
    }
    if (MODE === 'routes') for (const r of rd.routes) {
      const el = document.createElementNS(NS, 'polyline');
      el.setAttribute('points', r.coordinates.map((c) => proj(c).map((v) => v.toFixed(1)).join(',')).join(' '));
      el.setAttribute('fill', 'none'); el.setAttribute('stroke', r.anchor ? C.amber : C.blueLight); el.setAttribute('stroke-width', '2');
      svg.appendChild(el); routeEls.push({ el, zone: r.zone });
    }
    const q = proj([rd.origin.lon, rd.origin.lat]);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', q[0]); dot.setAttribute('cy', q[1]); dot.setAttribute('r', 6); dot.setAttribute('fill', C.amber);
    svg.appendChild(dot);
    paint();
    if (MODE === 'routes' && opt.onStats) opt.onStats({ routes: rd.routes.length, km: Math.round(rd.routes.reduce((a, r) => a + r.km, 0)), trucksActive: 0 });
    if (typeof opt.onReady === 'function') opt.onReady(ctrl);
    return ctrl;
  });
  ready.catch((e) => console.warn('[sv-map]', e));
  const ctrl = {
    ready,
    destroy() { destroyed = true; root.remove(); },
    resize() {}, playIntro() {},
    focusZone(z) { focus = z && ZONES[z] ? z : null; paint(); },
    select(id, emit = false) {
      if (id && !DEPARTMENTS[id]) return;
      selected = id || null; paint();
      if (emit && id && typeof opt.onSelect === 'function') {
        const info = DEPARTMENTS[id];
        opt.onSelect({ id, name: info.name, km_from_quarry_approx: info.km, zone: info.zone, capital: info.capital, flete: fleteForZone(info.zone) });
      }
    },
    get selected() { return selected; }, get mode() { return MODE; },
    get state() { return { ready: true, fallback: true }; },
  };
  if (opt.selected) ctrl.select(opt.selected);
  return ctrl;
}

export default mountSVMap;
