// Cantera JOB — interacción y animación de la página
import { PRODUCTS, SPEC, STRENGTHS, ZONES, WHATSAPP } from './data.js';
import { initQuote } from './cotizador.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.matchMedia('(max-width: 860px)').matches;
const hasGSAP = typeof window.gsap !== 'undefined';
if (reduced) document.documentElement.classList.add('reduced');

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}
window.__toast = toast;

/* ---------------- smooth scroll ---------------- */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash) window.scrollTo(0, 0);
let lenis = null;
if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
if (!reduced && window.Lenis) {
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1 });
  if (hasGSAP) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  }
}
function scrollToEl(target) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.4 });
  else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
}
window.__scrollTo = scrollToEl;
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href'); if (id.length < 2) return;
  const el = $(id); if (!el) return;
  e.preventDefault(); closeMenu(); scrollToEl(el);
}));

/* ---------------- split text ---------------- */
function splitWords(el) {
  if (el.dataset.split) return;
  el.dataset.split = 1;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => `<span class="w"><span>${w}</span></span>`).join(' ');
}
$$('.split').forEach(splitWords);

/* ---------------- preloader + hero intro ---------------- */
function counter(el, to, dur = 1.6, dec = 0) {
  if (!hasGSAP || reduced) { el.textContent = Number(to).toLocaleString('es-SV', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return; }
  const o = { v: 0 };
  gsap.to(o, { v: to, duration: dur, ease: 'power3.out', onUpdate: () => {
    el.textContent = o.v.toLocaleString('es-SV', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  } });
}

function heroIntro() {
  document.body.classList.remove('is-loading');
  lenis?.start();
  if (!hasGSAP || reduced) { $$('.reveal-up').forEach(e => { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero-media video', { scale: 1.35, duration: 2.4, ease: 'power3.out' }, 0)
    .from('.hero-title .word', { yPercent: 115, rotate: 4, duration: 1.4, stagger: .08 }, .15)
    .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 1.2, stagger: .1 }, .55)
    .from('.nav-in > *', { y: -20, opacity: 0, duration: 1, stagger: .08 }, .4)
    .from('.ticker', { yPercent: 100, duration: 1.1 }, .7)
    .from('.hc-meter i', { scaleX: 0, duration: 1.6, ease: 'power3.out' }, 1);
  const hc = $('.hc-num'); if (hc) setTimeout(() => counter(hc, 22, 1.6), 900);
}

(function preload() {
  const pre = $('#preloader'); const num = $('#preNum'); const bar = $('#preBar');
  const vid = $('#heroVideo');
  if (!hasGSAP || reduced) { pre.remove(); heroIntro(); return; }
  lenis?.stop();
  let ready = false;
  const markReady = () => { ready = true; };
  if (vid.readyState >= 3) markReady(); else { vid.addEventListener('canplay', markReady, { once: true }); setTimeout(markReady, 1400); }
  const o = { v: 0 };
  gsap.to(o, { v: 22, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(o.v); gsap.set(bar, { scaleX: o.v / 22 }); }, onComplete: finish });
  function finish() {
    if (!ready) { setTimeout(finish, 120); return; }
    gsap.timeline()
      .to('.pre-inner', { y: -30, opacity: 0, duration: .6, ease: 'power3.in' })
      .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=.15')
      .add(() => { pre.remove(); }, '+=0')
      .add(heroIntro, '-=.75');
  }
})();

/* ---------------- nav ---------------- */
const nav = $('#nav');
let lastY = 0;
function onScrollNav(y) {
  nav.classList.toggle('scrolled', y > 40);
  nav.classList.toggle('hide', y > 500 && y > lastY + 4 && !$('#mobileMenu').classList.contains('open'));
  if (y < lastY - 4) nav.classList.remove('hide');
  lastY = y;
}
if (lenis) lenis.on('scroll', ({ scroll }) => onScrollNav(scroll));
else window.addEventListener('scroll', () => onScrollNav(scrollY), { passive: true });

const burger = $('#burger'), mm = $('#mobileMenu');
function closeMenu() { mm.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); mm.setAttribute('aria-hidden', 'true'); lenis?.start(); }
burger.addEventListener('click', () => {
  const open = !mm.classList.contains('open');
  mm.classList.toggle('open', open); burger.setAttribute('aria-expanded', String(open)); mm.setAttribute('aria-hidden', String(!open));
  open ? lenis?.stop() : lenis?.start();
});

// active link
const sections = ['nosotros', 'proceso', 'productos', 'calidad', 'logistica', 'voces'].map(id => $('#' + id)).filter(Boolean);
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) $$('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
}), { rootMargin: '-45% 0px -50% 0px' });
sections.forEach(s => io.observe(s));

