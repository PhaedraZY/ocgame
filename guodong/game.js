/* game.js — 经营玩法引擎（所有 OC 共用）。
   原料 → 加工（计时，会做坏）→ 装盘 / 叠层 → 出餐；访客点设备，OC 蹦过去做；客人在门口排队。
   菜单、设备、做法、文字都在主题包里（<oc>/theme/dishes.json、kitchen.json、text.json），这里不写死任何一道菜。 */
(() => {
'use strict';
const { Pen, grainTile } = Sketch;
const A = Art, LW = A.LW, LH = A.LH;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pct = (v, total) => (v / total * 100) + '%';

/* ================= save ================= */
const TH = THEME, TX = TH.text, LINES = TX.lines, STORY = TX.story || {};
/* the OC's voice: every short line she says lives in text.json "voice" (edit them in the studio); the default is the key's text here */
const V = (k, d) => (TX.voice && TX.voice[k] != null) ? TX.voice[k] : d;
const SAVE_KEY = TH.save.shop;
const fresh = () => ({ day: 1, coins: 0, decor: [], served: 0, finished: false, stars: {}, seen: [], taught: {} });
let save = (() => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (_) { return fresh(); } })();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };
// test cheats: ?coins=99999 adds coins, ?day=2 jumps to a day (handy for trying the cottage)
{ const q = new URLSearchParams(location.search);
  if (q.has('coins')) save.coins += Math.max(0, parseInt(q.get('coins'), 10) || 0);
  if (q.has('day')) save.day = Math.max(1, parseInt(q.get('day'), 10) || 1);
  if (q.has('coins') || q.has('day')) { persist(); history.replaceState(null, '', location.pathname + (q.has('debug') ? '?debug' : '')); } }

/* ================= painting ================= */
const shop = $('#shop'), back = $('#back'), front = $('#front');
const grain = grainTile();
let K = 1, DPR = 1;
function paint(cv, w, h, scale, fn, seed, withGrain = true) {
  cv.width = Math.max(1, Math.round(w * scale * DPR)); cv.height = Math.max(1, Math.round(h * scale * DPR));
  const c = cv.getContext('2d'); c.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0); c.clearRect(0, 0, w, h);
  fn(new Pen(c, seed));
  if (withGrain) { c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .5; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, w * scale, h * scale); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  return cv;
}
function paintShop() {
  K = shop.clientWidth / LW; DPR = Math.min(2, devicePixelRatio || 1);
  const decor = new Set(save.decor);
  const unl = Object.fromEntries(MENU.map(m => [m.id, isOpen(m.id)]));
  paint(back, LW, LH, K, p => A.drawBack(p, decor, unl), 11);
  paint(front, LW, LH, K, p => A.drawFront(p, unl), 23);
  for (const [id, sp] of Object.entries(SPOTS)) spotEls[id].style.display = stOpen(sp.s) ? '' : 'none';
  Object.keys(canvases).forEach(paintCanvas); updateClears();
  for (const cu of customers) renderCustomer(cu);
  renderCarry();
}

/* ================= kitchen (data-driven: theme/kitchen.json) =================
   items 物品；stations 设备：source 拿原料 / bench 放料 + 连点 / cooker 计时（会糊、可翻面、可多格）/ plates / topping / bell。
   每台设备的 rules：need（放进去的）→ makes（做出来的）→ to（送去哪台设备，plates = 盘子）。 */
const KJ = TH.kitchen, ITEMS = KJ.items;
const ST = Object.fromEntries(KJ.stations.map(s => [s.id, s]));
const RES = 'reserved';
const PL = KJ.stations.find(s => s.type === 'plates').id;
const itemName = id => (ITEMS[id] || {}).name || id;
const carryOf = id => (ITEMS[id] || {}).carry || id;
const stOpen = s => !s.need || isOpen(s.need);
const ruleOpen = r => !r.need_dish || isOpen(r.need_dish);
const rulesOf = s => (s.rules || []).filter(ruleOpen);
const sameSet = (a, b) => a.length === b.length && b.every(x => a.includes(x));
// what an item is worth when thrown away: its own cost, or the sum of what it is made from
function costOf(id, depth = 0) {
  const it = ITEMS[id] || {}; if (it.cost != null) return it.cost; if (depth > 6) return 1;
  for (const s of KJ.stations) for (const r of s.rules || []) if (r.makes === id) return r.need.reduce((a, n) => a + costOf(n, depth + 1), 0);
  return 1;
}
const freshSlot = () => ({ inputs: [], coming: [], state: 'idle', t: 0, rule: null });
const freshBench = () => ({ inputs: [], taps: 0, made: null, rule: null });
function freshKit() {
  const k = {};
  for (const s of KJ.stations) {
    if (s.type === 'bench') k[s.id] = freshBench();
    else if (s.type === 'cooker') k[s.id] = Array.from({ length: s.slots || 1 }, freshSlot);
    else if (s.type === 'plates') k[s.id] = Array(s.slots).fill(null);
    else if (s.type === 'fill') k[s.id] = { state: 'idle', plate: -1, cup: null, level: 0, holding: false };
  }
  return k;
}
let kit = freshKit();
const plates = () => kit[PL];

/* station canvases (live drawings of what's in each station) */
const canvases = {};
const backSt = $('#backStations'), frontSt = $('#frontStations');
function addCanvas(key, box, s, slot) {
  const cv = document.createElement('canvas'); cv.className = 'stc ' + key;
  Object.assign(cv.style, { left: pct(box[0], LW), top: pct(box[1], LH), width: pct(box[2], LW), height: pct(box[3], LH) });
  (s.back ? backSt : frontSt).appendChild(cv);
  canvases[key] = { cv, box, s, slot };
}
for (const s of KJ.stations) {
  if (s.type === 'plates') s.boxes.forEach((b, i) => addCanvas('plate' + i, b, s, i));
  else if (s.slotBoxes) s.slotBoxes.forEach((b, i) => addCanvas(s.id + i, b, s, i));
  else if (s.box) addCanvas(s.id, s.box, s, null);
}
function paintCanvas(key) {
  const c = canvases[key], s = c.s, [, , w, h] = c.box;
  let fn;
  if (s.type === 'plates') { const it = plates()[c.slot]; fn = p => A.drawPlate(p, it && it !== RES ? it : null); }
  else if (s.type === 'bench') fn = p => A.drawStation(p, s.draw, kit[s.id]);
  else if (s.type !== 'cooker') fn = p => A.drawStation(p, s.draw, kit[s.id]);
  else if (c.slot != null) fn = p => A.drawStation(p, s.draw, kit[s.id][c.slot]);
  else fn = p => A.drawStation(p, s.draw, (s.slots || 1) > 1 ? kit[s.id] : kit[s.id][0]);
  c.cv.style.display = stOpen(s) ? '' : 'none';
  paint(c.cv, w, h, K, fn, 5 + key.length);
}
function renderStation(id) {
  for (const [key, c] of Object.entries(canvases)) if (c.s.id === id) paintCanvas(key);
  updateClears();
}

/* timer rings: one per cooker slot */
const rings = {};
const ringKey = (s, i) => (s.slots || 1) > 1 ? s.id + i : s.id;
for (const s of KJ.stations) if (s.type === 'cooker') (s.rings || [s.ring]).forEach((at, i) => {
  if (!at) return;
  const r = document.createElement('div'); r.className = 'ring'; r.style.left = pct(at[0], LW); r.style.top = pct(at[1], LH);
  r.innerHTML = '<i></i>'; $('#rings').appendChild(r); rings[ringKey(s, i)] = r;
});
function setRing(k, state, prog = 0) { const r = rings[k]; if (!r) return; r.dataset.s = state || ''; r.style.setProperty('--p', clamp(prog, 0, 1)); }

/* ================= hotspots ================= */
const SPOTS = {};      // spot id → { r, x, tag, s, slot }
for (const s of KJ.stations) {
  if (s.type === 'plates') s.spots.forEach((r, i) => { SPOTS['plate' + i] = { r, x: s.xs[i], tag: s.name, s, slot: i }; });
  else if (s.slotSpots) s.slotSpots.forEach((r, i) => { SPOTS[s.id + i] = { r, x: s.xs[i], tag: s.name, s, slot: i }; });
  else SPOTS[s.id] = { r: s.spot, x: s.x, tag: s.name, s, slot: null };
}
const spotEls = {};
for (const [id, sp] of Object.entries(SPOTS)) {
  const b = document.createElement('button'); b.className = 'spot'; b.dataset.spot = id;
  Object.assign(b.style, { left: pct(sp.r[0], LW), top: pct(sp.r[1], LH), width: pct(sp.r[2], LW), height: pct(sp.r[3], LH) });
  b.innerHTML = `<i>${sp.tag}</i>`; b.setAttribute('aria-label', sp.tag);
  b.addEventListener('click', e => { e.stopPropagation(); click(id); });
  b.addEventListener('pointerdown', () => press(id, true));
  $('#spots').appendChild(b); spotEls[id] = b;
}
addEventListener('pointerup', () => press(null, false)); addEventListener('pointercancel', () => press(null, false));
/* the little × that throws a station's contents away */
const CLEAR = {};
for (const s of KJ.stations) {
  if (s.type === 'plates') s.clears.forEach((at, i) => { CLEAR['plate' + i] = at; });
  else if (s.clear) CLEAR[s.id] = s.clear;
}
const clearEls = {};
for (const [k, [x, y]] of Object.entries(CLEAR)) {
  const b = document.createElement('button'); b.className = 'clear'; b.title = '倒掉'; b.textContent = '×';
  b.style.left = pct(x, LW); b.style.top = pct(y, LH);
  b.addEventListener('click', e => { e.stopPropagation(); clearStation(k); });
  $('#spots').appendChild(b); clearEls[k] = b;
}
function updateClears() {
  for (const [k, el] of Object.entries(clearEls)) {
    let on = false;
    if (k.startsWith('plate')) { const it = plates()[+k.slice(5)]; on = !!it && it !== RES; }
    else { const s = ST[k]; if (s.type === 'bench') on = kit[k].inputs.length > 0 || !!kit[k].made; else if (s.type === 'cooker') on = kit[k][0].state === 'idle' && kit[k][0].inputs.length > 0; }
    el.classList.toggle('on', on);
  }
}
const boxOf = key => (canvases[key] && canvases[key].box) || (SPOTS[key] && SPOTS[key].r) || (ST[key] && (ST[key].box || ST[key].spot)) || [0, 0, 0, 0];

