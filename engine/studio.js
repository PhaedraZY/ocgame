/* studio.js — OC 工作站：换图、改菜单和做法、改家具/装饰/客人/文字/配色/音乐，存成草稿（浏览器里），一键导出主题包。
   草稿存在 IndexedDB（boot.js 的 OCDraft）；游戏网址加 ?studio 就能看到草稿效果（右边的预览就是这样）。 */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const T = THEME, ID = T.id, B = T._base;
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FILES = Object.keys(B.files || {});                     // dishes, customers, shopDecor, furniture, text, kitchen …

/* ---------------- working copy + draft ---------------- */
const W = {};                                                   // the json files being edited
for (const k of FILES) W[k] = clone(T[k]);
const WT = { page: clone(T.page || {}), ui: clone(T.ui || { colors: {}, fonts: {} }), maxDishes: T.maxDishes || 5 };
const prev = T._draft || {};
const draft = { id: ID, theme: WT, files: W, images: { ...(prev.images || {}) }, audio: { ...(prev.audio || {}) }, removed: [...(prev.removed || [])] };
let saveT = 0, pvT = 0, booted = false;
const autoPv = document.getElementById('pvAuto');
function dirty() { $('#stState').textContent = '有改动，正在存草稿……'; $('#stState').classList.add('dirty'); clearTimeout(saveT); saveT = setTimeout(save, 500); }
async function save() {
  clearTimeout(saveT);
  await OCDraft.put(ID, draft);
  $('#stState').textContent = `草稿已保存（${Object.keys(draft.images).length} 张新图）· 导出主题包后才会上线`; $('#stState').classList.remove('dirty');
  if (autoPv && autoPv.checked && booted) { clearTimeout(pvT); pvT = setTimeout(refreshPreview, 900); }
}
const toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.append(toastEl);
let toastT; function toast(t, ms = 2600) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms); }
function undoToast(t, undo) {
  toastEl.innerHTML = `${esc(t)} <button>撤销</button>`; toastEl.classList.add('on');
  toastEl.querySelector('button').onclick = () => { toastEl.classList.remove('on'); undo(); };
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 5000);
}

/* ---------------- images ---------------- */
const OC_KEYS = { 'oc.body': '人物身体（除了耳朵的整个人）', 'oc.earL': '左耳（单独一层，会动）', 'oc.earR': '右耳（单独一层，会动）', 'oc.full': '立绘（大图）', 'oc.card': '人物卡片图' };
const repoImg = key => key.startsWith('oc.') ? (B.oc && B.oc[key.slice(3)]) : (!draft.removed.includes(key) && T._base && baseImages().has(key) ? 'theme/' + baseImages().get(key) : null);
let _bi; function baseImages() { if (_bi) return _bi; _bi = new Map(); const im = B.images || []; (Array.isArray(im) ? im.map(f => [f.replace(/\.(png|webp|jpe?g)$/i, ''), 'images/' + f]) : Object.entries(im)).forEach(([k, f]) => _bi.set(k, f)); return _bi; }
function entriesByGroup() {
  const g = new Map([['人物', Object.entries(OC_KEYS).map(([key, label]) => ({ key, label, group: '人物', kind: 'oc', fit: 'contain', box: [0, 0, 400, 500] }))]]);
  for (const e of Skin.catalog.values()) { if (!g.has(e.group)) g.set(e.group, []); g.get(e.group).push(e); }
  return g;
}
let imgGroup = '店面';
function viewImages() {
  const groups = entriesByGroup();
  const tabs = [...groups.keys()].map(g => `<button data-g="${esc(g)}" class="${g === imgGroup ? 'on' : ''}">${esc(g)} <span class="mini">${groups.get(g).filter(e => draft.images[e.key]).length || ''}</span></button>`).join('');
  main.innerHTML = `<h2>素材图片</h2><p class="lead">每张卡片是网页里一个能换成你画的图的东西。<b>上传</b>后会自动检查大小（超过规格会自动缩小、转成 WebP），马上在右边预览里生效。
    绿框 = 你这次上传的（草稿），蓝框 = 主题包里已经有的，其余是现在的手绘。不知道画多大？先点<b>下载模板</b>，在上面画。</p>
    <div class="tabs">${tabs}</div><div class="grid" id="imgGrid"></div>`;
  main.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { imgGroup = b.dataset.g; viewImages(); });
  const grid = $('#imgGrid');
  for (const e of groups.get(imgGroup) || []) {
    const spec = Skin.SPEC[e.kind] || Skin.SPEC.small, mine = draft.images[e.key], repo = repoImg(e.key);
    const card = document.createElement('div'); card.className = 'card' + (mine ? ' mine' : repo ? ' base' : '');
    const pic = document.createElement('div'); pic.className = 'pic';
    if (mine || repo) { const im = new Image(); im.src = mine ? URL.createObjectURL(mine) : repo; pic.append(im); }
    else if (e.draw) pic.append(OCTools.renderTemplate(e, 1.4));
    card.append(pic);
    const [, , w, h] = e.box;
    card.insertAdjacentHTML('beforeend', `<b>${esc(e.label)}</b> ${mine ? '<span class="tag">草稿</span>' : repo ? '<span class="tag blue">主题包</span>' : ''}<br><code>${esc(e.key)}</code>
      <small>${e.key.startsWith('oc.') ? '' : `建议 ${Math.round(w * 2)} × ${Math.round(h * 2)} 像素 · `}最大长边 ${spec.px} 像素、${spec.kb} KB · ${e.fit === 'stretch' ? '拉伸铺满' : '按比例贴底居中'}</small>`);
    const row = document.createElement('div'); row.className = 'row';
    row.append(btn('上传', () => upload(e)));
    if (e.draw) row.append(btn('下载模板', () => OCTools.renderTemplate(e).toBlob(b => OCTools.download(b, e.key + '.png'))));
    if (mine) row.append(btn('撤销上传', () => { delete draft.images[e.key]; dirty(); viewImages(); }, 'danger'));
    else if (repo && !e.key.startsWith('oc.')) row.append(btn('删掉（改回手绘）', () => { draft.removed.push(e.key); dirty(); viewImages(); }, 'danger'));
    else if (draft.removed.includes(e.key)) row.append(btn('恢复', () => { draft.removed = draft.removed.filter(k => k !== e.key); dirty(); viewImages(); }));
    card.append(row); grid.append(card);
  }
}
function btn(t, fn, cls = '') { const b = document.createElement('button'); b.textContent = t; b.className = cls; b.onclick = fn; return b; }
function pickFile(accept) {
  return new Promise(ok => { const f = $('#filePick'); f.accept = accept; f.value = ''; f.onchange = () => ok(f.files[0] || null); f.click(); });
}
async function upload(e) {
  const file = await pickFile('image/png,image/webp,image/jpeg'); if (!file) return;
  const spec = Skin.SPEC[e.kind] || Skin.SPEC.small;
  try {
    const r = await OCTools.fitImage(file, spec.px, spec.kb);
    draft.images[e.key] = r.blob; draft.removed = draft.removed.filter(k => k !== e.key); dirty();
    const [, , w, h] = e.box, ratio = (r.w / r.h) / (w / h);
    let msg = `已上传 ${e.key}：${r.w}×${r.h}，${r.kb} KB` + (r.scaled ? `（原图 ${r.w0}×${r.h0}，已缩小）` : '');
    if (r.tooBig) msg += '。文件还是有点大，建议画简单一点或者存成 WebP。';
    if (!e.key.startsWith('oc.') && (ratio > 1.15 || ratio < .87)) msg += e.fit === 'stretch' ? '。比例和模板不一样，会被拉伸。' : '。比例和模板不一样，会按比例缩放、贴底居中。';
    toast(msg, 4200); viewImages();
  } catch (err) { toast('上传失败：' + err.message); }
}

