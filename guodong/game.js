/* game.js — 果冻的小店 · 经营玩法（第 1 阶段）
   原料 → 加工（计时，会做坏）→ 装盘 → 出餐。访客点设备，果冻蹦过去做；客人在门口排队。
   牛奶布丁：鸡蛋+牛奶+糖 → 搅拌碗搅 3 下 → 倒进蒸笼蒸 → 装盘 → 淋焦糖
   青苹果果冻：青苹果 → 砧板切 3 下 → 下锅 + 吉利丁 → 煮 → 倒模放冰箱冷藏 → 脱模装盘 */
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
const SAVE_KEY = 'guodong.shop.v2';
const fresh = () => ({ day: 1, coins: 0, decor: [], served: 0, finished: false, stars: {} });
let save = (() => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (_) { return fresh(); } })();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} };
// test cheats: ?coins=99999 adds coins, ?day=2 jumps to a day (handy for trying the cottage)
{ const q = new URLSearchParams(location.search);
  if (q.has('coins')) save.coins += Math.max(0, parseInt(q.get('coins'), 10) || 0);
  if (q.has('day')) save.day = Math.max(1, parseInt(q.get('day'), 10) || 1);
  if (q.has('coins') || q.has('day')) { persist(); history.replaceState(null, '', location.pathname); } }

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
  paint(back, LW, LH, K, p => A.drawBack(p, decor), 11);
  paint(front, LW, LH, K, p => A.drawFront(p), 23);
  Object.keys(A.BOX).forEach(renderStation);
  for (const cu of customers) renderCustomer(cu);
  renderCarry();
}

/* ================= kitchen state ================= */
const T = { steam: 6, steamBurn: 8, cook: 5, cookBurn: 8, chill: 8 };
const freshKit = () => ({
  bowl: { egg: false, milk: false, sugar: false, stir: 0, mixed: false },
  board: { state: 'empty', chop: 0 },
  pot: { apple: false, gel: false, state: 'idle', t: 0 },
  steamer: { state: 'empty', t: 0 },
  fridge: [{ state: 'empty', t: 0 }, { state: 'empty', t: 0 }],
  plates: [null, null, null],
});
let kit = freshKit();
const RES = 'reserved';

/* station canvases (live drawings of what's in each station) */
const stCanvas = {};
const backSt = $('#backStations'), frontSt = $('#frontStations');
for (const [key, [x, y, w, h]] of Object.entries(A.BOX)) {
  const cv = document.createElement('canvas'); cv.className = 'stc ' + key;
  Object.assign(cv.style, { left: pct(x, LW), top: pct(y, LH), width: pct(w, LW), height: pct(h, LH) });
  (/^(stove|steamer|fridge)/.test(key) ? backSt : frontSt).appendChild(cv);
  stCanvas[key] = cv;
}
function renderStation(key) {
  const cv = stCanvas[key]; if (!cv) return;
  const [, , w, h] = A.BOX[key];
  let fn;
  if (key === 'stove') fn = p => A.drawStove(p, kit.pot);
  else if (key === 'steamer') fn = p => A.drawSteamer(p, kit.steamer);
  else if (key === 'bowl') fn = p => A.drawBowl(p, kit.bowl);
  else if (key === 'board') fn = p => A.drawBoard(p, kit.board);
  else if (key.startsWith('plate')) { const it = kit.plates[+key.slice(5)]; fn = p => A.drawPlateItem(p, it && it !== RES ? it : null); }
  else if (key.startsWith('fridge')) { const sl = kit.fridge[+key.slice(6)]; fn = p => A.drawMagnet(p, sl.state === RES ? { state: 'empty' } : sl); }
  paint(cv, w, h, K, fn, 5 + key.length);
  updateClears();
}

/* timer rings */
const rings = {};
const RING_AT = { stove: [124, 222], steamer: [276, 184], fridge0: [700, 290], fridge1: [754, 290] };
for (const [k, [x, y]] of Object.entries(RING_AT)) {
  const r = document.createElement('div'); r.className = 'ring'; r.style.left = pct(x, LW); r.style.top = pct(y, LH);
  r.innerHTML = '<i></i>'; $('#rings').appendChild(r); rings[k] = r;
}
function setRing(k, state, prog = 0) { const r = rings[k]; r.dataset.s = state || ''; r.style.setProperty('--p', clamp(prog, 0, 1)); }