/* ================= the girl ================= */
const girlEl = $('#girl'), gJelly = girlEl.querySelector('.g-jelly');
const earL = girlEl.querySelector('.ear-l'), earR = girlEl.querySelector('.ear-r');
const gBub = $('#gbubble'), carryEl = $('#held');
const HOME = 480;
const G = { x: HOME, sy: 0, vsy: 0, l: 0, vl: 0, r: 0, vr: 0, tw: 3, hop: 0, mood: 'calm', moodT: 0, act: null, step: 0, wait: 0, queue: [], carry: null };
const MOOD = { calm: [0, 0], happy: [6, -6], sad: [-26, 28], busy: [-4, 4], startle: [10, -10] };
function squish(a = 3) { G.vsy -= a; G.vl -= a * 50; G.vr += a * 50; }
function mood(m, t = 2.5) { G.mood = m; G.moodT = t; }
let gbT;
function say(t, ms = 2000) { gBub.textContent = t; gBub.classList.add('on'); clearTimeout(gbT); gbT = setTimeout(() => gBub.classList.remove('on'), ms); }
function carry(id, item) { G.carry = id; A.setCarryItem(item || null); renderCarry(); }
function renderCarry() {
  carryEl.style.width = (60 * K) + 'px'; carryEl.style.height = (60 * K) + 'px';
  if (!G.carry) { carryEl.classList.remove('on'); return; }
  paint(carryEl, 60, 60, K, p => A.drawCarry(p, G.carry), 3);
  carryEl.classList.add('on');
}
let idleT = 0;
function updateGirl(dt, now) {
  if (!G.act && G.queue.length) { G.act = G.queue.shift(); G.step = 0; G.wait = 0; }
  let walking = false;
  if (G.act) {
    const st = G.act.steps[G.step];
    const tx = clamp(st.x, 112, 912), d = tx - G.x;
    if (Math.abs(d) > 2 && !G.wait) {
      const step = Math.sign(d) * Math.min(Math.abs(d), 820 * dt);
      G.x += step; G.hop += Math.abs(step) / 44; walking = true;
    } else {
      if (!G.wait) squish(1.6);
      G.wait += dt;
      if (G.wait > .2) {
        const ok = st.fn() !== false;
        G.step++; G.wait = 0;
        if (!ok || G.step >= G.act.steps.length) { G.act = null; updateHints(); }
      }
    }
  } else if (Math.abs(G.x - HOME) > 2 && idleT > 1.6 && !KJ.stations.some(s => s.type === 'fill' && kit[s.id].state !== 'idle')) {   // she waits at a tap while you fill
    const step = Math.sign(HOME - G.x) * Math.min(Math.abs(HOME - G.x), 400 * dt);
    G.x += step; G.hop += Math.abs(step) / 44; walking = true;
  }
  if (G.act || G.queue.length) idleT = 0; else idleT += dt;
  const hopY = REDUCED || !walking ? 0 : Math.abs(Math.sin(G.hop * Math.PI)) * 9;
  G.vsy += (-320 * G.sy - 9 * G.vsy) * dt; G.sy = clamp(G.sy + G.vsy * dt, -.2, .2);
  if (G.moodT > 0) { G.moodT -= dt; if (G.moodT <= 0) G.mood = 'calm'; }
  const [tl, tr] = MOOD[G.mood];
  const wig = G.mood === 'happy' ? Math.sin(now / 90) * 3 : G.mood === 'busy' ? Math.sin(now / 60) * 1.5 : 0;
  G.vl += (-120 * (G.l - tl - wig) - 7 * G.vl) * dt; G.l = clamp(G.l + G.vl * dt, -60, 50);
  G.vr += (-120 * (G.r - tr + wig) - 7 * G.vr) * dt; G.r = clamp(G.r + G.vr * dt, -50, 60);
  G.tw -= dt; if (G.tw < 0) { (Math.random() < .5 ? G.vl -= 180 : G.vr += 180); G.tw = rnd(2.5, 6); }
  const br = Math.sin(now / 900) * .006;
  girlEl.style.left = ((G.x - 100.75) / LW * 100) + '%';
  gJelly.style.transform = `translateY(${(-hopY / 6.2).toFixed(3)}%) scale(${(1 - G.sy * .7 - br * .5).toFixed(4)}, ${(1 + G.sy + br).toFixed(4)})`;
  earL.style.transform = `rotate(${G.l.toFixed(2)}deg)`; earR.style.transform = `rotate(${G.r.toFixed(2)}deg)`;
  carryEl.style.left = ((G.x - 30) / LW * 100) + '%';
  carryEl.style.transform = `translateY(${-hopY * K}px)`;
}

/* ================= actions ================= */
function no(msg) { say(msg, 1800); mood('busy', .8); return false; }
function act(steps) {
  if (G.queue.length >= 5) { say(V('shop01', '……等、等一下，记不住了。'), 1400); return false; }
  G.queue.push({ steps }); updateHints(); return true;
}
const sx = id => SPOTS[id].x;
const plateX = i => sx('plate' + i);
const freePlate = () => plates().findIndex(p => p === null);
const snd = n => { const f = typeof BGM !== 'undefined' && BGM.sfx && BGM.sfx[n]; f && f(); };
const MENU_OPEN = () => MENU.filter(d => isOpen(d.id));

/* ---- where does an item go?  planDrop(item, toStationId) → { x, reserve(), cancel(), apply() } or { msg } ---- */
function planDrop(item, to) {
  const s = ST[to];
  if (!s) return { msg: `${itemName(item)}……放到哪里呢？` };
  if (s.type === 'bench') return dropBench(s, item);
  if (s.type === 'cooker') return dropCooker(s, item);
  if (s.type === 'plates') return dropPlates(item);
  return { msg: `${itemName(item)}……放到哪里呢？` };
}
function dropBench(s, item) {
  const b = kit[s.id];
  if (b.made) return { msg: `${s.name}里是做好的${itemName(b.made)}了。\n先把它拿走吧。` };
  if (b.inputs.includes(item)) return { msg: `${s.name}里已经有${itemName(item)}了。` };
  const want = [...b.inputs, item];
  if (!rulesOf(s).some(r => want.every(x => r.need.includes(x))))
    return { msg: `${itemName(item)}不能和${b.inputs.map(itemName).join('、')}放一起……\n` + rulesOf(s).map(r => `${itemName(r.makes)}：${r.need.map(itemName).join('、')}`).join('；') };
  return { x: s.x, reserve() {}, cancel() {}, apply() {
    const bb = kit[s.id];
    if (bb.made || bb.inputs.includes(item)) return no(`${itemName(item)}……放不下了。`);
    bb.inputs.push(item); renderStation(s.id); sparkle(s.id); snd('place');
  } };
}
function dropCooker(s, item, pref) {
  const slots = kit[s.id];
  const fits = sl => sl.state === 'idle' && !sl.inputs.includes(item) && !sl.coming.includes(item)
    && rulesOf(s).some(r => [...sl.inputs, ...sl.coming, item].every(x => r.need.includes(x)));
  let i = pref != null && fits(slots[pref]) ? pref : slots.findIndex(sl => fits(sl) && (sl.inputs.length || sl.coming.length));
  if (i < 0) i = slots.findIndex(sl => fits(sl) && !sl.inputs.length && !sl.coming.length);
  if (i < 0) {
    if (slots.some(sl => sl.state !== 'idle')) return { msg: (s.slots || 1) > 1 ? `${s.name}都在用……` : `${s.name}还在用……` };
    return { msg: `${s.name}里放不下${itemName(item)}了。` };
  }
  const x = s.slotSpots ? sx(s.id + i) : s.x;
  return { x, slot: i,
    reserve() { slots[i].coming.push(item); },
    cancel() { const c = kit[s.id][i].coming, k = c.indexOf(item); if (k >= 0) c.splice(k, 1); },
    apply() {
      const sl = kit[s.id][i]; this.cancel();
      if (sl.state !== 'idle' || sl.inputs.includes(item)) return no(`${s.name}……放不下了。`);
      sl.inputs.push(item); snd('place');
      const r = rulesOf(s).find(r => sameSet(sl.inputs, r.need));
      if (r) { sl.state = 'cooking'; sl.t = 0; sl.rule = r; snd(r.sfx || s.sfx || 'sizzle'); if (r.say && r.say.start) say(r.say.start, 1300); }
      renderStation(s.id);
    } };
}
/* plates: the next layer of a dish being stacked, a new stacked dish, or a new plated dish */
const stackOpen = (it, d) => it && it !== RES && !it.taken && it.layers && DISH[it.dish] && it.layers.length < DISH[it.dish].stack.length;
function dropPlates(item) {
  const pl = plates(), open = MENU_OPEN();
  const wantsTop = pl.findIndex(it => it && it !== RES && !it.taken && it.base && (DISH[it.dish].toppings || []).includes(item) && !it.tops.includes(item));
  if (wantsTop >= 0) return { x: plateX(wantsTop), reserve() {}, cancel() {}, apply() {
    const it = plates()[wantsTop]; if (!it || it === RES || it.tops.includes(item)) return no('……杯子不见了。');
    it.tops.push(item); renderStation(PL); sparkle('plate' + wantsTop); snd('place');
  } };
  const topOnly = open.find(d => (d.toppings || []).includes(item));
  if (topOnly && !open.some(d => d.base === item || (d.stack || []).includes(item))) return { msg: `先准备好${DISH[topOnly.id].name}的${itemName(topOnly.base)}，\n再放${itemName(item)}。` };
  const expecting = pl.findIndex(it => stackOpen(it) && !it.messy && DISH[it.dish].stack[it.layers.length] === item);
  if (expecting >= 0) return layerPlan(expecting, item);
  const starts = open.find(d => d.stack && d.stack[0] === item);
  const base = open.find(d => d.base === item);
  const dish = starts || base;
  if (dish) {
    const i = freePlate(); if (i < 0) return { msg: '没有空盘子了……' };
    return { x: plateX(i),
      reserve() { pl[i] = RES; }, cancel() { if (plates()[i] === RES) plates()[i] = null; },
      apply() { plates()[i] = starts ? { dish: dish.id, layers: [item], messy: false, tops: [] } : { dish: dish.id, base: item, tops: [] }; renderStation(PL); snd('place'); } };
  }
  const anyOpen = pl.findIndex(it => stackOpen(it) && DISH[it.dish].stack.includes(item));
  if (anyOpen >= 0) return layerPlan(anyOpen, item);
  const wants = open.find(d => d.stack && d.stack.includes(item));
  if (wants) return { msg: `先在盘子上放${itemName(wants.stack[0])}，\n再把${itemName(item)}叠上去。` };
  return { msg: `${itemName(item)}……放到哪里呢？` };
}
function layerPlan(i, item) {
  return { x: plateX(i), reserve() {}, cancel() {}, apply() {
    const it = plates()[i]; if (!stackOpen(it)) return no('……盘子上的不见了。');
    const d = DISH[it.dish], want = d.stack[it.layers.length];
    if (want !== item && !it.messy) { it.messy = true; snd('sad'); mood('sad', 1.6); say(`啊……叠、叠错了。\n${itemName(want)}应该先放。\n只能倒掉重来了。`, 2200); }
    it.layers.push(item); renderStation(PL); snd('place');
    if (it.layers.length === d.stack.length && !it.messy) { sparkle('plate' + i); say(`${d.name}，做好了！`, 1300); }
  } };
}
/* fetch from `fromX` (fn picks it up, may veto) and deliver along `plan` */
function carryTo(fromX, pickUp, plan) {
  if (plan.msg) return no(plan.msg);
  plan.reserve();
  if (!act([{ x: fromX, fn: () => { if (pickUp() === false) { plan.cancel(); return false; } } },
            { x: plan.x, fn: () => { carry(null); return plan.apply(); } }])) plan.cancel();
}