/* ---------------- small form helpers ---------------- */
const itemIds = () => Object.keys(W.kitchen.items);
const itemOpts = (sel, blank = true) => (blank ? '<option value="">（无）</option>' : '') + itemIds().map(id => `<option value="${id}" ${id === sel ? 'selected' : ''}>${esc(W.kitchen.items[id].name)}（${id}）</option>`).join('');
const dishOpts = sel => '<option value="">（一直有）</option>' + W.dishes.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(d.name)}</option>`).join('');
const stationOpts = sel => W.kitchen.stations.filter(s => ['bench', 'cooker', 'plates'].includes(s.type)).map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}（${s.id}）</option>`).join('');
/* bind every [data-k] input inside `root` to obj[path]; numbers / checkboxes handled */
function bindInputs(root, getObj, after) {
  root.querySelectorAll('[data-k]').forEach(el => {
    el.onchange = () => {
      const o = getObj(el), k = el.dataset.k;
      let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? undefined : +el.value) : el.value;
      if (el.dataset.t === 'box') v = el.value.trim() ? el.value.split(/[,，\s]+/).map(Number) : undefined;
      if (v === undefined || v === '') delete o[k]; else o[k] = v;
      dirty(); after && after();
    };
  });
}
const newId = (prefix, taken) => { let id = prompt(`新的 id（英文字母/数字，用在图片名字里，比如 ${prefix}）`); if (!id) return null; id = id.trim(); if (!/^[a-zA-Z][\w-]*$/.test(id)) { toast('id 只能用英文字母、数字、- 和 _'); return null; } if (taken.includes(id)) { toast('这个 id 已经有了'); return null; } return id; };

