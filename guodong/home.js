/* home.js — 果冻的小屋 · 布置玩法（第 1 步）
   收纳箱 → 拖进房间 → 自由摆放 + 轻吸附（地板 / 墙面 / 桌面、架子、床、窗台）→ 前后按位置自动排。
   选中后可以翻转、往前 / 往后、收回。硬币和小店共用（window.GD）。 */
const Home = (() => {
'use strict';
const { Pen, grainTile } = Sketch;
const H = HomeArt, IT = H.ITEMS, LW = 1200, LH = 720;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const pct = (v, t) => (v / t * 100) + '%';

/* ---------------- save ---------------- */
const KEY = 'guodong.home.v1';
const fresh = () => ({ owned: { basket: 1 }, placed: [{ uid: 1, id: 'basket', x: 170, y: 692, flip: false, bias: 0, parent: null }], uid: 2, intro: false, bed: false, met: ['basket'] });
let hs = (() => { try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) { return fresh(); } })();
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(hs)); } catch (_) {} };

/* ---------------- painting ---------------- */
const room = $('#room'), roomCv = $('#roomCanvas'), itemsEl = $('#homeItems');
const grain = grainTile(220, 7);
let K = 1, DPR = 1;
function paint(cv, w, h, scale, fn, seed) {
  cv.width = Math.max(1, Math.round(w * scale * DPR)); cv.height = Math.max(1, Math.round(h * scale * DPR));
  const c = cv.getContext('2d'); c.setTransform(scale * DPR, 0, 0, scale * DPR, 0, 0); c.clearRect(0, 0, w, h);
  fn(new Pen(c, seed));
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = .5; c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, w * scale, h * scale);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  return cv;
}
const itemCanvas = new Map();   // uid -> canvas
function paintRoom() {
  if (!room.clientWidth) return;
  K = room.clientWidth / LW; DPR = Math.min(2, devicePixelRatio || 1);
  paint(roomCv, LW, LH, K, p => H.drawRoom(p, { night: hs.night, winOpen }), 41);
  room.classList.toggle('night', !!hs.night);
  itemCanvas.forEach((cv, uid) => { const pl = byUid(uid); if (pl) paintItem(cv, pl.id, pl.uid, pl); });
  layout();
}
function paintItem(cv, id, seed, st) { const d = IT[id]; paint(cv, d.w, d.h, K, p => H.drawItem(p, id, st), 50 + (seed % 7)); }

/* ---------------- geometry ---------------- */
const RM = H.ROOM;
const WALL_BLOCK = [[RM.win.x0 - 20, RM.win.y0 - 22, RM.win.x1 + 20, RM.win.y1 + 30], [RM.door.x0 - 14, RM.door.y0 - 16, RM.door.x1 + 14, RM.door.y1], [806, 280, 866, 324]];
const SILL = { uid: 'sill', x0: RM.win.x0 - 14, x1: RM.win.x1 + 14, y: RM.win.y1 - 4 };
const floorX = (y, hw) => { const t = clamp((y - RM.by1) / 174, 0, 1); return [RM.bx0 + (-10 - RM.bx0) * t + hw + 4, RM.bx1 + (1210 - RM.bx1) * t - hw - 4]; };
const byUid = uid => hs.placed.find(p => p.uid === uid);
const childrenOf = uid => hs.placed.filter(p => p.parent === uid);
function surfOf(pl) {
  const d = IT[pl.id]; if (!d.surf) return null;
  const left = pl.x - d.w / 2;
  const x0 = pl.flip ? d.w - d.surf.x1 : d.surf.x0, x1 = pl.flip ? d.w - d.surf.x0 : d.surf.x1;
  return { uid: pl.uid, x0: left + x0, x1: left + x1, y: pl.y - d.h + d.surf.y };
}
function surfaces(except) {
  const out = [SILL];
  for (const pl of hs.placed) { if (except.has(pl.uid)) continue; const s = surfOf(pl); if (s) out.push(s); }
  return out;
}
function descendants(uid, acc = new Set([uid])) { for (const c of childrenOf(uid)) { acc.add(c.uid); descendants(c.uid, acc); } return acc; }
function place(id, x, y, except) {        // where would item `id` land if dropped with its anchor at (x, y)?
  const d = IT[id], hw = d.w / 2;
  x = clamp(x, hw + 8, LW - hw - 8);
  if (d.zone === 'wall') {
    x = clamp(x, RM.bx0 + hw + 12, RM.bx1 - hw - 12);
    y = clamp(y, RM.by0 + 12 + d.h, RM.by1 - 16);
    const r = [x - hw, y - d.h, x + hw, y];
    const ok = !WALL_BLOCK.some(b => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1]);
    return { x, y, parent: null, valid: ok };
  }
  if (d.zone === 'small') {
    for (const s of surfaces(except)) {
      if (x >= s.x0 + d.w * .25 && x <= s.x1 - d.w * .25 && Math.abs(y - s.y) < 64) return { x: clamp(x, s.x0 + d.w / 2 - 4, s.x1 - d.w / 2 + 4), y: s.y, parent: s.uid, valid: true };
    }
    if (y < 548) return { x, y, parent: null, valid: false };
  }
  if (d.zone === 'rug') { y = clamp(y, 596, 716); const [a, b] = floorX(y, hw * .8); return { x: clamp(x, a, b), y, parent: null, valid: true }; }
  y = clamp(y, 580, 714); const [a, b] = floorX(y, hw);
  return { x: clamp(x, a, b), y, parent: null, valid: true };
}
function depth(pl) {
  const d = IT[pl.id];
  if (pl.parent === 'sill') return 30;
  if (pl.parent) { const par = byUid(pl.parent); return par ? depth(par) + .3 + (pl.bias || 0) * .01 : 100 + pl.y; }
  if (d.zone === 'wall') return pl.id === 'lights' ? 12 : 10 + (pl.bias || 0) * .1;
  if (d.zone === 'rug') return 40 + pl.y / 1000;
  return 100 + pl.y + (pl.bias || 0);
}

