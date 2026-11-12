// Cantera JOB — datos de la página.
// Fuente: Informe LSM-CCA-01-2026 (CONSULTA, 22/10/2026) y Plan de ataque comercial (30/10/2026).
// Los precios son la "tarifa de lanzamiento propuesta" del plan; agentes y teléfonos son DATOS DE EJEMPLO (prototipo).

export const PRODUCTS = [
  {
    id: 'g67', name: 'Grava combinada No. 67', short: '3/4" + 1/2"', tag: 'Recomendada', size: 19, sizeMin: 4.75,
    price: 18, use: 'Concreto estructural, losas y premezclado', img: 'assets/img/pila-grava.jpg',
    desc: 'Mezcla 50:50 de grava 3/4" y 1/2" que el laboratorio recomienda para concreto estructural (banda ASTM C33 No. 67).',
    tags: ['Concreto estructural', 'Premezclado', 'Losas'],
  },
  {
    id: 'g34', name: 'Grava 3/4"', short: '19 mm', size: 19, sizeMin: 9.5, price: 17,
    use: 'Cimentaciones, concreto masivo y drenajes', img: 'assets/img/basalto-macro-2.jpg',
    desc: 'Piedra basáltica triturada, 100 % caras fracturadas. Desgaste Los Ángeles de 22 % (la norma permite 50 %).',
    tags: ['Cimentaciones', 'Concreto masivo', 'Drenajes'],
  },
  {
    id: 'g12', name: 'Grava 1/2"', short: '12.5 mm', size: 12.5, sizeMin: 4.75, price: 17,
    use: 'Prefabricados, columnas y vigas', img: 'assets/img/grava-cayendo.jpg',
    desc: 'Forma cúbica y angulosa, cero partículas planas o alargadas. Ideal para elementos esbeltos y prefabricados.',
    tags: ['Prefabricados', 'Columnas', 'Pavimentos'],
  },
  {
    id: 'chispa', name: 'Chispa 3/8"', short: 'Gravilla 9.5 mm', size: 9.5, sizeMin: 2.36, price: 11,
    use: 'Bloqueras, adoquín y prefabricados', img: 'assets/img/pila-cenital.jpg',
    desc: 'Gravilla para bloque, adoquín y elementos prefabricados. Equivalente de arena de 87 %: polvo de roca limpio.',
    tags: ['Bloqueras', 'Adoquín', 'Prefabricados'],
  },
  {
    id: 'polvo', name: 'Polvo de piedra', short: '< 4.75 mm', size: 4.75, sizeMin: 0.075, price: 7,
    use: 'Bases, bloqueras y mezclas asfálticas', img: 'assets/img/banda-polvo.jpg',
    desc: 'Fino de trituración para bases, mezclas asfálticas y fabricación de bloque.',
    tags: ['Bases', 'Asfalto', 'Bloque'],
  },
  {
    id: 'selecto', name: 'Material selecto', short: 'Terracería', size: 50, sizeMin: 0.075, price: 5,
    use: 'Terracerías y calles sin pavimentar', img: 'assets/img/terreno-inicio.jpg',
    desc: 'Material de relleno compactable para terracerías, plataformas y calles sin pavimentar.',
    tags: ['Terracería', 'Rellenos', 'Calles'],
  },
];

// Flete por viaje de 5 m³ según zona (Plan, sección 4)
export const ZONES = {
  A: { label: 'Zona A', range: '0–15 km', flete: 20, places: 'Ciudad Arce, Opico, Sacacoyo, Lourdes' },
  B: { label: 'Zona B', range: '15–30 km', flete: 30, places: 'Colón, Quezaltepeque, Santa Tecla, El Congo' },
  C: { label: 'Zona C', range: '30–45 km', flete: 40, places: 'San Salvador, Antiguo Cuscatlán, Santa Ana, Armenia' },
  D: { label: 'Zona D', range: '+45 km', flete: null, places: 'Sonsonate, Chalchuapa, Apopa, Soyapango y resto del país' },
};

export function zoneForKm(km) {
  if (km <= 15) return 'A';
  if (km <= 30) return 'B';
  if (km <= 45) return 'C';
  return 'D';
}

// Flete estimado por viaje de 5 m³. Zona D: $40 + $0.95 por km adicional (estimado, se confirma al cotizar).
// Si se conoce la zona comercial del destino (plan), manda la zona; si no, se deduce de los km.
export function fletePorViaje5(km, zone) {
  const z = zone || zoneForKm(km);
  if (z !== 'D') return ZONES[z].flete;
  return Math.max(45, Math.round(40 + (km - 45) * 0.95));
}