/* ---------------- menu & recipes ---------------- */
function recipeText(d) {
  const it = id => esc(W.kitchen.items[id] ? W.kitchen.items[id].name : id);
  if (d.stack) return `叠：${d.stack.map(it).join(' → ')}`;
  return `装盘：${d.base ? it(d.base) : '？'}${(d.toppings || []).length ? ' + ' + d.toppings.map(it).join(' + ') : ''}`;
}
/* how is an item made? walk the kitchen backwards so the user sees the whole flow */
function chain(item, depth = 0) {
  if (depth > 6) return '…';
  const K = W.kitchen, nm = id => esc(K.items[id] ? K.items[id].name : id);
  const src = K.stations.find(s => s.type === 'source' && s.item === item);
  for (const s of K.stations) for (const r of s.rules || []) if (r.makes === item)
    return `${r.need.map(n => chain(n, depth + 1)).join(' + ')} <i>→ ${esc(s.name)}${r.taps ? `（${s.tap || '点'} ${r.taps} 下）` : ''}${r.cook ? `（${s.verb || '等'} ${r.cook} 秒${r.flip ? '，翻面' : ''}${r.burn ? `，${r.burn} 秒后焦` : ''}）` : ''} →</i> <span>${nm(item)}</span>`;
  if (src) return `<span>${esc(src.name)}</span>`;
  const fill = K.stations.find(s => s.type === 'fill' && s.item === item); if (fill) return `<span>按住${esc(fill.name)}</span>`;
  const top = K.stations.find(s => s.type === 'topping' && s.item === item); if (top) return `<span>${esc(top.name)}</span>`;
  return `<span class="warn">${nm(item)}（还没有设备做它！）</span>`;
}
function viewMenu() {
  main.innerHTML = `<h2>菜单与做法</h2><p class="lead">每道菜：第几天解锁、价格、客人耐心倍数（1 = 正常，1.3 = 多等 30%）、上架开关、做法。做法有两种：<b>装盘</b>（一个成品 + 加料）和<b>叠层</b>（按顺序叠，叠错重来）。下面的流程图是根据「厨房设备」自动算出来的；显示红字说明还缺设备。
    每天菜单最多 <input type="number" id="maxD" min="2" max="10" value="${WT.maxDishes}" style="width:56px"> 道。</p>
    <table class="form"><tr><th>id</th><th>名字</th><th>第几天</th><th>价格</th><th>耐心</th><th>上架</th><th>会化（秒）</th><th>做法</th><th></th></tr>
    ${W.dishes.map((d, i) => `<tr data-i="${i}"><td><code>${esc(d.id)}</code></td><td><input type="text" data-k="name" value="${esc(d.name)}"></td><td><input type="number" data-k="day" value="${d.day}"></td>
      <td><input type="number" data-k="price" value="${d.price}"></td><td><input type="number" step=".05" data-k="pat" value="${d.pat ?? ''}" placeholder="1"></td>
      <td><input type="checkbox" data-k="ready" ${d.ready ? 'checked' : ''}></td><td><input type="number" data-k="melt" value="${d.melt ?? ''}"></td>
      <td class="mini">${recipeText(d)}</td><td><button data-edit="${i}">改做法</button></td></tr>`).join('')}</table>
    <p><button id="addDish" class="main">＋ 加一道菜</button></p><div id="recipeBox"></div>`;
  $('#maxD').onchange = e => { WT.maxDishes = +e.target.value || 5; dirty(); };
  bindInputs(main.querySelector('table'), el => W.dishes[+el.closest('tr').dataset.i], () => {});
  main.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editRecipe(+b.dataset.edit));
  $('#addDish').onclick = () => { const id = newId('mango', W.dishes.map(d => d.id)); if (!id) return; W.dishes.push({ id, name: '新菜', day: (W.dishes.at(-1) || {}).day + 2 || 1, price: 8, ready: false, base: '', toppings: [] }); dirty(); viewMenu(); editRecipe(W.dishes.length - 1); };
}
/* which items make sense in a list: toppings come from a topping bottle / fill tap / a station that sends to the plates;
   stack layers come from anything that reaches the plates; station inputs are anything */
function suggested(name) {
  const K = W.kitchen, toPlates = new Set();
  for (const st of K.stations) {
    if (st.type === 'source' && st.to === 'plates') toPlates.add(st.item);
    if (st.type === 'topping' || st.type === 'fill') toPlates.add(st.item);
    for (const r of st.rules || []) if (r.to === 'plates') toPlates.add(r.makes);
  }
  if (name === 'toppings') {     // bottles, taps, and things sent to the plates that aren't some dish's main part
    const mains = new Set(W.dishes.flatMap(d => [d.base, ...(d.stack || [])]).filter(Boolean));
    return itemIds().filter(id => K.stations.some(st => (st.type === 'topping' || st.type === 'fill') && st.item === id) || (toPlates.has(id) && !mains.has(id)));
  }
  if (name === 'stack') return [...toPlates];
  return [];
}
function chipsHtml(list, name) {
  const have = list || [], sug = suggested(name).filter(id => name === 'stack' || !have.includes(id));
  const rest = itemIds().filter(id => !sug.includes(id) && (name === 'stack' || !have.includes(id)));
  const opt = id => `<option value="${id}">${esc(W.kitchen.items[id].name)}（${id}）</option>`;
  const label = { toppings: '＋ 加一样料', stack: '＋ 加一层', need: '＋ 放进去' }[name] || '＋ 加';
  return `<div class="chips" data-chips="${name}">${have.map((id, j) => `<span class="chip">${esc(W.kitchen.items[id] ? W.kitchen.items[id].name : id)}${name === 'stack' ? `<button data-up="${j}" title="往前">↑</button>` : ''}<button data-del="${j}" title="去掉">×</button></span>`).join('')}
    <select data-add class="add"><option value="">${label}</option>${sug.length ? `<optgroup label="常用">${sug.map(opt).join('')}</optgroup><optgroup label="其他">${rest.map(opt).join('')}</optgroup>` : rest.map(opt).join('')}</select></div>`;
}
function wireChips(root, getList, setList, redraw) {
  root.querySelectorAll('[data-chips]').forEach(box => {
    const name = box.dataset.chips;
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const l = getList(name), j = +b.dataset.del, [gone] = l.splice(j, 1); setList(name, l); dirty(); redraw();
      undoToast(`去掉了「${W.kitchen.items[gone] ? W.kitchen.items[gone].name : gone}」`, () => { const l2 = getList(name); l2.splice(j, 0, gone); setList(name, l2); dirty(); redraw(); });
    });
    box.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const l = getList(name), j = +b.dataset.up; if (j > 0) [l[j - 1], l[j]] = [l[j], l[j - 1]]; setList(name, l); dirty(); redraw(); });
    box.querySelector('[data-add]').onchange = e => {
      const v = e.target.value; if (!v) return;
      const l = getList(name); if (name !== 'stack' && l.includes(v)) return toast('已经有了');
      l.push(v); setList(name, l); dirty(); redraw(); toast(`加上了「${W.kitchen.items[v].name}」`, 1600);
    };
  });
}
function editRecipe(i) {
  const d = W.dishes[i], box = $('#recipeBox'), stacked = !!d.stack;
  box.innerHTML = `<div class="recipe"><h3>做法：${esc(d.name)}</h3>
    <label><input type="radio" name="rt" value="base" ${stacked ? '' : 'checked'}> 装盘（一个成品 + 加料）</label>
    <label><input type="radio" name="rt" value="stack" ${stacked ? 'checked' : ''}> 叠层（按顺序叠，叠错重来）</label>
    ${stacked ? `<p>从下往上：</p>${chipsHtml(d.stack, 'stack')}`
      : `<p>成品（装盘的东西）：<select id="baseSel">${itemOpts(d.base)}</select></p><p>还要加：</p>${chipsHtml(d.toppings, 'toppings')}`}
    <p class="mini">流程（根据厨房设备自动算的）：</p>
    <div class="flow">${stacked ? (d.stack || []).map(x => chain(x)).join('<i>　｜　</i>') : `${d.base ? chain(d.base) : '<span class="warn">先选成品</span>'}${(d.toppings || []).map(t => '<i>＋</i>' + chain(t)).join('')}`}</div>
    <p class="mini">新的物品或设备（比如新的原料、新的锅）在「厨房设备」里加。做好后记得在「文字」里给这道菜写一张主人的做法便签。</p></div>`;
  box.querySelectorAll('[name=rt]').forEach(r => r.onchange = () => { if (r.value === 'stack') { d.stack = d.stack || []; delete d.base; delete d.toppings; } else { delete d.stack; d.base = d.base || ''; d.toppings = d.toppings || []; } dirty(); editRecipe(i); viewMenuRow(); });
  const bs = $('#baseSel'); if (bs) bs.onchange = () => { d.base = bs.value; dirty(); editRecipe(i); viewMenuRow(); };
  wireChips(box, n => d[n] || [], (n, l) => { d[n] = l; }, () => { editRecipe(i); viewMenuRow(); });
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  function viewMenuRow() { const td = main.querySelector(`tr[data-i="${i}"] td.mini`); if (td) td.innerHTML = recipeText(d); }
}