/* ---------------- items in the room ---------------- */
function ensureEl(pl) {
  let cv = itemCanvas.get(pl.uid);
  if (!cv) {
    cv = document.createElement('canvas'); cv.className = 'hitem'; cv.dataset.uid = pl.uid;
    cv.addEventListener('pointerdown', e => startDrag(e, pl.uid));
    itemsEl.appendChild(cv); itemCanvas.set(pl.uid, cv); paintItem(cv, pl.id, pl.uid, pl);
  }
  return cv;
}
function posEl(cv, id, x, y, flip, z, ghost) {
  const d = IT[id];
  Object.assign(cv.style, { left: pct(x - d.w / 2, LW), top: pct(y - d.h, LH), width: pct(d.w, LW), height: pct(d.h, LH), zIndex: Math.round(z * 10) });
  cv.style.setProperty('--flip', flip ? -1 : 1);
  cv.classList.toggle('ghost', !!ghost);
}
function layout() {
  for (const pl of hs.placed) posEl(ensureEl(pl), pl.id, pl.x, pl.y, pl.flip, depth(pl));
  for (const [uid, cv] of itemCanvas) if (!byUid(uid)) { cv.remove(); itemCanvas.delete(uid); }
  hgirl.style.zIndex = Math.round(girlDepth() * 10);
  placeSel(); updateHud(); renderBox(); renderGlows();
}

/* ---------------- drag & drop ---------------- */
let drag = null, sel = null;
const toLogical = e => { const r = room.getBoundingClientRect(); return [(e.clientX - r.left) / K, (e.clientY - r.top) / K]; };
function startDrag(e, uid) {
  e.preventDefault(); e.stopPropagation();
  const pl = byUid(uid); if (!pl) return;
  const [lx, ly] = toLogical(e);
  const kids = [...descendants(uid)].filter(u => u !== uid).map(u => byUid(u));
  drag = { touch: e.pointerType === 'touch', t0: performance.now(), uid, id: pl.id, ox: lx - pl.x, oy: ly - pl.y, start: { x: pl.x, y: pl.y, parent: pl.parent }, moved: false, sx: e.clientX, sy: e.clientY, kids: kids.map(k => ({ pl: k, dx: k.x - pl.x, dy: k.y - pl.y })), fromBox: false, res: null };
  capture(e);
}
function startBoxDrag(e, id) {
  e.preventDefault();
  if (avail(id) <= 0) return;
  const d = IT[id];
  const cv = document.createElement('canvas'); cv.className = 'hitem'; itemsEl.appendChild(cv); paintItem(cv, id, hs.uid);
  drag = { uid: null, id, ox: 0, oy: -d.h * .45, moved: true, fromBox: true, cv, kids: [], sx: e.clientX, sy: e.clientY, res: null };
  select(null); room.classList.add('dragging');
  moveDrag(e); capture(e);
}
function capture(e) {
  addEventListener('pointermove', moveDrag); addEventListener('pointerup', endDrag, { once: true }); addEventListener('pointercancel', endDrag, { once: true });
}
function moveDrag(e) {
  if (!drag) return;
  if (drag.touch && !drag.moved && !drag.fromBox) {
    const dist = Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy);
    if (performance.now() - drag.t0 < 220) { if (dist > 8) { removeEventListener('pointermove', moveDrag); drag = null; } return; }
  }
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
  if (!drag.moved) { drag.moved = true; select(null); room.classList.add('dragging'); }
  const [lx, ly] = toLogical(e);
  const except = drag.uid ? descendants(drag.uid) : new Set();
  const res = place(drag.id, lx - drag.ox, ly - drag.oy, except);
  drag.res = res;
  const pl = drag.uid ? byUid(drag.uid) : null;
  const cv = drag.uid ? itemCanvas.get(drag.uid) : drag.cv;
  const lift = res.valid ? 0 : 0;
  posEl(cv, drag.id, res.x, res.y - lift, pl ? pl.flip : false, 900, true);
  cv.classList.toggle('bad', !res.valid);
  // children ride along
  for (const k of drag.kids) { const kc = itemCanvas.get(k.pl.uid); posEl(kc, k.pl.id, res.x + k.dx, res.y + k.dy, k.pl.flip, 900.5, true); }
}
function endDrag() {
  removeEventListener('pointermove', moveDrag);
  const dg = drag; drag = null; room.classList.remove('dragging');
  if (!dg) return;
  if (!dg.moved) { select(dg.uid); interact(byUid(dg.uid)); return; }
  const res = dg.res;
  if (dg.fromBox) {
    dg.cv.remove();
    if (!res || !res.valid) { say('……放不在那里。', 1200); return; }
    const pl = { uid: hs.uid++, id: dg.id, x: res.x, y: res.y, flip: false, bias: 0, parent: res.parent };
    hs.placed.push(pl); persist(); layout(); landed(pl); meet(pl);
    return;
  }
  const pl = byUid(dg.uid);
  if (!res || !res.valid) { layout(); say('……放不在那里。', 1200); return; }
  const dx = res.x - pl.x, dy = res.y - pl.y;
  pl.x = res.x; pl.y = res.y; pl.parent = res.parent;
  for (const k of dg.kids) { k.pl.x += dx; k.pl.y += dy; }
  persist(); layout(); landed(pl);
}
function landed(pl) {
  const cv = itemCanvas.get(pl.uid); if (!cv) return;
  const d = IT[pl.id];
  const cls = d.zone === 'wall' ? 'swing' : d.soft ? 'squish' : 'thud';
  cv.classList.remove('swing', 'squish', 'thud'); void cv.offsetWidth; cv.classList.add(cls);
}