export const TRUCKS = [
  { id: 'v5', name: 'Volteo sencillo', cap: 5, factor: 1, note: 'Calles angostas y obra pequeña' },
  { id: 'v10', name: 'Volteo doble eje', cap: 10, factor: 1.7, note: 'Obra mediana' },
  { id: 'job14', name: 'Camión JOB', cap: 14, factor: 2.2, note: 'Flota propia · mejor precio por m³' },
];

// Ficha técnica (Plan, p. 5 — Informe LSM-CCA-01-2026)
export const SPEC = [
  { prop: 'Desgaste Los Ángeles', norma: 'ASTM C131', g34: '22 %', g12: '26 %', lim: '≤ 50 %', pct34: 44, pct12: 52, plain: '¿Se quiebra la piedra con golpes y fricción?' },
  { prop: 'Sanidad, sulfato de sodio', norma: 'ASTM C88', g34: '0.38 %', g12: '1.53 %', lim: '≤ 12 %', pct34: 3, pct12: 13, plain: '¿Aguanta años de lluvia, sol y sales?' },
  { prop: 'Terrones de arcilla', norma: 'ASTM C142', g34: '0.1 %', g12: '0.2 %', lim: '≤ 2 %', pct34: 5, pct12: 10, plain: '¿Viene sucia de barro?' },
  { prop: 'Partículas ligeras', norma: 'ASTM C123', g34: '0 %', g12: '0 %', lim: '≤ 0.5 %', pct34: 0, pct12: 0, plain: '¿Trae pómez, carbón o piedra liviana?' },
  { prop: 'Caras fracturadas', norma: 'ASTM D5821', g34: '100 %', g12: '100 %', lim: '—', pct34: null, pct12: null, plain: '¿Es piedra triturada y angulosa?' },
  { prop: 'Planas y alargadas (1:3)', norma: 'ASTM D4791', g34: '0 %', g12: '0 %', lim: '—', pct34: null, pct12: null, plain: '¿Tiene lajas que se quiebran?' },
  { prop: 'Finos que pasan No. 200', norma: 'ASTM C117', g34: '0.1 %', g12: '0.6 %', lim: '≤ 1.0 %', pct34: 10, pct12: 60, plain: '¿Viene lavada de polvo?' },
  { prop: 'Gravedad específica seca', norma: 'ASTM C127', g34: '2.594', g12: '2.610', lim: '—', pct34: null, pct12: null, plain: 'Densidad de la roca' },
  { prop: 'Absorción', norma: 'ASTM C127', g34: '1.73 %', g12: '1.76 %', lim: '—', pct34: null, pct12: null, plain: 'Cuánta agua absorbe' },
  { prop: 'Peso unitario varillado', norma: 'ASTM C29', g34: '1,598 kg/m³', g12: '1,524 kg/m³', lim: '—', pct34: null, pct12: null, plain: 'Peso por metro cúbico' },
];

export const STRENGTHS = [
  { kg: 140, name: 'No estructural', uses: 'Aceras, bordillos, plantillas', sacos: '7.2 sacos/m³' },
  { kg: 210, name: 'Estructural corriente', uses: 'Cimientos, muros, losas, vigas', sacos: '8.8 sacos/m³' },
  { kg: 310, name: 'Estructural media-alta', uses: 'Columnas, postensado, pavimentos', sacos: '11.2 sacos/m³' },
  { kg: 450, name: 'Alta resistencia', uses: 'Edificios altos, prefabricados', sacos: '12.5 sacos + aditivo' },
];

// Agentes comerciales por departamento — PROTOTIPO, datos de ejemplo
export const AGENTS = {
  occidente: [
    { name: 'Andrea Mejía', role: 'Ejecutiva comercial · Occidente', phone: '+503 7859 7168', initials: 'AM', hue: 212 },
    { name: 'Rodrigo Aguilar', role: 'Ferreterías y bloqueras · Occidente', phone: '+503 7859 7168', initials: 'RA', hue: 30 },
  ],
  libertad: [
    { name: 'Carlos Rivas', role: 'Ejecutivo comercial · Planta Ciudad Arce', phone: '+503 7859 7168', initials: 'CR', hue: 205 },
    { name: 'Gabriela Lemus', role: 'Concreteras y prefabricadoras', phone: '+503 7859 7168', initials: 'GL', hue: 160 },
  ],
  metro: [
    { name: 'Daniela Portillo', role: 'Ejecutiva comercial · Gran San Salvador', phone: '+503 7859 7168', initials: 'DP', hue: 220 },
    { name: 'José Hernández', role: 'Constructoras y proyectos', phone: '+503 7859 7168', initials: 'JH', hue: 260 },
  ],
  centro: [
    { name: 'Marcela Guardado', role: 'Ejecutiva comercial · Zona Central', phone: '+503 7859 7168', initials: 'MG', hue: 190 },
  ],
  oriente: [
    { name: 'Luis Ventura', role: 'Ejecutivo comercial · Oriente', phone: '+503 7859 7168', initials: 'LV', hue: 25 },
    { name: 'Ventas corporativas', role: 'Licitaciones y obra pública', phone: '+503 7859 7168', initials: 'VC', hue: 212 },
  ],
};