/* ---------------- kitchen ---------------- */
const CARRY_IDS = [...Skin.catalog.keys()].filter(k => k.startsWith('carry.')).map(k => k.slice(6));
const TYPE_NAME = { source: '原料（点了拿东西）', bench: '工作台（放料 + 连点）', cooker: '加热/冷藏（计时，会糊）', fill: '按住灌（饮料机）', plates: '出餐盘', topping: '加料瓶', bell: '出餐铃' };
const keepScroll = view => () => { const y = main.scrollTop; view(); main.scrollTop = y; };
function viewKitchen() {
  const K = W.kitchen;
  main.innerHTML = `<h2>厨房设备</h2><p class="lead"><b>物品</b>是厨房里流动的东西（原料、半成品、成品）；<b>设备</b>决定物品怎么变：放进去的（need）→ 做出来的（makes）→ 送去哪（to）。
    位置用店面坐标（整张店面 1200×720），格式「x, y, 宽, 高」。改完点右上角「刷新预览」试玩。</p>
    <h3>物品</h3><table class="form"><tr><th>id</th><th>名字</th><th>倒掉赔多少</th><th>拿在手上的图</th></tr>
    ${Object.entries(K.items).map(([id, it]) => `<tr data-id="${id}"><td><code>${id}</code></td><td><input type="text" data-k="name" value="${esc(it.name)}"></td>
      <td><input type="number" data-k="cost" value="${it.cost ?? ''}" placeholder="自动"></td>
      <td><select data-k="carry"><option value="">（同 id）</option>${CARRY_IDS.map(c => `<option ${c === it.carry ? 'selected' : ''}>${c}</option>`).join('')}</select></td></tr>`).join('')}</table>
    <p><button id="addItem">＋ 加物品</button></p>
    <h3>设备</h3><div id="stList"></div>
    <p><select id="newType">${Object.entries(TYPE_NAME).filter(([t]) => !['plates', 'bell'].includes(t)).map(([t, n]) => `<option value="${t}">${n}</option>`).join('')}</select> <button id="addSt">＋ 加设备</button></p>`;
  bindInputs(main.querySelector('table'), el => K.items[el.closest('tr').dataset.id]);
  $('#addItem').onclick = () => { const id = newId('mango', itemIds()); if (!id) return; K.items[id] = { name: '新物品', cost: 1 }; dirty(); viewKitchen(); };
  $('#addSt').onclick = () => {
    const t = $('#newType').value, id = newId('blender', K.stations.map(s => s.id)); if (!id) return;
    const s = { id, type: t, name: '新设备', spot: [560, 300, 60, 60], x: 590 };
    if (t === 'source') Object.assign(s, { item: '', to: '' });
    if (t === 'topping' || t === 'fill') Object.assign(s, { item: '' });
    if (t === 'fill') Object.assign(s, { rate: .42, band: [.72, .92], box: [962, 200, 54, 70], gauge: [1026, 202, 0, 66], draw: 'sodaCup' });
    if (t === 'bench' || t === 'cooker') Object.assign(s, { rules: [], box: [560, 300, 80, 80], tap: '搅', verb: '煮' });
    K.stations.push(s); dirty(); viewKitchen();
  };
  const list = $('#stList');
  K.stations.forEach((s, si) => {
    const div = document.createElement('div'); div.className = 'recipe';
    const pos = k => `<label>${k}：<input type="text" data-k="${k}" data-t="box" value="${(s[k] || []).join(', ')}" style="width:150px"></label>`;
    div.innerHTML = `<b>${esc(s.name)}</b> <code>${s.id}</code> <span class="tag blue">${TYPE_NAME[s.type] || s.type}</span>
      <table class="form" style="margin-top:6px"><tr><th>名字</th><td><input type="text" data-k="name" value="${esc(s.name)}"></td><th>手机按钮</th><td><input type="text" data-k="pad" value="${esc(s.pad || '')}" placeholder="同名字"></td>
        <th>哪道菜解锁后出现</th><td><select data-k="need">${dishOpts(s.need)}</select></td></tr>
      ${s.type === 'source' ? `<tr><th>拿什么</th><td><select data-k="item">${itemOpts(s.item)}</select></td><th>送去</th><td colspan="3"><select data-k="to"><option value="">？</option>${stationOpts(s.to)}</select></td></tr>` : ''}
      ${s.type === 'topping' || s.type === 'fill' ? `<tr><th>加什么</th><td><select data-k="item">${itemOpts(s.item)}</select></td>${s.type === 'fill' ? `<th>每秒涨</th><td><input type="number" step=".02" data-k="rate" value="${s.rate}"></td><th>刚好区间</th><td><input type="text" data-k="band" data-t="box" value="${(s.band || []).join(', ')}"></td>` : ''}</tr>` : ''}
      ${s.type === 'bench' ? `<tr><th>连点叫</th><td><input type="text" data-k="tap" value="${esc(s.tap || '')}"></td></tr>` : ''}
      ${s.type === 'cooker' ? `<tr><th>加热叫</th><td><input type="text" data-k="verb" value="${esc(s.verb || '')}"></td><th>格数</th><td><input type="number" data-k="slots" value="${s.slots || 1}"></td></tr>` : ''}
      <tr><td colspan="6" class="mini">${pos('spot')} ${s.box ? pos('box') : ''} <label>果冻站的 x：<input type="number" data-k="x" value="${s.x ?? ''}"></label> ${s.ring ? pos('ring') : ''}</td></tr></table>
      <div class="rules"></div>
      ${['bench', 'cooker'].includes(s.type) ? '<button data-addrule>＋ 加一条规则</button>' : ''}
      ${['source', 'topping', 'bench', 'cooker', 'fill'].includes(s.type) ? ' <button class="danger" data-delst>删掉这台设备</button>' : ''}`;
    bindInputs(div.querySelector('table'), () => s);
    const rules = div.querySelector('.rules');
    (s.rules || []).forEach((r, ri) => {
      const rd = document.createElement('div'); rd.className = 'mini'; rd.style.margin = '6px 0';
      rd.innerHTML = `规则 ${ri + 1}：放进 ${chipsHtml(r.need, 'need')} 做出 <select data-k="makes">${itemOpts(r.makes)}</select> 送去 <select data-k="to"><option value="">？</option>${stationOpts(r.to)}</select>
        ${s.type === 'bench' ? `${esc(s.tap || '点')} <input type="number" data-k="taps" value="${r.taps ?? 3}" style="width:50px"> 下` : ''}
        ${s.type === 'cooker' ? `等 <input type="number" data-k="cook" value="${r.cook ?? 5}" style="width:50px"> 秒，好了以后 <input type="number" data-k="burn" value="${r.burn ?? ''}" placeholder="不焦" style="width:56px"> 秒焦；翻面：<input type="number" data-k="flip" value="${r.flip ?? ''}" placeholder="不用" style="width:56px"> 秒内要翻，翻完再等 <input type="number" data-k="cook2" value="${r.cook2 ?? ''}" style="width:50px"> 秒` : ''}
        哪道菜解锁后才有：<select data-k="need_dish">${dishOpts(r.need_dish)}</select> <button class="danger" data-delrule>×</button>`;
      bindInputs(rd, () => r);
      wireChips(rd, n => r[n] || [], (n, l) => { r[n] = l; }, keepScroll(viewKitchen));
      rd.querySelector('[data-delrule]').onclick = () => { s.rules.splice(ri, 1); dirty(); keepScroll(viewKitchen)(); };
      rules.append(rd);
    });
    const ar = div.querySelector('[data-addrule]'); if (ar) ar.onclick = () => { s.rules.push({ need: [], makes: '', to: '', ...(s.type === 'bench' ? { taps: 3 } : { cook: 5, burn: 8 }) }); dirty(); keepScroll(viewKitchen)(); };
    const ds = div.querySelector('[data-delst]'); if (ds) ds.onclick = () => { if (!confirm(`删掉「${s.name}」？`)) return; K.stations.splice(si, 1); dirty(); viewKitchen(); };
    list.append(div);
  });
}