/* ---------------- selection toolbar ---------------- */
const selbar = $('#selbar');
function select(uid) {
  sel = uid; $$('.hitem.sel').forEach(c => c.classList.remove('sel'));
  if (uid) itemCanvas.get(uid)?.classList.add('sel');
  placeSel();
}
function placeSel() {
  const pl = sel && byUid(sel);
  if (!pl) { selbar.classList.remove('on'); return; }
  const d = IT[pl.id];
  selbar.style.left = pct(clamp(pl.x, 110, LW - 110), LW); selbar.style.top = pct(Math.max(30, pl.y - d.h - 8), LH);
  selbar.querySelector('[data-a="name"]').textContent = d.name;
  selbar.classList.add('on');
}
selbar.addEventListener('pointerdown', e => e.stopPropagation());
selbar.addEventListener('click', e => {
  const a = e.target.closest('[data-a]')?.dataset.a; const pl = sel && byUid(sel); if (!pl || !a) return;
  if (a === 'flip') { pl.flip = !pl.flip; for (const k of descendants(pl.uid)) if (k !== pl.uid) { const c = byUid(k); c.x = pl.x - (c.x - pl.x); } landed(pl); }
  if (a === 'front') pl.bias = (pl.bias || 0) + 8;
  if (a === 'back') pl.bias = (pl.bias || 0) - 8;
  if (a === 'store') { for (const u of descendants(pl.uid)) hs.placed = hs.placed.filter(p => p.uid !== u); select(null); say('收进箱子里了。', 1000); }
  persist(); layout();
});
room.addEventListener('pointerdown', e => { if (e.target === roomCv || e.target === room || e.target === itemsEl) select(null); });