/* ---- clicking things ---- */
function click(id) {
  if (sheetOpen) return;
  pulse(id);
  const sp = SPOTS[id];
  if (!sp) { const s = ST[id]; if (s && s.slotSpots) return click(s.id + bestSlot(s)); return; }
  const s = sp.s;
  if (!stOpen(s)) return;
  switch (s.type) {
    case 'source': return carryTo(s.x, () => carry(carryOf(s.item)), planDrop(s.item, s.to));
    case 'bench': return benchClick(s);
    case 'cooker': return cookerClick(s, sp.slot);
    case 'plates': return servePlate(sp.slot);
    case 'topping': return toppingClick(s);
    case 'fill': return fillClick(s);
    case 'bell': {
      for (const cu of counterCustomers()) { if (cu.served) continue; const pi = matchPlate(cu); if (pi >= 0) return servePlate(pi, cu); }
      return no(counterCustomers().length ? '还没有做好的……' : '……还没有客人。');
    }
  }
}
function benchClick(s, pref) {
  const b = kit[s.id];
  if (b.made) {
    const item = b.made, r = b.rule, plan = ST[r.to] && ST[r.to].type === 'cooker' ? dropCooker(ST[r.to], item, pref) : planDrop(item, r.to);
    return carryTo(s.x, () => { if (kit[s.id].made !== item) return false; carry(carryOf(item)); kit[s.id] = freshBench(); renderStation(s.id); }, plan);
  }
  const r = rulesOf(s).find(r => sameSet(b.inputs, r.need));
  if (r) return act([{ x: s.x, fn: () => {
    const bb = kit[s.id]; if (bb.made || !sameSet(bb.inputs, r.need)) return false;
    bb.taps++; snd(s.sfx || 'stir');
    if (bb.taps >= r.taps) { bb.made = r.makes; bb.rule = r; say((r.say && r.say.made) || `${itemName(r.makes)}，好了！`, 1000); }
    renderStation(s.id); squish(2);
  } }]);
  const cand = rulesOf(s).filter(r => b.inputs.every(x => r.need.includes(x)));
  if (!b.inputs.length) return no(`${s.name}是空的。\n` + rulesOf(s).map(r => `${itemName(r.makes)}：${r.need.map(itemName).join('、')}`).join('\n'));
  return no(cand.map(r => `${itemName(r.makes)}要：${r.need.map(itemName).join('、')}。\n还差${r.need.filter(x => !b.inputs.includes(x)).map(itemName).join('、')}。`).join('\n') || `${s.name}里的东西做不了菜……点 × 倒掉吧。`);
}
function bestSlot(s) {     // the slot that most needs a tap
  const sl = kit[s.id], at = st => sl.findIndex(x => x.state === st);
  for (const st of ['flip', 'burnt', 'done']) { const i = at(st); if (i >= 0) return i; }
  const e = sl.findIndex(x => x.state === 'idle'); return e >= 0 ? e : 0;
}
function cookerClick(s, i) {
  if (i == null) i = bestSlot(s);
  const sl = kit[s.id][i], here = s.slotSpots ? sx(s.id + i) : s.x, rk = ringKey(s, i), r = sl.rule;
  const same = () => { const x = kit[s.id][i]; return x === sl ? x : null; };
  if (sl.state === 'cooking' || sl.state === 'cooking2') return no(`还在${s.verb}……`);
  if (sl.state === 'flip') return act([{ x: here, fn: () => {
    const x = same(); if (!x || x.state !== 'flip') return false;
    x.state = 'cooking2'; x.t = 0; renderStation(s.id); snd(r.sfx || 'sizzle'); squish(2.4); G.vl -= 200; G.vr += 200; say(V('shop02', '翻！'), 700);
  } }]);
  if (sl.state === 'burnt') return act([{ x: here, fn: () => {
    const x = same(); if (!x || x.state !== 'burnt') return false;
    const cost = x.inputs.reduce((a, n) => a + costOf(n), 0);
    kit[s.id][i] = freshSlot(); renderStation(s.id); setRing(rk); waste(cost, canvases[s.id + i] ? s.id + i : s.id);
    say((r && r.say && r.say.dump) || '……倒掉了。', 1400); mood('sad', 1.5);
  } }]);
  if (sl.state === 'done') {
    const item = r.makes;
    return carryTo(here, () => {
      const x = same(); if (!x || x.state !== 'done') return no('……啊，焦了。');
      carry(carryOf(item)); kit[s.id][i] = freshSlot(); renderStation(s.id); setRing(rk); if (s.sfx) snd(s.sfx);
    }, planDrop(item, r.to));
  }
  // idle
  if (sl.inputs.length) {
    const cand = rulesOf(s).filter(rr => sl.inputs.every(x => rr.need.includes(x)));
    return no(cand.map(rr => `${itemName(rr.makes)}要：${rr.need.map(itemName).join(' + ')}。\n还差${rr.need.filter(x => !sl.inputs.includes(x) && !sl.coming.includes(x)).map(itemName).join('、')}。`).join('\n'));
  }
  if (sl.coming.length) return;
  // empty: pull a finished bench output that belongs here (e.g. pour batter onto the griddle)
  const bench = KJ.stations.find(b => b.type === 'bench' && stOpen(b) && kit[b.id].made && kit[b.id].rule.to === s.id);
  if (bench) return benchClick(bench, i);
  const feeds = KJ.stations.filter(x => x.type === 'source' && x.to === s.id && stOpen(x)).map(x => x.name);
  const benches = KJ.stations.filter(b => b.type === 'bench' && stOpen(b) && rulesOf(b).some(rr => rr.to === s.id)).map(b => b.name);
  return no(`${s.name}空着。` + (feeds.length ? `\n点${feeds.join('、')}拿东西来${s.verb}` : '') + (benches.length ? `${feeds.length ? '，\n或者' : '\n'}先在${benches.join('、')}里做好` : '') + '。');
}
/* fill station (soda tap): she brings the glass over, then you HOLD the tap; let go inside the band */
function fillClick(s) {
  const f = kit[s.id];
  if (f.state === 'ready' || f.state === 'filling') return say(V('shop03', '按住水龙头不放，\n灌到绿色那一格就松手！'), 1600);
  if (f.state !== 'idle') return;
  const pi = plates().findIndex(it => it && it !== RES && !it.taken && it.base && (DISH[it.dish].toppings || []).includes(s.item) && !it.tops.includes(s.item));
  if (pi < 0) {
    const d = MENU_OPEN().find(d => (d.toppings || []).includes(s.item));
    return no(d ? `先准备一杯${itemName(d.base)}，\n再来灌${itemName(s.item)}。` : `没有要灌${itemName(s.item)}的杯子。`);
  }
  const cup = plates()[pi]; f.state = 'coming'; f.plate = pi; f.cup = cup;
  if (!act([{ x: plateX(pi), fn: () => { if (plates()[pi] !== cup) { Object.assign(kit[s.id], { state: 'idle', cup: null }); return false; } carry(cup.dish, A.toArtPlate(cup)); plates()[pi] = RES; renderStation(PL); } },
            { x: s.x, fn: () => { carry(null); Object.assign(kit[s.id], { state: 'ready', level: 0 }); renderStation(s.id); showGauge(s); say(V('shop04', '按住水龙头不放，\n灌到绿色那一格就松手！'), 2000); updateHints(); } }]))
    Object.assign(f, { state: 'idle', cup: null });
}
let pressing = null;
function press(id, down) {
  if (down) {
    const sp = SPOTS[id]; if (!sp || sp.s.type !== 'fill') return;
    const f = kit[sp.s.id]; if (f.state !== 'ready' && f.state !== 'filling') return;
    pressing = sp.s; f.holding = true; f.state = 'filling'; snd('pour');
    return;
  }
  if (!pressing) return;
  const s = pressing, f = kit[s.id]; pressing = null; f.holding = false;
  if (f.state !== 'filling') return;
  if (f.level < s.band[0]) { f.state = 'ready'; say(V('shop05', '还、还不够……\n再按住一点。'), 1300); return; }
  finishFill(s);
}
function finishFill(s) {
  const f = kit[s.id], cup = f.cup, pi = f.plate;
  cup.tops.push(s.item); f.state = 'back'; hideGauge(); renderStation(s.id); sparkle(s.id); snd('ready'); say((s.say && s.say.done) || '刚刚好！', 1200);
  act([{ x: s.x, fn: () => { carry(cup.dish, A.toArtPlate(cup)); Object.assign(kit[s.id], { state: 'idle', cup: null, level: 0 }); renderStation(s.id); } },
       { x: plateX(pi), fn: () => { carry(null); plates()[pi] = cup; renderStation(PL); snd('place'); updateHints(); } }]);
}
function overflow(s) {
  const f = kit[s.id], cup = f.cup, pi = f.plate;
  f.holding = false; pressing = null; hideGauge();
  Object.assign(f, { state: 'idle', cup: null, level: 0 }); if (plates()[pi] === RES) plates()[pi] = null;
  renderStation(s.id); renderStation(PL); snd('sad'); mood('sad', 1.6); burnt((s.say && s.say.overflow) || '啊……溢、溢出来了！');
  waste(plateCost(cup), s.id);
}
const gauge = document.createElement('div'); gauge.className = 'gauge'; gauge.innerHTML = '<b></b><i></i>'; $('#rings').appendChild(gauge);
function showGauge(s) {
  const [x, y, , h] = s.gauge; Object.assign(gauge.style, { left: pct(x, LW), top: pct(y, LH), height: pct(h, LH) });
  gauge.querySelector('b').style.cssText = `bottom:${s.band[0] * 100}%;height:${(s.band[1] - s.band[0]) * 100}%`;
  gauge.style.setProperty('--l', 0); gauge.classList.add('on');
}
function hideGauge() { gauge.classList.remove('on'); }
function toppingClick(s) {
  const pi = plates().findIndex(it => it && it !== RES && !it.taken && it.base && (DISH[it.dish].toppings || []).includes(s.item) && !it.tops.includes(s.item));
  if (pi < 0) return no(`没有要加${itemName(s.item)}的菜。`);
  act([{ x: s.x, fn: () => carry(carryOf(s.item)) },
       { x: plateX(pi), fn: () => { carry(null); const it = plates()[pi]; if (!it || it === RES || it.tops.includes(s.item)) return false; it.tops.push(s.item); renderStation(PL); sparkle('plate' + pi); snd('pour'); } }]);
}

