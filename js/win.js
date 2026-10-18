/* 01「どうなったら勝ち？」の動き（マッチポイント計算機・矢印の位置合わせ・カードから開く窓・決勝までの道・マッチポイント形式のスライド） */
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
  // 矢印は、決勝の帯の下のふちの真ん中へ向かい、頭は帯の上にのせる
  const r = $("win-fold-btn").getBoundingClientRect();
  document.querySelectorAll("#win .bracket svg.top").forEach(svg=>{
    if(!svg.getBoundingClientRect().width) return;
    const m = svg.getScreenCTM(); if(!m) return;
    const pt = svg.createSVGPoint();
    pt.x = r.left + r.width/2; pt.y = r.bottom - 3;
    const q = pt.matrixTransform(m.inverse()), half = r.width/2/m.a, top = q.y;
    const x1 = q.x - half*.45;
    svg.querySelectorAll("[data-link]").forEach(a=>{
      const sx = +a.dataset.sx, sy = +a.dataset.sy;
      let d;
      if(a.dataset.link === "w") d = a.dataset.mode === "m"
        ? `M${sx} ${sy} L${sx} ${top+70} C${sx} ${top+25} ${x1} ${top+45} ${x1} ${top}`
        : `M${sx} ${sy} C${sx} ${top+170} ${x1} ${top+110} ${x1} ${top}`;
      // Elim 2 からの矢印は、真上へ。手描きっぽく少しだけゆらす
      else { const h = sy - top; d = `M${sx} ${sy} C${sx+7} ${sy-h*.35} ${sx-5} ${sy-h*.7} ${sx+3} ${top}`; }
      a.setAttribute("d", d);
    });
  });
}
linkFinals();


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
/* 決勝の帯を押すと、下に「決勝までの道」がたてにひらく */
const fold = $("win-fold"), foldBtn = $("win-fold-btn");
function setFold(on){
  fold.classList.toggle("open", on); foldBtn.setAttribute("aria-expanded", on);
  // 閉じている間は、中身をキーボードで選べないように
  $("win-fold-body").inert = !on;
  linkFinals();
  // 下の方で閉じたときは、中身が縮んで迷子にならないよう決勝の帯まで戻る
  if(!on && fold.getBoundingClientRect().top < 0) fold.scrollIntoView({block:"start"});
}
foldBtn.addEventListener("click", () => setFold(!fold.classList.contains("open")));
// 閉じているときのチラ見えの所を押しても、ひらく
// （中身は inert で押せないので、押した所は外がわの #win-fold になる）
fold.addEventListener("click", e => { if(!fold.classList.contains("open") && !foldBtn.contains(e.target) && !$("win-fold-body").contains(e.target)) setFold(true); });
$("win-fold-body").inert = true;
fold.querySelector(".fold-foot").addEventListener("click", () => setFold(false));
if(window.ResizeObserver) new ResizeObserver(linkFinals).observe($("win"));
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
  // 優勝するチーム（CAT は点灯前の7試合目にチャンピオン、点灯後の8試合目にもう一度チャンピオンで優勝）
  const WINNER = 2;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LAST = SCORES[0].length - 1, STEP_MS = 2300;
  const say = $("win-mpx-say"), dim = $("win-mpx-dim");
  // フキダシが何の話をしているか：うしろ幕に穴をあけて見せる所
  const goalHead = () => [{el:goal, circle:true, top:25, r:38}];
  const ballOf = (...ks) => () => ks.map(k => ({el:rows[k].dot, circle:true, r:rows[k].dot.offsetWidth / 2 + 14}));
  const band = k => () => [{el:rows[k].row, pad:[12, 14], rx:18}];
  // 玉と、となりの内訳（「チャンピオン 〇キル」）をまとめて、カプセル形の穴に
  const ballWhy = k => () => [{el:[rows[k].dot, rows[k].dot.querySelector(".mpx-why")], pad:[12, 12], rx:999}];
  /* 説明のフキダシ。試合ごとに
     wait：出すまでの待ち時間 ms ／ hold：読み終えたら幕ごと消して、玉だけの画面でひと息おく時間 ms ／ cta：読み終えたら「友だちにシェア」を貼る
     keepWhy：自動再生中も内訳を残すチーム（最後のフキダシが出たら消す）
     bubbles：[{html, focus:穴, at:高さ（"mid"＝真ん中、"bottom"＝幕の下はし）, fx:出たら紙ふぶき}] */
  const CAT = '<img class="ico" src="img/team-cat.png" alt="">';
  const STORY = {
    0: {wait:300, bubbles:[{html:'まずは<mark><span class="n">50</span>pt</mark>稼いで<br>マッチポイント点灯を<br>目指せ！', focus:goalHead}]},
    6: {wait:3200, hold:2600, bubbles:[
      {html:'<span class="n">2</span>チーム点灯！', focus:ballOf(0, 1), at:"bottom"},
      {html:'どちらかが<br>チャンピオンを<br>とれば優勝だ', focus:ballOf(0, 1), at:"bottom"}]},
    7: {wait:2000, hold:2600, keepWhy:[WINNER], bubbles:[
      {html:`おっと<br>${CAT}CAT がチャンピオン！`, focus:ballWhy(WINNER)},
      {html:'この試合で点灯したから<br>優勝はまだ決まらない', focus:ballWhy(WINNER)},
      {html:'これで<span class="n">3</span>チーム点灯<br>次の試合で決まるか？', focus:ballOf(0, 1, 2)}]},
    8: {wait:2600, cta:true, bubbles:[
      {html:`なんと ${CAT}CATが<br>連続チャンピオン！`, focus:band(WINNER), fx:true},
      {html:'文句なしの優勝だ！', focus:band(WINNER)}]}
  };
  let sayTimer = 0, sayToken = 0, bubble = null, group = [], tall = 0, kept = [];
  const sayP = say.querySelector("p");
  // "bottom" のフキダシが続くときは、いちばん背の高いフキダシと高さの真ん中をそろえる（1行と3行でも、中心が同じ所に来る）。高さは出すときと画面幅が変わったときだけ測る
  function measureTall(){
    const keep = sayP.innerHTML;
    tall = Math.max(0, ...group.map(h => { sayP.innerHTML = h; return sayP.offsetHeight; }));
    sayP.innerHTML = keep;
  }
  // 穴をあけて、フキダシを置く（先にぜんぶ測ってから書きこむ）
  function placeSay(){
    const sr = say.getBoundingClientRect(), br = board.getBoundingClientRect(), W = sr.width, H = sr.height, ph = sayP.offsetHeight;
    const holes = (bubble ? bubble.focus() : []).map(f => {
      // 要素が2つ以上のときは、まとめて囲む四角に
      const rs = [f.el].flat().filter(Boolean).map(e => e.getBoundingClientRect());
      const r = {left:Math.min(...rs.map(b => b.left)), top:Math.min(...rs.map(b => b.top)), right:Math.max(...rs.map(b => b.right)), bottom:Math.max(...rs.map(b => b.bottom))};
      r.width = r.right - r.left; r.height = r.bottom - r.top;
      if(f.circle) return {cx:r.left + r.width / 2 - sr.left, cy:(f.top != null ? r.top + f.top : r.top + r.height / 2) - sr.top, r:f.r};
      return {x:r.left - f.pad[1] - sr.left, y:r.top - f.pad[0] - sr.top, w:r.width + f.pad[1] * 2, h:r.height + f.pad[0] * 2, rx:f.rx};
    });
    // うしろ幕は上にのばして、タイトル（〇試合目）もかくす。ext はのばした分
    const ext = Math.max(0, Math.round(sr.top - br.top - 10)), DH = H + ext;
    dim.style.top = -ext + "px";
    // 穴のふちはぼかさず、くっきり
    const shapes = holes.map(h => h.r ? `<circle cx="${h.cx}" cy="${h.cy + ext}" r="${h.r}"/>` : `<rect x="${h.x}" y="${h.y + ext}" width="${h.w}" height="${h.h}" rx="${Math.min(h.rx, h.h / 2)}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${DH}" viewBox="0 0 ${W} ${DH}"><mask id="m"><rect width="${W}" height="${DH}" fill="#fff"/><g fill="#000">${shapes}</g></mask><rect width="${W}" height="${DH}" mask="url(#m)"/></svg>`;
    dim.style.setProperty("--hole", holes.length ? `url("data:image/svg+xml,${encodeURIComponent(svg)}")` : "none");
    const y = bubble && bubble.at === "bottom" ? H - 8 - Math.max(tall, ph) / 2 - ph / 2 : (H - ph) / 2;
    say.style.setProperty("--sy", Math.round(y) + "px");
  }
  // 1つの試合にフキダシが2つ以上あるときは、読み終わったら消して次を出す
  const SAY_GAP = 400;
  const readOne = html => Math.max(3400, html.replace(/<[^>]*>/g, "").length * 200);
  // アニメを最初からやり直す
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  function setSay(i, animate){
    clearTimeout(sayTimer); say.classList.remove("show", "next"); board.classList.remove("cta"); stopFx();
    const token = ++sayToken, st = STORY[i];
    kept = [];
    if(!st) return;
    const bs = st.bubbles;
    // 玉や 50pt の線がまだ動いている途中なら、止まってから出す（動いている途中の位置に穴があかないように）
    const settled = () => Promise.allSettled([goal, ...rows.map(r => r.dot)].flatMap(e => e.getAnimations()).filter(a => a instanceof CSSTransition).map(a => a.finished));
    const part = k => settled().then(() => { if(token === sayToken) showPart(k); });
    const showPart = k => {
      // 文は出す直前に入れかえる（先に入れると、前のフキダシが消えていく途中に次の文が見えてしまう）
      bubble = bs[k];
      group = bs.filter(b => b.at === "bottom").map(b => b.html);
      measureTall();
      sayP.innerHTML = bubble.html;
      placeSay();
      // 続きのフキダシは、うしろ幕は出したまま、フキダシだけぽんっと出し直す
      sayP.style.animation = "none"; void sayP.offsetWidth; sayP.style.animation = "";
      say.classList.remove("next"); say.classList.add("show");
      if(bubble.fx && animate) startFx();
      const read = readOne(bubble.html);
      if(k + 1 < bs.length){ sayTimer = setTimeout(() => { say.classList.add("next"); sayTimer = setTimeout(() => part(k + 1), SAY_GAP); }, read); return; }
      // 最後のフキダシ：残していた内訳を消す
      kept.forEach(e => { e.classList.add("out"); setTimeout(() => e.remove(), 300); }); kept = [];
      if(st.hold) sayTimer = setTimeout(() => say.classList.remove("show"), read);
      else if(st.cta) sayTimer = setTimeout(() => board.classList.add("cta"), read);
    };
    sayTimer = setTimeout(() => part(0), animate && !reduce ? st.wait : 0);
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
    rows.forEach(r => r.dot.style.setProperty("--x", pos(r.shown, max)));
  }
  // 点数を動かす（gain があるときは白い玉に「+12」を出して、玉もぽんっとはねる）
  function setScores(i, animate){
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
        const keepWhy = !stay && STORY[i] && (STORY[i].keepWhy || []).includes(k);
        const g = document.createElement("span"); g.className = "mpx-gain" + (stay ? " stay" : ""); g.textContent = "+" + gain;
        const [place, kills] = DETAIL[k][i - 1];
        const d = document.createElement("span"); d.className = "mpx-why";
        d.classList.toggle("stay", stay || keepWhy); d.classList.toggle("champ", place === 1); d.classList.toggle("left", v / max > .6); d.textContent = place === 1 ? `チャンピオン ${kills}キル` : `${place}位 ${kills}キル`;
        r.dot.append(g, d);
        if(keepWhy) kept.push(d);
        if(!stay) setTimeout(() => { g.remove(); if(!keepWhy) d.remove(); }, 2200);
        r.dot.classList.remove("hit"); void r.dot.offsetWidth; if(gain > 0) r.dot.classList.add("hit");
      }
    });
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
  // 最後の試合は、フキダシを読み終えるころに最後の丸が満ちきる。ms なし（止めて見ているとき）は、i の丸まで満ちた状態
  const leftOf = i => dots[i].offsetLeft, rightOf = i => dots[i].offsetLeft + dots[i].offsetWidth;
  const curProg = () => parseFloat(getComputedStyle(bar).getPropertyValue("--mxp")) || 0;
  // 丸が半分まで満ちたら、数字を濃い色に
  const markDone = x => dots.forEach(d => d.classList.toggle("done", d.offsetLeft + d.offsetWidth / 2 <= x + .5));
  let doneTimer = 0;
  function setProg(i, ms){
    clearTimeout(doneTimer);
    const run = ms && !reduce, cur = curProg(), to = i < LAST ? leftOf(i + 1) : rightOf(LAST);
    // 一時停止から再開したときは、止めた所から続ける
    const from = run ? (cur > leftOf(i) && cur < to ? cur : leftOf(i)) : rightOf(i);
    bar.style.transition = "none"; bar.style.setProperty("--mxp", from + "px"); void bar.offsetWidth;
    markDone(from);
    if(!run) return;
    const half = leftOf(i) + dots[i].offsetWidth / 2;
    bar.style.transition = `--mxp ${ms}ms linear`; bar.style.setProperty("--mxp", to + "px");
    if(half > from) doneTimer = setTimeout(() => markDone(half), (half - from) / (to - from) * ms);
  }
  // 止めたときは、満ちている途中でそのまま止める
  function freezeProg(){
    clearTimeout(doneTimer);
    const v = curProg();
    bar.style.transition = "none"; bar.style.setProperty("--mxp", v + "px"); markDone(v);
  }
  // 何度呼ばれても、次の描画の前に1回だけ動かす
  const perFrame = fn => { let id = 0; return () => { if(!id) id = requestAnimationFrame(() => { id = 0; fn(); }); }; };
  // 画面幅が変わったら、串の形・フキダシの高さと穴を合わせ直す
  shapeBar();
  addEventListener("resize", perFrame(() => {
    shapeBar(); if(!playing) setProg(step);
    if(say.classList.contains("show")){ measureTall(); placeSay(); }
  }));
  // 玉や 50pt の線が動き終わったら、フキダシの穴もそこへ合わせ直す
  // （50pt の線と3つの玉が同時に動き終わるので、まとめて1回）
  const replace = perFrame(placeSay);
  board.addEventListener("transitionend", e => { if(e.propertyName === "left" && say.classList.contains("show")) replace(); });
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
    // しばらく降ったら（FADE_AT）、FADE_MS かけて降る量を 0 まで減らす。最後の紙が落ちきったらおしまい
    const parts = [], RATE = W * .022, FADE_AT = 9000, FADE_MS = 7000, t0 = performance.now();
    let last = performance.now(), acc = 0;
    const add = () => parts.push({x:rnd(-10, W + 10), y:rnd(-30, -8), vx:rnd(-.25, .25), vy:rnd(.55, 1.05), size:rnd(5, 8),
      deg:rnd(0, 360), spin:rnd(.6, 1.4), sway:rnd(.3, .8), color:FX_COLORS[parts.length % FX_COLORS.length]});
    const tick = now => {
      const dt = Math.min(3, (now - last) / 16.7); last = now;
      const k = Math.max(0, Math.min(1, 1 - (now - t0 - FADE_AT) / FADE_MS));
      acc += RATE * k * dt * 16.7 / 1000;
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
      if(k === 0 && !parts.length){ stopFx(); return; }
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
    // 試合から試合へは数字だけ入れかえて、数字だけぽんっと出す（「試合目」はそのまま）。スタートとの行き来は全体を入れかえる
    const num = title.querySelector(".n");
    if(i > 0 && num){ num.textContent = i; if(animate) restart(num, "pop"); }
    else {
      title.innerHTML = i === 0 ? '<span class="w-a">決勝</span><span class="w-b">スタート</span>' : `<span class="n">${i}</span><span class="w-b">試合目</span>`;
      if(animate) restart(title, "pop");
    }
    dots.forEach(d => d.removeAttribute("aria-current")); dots[i].setAttribute("aria-current", "step");
    // 自動再生中は、このあとの待ち時間（wait2）に合わせて満たしはじめる
    if(!playing || i === LAST) setProg(i);
    setSay(i, animate);
    if(animate && !reduce && i === WIDE_FROM && prev === WIDE_FROM - 1){
      // ① 今の点数のまま、目盛りだけ広げる（全体が左へスライド）→ ② それから点数を足す
      setScale(span(i));
      wait = setTimeout(() => setScores(i, true), RESCALE_MS);
    } else {
      setScale(span(i));
      setScores(i, animate);
    }
    // 最後の試合で止まる。自動再生で来たときは、最後の丸もだんだん満ちていく
    if(i === LAST){ const auto = playing && animate; pause(); if(auto) setProg(LAST, delay(LAST)); }
  }
  // 自動再生で次へ進むまでの時間。フキダシのある試合は、出てから読み終わるまで待つ（文字数に合わせて、1文字 0.2 秒・最低 3.4 秒）
  const readMs = i => STORY[i].bubbles.reduce((t, b) => t + readOne(b.html) + SAY_GAP, -SAY_GAP);
  const delay = i => i === WIDE_FROM ? STEP_MS + RESCALE_MS : STORY[i] ? STORY[i].wait + readMs(i) + (STORY[i].hold || 0) : STEP_MS;
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
  /* スライドは窓で見る。サムネを押したら窓をひらいてすぐ再生、とじたら一時停止 */
  const vid = $("win-vid");
  function openVid(autoplay){
    if(!vid.open) vid.showModal();
    // 窓が閉じている間は大きさが測れないので、ひらいてから串の形などを作り直す
    dispatchEvent(new Event("resize"));
    if(autoplay && !board.classList.contains("started")) $("win-mpx-start").click();
  }
  $("win-vid-open").addEventListener("click", () => openVid(true));
  vid.addEventListener("click", e => { if(e.target === vid || e.target.closest("#win-vid > [data-close]")) vid.close(); });
  vid.addEventListener("close", () => { if(playing) pause(); });
  // 共有されたリンク（…#win-mpx）から来たら、スタート画面の窓をひらいておく
  if(location.hash === "#win-mpx") openVid(false);
  // サムネの長さ表示：最初から最後のフキダシを読み終わるまで
  const total = SCORES[0].reduce((t, _, i) => t + delay(i), 0);
  $("win-vid-len").textContent = `${Math.floor(total / 60000)}:${String(Math.round(total / 1000) % 60).padStart(2, "0")}`;
  // 共有：スマホはいつものシェア画面、それ以外はリンクをコピー。リンクはこのスライドの位置に飛ぶ
  const toast = $("win-mpx-toast");
  let toastTimer = 0;
  const showToast = text => { toast.textContent = text; toast.classList.add("on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("on"), 2200); };
  async function share(){
    const url = location.origin + location.pathname + "#win-mpx";
    const data = {title:"マッチポイント形式とは？｜ALGS はじめて観戦ガイド", text:"ALGS のマッチポイント形式が、アニメでわかるよ", url};
    if(navigator.share && matchMedia("(hover:none)").matches){
      try{ await navigator.share(data); }catch(e){ /* 閉じただけのときは何もしない */ }
      return;
    }
    try{ await navigator.clipboard.writeText(url); showToast("リンクをコピーしたよ"); }
    catch(e){ prompt("このリンクをコピーしてね", url); }
  }
  $("win-mpx-share").addEventListener("click", share);
  $("win-mpx-cta").addEventListener("click", share);
  // ボードのどこを押しても一時停止・再生（ボタンとリンクはそれぞれの動き）。真ん中にマークを出す
  const flash = $("win-mpx-flash");
  board.addEventListener("click", e => {
    if(!board.classList.contains("started") || e.target.closest("button,a")) return;
    playing ? pause() : play();
    flash.classList.toggle("play", playing);
    restart(flash, "on");
  });
  $("win-mpx-replay").addEventListener("click", () => { show(0, true); play(); });
  show(0, false); setSay(-1); pause();
})();
})();
