# ALGS ゆるガイド

ALGS をもっと気軽に観るための、ファンが作った非公式ガイド。GitHub Pages で公開する。
見た目は Figma Make のデザイン（クリームの紙・深緑の太い線・ずらした影）がもと。決まりごとは `.claude/skills/yuru-design/SKILL.md` にまとめてある。

## フォルダ構成

- `index.html` … トップページ（ナビ・ヒーロー・「まずは、ここから。」のカード・フッター）
- `css/base.css` … サイト共通（色・文字・ナビ・観戦しにいく・ヒーロー・カード・フッター）
- `js/site.js` … サイト共通の動き（スマホのメニュー・観戦しにいく・ことばの切りかえ）
- `css/<セクションID>.css` … セクションごとの見た目。セレクタは全部 `#<セクションID>` から始める
- `js/<セクションID>.js` … セクションごとの動き。ID は `<セクションID>-` で始める
- `img/` … 画像

## カード

| ID | 内容 | 状態 |
|---|---|---|
| win | 01 どうなったら勝ち？（スライド・計算機・スコア表・決勝までの道） | できた |
| maps | 02 マップくわしく | 準備中 |
| teams | 03 注目チーム | 準備中 |
| ban | 04 BANシステム | 準備中 |

## 素材のクレジット

- マッチポイント形式のスライドのアイコン（img/team-apple.png・team-beer.png・team-cat.png）：Flaticon（Magnific）。クレジットはページ下のフッター（Thanks to）に表示
- スライドのスタート画面のタイトル（img/s1-txt-1〜4.svg）：Haramase-Nyanko font by Haru Inatsuka（アウトライン化）。クレジットはページ下のフッター（Thanks to）に表示
