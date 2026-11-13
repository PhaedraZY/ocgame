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
const PANEL = [
  ['egg', '鸡蛋', 'egg'], ['milk', '牛奶', 'milk'], ['sugar', '糖', 'sugar'], ['apple', '青苹果', 'apple'], ['gel', '吉利丁', 'gel'],
  ['bowl', '搅拌碗', 'batter'], ['board', '砧板', 'chopped'], ['stove', '小锅', 'mold'], ['steamer', '蒸笼', null], ['fridge', '冰箱', 'jelly'],
  ['plate0', '盘子', null], ['plate1', '盘子', null], ['plate2', '盘子', null], ['caramel', '焦糖', 'caramel'], ['bell', '出餐', null],
  ['bread', '面包篮', 'bunB', 'burger'], ['lettuce', '生菜', 'lettuce', 'burger'], ['pine', '菠萝片', 'pine', 'burger'], ['eggF', '煎蛋', 'egg', 'burger'], ['griddle', '平底锅', 'eggC', 'burger'],
  ['flour', '面粉', 'flour', 'choco'], ['choco', '巧克力', 'chocoB', 'choco'],
];
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
  for (const [id, label, icon, need] of PANEL) {
    const b = document.createElement('button'); b.className = 'm-btn'; b.dataset.id = id; if (need) b.dataset.need = need;
    const ic = document.createElement('span'); ic.className = 'm-ic';
    if (icon) ic.append(iconCanvas(30, p => A.drawCarry(p, icon)));
    else if (id === 'steamer') ic.append(iconCanvas(30, p => { p.c.translate(4, 4); p.c.scale(.42, .42); A.drawSteamer(p, { state: 'empty' }); }));
    else if (id === 'bell') ic.textContent = '🔔';
    b.append(ic, Object.assign(document.createElement('b'), { textContent: label }), Object.assign(document.createElement('small'), { textContent: '' }));
    b.addEventListener('click', () => GD.click(id));
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
const NAMES = { pudding: '牛奶布丁', jelly: '青苹果果冻', burger: '菠萝鸡蛋堡', choco: '巧克力松饼' };
const orderIcons = new WeakMap();
let lastSig = '', tick = 0;
function status(id, kit) {
  const b = kit.bowl, pot = kit.pot, s = kit.steamer;
  const pctT = (t, T) => Math.min(99, Math.round(t / T * 100)) + '%';
  switch (id) {
    case 'bowl': return b.mixed ? [b.flour ? '面糊 ✓' : '布丁液 ✓', 'ok'] : (b.egg && b.milk && (b.sugar || b.flour)) ? [`搅 ${b.stir}/3`, 'go'] : [`${[b.egg, b.milk, b.sugar || b.flour].filter(Boolean).length}/3 样`, ''];
    case 'board': return kit.board.state === 'chopped' ? ['切好 ✓', 'ok'] : kit.board.state === 'apple' ? [`切 ${kit.board.chop}/3`, 'go'] : ['空', ''];
    case 'stove': return pot.state === 'cooking' ? ['煮 ' + pctT(pot.t, 5), 'run'] : pot.state === 'done' ? (pot.t > 9 ? ['快焦了!', 'warn'] : ['好了 ✓', 'ok']) : pot.state === 'burnt' ? ['焦了', 'bad'] : [`${[pot.apple, pot.gel].filter(Boolean).length}/2 样`, ''];
    case 'steamer': return s.state === 'steaming' ? ['蒸 ' + pctT(s.t, 6), 'run'] : s.state === 'done' ? (s.t > 10 ? ['快老了!', 'warn'] : ['好了 ✓', 'ok']) : s.state === 'burnt' ? ['蒸老了', 'bad'] : ['空', ''];
    case 'fridge': { const r = kit.fridge.filter(f => f.state === 'ready').length, c = kit.fridge.filter(f => f.state === 'chill'); return r ? [`${r} 份好了 ✓`, 'ok'] : c.length ? ['冷藏 ' + pctT(Math.max(...c.map(f => f.t)), 8), 'run'] : ['空', '']; }
    case 'plate0': case 'plate1': case 'plate2': { const it = kit.plates[+id.slice(5)]; return !it || it === 'reserved' ? ['空', ''] : it.dish === 'pudding' && !it.caramel ? ['待淋焦糖', 'go'] : it.dish === 'choco' && !it.sauce ? ['待淋巧克力', 'go'] : it.dish === 'burger' && it.messy ? ['叠错了', 'bad'] : it.dish === 'burger' && it.layers.length < 5 ? [`汉堡 ${it.layers.length}/5`, 'go'] : [NAMES[it.dish], 'ok']; }
    case 'griddle': return [kit.griddle.map(g => !g || g === 'reserved' ? '空' : g.state === 'flip' ? '翻面!' : g.state === 'burnt' ? '糊了' : g.state === 'done' ? '好✓' : '煎…').join('·'),
        kit.griddle.some(g => g && g.state === 'flip') ? 'warn' : kit.griddle.some(g => g && g.state === 'burnt') ? 'bad' : kit.griddle.some(g => g && g.state === 'done') ? 'ok' : kit.griddle.some(g => g && g !== 'reserved') ? 'run' : ''];
    default: return ['', ''];
  }
}
function refreshPanel() {
  const kit = GD.kit(); if (!kit) return;
  for (const [id] of PANEL) {
    const b = btns[id], [txt, cls] = status(id, kit);
    if (b.dataset.need) b.hidden = !GD.isOpen(b.dataset.need);
    b.lastElementChild.textContent = txt; b.dataset.s = cls;
    if (id.startsWith('plate')) {
      const it = kit.plates[+id.slice(5)], sig = it && it !== 'reserved' ? it.dish + it.caramel : '';
      if (b.dataset.sig !== sig) { b.dataset.sig = sig; const ic = b.firstElementChild; ic.innerHTML = ''; if (sig) ic.append(iconCanvas(30, p => { p.c.scale(.75, .75); A.drawPlateItem(p, it); })); }
    }
  }
  const h = GD.hint(); for (const [id, b] of Object.entries(btns)) b.classList.toggle('hint', id === h || (h && h.startsWith('griddle') && id === 'griddle'));
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