export const DEPTS = {
  'ahuachapan': { name: 'Ahuachapán', region: 'occidente', km: 78 },
  'santa-ana': { name: 'Santa Ana', region: 'occidente', km: 38 },
  'sonsonate': { name: 'Sonsonate', region: 'occidente', km: 52 },
  'la-libertad': { name: 'La Libertad', region: 'libertad', km: 12 },
  'san-salvador': { name: 'San Salvador', region: 'metro', km: 36 },
  'chalatenango': { name: 'Chalatenango', region: 'centro', km: 82 },
  'cuscatlan': { name: 'Cuscatlán', region: 'centro', km: 62 },
  'la-paz': { name: 'La Paz', region: 'metro', km: 74 },
  'cabanas': { name: 'Cabañas', region: 'centro', km: 104 },
  'san-vicente': { name: 'San Vicente', region: 'oriente', km: 92 },
  'usulutan': { name: 'Usulután', region: 'oriente', km: 138 },
  'san-miguel': { name: 'San Miguel', region: 'oriente', km: 170 },
  'morazan': { name: 'Morazán', region: 'oriente', km: 196 },
  'la-union': { name: 'La Unión', region: 'oriente', km: 212 },
};

// Destinos de la red (km por carretera medidos con OSRM, iguales a data/rutas.json; zona según el plan comercial)
export const PLACES = [
  { id: 'ciudad-arce', name: 'Ciudad Arce', dept: 'la-libertad', km: 4, zone: 'A' },
  { id: 'san-juan-opico', name: 'San Juan Opico', dept: 'la-libertad', km: 17, zone: 'A' },
  { id: 'lourdes', name: 'Lourdes, Colón', dept: 'la-libertad', km: 23, zone: 'A' },
  { id: 'sacacoyo', name: 'Sacacoyo', dept: 'la-libertad', km: 27, zone: 'A' },
  { id: 'el-congo', name: 'El Congo', dept: 'santa-ana', km: 13, zone: 'B' },
  { id: 'colon', name: 'Colón', dept: 'la-libertad', km: 23, zone: 'B' },
  { id: 'quezaltepeque', name: 'Quezaltepeque · Condado Quetzal', dept: 'la-libertad', km: 29, zone: 'B' },
  { id: 'santa-tecla', name: 'Santa Tecla', dept: 'la-libertad', km: 32, zone: 'B' },
  { id: 'santa-ana', name: 'Santa Ana', dept: 'santa-ana', km: 28, zone: 'C' },
  { id: 'armenia', name: 'Armenia', dept: 'sonsonate', km: 31, zone: 'C' },
  { id: 'antiguo-cuscatlan', name: 'Antiguo Cuscatlán', dept: 'la-libertad', km: 36, zone: 'C' },
  { id: 'san-salvador', name: 'San Salvador', dept: 'san-salvador', km: 48, zone: 'C' },
  { id: 'chalchuapa', name: 'Chalchuapa', dept: 'santa-ana', km: 37, zone: 'D' },
  { id: 'apopa', name: 'Apopa', dept: 'san-salvador', km: 40, zone: 'D' },
  { id: 'soyapango', name: 'Soyapango', dept: 'san-salvador', km: 51, zone: 'D' },
  { id: 'puerto-la-libertad', name: 'Puerto de La Libertad', dept: 'la-libertad', km: 55, zone: 'D' },
  { id: 'sonsonate', name: 'Sonsonate', dept: 'sonsonate', km: 57, zone: 'D' },
  { id: 'zacatecoluca', name: 'Zacatecoluca', dept: 'la-paz', km: 96, zone: 'D' },
  { id: 'usulutan', name: 'Usulután', dept: 'usulutan', km: 153, zone: 'D' },
  { id: 'san-miguel', name: 'San Miguel', dept: 'san-miguel', km: 178, zone: 'D' },
];

export const WHATSAPP = '50378597168';