/* ---------------- storage box + furniture shop ---------------- */
const MAX = { bed: 1, wardrobe: 1, desk: 1, basket: 1 };
const placedCount = id => hs.placed.filter(p => p.id === id).length;
const avail = id => (hs.owned[id] || 0) - placedCount(id);
const iconCache = {};
function icon(id, size = 64) {
  const cv = document.createElement('canvas'), d = IT[id], s = Math.min(size / d.w, size / d.h) * .92;
  cv.style.width = cv.style.height = size + 'px';
  paint(cv, size / s, size / s, s, p => { p.c.translate((size / s - d.w) / 2, (size / s - d.h) / 2); H.drawItem(p, id); }, 3);
  return cv;
}
const boxList = $('#boxList');
function renderBox() {
  const ids = Object.keys(hs.owned).filter(id => IT[id] && avail(id) > 0);
  const key = ids.map(id => id + avail(id)).join();
  if (boxList.dataset.key === key) return; boxList.dataset.key = key;
  boxList.innerHTML = '';
  if (!ids.length) { boxList.innerHTML = '<p class="empty">箱子是空的。去「家具店」看看？</p>'; return; }
  for (const id of ids) {
    const b = document.createElement('div'); b.className = 'boxitem'; b.title = '拖进房间';
    b.append(icon(id, 54)); const t = document.createElement('span'); t.textContent = IT[id].name + (avail(id) > 1 ? ` ×${avail(id)}` : ''); b.append(t);
    b.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return startBoxDrag(e, id);
      const sx = e.clientX, sy = e.clientY, t0 = performance.now();
      const mv = ev => { const dx = ev.clientX - sx, dy = ev.clientY - sy; if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) return done(); if (dy < -10 || performance.now() - t0 > 260) { done(); startBoxDrag(ev, id); } };
      const done = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', done); };
      addEventListener('pointermove', mv); addEventListener('pointerup', done);
    });
    boxList.append(b);
  }
}
const hsheet = $('#hsheet');
let shopCat = 'bed';
const cart = new Set();
const limitOf = id => IT[id].limit || MAX[id] || 3;
const cartTotal = () => [...cart].reduce((s, id) => s + IT[id].price, 0);
const snd = n => { const f = typeof BGM !== 'undefined' && BGM.sfx && BGM.sfx[n]; f && f(); };
function openShop() {
  const keepScroll = hsheet.querySelector('.paper')?.scrollTop || 0;
  const cats = Object.keys(H.CAT);
  const ids = Object.keys(IT).filter(id => IT[id].price > 0 && IT[id].cat === shopCat).sort((a, b) => IT[a].price - IT[b].price);
  const inCat = c => [...cart].filter(id => IT[id].cat === c).length;
  hsheet.innerHTML = `<div class="paper report furni"><h3>家具店 <small>兜里 <b class="hcoins">${GD.coins()}</b> 枚</small></h3>
    <div class="cats">${cats.map(c => `<button data-cat="${c}" class="${c === shopCat ? 'on' : ''}">${H.CAT[c]}${inCat(c) ? `<sup>${inCat(c)}</sup>` : ''}</button>`).join('')}</div>
    <div class="shoplist home">${ids.map((id, i) => { const d = IT[id], lim = (hs.owned[id] || 0) >= limitOf(id), inc = cart.has(id);
      const tier = ids.length > 1 ? ['基础', '进阶', '精致', '精致'][Math.min(3, Math.round(i / (ids.length - 1) * 2))] : '';
      return `<button class="buy ${lim ? 'owned' : ''} ${inc ? 'incart' : ''} lv${Math.min(2, Math.round(i / Math.max(1, ids.length - 1) * 2))}" data-hbuy="${id}" ${lim ? 'disabled' : ''}><i class="tier">${tier}</i>${inc ? '<i class="incart-tag">🛒 已加入</i>' : ''}<span class="ic" data-ic="${id}"></span><b>${d.name}${id === 'bed' && !hs.owned.bed && !hs.owned.mat ? ' · 推荐' : ''}</b><span>${lim ? '已经有了' : inc ? '再点一下移出' : `${d.price} 枚 · ♥${d.comfort}`}</span></button>`; }).join('')}</div>
    <p class="keys">点家具加入购物车，再点一下移出。选好了点「好了」，确认后才扣钱。</p>
    <div class="cartbar ${cart.size ? 'on' : ''}">
      <span class="cart-ic">🛒 <b>${cart.size}</b></span>
      <span class="cart-list">${cart.size ? [...cart].map(id => `<i data-rm="${id}">${IT[id].name} <u>×</u></i>`).join('') : '购物车是空的'}</span>
      <span class="cart-sum">合计 <b>${cartTotal()}</b> 枚</span>
      ${cart.size ? '<button class="btn ghost" data-hgo="clear">清空</button>' : ''}
      <button class="btn" data-hgo="done">好了</button>
    </div></div>`;
  hsheet.className = 'sheet on';
  const paper = hsheet.querySelector('.paper'); paper.scrollTop = keepScroll;
  hsheet.querySelectorAll('[data-ic]').forEach(s => s.append(icon(s.dataset.ic, 74)));
  hsheet.querySelectorAll('[data-hbuy]').forEach(b => b.addEventListener('click', () => toggleCart(b.dataset.hbuy)));
  hsheet.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => toggleCart(b.dataset.rm)));
  hsheet.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { shopCat = b.dataset.cat; openShop(); hsheet.querySelector('.paper').scrollTop = 0; }));
  hsheet.querySelector('[data-hgo="done"]').addEventListener('click', () => cart.size ? openConfirm() : closeSheet());
  hsheet.querySelector('[data-hgo="clear"]')?.addEventListener('click', () => { cart.clear(); snd('tick'); openShop(); });
}
function toggleCart(id) {
  if ((hs.owned[id] || 0) >= limitOf(id)) return;
  if (cart.has(id)) { cart.delete(id); snd('tick'); } else { cart.add(id); snd('place'); }
  openShop();
}
function openConfirm() {
  const total = cartTotal(), coins = GD.coins(), after = coins - total, ok = after >= 0;
  hsheet.innerHTML = `<div class="paper report furni confirm"><h3>确认购买</h3>
    <ul class="confirm-list">${[...cart].map(id => `<li><span class="ic" data-ic="${id}"></span><b>${IT[id].name}</b><span>${IT[id].price} 枚</span><button data-rm="${id}" title="移出">×</button></li>`).join('')}</ul>
    <p class="confirm-sum">一共 <b>${cart.size}</b> 件，合计 <b>${total}</b> 枚<br><small>兜里 ${coins} 枚 → 买完剩 <b class="${ok ? '' : 'neg'}">${after}</b> 枚</small></p>
    ${ok ? '' : `<p class="warn">硬币还差 ${-after} 枚……去掉一些再买吧。</p>`}
    <div class="row"><button class="btn ghost" data-hgo="back">← 再看看</button><button class="btn" data-hgo="pay" ${ok ? '' : 'disabled'}>确认购买</button></div></div>`;
  hsheet.className = 'sheet on';
  hsheet.querySelectorAll('[data-ic]').forEach(s => s.append(icon(s.dataset.ic, 48)));
  hsheet.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { cart.delete(b.dataset.rm); snd('tick'); cart.size ? openConfirm() : openShop(); }));
  hsheet.querySelector('[data-hgo="back"]').addEventListener('click', openShop);
  hsheet.querySelector('[data-hgo="pay"]').addEventListener('click', pay);
}
function pay() {
  const total = cartTotal(), items = [...cart];
  if (!GD.spend(total)) { say(`硬币……还差 ${total - GD.coins()} 枚。`, 1600); return openConfirm(); }
  for (const id of items) hs.owned[id] = (hs.owned[id] || 0) + 1;
  cart.clear(); persist(); renderBox(); updateHud(); squish(3);
  snd('coin'); setTimeout(() => snd('happy'), 250);
  hsheet.innerHTML = `<div class="paper report furni confirm"><h3>买好啦！</h3>
    <p>${items.map(id => IT[id].name).join('、')}<br>都放进<b>收纳箱</b>了，拖进房间摆好吧。</p>
    <div class="row"><button class="btn" data-hgo="ok">去摆家具</button><button class="btn ghost" data-hgo="more">继续逛</button></div></div>`;
  hsheet.querySelector('[data-hgo="ok"]').addEventListener('click', closeSheet);
  hsheet.querySelector('[data-hgo="more"]').addEventListener('click', openShop);
  say(items.includes('bed') ? '床！……要放哪里呢。' : items.length > 1 ? '好多东西……\n箱子都装满了。' : `${IT[items[0]].name}……\n放进箱子了。`, 2000);
}
function closeSheet() { hsheet.className = 'sheet'; }
$('#openFurni').addEventListener('click', openShop);
const comfort = () => hs.placed.reduce((s, p) => s + (IT[p.id].comfort || 0), 0);
function updateHud() { $('#homeCoins').textContent = GD.coins(); $('#homeComfort').textContent = comfort(); }