/* ---------------- simple tables: furniture, shop decor, customers ---------------- */
function table(title, lead, rows, cols, onAdd, imgKey, commit = () => {}) {
  main.innerHTML = `<h2>${title}</h2><p class="lead">${lead}</p><table class="form"><tr>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>图片</th><th></th></tr>
    ${rows.map((r, i) => `<tr data-i="${i}">${cols.map(([k, , t, opts]) => `<td>${k === 'id' ? `<code>${esc(r.id)}</code>` : t === 'select' ? `<select data-k="${k}">${opts.map(([v, n]) => `<option value="${v}" ${v === r[k] ? 'selected' : ''}>${n}</option>`).join('')}</select>`
      : t === 'check' ? `<input type="checkbox" data-k="${k}" ${r[k] ? 'checked' : ''}>` : t === 'box' ? `<input type="text" data-k="${k}" data-t="box" value="${(r[k] || []).join(', ')}">`
      : t === 'area' ? `<textarea data-k="${k}">${esc(r[k])}</textarea>` : `<input type="${t || 'text'}" data-k="${k}" value="${esc(r[k] ?? '')}">`}</td>`).join('')}
      <td>${draft.images[imgKey(r)] ? '<span class="tag">草稿</span>' : repoImg(imgKey(r)) ? '<span class="tag blue">有</span>' : '<span class="mini">手绘</span>'} <button data-up="${i}">上传</button></td><td><button class="danger" data-del="${i}">×</button></td></tr>`).join('')}</table>
    <p><button id="addRow" class="main">＋ 加一个</button></p>`;
  bindInputs(main.querySelector('table'), el => rows[+el.closest('tr').dataset.i], commit);
  main.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const r = rows[+b.dataset.up], key = imgKey(r); const e = Skin.catalog.get(key) || { key, label: r.name, kind: 'small', fit: 'contain', box: [0, 0, r.w || 120, r.h || 120] }; upload(e).then(() => nav.go(cur)); });
  main.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const r = rows[+b.dataset.del]; if (!confirm(`删掉「${r.name}」？`)) return; rows.splice(+b.dataset.del, 1); commit(); dirty(); nav.go(cur); });
  $('#addRow').onclick = onAdd;
}
function viewFurniture() {
  const F = W.furniture, rows = Object.entries(F.items).map(([id, d]) => ({ ...d, id }));
  const commit = () => { F.items = Object.fromEntries(rows.map(({ id, ...rest }) => [id, rest])); };
  const cats = Object.entries(F.categories);
  table('家具', '小屋家具店里卖的东西。zone：floor 地上 / wall 墙上 / small 小摆件（能放在桌子上）/ rug 地毯。w、h 是尺寸（画面上会再放大 ' + F.scale + ' 倍）。新家具没上传图片前显示成一个空框。', rows,
    [['id', 'id'], ['name', '名字'], ['cat', '分类', 'select', cats], ['price', '价格', 'number'], ['comfort', '舒适度', 'number'],
     ['zone', '放哪', 'select', [['floor', '地上'], ['wall', '墙上'], ['small', '小摆件'], ['rug', '地毯']]], ['w', '宽', 'number'], ['h', '高', 'number'], ['soft', '软', 'check'], ['line', '果冻说', 'area']],
    () => { const id = newId('teapot', Object.keys(F.items)); if (!id) return; F.items[id] = { name: '新家具', cat: cats[0][0], w: 100, h: 100, zone: 'floor', price: 100, comfort: 3, line: '……' }; dirty(); nav.go('furniture'); }, r => 'item.' + r.id, commit);
}
function viewDecor() {
  table('店里装饰', '营业日记里能买的店面装饰。自己加的装饰要写「位置」（店面坐标 x, y, 宽, 高），并上传图片。', W.shopDecor,
    [['id', 'id'], ['name', '名字'], ['price', '价格', 'number'], ['box', '位置（新装饰）', 'box'], ['line', '果冻说', 'area']],
    () => { const id = newId('vase', W.shopDecor.map(d => d.id)); if (!id) return; W.shopDecor.push({ id, name: '新装饰', price: 100, box: [560, 240, 80, 80], line: '……' }); dirty(); nav.go('decor'); }, r => 'decor.' + r.id);
}
function viewCustomers() {
  table('客人', '来店里的客人（画的是背影，170×160）。耐心 1 = 正常；小费 = 满心时多给几枚。', W.customers,
    [['id', 'id'], ['name', '名字'], ['pat', '耐心', 'number'], ['tip', '小费', 'number'], ['ok', '满意时说', 'area'], ['bad', '不对时说', 'area'], ['leave', '走掉时说', 'area']],
    () => { const id = newId('cat', W.customers.map(c => c.id)); if (!id) return; W.customers.push({ id, name: '新客人', pat: 1, tip: 1, ok: '谢谢！', bad: '……', leave: '下次再来。' }); dirty(); nav.go('customers'); }, r => 'customer.' + r.id);
}

