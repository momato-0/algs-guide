/* セクション1「どうなったら勝ち？」の動き（決勝の玉・マッチポイント計算機・矢印の位置合わせ・アイコンから開く窓） */
(function(){
const $ = id => document.getElementById(id);
const PLACE = [12,9,7,5,4,3,3,2,2,2,1,1,1,1,1,0,0,0,0,0];
const MP = 50;

/* 決勝の玉：架空の例。位置は雲の中の % */
const BALLS = [
  {v:65,x:70,squad:"fist"},{v:50,x:28,squad:"dragon"},{v:44,x:80},{v:46,x:16},
  {v:39,x:34},{v:24,x:60},{v:19,x:14},{v:12,x:78},{v:7,x:34}
];
const FAN_X = 94;
// 点数 → 縦位置（%）。50pt の点線（MP_LINE）をはさんで、点灯している玉は上、まだの玉は下に分ける
// 0pt=96%、30pt=70%、49pt=50% ／ 50pt=26%、65pt=12%
const MP_LINE = 38;
const yOf = v => Math.max(4, v >= MP ? 26 - (v-MP)*(14/15) : v <= 30 ? 96 - v*(26/30) : 70 - (v-30)*(20/19));
const cloud = $("win-cloud");
$("win-mpline").style.top = MP_LINE + "%";
const size = v => 30 + Math.min(v,70) * .42;
// チームのアイコン（3人のシルエット）
const ICONS = {fist:"img/team-a.svg", dragon:"img/team-b.svg"};
function mk(v, x, y, cls, squad){
  const b = document.createElement("div");
  b.className = "ball" + (cls ? " " + cls : "") + (v >= MP ? " lit" : "") + (squad ? " squad" : "");
  const s = size(v) + (squad ? 20 : 0);
  if(squad) y = Math.max(y, 15);
  Object.assign(b.style, {left:x+"%", top:y+"%", width:s+"px", height:s+"px", fontSize:(11 + s*.12)+"px"});
  b.innerHTML = squad ? `<img class="ico" src="${ICONS[squad]}" alt=""><span class="sc"><span class="num">${v}</span><small>pt</small></span>` : `${v}<small>pt</small>`;
  cloud.appendChild(b); return b;
}
BALLS.forEach(b=>mk(b.v,b.x,yOf(b.v),"",b.squad));
const fanBall = mk(32, FAN_X, yOf(32), "fan");

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
  // 玉
  const s = size(pts);
  fanBall.classList.toggle("lit", lit);
  Object.assign(fanBall.style, {width:s+"px", height:s+"px", fontSize:(11 + s*.12)+"px", top:yOf(pts)+"%"});
  fanBall.innerHTML = `${pts}<small>pt</small>`;
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

const bubble = document.querySelector("#win .bubble"), mpline = $("win-mpline"), tools = document.querySelector("#win .tools");
function alignBubble(){
  bubble.style.translate = tools.style.translate = ""; mpline.style.left = "";
  if(!matchMedia("(min-width:961px)").matches) return;
  const ly = mpline.getBoundingClientRect().top, b = bubble.getBoundingClientRect(), t = tools.getBoundingClientRect();
  // 口（::after）は上から 42% のところ。その中心が点線に来るように上下にずらす
  const dy = Math.round(ly - (b.top + b.height * .42 + 11));
  bubble.style.translate = `0 ${dy}px`;
  // 右のカード（計算機・スコア表）も、フキダシと同じ高さ（真ん中どうし）にそろえる
  tools.style.translate = `0 ${Math.round(b.top + dy + b.height / 2 - (t.top + t.height / 2))}px`;
  mpline.style.left = Math.round(b.right + 16 - cloud.getBoundingClientRect().left) + "px";
}
alignBubble();
addEventListener("resize", alignBubble);

/* アイコンから開く窓（上のタブで計算機とスコア表を切りかえ）。×・窓の外・Esc で閉じる
   PC は右の列に重ねて出す（後ろの玉が見えるように）、それ以外は真ん中／下から */
const wide = matchMedia("(min-width:961px)");
const dlg = $("win-dlg");
function setTab(name){
  ["calc","table"].forEach(t => {
    $("win-tab-" + t).setAttribute("aria-selected", t === name);
    $("win-pane-" + t).hidden = t !== name;
  });
}
document.querySelectorAll("#win [data-tab]").forEach(b => b.addEventListener("click", e => {
  e.stopPropagation(); setTab(b.dataset.tab);
  if(!dlg.open) wide.matches ? dlg.show() : dlg.showModal();
}));
["calc","table"].forEach(t => $("win-tab-" + t).addEventListener("click", () => setTab(t)));
dlg.addEventListener("click", e => { if(e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
document.addEventListener("click", e => { if(wide.matches && dlg.open && !e.target.closest("#win .dlg")) dlg.close(); });
document.addEventListener("keydown", e => { if(e.key === "Escape" && dlg.open) dlg.close(); });
wide.addEventListener("change", () => dlg.open && dlg.close());
if(document.fonts) document.fonts.ready.then(() => { linkFinals(); alignBubble(); });
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
if(window.ResizeObserver) new ResizeObserver(() => { linkFinals(); alignBubble(); }).observe(document.querySelector("#win .sheet"));
})();