/* ---------------- her, at home ---------------- */
const hgirl = $('#hgirl'), hj = hgirl.querySelector('.g-jelly'), heL = hgirl.querySelector('.ear-l'), heR = hgirl.querySelector('.ear-r');
const hb = $('#hbubble');
const GH = 330, GWID = GH * 562 / 1729;
const G = { after: null, x: 640, y: 706, tx: 640, ty: 706, face: 1, sy: 0, vsy: 0, l: 0, vl: 0, r: 0, vr: 0, hop: 0, wander: 3, busy: false, tw: 2 };
const girlDepth = () => G.sitOn ? depth(byUid(G.sitOn) || { id: 'bed', y: G.y }) + .2 : 100 + G.y;
let hbT;
function say(t, ms = 2000) { hb.textContent = t; hb.classList.add('on'); clearTimeout(hbT); hbT = setTimeout(() => hb.classList.remove('on'), ms); }
function squish(a = 3) { G.vsy -= a; G.vl -= a * 50; G.vr += a * 50; }
function walkTo(x, y = 706) { G.tx = clamp(x, 70, 1130); G.ty = y; }
function meet(pl) {
  if (pl.id === 'bed' && !hs.bed) return bedStory(pl);
  if (hs.met.includes(pl.id)) { squish(1.5); return; }
  hs.met.push(pl.id); persist();
  G.busy = true; walkTo(pl.x + (pl.x > 640 ? -70 : 70));
  setTimeout(() => { say(IT[pl.id].line, 2600); squish(2.5); G.busy = false; G.wander = 4; }, 1300);
}
function bedStory(pl) {
  hs.bed = true; persist();
  G.busy = true; walkTo(pl.x - 40);
  const T = [
    [1200, () => say('……这个，是床？', 1800)],
    [3000, () => { const s = surfOf(pl); G.sitOn = pl.uid; G.ty = s.y + 28; G.tx = pl.x - (pl.flip ? -30 : 30); squish(3); layout(); }],
    [3800, () => say('……软的。\n比篮子软。', 2200)],
    [6300, () => say('今天晚上……\n可以睡在这里吗？', 2400)],
    [8800, () => { showNote('主人的便签', '当然可以。<br>篮子留着放抱枕吧。<br><small>—— 主人</small>'); G.vl -= 260; G.vr += 260; }],
    [11500, () => { G.sitOn = null; G.ty = 706; G.tx = pl.x + 170 > 1100 ? pl.x - 180 : pl.x + 170; squish(3); layout(); say('……嗯！', 1400); }],
    [12800, () => { G.busy = false; G.wander = 5; }],
  ];
  for (const [t, f] of T) setTimeout(f, t);
}
const note = $('#hnote');
function showNote(t, html) { note.querySelector('h4').textContent = t; note.querySelector('p').innerHTML = html; note.classList.remove('on'); void note.offsetWidth; note.classList.add('on'); setTimeout(() => note.classList.remove('on'), 4200); }
hgirl.addEventListener('click', e => { e.stopPropagation(); squish(3.2); G.vl -= 200; G.vr += 200;
  say(pick(comfort() < 15 ? ['……空空的。', '这里，以后是我的家吗？', '（东张西望）'] : comfort() < 60 ? ['……越来越像家了。', '（鼻子动了动）', '这个屋子，有苹果的味道。'] : ['……好舒服。', '明天，也要好好开店。', '（在屋子里转了一圈）\n嘿嘿。'])); });