/* ---- dishes on plates ---- */
function complete(it) {
  if (!it || it === RES) return false;
  const d = DISH[it.dish]; if (!d) return false;
  if (d.stack) return it.layers.length === d.stack.length && !it.messy;
  return (d.toppings || []).every(t => it.tops.includes(t));
}
function notDone(it) {
  const d = DISH[it.dish];
  if (d.stack) return it.messy ? `${d.name}叠错了……\n点 × 倒掉重来。` : `${d.name}还没做好（${it.layers.length}/${d.stack.length}）。`;
  return `${d.name}还没加${(d.toppings || []).filter(t => !it.tops.includes(t)).map(itemName).join('、')}。`;
}
const matchPlate = cu => plates().findIndex(it => complete(it) && !it.taken && it.dish === cu.order);
function servePlate(pi, target) {
  const it = plates()[pi];
  if (!it || it === RES) return no('盘子是空的。');
  if (!complete(it)) return no(notDone(it));
  if (it.taken) return;
  const cu = target || counterCustomers().find(c => c.order === it.dish && !c.served);
  if (!cu) return no('没有人点这个……\n先放着吧。');
  cu.served = true; it.taken = true;
  return act([{ x: plateX(pi), fn: () => { if (plates()[pi] !== it) { cu.served = false; return false; } carry(it.dish, A.toArtPlate(it)); plates()[pi] = null; renderStation(PL); } },
              { x: cu.cx, fn: () => { carry(null); serve(cu, it); } }]);
}

/* ---- waste: throwing food away costs its ingredients (real coins) ---- */
const plateCost = it => (it.layers || [it.base]).reduce((a, n) => a + costOf(n), 0);
function waste(n, key) {
  if (!n) return;
  save.coins = Math.max(0, save.coins - n); day.coins -= n; day.waste += n; persist(); updateHud();
  const [x, y, w] = boxOf(key);
  floatText(x + w / 2, y - 10, `−${n} 浪费`, 'bad');
}
function clearStation(k) {
  if (sheetOpen) return;
  if (k.startsWith('plate')) {
    const i = +k.slice(5);
    return act([{ x: plateX(i), fn: () => { const it = plates()[i]; if (!it || it === RES || it.taken) return false; plates()[i] = null; renderStation(PL); waste(plateCost(it), k); say(V('shop06', '……倒掉了。'), 900); } }]);
  }
  const s = ST[k];
  act([{ x: s.x, fn: () => {
    let cost = 0;
    if (s.type === 'bench') { const b = kit[k]; cost = b.made ? costOf(b.made) : b.inputs.reduce((a, n) => a + costOf(n), 0); kit[k] = freshBench(); }
    else { const sl = kit[k][0]; if (sl.state !== 'idle') return false; cost = sl.inputs.reduce((a, n) => a + costOf(n), 0); kit[k][0] = freshSlot(); }
    renderStation(k); waste(cost, k); if (s.type === 'bench') say(V('shop07', '倒掉了。'), 900);
  } }]);
}

/* ================= kitchen timers ================= */
let puffT = 0;
function updateKitchen(dt) {
  const puffNow = (puffT -= dt) < 0; if (puffNow) puffT = .45;
  for (const s of KJ.stations) if (s.type === 'fill') {
    const f = kit[s.id];
    if (f.state === 'filling' && f.holding) {
      f.level += s.rate * dt; gauge.style.setProperty('--l', Math.min(1, f.level)); renderStation(s.id);
      if (f.level >= 1) overflow(s);
    }
  }
  plates().forEach((it, i) => {
    if (!it || it === RES || it.melted) return;
    const d = DISH[it.dish]; if (!d || !d.melt || !complete(it)) return;
    it.age = (it.age || 0) + dt;
    if (it.age > d.melt) { it.melted = true; renderStation(PL); say(`${d.name}的冰……化了。`, 1400); }
  });
  for (const s of KJ.stations) {
    if (s.type !== 'cooker') continue;
    kit[s.id].forEach((sl, i) => {
      const rk = ringKey(s, i), r = sl.rule;
      if (sl.state === 'idle' || !r) return setRing(rk);
      sl.t += dt;
      const said = k => (r.say && r.say[k] != null) ? r.say[k] : null;
      if (sl.state === 'cooking' && sl.t >= r.cook) {
        if (r.flip) { sl.state = 'flip'; ding(rk); say(said('flip') || '该翻面了！', 1400); }
        else { sl.state = 'done'; sl.t = 0; ding(rk); const t = said('done'); if (t !== '') say(t || `${itemName(r.makes)}好了！`, 1300); }
        renderStation(s.id); updateHints();
      } else if (sl.state === 'cooking2' && sl.t >= (r.cook2 || r.cook)) { sl.state = 'done'; sl.t = 0; renderStation(s.id); ding(rk); say(said('done') || `${itemName(r.makes)}好了！`, 1200); updateHints(); }
      else if (sl.state === 'flip' && sl.t >= r.cook + r.flip) { sl.state = 'burnt'; renderStation(s.id); burnt(said('burnt') || '糊了！'); updateHints(); }
      else if (sl.state === 'done' && r.burn && sl.t >= r.burn) { sl.state = 'burnt'; renderStation(s.id); burnt(said('burnt') || '焦了！'); updateHints(); }
      if (sl.state === 'cooking') setRing(rk, 'run', sl.t / r.cook);
      else if (sl.state === 'cooking2') setRing(rk, 'run', sl.t / (r.cook2 || r.cook));
      else if (sl.state === 'flip') setRing(rk, 'warn', 1);
      else if (sl.state === 'done') setRing(rk, r.burn && sl.t > r.burn * .5 ? 'warn' : 'done', 1);
      else setRing(rk, 'bad', 1);
      const at = (s.puffs && s.puffs[i]) || s.puff;
      if (puffNow && at) puff(at[0], at[1], sl.state === 'burnt');
    });
  }
}
function burnt(t) { snd('burnt'); say(t, 1600); mood('startle', 1.4); G.vl += 300; G.vr -= 300; squish(2.5); }
function ding(k) { snd('ready'); const r = rings[k]; if (!r) return; r.classList.remove('ding'); void r.offsetWidth; r.classList.add('ding'); G.vl -= 160; G.vr += 160; }

