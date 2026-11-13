/* ================= 零一 · Zero One — room.js =================
 * 03 观察室：把整间房（inline SVG + 小人 + 状态条）注入 #roomMount
 * 依赖 window.L01（core.js）。类名一律 .rm- 前缀，store 键：room.found / room.letter
 * ============================================================ */
(() => {
'use strict';

const L = window.L01;
const mount = document.getElementById('roomMount');
if (!L || !mount) return;

const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduced = !!L.reduced;

/* ---------- 配色（SVG 属性里不能用 CSS 变量，这里写死同一套色板） ---------- */
const INK = '#4a4f5c', SOFT = '#8d93a3', BLUE = '#6fb7f5', BL = '#cfe6fb', BD = '#3f8fe0',
      RED = '#d9475a', NAVY = '#0f1a33', WHITE = '#fff';

/* ---------- 物件：id / 名称 / 小人站位(%) / 提示点坐标 / 台词 ---------- */
const ITEMS = [
  { id: 'window',     name: '窗',         x: 42, tag: [494, 92],  lines: ['云今天也没有什么事。', '和我一样。'] },
  { id: 'monitor',    name: '监护仪',     x: 22, tag: [206, 124], lines: ['是我的。', '一直是 60。'] },
  { id: 'bed',        name: '床',         x: 34, tag: [566, 334], lines: ['……五分钟。'] },
  { id: 'halo',       name: '光环挂钩',   x: 27, tag: [300, 100], lines: ['睡觉的时候挂在这里。', '不然会硌。'] },
  { id: 'notes',      name: '桌上的记录纸', x: 76, tag: [790, 236], lines: [] },
  { id: 'milk',       name: '牛奶杯',     x: 82, tag: [854, 256], lines: ['温的。', '……谢谢。'] },
  { id: 'lamp',       name: '台灯',       x: 89, tag: [946, 198], lines: ['暗一点比较好。'] },
  { id: 'headphones', name: '耳机',       x: 70, tag: [752, 116], lines: ['白噪音。', '比说话舒服。'] },
  { id: 'plant',      name: '盆栽',       x: 62, tag: [620, 228], lines: ['它也不太说话。'] },
  { id: 'sticky',     name: '便利贴',     x: 85, tag: [886, 126], lines: ['还剩一点。', '省着用。'] },
];
const ITEM = {};
ITEMS.forEach(it => { ITEM[it.id] = it; });
const TOTAL = ITEMS.length;

const DIARY = [
  '第 1 天。醒来的时候头上有一圈线。量了一下，是心电图。是我的。',
  '第 9 天。今天也没有人来。记录：平稳。',
  '第 23 天。给裤子贴了蓝色胶带。贴歪了。没有重贴。记录：平稳。',
  '今天。有人来了。看了我很久。心率：<b class="rm-red">61</b>。……记录：基本平稳。',
];
const LETTER = ['给今天来的人：', '你把这里的东西都碰了一遍。', '我数了，一共十样。', '……没有不高兴。', '记录：平稳，偏暖。'];

/* ---------- 监护仪屏幕波形（用 L01.ecg 生成；屏幕内宽 130，两拍一屏，平移 130 循环） ---------- */
const SCR = { x: 54, y: 162, w: 130, h: 82 };
function ecgPath() {
  const per = 65, base = 228, amp = 36, len = 262;
  let d = '';
  for (let i = 0; i <= len * 2; i++) {
    const x = i / 2;
    const y = base - L.ecg(((x + 18) / per) % 1) * amp;
    d += (i ? 'L' : 'M') + (SCR.x + x).toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}
function cloudPath() {          // 画成一排小云朵的"波形"
  const b = 226;
  let d = 'M' + SCR.x + ' ' + b;
  for (let k = 0; k < 5; k++) {
    const s = SCR.x + k * 65;
    d += ` L${s + 12} ${b} a6 9 0 0 1 12 0 a10 16 0 0 1 20 0 a7 10 0 0 1 14 0 L${s + 65} ${b}`;
  }
  return d;
}

/* ---------- 房间 SVG ---------- */
function tagSvg(it) {
  return `<g class="rm-tag" data-for="${it.id}" transform="translate(${it.tag[0]} ${it.tag[1]})" aria-hidden="true">
    <g class="rm-tag-in"><circle class="rm-tag-halo" r="13" fill="${BLUE}" fill-opacity=".3" stroke="none"/>
    <circle r="8" fill="${WHITE}" stroke="${BD}" stroke-width="2.6"/><circle r="2.8" fill="${BD}" stroke="none"/></g></g>`;
}
function itemAttrs(id) {
  const it = ITEM[id];
  return `class="rm-item" data-id="${id}" data-x="${it.x}" tabindex="0" role="button" aria-label="${it.name}"`;
}

function roomSvg() {
  return `
<svg class="rm-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" role="group" aria-label="零一的观察室">
<defs>
  <pattern id="rm-gridp" width="24" height="24" patternUnits="userSpaceOnUse">
    <path d="M24 0H0V24" fill="none" stroke="${BLUE}" stroke-opacity=".17" stroke-width="1"/>
  </pattern>
  <linearGradient id="rm-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d4eafd"/><stop offset="1" stop-color="#f4faff"/>
  </linearGradient>
  <linearGradient id="rm-conegrad" x1=".8" y1="0" x2=".3" y2="1">
    <stop offset="0" stop-color="#d9ecfd" stop-opacity=".95"/><stop offset="1" stop-color="#d9ecfd" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="rm-glass"><rect x="334" y="80" width="172" height="184" rx="16"/></clipPath>
  <clipPath id="rm-scr"><rect x="${SCR.x}" y="${SCR.y}" width="${SCR.w}" height="${SCR.h}" rx="8"/></clipPath>
  <filter id="rm-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>

<g class="rm-scene" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">

  <!-- ===== 墙 ===== -->
  <rect x="-10" y="-10" width="1020" height="482" fill="#f6faff" stroke="none"/>
  <rect x="-10" y="-10" width="1020" height="482" fill="url(#rm-gridp)" stroke="none"/>
  <!-- 台灯照在墙上的光 -->
  <path class="rm-cone" d="M888 224 L742 318 L906 318 L912 248 Z" fill="url(#rm-conegrad)" stroke="none"/>

  <!-- ===== 地板 ===== -->
  <rect x="-10" y="468" width="1020" height="142" fill="#e7eef6" stroke="none"/>
  <g stroke="#c4d0de" stroke-width="2">
    <path d="M-10 508 H1010 M-10 550 H1010 M-10 592 H1010"/>
    <path d="M150 470 V508 M430 470 V508 M700 470 V508 M940 470 V508 M70 508 V550 M310 508 V550 M570 508 V550 M830 508 V550 M200 550 V592 M480 550 V592 M760 550 V592"/>
  </g>
  <g stroke="#d2dbe7" stroke-width="1.6">
    <path d="M36 489 q30 -6 60 0 t60 0 M512 488 q24 -5 48 0 M752 490 q22 -5 44 0 M236 530 q26 -6 52 0 t52 0 M636 530 q30 -6 60 0 M876 528 q20 -5 40 0 M86 572 q28 -6 56 0 M556 572 q30 -6 60 0 t60 0 M326 573 q20 -4 40 0 M880 574 q18 -4 36 0"/>
    <path d="M118 495 q8 -3 14 0 M600 538 q8 -3 14 0 M392 534 q6 -3 12 0"/>
  </g>
  <!-- 踢脚线 -->
  <path d="M-10 452 H1010 V470 H-10 Z" fill="${WHITE}" stroke-width="3"/>
  <!-- 地毯 -->
  <ellipse cx="452" cy="572" rx="190" ry="19" fill="#dcebf9" stroke="${SOFT}" stroke-width="2" stroke-dasharray="1 8"/>
  <!-- 插座 -->
  <rect x="598" y="412" width="18" height="26" rx="4" fill="${WHITE}" stroke-width="2.4"/>
  <path d="M604 421 v6 M610 421 v6" stroke-width="2"/>

  <!-- ===== 1 窗 ===== -->
  <g ${itemAttrs('window')}>
    <path d="M300 50 H574" stroke-width="3"/>
    <circle cx="296" cy="50" r="5" fill="${WHITE}" stroke-width="2.4"/>
    <circle cx="578" cy="50" r="5" fill="${WHITE}" stroke-width="2.4"/>
    <rect x="320" y="66" width="200" height="212" rx="26" fill="${WHITE}" stroke-width="3.5"/>
    <rect x="334" y="80" width="172" height="184" rx="16" fill="url(#rm-sky)" stroke-width="2.4"/>
    <g clip-path="url(#rm-glass)">
      <g class="rm-cloud rm-cloud-a">
        <path d="M250 140 c-10 0 -10 -14 2 -14 c0 -12 18 -14 22 -4 c6 -8 22 -6 22 6 c10 0 12 12 2 12 z" fill="${WHITE}" stroke="${SOFT}" stroke-width="2.4"/>
      </g>
      <g class="rm-cloud rm-cloud-b">
        <path d="M262 222 c-8 0 -8 -11 2 -11 c1 -9 14 -10 17 -2 c5 -6 17 -4 17 5 c8 0 9 9 1 9 z" fill="${WHITE}" stroke="${SOFT}" stroke-width="2.2"/>
      </g>
      <path d="M346 108 l16 -16 M348 126 l32 -32" stroke="${WHITE}" stroke-width="3.4"/>
      <path d="M440 250 l18 -18" stroke="${WHITE}" stroke-width="3"/>
    </g>
    <path d="M420 80 V264 M334 172 H506" stroke-width="3"/>
    <rect x="306" y="272" width="228" height="14" rx="6" fill="${WHITE}" stroke-width="3"/>
    <!-- 窗帘（右侧收起） -->
    <path d="M514 50 C508 110 524 150 512 200 C504 240 520 280 512 314 L562 314 C568 270 554 230 562 190 C570 140 556 96 568 50 Z" fill="#eaf4fe" stroke-width="3"/>
    <path d="M530 62 C526 130 540 200 528 300 M549 62 C546 140 557 220 546 304" stroke="${SOFT}" stroke-width="1.8"/>
    <path d="M511 216 q26 9 52 -2" stroke="${BD}" stroke-width="3"/>
  </g>

  <!-- ===== 2 监护仪（机身；屏幕在夜间层之上） ===== -->
  <g ${itemAttrs('monitor')}>
    <path d="M190 238 C232 252 214 330 236 384" stroke="${SOFT}" stroke-width="2.4"/>
    <rect x="112" y="276" width="12" height="246" rx="5" fill="${WHITE}" stroke-width="3"/>
    <rect x="104" y="382" width="28" height="14" rx="5" fill="${WHITE}" stroke-width="2.6"/>
    <path d="M124 428 h16 v12" stroke-width="2.4"/>
    <rect x="58" y="518" width="120" height="12" rx="6" fill="${WHITE}" stroke-width="3"/>
    <circle cx="70" cy="541" r="9" fill="${WHITE}" stroke-width="3"/>
    <circle cx="166" cy="541" r="9" fill="${WHITE}" stroke-width="3"/>
    <circle cx="118" cy="543" r="7" fill="${WHITE}" stroke-width="2.6"/>
    <rect x="102" y="266" width="32" height="14" rx="4" fill="${WHITE}" stroke-width="3"/>
    <path d="M88 150 V138 Q88 132 94 132 H144 Q150 132 150 138 V150" stroke-width="3"/>
    <rect x="40" y="148" width="158" height="122" rx="16" fill="${WHITE}" stroke-width="3.5"/>
    <rect x="${SCR.x}" y="${SCR.y}" width="${SCR.w}" height="${SCR.h}" rx="8" fill="${NAVY}" stroke-width="2.4"/>
    <circle cx="62" cy="257" r="4" fill="${BL}" stroke-width="2"/>
    <circle cx="76" cy="257" r="4" fill="${BLUE}" stroke-width="2"/>
    <circle cx="92" cy="257" r="2.6" fill="${RED}" stroke="none"/>
    <path d="M130 254 H180 M130 260 H170" stroke="${SOFT}" stroke-width="2"/>
  </g>

  <!-- ===== 3 床 ===== -->
  <g ${itemAttrs('bed')}>
    <path d="M216 536 V318 Q216 300 234 300 H256 Q274 300 274 318 V536" fill="${WHITE}" stroke-width="3.5"/>
    <path d="M216 344 H274" stroke-width="2.4"/>
    <rect x="228" y="312" width="34" height="22" rx="4" fill="#eaf4fe" stroke-width="2.2"/>
    <text x="245" y="328" text-anchor="middle" font-size="13" class="rm-t-mono" fill="${BD}" stroke="none">01</text>
    <rect x="250" y="428" width="304" height="14" rx="5" fill="#eef4fb" stroke-width="2.6"/>
    <rect x="238" y="398" width="322" height="32" rx="9" fill="${WHITE}" stroke-width="3.2"/>
    <!-- 枕头 -->
    <path d="M252 398 Q244 368 270 362 Q300 356 324 366 Q338 374 330 398 Q290 404 252 398 Z" fill="${WHITE}" stroke-width="3"/>
    <path d="M262 380 q4 -5 11 -5 M316 388 q4 2 6 6" stroke="${SOFT}" stroke-width="1.8"/>
    <!-- 被子 -->
    <path d="M300 392 Q306 378 326 378 L540 380 Q556 380 556 394 L556 438 Q556 448 546 448 L318 448 Q302 448 300 434 Z" fill="${BL}" stroke-width="3.2"/>
    <path d="M300 392 Q306 378 326 378 L346 378 Q336 410 346 448 L318 448 Q302 448 300 434 Z" fill="${WHITE}" stroke-width="2.6"/>
    <path d="M384 384 q-8 26 4 60 M458 382 q10 30 -2 64 M516 384 q-6 24 6 60" stroke="${INK}" stroke-opacity=".55" stroke-width="2"/>
    <path d="M420 418 h12 l4 -9 l5 17 l4 -12 l3 4 h12" stroke="${BD}" stroke-width="2.2"/>
    <path d="M352 440 H546" stroke="${BD}" stroke-width="1.6" stroke-dasharray="4 7"/>
    <!-- 床尾 -->
    <path d="M546 536 V364 Q546 350 560 350 H568 Q582 350 582 364 V536" fill="${WHITE}" stroke-width="3.5"/>
    <path d="M546 382 H582" stroke-width="2.2"/>
    <circle cx="245" cy="544" r="8" fill="${WHITE}" stroke-width="3"/>
    <circle cx="564" cy="544" r="8" fill="${WHITE}" stroke-width="3"/>
  </g>
  <!-- 被子里睡着的零一（躺下 / 充电时出现） -->
  <g class="rm-sleeper" aria-hidden="true">
    <circle cx="290" cy="379" r="17" fill="${WHITE}" stroke-width="2.6"/>
    <path d="M272 384 Q264 356 290 353 Q316 354 310 382 Q304 369 295 367 Q285 375 276 372 Z" fill="#a9d3f7" stroke-width="2.6"/>
    <path d="M281 386 q3 3 6 0 M294 386 q3 3 6 0" stroke-width="2"/>
    <path d="M272 358 L260 350 L261 367 Z M272 358 L283 349 L283 366 Z" fill="${BL}" stroke-width="2"/>
    <path d="M304 400 Q326 366 400 370 Q480 374 556 388 L556 404 L304 404 Z" fill="${BL}" stroke="none"/>
    <path d="M304 400 Q326 366 400 370 Q480 374 556 388" stroke-width="3"/>
    <path d="M360 376 q12 6 30 4 M450 378 q10 8 26 8" stroke="${INK}" stroke-opacity=".5" stroke-width="2"/>
    <text class="rm-z" x="316" y="342" stroke="none">Z</text>
    <text class="rm-z rm-z2" x="336" y="326" stroke="none">z</text>
  </g>

  <!-- ===== 书桌（装饰） ===== -->
  <g class="rm-desk">
    <rect x="676" y="496" width="76" height="44" rx="4" fill="${WHITE}" stroke-width="2.8"/>
    <path d="M676 508 H752" stroke-width="2"/>
    <path d="M684 526 h10 l3 -7 l4 12 l3 -8 l2 3 h10" stroke="${BLUE}" stroke-width="1.8"/>
    <text x="736" y="530" text-anchor="middle" font-size="10" class="rm-t-mono" fill="${SOFT}" stroke="none">ECG</text>
    <rect x="620" y="318" width="320" height="16" rx="6" fill="${WHITE}" stroke-width="3.4"/>
    <rect x="634" y="334" width="14" height="204" rx="4" fill="${WHITE}" stroke-width="3"/>
    <rect x="828" y="334" width="98" height="204" rx="6" fill="${WHITE}" stroke-width="3.2"/>
    <rect x="840" y="348" width="74" height="52" rx="5" fill="#f6faff" stroke-width="2.4"/>
    <rect x="840" y="410" width="74" height="52" rx="5" fill="#f6faff" stroke-width="2.4"/>
    <rect x="840" y="472" width="74" height="52" rx="5" fill="#f6faff" stroke-width="2.4"/>
    <path d="M866 374 h22 M866 436 h22 M866 498 h22" stroke="${BLUE}" stroke-width="3.4"/>
  </g>

  <!-- ===== 9 盆栽 ===== -->
  <g ${itemAttrs('plant')}>
    <g class="rm-foliage">
      <path d="M672 284 Q668 270 674 256" stroke-width="2.6"/>
      <path d="M671 272 q-10 -7 -15 -2 q6 8 15 2" fill="${BL}" stroke-width="2"/>
      <path d="M646 258 C632 258 632 238 648 238 C648 222 668 218 674 230 C680 216 702 218 702 234 C716 234 716 256 702 258 Z" fill="#eef7ff" stroke-width="3"/>
      <path d="M654 249 q4 -4 8 0 M684 244 q4 -4 8 0 M670 236 q3 -3 6 0" stroke="${BLUE}" stroke-width="2"/>
    </g>
    <path d="M650 290 H694 L689 318 H655 Z" fill="${WHITE}" stroke-width="3"/>
    <rect x="646" y="282" width="52" height="10" rx="4" fill="${WHITE}" stroke-width="3"/>
    <path d="M657 304 h30" stroke="${BLUE}" stroke-width="3"/>
  </g>

  <!-- ===== 5 记录纸（夹板） ===== -->
  <g ${itemAttrs('notes')}>
    <g transform="rotate(-6 754 286)">
      <rect x="728" y="254" width="52" height="64" rx="5" fill="#e4ebf4" stroke-width="3"/>
      <rect x="734" y="264" width="40" height="48" rx="2" fill="${WHITE}" stroke-width="2"/>
      <path d="M738 282 h8 l3 -7 l4 13 l3 -9 l2 3 h12" stroke="${BD}" stroke-width="1.8"/>
      <path d="M738 294 h28 M738 302 h20" stroke="${SOFT}" stroke-width="1.6"/>
      <rect x="745" y="249" width="18" height="9" rx="3" fill="${BLUE}" stroke-width="2.2"/>
    </g>
    <path d="M712 314 L748 310" stroke="${SOFT}" stroke-width="4.5"/>
    <path d="M748 310 l8 -1" stroke-width="2.4"/>
  </g>

  <!-- ===== 6 牛奶杯 ===== -->
  <g ${itemAttrs('milk')}>
    <g class="rm-steam">
      <path d="M814 274 q-6 -8 0 -15 q6 -7 0 -14" stroke="${SOFT}" stroke-width="2"/>
      <path d="M827 276 q-6 -8 0 -14 q6 -7 0 -13" stroke="${SOFT}" stroke-width="2"/>
    </g>
    <path d="M838 290 q12 0 12 9 q0 9 -12 9" stroke-width="3"/>
    <path d="M804 284 H838 V306 Q838 318 826 318 H816 Q804 318 804 306 Z" fill="${WHITE}" stroke-width="3"/>
    <ellipse cx="821" cy="285" rx="15" ry="3.4" fill="#fdfeff" stroke-width="1.8"/>
    <path d="M806 300 H836" stroke="${BLUE}" stroke-width="3"/>
  </g>

  <!-- ===== 7 台灯 ===== -->
  <g ${itemAttrs('lamp')}>
    <path d="M902 310 L884 262 L922 214" stroke-width="3.6"/>
    <circle cx="884" cy="262" r="4.5" fill="${WHITE}" stroke-width="2.4"/>
    <path d="M880 318 Q880 306 902 306 Q924 306 924 318 Z" fill="${WHITE}" stroke-width="3"/>
    <circle class="rm-bulbglow" cx="896" cy="242" r="15" fill="#e6f3ff" stroke="none"/>
    <circle class="rm-bulb" cx="896" cy="242" r="6" fill="${WHITE}" stroke-width="2"/>
    <path d="M888 224 L916 204 Q930 204 932 218 L912 248 Z" fill="${BL}" stroke-width="3"/>
  </g>

  <!-- ===== 8 耳机 ===== -->
  <g ${itemAttrs('headphones')}>
    <g class="rm-notes" stroke="${BD}" stroke-width="2.2">
      <g class="rm-note rm-n1">
        <path d="M636 168 V150 L648 146 V164"/>
        <ellipse cx="632" cy="168" rx="4.5" ry="3.5" fill="${BD}"/>
        <ellipse cx="644" cy="164" rx="4.5" ry="3.5" fill="${BD}"/>
      </g>
      <g class="rm-note rm-n2">
        <path d="M618 142 V124 q6 2 8 8"/>
        <ellipse cx="614" cy="142" rx="4.5" ry="3.5" fill="${BD}"/>
      </g>
    </g>
    <rect x="694" y="104" width="12" height="8" rx="2" fill="${WHITE}" stroke-width="2.2"/>
    <path d="M700 112 V120" stroke-width="2.6"/>
    <path d="M664 186 Q662 122 700 120 Q738 122 736 186" stroke-width="4"/>
    <path d="M671 182 Q670 132 700 130 Q730 132 729 182" stroke="${BLUE}" stroke-width="2"/>
    <rect x="652" y="168" width="22" height="40" rx="10" fill="${BL}" stroke-width="3"/>
    <rect x="726" y="168" width="22" height="40" rx="10" fill="${BL}" stroke-width="3"/>
    <rect x="671" y="174" width="7" height="28" rx="3.5" fill="${WHITE}" stroke-width="2"/>
    <rect x="722" y="174" width="7" height="28" rx="3.5" fill="${WHITE}" stroke-width="2"/>
  </g>

  <!-- ===== 10 便利贴 ===== -->
  <g ${itemAttrs('sticky')}>
    <g transform="rotate(-5 890 167)">
      <rect x="872" y="150" width="36" height="34" rx="2" fill="${WHITE}" stroke-width="2.2"/>
      <path d="M876 170 h6 l2 -6 l3 10 l2 -6 h11" stroke="${BD}" stroke-width="1.6"/>
    </g>
    <g transform="rotate(4 837 159)">
      <rect x="806" y="128" width="62" height="62" rx="2" fill="#e3f1ff" stroke-width="2.6"/>
      <rect x="823" y="121" width="28" height="11" rx="2" fill="${WHITE}" fill-opacity=".85" stroke="${SOFT}" stroke-width="1.4"/>
      <text x="837" y="152" text-anchor="middle" font-size="13" class="rm-t-cn" fill="${INK}" stroke="none">今日</text>
      <text x="837" y="169" text-anchor="middle" font-size="12.5" class="rm-t-cn" fill="${INK}" stroke="none">说话配额</text>
      <rect x="818" y="175" width="32" height="8" rx="2" stroke-width="1.6"/>
      <path d="M852 177.5 v3" stroke-width="2"/>
      <rect x="820" y="177" width="5" height="4" fill="${BLUE}" stroke="none"/>
    </g>
  </g>

  <!-- ===== 夜间遮罩（关灯） ===== -->
  <rect class="rm-night" x="-10" y="-10" width="1020" height="620" fill="${NAVY}" stroke="none"/>

  <!-- ===== 夜间层之上：会发光的东西 ===== -->
  <g class="rm-stars" clip-path="url(#rm-glass)" stroke="${BL}" stroke-width="2">
    <path d="M372 110 v9 M367.5 114.5 h9 M452 98 v7 M448.5 101.5 h7 M480 214 v8 M476 218 h8 M360 222 v6 M357 225 h6 M396 150 v5 M393.5 152.5 h5"/>
    <path d="M478 112 a17 17 0 1 0 14 26 a13 13 0 1 1 -14 -26 z" fill="#f4f9ff" stroke="none"/>
  </g>
  <rect class="rm-glow" x="48" y="156" width="142" height="94" rx="12" fill="${BLUE}" filter="url(#rm-blur)" stroke="none"/>
  <g class="rm-part rm-screen" data-for="monitor">
    <rect x="${SCR.x}" y="${SCR.y}" width="${SCR.w}" height="${SCR.h}" rx="8" fill="${NAVY}" stroke-width="2.4"/>
    <g clip-path="url(#rm-scr)">
      <path d="M54 182 H184 M54 202 H184 M54 222 H184 M80 162 V244 M106 162 V244 M132 162 V244 M158 162 V244" stroke="${BLUE}" stroke-opacity=".14" stroke-width="1"/>
      <g class="rm-ch on" data-ch="0">
        <path class="rm-wave" d="${ecgPath()}" stroke="${BLUE}" stroke-opacity=".3" stroke-width="6"/>
        <path class="rm-wave" d="${ecgPath()}" stroke="${BLUE}" stroke-width="2.2"/>
      </g>
      <g class="rm-ch" data-ch="1">
        <path class="rm-wave" d="${cloudPath()}" stroke="${BLUE}" stroke-opacity=".3" stroke-width="6"/>
        <path class="rm-wave" d="${cloudPath()}" stroke="${BLUE}" stroke-width="2.2"/>
      </g>
      <g class="rm-ch" data-ch="2">
        <text class="rm-zz rm-t-mono" x="119" y="215" text-anchor="middle" font-size="24" fill="${BLUE}" stroke="none">Zz…</text>
      </g>
    </g>
    <text x="61" y="179" font-size="14" class="rm-t-mono" fill="${BL}" stroke="none">60</text>
    <use class="rm-scr-heart" href="#i-heart" x="163" y="168" width="14" height="13"/>
  </g>
  <!-- ===== 4 光环挂钩 ===== -->
  <ellipse class="rm-glow" cx="255" cy="132" rx="36" ry="13" transform="rotate(-12 255 132)" stroke="${RED}" stroke-width="9" filter="url(#rm-blur)"/>
  <g ${itemAttrs('halo')}>
    <rect x="246" y="92" width="18" height="10" rx="3" fill="${WHITE}" stroke-width="2.4"/>
    <path d="M255 102 V113 Q255 120 261 118" stroke-width="2.8"/>
    <g transform="rotate(-12 255 132)">
      <ellipse cx="255" cy="132" rx="36" ry="13" stroke="${RED}" stroke-width="3"/>
      <path d="M221 131 C222 120 250 116 272 119 C290 122 294 134 284 141" stroke="${RED}" stroke-opacity=".6" stroke-width="1.6"/>
      <path d="M228 133 H238 L243 125 L248 140 L253 122 L258 136 L262 131 H280" stroke="${RED}" stroke-width="2.2"/>
    </g>
  </g>

  <!-- ===== 提示点 ===== -->
  <g class="rm-tags">${ITEMS.map(tagSvg).join('')}</g>
</g>
</svg>`;
}

/* ---------- 注入 DOM ---------- */
mount.innerHTML = `
<div class="rm">
  <div class="rm-bar">
    <div class="rm-batt-wrap">
      <span class="rm-label">社交电量</span>
      <span class="rm-batt" role="meter" aria-label="社交电量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"><i class="rm-batt-fill"></i></span>
      <b class="rm-batt-num">60%</b>
      <span class="rm-delta" aria-hidden="true"></span>
    </div>
    <div class="rm-found">
      <span class="rm-dots" aria-hidden="true">${ITEMS.map(() => '<i class="rm-dot"></i>').join('')}</span>
      <span class="rm-found-t">已发现 <b class="rm-found-n">0</b>/${TOTAL}</span>
    </div>
  </div>
  <div class="rm-frame">
    <div class="rm-room">
      ${roomSvg()}
      <div class="rm-char">
        <div class="rm-bubble" role="status" aria-live="polite"></div>
        <div class="rm-flip"><img src="assets/chibi.webp" alt="零一" draggable="false"></div>
        <span class="rm-shadow"></span>
      </div>
      <div class="rm-chg" aria-hidden="true">充电中…</div>
    </div>
  </div>
</div>`;

const root = mount.querySelector('.rm');
const roomEl = root.querySelector('.rm-room');
const svg = root.querySelector('.rm-svg');
const charEl = root.querySelector('.rm-char');
const bubble = root.querySelector('.rm-bubble');
const battEl = root.querySelector('.rm-batt');
const battFill = root.querySelector('.rm-batt-fill');
const battNum = root.querySelector('.rm-batt-num');
const deltaEl = root.querySelector('.rm-delta');
const foundN = root.querySelector('.rm-found-n');
const dots = Array.from(root.querySelectorAll('.rm-dot'));

/* 同一个 id 的所有图形（物件本体 + 屏幕等部件 + 提示点） */
const partsOf = id => Array.from(svg.querySelectorAll(`[data-id="${id}"], .rm-part[data-for="${id}"]`));

/* ---------- 状态 ---------- */
const found = new Set((L.store.get('room.found', []) || []).filter(id => ITEM[id]));
let pos = 56, busy = false, charging = false, battery = 60, shown = 60, channel = 0;
const lineIdx = {};
let bubbleT = 0, battRaf = 0;

charEl.style.left = pos + '%';

/* ---------- 发现进度 ---------- */
function renderFound(popId) {
  const n = found.size;
  foundN.textContent = n;
  dots.forEach((d, i) => d.classList.toggle('on', i < n));
  if (popId && dots[n - 1]) {
    const d = dots[n - 1];
    d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
  }
  svg.querySelectorAll('.rm-tag').forEach(t => t.classList.toggle('gone', found.has(t.dataset.for)));
}

/* ---------- 社交电量 ---------- */
function paintBattery(v) {
  const r = Math.round(v);
  battNum.textContent = r + '%';
  battFill.style.width = clamp(v, 0, 100) + '%';
  battEl.classList.toggle('low', v <= 20);
}
function setBattery(v, dur = 650) {
  const from = shown, to = clamp(Math.round(v), 0, 100);
  const diff = to - battery;
  battery = to;
  battEl.setAttribute('aria-valuenow', String(to));
  if (diff) {
    deltaEl.textContent = (diff > 0 ? '+' : '−') + Math.abs(diff);
    deltaEl.classList.toggle('up', diff > 0);
    deltaEl.classList.remove('go'); void deltaEl.offsetWidth; deltaEl.classList.add('go');
  }
  cancelAnimationFrame(battRaf);
  if (reduced) { shown = to; paintBattery(to); return; }
  const t0 = performance.now();
  const step = now => {
    const k = clamp((now - t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - k, 3);
    shown = from + (to - from) * e;
    paintBattery(shown);
    if (k < 1) battRaf = requestAnimationFrame(step);
  };
  battRaf = requestAnimationFrame(step);
}
const addBattery = d => setBattery(battery + d);

/* ---------- 气泡 ---------- */
function say(text, ms) {
  ms = ms || clamp(1300 + text.length * 110, 1700, 2900);
  bubble.style.setProperty('--rm-shift', '0px');
  bubble.textContent = text;
  bubble.classList.add('show');
  // 靠近房间左右边缘时把气泡往里推，尾巴仍指向小人
  const rr = roomEl.getBoundingClientRect(), br = bubble.getBoundingClientRect();
  let shift = 0;
  if (br.left < rr.left + 8) shift = rr.left + 8 - br.left;
  else if (br.right > rr.right - 8) shift = rr.right - 8 - br.right;
  bubble.style.setProperty('--rm-shift', shift.toFixed(1) + 'px');
  clearTimeout(bubbleT);
  bubbleT = setTimeout(hideBubble, ms);
  return wait(ms);
}
function hideBubble() { clearTimeout(bubbleT); bubble.classList.remove('show'); }
function nextLine(id) {
  const arr = ITEM[id].lines;
  if (!arr.length) return '';
  lineIdx[id] = ((lineIdx[id] === undefined ? -1 : lineIdx[id]) + 1) % arr.length;
  return arr[lineIdx[id]];
}

/* ---------- 走路 ---------- */
function walkTo(x) {
  x = clamp(x, 8, 92);
  return new Promise(res => {
    if (Math.abs(x - pos) < 1.5) return res();
    hideBubble();
    charEl.classList.toggle('rm-right', x > pos);   // 原图朝左，往右走才翻转
    const dur = reduced ? 320 : Math.round(clamp(600 + Math.abs(x - pos) * 9, 750, 1200));
    charEl.style.transitionDuration = dur + 'ms';
    charEl.classList.add('rm-walk');
    charEl.style.left = x + '%';
    pos = x;
    setTimeout(() => { charEl.classList.remove('rm-walk'); res(); }, dur + 40);
  });
}

/* ---------- 躺下 / 充电 ---------- */
async function nap(ms, line) {
  hideBubble();
  roomEl.classList.add('rm-napping');
  await wait(450);
  if (line) say(line, ms - 300);
  await wait(ms - 300);
  hideBubble();
  roomEl.classList.remove('rm-napping');
  await wait(450);
}
async function drained() {
  await say('……没电了。', 1600);
  await walkTo(ITEM.bed.x);
  charging = true;
  roomEl.classList.add('rm-charging');
  root.classList.add('rm-charging');
  setTimeout(() => setBattery(50, 3400), 400);
  await nap(4000, '');
  charging = false;
  roomEl.classList.remove('rm-charging');
  root.classList.remove('rm-charging');
}

/* ---------- 小动作 ---------- */
function replay(el, cls) { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); }
function wiggle(id) {
  partsOf(id).forEach(el => {
    replay(el, 'rm-wig');
    setTimeout(() => el.classList.remove('rm-wig'), 600);
  });
}
function setChannel(n) {
  channel = n % 3;
  svg.querySelectorAll('.rm-ch').forEach(g => g.classList.toggle('on', +g.dataset.ch === channel));
}
function featherFromWindow() {
  if (typeof L.feathers !== 'function') return;
  const r = svg.querySelector('[data-id="window"]').getBoundingClientRect();
  L.feathers(r.left + r.width * 0.5, r.top + r.height * 0.35, 3);
}

/* ---------- 弹窗：日记 / 信 ---------- */
let diaryBody = null, diaryPage = 0;
function renderDiary(dir) {
  if (!diaryBody) return;
  const page = diaryBody.querySelector('.rm-diary-page');
  page.querySelector('.rm-diary-no').textContent = 'P.' + (diaryPage + 1);
  page.querySelector('.rm-diary-text').innerHTML = DIARY[diaryPage];
  diaryBody.querySelector('.rm-diary-idx').textContent = (diaryPage + 1) + ' / ' + DIARY.length;
  diaryBody.querySelector('[data-d="-1"]').disabled = diaryPage === 0;
  diaryBody.querySelector('[data-d="1"]').disabled = diaryPage === DIARY.length - 1;
  if (dir) { page.classList.toggle('back', dir < 0); replay(page, 'turn'); }
}
function flipDiary(d) {
  const n = clamp(diaryPage + d, 0, DIARY.length - 1);
  if (n === diaryPage) return;
  diaryPage = n;
  L.sfx.tick();
  renderDiary(d);
}
function openDiary() {
  diaryPage = 0;
  const body = L.modal.open(`
    <div class="rm-diary">
      <p class="rm-diary-k">observation diary</p>
      <h3 class="rm-diary-h">观察日记</h3>
      <div class="rm-diary-page"><span class="rm-diary-no"></span><p class="rm-diary-text"></p></div>
      <div class="rm-diary-nav">
        <button type="button" class="btn-hand rm-dbtn" data-d="-1">‹ 上一页</button>
        <span class="rm-diary-idx"></span>
        <button type="button" class="btn-hand rm-dbtn" data-d="1">下一页 ›</button>
      </div>
    </div>`);
  diaryBody = (body && body.querySelector) ? body : document.getElementById('modalBody');
  if (!diaryBody || !diaryBody.querySelector('.rm-diary')) { diaryBody = null; return; }
  diaryBody.querySelectorAll('.rm-dbtn').forEach(b => b.addEventListener('click', () => flipDiary(+b.dataset.d)));
  renderDiary(0);
}
document.addEventListener('keydown', e => {
  if (!diaryBody || !L.modal.isOpen || !diaryBody.querySelector('.rm-diary')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); flipDiary(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); flipDiary(-1); }
});

function openLetter() {
  L.modal.open(`
    <div class="rm-letter">
      <p class="rm-letter-k">a letter · from bed No.01</p>
      ${LETTER.map((t, i) => `<p class="rm-letter-l${i === LETTER.length - 1 ? ' rm-letter-hl' : ''}" style="--i:${i}">${t}</p>`).join('')}
      <p class="rm-letter-sign" style="--i:${LETTER.length}">—— 01</p>
      <svg class="rm-letter-ecg" viewBox="0 0 300 40" aria-hidden="true">
        <path d="M2 26 H60 L66 20 L72 26 H96 L102 6 L108 34 L113 26 H160 L166 20 L172 26 H198 L204 8 L210 34 L215 26 H252" fill="none" stroke="${BLUE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        <use href="#i-heart" x="254" y="13" width="22" height="20"/>
      </svg>
    </div>`);
  L.sfx.chime();
}
function whenModalClosed(fn) {
  if (!L.modal.isOpen) return fn();
  let done = false, off = null;
  off = L.on('modal', open => {
    if (open || done) return;
    done = true;
    if (typeof off === 'function') off();
    setTimeout(fn, 700);
  });
}
function checkLetter() {
  if (found.size < TOTAL || L.store.get('room.letter', false)) return;
  L.store.set('room.letter', true);
  setTimeout(() => whenModalClosed(openLetter), 1100);
}

/* ---------- 各物件的行为 ---------- */
// 返回 { d: 电量变化, line: 覆盖台词, silent: 不说话, said: 已经说过 }
const ACT = {
  window() { featherFromWindow(); return { d: -8 }; },
  monitor() { setChannel(channel + 1); L.sfx.beep(880, 0.08); return { d: -8 }; },
  async bed() {
    L.bump(1);
    addBattery(40);
    await nap(3000, nextLine('bed'));
    return { d: 0, said: true };
  },
  halo() { return { d: -8 }; },
  notes() { setTimeout(openDiary, 180); return { d: -8, silent: true }; },
  milk() { L.bump(1); return { d: 15 }; },
  lamp() {
    const dark = roomEl.classList.toggle('rm-dark');
    return { d: -8, line: dark ? nextLine('lamp') : '……嗯。' };
  },
  headphones() {
    L.audio.init();
    const on = L.ambient.toggle();
    root.classList.toggle('rm-music', !!on);
    return { d: -8 };
  },
  plant() {
    const g = svg.querySelector('[data-id="plant"]');
    replay(g, 'rm-sway');
    setTimeout(() => g.classList.remove('rm-sway'), 1700);
    return { d: -8 };
  },
  sticky() { return { d: -8 }; },
};

async function interact(id) {
  if (busy || charging || !ITEM[id]) return;
  busy = true;
  roomEl.classList.add('rm-busy');
  setHover(null);
  try {
    L.audio.init();
    L.sfx.tick();
    wiggle(id);
    await walkTo(ITEM[id].x);
    // 走到了就算"发现"
    if (!found.has(id)) {
      found.add(id);
      L.store.set('room.found', Array.from(found));
      renderFound(id);
    }
    const r = (await ACT[id]()) || {};
    if (r.d) addBattery(r.d);
    if (r.silent) await wait(500);
    else if (!r.said) {
      const line = r.line || nextLine(id);
      if (line) await say(line);
    }
    if (battery <= 0) await drained();
  } catch (err) {
    console.error(err);
  } finally {
    busy = false;
    roomEl.classList.remove('rm-busy');
    hideBubble();
    checkLetter();
  }
}

/* ---------- 输入 ---------- */
function idOf(target) {
  const el = target && target.closest && target.closest('[data-id], [data-for]');
  return el ? (el.dataset.id || el.dataset.for) : null;
}
svg.addEventListener('click', e => {
  const id = idOf(e.target);
  if (id) interact(id);
});
svg.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const id = idOf(e.target);
  if (!id) return;
  e.preventDefault();
  interact(id);
});

let hovId = null;
function setHover(id) {
  if (id === hovId) return;
  if (hovId) partsOf(hovId).forEach(el => el.classList.remove('rm-hov'));
  hovId = id;
  if (id) partsOf(id).forEach(el => el.classList.add('rm-hov'));
}
svg.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || busy || charging) return;
  setHover(idOf(e.target));
});
svg.addEventListener('pointerleave', () => setHover(null));

/* ---------- 白噪音状态同步 ---------- */
const syncMusic = on => root.classList.toggle('rm-music', !!on);
if (typeof L.on === 'function') L.on('ambient', syncMusic);
syncMusic(L.ambient && L.ambient.on);

/* ---------- 不在视口时暂停动画 ---------- */
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => {
    es.forEach(en => root.classList.toggle('rm-paused', !en.isIntersecting));
  }, { rootMargin: '120px 0px' }).observe(roomEl);
}

/* ---------- 初始化 ---------- */
paintBattery(battery);
renderFound();

})();