function updateGirl(dt, now) {
  if (!G.busy && !drag && !G.sitOn) { G.wander -= dt; if (G.wander < 0) { G.wander = rnd(4, 9); walkTo(rnd(160, 1040)); } }
  const dx = G.tx - G.x, dy = G.ty - G.y; let walking = false;
  if (Math.abs(dx) > 2) { const st = Math.sign(dx) * Math.min(Math.abs(dx), 230 * dt); G.x += st; G.hop += Math.abs(st) / 38; G.face = Math.sign(dx); walking = true; }
  if (Math.abs(dy) > 1) G.y += Math.sign(dy) * Math.min(Math.abs(dy), 260 * dt);
  if (!walking && G.after && Math.abs(G.tx - G.x) < 3) { const f = G.after; G.after = null; f(); }
  const hopY = walking ? Math.abs(Math.sin(G.hop * Math.PI)) * 10 : 0;
  G.vsy += (-320 * G.sy - 9 * G.vsy) * dt; G.sy = clamp(G.sy + G.vsy * dt, -.2, .2);
  G.vl += (-120 * G.l - 7 * G.vl) * dt; G.l = clamp(G.l + G.vl * dt, -60, 50);
  G.vr += (-120 * G.r - 7 * G.vr) * dt; G.r = clamp(G.r + G.vr * dt, -50, 60);
  G.tw -= dt; if (G.tw < 0) { (Math.random() < .5 ? G.vl -= 170 : G.vr += 170); G.tw = rnd(2.5, 6); }
  Object.assign(hgirl.style, { left: pct(G.x - GWID / 2, LW), top: pct(G.y - GH - hopY, LH), width: pct(GWID, LW), height: pct(GH, LH), zIndex: Math.round(girlDepth() * 10) });
  hj.style.transform = `scaleX(${G.face}) scale(${(1 - G.sy * .7).toFixed(4)}, ${(1 + G.sy).toFixed(4)})`;
  heL.style.transform = `rotate(${G.l.toFixed(2)}deg)`; heR.style.transform = `rotate(${G.r.toFixed(2)}deg)`;
  hb.style.left = pct(clamp(G.x + 30, 20, LW - 260), LW); hb.style.top = pct(G.y - GH - 10 - hopY, LH);
}

