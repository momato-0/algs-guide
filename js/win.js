/* セクション1「どうなったら勝ち？」の動き（マッチポイント計算機・矢印の位置合わせ・カードから開く窓・マッチポイント形式のスライド） */
(function(){
const $ = id => document.getElementById(id);
const PLACE = [12,9,7,5,4,3,3,2,2,2,1,1,1,1,1,0,0,0,0,0];
const MP = 50;

/* 計算 */
let pts = 32, nTouched = false;
const nSel = $("win-c-n"), pSel = $("win-c-p");
for(let n=1;n<=6;n++){ const o=document.createElement("option"); o.value=n; o.textContent=n+"試合"; nSel.appendChild(o); }
PLACE.slice(0,10).forEach((p,i)=>{ const o=document.createElement("option"); o.value=i; o.textContent=`${i+1}位（${p}pt）`; pSel.appendChild(o); });
pSel.value = 1;

const killsPer = (need,n,p) => Math.max(0, Math.ceil(need/n - PLACE[p]));
function autoN(need, p){
  for(let n=1;n<=6;n++) if(killsPer(need,n,p) <= 6) return n;
  return 6;
}
// 「あと何点」の矢印
const ARROW = '<svg class="arr" viewBox="0 0 34 24" aria-hidden="true"><path d="M2 8h17V2l13 10-13 10v-6H2z" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
function setPts(v){ pts = Math.max(0, Math.min(70, v)); nTouched = false; draw(); }
function draw(){
  $("win-c-range").value = pts;
  const lit = pts >= MP, need = MP - pts;
  const pin = $("win-c-pin"); pin.textContent = pts; pin.classList.toggle("lit", lit);
  // あと何点
  const nd = $("win-c-need");
  nd.classList.toggle("done", lit);
  nd.innerHTML = lit ? "もう点灯してるよ！<br>あとはチャンピオンを獲るだけ！"
    : `${ARROW}<span>あと</span><b class="bn">${need}</b><span>pt で点灯</span>`;
  $("win-c-ex").style.visibility = lit ? "hidden" : "";
  if(lit) return;
  const p = +pSel.value;
  if(!nTouched) nSel.value = autoN(need, p);
  const n = +nSel.value, k = killsPer(need, n, p);
  $("win-c-k").textContent = k;
  $("win-c-each").textContent = n === 1 ? "で" : "とも";
  $("win-c-hint").textContent = `placement ${PLACE[p]*n}pt + ${k*n} ${k*n === 1 ? "kill" : "kills"} = ${PLACE[p]*n + k*n}pt`;
}
$("win-c-range").addEventListener("input", e=>setPts(+e.target.value));
$("win-c-minus").onclick = ()=>setPts(pts-1);
$("win-c-plus").onclick = ()=>setPts(pts+1);
nSel.addEventListener("change", ()=>{ nTouched = true; draw(); });
// 順位を変えても、自分で選んだ試合数はそのまま（試合数を選んでいないときだけ自動で決める）
pSel.addEventListener("change", draw);
draw();

function linkFinals(){
  const r = $("win-fpill").getBoundingClientRect();
  document.querySelectorAll("#win .bracket svg.top").forEach(svg=>{
    if(!svg.getBoundingClientRect().width) return;
    const m = svg.getScreenCTM(); if(!m) return;
    const pt = svg.createSVGPoint();
    pt.x = r.left + r.width/2; pt.y = r.bottom + 6;
    const q = pt.matrixTransform(m.inverse()), half = r.width/2/m.a, top = q.y;
    const x1 = q.x - half*.45, x2 = q.x + half*.25;
    svg.querySelectorAll("[data-link]").forEach(a=>{
      const sx = +a.dataset.sx, sy = +a.dataset.sy;
      let d;
      if(a.dataset.link === "w") d = a.dataset.mode === "m"
        ? `M${sx} ${sy} L${sx} ${top+70} C${sx} ${top+25} ${x1} ${top+45} ${x1} ${top}`
        : `M${sx} ${sy} C${sx} ${top+170} ${x1} ${top+110} ${x1} ${top}`;
      else { const mid = (sy + top)/2; d = `M${sx} ${sy} C${sx} ${mid} ${x2} ${mid} ${x2} ${top}`; }
      a.setAttribute("d", d);
    });
  });
}
linkFinals();
addEventListener("resize", linkFinals);


/* カードから開く窓（上のタブで計算機とスコア表を切りかえ）。×・窓の外・Esc で閉じる。PC は真ん中、スマホは下から */
const dlg = $("win-dlg");
function setTab(name){
  ["calc","table"].forEach(t => {
    $("win-tab-" + t).setAttribute("aria-selected", t === name);
    $("win-pane-" + t).hidden = t !== name;
  });
}
document.querySelectorAll("#win [data-tab]").forEach(b => b.addEventListener("click", e => {
  e.stopPropagation(); setTab(b.dataset.tab);
  if(!dlg.open) dlg.showModal();
}));
["calc","table"].forEach(t => $("win-tab-" + t).addEventListener("click", () => setTab(t)));
dlg.addEventListener("click", e => { if(e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
if(document.fonts) document.fonts.ready.then(linkFinals);
/* DAY 3 から下の折りたたみ */
const fold = $("win-fold"), foldBtn = $("win-fold-btn");
function setFold(on){
  fold.classList.toggle("open", on); foldBtn.setAttribute("aria-expanded", on);
  linkFinals();
  // 下の方で閉じたときは、中身が縮んで迷子にならないよう DAY 3 の行まで戻る
  if(!on && fold.getBoundingClientRect().top < 0) fold.scrollIntoView({block:"start"});
}
fold.querySelector(".fold-head").addEventListener("click", () => setFold(!fold.classList.contains("open")));
$("win-fold-btn2").addEventListener("click", () => setFold(false));
if(window.ResizeObserver) new ResizeObserver(linkFinals).observe(document.querySelector("#win .sheet"));
/* マッチポイント形式のスライド：0pt から8試合。6試合目で2チーム点灯、7・8試合目で CAT が連続チャンピオンの逆転優勝。
   基本は自動で進み、一時停止・試合ボタンで好きな試合・最初からもできる */
(() => {
  const TEAMS = [
    {id:"apple", name:"APPLE", img:"img/team-apple.png"},
    {id:"beer",  name:"BEER",  img:"img/team-beer.png"},
    {id:"cat",   name:"CAT",   img:"img/team-cat.png"}
  ];
  // [スタート, 1試合目, …, 8試合目]
  const SCORES = [
    [0,19,34,35,41,43,50,57,62],
    [0, 0, 4, 5,26,45,65,84,99],
    [0, 1, 2,21,29,38,48,70,95]
  ];
  // 各試合の内訳 [順位, キル数]（順位ポイントは PLACE、1キル1pt）
  const DETAIL = [
    [[1,7],[4,10],[15,0],[9,4],[15,1],[5,3],[5,3],[6,2]],
    [[17,0],[8,2],[20,1],[1,9],[2,10],[3,13],[2,10],[3,8]],
    [[14,0],[16,1],[1,7],[4,3],[5,5],[4,5],[1,10],[1,13]]
  ];
  // 点灯した試合と、優勝が決まる試合（CAT は点灯前の7試合目にチャンピオン、点灯後の8試合目にもう一度チャンピオンで優勝）
  const WINNER = 2;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LAST = SCORES[0].length - 1, STEP_MS = 2300;
  // 説明のフキダシ（[出すまでの待ち時間 ms, 文]）
  const CAT = '<img class="ico" src="img/team-cat.png" alt="">';
  const SAY = {
    0: [300, "まずは<mark><span class=\"n\">50</span>pt</mark>稼いで<br>マッチポイント点灯を<br>目指せ！"],
    6: [3200, "<span class=\"n\">2</span>チーム点灯！", `どちらかが<br>チャンピオンを<br>とれば優勝だ`],
    7: [2000, `おっと<br>${CAT}CAT がチャンピオン！`, `この試合で点灯したから<br>優勝はまだ決まらない`, `これで<span class=\"n\">3</span>チーム点灯<br>次の試合で決まるか？`],
    8: [2600, `なんと ${CAT}CATが<br>連続チャンピオン！`, `文句なしの優勝だ！`]
  };
  const say = $("win-mpx-say"), dim = $("win-mpx-dim");
  // フキダシが何の話をしているか：うしろ幕に穴をあけて見せる所と、フキダシを置く高さ（フキダシ1つずつ）
  // 高さは基本 "mid"（真ん中）。穴とかぶるときだけ "top"（穴の上）か "bottom"（幕の下はし）
  const goalHead = () => [{el:goal, circle:true, top:25, r:38}];
  const ballOf = (...ks) => () => ks.map(k => ({el:rows[k].dot, circle:true, r:rows[k].dot.offsetWidth / 2 + 14}));
  const band = k => () => [{el:rows[k].row, pad:[12, 14], rx:18}];
  // 玉と、となりの内訳（「チャンピオン 〇キル」）をまとめて、カプセル形の穴に
  const ballWhy = k => () => [{el:[rows[k].dot, rows[k].dot.querySelector(".mpx-why")], pad:[12, 12], rx:999}];
  const FOCUS = {
    0: [[goalHead, "mid"]],
    6: [[ballOf(0, 1), "bottom"], [ballOf(0, 1), "bottom"]],
    7: [[ballWhy(2), "mid"], [ballWhy(2), "mid"], [ballOf(0, 1, 2), "mid"]],
    8: [[band(WINNER), "mid"], [band(WINNER), "mid"]]
  };
  let sayTimer = 0, sayToken = 0, focus = null, group = [];
  function placeSay(){
    const p = say.querySelector("p");
    const sr = say.getBoundingClientRect(), br = board.getBoundingClientRect(), W = sr.width, H = sr.height;
    const [shape, at] = focus || [() => [], "mid"];
    const holes = shape().map(f => {
      // 要素が2つ以上のときは、まとめて囲む四角に
      const rs = [f.el].flat().filter(Boolean).map(e => e.getBoundingClientRect());
      const r = {left:Math.min(...rs.map(b => b.left)), top:Math.min(...rs.map(b => b.top)), right:Math.max(...rs.map(b => b.right)), bottom:Math.max(...rs.map(b => b.bottom))};
      r.width = r.right - r.left; r.height = r.bottom - r.top;
      if(f.circle) return {cx:r.left + r.width / 2 - sr.left, cy:(f.top != null ? r.top + f.top : r.top + r.height / 2) - sr.top, r:f.r};
      return {x:r.left - f.pad[1] - sr.left, y:r.top - f.pad[0] - sr.top, w:r.width + f.pad[1] * 2, h:r.height + f.pad[0] * 2, rx:f.rx};
    });
    // 穴のふちはぼかさず、くっきり
    const shapes = holes.map(h => h.r ? `<circle cx="${h.cx}" cy="${h.cy}" r="${h.r}"/>` : `<rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="${Math.min(h.rx, h.h / 2)}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><mask id="m"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${shapes}</g></mask><rect width="${W}" height="${H}" mask="url(#m)"/></svg>`;
    dim.style.setProperty("--hole", holes.length ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : "none");
    const ph = p.offsetHeight;
    let y = (H - ph) / 2;
    // 下：同じ試合で続けて下に出すフキダシは、いちばん背の高いフキダシと高さの真ん中をそろえる（1行と3行でも、中心が同じ所に来る）
    if(at === "bottom"){
      const keep = p.innerHTML;
      const tall = Math.max(ph, ...group.map(h => { p.innerHTML = h; return p.offsetHeight; }));
      p.innerHTML = keep;
      y = H - 8 - tall / 2 - ph / 2;
    }
    // 上：穴のすぐ上。足りなければタイトルの所まで上げる
    if(at === "top" && holes.length) y = Math.max(br.top - sr.top + 8, Math.min(...holes.map(h => h.r ? h.cy - h.r : h.y)) - 10 - ph);
    say.style.setProperty("--sy", Math.round(y) + "px");
  }
  addEventListener("resize", () => say.classList.contains("show") && placeSay());
  // 1つの試合にフキダシが2つ以上あるときは、読み終わったら消して次を出す
  const SAY_GAP = 400;
  // 残すのは、その試合の最後のフキダシ（7試合目なら「3チーム点灯」）が出るまで
  const KEEP_WHY = {7: [WINNER]};
  // 最後のフキダシを読み終えたら幕ごと消して、玉だけの画面でひと息おく試合（6試合目：CAT の今の位置を見てもらってから7試合目へ／7試合目：3チーム点灯の画面を見てもらってから8試合目へ）
  const SAY_HOLD = {6: 2600, 7: 2600};
  const readOne = html => Math.max(3400, html.replace(/<[^>]*>/g, "").length * 200);
  function setSay(i, animate){
    clearTimeout(sayTimer); say.classList.remove("show", "next"); stopFx();
    const token = ++sayToken;
    if(!SAY[i]) return;
    const [wait, ...texts] = SAY[i];
    // 玉や 50pt の線がまだ動いている途中なら、止まってから出す（動いている途中の位置に穴があかないように）
    const settled = () => Promise.allSettled([goal, ...rows.map(r => r.dot)].flatMap(e => e.getAnimations()).filter(a => a instanceof CSSTransition).map(a => a.finished));
    const part = k => settled().then(() => { if(token === sayToken) showPart(k); });
    const showPart = k => {
      // 文は出す直前に入れかえる（先に入れると、前のフキダシが消えていく途中に次の文が見えてしまう）
      const p = say.querySelector("p");
      p.innerHTML = texts[k]; focus = FOCUS[i] && FOCUS[i][k];
      group = texts.filter((_, n) => FOCUS[i] && FOCUS[i][n] && FOCUS[i][n][1] === "bottom");
      placeSay();
      // 続きのフキダシは、うしろ幕は出したまま、フキダシだけぽんっと出し直す
      p.style.animation = "none"; void p.offsetWidth; p.style.animation = "";
      say.classList.remove("next"); say.classList.add("show");
      if(KEEP_WHY[i] && k === texts.length - 1) board.querySelectorAll(".mpx-why.keep").forEach(e => { e.classList.add("out"); setTimeout(() => e.remove(), 300); });
      // 最後の試合の、最初のフキダシ（「なんと CATが」）が出たら紙ふぶき
      if(i === LAST && k === 0 && animate) startFx();
      if(k + 1 < texts.length) sayTimer = setTimeout(() => { say.classList.add("next"); sayTimer = setTimeout(() => part(k + 1), SAY_GAP); }, readOne(texts[k]));
      else if(SAY_HOLD[i]) sayTimer = setTimeout(() => say.classList.remove("show"), readOne(texts[k]));
    };
    sayTimer = setTimeout(() => part(0), animate && !reduce ? wait : 0);
  }
  // 目盛り（線の右はしが何点か）。最初は 50pt が右から 1/4 のところ。
  // 4試合目に入るとき、玉と 50pt の線の位置関係はそのままで、全体をぎゅっと左へ縮める（50pt が真ん中に来る）
  const WIDE_FROM = 4, RESCALE_MS = 1000;
  const span = i => i >= WIDE_FROM ? MP * 2 : MP / .75;
  const board = $("win-mpx-board"), rowsEl = $("win-mpx-rows"), title = $("win-mpx-title"), goal = $("win-mpx-goal"), dotsEl = $("win-mpx-dots");
  const rows = TEAMS.map(t => {
    const r = document.createElement("div"); r.className = "mpx-row";
    r.innerHTML = `<div class="mpx-team t-${t.id}"><img src="${t.img}" alt=""><span>${t.name}</span></div><div class="mpx-track"><div class="mpx-dot"><i>0</i></div></div>`;
    rowsEl.appendChild(r);
    return {row:r, dot:r.querySelector(".mpx-dot"), num:r.querySelector(".mpx-dot i"), shown:0};
  });
  rowsEl.setAttribute("aria-hidden", "true");
  const bar = document.createElement("div"); bar.className = "mpx-bar"; dotsEl.appendChild(bar);
  const dots = SCORES[0].map((_, i) => {
    const b = document.createElement("button"); b.type = "button";
    b.textContent = i === 0 ? "S" : i; b.setAttribute("aria-label", i === 0 ? "決勝スタート" : i + "試合目");
    b.addEventListener("click", () => { pause(); show(i); });
    dotsEl.appendChild(b); return b;
  });
  // 数字をカウントアップさせる
  function count(row, to){
    const from = row.shown; row.shown = to;
    if(reduce || from === to){ row.num.textContent = to; return; }
    const t0 = performance.now(), d = 800;
    const tick = now => { const k = Math.min(1, (now - t0) / d); row.num.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3)); if(k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const pos = (v, max) => Math.min(v, max) / max * 100 + "%";
  // 目盛りを合わせる（50pt の線）
  function setScale(max){
    goal.style.setProperty("--x", pos(MP, max));
    rows.forEach((r, k) => r.dot.style.setProperty("--x", pos(r.shown, max)));
  }
  // 点数を動かす（gain があるときは白い玉に「+12」を出して、玉もぽんっとはねる）
  function setScores(i, prev, animate){
    const max = span(i);
    rows.forEach((r, k) => {
      const v = SCORES[k][i], gain = i > 0 ? v - SCORES[k][i - 1] : 0;
      r.dot.style.setProperty("--x", pos(v, max));
      r.dot.classList.toggle("lit", v >= MP);
      count(r, v);
      r.dot.querySelectorAll(".mpx-gain,.mpx-why").forEach(e => e.remove());
      // 0pt の試合も「+0」と内訳を出す（順位とキルの記録はあるので）
      if(animate && i > 0){
        // その試合の加点「+12」と内訳（例：2位 3キル）。自動再生中は消えていく。
        // 止めて見ているとき（試合ボタン・一時停止）と最後の試合は、そのまま残す
        const stay = !playing || i === LAST;
        // フキダシで話している内訳は、自動再生中でも残す（7試合目の CAT「チャンピオン 10キル」）
        const keepWhy = stay || (KEEP_WHY[i] || []).includes(k);
        const g = document.createElement("span"); g.className = "mpx-gain" + (stay ? " stay" : ""); g.textContent = "+" + gain;
        const [place, kills] = DETAIL[k][i - 1];
        const d = document.createElement("span"); d.className = "mpx-why" + (keepWhy ? " stay" : "") + (keepWhy && !stay ? " keep" : "") + (place === 1 ? " champ" : "") + (v / max > .6 ? " left" : ""); d.textContent = place === 1 ? `チャンピオン ${kills}キル` : `${place}位 ${kills}キル`;
        r.dot.append(g, d);
        if(!stay) setTimeout(() => { g.remove(); if(!keepWhy) d.remove(); }, 2200);
        r.dot.classList.remove("hit"); void r.dot.offsetWidth; if(gain > 0) r.dot.classList.add("hit");
      }
    });
    board.classList.toggle("end", i === LAST);
    // 優勝：CAT の行が光って、王冠が落ちてくる
    rows.forEach((r, k) => r.row.classList.toggle("win", i === LAST && k === WINNER));
  }
  // 串の形（丸と、丸どうしをつなぐ棒）をマスクで作る。画面幅でボタンの大きさが変わるので、そのたびに作り直す
  function shapeBar(){
    const d = dots[0].offsetWidth, r = d / 2, x0 = dots[0].offsetLeft + r, x1 = dots[LAST].offsetLeft + r;
    const m = dots.map(b => `radial-gradient(circle at ${b.offsetLeft + r}px 50%,#000 ${r}px,transparent ${r + .6}px)`);
    m.push(`linear-gradient(#000,#000) ${x0}px 50%/${x1 - x0}px ${Math.round(d * .42)}px no-repeat`);
    bar.style.webkitMask = bar.style.mask = m.join(",");
  }
  // 進み具合：i 試合目のあいだに i の丸を左はしから満たしていき、次の試合になる直前に i の丸が満ちきる（そのあと次の丸の手前まで）。
  // ms なし（止めて見ているとき・最後の試合）は、i の丸まで満ちた状態
  const leftOf = i => dots[i].offsetLeft, rightOf = i => dots[i].offsetLeft + dots[i].offsetWidth;
  const curProg = () => parseFloat(getComputedStyle(bar).getPropertyValue("--mxp")) || 0;
  // 丸が半分まで満ちたら、数字を濃い色に
  const markDone = x => dots.forEach(d => d.classList.toggle("done", d.offsetLeft + d.offsetWidth / 2 <= x + .5));
  let doneTimer = 0;
  function setProg(i, ms){
    clearTimeout(doneTimer);
    const run = ms && i < LAST && !reduce, cur = curProg();
    // 一時停止から再開したときは、止めた所から続ける
    const from = run ? (cur > leftOf(i) && cur < leftOf(i + 1) ? cur : leftOf(i)) : rightOf(i);
    bar.style.transition = "none"; bar.style.setProperty("--mxp", from + "px"); void bar.offsetWidth;
    markDone(from);
    if(!run) return;
    const to = leftOf(i + 1), half = leftOf(i) + dots[i].offsetWidth / 2;
    bar.style.transition = `--mxp ${ms}ms linear`; bar.style.setProperty("--mxp", to + "px");
    if(half > from) doneTimer = setTimeout(() => markDone(half), (half - from) / (to - from) * ms);
  }
  // 止めたときは、満ちている途中でそのまま止める
  function freezeProg(){
    clearTimeout(doneTimer);
    const v = curProg();
    bar.style.transition = "none"; bar.style.setProperty("--mxp", v + "px"); markDone(v);
  }
  shapeBar(); addEventListener("resize", () => { shapeBar(); if(!playing) setProg(step); });
  // 玉や 50pt の線が動き終わったら、フキダシの穴もそこへ合わせ直す
  board.addEventListener("transitionend", e => { if(e.propertyName === "left" && say.classList.contains("show")) placeSay(); });
  let step = 0, timer = 0, wait = 0, playing = false;
  /* 優勝の紙ふぶき：金と銀の紙が、くるくる裏返りながらボードの上からゆっくり舞い落ちる（canvas） */
  const FX_COLORS = ["#f9e7c3", "#e3b458", "#9d7d1d", "#f4f6f9", "#c9ced6", "#8e959f"];
  let fx = null;
  function startFx(){
    stopFx();
    if(reduce) return;
    const cv = document.createElement("canvas"); cv.className = "mpx-fx"; cv.setAttribute("aria-hidden", "true");
    board.appendChild(cv);
    const dpr = Math.min(2, devicePixelRatio || 1), W = board.clientWidth, H = board.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    const rnd = (a, b) => a + Math.random() * (b - a);
    // 1秒あたりに足す紙の数（幅に合わせる）。最後の画面を出しているあいだ、ずっと降り続ける
    const parts = [], RATE = W * .022;
    let last = performance.now(), acc = 0;
    const add = () => parts.push({x:rnd(-10, W + 10), y:rnd(-30, -8), vx:rnd(-.25, .25), vy:rnd(.55, 1.05), size:rnd(5, 8),
      deg:rnd(0, 360), spin:rnd(.6, 1.4), sway:rnd(.3, .8), color:FX_COLORS[parts.length % FX_COLORS.length]});
    const tick = now => {
      const dt = Math.min(3, (now - last) / 16.7); last = now;
      acc += RATE * dt * 16.7 / 1000;
      while(acc >= 1){ add(); acc--; }
      ctx.clearRect(0, 0, W, H);
      for(let n = parts.length - 1; n >= 0; n--){
        const q = parts[n];
        q.deg += q.spin * dt;
        q.x += (q.vx + Math.cos(q.deg * Math.PI / 180) * q.sway) * dt;
        q.y += q.vy * dt;
        if(q.y > H + 20){ parts.splice(n, 1); continue; }
        // 縦の長さを cos で伸び縮みさせて、裏返るように見せる
        const h = Math.cos(q.deg * Math.PI / 36) * q.size;
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + q.size / 2, q.y + h); ctx.lineTo(q.x + q.size * 1.5, q.y + h); ctx.lineTo(q.x + q.size, q.y);
        ctx.closePath(); ctx.fill();
      }
      fx.raf = requestAnimationFrame(tick);
    };
    fx = {cv, raf:requestAnimationFrame(tick)};
  }
  function stopFx(){
    if(!fx) return;
    cancelAnimationFrame(fx.raf); fx.cv.remove(); fx = null;
  }
  function show(i, animate = true){
    const prev = step; step = i;
    clearTimeout(wait);
    title.innerHTML = i === 0 ? "決勝スタート" : `<span class="n">${i}</span>試合目`;
    if(animate){ title.classList.remove("pop"); void title.offsetWidth; title.classList.add("pop"); }
    dots.forEach(d => d.removeAttribute("aria-current")); dots[i].setAttribute("aria-current", "step");
    // 自動再生中は、このあとの待ち時間（wait2）に合わせて満たしはじめる
    if(!playing || i === LAST) setProg(i);
    setSay(i, animate);
    if(animate && !reduce && i === WIDE_FROM && prev === WIDE_FROM - 1){
      // ① 今の点数のまま、目盛りだけ広げる（全体が左へスライド）→ ② それから点数を足す
      board.classList.remove("end");
      setScale(span(i));
      wait = setTimeout(() => setScores(i, prev, true), RESCALE_MS);
    } else {
      setScale(span(i));
      setScores(i, prev, animate);
    }
    if(i === LAST) pause();
  }
  // 自動再生で次へ進むまでの時間。フキダシのある試合は読む時間をとる
  // フキダシのある試合は、出てから読み終わるまで待つ（文字数に合わせて、1文字 0.2 秒・最低 3.4 秒）
  const readMs = i => SAY[i].slice(1).reduce((t, h) => t + readOne(h) + SAY_GAP, -SAY_GAP);
  const delay = i => i === WIDE_FROM ? STEP_MS + RESCALE_MS : SAY[i] ? SAY[i][0] + readMs(i) + (SAY_HOLD[i] || 0) : STEP_MS;
  function next(){ if(step < LAST){ show(step + 1); if(playing) wait2(delay(step)); } }
  // 次へ進むまでの待ち時間と、串が満ちていく時間をそろえる
  function wait2(ms){ clearTimeout(timer); timer = setTimeout(next, ms); setProg(step, ms); }
  function play(){
    if(step === LAST) show(0, false);
    playing = true; board.classList.remove("paused"); $("win-mpx-pause").setAttribute("aria-label", "一時停止");
    wait2(delay(step));
  }
  function pause(){
    playing = false; clearTimeout(timer); freezeProg(); board.classList.add("paused"); $("win-mpx-pause").setAttribute("aria-label", "再生");
  }
  $("win-mpx-start").addEventListener("click", () => {
    board.classList.add("started");
    // S の丸も、空っぽから満たしはじめる
    bar.style.setProperty("--mxp", "0px");
    setSay(0, true);
    if(!reduce) play();
  });
  $("win-mpx-pause").addEventListener("click", () => playing ? pause() : play());
  // ボードのどこを押しても一時停止・再生（ボタンとリンクはそれぞれの動き）。真ん中にマークを出す
  const flash = $("win-mpx-flash");
  board.addEventListener("click", e => {
    if(!board.classList.contains("started") || e.target.closest("button,a")) return;
    playing ? pause() : play();
    flash.classList.toggle("play", playing);
    flash.classList.remove("on"); void flash.offsetWidth; flash.classList.add("on");
  });
  $("win-mpx-replay").addEventListener("click", () => { show(0, true); play(); });
  show(0, false); setSay(-1); pause();
})();
})();