/* ================= customers & queue ================= */
const COUNTER = [270, 480, 690];
const QUEUE = [[1000, 652, .84], [1078, 668, .88], [1152, 686, .92]];
const DOOR = [1046, 590, .7];
const custLayer = $('#custLayer');
const customers = [];
let lastType = '';
const counterCustomers = () => customers.filter(c => c.phase === 'order').sort((a, b) => a.arrived - b.arrived);
function renderCustomer(cu) {
  paint(cu.cv, 170, 160, K, p => cu.type.draw(p), cu.seed);
  cu.cv.style.width = (170 * K) + 'px'; cu.cv.style.height = (160 * K) + 'px';
  const ic = Math.max(34, 60 * K);
  cu.icon.style.width = ic + 'px'; cu.icon.style.height = ic * .9 + 'px';
  paint(cu.icon, 80, 72, ic / 80, p => A.drawOrder(p, cu.order), 9);
}
let spawnCount = 0;
function spawn(cfg) {
  let type; do { type = pick(A.CUSTOMERS); } while (type.id === lastType); lastType = type.id;
  const cv = document.createElement('canvas'); cv.className = 'cust'; cv.style.opacity = 0;
  const bub = document.createElement('div'); bub.className = 'order';
  const icon = document.createElement('canvas');
  const hearts = document.createElement('span'); hearts.className = 'hearts';
  const sayEl = document.createElement('p'); sayEl.className = 'csay';
  bub.append(icon, hearts, sayEl); custLayer.append(cv, bub);
  const newDish = MENU.find(m => m.ready && m.day === save.day && save.day > 1);
  const order = save.day === 1 && spawnCount < 2 ? ['pudding', 'jelly'][spawnCount] : newDish && spawnCount === 0 ? newDish.id : pick(cfg.dishes); spawnCount++;
  const pat = cfg.pat * type.pat * (DISH[order].pat || 1);
  const cu = { type, seed: Math.floor(rnd(1, 999)), cv, bub, icon, hearts, sayEl, order, phase: 'walk', next: null,
    patience: pat, remain: pat, pos: [...DOOR], from: [...DOOR], to: [...DOOR], t: 0, dur: .01, arrived: 0, ci: -1, qi: -1, cx: 0, served: false };
  renderCustomer(cu);
  cv.addEventListener('click', e => { e.stopPropagation(); clickCustomer(cu); }); bub.addEventListener('click', e => { e.stopPropagation(); clickCustomer(cu); });
  customers.push(cu); ringDoor();
  return cu;
}
function walkTo(cu, target, then) {
  cu.from = [...cu.pos]; cu.to = target; cu.t = 0;
  cu.dur = Math.max(.6, Math.hypot(target[0] - cu.pos[0], target[1] - cu.pos[1]) / 260);
  cu.phase = 'walk'; cu.next = then;
}
const counterTaken = i => customers.some(c => c.ci === i && c.phase !== 'leave');
function admit(cu) {
  const ci = COUNTER.findIndex((_, i) => !counterTaken(i));
  const waiting = customers.filter(c => c.qi >= 0).length;
  if (ci >= 0 && waiting === 0) return toCounter(cu, ci);
  if (waiting < QUEUE.length) { cu.qi = waiting; cu.bub.classList.add('small'); walkTo(cu, QUEUE[cu.qi], () => { cu.phase = 'queue'; cu.bub.classList.add('on'); }); return; }
  missed(cu); leave(cu, '人好多……下次再来。');
}
function toCounter(cu, ci) {
  cu.ci = ci; cu.qi = -1; cu.cx = COUNTER[ci];
  cu.bub.classList.remove('small', 'on');
  walkTo(cu, [COUNTER[ci], 736, 1], () => { cu.phase = 'order'; cu.arrived = performance.now(); cu.bub.classList.add('on'); updateHints(); say(pick(LINES.greet), 1500); });
}
function clickCustomer(cu) {
  if (sheetOpen || cu.phase !== 'order' || cu.served) return;
  const pi = matchPlate(cu);
  if (pi < 0) return no(`${cu.type.name}要的是${DISH[cu.order].name}。\n还没做好……`);
  servePlate(pi, cu);
}
function heartsText(cu) { const n = clamp(Math.ceil(cu.remain / cu.patience * 3), 0, 3); return '♥'.repeat(n) + '♡'.repeat(3 - n); }
function updateCustomers(dt) {
  const free = COUNTER.findIndex((_, i) => !counterTaken(i));
  if (free >= 0) {
    const head = customers.find(c => c.qi === 0 && c.phase === 'queue');
    if (head) {
      toCounter(head, free);
      customers.filter(c => c.qi > 0).forEach(c => { c.qi--; const was = c.phase; walkTo(c, QUEUE[c.qi], () => { c.phase = 'queue'; c.bub.classList.add('on'); }); if (was === 'walk') c.phase = 'walk'; });
    }
  }
  for (let i = customers.length - 1; i >= 0; i--) {
    const cu = customers[i];
    if (cu.phase === 'walk' || cu.phase === 'leave') {
      cu.t += dt;
      const k = ease(clamp(cu.t / cu.dur, 0, 1));
      cu.pos = [0, 1, 2].map(j => lerp(cu.from[j], cu.to[j], k));
      cu.cv.style.opacity = cu.phase === 'leave' ? 1 - clamp((cu.t - cu.dur + .4) / .4, 0, 1) : clamp(cu.t / .3, 0, 1);
      if (k >= 1) {
        if (cu.phase === 'leave') { cu.cv.remove(); cu.bub.remove(); customers.splice(i, 1); updateHints(); continue; }
        const f = cu.next; cu.next = null; f && f();
      }
    }
    if (!sheetOpen && cu.phase !== 'leave' && (cu.qi >= 0 || cu.ci >= 0) && !cu.served) {
      cu.remain -= dt * (cu.qi >= 0 ? .35 : 1);
      if (cu.remain <= 0) { missed(cu); snd('sad'); leave(cu, cu.type.leave); mood('sad', 2.2); say(pick(LINES.missed), 2000); continue; }
    }
    cu.hearts.textContent = heartsText(cu);
    cu.bub.classList.toggle('hurry', cu.remain < cu.patience * .34 && cu.phase !== 'leave');
    const [x, y, s] = cu.pos;
    const bob = cu.phase === 'walk' || cu.phase === 'leave' ? Math.abs(Math.sin(cu.t * 7)) * -5 : Math.sin(performance.now() / 420 + cu.seed) * 1.2;
    cu.cv.style.transform = `translate(${(x - 85) * K}px, ${(y - 160 + bob) * K}px) scale(${s})`;
    cu.bub.style.transform = `translate(${(x - 14) * K}px, ${(y - 160 * s - (cu.qi >= 0 ? 34 : 60)) * K}px)`;
  }
}
function missed(cu) {
  day.missed++;
  const n = Math.floor(priceOf(cu.order) * .3);
  if (n) { save.coins = Math.max(0, save.coins - n); day.coins -= n; day.missCost += n; persist(); updateHud(); }
  floatText(cu.pos[0], cu.pos[1] - 190, n ? `−${n} 错过客人` : '错过客人', 'bad');
}
function leave(cu, text) {
  if (cu.qi >= 0) { const q = cu.qi; cu.qi = -1; customers.filter(c => c.qi > q).forEach(c => { c.qi--; walkTo(c, QUEUE[c.qi], () => { c.phase = 'queue'; c.bub.classList.add('on'); }); }); }
  cu.ci = -1;
  cu.bub.classList.add('on', 'talk'); cu.bub.classList.remove('small'); cu.sayEl.textContent = text;
  cu.from = [...cu.pos]; cu.to = [...DOOR]; cu.t = 0; cu.dur = Math.max(1.4, Math.hypot(DOOR[0] - cu.pos[0], DOOR[1] - cu.pos[1]) / 240); cu.phase = 'leave';
  setTimeout(() => cu.bub.classList.remove('on'), 2200);
  updateHints();
}

function serve(cu, it) {
  if (cu.phase !== 'order') { const pi = plates().indexOf(null); if (pi >= 0) { delete it.taken; plates()[pi] = it; renderStation(PL); } say(V('shop08', '……客人走掉了。'), 1400); return; }
  const hearts = clamp(Math.ceil(cu.remain / cu.patience * 3), 0, 3);
  const tip = it.melted ? 0 : Math.max(0, hearts - 1) * cu.type.tip;
  const coins = priceOf(it.dish) + tip;
  save.coins += coins; day.coins += coins; day.ok++; save.served++; save.taught[it.dish] = (save.taught[it.dish] || 0) + 1; persist(); snd('coin'); setTimeout(() => snd('happy'), 260);
  floatText(cu.cx, 540, `+${coins}${tip ? `（小费 ${tip}）` : ''}`); hearts3(cu.cx, 580);
  mood('happy', 2.2); squish(3);
  say(pick(LINES.serve), 1600);
  leave(cu, cu.type.ok);
  updateHud();
}
function ringDoor() {
  snd('bell'); G.vl -= 240; G.vr += 240;
  const d = $('#doorbell'); d.classList.remove('ring'); void d.offsetWidth; d.classList.add('ring');
}