/* ---------------- interacting with furniture (click = use, drag = move) ---------------- */
const SFX = () => (typeof BGM !== 'undefined' && BGM.sfx) || {};
const LIGHTS = { lamp: 'point', floorlamp: 'point', lights: 'string', flowerlights: 'string' };
const SOFT = new Set(['pillow', 'plush', 'cushions', 'bunnyrug', 'rug', 'strawrug', 'basket', 'sofa', 'velvet']);
const HANG = new Set(['frame', 'doodle', 'oil', 'wreath', 'shelf', 'rack']);
const PLANTS = new Set(['clover', 'tulip', 'monstera', 'hydrangea']);
const BEDS = new Set(['bed', 'canopy', 'mat']);
let winOpen = false;
const spinning = new Map();
function anim(pl, cls) { const cv = itemCanvas.get(pl.uid); if (!cv) return; cv.classList.remove('thud', 'squish', 'swing', 'rock', 'sway', 'wiggle'); void cv.offsetWidth; cv.classList.add(cls); }
function goDo(x, fn) { G.busy = true; G.sitOn = null; walkTo(x); G.after = () => { fn(); setTimeout(() => { if (!G.sitOn) { G.busy = false; G.wander = rnd(4, 7); } }, 2400); }; }
function interact(pl) {
  if (!pl) return;
  const id = pl.id, d = IT[id], s = SFX();
  if (LIGHTS[id]) { pl.on = pl.on === false; persist(); s.tick && s.tick(); renderGlows(pl.uid); if (pl.on === false) say('关灯。', 900); return; }
  if (id === 'musicbox') return windMusicBox(pl);
  if (id === 'clock') { s.ding && s.ding(); anim(pl, 'swing'); paintItem(itemCanvas.get(pl.uid), id, pl.uid, pl); const t = new Date(); say(`……${t.getHours()} 点 ${t.getMinutes()} 分。`, 1600); return; }
  if (id === 'wardrobe' || id === 'fancyward') { pl.open = !pl.open; persist(); s.tick && s.tick(); paintItem(itemCanvas.get(pl.uid), id, pl.uid, pl); anim(pl, 'thud'); if (pl.open) say(pick(['衣服……只有这几件。', '围裙、波点衣服、裙子。', '（把裙子拉平）']), 1800); return; }
  if (id === 'rocker') { anim(pl, 'rock'); s.pop && s.pop(); return; }
  if (BEDS.has(id)) return nap(pl);
  if (SOFT.has(id)) { anim(pl, 'squish'); s.pop && s.pop(); return; }
  if (HANG.has(id)) { anim(pl, 'swing'); return; }
  if (PLANTS.has(id)) return water(pl);
  if (id === 'vanity') return goDo(pl.x, () => { say('……发箍，要戴正。', 2000); G.vl -= 240; G.vr += 240; sparkle(pl.x, pl.y - d.h * .8); });
  if (id === 'desk' || id === 'crate') return goDo(pl.x + 40, () => { say(pick(['练习写字……「果冻」。', '今天的练习册，写好了。', '「明天」……怎么写来着。']), 2200); });
  if (id === 'chair' || id === 'stump') return goDo(pl.x, () => { say('坐一会儿。', 1400); squish(2); });
  anim(pl, 'thud');
}
let napT = 0;
function nap(pl) {
  if (G.sitOn === pl.uid) { G.sitOn = null; G.ty = 706; squish(3); say('……醒了。', 1200); clearInterval(napT); G.busy = false; layout(); return; }
  goDo(pl.x - 20, () => {
    const s = surfOf(pl); if (!s) return;
    G.sitOn = pl.uid; G.ty = s.y + 30; squish(3); layout(); G.busy = true;
    say('……Zzz', 2000); clearInterval(napT);
    napT = setInterval(() => { if (G.sitOn !== pl.uid) { clearInterval(napT); return; } say(pick(['……Zzz', '……苹果……（梦话）', 'Zzz……'])); }, 4200);
  });
}
function windMusicBox(pl) {
  const box = typeof BGM !== 'undefined' && BGM.musicBox;
  if (!box) return;
  const playing = box.toggle(() => { for (const sp of spinning.values()) sp.stopping = true; });
  if (playing) {
    for (const p2 of hs.placed) if (p2.id === 'musicbox') spinning.set(p2.uid, { a: (spinning.get(p2.uid) || {}).a || 0, speed: 0, stopping: false });
    anim(pl, 'wiggle'); say('（转了转发条）\n叮叮咚咚……', 1800);
  } else {
    for (const sp of spinning.values()) sp.stopping = true;
    say('……停下来了。', 1200);
  }
}
function updateSpinners(dt) {
  for (const [uid, sp] of spinning) {
    const pl = byUid(uid), cv = itemCanvas.get(uid);
    if (!pl || !cv) { spinning.delete(uid); continue; }
    sp.speed += ((sp.stopping ? 0 : 2.4) - sp.speed) * Math.min(1, dt * (sp.stopping ? 1.2 : 2));
    sp.a += sp.speed * dt;
    if (sp.stopping && sp.speed < .03) { spinning.delete(uid); paintItem(cv, pl.id, uid, pl); continue; }
    paintItem(cv, pl.id, uid, Object.assign({}, pl, { spin: sp.a }));
  }
}
const fxEl = $('#homeFx'), glowsEl = $('#glows');
function fxLater(el, ms) { fxEl.append(el); setTimeout(() => el.parentNode && el.parentNode.removeChild(el), ms); }
function water(pl) {
  const d = IT[pl.id], s = SFX();
  const can = document.createElement('canvas'); can.className = 'can';
  paint(can, 60, 50, K, p => {
    const S2 = Sketch.Shapes;
    p.draw(S2.rect(10, 18, 30, 24, 6), { fill: '#d3e3ee', w: 1.4 });
    p.draw([[38, 24], [56, 12], [58, 16], [40, 32]], { fill: '#d3e3ee', w: 1.2 });
    p.ink(S2.ell(16, 18, 8, 10, Math.PI, Math.PI * 2), { w: 1.6, closed: false });
  }, 9);
  Object.assign(can.style, { left: pct(pl.x - 70, LW), top: pct(pl.y - d.h - 60, LH), width: pct(60, LW), height: pct(50, LH) });
  fxLater(can, 1600);
  for (let i = 0; i < 6; i++) setTimeout(() => { const e = document.createElement('i'); e.className = 'drop'; e.style.left = pct(pl.x - 18 + rnd(-6, 10), LW); e.style.top = pct(pl.y - d.h - 30, LH); fxLater(e, 900); }, 300 + i * 120);
  s.drip && s.drip(); setTimeout(() => anim(pl, 'sway'), 500);
  say(pick(['浇水。', '……要长大哦。', '（小心地倒）']), 1400);
}
function sparkle(x, y) { for (let i = 0; i < 5; i++) { const e = document.createElement('i'); e.className = 'hspark'; e.textContent = '✦'; e.style.left = pct(x + rnd(-30, 30), LW); e.style.top = pct(y + rnd(-20, 20), LH); e.style.animationDelay = i * .07 + 's'; fxLater(e, 1000); } }
function renderGlows(flickUid) {
  glowsEl.innerHTML = '';
  const add = (x, y, w, h, kind, flick) => { const g = document.createElement('i'); g.className = 'glow ' + kind + (flick ? ' flick' : ''); Object.assign(g.style, { left: pct(x - w / 2, LW), top: pct(y - h / 2, LH), width: pct(w, LW), height: pct(h, LH) }); glowsEl.append(g); };
  if (hs.bulb !== false) add(700, 140, 420, 360, 'point big', flickUid === 'bulb');
  for (const pl of hs.placed) {
    const kind = LIGHTS[pl.id]; if (!kind || pl.on === false) continue;
    const d = IT[pl.id];
    if (kind === 'point') add(pl.x, pl.y - d.h * (pl.id === 'floorlamp' ? .74 : .6), pl.id === 'floorlamp' ? 360 : 240, pl.id === 'floorlamp' ? 320 : 200, 'point', flickUid === pl.uid);
    else add(pl.x, pl.y - d.h * .45, d.w * 1.15, 120, 'string', flickUid === pl.uid);
  }
}
// built-in things: the window, the ceiling bulb, the door
$$('.rspot').forEach(b => b.addEventListener('click', e => {
  e.stopPropagation(); const s = SFX();
  if (b.dataset.r === 'window') { winOpen = !winOpen; s.tick && s.tick(); paintRoom(); say(winOpen ? '……风，有苹果的味道。' : '关窗。', 1600); }
  if (b.dataset.r === 'bulb') { hs.bulb = hs.bulb === false; persist(); s.tick && s.tick(); renderGlows('bulb'); }
  if (b.dataset.r === 'door') say('前院……下次再去。', 1600);
}));
let petalT = 0;
function updatePetals(dt) {
  if (!winOpen) return;
  petalT -= dt; if (petalT > 0) return; petalT = rnd(.5, 1.1);
  const e = document.createElement('i'); e.className = 'petal';
  e.style.left = pct(rnd(H.ROOM.win.x0 + 30, H.ROOM.win.x1 - 30), LW); e.style.top = pct(rnd(H.ROOM.win.y0 + 30, H.ROOM.win.y1 - 60), LH);
  e.style.setProperty('--dx', rnd(80, 300) + 'px'); e.style.setProperty('--dy', rnd(120, 260) + 'px');
  fxLater(e, 4200);
}
$('#nightBtn').addEventListener('click', () => { hs.night = !hs.night; persist(); paintRoom(); updateNightBtn(); const s = SFX(); s.tick && s.tick(); });
function updateNightBtn() { $('#nightBtn').textContent = hs.night ? '🌙 夜晚' : '☀️ 白天'; }
setInterval(() => { if (!shown) return; for (const pl of hs.placed) if (pl.id === 'clock') paintItem(itemCanvas.get(pl.uid), 'clock', pl.uid, pl); }, 30000);

