/* ダークモード：前に選んだもの → なければ端末の設定。左下の仮のボタンで切りかえ（ボタンは、作り終わったら外す） */
(() => {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem("theme-try"); } catch(e) {}
  const set = t => { root.dataset.theme = t; if(btn) btn.textContent = t === "dark" ? "☀ ライトにする" : "☾ ダークにする"; };
  let btn = null;
  set(saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  addEventListener("DOMContentLoaded", () => {
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "theme-try";
    btn.addEventListener("click", () => {
      const t = root.dataset.theme === "dark" ? "light" : "dark";
      set(t); try { localStorage.setItem("theme-try", t); } catch(e) {}
    });
    document.body.appendChild(btn); set(root.dataset.theme);
  });
})();