/* ================= small effects ================= */
const fxLayer = $('#fxLayer');
function floatText(x, y, t, cls = '') {
  const e = document.createElement('span'); e.className = 'float ' + cls; e.textContent = t;
  e.style.left = pct(x, LW); e.style.top = pct(y, LH); fxLayer.append(e); setTimeout(() => e.remove(), 1500);
}
function hearts3(x, y) { for (let i = 0; i < 3; i++) setTimeout(() => floatText(x + rnd(-40, 40), y + rnd(-10, 20), '♥'), i * 120); }
function sparkle(key) {
  const [x, y, w] = boxOf(key);
  for (let i = 0; i < 4; i++) {
    const e = document.createElement('span'); e.className = 'spark'; e.textContent = '✦';
    e.style.left = pct(x + w / 2 + rnd(-30, 30), LW); e.style.top = pct(y + rnd(0, 30), LH); e.style.animationDelay = (i * .06) + 's';
    fxLayer.append(e); setTimeout(() => e.remove(), 900);
  }
}
function puff(x, y, smoke) {
  if (REDUCED) return;
  const e = document.createElement('span'); e.className = 'puff' + (smoke ? ' smoke' : '');
  e.style.left = pct(x + rnd(-14, 14), LW); e.style.top = pct(y, LH);
  $('#puffs').append(e); setTimeout(() => e.remove(), 2200);
}
function pulse(id) { const el = spotEls[id]; if (!el) return; el.classList.remove('tap'); void el.offsetWidth; el.classList.add('tap'); }

/* ================= hints =================
   Worked out from the recipe data: what does the dish need, which station makes that, what does that station need … */
const tip = $('#tip');
const toWord = dest => dest === PL ? '放到盘子上' : ST[dest].put || `放进${ST[dest].name}`;
function produce(item, dest, depth = 0) {
  if (depth > 8) return [null, '……'];
  const src = KJ.stations.find(s => s.type === 'source' && s.item === item && s.to === dest && stOpen(s));
  if (src) return [src.id, `点${src.name}，把${itemName(item)}${toWord(dest)}`];
  for (const s of KJ.stations) {
    if (!stOpen(s)) continue;
    for (const r of rulesOf(s)) {
      if (r.makes !== item || r.to !== dest) continue;
      if (s.type === 'bench') {
        const b = kit[s.id];
        if (b.made === item) return [s.id, `点${s.name}，把${itemName(item)}${toWord(dest)}`];
        if (b.made || !b.inputs.every(x => r.need.includes(x))) return [null, `${s.name}里的东西做不了${itemName(item)}……点碗边的 × 倒掉`];
        if (sameSet(b.inputs, r.need)) return [s.id, `点${s.name}${s.tap || '搅'}一${s.tap || '搅'}（${b.taps}/${r.taps}）`];
        return produce(r.need.find(x => !b.inputs.includes(x)), s.id, depth + 1);
      }
      if (s.type === 'cooker') {
        const slots = kit[s.id].map((sl, i) => [sl, i]), spot = i => s.slotSpots ? s.id + i : s.id;
        const mine = slots.filter(([sl]) => sl.rule === r || (sl.state === 'idle' && (sl.inputs.length || sl.coming.length) && [...sl.inputs, ...sl.coming].every(x => r.need.includes(x))));
        const at = st => mine.find(([sl]) => sl.state === st);
        let m;
        if ((m = at('flip'))) return [spot(m[1]), `冒泡了！快点${s.name}翻面`];
        if ((m = at('done'))) return [spot(m[1]), `${itemName(item)}好了！点${s.name}，${toWord(dest)}`];
        if ((m = at('burnt'))) return [spot(m[1]), `${s.verb}过头了……点${s.name}倒掉重来`];
        if (at('cooking') || at('cooking2')) return [null, `${itemName(item)}在${s.name}里${s.verb}……等进度圈转满${r.burn ? '（别放太久！）' : '，可以先去做别的'}`];
        const coll = mine.find(([sl]) => sl.state === 'idle');
        const have = coll ? [...coll[0].inputs, ...coll[0].coming] : [];
        const miss = r.need.find(x => !have.includes(x));
        if (!miss) return [null, `${s.name}马上就${s.verb}上了……`];
        if (!coll && !slots.some(([sl]) => sl.state === 'idle')) return [null, `${s.name}都在用……先等一下`];
        return produce(miss, s.id, depth + 1);
      }
    }
  }
  return [null, `需要${itemName(item)}……`];
}
function nextStep(dishId) {
  const d = DISH[dishId], pl = plates();
  const mine = pl.map((it, i) => [it, i]).filter(([it]) => it && it !== RES && !it.taken && it.dish === dishId);
  const done = mine.find(([it]) => complete(it));
  if (done) return ['plate' + done[1], `${d.name}做好啦！点盘子（或点客人）出餐`];
  if (d.stack) {
    const open = mine.filter(([it]) => !complete(it)), tidy = open.find(([it]) => !it.messy);
    if (!tidy && open.length) return [null, '叠错了……点那个盘子右上角的 × 倒掉，重新开始'];
    return produce(tidy ? d.stack[tidy[0].layers.length] : d.stack[0], PL);
  }
  const based = mine.find(([it]) => it.base);
  if (based) {
    const top = (d.toppings || []).find(t => !based[0].tops.includes(t));
    const ts = KJ.stations.find(s => (s.type === 'topping' || s.type === 'fill') && s.item === top && stOpen(s));
    if (ts && ts.type === 'fill') {
      const f = kit[ts.id];
      if (f.state === 'ready' || f.state === 'filling') return [ts.id, `按住${ts.name}不放，灌到绿色那一格就松手`];
      if (f.state !== 'idle') return [null, '……'];
      return [ts.id, `点${ts.name}，把杯子拿过去灌${itemName(top)}`];
    }
    if (ts) return [ts.id, `给${d.name}加上${itemName(top)}`];
    return produce(top, PL);
  }
  if (KJ.stations.some(s => s.type === 'fill' && kit[s.id].cup && kit[s.id].cup.dish === dishId && kit[s.id].state !== 'idle')) {
    const s = KJ.stations.find(s => s.type === 'fill' && kit[s.id].cup && kit[s.id].cup.dish === dishId);
    const f = kit[s.id];
    return f.state === 'ready' || f.state === 'filling' ? [s.id, `按住${s.name}不放，灌到绿色那一格就松手`] : [null, '……'];
  }
  return produce(d.base, PL);
}
function updateHints() {
  $$('.spot.hint').forEach(e => e.classList.remove('hint'));
  // day 1–2 teach the first dishes; each later dish gets hints for its first two orders
  const first = MENU.filter(m => m.day === 1).map(m => m.id);
  const teachOld = save.day <= 2 && day.ok < (save.day === 1 ? 4 : 2);
  const cus = counterCustomers().filter(c => !c.served && (first.includes(c.order) ? teachOld : (save.taught[c.order] || 0) < 2));
  if (!running || !cus.length) { tip.classList.remove('on'); return; }
  const want = cus[0].order;
  const [spot, text] = nextStep(want);
  if (spot && spotEls[spot]) spotEls[spot].classList.add('hint');
  tip.textContent = DISH[want].name + ' · ' + text;
  tip.classList.add('on');
}