/* ---------------- showing / hiding the cottage ---------------- */
let shown = false, last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, .05); last = now;
  if (shown) { updateGirl(dt, now); updateSpinners(dt); updatePetals(dt); }
  requestAnimationFrame(frame);
}
function show() {
  if (GD.running()) { GD.say('还在营业……\n打烊以后再回家。'); return; }
  if (GD.day() < 2) { GD.say('第一天打烊以后，\n主人说要带我去一个地方。'); return; }
  document.body.classList.add('at-home'); shown = true; if (typeof BGM !== 'undefined') BGM.scene('home');
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === 'home'));
  updateNightBtn(); paintRoom(); if (!hs.intro) intro(); else say(pick(['……回来了。', '（伸了个懒腰）', '今天也辛苦了。']), 1600);
  scrollTo({ top: 0, behavior: 'smooth' });
}
function hide() {
  document.body.classList.remove('at-home'); shown = false; select(null); if (typeof BGM !== 'undefined') BGM.scene('shop');
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === 'shop'));
}
function intro() {
  hsheet.innerHTML = `<div class="paper owner"><h3>苹果园里的小屋</h3>
    <p>打烊以后，主人带她穿过苹果园，停在那棵青苹果树下。</p>
    <p>树下有一间旧木头小屋。「以前是放苹果筐的，」主人推开门，「现在给你住。」</p>
    <p>屋里空空的，只有她以前睡的那个篮子。</p>
    <p class="sign">用小店赚的硬币，去<b>家具店</b>买东西，再从<b>收纳箱</b>里拖进房间摆好吧。<br>先买一张床，怎么样？</p>
    <div class="row"><button class="btn" data-hgo="in">进去看看 →</button></div></div>`;
  hsheet.className = 'sheet on';
  hsheet.querySelector('[data-hgo="in"]').addEventListener('click', () => { hs.intro = true; persist(); closeSheet(); say('……这里，是我的？', 2200); G.vl -= 260; G.vr += 260; });
}
$$('.tabs button').forEach(b => b.addEventListener('click', () => b.dataset.view === 'home' ? show() : hide()));
$('#backToShop').addEventListener('click', hide);
let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => shown && paintRoom(), 150); });
document.fonts?.ready.then(() => shown && paintRoom());
requestAnimationFrame(frame);

return { show, hide, comfort, refresh: updateHud, isDragging: () => !!(drag && drag.moved), repaint: () => shown && paintRoom() };
})();
