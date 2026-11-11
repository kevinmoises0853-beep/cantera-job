// Cantera JOB — Cotizador (prototipo para presentación)
import { PRODUCTS, TRUCKS, AGENTS, DEPTS, PLACES, ZONES, zoneForKm, fletePorViaje5, WHATSAPP } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '$' + n.toLocaleString('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => '$' + Math.round(n).toLocaleString('es-SV');

const TRUCK_SVG = '<svg viewBox="0 0 44 22"><path d="M2 4h24v12H2zM26 8h9l6 5v3H26zM8 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm25 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></svg>';

export function initQuote({ toast, scrollTo }) {
  const state = { mat: 'g67', m3: 40, mode: 'm3', dest: 4, km: 22, truck: 'job14', pickup: false, promo: true, dept: null };
  let mapCtl = null, mapMod = null;

  /* ---------- materiales ---------- */
  $('#matGrid').innerHTML = PRODUCTS.map(p => `<button type="button" class="mat${p.id === state.mat ? ' on' : ''}" data-id="${p.id}"><b>${p.name.replace('Grava combinada ', 'Grava ')}</b><small>$${p.price}/m³</small></button>`).join('');
  $('#matGrid').addEventListener('click', e => { const b = e.target.closest('.mat'); if (!b) return; state.mat = b.dataset.id; $$('.mat').forEach(x => x.classList.toggle('on', x === b)); calc(); });
  window.__selectMaterial = id => { state.mat = id; $$('.mat').forEach(x => x.classList.toggle('on', x.dataset.id === id)); calc(); };

  /* ---------- cantidad ---------- */
  const range = $('#m3Range'), num = $('#m3Num');
  const paintRange = () => range.style.setProperty('--p', ((range.value - range.min) / (range.max - range.min) * 100) + '%');
  range.addEventListener('input', () => { num.value = range.value; state.m3 = +range.value; paintRange(); calc(); });
  num.addEventListener('input', () => { const v = Math.max(1, +num.value || 1); state.m3 = v; range.value = Math.min(v, +range.max); paintRange(); calc(); });
  paintRange();
  $$('.qty-mode button').forEach(b => b.addEventListener('click', () => {
    $$('.qty-mode button').forEach(x => x.classList.toggle('on', x === b)); state.mode = b.dataset.mode;
    $('#qtyM3').hidden = state.mode !== 'm3'; $('#qtyObra').hidden = state.mode !== 'obra'; calc();
  }));
  ['#obraTipo', '#obraArea', '#obraEsp'].forEach(s => $(s).addEventListener('input', calc));
  function obraM3() {
    const area = Math.max(0, +$('#obraArea').value || 0), esp = Math.max(0, +$('#obraEsp').value || 0) / 100;
    const extra = { losa: 1.05, zapata: 1.1, muro: 1.05 }[$('#obraTipo').value];
    const concreto = area * esp * extra;
    const prod = PRODUCTS.find(p => p.id === state.mat);
    // ~0.68 m³ de agregado grueso por m³ de concreto; chispa/polvo/selecto se piden directo
    const factor = ['g67', 'g34', 'g12'].includes(prod.id) ? 0.68 : prod.id === 'chispa' ? 0.45 : 1;
    const m3 = Math.max(1, Math.ceil(concreto * factor * 2) / 2);
    $('#obraOut').innerHTML = `Tu obra lleva ≈ <b>${concreto.toFixed(1)} m³</b> de concreto → necesitás <b>${m3} m³</b> de ${prod.name.toLowerCase()}.`;
    return m3;
  }

  /* ---------- destino ---------- */
  const sel = $('#destSel');
  sel.innerHTML = PLACES.map((p, i) => `<option value="${i}">${p.name} — ${DEPTS[p.dept].name}</option>`).join('') + '<option value="custom">Otro lugar (ingresar km)</option>';
  sel.value = state.dest;
  sel.addEventListener('change', () => {
    if (sel.value === 'custom') { $('#kmNum').focus(); calc(); return; }
    const p = PLACES[+sel.value]; state.dest = +sel.value; state.km = p.km; $('#kmNum').value = p.km;
    setDept(p.dept, { fromSelect: true }); calc();
  });
  $('#kmNum').addEventListener('input', () => { state.km = Math.max(0, +$('#kmNum').value || 0); if (sel.value !== 'custom') sel.value = 'custom'; calc(); });

  /* ---------- camión ---------- */
  $('#truckGrid').innerHTML = TRUCKS.map(t => `<button type="button" class="truck${t.id === state.truck ? ' on' : ''}" data-id="${t.id}" title="${t.note}">${TRUCK_SVG}<b>${t.name}</b><small>${t.cap} m³</small></button>`).join('');
  $('#truckGrid').addEventListener('click', e => { const b = e.target.closest('.truck'); if (!b) return; state.truck = b.dataset.id; $$('.truck').forEach(x => x.classList.toggle('on', x === b)); calc(); });
  $('#pickup').addEventListener('change', e => { state.pickup = e.target.checked; calc(); });
  $('#promo').addEventListener('change', e => { state.promo = e.target.checked; calc(); });

  /* ---------- cálculo ---------- */
  let last = null;
  function calc() {
    const prod = PRODUCTS.find(p => p.id === state.mat);
    const truck = TRUCKS.find(t => t.id === state.truck);
    const m3 = state.mode === 'obra' ? obraM3() : state.m3;
    const km = state.km;
    const place = sel.value === 'custom' ? null : PLACES[+sel.value];
    const zone = place ? place.zone : zoneForKm(km);
    const trips = Math.ceil(m3 / truck.cap);
    const material = m3 * prod.price;
    const fleteTrip = state.pickup ? 0 : Math.round(fletePorViaje5(km, zone) * truck.factor);
    const flete = trips * fleteTrip;
    const volDisc = m3 >= 500 ? material * 0.08 : 0;
    const firstTrip = Math.min(truck.cap, m3) * prod.price + fleteTrip;
    const promo = state.promo ? firstTrip * 0.15 : 0;
    const total = material + flete - volDisc - promo;
    last = { prod, truck, m3, km, zone, trips, material, fleteTrip, flete, volDisc, promo, total, place: sel.value === 'custom' ? `Destino a ${km} km` : PLACES[+sel.value].name };

    $('#zonePill').innerHTML = state.pickup ? '<b>P</b> Retiro en planta · Ciudad Arce' :
      `<b>${zone}</b> ${ZONES[zone].label} · ${ZONES[zone].range} · flete ${zone === 'D' ? 'estimado ' : ''}${money0(fletePorViaje5(km, zone))} por viaje de 5 m³`;

    const tr = $('#coTrucks');
    const showN = Math.min(trips, 40);
    tr.innerHTML = Array.from({ length: showN }, (_, i) => `<i style="animation-delay:${i * 18}ms"></i>`).join('') + `<em>${trips} viaje${trips > 1 ? 's' : ''} · ${truck.name} ${truck.cap} m³${trips > 40 ? ' (+' + (trips - 40) + ')' : ''}</em>`;

    $('#coLines').innerHTML = [
      `<div class="co-line"><span>${prod.name} · ${m3.toLocaleString('es-SV')} m³ × $${prod.price}</span><b>${money(material)}</b></div>`,
      `<div class="co-line"><span>${state.pickup ? 'Flete (retiro en planta)' : `Flete · ${trips} × ${money0(fleteTrip)} (${km} km)`}</span><b>${money(flete)}</b></div>`,
      volDisc ? `<div class="co-line disc"><span>Descuento por volumen (8 %)</span><b>−${money(volDisc)}</b></div>` : '',
      promo ? `<div class="co-line disc"><span>Promo lanzamiento · 15 % primer viaje</span><b>−${money(promo)}</b></div>` : '',
    ].join('');
    animateTotal(total);

    const agent = currentAgent();
    const msg = `Hola Cantera JOB 👋 Quiero cotizar:\n• ${prod.name}: ${m3} m³\n• Destino: ${last.place} (${km} km, zona ${zone})\n• Camión: ${truck.name} ${truck.cap} m³ · ${trips} viaje(s)\n• Total estimado en la web: ${money(total)} (IVA incl.)` + (agent ? `\nEjecutivo: ${agent.name}` : '');
    $('#waBtn').href = `https://wa.me/${(agent?.phone || WHATSAPP).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  }

  let shownTotal = 0;
  function animateTotal(to) {
    const el = $('#coTotal');
    if (window.gsap) { const o = { v: shownTotal }; gsap.to(o, { v: to, duration: .6, ease: 'power3.out', onUpdate: () => { el.textContent = money(o.v); }, onComplete: () => { shownTotal = to; } }); }
    else el.textContent = money(to);
    shownTotal = to;
  }

  /* ---------- departamentos / agentes ---------- */
  const pills = $('#deptPills');
  pills.innerHTML = Object.entries(DEPTS).map(([id, d]) => `<button type="button" data-id="${id}">${d.name}</button>`).join('');
  pills.addEventListener('click', e => { const b = e.target.closest('button'); if (b) setDept(b.dataset.id); });

  function currentAgent() { if (!state.dept) return null; return AGENTS[DEPTS[state.dept].region]?.[0]; }

  function setDept(id, { fromMap = false, fromSelect = false } = {}) {
    if (!DEPTS[id]) return;
    state.dept = id;
    $$('button', pills).forEach(b => b.classList.toggle('on', b.dataset.id === id));
    if (!fromMap) mapCtl?.select?.(id);
    if (!fromSelect) {
      // elegir el primer destino de ese departamento
      const i = PLACES.findIndex(p => p.dept === id);
      if (i >= 0) { sel.value = i; state.dest = i; state.km = PLACES[i].km; }
      else { sel.value = 'custom'; state.km = mapMod?.kmForDepartment?.(id) ?? DEPTS[id].km; }
      $('#kmNum').value = state.km;
    }
    renderAgents(id); calc();
  }

  function renderAgents(id) {
    const d = DEPTS[id]; const list = AGENTS[d.region] || [];
    const near = PLACES.filter(p => p.dept === id).sort((a, b) => a.km - b.km)[0];
    const km = near ? near.km : (mapMod?.kmForDepartment?.(id) ?? d.km); const z = near ? near.zone : zoneForKm(km);
    $('#agents').innerHTML = `
      <div class="ag-head"><h4>${d.name}</h4><span>Desde <b class="mono">${km} km</b> de la planta · Zona ${z}</span></div>
      <div class="ag-list">${list.map(a => `
        <div class="ag">
          <div class="ag-av" style="background:linear-gradient(140deg,hsl(${a.hue} 70% 52%),hsl(${a.hue + 25} 60% 32%))">${a.initials}</div>
          <div><b>${a.name}</b><small>${a.role}</small></div>
          <div class="ag-status">● En línea · responde en ~10 min</div>
          <div class="ag-btns"><a href="https://wa.me/${a.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + a.name.split(' ')[0] + ', quiero cotizar grava para ' + d.name + '.')}" target="_blank" rel="noopener">WhatsApp</a><a href="tel:${a.phone.replace(/\s/g, '')}">Llamar</a></div>
        </div>`).join('')}</div>`;
    if (window.gsap) gsap.from('#agents .ag', { y: 16, opacity: 0, stagger: .08, duration: .6, ease: 'power3.out' });
  }

  /* ---------- mapa (modo selección) ---------- */
  const mapEl = $('#selectMap');
  new IntersectionObserver(async (es, o) => {
    if (!es.some(e => e.isIntersecting)) return; o.disconnect();
    try {
      mapMod = await import('./sv-map.js');
      mapEl.querySelector('.map-loading')?.remove();
      mapCtl = mapMod.mountSVMap(mapEl, { mode: 'select', onSelect: d => setDept(d.id, { fromMap: true }) });
      window.__selectMap = mapCtl;
      if (state.dept) mapCtl.select?.(state.dept);
    } catch (err) {
      console.warn('Mapa de selección no disponible todavía', err);
      mapEl.querySelector('.map-loading').innerHTML = '<span></span>Usá los botones de departamento mientras carga el mapa.';
    }
  }, { rootMargin: '600px' }).observe(mapEl);

  /* ---------- imprimir / PDF ---------- */
  $('#printBtn').addEventListener('click', () => {
    if (!last) return;
    const L = last; const agent = currentAgent();
    const n = 'CJ-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 900 + 100);
    $('#printQuote').innerHTML = `
      <img src="assets/brand/logo-color.png" alt="Cantera JOB">
      <h1>Cotización ${n}</h1>
      <p>${new Date().toLocaleDateString('es-SV', { dateStyle: 'long' })} · Válida por 15 días · Estimación generada en canterajob.com</p>
      <table>
        <tr><th>Concepto</th><th>Detalle</th><th>Importe</th></tr>
        <tr><td>${L.prod.name}</td><td>${L.m3} m³ × $${L.prod.price}</td><td>${money(L.material)}</td></tr>
        <tr><td>Flete</td><td>${L.trips} viaje(s) · ${L.truck.name} ${L.truck.cap} m³ · ${L.place} (${L.km} km, zona ${L.zone})</td><td>${money(L.flete)}</td></tr>
        ${L.volDisc ? `<tr><td>Descuento por volumen</td><td>8 % sobre material</td><td>−${money(L.volDisc)}</td></tr>` : ''}
        ${L.promo ? `<tr><td>Promo de lanzamiento</td><td>15 % primer viaje</td><td>−${money(L.promo)}</td></tr>` : ''}
        <tr><td colspan="2" class="tot">Total estimado (IVA incluido)</td><td class="tot">${money(L.total)}</td></tr>
      </table>
      <p><b>Calidad:</b> desgaste Los Ángeles 22 % (norma ≤ 50 %), sanidad 0.38 %, 100 % caras fracturadas. Informe LSM-CCA-01-2026, CONSULTA S.A. de C.V.</p>
      ${agent ? `<p><b>Ejecutivo:</b> ${agent.name} · ${agent.phone}</p>` : ''}
      <p style="color:#666;font-size:9pt">Prototipo: tarifa de lanzamiento propuesta. Precio y fecha de entrega se confirman con el ejecutivo comercial.</p>`;
    const img = $('#printQuote img');
    const go = () => window.print();
    img.complete ? go() : (img.onload = go);
  });

  // destino elegido desde el buscador de la red (sección 2)
  window.__setDestination = (id) => {
    const i = PLACES.findIndex(p => p.id === id); if (i < 0) return;
    sel.value = i; state.dest = i; state.km = PLACES[i].km; $('#kmNum').value = state.km;
    setDept(PLACES[i].dept, { fromSelect: true }); calc();
  };

  setDept('la-libertad', { fromSelect: false });
  window.__setDestination('quezaltepeque');
}