/* ================= days ================= */
/* menu roadmap: a new dish every two days (user's order); `ready` flips on as each dish is built */
const MENU = TH.dishes;      // theme/dishes.json
const DISH = Object.fromEntries(MENU.map(m => [m.id, m]));
function isOpen(id) { const m = DISH[id]; return !!m && !!m.ready && m.day <= save.day; }
const dayRand = (d, k) => { const s = Math.sin(d * 9301 + k * 49297) * 233280; return s - Math.floor(s); };
const MAX_DISHES = TH.maxDishes || 5;      // dishes on the menu each day (theme.json maxDishes)
function menuOf(d) {
  const open = MENU.filter(m => m.ready && m.day <= d);
  if (open.length <= MAX_DISHES) return { dishes: open.map(m => m.id), special: null };
  // more dishes than fit: a rotating menu of MAX_DISHES (the newest ones always on) plus a "today's special"
  const fresh = open.filter(m => d - m.day <= 1), rest = open.filter(m => !fresh.includes(m))
    .sort((a, b) => dayRand(d, MENU.indexOf(a)) - dayRand(d, MENU.indexOf(b)));
  const pool = [...fresh, ...rest].slice(0, MAX_DISHES);
  const pickable = pool.filter(m => !fresh.includes(m));
  return { dishes: pool.map(m => m.id), special: (pickable.length ? pickable : pool)[Math.floor(dayRand(d, 99) * (pickable.length || pool.length))].id };
}
const priceOf = (id, d = save.day) => { const m = menuOf(d); return Math.round(DISH[id].price * (m.special === id ? 1.5 : 1)); };
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function cfgOf(d) {
  const { dishes, special } = menuOf(d);
  const dur = Math.min(200, 110 + 4 * d), gapC = Math.max(4, 13 - .35 * d), pat = Math.max(42, 82 - 1.3 * d);
  // full marks: customers that fit in the day × (average dish price + a full-hearts tip)
  const n = Math.max(3, Math.floor((dur - 4) / gapC)), avg = dishes.reduce((s, id) => s + priceOf(id, d), 0) / dishes.length;
  const tipAvg = A.CUSTOMERS.reduce((s, c) => s + c.tip, 0) / A.CUSTOMERS.length * 2;
  const theo = n * (avg + tipAvg);
  const fresh = MENU.filter(m => m.ready && m.day === d && d > 1);
  return {
    dur, dishes, special, pat, gap: [Math.max(3, gapC - 1.5), gapC + 1.5],
    stars: (d <= 2 ? [.4, .6, .8] : [.5, .7, .88]).map(k => Math.round(theo * k)),   // days 1–2 are for learning
    title: d <= 10 ? `第${NUM[d]}天` : `第 ${d} 天`,
    sub: d === 1 ? `今天学${MENU.filter(m => m.day === 1).length}道菜：${MENU.filter(m => m.day === 1).map(m => m.name).join('和')}。` : fresh.length ? `新菜上架：${fresh.map(m => m.name).join('、')}！` : special ? `今日特供：${DISH[special].name}（售价 ×1.5）` : d === 3 ? '客人变多了，会在门口排队。' : '客人会一天比一天多。',
  };
}
function renderChalk() {
  const { dishes, special } = menuOf(save.day), el = $('.chalk'); if (!el) return;
  el.classList.toggle('full', dishes.length >= 5);
  el.innerHTML = `<b>MENU</b>${dishes.map(id => `<span>${DISH[id].name}${id === special ? '★' : ''} · ${priceOf(id)}</span>`).join('')}${dishes.length < 5 ? '<small>今日营业中</small>' : ''}`;
}
let running = false, sheetOpen = false, spawnT = 0, clock = 0;
const day = { ok: 0, missed: 0, coins: 0, waste: 0, missCost: 0 };
function startDay() {
  Object.assign(day, { ok: 0, missed: 0, coins: 0, waste: 0, missCost: 0 });
  kit = freshKit(); pressing = null; hideGauge(); paintShop(); Object.keys(rings).forEach(k => setRing(k));
  customers.splice(0).forEach(c => { c.cv.remove(); c.bub.remove(); });
  G.queue = []; G.act = null; carry(null);
  running = true; clock = 0; spawnT = 2; closeSheet(); updateHud(); updateOpenBtn();
  spawnCount = 0; renderChalk();
  const cfg = cfgOf(save.day);
  $('#dayTag').textContent = cfg.title;
  say(save.day === 1 ? V('open1', '……开、开店了。') : `${cfg.title}。\n……今天也加油。`, 2000);
}
function updateDay(dt) {
  if (!running || sheetOpen) return;
  const cfg = cfgOf(save.day);
  clock += dt;
  if (clock < cfg.dur) {
    spawnT -= dt;
    if (spawnT <= 0) { admit(spawn(cfg)); spawnT = rnd(cfg.gap[0], cfg.gap[1]); }
  } else if (!customers.length) { running = false; tip.classList.remove('on'); setTimeout(endDay, 800); }
  const sb = $('#sunbar'); sb.style.setProperty('--t', clamp(clock / cfg.dur, 0, 1)); sb.classList.toggle('over', clock >= cfg.dur);
}
const starsOf = (cfg, coins) => cfg.stars.filter(v => coins >= v).length;
function endDay() {
  const cfg = cfgOf(save.day), stars = starsOf(cfg, day.coins);
  save.stars[save.day] = Math.max(save.stars[save.day] || 0, stars);
  const finishedStory = !!STORY.finale && save.day === (STORY.finale.day || 3) && !save.finished;
  save.day++; if (finishedStory) save.finished = true; persist(); renderChalk(); paintShop();
  mood('happy', 3); squish(3);
  say(day.missed ? V('closeMissed', '……关门了。\n有客人没等到。') : V('closeAll', '……关门了！\n今天，一个都没有走掉。'), 2600);
  setTimeout(() => finishedStory ? openFinale(stars) : openReport(cfg, stars), 700);
  updateHud();
}
function updateHud() {
  const cfg = cfgOf(save.day);
  $('#hudCoins').textContent = save.coins;
  if (!running) $('#dayTag').textContent = cfg.title;
  $('#hudGoal').textContent = running ? `今日 ${day.coins} · 目标 ★${cfg.stars[0]} ★★${cfg.stars[1]} ★★★${cfg.stars[2]}` : '休息中';
}

/* ================= sheets ================= */
const sheet = $('#sheet');
function openSheet(html, cls = '') {
  sheet.className = 'sheet on ' + cls; sheet.innerHTML = html; sheetOpen = true; tip.classList.remove('on'); updateOpenBtn();
  sheet.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => actions[b.dataset.go]?.()));
}
function closeSheet() { sheet.className = 'sheet'; sheetOpen = false; updateOpenBtn(); }
function updateOpenBtn() { const b = $('#openBtn'); if (!b) return; b.classList.toggle('on', !running && !sheetOpen); b.textContent = `${cfgOf(save.day).title}，开店营业 →`; }
const RECIPE = Object.fromEntries(Object.entries(TX.recipes).map(([k, r]) => [k, [r.title, r.html]]));
const pendingRecipe = () => MENU.map(m => m.id).find(id => RECIPE[id] && isOpen(id) && !save.seen.includes(id));
function begin() { const r = pendingRecipe(); if (r) return openRecipe(r); startDay(); }
function openRecipe(id) {
  save.seen.push(id); persist(); paintShop();
  openSheet(`<div class="paper owner"><h3>${RECIPE[id][0]}</h3>${RECIPE[id][1]}
    <div class="row"><button class="btn" data-go="begin">${cfgOf(save.day).title}，开店营业 →</button></div></div>`, 'intro');
  say(V('shop09', '（盯着便签）……记、记住了。'), 2000);
}
const actions = {
  start: begin, next: begin, begin,
  reset: () => { if (!confirm('从第一天重新开始？硬币、装饰和小屋都会清空。')) return; save = fresh(); persist(); try { localStorage.removeItem(TH.save.home); } catch (_) {} location.reload(); },
  decor: () => openReport(cfgOf(save.day - 1), save.stars[save.day - 1] || 0),
  stay: () => { closeSheet(); say(pick(LINES.stay), 2200); },
  home: () => typeof Home !== 'undefined' && Home.show(),
};
function openIntro() {
  const again = save.day > 1;
  openSheet(`
    <div class="paper owner">
      <h3>${again ? '欢迎回来' : TX.intro.title}</h3>
      ${again ? `<p>小店还在营业。现在是 <b>${cfgOf(save.day).title}</b>，兜里有 <b>${save.coins}</b> 枚硬币。</p><p class="keys">${cfgOf(save.day).sub}</p>`
      : TX.intro.html}
      <div class="row"><button class="btn" data-go="start">${again ? '继续营业' : '开店营业'} →</button>${again ? '<button class="btn ghost" data-go="stay">先逛逛</button><button class="btn ghost" data-go="home">先回小屋 🏠</button><button class="btn ghost" data-go="reset">从头开始</button>' : ''}</div>
      <p class="keys">每天营业到小太阳走完。收入达到目标拿星星。空格 = 出餐铃。</p>
    </div>`, 'intro');
}
const DIARY = TX.diary;
const starHtml = n => '<span class="stars">' + [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';
function openReport(cfg, stars) {
  decoCart.clear();
  const owned = new Set(save.decor);
  const items = A.DECOR.map(d => `<button class="buy ${owned.has(d.id) ? 'owned' : ''}" data-buy="${d.id}" ${owned.has(d.id) ? 'disabled' : ''}>
      <canvas data-icon="${d.id}"></canvas><b>${d.name}</b><span>${owned.has(d.id) ? '已放进店里' : `${d.price} 枚`}</span></button>`).join('');
  openSheet(`
    <div class="paper report">
      <h3>营业日记 · ${cfg.title} ${starHtml(stars)}</h3>
      <ul class="stats">
        <li>招待了 <b>${day.ok}</b> 位客人 · 没等到 <b>${day.missed}</b> 位${day.missCost ? `（少赚 <b>${day.missCost}</b> 枚）` : ''}</li>
        ${day.waste ? `<li>浪费了 <b>${day.waste}</b> 枚原料</li>` : ''}
        <li>今天净赚 <b>${day.coins}</b> 枚（目标 ★${cfg.stars[0]} / ★★${cfg.stars[1]} / ★★★${cfg.stars[2]}）</li>
        <li>兜里一共 <b class="total">${save.coins}</b> 枚</li>
      </ul>
      <p class="diary">${STORY.diaryBy || ''}：「${DIARY[Math.min(DIARY.length - 1, save.day - 2)]}」</p>
      <h4>给小店添点东西 <small>（点选加入购物车，再点移出）</small></h4>
      <div class="shoplist">${items}</div>
      <div class="cartbar small" id="decoCart"></div>
      <div class="row"><button class="btn ghost" data-go="home">回小屋布置 🏠</button><button class="btn ghost" data-go="stay">先在店里逛逛</button><button class="btn" data-go="next">${cfgOf(save.day).title}，开店 →</button></div>
      <p class="keys">${cfgOf(save.day).sub}</p>
    </div>`, 'report');
  sheet.querySelectorAll('[data-icon]').forEach(cv => { cv.style.width = cv.style.height = '64px'; paint(cv, 80, 80, .8, p => A.decorIcon(p, cv.dataset.icon), 31); });
  sheet.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buy(b)));
}
const decoCart = new Set();
function buy(b) {      // toggle in / out of the cart
  const d = A.DECOR.find(x => x.id === b.dataset.buy);
  if (save.decor.includes(d.id)) return;
  if (decoCart.has(d.id)) { decoCart.delete(d.id); b.classList.remove('incart'); b.querySelector('span').textContent = `${d.price} 枚`; snd('tick'); }
  else { decoCart.add(d.id); b.classList.add('incart'); b.querySelector('span').textContent = '🛒 已加入'; snd('place'); }
  renderDecoCart();
}
function renderDecoCart(confirming = false) {
  const el = sheet.querySelector('#decoCart'); if (!el) return;
  const items = A.DECOR.filter(d => decoCart.has(d.id)), total = items.reduce((s, d) => s + d.price, 0), after = save.coins - total;
  el.classList.toggle('on', items.length > 0);
  if (!items.length) { el.innerHTML = ''; return; }
  el.innerHTML = confirming
    ? `<span class="cart-list">确认买 ${items.map(d => d.name).join('、')}？合计 <b>${total}</b> 枚，买完剩 <b class="${after < 0 ? 'neg' : ''}">${after}</b> 枚${after < 0 ? `（还差 ${-after} 枚）` : ''}</span>
       <button class="btn ghost" data-dc="back">再看看</button><button class="btn" data-dc="pay" ${after < 0 ? 'disabled' : ''}>确认购买</button>`
    : `<span class="cart-ic">🛒 <b>${items.length}</b></span><span class="cart-list">${items.map(d => d.name).join('、')}</span><span class="cart-sum">合计 <b>${total}</b> 枚</span>
       <button class="btn ghost" data-dc="clear">清空</button><button class="btn" data-dc="done">好了</button>`;
  el.querySelector('[data-dc="done"]')?.addEventListener('click', () => renderDecoCart(true));
  el.querySelector('[data-dc="back"]')?.addEventListener('click', () => renderDecoCart(false));
  el.querySelector('[data-dc="clear"]')?.addEventListener('click', () => { decoCart.clear(); sheet.querySelectorAll('.buy.incart').forEach(b => { b.classList.remove('incart'); const d = A.DECOR.find(x => x.id === b.dataset.buy); b.querySelector('span').textContent = `${d.price} 枚`; }); renderDecoCart(); });
  el.querySelector('[data-dc="pay"]')?.addEventListener('click', () => {
    if (save.coins < total) return renderDecoCart(true);
    save.coins -= total; for (const d of items) save.decor.push(d.id); decoCart.clear(); persist();
    sheet.querySelectorAll('.buy.incart').forEach(b => { b.classList.remove('incart'); b.classList.add('owned'); b.disabled = true; b.querySelector('span').textContent = '已放进店里'; });
    const tot = sheet.querySelector('.total'); if (tot) tot.textContent = save.coins;
    paintShop(); updateHud(); squish(3); mood('happy', 3); snd('coin'); setTimeout(() => snd('happy'), 250);
    say(items.length > 1 ? '店里……变漂亮了！' : items[0].line, 2600);
    renderDecoCart();
  });
}
function openFinale(stars) {
  openSheet(`
    <div class="paper owner finale">
      <h3>${STORY.finale.title} ${starHtml(stars)}</h3>
      ${STORY.finale.html}
      <div class="stamp">${STORY.finale.stamp || ''}</div>
      <div class="row"><button class="btn" data-go="decor">给小店添点东西</button><button class="btn ghost" data-go="home">回小屋 🏠</button><button class="btn ghost" data-go="next">继续营业</button><a class="btn ghost" href="../">回 OC 小宇宙</a></div>
      <p class="keys">一共招待了 ${save.served} 位客人。</p>
    </div>`, 'finale');
  mood('happy', 5); squish(4);
}