/* ---------------- text ---------------- */
function viewText() {
  const X = W.text, P = WT.page;
  const pageF = [['title', '网页标题'], ['description', '网页简介'], ['date', '小标题'], ['h1', '大标题'], ['sub', '副标题'], ['homeName', '小屋名字'], ['footer', '页脚']];
  const linesF = { greet: '客人来了', serve: '出餐', missed: '客人走掉', stay: '打烊后', pokeBusy: '营业时被戳', pokeIdle: '休息时被戳', homeBack: '回小屋', wardrobe: '开衣柜', desk: '坐书桌', nap: '睡觉', water: '浇花' };
  main.innerHTML = `<h2>文字</h2><p class="lead">网页上的字、便签、新菜做法、营业日记、台词和故事。台词每句之间<b>空一行</b>；一句里面可以换行。便签里可以用 &lt;b&gt;加粗&lt;/b&gt;。</p>
    <h3>网页</h3><table class="form">${pageF.map(([k, n]) => `<tr><th>${n}</th><td><input type="text" data-p="${k}" value="${esc(P[k])}"></td></tr>`).join('')}</table>
    <h3>第一天的便签</h3><table class="form"><tr><th>标题</th><td><input type="text" id="introT" value="${esc(X.intro.title)}"></td></tr><tr><th>内容</th><td><textarea id="introH" rows="7">${esc(X.intro.html)}</textarea></td></tr></table>
    <h3>新菜做法便签（解锁那天开店前弹出）</h3><table class="form">${W.dishes.filter(d => d.day > 1).map(d => { const r = X.recipes[d.id] || {}; return `<tr><th>${esc(d.name)}</th><td><input type="text" data-r="${d.id}" data-f="title" value="${esc(r.title || '')}" placeholder="新菜：${esc(d.name)}"><textarea data-r="${d.id}" data-f="html" rows="4">${esc(r.html || '')}</textarea></td></tr>`; }).join('')}</table>
    <h3>点店里东西弹出的小便签</h3><table class="form">${Object.entries(X.notes).map(([k, n]) => `<tr><th>${esc(k)}</th><td><input type="text" data-n="${k}" data-f="title" value="${esc(n.title)}"><textarea data-n="${k}" data-f="html">${esc(n.html)}</textarea></td></tr>`).join('')}</table>
    <h3>营业日记（每天一句，按顺序）</h3><div class="textlist"><textarea id="diary" rows="6">${esc(X.diary.join('\n\n'))}</textarea></div>
    <h3>${esc(T.name || '')}的台词（随机说一句）</h3><table class="form">${Object.entries(linesF).map(([k, n]) => `<tr><th>${n}</th><td><textarea data-l="${k}" rows="3">${esc((X.lines[k] || []).join('\n\n'))}</textarea></td></tr>`).join('')}</table>
    <h3>短台词（做事时说的话）</h3><table class="form">${Object.entries(X.voice || {}).map(([k, v]) => `<tr><th class="mini">${esc(k)}</th><td><textarea data-v="${k}" rows="2">${esc(v)}</textarea></td></tr>`).join('')}</table>
    <h3>故事</h3><table class="form">
      <tr><th>结局（第 <input type="number" data-s="finale.day" value="${(X.story.finale || {}).day || 3}" style="width:48px"> 天打烊后）</th><td><input type="text" data-s="finale.title" value="${esc((X.story.finale || {}).title)}"><textarea data-s="finale.html" rows="4">${esc((X.story.finale || {}).html)}</textarea>印章：<input type="text" data-s="finale.stamp" value="${esc((X.story.finale || {}).stamp)}" style="width:80px"></td></tr>
      <tr><th>第一次回小屋</th><td><input type="text" data-s="home.title" value="${esc(X.story.home.title)}"><textarea data-s="home.html" rows="4">${esc(X.story.home.html)}</textarea>按钮：<input type="text" data-s="home.button" value="${esc(X.story.home.button)}" style="width:140px"> 进门后说：<input type="text" data-s="home.after" value="${esc(X.story.home.after)}" style="width:180px"></td></tr>
      <tr><th>第一天不能回小屋时说</th><td><textarea data-s="homeLocked" rows="2">${esc(X.story.homeLocked)}</textarea></td></tr>
      <tr><th>日记署名</th><td><input type="text" data-s="diaryBy" value="${esc(X.story.diaryBy)}"></td></tr>
      <tr><th>第一次买床（每句空一行）</th><td><textarea data-s="bed.lines" rows="4">${esc((X.story.bed.lines || []).join('\n\n'))}</textarea>便签：<input type="text" data-s="bed.noteTitle" value="${esc(X.story.bed.noteTitle)}"><textarea data-s="bed.note" rows="2">${esc(X.story.bed.note)}</textarea></td></tr></table>`;
  const split = v => v.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  main.querySelectorAll('[data-p]').forEach(el => el.onchange = () => { P[el.dataset.p] = el.value; dirty(); });
  $('#introT').onchange = e => { X.intro.title = e.target.value; dirty(); }; $('#introH').onchange = e => { X.intro.html = e.target.value; dirty(); };
  main.querySelectorAll('[data-r]').forEach(el => el.onchange = () => { const r = X.recipes[el.dataset.r] = X.recipes[el.dataset.r] || {}; r[el.dataset.f] = el.value; if (!r.title && !r.html) delete X.recipes[el.dataset.r]; dirty(); });
  main.querySelectorAll('[data-n]').forEach(el => el.onchange = () => { X.notes[el.dataset.n][el.dataset.f] = el.value; dirty(); });
  $('#diary').onchange = e => { X.diary = split(e.target.value); dirty(); };
  main.querySelectorAll('[data-l]').forEach(el => el.onchange = () => { X.lines[el.dataset.l] = split(el.value); dirty(); });
  main.querySelectorAll('[data-v]').forEach(el => el.onchange = () => { X.voice[el.dataset.v] = el.value; dirty(); });
  main.querySelectorAll('[data-s]').forEach(el => el.onchange = () => {
    const path = el.dataset.s.split('.'), last = path.pop(); let o = X.story; for (const k of path) o = o[k] = o[k] || {};
    o[last] = el.type === 'number' ? +el.value : last === 'lines' ? split(el.value) : el.value; dirty();
  });
}