/* ================= hotspots ================= */
const SPOTS = {
  egg:     { r: [44, 76, 80, 50], x: 84, tag: '鸡蛋' },
  milk:    { r: [126, 62, 58, 62], x: 154, tag: '牛奶' },
  sugar:   { r: [186, 72, 54, 52], x: 212, tag: '糖' },
  apple:   { r: [38, 138, 96, 60], x: 90, tag: '青苹果' },
  gel:     { r: [144, 144, 76, 54], x: 178, tag: '吉利丁' },
  stove:   { r: [30, 232, 136, 74], x: 100, tag: '小锅' },
  steamer: { r: [168, 192, 122, 112], x: 228, tag: '蒸笼' },
  bowl:    { r: [104, 360, 112, 60], x: 160, tag: '搅拌碗' },
  board:   { r: [212, 380, 140, 36], x: 270, tag: '砧板' },
  plate0:  { r: [372, 356, 76, 60], x: 410, tag: '盘子' },
  plate1:  { r: [452, 356, 76, 60], x: 490, tag: '盘子' },
  plate2:  { r: [532, 356, 76, 60], x: 570, tag: '盘子' },
  caramel: { r: [620, 334, 62, 84], x: 650, tag: '焦糖' },
  fridge:  { r: [652, 150, 136, 182], x: 715, tag: '冰箱' },
  bell:    { r: [814, 374, 60, 42], x: 842, tag: '出餐铃（空格）' },
};
const spotEls = {};
for (const [id, s] of Object.entries(SPOTS)) {
  const b = document.createElement('button'); b.className = 'spot'; b.dataset.spot = id;
  Object.assign(b.style, { left: pct(s.r[0], LW), top: pct(s.r[1], LH), width: pct(s.r[2], LW), height: pct(s.r[3], LH) });
  b.innerHTML = `<i>${s.tag}</i>`; b.setAttribute('aria-label', s.tag);
  b.addEventListener('click', e => { e.stopPropagation(); click(id); });
  $('#spots').appendChild(b); spotEls[id] = b;
}
const CLEAR = { bowl: [200, 352], board: [334, 376], stove: [150, 238], plate0: [438, 356], plate1: [518, 356], plate2: [598, 356] };
const clearEls = {};
for (const [k, [x, y]] of Object.entries(CLEAR)) {
  const b = document.createElement('button'); b.className = 'clear'; b.title = '倒掉'; b.textContent = '×';
  b.style.left = pct(x, LW); b.style.top = pct(y, LH);
  b.addEventListener('click', e => { e.stopPropagation(); clearStation(k); });
  $('#spots').appendChild(b); clearEls[k] = b;
}
function updateClears() {
  const b = kit.bowl;
  clearEls.bowl.classList.toggle('on', b.egg || b.milk || b.sugar);
  clearEls.board.classList.toggle('on', kit.board.state !== 'empty');
  clearEls.stove.classList.toggle('on', kit.pot.state === 'idle' && (kit.pot.apple || kit.pot.gel));
  kit.plates.forEach((it, i) => clearEls['plate' + i].classList.toggle('on', !!it && it !== RES));
}

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
    const tx = clamp(st.x, 112, 856), d = tx - G.x;
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
  } else if (Math.abs(G.x - HOME) > 2 && idleT > 1.6) {
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
const NAME = { egg: '鸡蛋', milk: '牛奶', sugar: '糖', apple: '青苹果', gel: '吉利丁' };
function no(msg) { say(msg, 1800); mood('busy', .8); return false; }
function act(steps) {
  if (G.queue.length >= 5) { say('……等、等一下，记不住了。', 1400); return; }
  G.queue.push({ steps }); updateHints();
}
const sx = id => SPOTS[id].x;
const freePlate = () => kit.plates.findIndex(p => p === null);
const snd = n => { const f = typeof BGM !== 'undefined' && BGM.sfx && BGM.sfx[n]; f && f(); };
function click(id) {
  if (sheetOpen) return;
  pulse(id);
  const b = kit.bowl, pot = kit.pot, stm = kit.steamer;
  switch (id) {
    case 'egg': case 'milk': case 'sugar': {
      if (b.mixed) return no('碗里是搅好的布丁液了。\n先倒进蒸笼吧。');
      if (b[id]) return no(`碗里已经有${NAME[id]}了。`);
      return act([{ x: sx(id), fn: () => carry(id) }, { x: sx('bowl'), fn: () => {
        carry(null);
        if (kit.bowl[id] || kit.bowl.mixed) return no(`${NAME[id]}……放不下了。`);
        kit.bowl[id] = true; renderStation('bowl'); sparkle('bowl'); snd('place');
      } }]);
    }
    case 'apple': {
      if (kit.board.state !== 'empty') return no('砧板上已经有东西了。');
      return act([{ x: sx('apple'), fn: () => carry('apple') }, { x: sx('board'), fn: () => {
        carry(null);
        if (kit.board.state !== 'empty') return no('砧板上已经有东西了。');
        kit.board = { state: 'apple', chop: 0 }; renderStation('board'); snd('place');
      } }]);
    }
    case 'gel': {
      if (pot.state !== 'idle') return no('锅还在用……');
      if (pot.gel) return no('锅里已经有吉利丁了。');
      return act([{ x: sx('gel'), fn: () => carry('gel') }, { x: sx('stove'), fn: () => {
        carry(null);
        if (kit.pot.state !== 'idle' || kit.pot.gel) return no('锅里放不下了。');
        kit.pot.gel = true; snd('place'); tryCook(); renderStation('stove');
      } }]);
    }
    case 'bowl': {
      if (b.mixed) {
        if (stm.state !== 'empty') return no(stm.state === 'steaming' ? '蒸笼正在蒸……' : '先把蒸笼里的拿出来。');
        stm.state = RES;
        return act([{ x: sx('bowl'), fn: () => { carry('batter'); kit.bowl = freshKit().bowl; renderStation('bowl'); } },
                    { x: sx('steamer'), fn: () => { carry(null); kit.steamer = { state: 'steaming', t: 0 }; renderStation('steamer'); snd('pour'); say('蒸、蒸上了。', 1200); } }]);
      }
      if (b.egg && b.milk && b.sugar) return act([{ x: sx('bowl'), fn: () => {
        const bb = kit.bowl; if (bb.mixed || !(bb.egg && bb.milk && bb.sugar)) return false;
        bb.stir++; snd('stir'); if (bb.stir >= 3) { bb.mixed = true; say('搅匀了！', 1000); } renderStation('bowl'); squish(2);
      } }]);
      const miss = ['egg', 'milk', 'sugar'].filter(k => !b[k]).map(k => NAME[k]).join('、');
      return no(`布丁要：鸡蛋、牛奶、糖。\n还差${miss}。`);
    }
    case 'board': {
      const bd = kit.board;
      if (bd.state === 'empty') return no('先拿一颗青苹果来。');
      if (bd.state === 'apple') return act([{ x: sx('board'), fn: () => {
        if (kit.board.state !== 'apple') return false;
        kit.board.chop++; snd('chop'); if (kit.board.chop >= 3) kit.board.state = 'chopped'; renderStation('board'); squish(2);
      } }]);
      if (pot.state !== 'idle') return no('锅还在用……');
      if (pot.apple) return no('锅里已经有苹果了。');
      return act([{ x: sx('board'), fn: () => { if (kit.board.state !== 'chopped') return false; carry('chopped'); kit.board = { state: 'empty', chop: 0 }; renderStation('board'); } },
                  { x: sx('stove'), fn: () => { carry(null); if (kit.pot.state !== 'idle' || kit.pot.apple) return no('锅……放不下了。'); kit.pot.apple = true; snd('place'); tryCook(); renderStation('stove'); } }]);
    }
    case 'stove': {
      if (pot.state === 'cooking') return no('还在煮……');
      if (pot.state === 'burnt') return act([{ x: sx('stove'), fn: () => { kit.pot = freshKit().pot; renderStation('stove'); setRing('stove'); say('……倒掉了。（耳朵耷拉）', 1500); mood('sad', 1.5); } }]);
      if (pot.state === 'done') {
        const slot = kit.fridge.findIndex(s => s.state === 'empty');
        if (slot < 0) return no('冰箱满了……');
        kit.fridge[slot].state = RES;
        return act([{ x: sx('stove'), fn: () => { if (kit.pot.state === 'burnt') { kit.fridge[slot].state = 'empty'; return no('……啊，焦了。'); } carry('mold'); kit.pot = freshKit().pot; renderStation('stove'); setRing('stove'); } },
                    { x: sx('fridge'), fn: () => { carry(null); kit.fridge[slot] = { state: 'chill', t: 0 }; renderStation('fridge' + slot); snd('fridge'); say('放进冰箱。\n等它凝固。', 1300); } }]);
      }
      const need = [!pot.apple && '切好的青苹果', !pot.gel && '吉利丁'].filter(Boolean).join('、');
      return no(`果冻要：切好的青苹果 + 吉利丁。\n还差${need}。`);
    }
    case 'steamer': {
      if (stm.state === 'steaming') return no('还在蒸……');
      if (stm.state === 'burnt') return act([{ x: sx('steamer'), fn: () => { kit.steamer = { state: 'empty', t: 0 }; renderStation('steamer'); setRing('steamer'); say('蒸老了……倒掉。', 1500); mood('sad', 1.5); } }]);
      if (stm.state === 'done') {
        const pi = freePlate(); if (pi < 0) return no('没有空盘子了……');
        kit.plates[pi] = RES;
        return act([{ x: sx('steamer'), fn: () => { if (kit.steamer.state === 'burnt') { kit.plates[pi] = null; return no('……蒸老了。'); } carry('pudding', { dish: 'pudding', caramel: false }); kit.steamer = { state: 'empty', t: 0 }; renderStation('steamer'); setRing('steamer'); } },
                    { x: sx('plate' + pi), fn: () => { carry(null); kit.plates[pi] = { dish: 'pudding', caramel: false }; renderStation('plate' + pi); snd('place'); } }]);
      }
      return no('蒸笼是空的。\n先在搅拌碗里做布丁液。');
    }
    case 'fridge': {
      const slot = kit.fridge.findIndex(s => s.state === 'ready');
      if (slot < 0) return no(kit.fridge.some(s => s.state === 'chill') ? '还没凝固……再等等。' : '冰箱里没有果冻。');
      const pi = freePlate(); if (pi < 0) return no('没有空盘子了……');
      kit.plates[pi] = RES; kit.fridge[slot].state = RES;
      return act([{ x: sx('fridge'), fn: () => { snd('fridge'); carry('jelly', { dish: 'jelly' }); kit.fridge[slot] = { state: 'empty', t: 0 }; renderStation('fridge' + slot); setRing('fridge' + slot); } },
                  { x: sx('plate' + pi), fn: () => { carry(null); kit.plates[pi] = { dish: 'jelly' }; renderStation('plate' + pi); sparkle('plate' + pi); snd('place'); } }]);
    }
    case 'caramel': {
      const pi = kit.plates.findIndex(it => it && it !== RES && it.dish === 'pudding' && !it.caramel);
      if (pi < 0) return no('没有要淋焦糖的布丁。');
      return act([{ x: sx('caramel'), fn: () => carry('caramel') },
                  { x: sx('plate' + pi), fn: () => { carry(null); const it = kit.plates[pi]; if (!it || it === RES || it.caramel) return false; it.caramel = true; renderStation('plate' + pi); sparkle('plate' + pi); snd('pour'); } }]);
    }
    case 'plate0': case 'plate1': case 'plate2': return servePlate(+id.slice(5));
    case 'bell': {
      for (const cu of counterCustomers()) { if (cu.served) continue; const pi = matchPlate(cu); if (pi >= 0) return servePlate(pi, cu); }
      return no(counterCustomers().length ? '还没有做好的……' : '……还没有客人。');
    }
  }
}
function tryCook() { if (kit.pot.apple && kit.pot.gel && kit.pot.state === 'idle') { kit.pot.state = 'cooking'; kit.pot.t = 0; snd('sizzle'); say('煮、煮上了。', 1100); } }
const complete = it => it && it !== RES && (it.dish !== 'pudding' || it.caramel);
const matchPlate = cu => kit.plates.findIndex(it => complete(it) && !it.taken && it.dish === cu.order);
function servePlate(pi, target) {
  const it = kit.plates[pi];
  if (!it || it === RES) return no('盘子是空的。');
  if (!complete(it)) return no('布丁还没淋焦糖。');
  if (it.taken) return;
  const cu = target || counterCustomers().find(c => c.order === it.dish && !c.served);
  if (!cu) return no('没有人点这个……\n先放着吧。');
  cu.served = true; it.taken = true;
  return act([{ x: sx('plate' + pi), fn: () => { if (kit.plates[pi] !== it) { cu.served = false; return false; } carry(it.dish, it); kit.plates[pi] = null; renderStation('plate' + pi); } },
              { x: cu.cx, fn: () => { carry(null); serve(cu, it); } }]);
}
function clearStation(k) {
  if (sheetOpen) return;
  if (k === 'bowl') act([{ x: sx('bowl'), fn: () => { kit.bowl = freshKit().bowl; renderStation('bowl'); say('倒掉了。', 900); } }]);
  else if (k === 'board') act([{ x: sx('board'), fn: () => { kit.board = { state: 'empty', chop: 0 }; renderStation('board'); } }]);
  else if (k === 'stove') act([{ x: sx('stove'), fn: () => { if (kit.pot.state !== 'idle') return false; kit.pot = freshKit().pot; renderStation('stove'); } }]);
  else { const i = +k.slice(5); act([{ x: sx(k), fn: () => { const it = kit.plates[i]; if (!it || it === RES || it.taken) return false; kit.plates[i] = null; renderStation(k); say('……倒掉了。', 900); } }]); }
}

/* ================= kitchen timers ================= */
let puffT = 0;
function updateKitchen(dt) {
  const pot = kit.pot;
  if (pot.state === 'cooking' || pot.state === 'done') {
    pot.t += dt;
    if (pot.state === 'cooking' && pot.t >= T.cook) { pot.state = 'done'; renderStation('stove'); ding('stove'); say('锅里的……好了！', 1300); updateHints(); }
    if (pot.state === 'done' && pot.t >= T.cook + T.cookBurn) { pot.state = 'burnt'; renderStation('stove'); burnt('焦了！！'); updateHints(); }
  }
  if (pot.state === 'cooking') setRing('stove', 'run', pot.t / T.cook);
  else if (pot.state === 'done') setRing('stove', pot.t > T.cook + T.cookBurn * .5 ? 'warn' : 'done', 1);
  else if (pot.state === 'burnt') setRing('stove', 'bad', 1); else setRing('stove');
  const s = kit.steamer;
  if (s.state === 'steaming' || s.state === 'done') {
    s.t += dt;
    if (s.state === 'steaming' && s.t >= T.steam) { s.state = 'done'; renderStation('steamer'); ding('steamer'); say('布丁蒸好了！', 1300); updateHints(); }
    if (s.state === 'done' && s.t >= T.steam + T.steamBurn) { s.state = 'burnt'; renderStation('steamer'); burnt('蒸、蒸老了！'); updateHints(); }
  }
  if (s.state === 'steaming') setRing('steamer', 'run', s.t / T.steam);
  else if (s.state === 'done') setRing('steamer', s.t > T.steam + T.steamBurn * .5 ? 'warn' : 'done', 1);
  else if (s.state === 'burnt') setRing('steamer', 'bad', 1); else setRing('steamer');
  kit.fridge.forEach((sl, i) => {
    if (sl.state === 'chill') { sl.t += dt; if (sl.t >= T.chill) { sl.state = 'ready'; renderStation('fridge' + i); ding('fridge' + i); updateHints(); } }
    if (sl.state === 'chill') setRing('fridge' + i, 'run', sl.t / T.chill); else if (sl.state === 'ready') setRing('fridge' + i, 'done', 1); else setRing('fridge' + i);
  });
  puffT -= dt;
  if (puffT < 0) {
    puffT = .45;
    if (pot.state === 'cooking' || pot.state === 'done') puff(96, 226, false);
    if (pot.state === 'burnt') puff(96, 226, true);
    if (s.state === 'steaming' || s.state === 'done') puff(228, 190, false);
    if (s.state === 'burnt') puff(228, 190, true);
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
function spawn(cfg) {
  let type; do { type = pick(A.CUSTOMERS); } while (type.id === lastType); lastType = type.id;
  const cv = document.createElement('canvas'); cv.className = 'cust'; cv.style.opacity = 0;
  const bub = document.createElement('div'); bub.className = 'order';
  const icon = document.createElement('canvas');
  const hearts = document.createElement('span'); hearts.className = 'hearts';
  const sayEl = document.createElement('p'); sayEl.className = 'csay';
  bub.append(icon, hearts, sayEl); custLayer.append(cv, bub);
  const pat = cfg.pat * type.pat;
  const cu = { type, seed: Math.floor(rnd(1, 999)), cv, bub, icon, hearts, sayEl, order: pick(cfg.dishes), phase: 'walk', next: null,
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
  day.missed++; leave(cu, '人好多……下次再来。');
}
function toCounter(cu, ci) {
  cu.ci = ci; cu.qi = -1; cu.cx = COUNTER[ci];
  cu.bub.classList.remove('small', 'on');
  walkTo(cu, [COUNTER[ci], 736, 1], () => { cu.phase = 'order'; cu.arrived = performance.now(); cu.bub.classList.add('on'); updateHints(); say(pick(['……欢迎光临。', '要、要什么？', '（耳朵竖起来）\n……欢迎光临。']), 1500); });
}
function clickCustomer(cu) {
  if (sheetOpen || cu.phase !== 'order' || cu.served) return;
  const pi = matchPlate(cu);
  if (pi < 0) return no(`${cu.type.name}要的是${cu.order === 'pudding' ? '牛奶布丁' : '青苹果果冻'}。\n还没做好……`);
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
      if (cu.remain <= 0) { day.missed++; snd('sad'); leave(cu, cu.type.leave); mood('sad', 2.2); say(pick(['……（耳朵耷拉下来）', '……对不起。', '……噗。下次快一点。']), 2000); continue; }
    }
    cu.hearts.textContent = heartsText(cu);
    cu.bub.classList.toggle('hurry', cu.remain < cu.patience * .34 && cu.phase !== 'leave');
    const [x, y, s] = cu.pos;
    const bob = cu.phase === 'walk' || cu.phase === 'leave' ? Math.abs(Math.sin(cu.t * 7)) * -5 : Math.sin(performance.now() / 420 + cu.seed) * 1.2;
    cu.cv.style.transform = `translate(${(x - 85) * K}px, ${(y - 160 + bob) * K}px) scale(${s})`;
    cu.bub.style.transform = `translate(${(x - 14) * K}px, ${(y - 160 * s - (cu.qi >= 0 ? 34 : 60)) * K}px)`;
  }
}
function leave(cu, text) {
  if (cu.qi >= 0) { const q = cu.qi; cu.qi = -1; customers.filter(c => c.qi > q).forEach(c => { c.qi--; walkTo(c, QUEUE[c.qi], () => { c.phase = 'queue'; c.bub.classList.add('on'); }); }); }
  cu.ci = -1;
  cu.bub.classList.add('on', 'talk'); cu.bub.classList.remove('small'); cu.sayEl.textContent = text;
  cu.from = [...cu.pos]; cu.to = [...DOOR]; cu.t = 0; cu.dur = Math.max(1.4, Math.hypot(DOOR[0] - cu.pos[0], DOOR[1] - cu.pos[1]) / 240); cu.phase = 'leave';
  setTimeout(() => cu.bub.classList.remove('on'), 2200);
  updateHints();
}
const PRICE = { pudding: 6, jelly: 7 };
function serve(cu, it) {
  if (cu.phase !== 'order') { const pi = kit.plates.indexOf(null); if (pi >= 0) { delete it.taken; kit.plates[pi] = it; renderStation('plate' + pi); } say('……客人走掉了。', 1400); return; }
  const hearts = clamp(Math.ceil(cu.remain / cu.patience * 3), 0, 3);
  const tip = Math.max(0, hearts - 1) * cu.type.tip;
  const coins = PRICE[it.dish] + tip;
  save.coins += coins; day.coins += coins; day.ok++; save.served++; persist(); snd('coin'); setTimeout(() => snd('happy'), 260);
  floatText(cu.cx, 540, `+${coins}${tip ? `（小费 ${tip}）` : ''}`); hearts3(cu.cx, 580);
  mood('happy', 2.2); squish(3);
  say(pick(['……请慢用。', '做好了！', '（鼻子动了动）\n……好吃吗？', '嘿嘿。']), 1600);
  leave(cu, cu.type.ok);
  updateHud();
}
function ringDoor() {
  snd('bell'); G.vl -= 240; G.vr += 240;
  const d = $('#doorbell'); d.classList.remove('ring'); void d.offsetWidth; d.classList.add('ring');
}

/* ================= small effects ================= */
const fxLayer = $('#fxLayer');
function floatText(x, y, t) {
  const e = document.createElement('span'); e.className = 'float'; e.textContent = t;
  e.style.left = pct(x, LW); e.style.top = pct(y, LH); fxLayer.append(e); setTimeout(() => e.remove(), 1500);
}
function hearts3(x, y) { for (let i = 0; i < 3; i++) setTimeout(() => floatText(x + rnd(-40, 40), y + rnd(-10, 20), '♥'), i * 120); }
function sparkle(key) {
  const [x, y, w] = A.BOX[key] || SPOTS[key].r;
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

/* ================= hints ================= */
const tip = $('#tip');
function nextStep(dish) {
  const b = kit.bowl, pot = kit.pot, s = kit.steamer, pl = kit.plates;
  const has = (d, f) => pl.some(it => it && it !== RES && it.dish === d && f(it));
  if (dish === 'pudding') {
    if (has('pudding', it => it.caramel)) return ['plate', '布丁做好啦！点盘子（或点客人）出餐'];
    if (has('pudding', it => !it.caramel)) return ['caramel', '给布丁淋上焦糖'];
    if (s.state === 'done') return ['steamer', '蒸好了！点蒸笼，把布丁装盘'];
    if (s.state === 'burnt') return ['steamer', '蒸老了……点蒸笼倒掉重来'];
    if (s.state === 'steaming' || s.state === RES) return [null, '蒸笼在蒸……等进度圈转满（别太久！）'];
    if (b.mixed) return ['bowl', '点搅拌碗，把布丁液倒进蒸笼'];
    if (b.egg && b.milk && b.sugar) return ['bowl', `点搅拌碗搅拌（${b.stir}/3）`];
    return [['egg', 'milk', 'sugar'].find(k => !b[k]), '把鸡蛋、牛奶、糖放进搅拌碗'];
  }
  if (has('jelly', () => true)) return ['plate', '果冻做好啦！点盘子（或点客人）出餐'];
  if (kit.fridge.some(f => f.state === 'ready')) return ['fridge', '凝固了！点冰箱，把果冻装盘'];
  if (kit.fridge.some(f => f.state === 'chill' || f.state === RES)) return [null, '果冻在冰箱里凝固……可以先去做布丁'];
  if (pot.state === 'done') return ['stove', '煮好了！点小锅，倒进模具放冰箱'];
  if (pot.state === 'burnt') return ['stove', '煮焦了……点小锅倒掉重来'];
  if (pot.state === 'cooking') return [null, '小锅在煮……'];
  if (kit.board.state === 'chopped') return ['board', '点砧板，把切好的苹果放进锅里'];
  if (kit.board.state === 'apple') return ['board', `点砧板切苹果（${kit.board.chop}/3）`];
  if (pot.apple && !pot.gel) return ['gel', '再放一片吉利丁进锅'];
  if (!pot.apple) return ['apple', '拿一颗青苹果到砧板上'];
  return ['gel', '放一片吉利丁进锅'];
}
function updateHints() {
  $$('.spot.hint').forEach(e => e.classList.remove('hint'));
  const teach = running && save.day <= 2 && day.ok < (save.day === 1 ? 3 : 4);
  const cus = counterCustomers().filter(c => !c.served);
  if (!teach || !cus.length) { tip.classList.remove('on'); return; }
  const want = save.day === 2 && cus.some(c => c.order === 'jelly') ? 'jelly' : cus[0].order;
  let [spot, text] = nextStep(want);
  if (spot === 'plate') spot = 'plate' + kit.plates.findIndex(it => it && it !== RES && it.dish === want);
  if (spot && spotEls[spot]) spotEls[spot].classList.add('hint');
  tip.textContent = (want === 'pudding' ? '牛奶布丁 · ' : '青苹果果冻 · ') + text;
  tip.classList.add('on');
}

/* ================= days ================= */
const DAYS = {
  1: { dur: 110, dishes: ['pudding'], gap: [12, 16], pat: 75, stars: [16, 32, 48], title: '第一天', sub: '只卖牛奶布丁。慢慢来。' },
  2: { dur: 130, dishes: ['pudding', 'jelly'], gap: [10, 14], pat: 80, stars: [24, 48, 70], title: '第二天', sub: '青苹果果冻上架！要放冰箱冷藏，等的时候可以去做布丁。' },
  3: { dur: 150, dishes: ['pudding', 'jelly'], gap: [8, 12], pat: 72, stars: [34, 64, 94], title: '第三天', sub: '客人变多了，会在门口排队。' },
};
const cfgOf = d => DAYS[d] || { dur: 150, dishes: ['pudding', 'jelly'], gap: [Math.max(5, 8 - (d - 3) * .4), Math.max(8, 12 - (d - 3) * .5)], pat: Math.max(55, 70 - (d - 3) * 2), stars: [40, 74, 108].map(v => Math.round(v * (1 + (d - 4) * .08))), title: `第 ${d} 天`, sub: '自由营业。主人在后面喝茶。' };
let running = false, sheetOpen = false, spawnT = 0, clock = 0;
const day = { ok: 0, missed: 0, coins: 0 };
function startDay() {
  Object.assign(day, { ok: 0, missed: 0, coins: 0 });
  kit = freshKit(); Object.keys(A.BOX).forEach(renderStation); Object.keys(rings).forEach(k => setRing(k));
  customers.splice(0).forEach(c => { c.cv.remove(); c.bub.remove(); });
  G.queue = []; G.act = null; carry(null);
  running = true; clock = 0; spawnT = 2; closeSheet(); updateHud(); updateOpenBtn();
  const cfg = cfgOf(save.day);
  $('#dayTag').textContent = cfg.title;
  say(save.day === 1 ? '……开、开店了。' : `${cfg.title}。\n……今天也加油。`, 2000);
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
  const finishedStory = save.day === 3 && !save.finished;
  save.day++; if (finishedStory) save.finished = true; persist();
  mood('happy', 3); squish(3);
  say(day.missed ? '……关门了。\n有客人没等到。' : '……关门了！\n今天，一个都没有走掉。', 2600);
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
const actions = {
  start: startDay, next: startDay,
  reset: () => { if (!confirm('从第一天重新开始？硬币、装饰和小屋都会清空。')) return; save = fresh(); persist(); try { localStorage.removeItem('guodong.home.v1'); } catch (_) {} location.reload(); },
  decor: () => openReport(cfgOf(save.day - 1), save.stars[save.day - 1] || 0),
  stay: () => { closeSheet(); say(pick(['……打烊了。可以慢慢收拾。', '（伸了个懒腰）', '准备好了，就点「开店营业」。']), 2200); },
  home: () => typeof Home !== 'undefined' && Home.show(),
};
function openIntro() {
  const again = save.day > 1;
  openSheet(`
    <div class="paper owner">
      <h3>${again ? '欢迎回来' : '给果冻的便签'}</h3>
      ${again ? `<p>小店还在营业。现在是 <b>${cfgOf(save.day).title}</b>，兜里有 <b>${save.coins}</b> 枚硬币。</p><p class="keys">${cfgOf(save.day).sub}</p>`
      : `<p>今天我去山下进货，前台交给你啦，小果冻。</p>
      <p><b>牛奶布丁</b>这样做：</p>
      <ol>
        <li>从架子上拿<b>鸡蛋、牛奶、糖</b>，放进搅拌碗；</li>
        <li>点搅拌碗<b>搅 3 下</b>，再点一次，倒进<b>蒸笼</b>；</li>
        <li>进度圈转满就好了——<b>别放太久</b>，会蒸老；</li>
        <li>点蒸笼装盘，淋上<b>焦糖</b>，点客人出餐。</li>
      </ol>
      <p>客人头上的 ♥ 变少，就是等急了。在门口排队的客人会等得久一点。</p>
      <p class="sign">PS. 发箍别摘，客人会认不出你。—— 主人</p>`}
      <div class="row"><button class="btn" data-go="start">${again ? '继续营业' : '开店营业'} →</button>${again ? '<button class="btn ghost" data-go="stay">先逛逛</button><button class="btn ghost" data-go="home">先回小屋 🏠</button><button class="btn ghost" data-go="reset">从头开始</button>' : ''}</div>
      <p class="keys">每天营业到小太阳走完。收入达到目标拿星星。空格 = 出餐铃。</p>
    </div>`, 'intro');
}
const DIARY = ['今天，学会了蒸布丁。第一锅蒸老了，偷偷吃掉了。', '果冻要放冰箱，等的时候去做布丁。主人说这叫「同时」。', '门口排起队了。耳朵转来转去，好累。但是，好开心。', '今天的苹果很甜。主人说，我越来越像店长了。'];
const starHtml = n => '<span class="stars">' + [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">★</i>`).join('') + '</span>';
function openReport(cfg, stars) {
  const owned = new Set(save.decor);
  const items = A.DECOR.map(d => `<button class="buy ${owned.has(d.id) ? 'owned' : ''}" data-buy="${d.id}" ${owned.has(d.id) ? 'disabled' : ''}>
      <canvas data-icon="${d.id}"></canvas><b>${d.name}</b><span>${owned.has(d.id) ? '已放进店里' : `${d.price} 枚`}</span></button>`).join('');
  openSheet(`
    <div class="paper report">
      <h3>营业日记 · ${cfg.title} ${starHtml(stars)}</h3>
      <ul class="stats">
        <li>招待了 <b>${day.ok}</b> 位客人 · 没等到 <b>${day.missed}</b> 位</li>
        <li>今天赚了 <b>${day.coins}</b> 枚（目标 ★${cfg.stars[0]} / ★★${cfg.stars[1]} / ★★★${cfg.stars[2]}）</li>
        <li>兜里一共 <b class="total">${save.coins}</b> 枚</li>
      </ul>
      <p class="diary">果冻写：「${DIARY[Math.min(DIARY.length - 1, save.day - 2)]}」</p>
      <h4>给小店添点东西</h4>
      <div class="shoplist">${items}</div>
      <div class="row"><button class="btn ghost" data-go="home">回小屋布置 🏠</button><button class="btn ghost" data-go="stay">先在店里逛逛</button><button class="btn" data-go="next">${cfgOf(save.day).title}，开店 →</button></div>
      <p class="keys">${cfgOf(save.day).sub}</p>
    </div>`, 'report');
  sheet.querySelectorAll('[data-icon]').forEach(cv => { cv.style.width = cv.style.height = '64px'; paint(cv, 80, 80, .8, p => A.decorIcon(p, cv.dataset.icon), 31); });
  sheet.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buy(b)));
}
function buy(b) {
  const d = A.DECOR.find(x => x.id === b.dataset.buy);
  if (save.decor.includes(d.id)) return;
  if (save.coins < d.price) { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); say(`硬币……还差 ${d.price - save.coins} 枚。`, 1600); return; }
  save.coins -= d.price; save.decor.push(d.id); persist();
  b.classList.add('owned'); b.disabled = true; b.querySelector('span').textContent = '已放进店里';
  const tot = sheet.querySelector('.total'); if (tot) tot.textContent = save.coins;
  paintShop(); updateHud(); squish(3); mood('happy', 3); say(d.line, 2600);
}
function openFinale(stars) {
  openSheet(`
    <div class="paper owner finale">
      <h3>主人回来了 ${starHtml(stars)}</h3>
      <p>店门口的铃响了一下，是主人。</p>
      <p>「三天，辛苦啦。」<br>主人摸了摸她的头——隔着发箍。<br>她的耳朵，慢慢地竖了起来。</p>
      <p class="sign big">「小店长 · 果冻」<br><small>以后，前台就交给你啦。</small></p>
      <div class="stamp">合格</div>
      <div class="row"><button class="btn" data-go="decor">给小店添点东西</button><button class="btn ghost" data-go="home">回小屋 🏠</button><button class="btn ghost" data-go="next">继续营业</button><a class="btn ghost" href="../">回 OC 小宇宙</a></div>
      <p class="keys">一共招待了 ${save.served} 位客人。</p>
    </div>`, 'finale');
  mood('happy', 5); squish(4);
}

/* ================= poking her + lore notes ================= */
girlEl.addEventListener('click', e => {
  e.stopPropagation(); squish(3.2); G.vl -= 200; G.vr += 200;
  say(pick(running ? ['……在、在做了！', '（专心）', '戳我也不会变快的……'] : ['……欢迎光临。', '主人，出门了。\n今天我看店。', '（鼻子动了动）', '果冻，会抖的哦。']));
});
const NOTES = {
  owner: ['主人的便签', '今天我去山下进货，<br>前台交给你啦，小果冻。<br><br><small>PS. 发箍别摘，客人会认不出你。—— 主人</small>'],
  menu: ['今日菜单', '牛奶布丁 ············ 6<br>青苹果果冻 ·········· 7<br><small>（字是主人写的。果冻还不太会写字。）</small>'],
  window: ['窗外', '窗外那棵是主人家的青苹果树。<br>以前，她就在树下的篱笆边，<br>啃掉下来的苹果。'],
  basket: ['她的窝', '门边的小篮子。<br>变成人以后有点挤了，<br>但她还是每晚蜷在里面睡。<br><small>枕头是一颗青苹果抱枕。</small>'],
  bell: ['门铃', '叮铃——<br>有人推门，她的耳朵会先竖起来，<br>然后才慢半拍地抬头。'],
};
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
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (sheetOpen) sheet.querySelector('[data-go="start"], [data-go="next"]')?.click(); else click('bell'); }
});

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
  girlX: () => G.x, scale: () => K, click, kit: () => kit, customers: () => customers, clickCustomer, matchPlate,
  hint: () => { const h = document.querySelector('.spot.hint'); return h ? h.dataset.spot : null; },
};
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(paintShop, 150); });
paintShop(); updateHud();
$('#openBtn').addEventListener('click', e => { e.stopPropagation(); if (!running && !sheetOpen) startDay(); });
document.fonts?.ready.then(paintShop);
openIntro();
requestAnimationFrame(frame);
})();
