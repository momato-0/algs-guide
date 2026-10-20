/* 開発中だけ使う「見た目の調整パネル」。URL に ?tune があるときだけ、index.html の読みこみ係がこのファイルを読む
   - 選ぶ：マウスをのせた要素に枠、クリックで選択（親・子・前・次へ移れる、Esc で解除）
   - 動かす：ドラッグで移動（translate で仮に反映。Shift で 8px 単位）。矢印キーでも 1px（Shift で 8px）
   - スライダー・数値・色で調整して、「変更をコピー」で変えたところだけを CSS で出す（画面の幅とメモも一緒に）
   - 変更はブラウザに保存（localStorage の dev-tune）。読みこみ直しても残る。window.devTune.css でも読める
   パネルは Shadow DOM の中に作るので、サイトの CSS とは混ざらない */
(() => {
  if (window.devTune) return;
  const KEY = "dev-tune";
  const TOKENS = ["--ink", "--paper", "--white", "--coral", "--coral-ink", "--yellow", "--blue", "--green", "--top", "--bot", "--muted"];

  /* ---- 変更の記録：要素 → { sel, orig（元の style 属性）, props, move, note, width } ---- */
  const entries = new Map();
  const entryOf = el => {
    let e = entries.get(el);
    if (!e) { e = { sel: selectorFor(el), orig: el.getAttribute("style"), props: {}, move: null, note: "", width: innerWidth }; entries.set(el, e); }
    return e;
  };

  /* ---- セレクタ：できるだけ既存の CSS で使っている「#id …」の形に合わせる ---- */
  function cssSelectorsMatching(el) {
    const out = new Set();
    const walk = rules => {
      for (const r of rules) {
        if (r.selectorText) {
          for (let s of r.selectorText.split(",")) {
            s = s.trim();
            if (!s.startsWith("#") || /::|:hover|:focus|:active|:has|:not\(\.open\)/.test(s)) continue;
            try { if (el.matches(s)) out.add(s); } catch (_) {}
          }
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (_) {} }
    return [...out];
  }
  function selectorFor(el) {
    if (el.id) return "#" + CSS.escape(el.id);
    const count = s => { try { return document.querySelectorAll(s).length; } catch (_) { return 99; } };
    const cands = cssSelectorsMatching(el).map(s => ({ s, n: count(s) }));
    cands.sort((a, b) => (a.n === 1 ? 0 : 1) - (b.n === 1 ? 0 : 1) || a.s.length - b.s.length);
    if (cands.length && cands[0].n === 1) return cands[0].s;
    // 見つからなければ、近くの id から組み立てる
    const anc = el.parentElement && el.parentElement.closest("[id]");
    const base = anc ? "#" + CSS.escape(anc.id) + " " : "";
    let part = [...el.classList].map(c => "." + CSS.escape(c)).join("") || el.tagName.toLowerCase();
    let s = base + part;
    if (count(s) > 1) {
      const sib = [...el.parentElement.children].filter(c => c.tagName === el.tagName);
      s = base + part + ":nth-of-type(" + (sib.indexOf(el) + 1) + ")";
      if (count(s) !== 1 && cands.length) return cands[0].s;
    }
    return s;
  }

  /* ---- 調整できる項目 ---- */
  const px = v => parseFloat(v) || 0;
  const FIELDS = [
    { g: "配置", k: "margin-top", label: "margin 上" }, { g: "配置", k: "margin-right", label: "margin 右" },
    { g: "配置", k: "margin-bottom", label: "margin 下" }, { g: "配置", k: "margin-left", label: "margin 左" },
    { g: "配置", k: "padding-top", label: "padding 上", min0: true }, { g: "配置", k: "padding-right", label: "padding 右", min0: true },
    { g: "配置", k: "padding-bottom", label: "padding 下", min0: true }, { g: "配置", k: "padding-left", label: "padding 左", min0: true },
    { g: "文字", k: "font-size", label: "大きさ px", step: .5 },
    { g: "文字", k: "letter-spacing", label: "字間 em", step: .005, unit: "em" },
    { g: "文字", k: "line-height", label: "行間（倍）", step: .05, unit: "" },
    { g: "形", k: "width", label: "幅 px", min0: true },
    { g: "形", k: "rotate", label: "回転 deg", step: .25, unit: "deg" },
  ];
  const COLORS = [{ k: "color", label: "文字の色" }, { k: "background-color", label: "地の色" }, { k: "border-color", label: "線の色" }];
  function current(el, f) {
    const cs = getComputedStyle(el), fs = px(cs.fontSize);
    if (f.k === "letter-spacing") return cs.letterSpacing === "normal" ? 0 : +(px(cs.letterSpacing) / fs).toFixed(3);
    if (f.k === "line-height") return cs.lineHeight === "normal" ? 1.2 : +(px(cs.lineHeight) / fs).toFixed(2);
    if (f.k === "rotate") return cs.rotate === "none" ? 0 : px(cs.rotate);
    return +px(cs.getPropertyValue(f.k)).toFixed(1);
  }
  function range(f, v) {
    if (f.k === "letter-spacing") return [-.2, .4];
    if (f.k === "line-height") return [.8, 3];
    if (f.k === "rotate") return [-30, 30];
    if (f.k === "font-size") return [6, Math.max(48, Math.ceil(v * 2))];
    if (f.k === "width") return [0, Math.max(400, Math.ceil(v * 2))];
    return [f.min0 ? 0 : Math.floor(v - 80), Math.ceil(v + 80)];
  }
  const fmt = (f, v) => f.unit === undefined ? v + "px" : v + f.unit;

  /* ---- 移動（translate）：元の translate に足す ---- */
  function applyMove(el, e) {
    if (!e.move) return;
    const [bx, by] = e.move.base;
    el.style.translate = `calc(${bx} + ${e.move.x}px) calc(${by} + ${e.move.y}px)`;
  }
  function moveBy(el, dx, dy) {
    const e = entryOf(el);
    if (!e.move) {
      const t = getComputedStyle(el).translate;
      const p = t === "none" ? ["0px", "0px"] : t.split(" ");
      e.move = { x: 0, y: 0, base: [p[0], p[1] || "0px"] };
    }
    e.move.x += dx; e.move.y += dy; e.width = innerWidth;
    applyMove(el, e); save(); renderInfo();
  }

  /* ---- 出力（CSS の差分） ---- */
  function cssText() {
    const groups = new Map();
    for (const e of entries.values()) {
      const has = Object.keys(e.props).length || (e.move && (e.move.x || e.move.y)) || e.note;
      if (!has) continue;
      if (!groups.has(e.width)) groups.set(e.width, []);
      groups.get(e.width).push(e);
    }
    const out = [];
    for (const [w, list] of groups) {
      out.push(`/* 画面の幅 ${w}px で調整 */`);
      for (const e of list) {
        const lines = [];
        let n = 0; try { n = document.querySelectorAll(e.sel).length; } catch (_) {}
        if (n > 1) lines.push(`  /* ※このセレクタは ${n} 個の要素に当たる */`);
        if (e.note) lines.push(`  /* メモ: ${e.note.replace(/\*\//g, "* /")} */`);
        if (e.move && (e.move.x || e.move.y)) lines.push(`  /* 移動: x=${e.move.x >= 0 ? "+" : ""}${e.move.x}px y=${e.move.y >= 0 ? "+" : ""}${e.move.y}px（仮。margin などに直す） */`);
        for (const [k, v] of Object.entries(e.props)) lines.push(`  ${k}: ${v};`);
        out.push(`${e.sel} {\n${lines.join("\n")}\n}`);
      }
    }
    return out.join("\n") || "/* 変更なし */";
  }
  function save() {
    try {
      const list = [...entries.values()].map(({ sel, props, move, note, width }) => ({ sel, props, move, note, width }));
      localStorage.setItem(KEY, JSON.stringify({ entries: list, css: cssText() }));
    } catch (_) {}
    renderCount(); drawPins();
  }
  function restore() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (_) {}
    if (!data || !data.entries) return;
    for (const d of data.entries) {
      let el = null; try { el = document.querySelector(d.sel); } catch (_) {}
      if (!el) continue;
      const e = entryOf(el);
      Object.assign(e, { props: d.props || {}, move: d.move, note: d.note || "", width: d.width });
      for (const [k, v] of Object.entries(e.props)) el.style.setProperty(k, v);
      applyMove(el, e);
    }
  }
  function resetEl(el) {
    const e = entries.get(el); if (!e) return;
    if (e.orig === null) el.removeAttribute("style"); else el.setAttribute("style", e.orig);
    entries.delete(el); save();
  }

  /* ---- パネル（Shadow DOM） ---- */
  const host = document.createElement("div");
  host.id = "dev-tune-host";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    *{box-sizing:border-box;font:12px/1.4 system-ui,"Hiragino Sans","Yu Gothic UI",sans-serif;color:#111}
    .box{position:fixed;pointer-events:none;border:2px solid #0a84ff;background:rgba(10,132,255,.08);border-radius:2px}
    .box.sel{border-color:#ff2d55;background:rgba(255,45,85,.06)}
    .box span{position:absolute;left:-2px;top:-20px;padding:1px 5px;background:#ff2d55;color:#fff;font-size:11px;white-space:nowrap;border-radius:3px}
    .pin{position:fixed;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:#ff9500;color:#fff;font-weight:700;display:grid;place-items:center;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.4);pointer-events:auto;cursor:pointer}
    .panel{position:fixed;right:12px;bottom:12px;width:min(320px,calc(100vw - 16px));max-height:min(80vh,640px);display:flex;flex-direction:column;background:#fff;border:1px solid #bbb;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);pointer-events:auto;overflow:hidden}
    .head{display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f2f2f2;border-bottom:1px solid #ddd;cursor:move;user-select:none;touch-action:none}
    .head b{font-weight:700} .head .w{margin-left:auto;color:#666}
    .body{overflow:auto;padding:8px;display:grid;gap:8px}
    .panel.min .body{display:none}
    @media (max-width:600px){.panel{max-height:46vh}.panel .hint{display:none}}
    button{padding:4px 8px;border:1px solid #bbb;border-radius:6px;background:#fff;cursor:pointer}
    button:hover{background:#f4f4f4} button[aria-pressed="true"]{background:#0a84ff;border-color:#0a84ff;color:#fff}
    .seg{display:flex;gap:4px} .seg button{flex:1}
    .sel-name{font-family:ui-monospace,Consolas,monospace;font-size:11px;word-break:break-all;padding:4px 6px;background:#f7f7f7;border-radius:4px;min-height:24px}
    .nav{display:flex;gap:4px;flex-wrap:wrap} .nav button{flex:1}
    details{border:1px solid #e3e3e3;border-radius:6px;padding:4px 6px} summary{cursor:pointer;font-weight:700}
    .row{display:grid;grid-template-columns:78px 1fr 62px;align-items:center;gap:6px;margin-top:4px}
    .row input[type=number]{width:100%;padding:2px 4px;border:1px solid #bbb;border-radius:4px}
    .row input[type=range]{width:100%}
    .row.ch label{color:#ff2d55;font-weight:700}
    .crow{display:grid;grid-template-columns:78px 34px 1fr;align-items:center;gap:6px;margin-top:4px}
    .crow input[type=color]{width:34px;height:24px;padding:0;border:1px solid #bbb}
    .crow input[type=text]{width:100%;padding:2px 4px;border:1px solid #bbb;border-radius:4px;font-family:ui-monospace,Consolas,monospace;font-size:11px}
    .sw{display:flex;flex-wrap:wrap;gap:3px;margin:2px 0 0 84px} .sw button{width:20px;height:20px;padding:0;border-radius:4px}
    textarea{width:100%;min-height:44px;padding:4px;border:1px solid #bbb;border-radius:4px;resize:vertical}
    .foot{display:flex;gap:4px;flex-wrap:wrap} .foot button{flex:1}
    .count{color:#666} .hint{color:#777;font-size:11px}
    .toast{position:fixed;left:50%;bottom:20px;translate:-50% 0;padding:6px 12px;background:#111;color:#fff;border-radius:6px;opacity:0;transition:opacity .2s;pointer-events:none}
    .toast.on{opacity:1}
  </style>
  <div class="box hov" hidden></div><div class="box sel" hidden><span></span></div><div class="pins"></div>
  <div class="panel">
    <div class="head"><b>調整パネル</b><span class="w"></span><button class="min-btn" title="たたむ">—</button></div>
    <div class="body">
      <div class="seg mode"><button data-m="off">ふつう</button><button data-m="pick">選ぶ</button><button data-m="move">動かす</button></div>
      <div class="hint">選ぶ：クリックで選択 ／ 動かす：ドラッグ（Shift で 8px）・矢印キー ／ Esc：解除</div>
      <div class="sel-name">（まだ選んでない）</div>
      <div class="nav"><button data-n="parent">親へ</button><button data-n="child">子へ</button><button data-n="prev">前へ</button><button data-n="next">次へ</button></div>
      <div class="fields"></div>
      <details open><summary>メモ</summary><textarea class="note" placeholder="例：ここ弱い／もっと右に寄せたい"></textarea><button class="note-btn">メモを付ける</button></details>
      <div class="foot"><button class="reset-one">この要素を戻す</button><button class="reset-all">全部戻す</button><button class="copy">変更をコピー</button></div>
      <div class="count"></div>
    </div>
  </div>
  <div class="toast"></div>`;
  const $ = s => root.querySelector(s);
  const panel = $(".panel"), hov = $(".hov"), selBox = $(".box.sel");

  /* 項目の欄を作る */
  const groups = {};
  for (const f of FIELDS) {
    if (!groups[f.g]) {
      const d = document.createElement("details"); d.open = f.g !== "形";
      d.innerHTML = `<summary>${f.g}</summary>`; $(".fields").appendChild(d); groups[f.g] = d;
    }
    const row = document.createElement("div"); row.className = "row"; row.dataset.k = f.k;
    row.innerHTML = `<label>${f.label}</label><input type="range"><input type="number">`;
    groups[f.g].appendChild(row); f.row = row;
    const [r, n] = row.querySelectorAll("input");
    r.step = n.step = f.step || 1;
    const set = v => {
      if (!sel || v === "" || isNaN(+v)) return;
      v = +(+v).toFixed(3); r.value = n.value = v;
      const e = entryOf(sel);
      if (v === f.init && !(f.k in e.props)) return;
      sel.style.setProperty(f.k, fmt(f, v));
      e.props[f.k] = fmt(f, v); e.width = innerWidth; row.classList.add("ch"); save();
    };
    r.addEventListener("input", () => set(r.value)); n.addEventListener("input", () => set(n.value));
  }
  const cg = document.createElement("details"); cg.innerHTML = "<summary>色</summary>"; $(".fields").appendChild(cg);
  for (const c of COLORS) {
    const row = document.createElement("div");
    row.innerHTML = `<div class="crow"><label>${c.label}</label><input type="color"><input type="text" placeholder="var(--ink) / rgba(…)"></div><div class="sw"></div>`;
    cg.appendChild(row); c.row = row;
    const [pick, txt] = row.querySelectorAll("input");
    const set = v => {
      if (!sel || !v) return;
      sel.style.setProperty(c.k, v);
      const e = entryOf(sel); e.props[c.k] = v; e.width = innerWidth; txt.value = v; row.querySelector("label").style.color = "#ff2d55"; save();
    };
    pick.addEventListener("input", () => set(pick.value));
    txt.addEventListener("change", () => set(txt.value.trim()));
    const sw = row.querySelector(".sw");
    for (const t of TOKENS) {
      const b = document.createElement("button"); b.title = t;
      b.style.background = getComputedStyle(document.documentElement).getPropertyValue(t);
      b.addEventListener("click", () => set(`var(${t})`)); sw.appendChild(b);
    }
  }
  const toHex = rgb => {
    const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return "#000000";
    return "#" + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, "0")).join("");
  };

  /* ---- 選択 ---- */
  let sel = null, mode = "off";
  function select(el) {
    sel = el; hov.hidden = true;
    if (!el) { selBox.hidden = true; $(".sel-name").textContent = "（まだ選んでない）"; return; }
    const e = entries.get(el);
    $(".sel-name").textContent = e ? e.sel : selectorFor(el);
    for (const f of FIELDS) {
      const [r, n] = f.row.querySelectorAll("input");
      const v = current(el, f); f.init = e && f.k in e.props ? null : v;
      const [mn, mx] = range(f, v); r.min = mn; r.max = mx; r.value = n.value = v;
      f.row.classList.toggle("ch", !!(e && f.k in e.props));
    }
    const cs = getComputedStyle(el);
    for (const c of COLORS) {
      const [pick, txt] = c.row.querySelectorAll("input");
      const v = e && e.props[c.k] ? e.props[c.k] : cs.getPropertyValue(c.k);
      pick.value = toHex(cs.getPropertyValue(c.k)); txt.value = v;
      c.row.querySelector("label").style.color = e && e.props[c.k] ? "#ff2d55" : "";
    }
    $(".note").value = e ? e.note : "";
    renderInfo();
  }
  function renderInfo() {
    if (!sel) return;
    const e = entries.get(sel);
    const m = e && e.move && (e.move.x || e.move.y) ? `（移動 x=${e.move.x} y=${e.move.y}）` : "";
    $(".sel-name").textContent = (e ? e.sel : selectorFor(sel)) + m;
  }
  function renderCount() {
    const list = [...entries.values()];
    $(".count").textContent = `変更 ${list.filter(e => Object.keys(e.props).length || (e.move && (e.move.x || e.move.y))).length} か所・メモ ${list.filter(e => e.note).length} 件`;
  }
  const place = (box, el) => {
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
  };
  // メモのピン：変わったときに作り直し、位置は毎フレーム置き直す
  let pins = [];
  function drawPins() {
    const wrap = $(".pins"); wrap.textContent = ""; pins = [];
    let i = 0;
    for (const [el, e] of entries) {
      if (!e.note) continue;
      const p = document.createElement("div"); p.className = "pin"; p.textContent = ++i; p.title = e.note;
      p.addEventListener("click", () => select(el)); wrap.appendChild(p); pins.push([p, el]);
    }
  }
  // 選んだ枠とピンは、スクロールや動きに合わせて毎フレーム置き直す
  (function loop() {
    if (sel && sel.isConnected) { selBox.hidden = false; place(selBox, sel); selBox.querySelector("span").textContent = $(".sel-name").textContent.split("（")[0]; }
    else selBox.hidden = true;
    for (const [p, el] of pins) {
      const r = el.isConnected ? el.getBoundingClientRect() : null;
      p.hidden = !r || (!r.width && !r.height);
      if (r) { p.style.left = r.left + "px"; p.style.top = r.top + "px"; }
    }
    $(".w").textContent = `幅 ${innerWidth}px`;
    requestAnimationFrame(loop);
  })();

  /* ---- モードと操作 ---- */
  function setMode(m) {
    mode = m;
    root.querySelectorAll(".mode button").forEach(b => b.setAttribute("aria-pressed", b.dataset.m === m));
    if (m !== "pick") hov.hidden = true;
    document.documentElement.style.cursor = m === "pick" ? "crosshair" : m === "move" ? "move" : "";
  }
  root.querySelectorAll(".mode button").forEach(b => b.addEventListener("click", () => setMode(b.dataset.m)));
  const inPanel = ev => ev.composedPath().includes(host);
  document.addEventListener("mousemove", ev => {
    if (mode !== "pick" || inPanel(ev)) return;
    hov.hidden = false; place(hov, ev.target);
  }, true);
  let drag = null;
  document.addEventListener("pointerdown", ev => {
    if (mode === "off" || inPanel(ev)) return;
    ev.preventDefault(); ev.stopPropagation();
    if (mode === "pick") { select(ev.target); return; }
    if (mode === "move" && sel) {
      const e = entryOf(sel);
      drag = { x: ev.clientX, y: ev.clientY, sx: e.move ? e.move.x : 0, sy: e.move ? e.move.y : 0 };
    }
  }, true);
  document.addEventListener("pointermove", ev => {
    if (!drag || !sel) return;
    const st = ev.shiftKey ? 8 : 1;
    const nx = drag.sx + Math.round((ev.clientX - drag.x) / st) * st, ny = drag.sy + Math.round((ev.clientY - drag.y) / st) * st;
    const e = entryOf(sel); moveBy(sel, nx - (e.move ? e.move.x : 0), ny - (e.move ? e.move.y : 0));
  }, true);
  document.addEventListener("pointerup", () => { drag = null; }, true);
  // 選ぶ・動かすの間は、サイトのクリック（窓をひらく等）を止める
  document.addEventListener("click", ev => { if (mode !== "off" && !inPanel(ev)) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  document.addEventListener("keydown", ev => {
    // パネルの入力欄に書いている間は、矢印キーで動かさない（ボタンを押しただけなら動かす）
    const typing = document.activeElement === host && /^(INPUT|TEXTAREA|SELECT)$/.test(root.activeElement && root.activeElement.tagName);
    if (ev.key === "Escape") {
      if (sel) { select(null); ev.preventDefault(); ev.stopPropagation(); }
      else if (mode !== "off") { setMode("off"); ev.preventDefault(); ev.stopPropagation(); }
      return;
    }
    if (typing || !sel) return;
    const st = ev.shiftKey ? 8 : 1;
    const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[ev.key];
    if (d) { ev.preventDefault(); moveBy(sel, d[0], d[1]); }
  }, true);
  root.querySelectorAll(".nav button").forEach(b => b.addEventListener("click", () => {
    if (!sel) return;
    const n = { parent: sel.parentElement, child: sel.firstElementChild, prev: sel.previousElementSibling, next: sel.nextElementSibling }[b.dataset.n];
    if (n && n !== document.documentElement && n !== host) select(n);
  }));
  $(".note-btn").addEventListener("click", () => {
    if (!sel) return;
    const e = entryOf(sel); e.note = $(".note").value.trim(); e.width = innerWidth; save(); toast(e.note ? "メモを付けたよ" : "メモを消したよ");
  });
  $(".reset-one").addEventListener("click", () => { if (sel) { const el = sel; resetEl(el); select(el); } });
  $(".reset-all").addEventListener("click", () => { for (const el of [...entries.keys()]) resetEl(el); select(sel); toast("全部戻したよ"); });
  $(".copy").addEventListener("click", async () => {
    const t = cssText();
    try { await navigator.clipboard.writeText(t); toast("コピーしたよ"); }
    catch (_) { prompt("コピーしてね", t); }
  });
  function toast(t) { const el = $(".toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 1400); }

  /* パネルを動かす・たたむ */
  $(".min-btn").addEventListener("click", () => panel.classList.toggle("min"));
  let pd = null;
  $(".head").addEventListener("pointerdown", ev => {
    if (ev.target.closest("button")) return;
    const r = panel.getBoundingClientRect(); pd = { dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    $(".head").setPointerCapture(ev.pointerId);
  });
  $(".head").addEventListener("pointermove", ev => {
    if (!pd) return;
    const x = Math.min(Math.max(0, ev.clientX - pd.dx), innerWidth - 60), y = Math.min(Math.max(0, ev.clientY - pd.dy), innerHeight - 30);
    Object.assign(panel.style, { left: x + "px", top: y + "px", right: "auto", bottom: "auto" });
  });
  $(".head").addEventListener("pointerup", () => { pd = null; });

  /* ---- 窓（showModal）が開いている間は、窓の外がさわれなくなるので、パネルを窓の中に引っこす ---- */
  function home() {
    const open = [...document.querySelectorAll("dialog[open]")].filter(d => d.matches(":modal")).pop();
    const parent = open || document.body;
    if (host.parentNode !== parent) parent.appendChild(host);
  }
  new MutationObserver(home).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });

  const start = () => { home(); restore(); setMode("off"); renderCount(); drawPins(); if (innerWidth <= 600) panel.classList.add("min"); };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", start); else start();

  /* こっち（Claude）から読むための入り口 */
  window.devTune = { get css() { return cssText(); }, get entries() { return [...entries.values()].map(({ sel, props, move, note, width }) => ({ sel, props, move, note, width })); } };
})();