/* ---------------- UI colours + music ---------------- */
const COLORS = { '--line': ['线条和文字', '#7a6c66'], '--soft': ['浅线条', '#a39089'], '--apple': ['主色（按钮）', '#bcd97a'], '--apple-d': ['主色（深）', '#93bb57'], '--pink': ['粉色点缀', '#f4cad3'], '--mist': ['雾蓝', '#d3e3ee'], '--dot': ['波点', '#a3bfdd'], '--paper': ['纸张', '#fbf8f0'], '--dark': ['深色', '#4b4e48'] };
function viewUI() {
  const c = WT.ui.colors = WT.ui.colors || {}, f = WT.ui.fonts = WT.ui.fonts || {};
  main.innerHTML = `<h2>界面与音乐</h2><p class="lead">网页的配色和字体。界面的图片（纸、按钮、便签、胶带）在「素材图片 → 界面」里上传。</p>
    <h3>配色</h3><table class="form">${Object.entries(COLORS).map(([k, [n, d]]) => `<tr><th>${n}</th><td><input type="color" data-c="${k}" value="${c[k] || d}"> <button data-cr="${k}">恢复默认</button></td></tr>`).join('')}</table>
    <h3>字体</h3><table class="form"><tr><th>正文</th><td><input type="text" data-f="--f-hand" value="${esc(f['--f-hand'] || '')}" placeholder='"LXGW WenKai", serif'></td></tr><tr><th>标题</th><td><input type="text" data-f="--f-cute" value="${esc(f['--f-cute'] || '')}" placeholder='"ZCOOL KuaiLe", sans-serif'></td></tr></table>
    <h3>音乐（mp3，最大 6 MB）</h3><table class="form">${[['shop', '小店背景音乐'], ['home', '小屋背景音乐'], ['musicbox', '音乐盒']].map(([k, n]) => `<tr><th>${n}</th><td>${draft.audio[k] ? `<span class="tag">草稿</span> ${Math.round(draft.audio[k].size / 1024)} KB` : `<span class="mini">${esc(B.audio && B.audio[k] || '')}</span>`} <button data-au="${k}">上传</button> ${draft.audio[k] ? `<button class="danger" data-aud="${k}">撤销</button>` : ''}</td></tr>`).join('')}</table>`;
  main.querySelectorAll('[data-c]').forEach(el => el.onchange = () => { c[el.dataset.c] = el.value; dirty(); });
  main.querySelectorAll('[data-cr]').forEach(el => el.onclick = () => { delete c[el.dataset.cr]; dirty(); viewUI(); });
  main.querySelectorAll('[data-f]').forEach(el => el.onchange = () => { if (el.value) f[el.dataset.f] = el.value; else delete f[el.dataset.f]; dirty(); });
  main.querySelectorAll('[data-au]').forEach(el => el.onclick = async () => { const file = await pickFile('audio/mpeg,audio/mp3,audio/ogg,audio/wav'); if (!file) return; if (file.size > 6 * 1024 * 1024) return toast('音乐文件太大了（最大 6 MB）'); draft.audio[el.dataset.au] = file; dirty(); viewUI(); });
  main.querySelectorAll('[data-aud]').forEach(el => el.onclick = () => { delete draft.audio[el.dataset.aud]; dirty(); viewUI(); });
}

