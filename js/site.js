/* サイト共通の動き：スマホのメニュー（紙のパネル）・観戦しにいく（テレビのまわりに出る3つのリンク）・ことばの切りかえ */
(function(){
const $ = id => document.getElementById(id);

/* スマホのメニュー。外の暗いところ・とじる・Esc・リンクを押すと閉じる */
const drawer = $("drawer"), openBtn = $("nav-open");
function setDrawer(on){
  drawer.classList.toggle("open", on); openBtn.setAttribute("aria-expanded", on);
  if(on) $("nav-close").focus(); else openBtn.focus({preventScroll:true});
}
openBtn.addEventListener("click", () => setDrawer(true));
$("nav-close").addEventListener("click", () => setDrawer(false));
drawer.addEventListener("click", e => { if(e.target === drawer || e.target.closest("a")) setDrawer(false); });

/* ボタンのそばに出る小さいパネル（観戦・ことば）。外を押す・Esc・中のリンクを押すと閉じる */
function popup(btn, panel){
  const set = on => { panel.hidden = !on; btn.setAttribute("aria-expanded", on); };
  btn.addEventListener("click", e => { e.stopPropagation(); set(panel.hidden); });
  document.addEventListener("click", e => { if(!panel.hidden && !panel.contains(e.target)) set(false); });
  panel.addEventListener("click", e => { if(e.target.closest("a")) set(false); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && !panel.hidden){ set(false); btn.focus(); } });
  return set;
}
const setWatch = popup($("tv-btn"), $("watch"));
popup($("lang-btn"), $("lang-menu"));
// スマホのメニューの「LIVE を観にいく」は、メニューを閉じてからテレビのまわりに出す
document.querySelectorAll("[data-watch]").forEach(b => b.addEventListener("click", e => {
  e.stopPropagation(); setDrawer(false); setWatch(true);
}));
document.addEventListener("keydown", e => { if(e.key === "Escape" && drawer.classList.contains("open")) setDrawer(false); });
})();