/* ---------------- magnetic buttons ---------------- */
if (!reduced && window.matchMedia('(hover: hover)').matches) {
  $$('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * .22, y = (e.clientY - r.top - r.height / 2) * .3;
      b.style.transform = `translate(${x}px, ${y}px)`;
    });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });
}

/* ---------------- scroll animations ---------------- */
if (hasGSAP && !reduced) {
  // headings word reveal
  $$('.split').forEach(el => {
    gsap.from(el.querySelectorAll('.w > span'), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .045, scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.kicker').forEach(k => gsap.from(k, { opacity: 0, x: -20, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: k, start: 'top 90%' } }));

  // hero parallax out
  gsap.to('.hero-content', { yPercent: 18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-media video', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // film frame grows
  gsap.fromTo('#filmFrame', { scale: .82, borderRadius: 40 }, { scale: 1, borderRadius: 28, ease: 'none', scrollTrigger: { trigger: '#filmStage', start: 'top 95%', end: 'top 25%', scrub: true } });
  gsap.from('.film-quote', { opacity: 0, y: 30, duration: 1, scrollTrigger: { trigger: '.film-quote', start: 'top 90%' } });

  // about collage parallax
  $$('.ac').forEach(f => {
    const s = parseFloat(f.dataset.speed || 0);
    gsap.fromTo(f, { y: () => -s * 400 }, { y: () => s * 400, ease: 'none', scrollTrigger: { trigger: '.about-collage', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(f.querySelector('img'), { scale: 1.4, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 90%' } });
  });
  gsap.from('.pillar', { y: 30, opacity: 0, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.pillars', start: 'top 88%' } });

  // generic fade-ups
  ['.prod-item', '.q-card', '.spec', '.vp-item', '.timeline li', '.glass-card', '.stat', '.anchor-stats > div', '.agents', '.calc'].forEach(sel => {
    $$(sel).forEach((el, i) => gsap.from(el, { y: 40, opacity: 0, duration: 1, delay: (i % 6) * .06, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%' } }));
  });

  // parallax backgrounds
  ['.anchor-bg', '.fc-bg'].forEach(sel => gsap.fromTo(sel, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: $(sel).parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // VS numbers
  gsap.from('.vs-a', { x: -80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });
  gsap.from('.vs-b', { x: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.vs', start: 'top 80%' } });

  // footer giant
  gsap.from('.ft-giant', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 70%' } });
}

/* ---------------- counters on view ---------------- */
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target; cio.unobserve(el);
  counter(el, parseFloat(el.dataset.count), 1.8, parseInt(el.dataset.dec || 0));
}), { threshold: .6 });
$$('[data-count]').forEach(el => { if (!el.classList.contains('hc-num')) cio.observe(el); });

/* ---------------- lazy videos (play only on screen) ---------------- */
const vio = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
  else v.pause();
}), { rootMargin: '200px' });
$$('video[data-lazyvideo]').forEach(v => vio.observe(v));

/* ---------------- process horizontal scroll ---------------- */
function setupProcess() {
  if (!hasGSAP || reduced || isMobile()) return;
  const track = $('#processTrack');
  const dist = () => track.scrollWidth - window.innerWidth;
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '#processPin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: self => gsap.set('#procProg', { scaleX: self.progress }) },
  });
}
setupProcess();

/* ---------------- film ---------------- */
(async function film() {
  const frame = $('#filmFrame'), v = $('#filmVideo'), play = $('#filmPlay');
  const ctr = $('#filmControls');
  const FILM = 'assets/video/film-cantera-job.mp4';
  const exists = async (u) => { try { const r = await fetch(u, { method: 'HEAD' }); return r.ok; } catch { return false; } };
  const hasFilm = await exists(FILM);
  const hasTeaser = await exists('assets/video/film-teaser.mp4');
  const hasPoster = await exists('assets/video/film-cantera-job-poster.jpg');
  if (!hasPoster) v.poster = 'assets/img/planta-aerea.jpg';
  if (!hasTeaser) { v.innerHTML = '<source src="assets/video/hero-loop-720.mp4" type="video/mp4">'; v.load(); }
  // teaser autoplay when visible
  const tio = new IntersectionObserver(es => es.forEach(e => { if (frame.classList.contains('playing') || frame.classList.contains('paused')) return; e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }), { threshold: .3 });
  tio.observe(frame);
  v.addEventListener('loadedmetadata', () => {
    if (frame.classList.contains('playing') && isFinite(v.duration)) { const m = Math.floor(v.duration / 60), s = Math.round(v.duration % 60); $('#filmDur').textContent = `${m}:${String(s).padStart(2, '0')}`; }
  });

  async function start() {
    if (!hasFilm) { toast('La película se está terminando de editar — vuelve a intentarlo en unos minutos.'); return; }
    v.pause();
    v.innerHTML = `<source src="${FILM}" type="video/mp4">` + (await exists('assets/video/film-cantera-job.vtt') ? '<track kind="subtitles" srclang="es" label="Español" src="assets/video/film-cantera-job.vtt" default>' : '');
    v.loop = false; v.muted = false; v.controls = false; v.load();
    frame.classList.add('playing'); frame.classList.remove('paused'); ctr.hidden = false;
    try { await v.play(); } catch { v.muted = true; v.play(); }
  }
  play.addEventListener('click', start);
  $$('[data-open-film]').forEach(b => b.addEventListener('click', () => { scrollToEl('#pelicula'); setTimeout(start, 900); }));
  $('#fcPlay').addEventListener('click', () => { if (v.paused) { v.play(); frame.classList.remove('paused'); } else { v.pause(); frame.classList.add('paused'); } });
  $('#fcMute').addEventListener('click', e => { v.muted = !v.muted; e.currentTarget.style.opacity = v.muted ? .45 : 1; });
  $('#fcCC').addEventListener('click', e => { const t = v.textTracks[0]; if (!t) return; t.mode = t.mode === 'showing' ? 'hidden' : 'showing'; e.currentTarget.classList.toggle('on', t.mode === 'showing'); });
  $('#fcFull').addEventListener('click', () => { (frame.requestFullscreen || frame.webkitRequestFullscreen)?.call(frame); });
  $('#fcBar').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); if (isFinite(v.duration)) v.currentTime = (e.clientX - r.left) / r.width * v.duration; });
  v.addEventListener('timeupdate', () => { if (frame.classList.contains('playing') && v.duration) $('#fcProg').style.width = (v.currentTime / v.duration * 100) + '%'; });
  v.addEventListener('ended', () => { frame.classList.remove('playing', 'paused'); ctr.hidden = true; v.load(); });
})();

/* ---------------- products ---------------- */
(function products() {
  const list = $('#prodList');
  list.innerHTML = PRODUCTS.map((p, i) => `
    <button class="prod-item${i === 0 ? ' on' : ''}" role="tab" aria-selected="${i === 0}" data-id="${p.id}">
      <span class="pi-thumb"><img src="${p.img}" alt="" loading="lazy"></span>
      <span><span class="pi-t">${p.name}</span><br><span class="pi-s">${p.use}</span></span>
      <span class="pi-p">$${p.price}</span>
    </button>`).join('');
  function show(id) {
    const p = PRODUCTS.find(x => x.id === id);
    $$('.prod-item').forEach(b => { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const img = $('#pdImg');
    const swap = () => {
      img.src = p.img; img.alt = p.name;
      $('#pdName').textContent = p.name; $('#pdDesc').textContent = p.desc;
      $('#pdBadge').textContent = p.tag || '';
      $('#pdTags').innerHTML = p.tags.map(t => `<span>${t}</span>`).join('');
      $('#pdSizeTxt').textContent = p.id === 'selecto' ? 'Variable' : `${p.size} mm`;
      $('#sizeStone').style.setProperty('--s', Math.min(p.size, 34));
      $('#pdPrice').textContent = p.price; $('#pdTrip').textContent = p.price * 5;
      $('#pdQuote').dataset.product = p.id;
    };
    if (hasGSAP && !reduced) {
      gsap.timeline().to(['#pdImg', '.pd-body > *'], { opacity: 0, y: 10, duration: .2, stagger: .015 })
        .add(swap).to(['#pdImg', '.pd-body > *'], { opacity: 1, y: 0, duration: .5, stagger: .03, ease: 'power3.out' })
        .fromTo('#pdImg', { scale: 1.12 }, { scale: 1, duration: 1.2, ease: 'expo.out' }, '<');
    } else swap();
  }
  list.addEventListener('click', e => { const b = e.target.closest('.prod-item'); if (b) show(b.dataset.id); });
  $('#pdQuote').addEventListener('click', e => { window.__selectMaterial?.(e.currentTarget.dataset.product || 'g67'); });
  show('g67');
})();

/* ---------------- quality ---------------- */
(function quality() {
  const bars = $('#qBars');
  const rows = SPEC.filter(r => r.pct34 !== null);
  function render(g) {
    bars.innerHTML = rows.map(r => {
      const pct = g === '34' ? r.pct34 : r.pct12; const val = g === '34' ? r.g34 : r.g12;
      return `<div class="bar"><div class="bar-l"><b>${r.prop}</b><small>${r.plain}</small></div>
        <div class="bar-t"><i data-w="${pct}"></i><span>${pct} %</span><em>${val} de ${r.lim.replace('≤ ', '')}</em></div></div>`;
    }).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.bar-t i', bars).forEach(i => i.style.width = Math.max(i.dataset.w, .5) + '%')));
  }
  let shown = false;
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting && !shown) { shown = true; render('34'); o.disconnect(); } }), { threshold: .3 }).observe(bars);
  $$('.q-bars .seg button').forEach(b => b.addEventListener('click', () => {
    $$('.q-bars .seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    render(b.dataset.g);
  }));

  // resistencias
  const steps = $('#kgSteps');
  const cols = ['#f0dcc0', '#e6bd84', '#e2a556', '#e09a3e'];
  steps.innerHTML = STRENGTHS.map((s, i) => `<button class="kg${i === 1 ? ' on' : ''}" style="height:${38 + i * 20}%;background:${cols[i]}" data-i="${i}"><small>f'c</small><b>${s.kg}</b><small>kg/cm²</small></button>`).join('');
  const det = $('#kgDetail');
  const showKg = i => { const s = STRENGTHS[i]; det.innerHTML = `<h4>${s.name} · ${s.kg} kg/cm²</h4><p>${s.uses}</p><p class="mono">Dosificación de diseño: ${s.sacos}</p>`; $$('.kg', steps).forEach(b => b.classList.toggle('on', +b.dataset.i === i)); };
  steps.addEventListener('click', e => { const b = e.target.closest('.kg'); if (b) showKg(+b.dataset.i); });
  showKg(1);

  // ficha técnica
  $('#specTable').innerHTML = `<div class="st-row h" role="row"><span>Propiedad</span><span class="n">Norma</span><span>Grava 3/4"</span><span>Grava 1/2"</span><span class="l">Límite</span></div>` +
    SPEC.map(r => `<div class="st-row" role="row"><span class="p"><b>${r.prop}</b><small>${r.plain}</small></span><span class="n">${r.norma}</span><span class="v">${r.g34}</span><span class="v">${r.g12}</span><span class="l">${r.lim}</span></div>`).join('');
  $('#specDownload').addEventListener('click', () => toast('La ficha técnica completa se envía en PDF con cada cotización.'));
})();

/* ---------------- logistics map ---------------- */
(async function logistics() {
  const el = $('#routesMap');
  let ctl = null;
  const chips = $$('#zoneChips .chip');
  const setZoneInfo = z => {
    if (!z) { $('#ziPlaces').textContent = 'Toda la red de rutas activas'; $('#ziFlete').textContent = '$20 – $40 · zona D a cotizar'; return; }
    $('#ziPlaces').textContent = ZONES[z].places; $('#ziFlete').textContent = ZONES[z].flete ? `$${ZONES[z].flete}` : 'Según km · cotizar';
  };
  chips.forEach(c => c.addEventListener('click', () => { chips.forEach(x => x.classList.toggle('on', x === c)); const z = c.dataset.zone || null; setZoneInfo(z); ctl?.focusZone?.(z); }));
  setZoneInfo(null);
  const onStats = s => { if (!s) return; $('#lvRoutes').textContent = s.routes ?? '—'; $('#lvKm').textContent = s.km != null ? Math.round(s.km).toLocaleString('es-SV') : '—'; $('#lvTrucks').textContent = s.trucksActive ?? '—'; };
  // montar cuando se acerca al viewport
  const mount = async () => {
    try {
      const mod = await import('./sv-map.js');
      el.querySelector('.map-loading')?.remove();
      ctl = mod.mountSVMap(el, { mode: 'routes', onStats });
      window.__routesMap = ctl;
    } catch (err) {
      console.warn('Mapa 3D no disponible todavía', err);
      el.querySelector('.map-loading').innerHTML = '<span></span>El mapa se está preparando…';
    }
  };
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.disconnect(); mount(); } }), { rootMargin: '600px' }).observe(el);
})();

/* ---------------- voices ---------------- */
(async function voices() {
  const list = $('#vpList'), v = $('#vpVideo'), q = $('#vpQuote'), frame = v.parentElement;
  let chapters = [];
  try { const r = await fetch('assets/video/chapters.json', { cache: 'no-cache' }); if (r.ok) chapters = await r.json(); } catch {}
  const fix = p => p && !p.startsWith('assets/') ? 'assets/video/' + p : p;
  chapters = chapters.map(c => ({ ...c, file: fix(c.file), poster: fix(c.poster), vtt: fix(c.vtt) }));
  if (!chapters.length) {
    chapters = [
      { id: 'v1', title: 'La visión', quote: 'Cantera JOB nace con una visión clara: aprovechar los recursos naturales de manera responsable.', poster: 'assets/img/vocero-vision.jpg' },
      { id: 'v2', title: 'Piedra basáltica', quote: 'Tenemos hoy la materia prima para construir todos los desarrollos de Acres Inmobiliaria.', poster: 'assets/img/hermanos-piedra.jpg' },
      { id: 'v3', title: 'Logística propia', quote: 'Tenemos la materia prima, la maquinaria, los camiones y el punto de trituración.', poster: 'assets/img/duo-entrevista.jpg' },
      { id: 'v4', title: 'El primer viaje', quote: 'La grava 3/4" la vamos a llevar directamente hasta Condado Quetzal.', poster: 'assets/img/carga-camion-aerea.jpg' },
      { id: 'v5', title: 'Del cerro a la norma', quote: 'Bajo el control de calidad más riguroso para cumplir con la norma.', poster: 'assets/img/cerro-basalto.jpg' },
      { id: 'v6', title: 'Detrás de cada casa', quote: 'Detrás de una torre, una urbanización o una pequeña casa hay todo un proceso de transformación.', poster: 'assets/img/foto-DSC05317.jpg' },
    ];
  }
  const fmt = s => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '';
  list.innerHTML = chapters.map((c, i) => `<li><button class="vp-item${i === 0 ? ' on' : ''}" data-i="${i}">
      <span class="vp-th"><img src="${c.poster}" alt="" loading="lazy">${c.duration_s ? `<span>${fmt(c.duration_s)}</span>` : ''}</span>
      <span><span class="mono">${String(i + 1).padStart(2, '0')}</span><h4>${c.title}</h4><p>${c.quote}</p><span class="vp-prog"><i></i></span></span>
    </button></li>`).join('');
  let cur = 0;
  function load(i, autoplay) {
    cur = i; const c = chapters[i];
    $$('.vp-item', list).forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    q.textContent = `“${c.quote}”`;
    v.poster = c.poster;
    if (c.file) {
      v.innerHTML = `<source src="${c.file}" type="video/mp4">` + (c.vtt ? `<track kind="subtitles" srclang="es" label="Español" src="${c.vtt}" default>` : '');
      v.load(); if (autoplay) v.play().catch(() => {});
    } else { v.removeAttribute('src'); v.innerHTML = ''; if (autoplay) toast('Este clip se está terminando de editar.'); }
  }
  list.addEventListener('click', e => { const b = e.target.closest('.vp-item'); if (b) load(+b.dataset.i, true); });
  v.addEventListener('play', () => frame.classList.add('playing'));
  v.addEventListener('pause', () => frame.classList.remove('playing'));
  v.addEventListener('timeupdate', () => { const bar = $$('.vp-item', list)[cur]?.querySelector('.vp-prog i'); if (bar && v.duration) bar.style.width = (v.currentTime / v.duration * 100) + '%'; });
  v.addEventListener('ended', () => { if (cur < chapters.length - 1) load(cur + 1, true); });
  load(0, false);
})();

/* ---------------- before / after ---------------- */
(function beforeAfter() {
  const ba = $('#ba'), h = $('#baHandle');
  const set = p => { p = Math.max(0, Math.min(100, p)); ba.style.setProperty('--x', p + '%'); h.setAttribute('aria-valuenow', Math.round(p)); };
  let drag = false;
  const move = e => { if (!drag) return; const r = ba.getBoundingClientRect(); const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left; set(x / r.width * 100); };
  ba.addEventListener('pointerdown', e => { drag = true; ba.setPointerCapture(e.pointerId); move(e); });
  ba.addEventListener('pointermove', move);
  ba.addEventListener('pointerup', () => drag = false);
  h.addEventListener('keydown', e => { const cur = parseFloat(getComputedStyle(ba).getPropertyValue('--x')); if (e.key === 'ArrowLeft') set(cur - 4); if (e.key === 'ArrowRight') set(cur + 4); });
  if (hasGSAP && !reduced) {
    const o = { p: 85 };
    gsap.to(o, { p: 50, duration: 1.8, ease: 'expo.inOut', onUpdate: () => set(o.p), scrollTrigger: { trigger: ba, start: 'top 70%' } });
  }
})();

/* ---------------- marquee (scroll-velocity) ---------------- */
(function marquee() {
  const rows = $$('.marquee');
  rows.forEach(r => { const t = r.querySelector('.mq-track'); t.innerHTML += t.innerHTML; });
  if (reduced) return;
  let vel = 0;
  if (lenis) lenis.on('scroll', ({ velocity }) => { vel = velocity; });
  const state = rows.map(r => ({ el: r.querySelector('.mq-track'), dir: +r.dataset.dir, x: 0 }));
  let visible = false;
  new IntersectionObserver(es => es.forEach(e => visible = e.isIntersecting)).observe($('#galeria'));
  const tick = () => {
    if (visible) state.forEach(s => {
      const w = s.el.scrollWidth / 2;
      s.x -= (0.5 + Math.abs(vel) * 0.25) * s.dir;
      if (s.x <= -w) s.x += w; if (s.x > 0) s.x -= w;
      s.el.style.transform = `translate3d(${s.x}px,0,0)`;
    });
    vel *= .92; requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ---------------- WhatsApp float ---------------- */
$('#waFloat').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola Cantera JOB, quiero cotizar grava.')}`;

/* ---------------- cotizador ---------------- */
initQuote({ toast, scrollTo: scrollToEl });

window.addEventListener('load', () => hasGSAP && ScrollTrigger.refresh());