/* ================= poking her + lore notes ================= */
girlEl.addEventListener('click', e => {
  e.stopPropagation(); squish(3.2); G.vl -= 200; G.vr += 200;
  say(pick(running ? LINES.pokeBusy : LINES.pokeIdle));
});
const NOTES = Object.fromEntries(Object.entries(TX.notes).map(([k, n]) => [k, [n.title, n.html]]));
const note = $('#note');
$$('[data-note]').forEach(h => h.addEventListener('click', e => {
  e.stopPropagation();
  const [t, b] = NOTES[h.dataset.note];
  note.querySelector('h4').textContent = t; note.querySelector('p').innerHTML = b;
  const r = h.getBoundingClientRect(), sr = shop.getBoundingClientRect();
  note.style.left = clamp(r.left - sr.left + r.width / 2 - 140, 8, sr.width - 290) + 'px';
  note.style.top = clamp(r.top - sr.top - 20, 8, sr.height - 200) + 'px';
  note.style.setProperty('--r', rnd(-2, 2).toFixed(1) + 'deg');
  note.classList.remove('on'); void note.offsetWidth; note.classList.add('on');
}));
addEventListener('click', e => { if (!note.contains(e.target)) note.classList.remove('on'); });
addEventListener('keydown', e => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (sheetOpen) sheet.querySelector('[data-go="start"], [data-go="next"], [data-go="begin"]')?.click(); else click('bell'); }
});

/* ================= status line for the phone pad ================= */
function stationStatus(id) {
  const sp = SPOTS[id], s = sp ? sp.s : ST[id]; if (!s) return ['', ''];
  const pc = (t, T) => Math.min(99, Math.round(t / T * 100)) + '%';
  const slotText = (sl, short) => {
    const r = sl.rule;
    if (sl.state === 'idle') return sl.inputs.length ? [`${sl.inputs.length}/${Math.max(...rulesOf(s).map(x => x.need.length))} 样`, ''] : ['空', ''];
    if (sl.state === 'cooking') return [short ? s.verb + '…' : `${s.verb} ${pc(sl.t, r.cook)}`, 'run'];
    if (sl.state === 'cooking2') return [short ? s.verb + '…' : `${s.verb} ${pc(sl.t, r.cook2 || r.cook)}`, 'run'];
    if (sl.state === 'flip') return ['翻面!', 'warn'];
    if (sl.state === 'done') return r.burn && sl.t > r.burn * .5 ? ['快焦了!', 'warn'] : [short ? '好✓' : '好了 ✓', 'ok'];
    return ['焦了', 'bad'];
  };
  if (s.type === 'bench') {
    const b = kit[s.id], r = rulesOf(s).find(r => sameSet(b.inputs, r.need));
    return b.made ? [`${itemName(b.made)} ✓`, 'ok'] : r ? [`${s.tap || '搅'} ${b.taps}/${r.taps}`, 'go'] : b.inputs.length ? [`${b.inputs.length} 样`, ''] : ['空', ''];
  }
  if (s.type === 'cooker') {
    const sls = kit[s.id];
    if (sp && sp.slot != null) return slotText(sls[sp.slot]);
    if (sls.length === 1) return slotText(sls[0]);
    const all = sls.map(x => slotText(x, true)), rank = ['bad', 'warn', 'ok', 'run', 'go', ''];
    return [all.map(a => a[0]).join('·'), all.map(a => a[1]).sort((a, b) => rank.indexOf(a) - rank.indexOf(b))[0]];
  }
  if (s.type === 'fill') { const f = kit[s.id]; return f.state === 'ready' ? ['按住灌!', 'warn'] : f.state === 'filling' ? [Math.round(f.level * 100) + '%', 'run'] : f.state === 'idle' ? ['', ''] : ['…', 'run']; }
  if (s.type === 'plates') {
    const it = plates()[sp.slot]; if (!it || it === RES) return ['空', ''];
    if (it.melted) return ['化了', 'bad'];
    const d = DISH[it.dish];
    if (complete(it)) return [d.name, 'ok'];
    if (d.stack) return it.messy ? ['叠错了', 'bad'] : [`${d.name.slice(0, 2)} ${it.layers.length}/${d.stack.length}`, 'go'];
    return ['待加' + itemName((d.toppings || []).find(t => !it.tops.includes(t))), 'go'];
  }
  return ['', ''];
}

/* ================= main loop ================= */
let last = performance.now(), visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(shop);
function tick(now, force) {
  const dt = clamp((now - last) / 1000, 0, .05); last = Math.max(last, now);
  if (!visible && !force) return;
  updateGirl(dt, now);
  if (!sheetOpen) updateKitchen(dt);
  updateCustomers(dt); updateDay(dt);
}
function frame(now) { tick(now); requestAnimationFrame(frame); }
if (/[?&]debug/.test(location.search)) window.__gd = { step(ms) { for (let i = 0; i < ms / 16; i++) tick(last + 16, true); }, G, customers, day, click, get kit() { return kit; }, save: () => save, counterCustomers };
window.GD = {
  coins: () => save.coins,
  spend(n) { if (save.coins < n) return false; save.coins -= n; persist(); updateHud(); return true; },
  day: () => save.day, running: () => running, say: (t) => say(t, 2200),
  closeSheet: () => { if (sheetOpen) closeSheet(); },
  girlX: () => G.x, scale: () => K, click, kit: () => kit, isOpen,
  stations: () => KJ.stations.filter(stOpen), status: id => stationStatus(id), press, itemCarry: carryOf, dishName: id => DISH[id] && DISH[id].name, customers: () => customers, clickCustomer, matchPlate,
  hint: () => { const h = document.querySelector('.spot.hint'); return h ? h.dataset.spot : null; },
};
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(paintShop, 150); });
paintShop(); updateHud(); renderChalk();
$('#openBtn').addEventListener('click', e => { e.stopPropagation(); if (!running && !sheetOpen) begin(); });
document.fonts?.ready.then(paintShop);
openIntro();
requestAnimationFrame(frame);
})();
