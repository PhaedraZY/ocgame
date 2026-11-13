/* mobile.js — 竖屏手机版：画面上下撑满 + 跟随镜头 + 顶部订单条 + 底部操作盘；小屋可平移、长按搬家具。
   只在竖屏窄屏（≤760px）生效；电脑和横屏保持原布局。 */
(() => {
'use strict';
const mq = matchMedia('(max-width: 760px) and (orientation: portrait)');
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const A = Art;
let on = false, built = false;

/* ---------- layout switch ---------- */
function apply() {
  on = mq.matches;
  document.body.classList.toggle('mobile', on);
  if (on && !built) build();
  if (on) measure();
  dispatchEvent(new Event('resize'));
  if (typeof Home !== 'undefined') setTimeout(() => Home.repaint(), 60);
}
function measure() {
  const hdr = $('.top').getBoundingClientRect().height;
  document.documentElement.style.setProperty('--hdr', hdr + 'px');
}
mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
addEventListener('resize', () => { if (on) measure(); });

/* ---------- build the phone UI once ---------- */
const ORDER = ['source', 'bench', 'cooker', 'fill', 'plates', 'topping', 'bell'];
function panelList() {
  const st = THEME.kitchen.stations.slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const out = [];
  for (const s of st) {
    if (s.type === 'plates') s.spots.forEach((_, i) => out.push({ id: 'plate' + i, label: s.name, s }));
    else out.push({ id: s.id, label: s.type === 'bell' ? '出餐' : s.pad || s.name.replace(/（.*）/, ''), s });
  }
  return out;
}
const btns = {};
let strip, panel;
function iconCanvas(size, draw) {
  const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
  const c = cv.getContext('2d'); c.scale(size / 60 * dpr, size / 60 * dpr); draw(new Sketch.Pen(c, 5));
  return cv;
}
function build() {
  built = true;
  // sheets must escape the panning scene so they can cover the whole phone
  for (const id of ['sheet', 'hsheet']) { const s = document.getElementById(id); if (s) document.body.appendChild(s); }
  // HUD bits that should stay put while the scene pans
  const card = $('.shop-view .card'), hcard = $('.home-card');
  for (const sel of ['#shop .hud', '#tip', '#openBtn']) { const el = $(sel); if (el) card.appendChild(el); }
  const rh = $('#room .hud'); if (rh) hcard.appendChild(rh);

  strip = document.createElement('div'); strip.className = 'm-orders'; strip.innerHTML = '<span class="m-empty">还没有客人……</span>';
  card.parentNode.insertBefore(strip, card);
  panel = document.createElement('div'); panel.className = 'm-panel';
  for (const { id, label, s } of panelList()) {
    const b = document.createElement('button'); b.className = 'm-btn'; b.dataset.id = id; if (s.need) b.dataset.need = s.need;
    const ic = document.createElement('span'); ic.className = 'm-ic';
    const icon = s.icon || (s.item && GD.itemCarry(s.item));
    if (s.type === 'bell') ic.textContent = '🔔';
    else if (icon) ic.append(iconCanvas(30, p => A.drawCarry(p, icon)));
    else if (s.draw && s.box) ic.append(iconCanvas(30, p => { const k = 52 / Math.max(s.box[2], s.box[3]); p.c.translate(4, 4); p.c.scale(k, k); A.drawStation(p, s.draw, (s.slots || 1) > 1 ? [] : { inputs: [], coming: [], state: 'idle', t: 0, taps: 0 }); }));
    b.append(ic, Object.assign(document.createElement('b'), { textContent: label }), Object.assign(document.createElement('small'), { textContent: '' }));
    b.addEventListener('click', () => GD.click(id));
    b.addEventListener('pointerdown', () => GD.press(id, true));   // hold-to-fill stations
    panel.append(b); btns[id] = b;
  }
  card.parentNode.insertBefore(panel, card.nextSibling);
  setupPan(card, () => $('#shop'), false);
  setupPan(hcard, () => $('#room'), true);
  requestAnimationFrame(loop);
}

/* ---------- camera ---------- */
const cam = { shop: { x: 0, manual: 0, mx: 0 }, room: { x: null, manual: 0, mx: 0 } };
function setupPan(card, getScene, isRoom) {
  let st = null;
  card.addEventListener('pointerdown', e => {
    if (!on || e.pointerType === 'mouse') return;
    if (e.target.closest('.m-btn, .hud, .open-btn, .selbar, .sheet, .note')) return;
    st = { x: e.clientX, y: e.clientY, panning: false, base: (isRoom ? cam.room : cam.shop).x || 0 };
  });
  addEventListener('pointermove', e => {
    if (!st || !on) return;
    if (isRoom && typeof Home !== 'undefined' && Home.isDragging()) { st = null; return; }
    const dx = e.clientX - st.x;
    if (!st.panning && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - st.y)) st.panning = true;
    if (st.panning) { const c = isRoom ? cam.room : cam.shop; c.x = st.base - dx; c.manual = performance.now() + 3500; }
  });
  addEventListener('pointerup', () => {
    if (st && st.panning) addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
    st = null;
  });
}
function placeScene(scene, card, c, follow) {
  if (!scene || !card) return;
  const vw = card.clientWidth, sw = scene.clientWidth, max = Math.max(0, sw - vw);
  if (c.x === null) c.x = max / 2;
  if (follow != null && performance.now() > c.manual) c.x += (clamp(follow - vw / 2, 0, max) - c.x) * .08;
  c.x = clamp(c.x, 0, max);
  scene.style.transform = `translateX(${-c.x}px)`;
}

/* ---------- live panel / orders ---------- */
const orderIcons = new WeakMap();
let lastSig = '', tick = 0;
function refreshPanel() {
  const kit = GD.kit(); if (!kit) return;
  for (const { id, s } of panelList()) {
    const b = btns[id], [txt, cls] = GD.status(id);
    if (s.need) b.hidden = !GD.isOpen(s.need);
    b.lastElementChild.textContent = txt; b.dataset.s = cls;
    if (s.type === 'plates') {
      const it = kit[s.id][+id.slice(5)], sig = it && it !== 'reserved' ? JSON.stringify(it) : '';
      if (b.dataset.sig !== sig) { b.dataset.sig = sig; const ic = b.firstElementChild; ic.innerHTML = ''; if (sig) ic.append(iconCanvas(30, p => { p.c.scale(.75, .75); A.drawPlate(p, it); })); }
    }
  }
  const h = GD.hint();
  for (const [id, b] of Object.entries(btns)) b.classList.toggle('hint', !!h && (id === h || (h.startsWith(id) && /\d$/.test(h) && !id.startsWith('plate'))));
}
function refreshOrders() {
  const cs = GD.customers().filter(c => c.phase !== 'leave' && (c.ci >= 0 || c.qi >= 0));
  const sig = cs.map(c => c.seed + c.phase + c.served + Math.ceil(c.remain / c.patience * 3)).join();
  if (sig === lastSig) return; lastSig = sig;
  strip.innerHTML = cs.length ? '' : '<span class="m-empty">还没有客人……</span>';
  for (const c of cs.sort((a, b) => (a.qi >= 0) - (b.qi >= 0))) {
    let ic = orderIcons.get(c);
    if (!ic) { ic = iconCanvas(34, p => { p.c.scale(.75, .75); A.drawOrder(p, c.order); }); orderIcons.set(c, ic); }
    const n = Math.max(0, Math.min(3, Math.ceil(c.remain / c.patience * 3)));
    const d = document.createElement('button'); d.className = 'm-order' + (c.qi >= 0 ? ' queue' : '') + (c.served ? ' served' : '') + (n <= 1 ? ' hurry' : '');
    d.append(ic, Object.assign(document.createElement('span'), { innerHTML: `<b>${c.type.name}</b><i>${'♥'.repeat(n)}${'♡'.repeat(3 - n)}</i>` }));
    d.addEventListener('click', () => GD.clickCustomer(c));
    strip.append(d);
  }
}
function loop() {
  if (on) {
    const atHome = document.body.classList.contains('at-home');
    if (!atHome) { placeScene($('#shop'), $('.shop-view .card'), cam.shop, GD.girlX() * GD.scale()); if (++tick % 6 === 0) { refreshPanel(); refreshOrders(); } }
    else placeScene($('#room'), $('.home-card'), cam.room, null);
  } else { const s = $('#shop'), r = $('#room'); if (s) s.style.transform = ''; if (r) r.style.transform = ''; }
  requestAnimationFrame(loop);
}
apply();
})();