/* ---------------- export ---------------- */
function viewHelp() {
  main.innerHTML = `<h2>导出和上线</h2><div class="lead">
    <p>1. 在左边各个分类里换图、改字、改菜单。所有改动先存在<b>这台电脑的浏览器</b>里（草稿），右边的预览会显示草稿的效果。</p>
    <p>2. 满意了点右上角<b>导出主题包（zip）</b>。解压后把里面的东西<b>覆盖到 <code>${esc(ID)}/theme/</code></b>（images 文件夹是合并，不会删掉原来的图）。</p>
    <p>3. 推送网站后，线上就换好了。也可以把 zip 发给 Claude，让它帮你放进去并推送。</p>
    <p>4. 想换一个新 OC：复制整个 <code>${esc(ID)}/</code> 文件夹，改名，在工作站里把人物、文字、图片全换掉，存档名（theme.json 里的 save）也要改，免得和原来的存档混在一起。</p>
    <p class="mini">清空草稿 = 丢掉还没导出的改动，回到主题包里的样子。</p></div>`;
}
async function exportPack() {
  await save();
  const files = [], th = clone(B); for (const k of ['_base', '_images', '_draft', ...FILES]) delete th[k];
  Object.assign(th, { page: WT.page, ui: WT.ui, maxDishes: WT.maxDishes });
  // images: keep the repo's list (minus removed) + the new ones as images/<key>.webp
  const list = new Map([...baseImages()].filter(([k]) => !draft.removed.includes(k)));
  for (const [k, blob] of Object.entries(draft.images)) {
    if (k.startsWith('oc.')) { th.oc = { ...th.oc, [k.slice(3)]: `theme/images/${k}.webp` }; files.push({ name: `images/${k}.webp`, data: blob }); continue; }
    list.set(k, `images/${k}.webp`); files.push({ name: `images/${k}.webp`, data: blob });
  }
  th.images = [...list.values()].map(f => f.replace(/^images\//, ''));
  for (const [k, blob] of Object.entries(draft.audio)) { const ext = (blob.name || '').split('.').pop() || 'mp3'; th.audio = { ...th.audio, [k]: `theme/audio/${k}.${ext}` }; files.push({ name: `audio/${k}.${ext}`, data: blob }); }
  files.push({ name: 'theme.json', data: JSON.stringify(th, null, 2) + '\n' });
  for (const k of FILES) files.push({ name: B.files[k], data: JSON.stringify(W[k], null, 2) + '\n' });
  files.push({ name: '怎么用.txt', data: `把这个 zip 里的所有东西覆盖到网站的 ${ID}/theme/ 文件夹（images 文件夹合并）。\n删掉的图（改回手绘）：${draft.removed.join('、') || '无'}——这些文件可以从 theme/images/ 里删掉，不删也不影响。\n` });
  OCTools.download(await OCTools.zip(files), `${ID}-主题包.zip`);
  toast('主题包已导出。把里面的东西覆盖到 theme/ 文件夹就上线了。', 4200);
}

/* ---------------- nav ---------------- */
const main = $('#main');
const VIEWS = { images: ['素材图片', viewImages], menu: ['菜单与做法', viewMenu], kitchen: ['厨房设备', viewKitchen], furniture: ['家具', viewFurniture], decor: ['店里装饰', viewDecor], customers: ['客人', viewCustomers], text: ['文字', viewText], ui: ['界面与音乐', viewUI], help: ['导出和上线', viewHelp] };
let cur = 'images';
const nav = { go(k) { cur = k; $('#nav').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === k)); main.scrollTop = 0; VIEWS[k][1](); } };
$('#nav').innerHTML = Object.entries(VIEWS).map(([k, [n]]) => `<button data-v="${k}">${n}</button>`).join('');
$('#nav').querySelectorAll('button').forEach(b => b.onclick = () => nav.go(b.dataset.v));
$('#stName').textContent = `${T.name || ID} · 工作站`;
const days = [...new Set(W.dishes.map(d => d.day))].sort((a, b) => a - b);
$('#pvDay').insertAdjacentHTML('beforeend', days.map(d => `<option value="${d}">第 ${d} 天</option>`).join(''));
async function refreshPreview() { await save(); const d = $('#pvDay').value; $('#preview').src = `index.html?studio&debug${d ? '&day=' + d : ''}&r=${Date.now()}`; }
$('#btnPreview').onclick = refreshPreview; $('#pvDay').onchange = refreshPreview;
$('#btnExport').onclick = exportPack;
$('#btnReset').onclick = async () => { if (!confirm('清空草稿？还没导出的改动都会丢掉。')) return; await OCDraft.del(ID); location.reload(); };
save().then(() => { booted = true; }); nav.go('images'); refreshPreview();
})();
