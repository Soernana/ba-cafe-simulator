import { mkdir, readFile, writeFile } from "node:fs/promises";

const raw = JSON.parse(await readFile("work/furniture-data.json", "utf8"));
const studentRaw = JSON.parse(await readFile("work/student-data.json", "utf8"));
raw.studentSource = studentRaw.source;
raw.studentFetchedAt = studentRaw.fetchedAt;
raw.studentCount = studentRaw.count;
raw.schools = studentRaw.schools;
raw.students = studentRaw.students;
const embedded = JSON.stringify(raw);

const html = String.raw`<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ブルーアーカイブ カフェ配置シミュレータ</title>
  <meta name="description" content="ブルーアーカイブのカフェ家具配置を手動で検討し、家具モーション対象の生徒と必要家具選択ボックス数を確認できる非公式シミュレータ。">
  <meta name="theme-color" content="#5cc8ff">
  <meta property="og:title" content="ブルーアーカイブ カフェ配置シミュレータ">
  <meta property="og:description" content="カフェ家具配置、来る生徒、必要家具選択ボックス数を確認する非公式ツール。">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%235cc8ff'/%3E%3Cpath d='M10 24h44v24a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V24Z' fill='%23fff7fb'/%3E%3Cpath d='M17 16h30a8 8 0 0 1 8 8H9a8 8 0 0 1 8-8Z' fill='%23ffd34d'/%3E%3Ccircle cx='49' cy='16' r='7' fill='%23ff6aa8'/%3E%3Cpath d='M21 33h22M21 42h15' stroke='%235a3fc8' stroke-width='5' stroke-linecap='round'/%3E%3C/svg%3E">
  <style>
    :root {
      color-scheme: light;
      --bg: #eef8ff;
      --panel: #ffffff;
      --panel-2: #fff7fb;
      --panel-3: #ecfbff;
      --line: #d9e9ff;
      --line-strong: #67b8ff;
      --text: #2b3058;
      --muted: #6b7294;
      --accent: #2f80ed;
      --accent-deep: #5a3fc8;
      --accent-2: #ff6aa8;
      --warm: #ffd34d;
      --warn: #b56b00;
      --danger: #ff5678;
      --ok: #14a477;
      --pop-pink: #ff6aa8;
      --pop-yellow: #ffd34d;
      --pop-mint: #69e2bd;
      --pop-sky: #5cc8ff;
      --pop-purple: #8c72ff;
      --shadow: 0 20px 54px rgba(48,70,140,.12);
      --shadow-soft: 0 12px 30px rgba(48,70,140,.08);
      --cell: 18px;
      --board-size: calc(var(--cell) * 20);
      font-family: "Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.64) 24rem, rgba(255,255,255,.78)),
        repeating-linear-gradient(135deg,
          rgba(92,200,255,.09) 0 34px,
          rgba(92,200,255,.09) 34px,
          rgba(255,255,255,0) 34px,
          rgba(255,255,255,0) 68px,
          rgba(255,106,168,.06) 68px,
          rgba(255,106,168,.06) 102px,
          rgba(255,255,255,0) 102px,
          rgba(255,255,255,0) 136px,
          rgba(255,211,77,.08) 136px,
          rgba(255,211,77,.08) 170px,
          rgba(255,255,255,0) 170px,
          rgba(255,255,255,0) 204px),
        linear-gradient(120deg, #f2fbff 0%, #fff8fb 48%, #fffbea 100%);
      background-attachment: fixed;
      color: var(--text);
    }

    button, input, select, textarea {
      font: inherit;
    }

    button {
      border: 1px solid #d8e7ff;
      background: linear-gradient(180deg, #fff, #f8fbff);
      color: var(--text);
      border-radius: 8px;
      padding: .55rem .7rem;
      cursor: pointer;
      min-height: 2.35rem;
      font-weight: 750;
      box-shadow: 0 2px 0 rgba(255,255,255,.95) inset, 0 3px 0 rgba(92,200,255,.16);
      transition: border-color .14s ease, background .14s ease, transform .14s ease, box-shadow .14s ease;
    }

    button:hover { border-color: #9bd5ff; background: #f1f9ff; box-shadow: var(--shadow-soft), 0 3px 0 rgba(92,200,255,.18); transform: translateY(-1px); }
    button:active { transform: translateY(0); box-shadow: none; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    button.primary { background: linear-gradient(180deg, #54b8ff, var(--accent)); color: #fff; border-color: #308de8; }
    button.primary:hover { background: linear-gradient(180deg, #6cc4ff, #3477ee); }
    button.danger { color: #b31642; border-color: #ffadc4; background: linear-gradient(180deg, #fff, #fff1f5); }
    button.ghost { background: transparent; }

    input, select, textarea {
      width: 100%;
      border: 1px solid #cfe3ff;
      background: #fff;
      border-radius: 8px;
      padding: .55rem .65rem;
      color: var(--text);
      min-height: 2.35rem;
      outline: none;
      transition: border-color .14s ease, box-shadow .14s ease;
    }

    input:focus, select:focus, textarea:focus {
      border-color: var(--accent-2);
      box-shadow: 0 0 0 4px rgba(255,106,168,.18);
    }

    textarea {
      min-height: 7rem;
      resize: vertical;
      line-height: 1.55;
    }

    label {
      display: grid;
      gap: .32rem;
      font-size: .88rem;
      color: var(--muted);
    }

    .app {
      display: grid;
      grid-template-columns: minmax(300px, 360px) minmax(560px, 1fr) minmax(300px, 360px);
      min-height: 100vh;
    }

    .sidebar, .inspector {
      background: rgba(255,255,255,.92);
      border-color: var(--line);
      border-style: solid;
      overflow: auto;
      max-height: 100vh;
      backdrop-filter: blur(20px);
    }

    .sidebar { border-width: 0 1px 0 0; }
    .inspector { border-width: 0 0 0 1px; }

    .pane {
      padding: 1.05rem;
      display: grid;
      gap: 1rem;
      align-content: start;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
      padding: 1.05rem 1.2rem .85rem;
      border-bottom: 1px solid var(--line);
      background:
        linear-gradient(90deg, rgba(255,255,255,.96), rgba(240,250,255,.94)),
        linear-gradient(135deg, rgba(255,106,168,.07), rgba(255,211,77,.08));
      box-shadow: 0 10px 28px rgba(48,70,140,.08);
    }

    .brand-lockup {
      display: grid;
      gap: .28rem;
      min-width: 0;
    }

    .kicker {
      display: inline-flex;
      width: fit-content;
      align-items: center;
      gap: .35rem;
      padding: .18rem .5rem;
      border: 1px solid #ffc3dc;
      border-radius: 999px;
      background: linear-gradient(90deg, #fff1f8, #effaff);
      color: #7b3ec8;
      font-size: .76rem;
      font-weight: 750;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.32rem, 2vw, 1.85rem);
      letter-spacing: 0;
      line-height: 1.15;
      color: #26306f;
    }

    h2 {
      font-size: 1rem;
      margin: 0;
      letter-spacing: 0;
    }

    .sub {
      margin-top: .25rem;
      color: var(--muted);
      font-size: .84rem;
      line-height: 1.45;
    }

    .status {
      display: flex;
      flex-wrap: wrap;
      gap: .45rem;
      justify-content: flex-end;
    }

    .topbar .status {
      display: none;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: .3rem;
      min-height: 1.9rem;
      padding: .28rem .55rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: linear-gradient(180deg, #fff, #f7fbff);
      color: var(--muted);
      font-size: .82rem;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(48,70,140,.08);
    }

    .pill strong { color: #26306f; font-weight: 800; }
    .pill.ok { border-color: #69e2bd; color: var(--ok); background: #effff9; }
    .pill.warn { border-color: #ffd34d; color: var(--warn); background: #fff9df; }

    .card {
      position: relative;
      overflow: hidden;
      background: var(--panel);
      border: 1px solid #d9e9ff;
      border-radius: 8px;
      padding: .95rem;
      box-shadow: var(--shadow-soft), inset 0 0 0 1px rgba(255,255,255,.72);
    }

    .card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto 0;
      height: 4px;
      background: linear-gradient(90deg, var(--pop-sky), var(--pop-pink), var(--pop-yellow), var(--pop-mint));
    }

    .controls {
      display: grid;
      gap: .65rem;
    }

    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .55rem;
    }

    .triple {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: .55rem;
    }

    .row {
      display: flex;
      gap: .55rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .checkline {
      display: flex;
      align-items: center;
      gap: .5rem;
      color: var(--text);
      font-size: .9rem;
    }

    .checkline input {
      width: 1rem;
      min-height: auto;
      accent-color: var(--accent-2);
    }

    .furniture-list {
      display: grid;
      gap: .55rem;
      max-height: calc(100vh - 23rem);
      overflow: auto;
      padding-right: .2rem;
    }

    .item {
      display: grid;
      gap: .35rem;
      padding: .7rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-2);
      cursor: pointer;
      transition: border-color .14s ease, background .14s ease, transform .14s ease;
    }

    .item:hover, .item.selected {
      border-color: var(--accent-2);
      background: linear-gradient(180deg, #fff, #effaff);
      transform: translateY(-1px);
      box-shadow: 0 10px 20px rgba(48,70,140,.10);
    }

    .item-title {
      font-size: .94rem;
      font-weight: 700;
      line-height: 1.35;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: .3rem;
      color: var(--muted);
      font-size: .78rem;
    }

    .tag {
      border: 1px solid #ffd1e2;
      background: #fff8fc;
      border-radius: 999px;
      padding: .15rem .42rem;
    }

    .motion {
      color: #7b3ec8;
      font-size: .8rem;
      line-height: 1.35;
    }

    .main {
      display: grid;
      grid-template-rows: auto 1fr;
      min-width: 0;
      background:
        linear-gradient(180deg, rgba(255,255,255,.38), rgba(255,255,255,.10)),
        repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 42px);
    }

    .workspace {
      padding: 1.05rem 1.2rem 1.25rem;
      display: grid;
      align-content: start;
      gap: .95rem;
      overflow: auto;
      min-height: 0;
      background: linear-gradient(180deg, rgba(255,255,255,.22), rgba(236,251,255,.10));
    }

    .boards-grid {
      width: 100%;
      display: grid;
      grid-template-columns: minmax(calc(var(--board-size) + 2rem), 1fr) minmax(calc(var(--board-size) + 2rem), auto);
      gap: 1rem;
      align-items: start;
    }

    .rooms-stack {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }

    .room-panel {
      display: grid;
      gap: .7rem;
      justify-items: center;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(255,247,251,.90));
      padding: .9rem;
      box-shadow: var(--shadow-soft);
    }

    .room-panel.active {
      border-color: var(--accent-2);
      box-shadow: 0 0 0 4px rgba(255,106,168,.16), var(--shadow-soft);
    }

    .stash-panel {
      display: grid;
      gap: .7rem;
      justify-items: center;
      align-content: start;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(236,251,255,.92));
      padding: .9rem;
      position: sticky;
      top: .8rem;
      box-shadow: var(--shadow-soft);
    }

    .room-panel-head {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: .6rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .board-wrap {
      width: min(100%, calc(var(--board-size) + 2rem));
      display: grid;
      gap: .65rem;
      justify-items: center;
    }

    .board-tools {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: .7rem;
      flex-wrap: wrap;
      align-items: center;
      padding: .85rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(90deg, rgba(255,247,251,.9), rgba(236,251,255,.9));
      box-shadow: var(--shadow-soft);
    }

    .board {
      position: relative;
      width: var(--board-size);
      height: var(--board-size);
      background:
        linear-gradient(to right, rgba(63,92,167,.13) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(63,92,167,.13) 1px, transparent 1px),
        linear-gradient(135deg, #ffffff, #f0fbff);
      background-size: var(--cell) var(--cell);
      border: 3px solid #7acbff;
      border-radius: 8px;
      box-shadow: 0 18px 48px rgba(48,70,140,.16), 0 0 0 5px rgba(255,211,77,.18);
      touch-action: none;
      user-select: none;
      overflow: hidden;
    }

    .board::before,
    .board::after {
      position: absolute;
      z-index: 1;
      pointer-events: none;
      color: #342c68;
      font-size: .62rem;
      font-weight: 800;
      letter-spacing: 0;
      background: rgba(140,114,255,.18);
      box-shadow: inset 0 0 0 1px rgba(140,114,255,.38);
    }

    .board::before {
      content: "壁装飾設置辺";
      top: 0;
      left: 0;
      right: 0;
      height: max(.95rem, calc(var(--cell) * .78));
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 2px solid rgba(140,114,255,.62);
    }

    .board::after {
      content: "壁装飾設置辺";
      top: 0;
      left: 0;
      bottom: 0;
      width: max(.95rem, calc(var(--cell) * .78));
      display: flex;
      align-items: center;
      justify-content: center;
      writing-mode: vertical-rl;
      border-right: 2px solid rgba(140,114,255,.62);
    }

    .axis {
      position: absolute;
      color: #6b7294;
      font-size: .72rem;
      pointer-events: none;
      z-index: 2;
    }

    .furn {
      position: absolute;
      display: grid;
      place-items: center;
      border: 2px solid rgba(47,128,237,.70);
      border-radius: 6px;
      background:
        linear-gradient(135deg, rgba(92,200,255,.26), rgba(255,211,77,.28)),
        rgba(255,255,255,.86);
      color: #26306f;
      font-size: .74rem;
      font-weight: 700;
      line-height: 1.15;
      padding: .15rem;
      text-align: center;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.78), 0 6px 16px rgba(48,70,140,.14);
      cursor: grab;
      z-index: 3;
    }

    .furn[data-motion="true"] {
      border-color: rgba(20,164,119,.82);
      background:
        linear-gradient(135deg, rgba(105,226,189,.34), rgba(255,211,77,.30)),
        rgba(255,255,255,.88);
      color: #12664f;
    }

    .furn.under-wall {
      box-shadow:
        inset 0 0 0 2px rgba(140,114,255,.62),
        inset 0 0 0 5px rgba(255,255,255,.42),
        0 5px 14px rgba(48,70,140,.14);
    }

    .furn.wall-decoration {
      border-color: rgba(140,114,255,.94);
      background:
        repeating-linear-gradient(135deg, rgba(140,114,255,.40) 0 6px, rgba(255,255,255,.28) 6px 12px),
        color-mix(in srgb, var(--furn-color, #ecfbff) 62%, transparent);
      color: #342c68;
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,.82),
        0 0 0 2px rgba(140,114,255,.30),
        0 9px 20px rgba(45,38,95,.22);
      z-index: 12;
    }

    .furn.wall-decoration::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      border-radius: 4px;
      border-top: 4px solid rgba(140,114,255,.90);
    }

    .furn.wall-decoration[data-wall-side="left"]::before {
      border-top: 0;
      border-left: 4px solid rgba(140,114,255,.90);
    }

    .furn.wall-decoration::after {
      content: attr(data-wall-label);
      position: absolute;
      right: 2px;
      bottom: 2px;
      max-width: calc(100% - 4px);
      padding: .05rem .26rem;
      border-radius: 999px;
      background: rgba(255,255,255,.9);
      color: #342c68;
      font-size: .62rem;
      font-weight: 800;
      line-height: 1.2;
      white-space: nowrap;
      box-shadow: 0 1px 4px rgba(45,38,95,.18);
    }

    .furn.wall-stacked {
      outline: 2px solid rgba(255,211,77,.92);
      outline-offset: -5px;
    }

    .furn.selected {
      outline: 3px solid rgba(255, 211, 77, .96);
      outline-offset: 2px;
      z-index: 7;
    }

    .furn.wall-decoration.selected {
      z-index: 18;
    }

    .preview {
      position: absolute;
      border: 2px dashed var(--accent);
      background: rgba(92,200,255,.20);
      pointer-events: none;
      border-radius: 6px;
      display: none;
      z-index: 30;
    }

    .preview.bad {
      border-color: var(--danger);
      background: rgba(199,59,85,.18);
    }

    .legend {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: .6rem;
      color: #3b4380;
      font-size: .83rem;
      flex-wrap: wrap;
      padding: .65rem .85rem;
      border: 1px solid #ffd1e2;
      border-radius: 8px;
      background:
        linear-gradient(90deg, rgba(255,247,251,.95), rgba(236,251,255,.95), rgba(255,249,223,.92));
      box-shadow: var(--shadow-soft);
    }

    .legend span {
      display: inline-flex;
      align-items: center;
      gap: .35rem;
      min-height: 1.75rem;
      padding: .2rem .5rem;
      border-radius: 999px;
      background: rgba(255,255,255,.7);
      border: 1px solid rgba(255,255,255,.9);
    }

    .legend span::before {
      content: "";
      width: .5rem;
      height: .5rem;
      border-radius: 999px;
      background: var(--pop-sky);
      box-shadow: 0 0 0 3px rgba(92,200,255,.18);
      flex: 0 0 auto;
    }

    .legend span:nth-child(2)::before {
      background: var(--pop-purple);
      box-shadow: 0 0 0 3px rgba(140,114,255,.18);
    }

    .legend span:nth-child(3)::before {
      background: var(--pop-yellow);
      box-shadow: 0 0 0 3px rgba(255,211,77,.22);
    }

    .placed-list {
      display: grid;
      gap: .45rem;
      max-height: 18rem;
      overflow: auto;
    }

    .placed {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: .6rem;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: .55rem;
      background: var(--panel-2);
      cursor: pointer;
    }

    .placed.selected { border-color: var(--accent-2); background: #fff1f8; box-shadow: 0 0 0 3px rgba(255,106,168,.13); }
    .placed-name { font-weight: 700; font-size: .88rem; line-height: 1.35; }
    .placed-pos { color: var(--muted); font-size: .78rem; }
    .placed-actions {
      display: grid;
      gap: .35rem;
    }
    .placed-actions button {
      min-height: 2rem;
      padding: .35rem .5rem;
      font-size: .8rem;
      white-space: nowrap;
    }

    .output {
      min-height: 9rem;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace;
      font-size: .8rem;
    }

    .student-grid {
      display: flex;
      gap: .35rem;
      flex-wrap: wrap;
      max-height: 8rem;
      overflow: auto;
    }

    .arrival-room {
      display: grid;
      gap: .5rem;
      padding: .65rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, #fff, #fff7fb);
      box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 8px 22px rgba(48,70,140,.07);
    }

    .arrival-group {
      display: grid;
      gap: .34rem;
      padding: .45rem .5rem;
      border: 1px solid #dcecff;
      border-radius: 7px;
      background: linear-gradient(180deg, #fff, #f6fbff);
    }

    .arrival-group.has-target {
      border-color: #ffb8d2;
      background: linear-gradient(180deg, #fff7fb, #fff9df);
      box-shadow: 0 0 0 3px rgba(255,106,168,.10);
    }

    .arrival-groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
      gap: .45rem;
      align-items: start;
    }

    .arrival-room-head,
    .arrival-count-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: .5rem;
    }

    .arrival-room h3 {
      margin: 0;
      font-size: 1rem;
      color: #26306f;
    }

    .arrival-count {
      color: var(--accent-deep);
      font-size: .98rem;
      font-weight: 800;
    }

    .arrival-list {
      display: flex;
      gap: .32rem;
      flex-wrap: wrap;
      max-height: 6.8rem;
      overflow: auto;
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--text);
      font-size: .84rem;
      line-height: 1.45;
    }

    .arrival-list button {
      border: 1px solid var(--line);
      border-radius: 999px;
      min-height: 1.75rem;
      padding: .2rem .48rem;
      background: linear-gradient(180deg, #fff, #fbfdff);
      color: inherit;
      cursor: pointer;
      font: inherit;
      text-align: left;
      box-shadow: none;
    }

    .arrival-list button:hover {
      color: var(--accent-deep);
      border-color: var(--accent-2);
      background: #fff1f8;
      box-shadow: none;
      transform: none;
    }

    .arrival-list button.selected-target {
      border-color: var(--accent-2);
      background: linear-gradient(180deg, #fff1f8, #fff9df);
      color: #7b2b84;
      font-weight: 750;
    }

    .student {
      border: 1px solid #dcecff;
      background: #fff;
      color: var(--text);
      border-radius: 999px;
      padding: .3rem .48rem;
      font-size: .78rem;
      cursor: pointer;
    }

    .student:hover {
      border-color: var(--accent-2);
      background: #fff1f8;
      box-shadow: none;
      transform: none;
    }

    .student.covered {
      border-color: var(--pop-mint);
      background: #effcf6;
      color: var(--ok);
    }

    .student.complete {
      border-color: var(--pop-sky);
      background: #effaff;
      color: var(--accent-deep);
      font-weight: 700;
    }

    .student.over {
      border-color: var(--pop-yellow);
      background: #fff9df;
      color: var(--warn);
      font-weight: 700;
    }

    .box-summary {
      display: grid;
      gap: .55rem;
      margin-top: .85rem;
      padding-top: .85rem;
      border-top: 1px solid var(--line);
    }

    .box-summary h3 {
      margin: 0;
      font-size: .95rem;
      letter-spacing: 0;
    }

    .summary-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: .35rem;
      margin-top: .75rem;
      padding: .24rem;
      border: 1px solid #bfe9ff;
      border-radius: 8px;
      background: linear-gradient(90deg, #effaff, #fff1f8);
    }

    .summary-tab {
      min-height: 2.15rem;
      border: 0;
      border-radius: 6px;
      padding: .3rem .4rem;
      background: transparent;
      color: var(--muted);
      font-weight: 800;
      line-height: 1.25;
      overflow-wrap: anywhere;
      cursor: pointer;
      box-shadow: none;
    }

    .summary-tab.active {
      background: linear-gradient(180deg, #fff, #fff9df);
      color: var(--accent-deep);
      box-shadow: 0 7px 16px rgba(48,70,140,.12);
    }

    .summary-tab:hover {
      background: rgba(255,255,255,.62);
      box-shadow: none;
      transform: none;
    }

    .summary-tab.active:hover {
      background: linear-gradient(180deg, #fff, #fff9df);
      box-shadow: 0 7px 16px rgba(48,70,140,.12);
    }

    .summary-panel {
      margin-top: .75rem;
    }

    .summary-panel.hidden {
      display: none;
    }

    .summary-panel .box-summary {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }

    .series-breakdown {
      display: grid;
      gap: .35rem;
      overflow: auto;
    }

    .room-summary-list {
      display: grid;
      gap: .75rem;
    }

    .series-row {
      display: flex;
      justify-content: space-between;
      gap: .7rem;
      align-items: center;
      padding: .45rem .55rem;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: linear-gradient(180deg, #fff, #fff7fb);
      font-size: .84rem;
    }

    .series-row strong {
      font-weight: 700;
      color: var(--text);
    }

    details.dropdown {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: linear-gradient(180deg, #fff, #fff7fb);
      overflow: hidden;
      box-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 8px 20px rgba(48,70,140,.06);
    }

    details.dropdown + details.dropdown {
      margin-top: .45rem;
    }

    details.dropdown summary {
      cursor: pointer;
      list-style: none;
      display: flex;
      justify-content: space-between;
      gap: .65rem;
      align-items: center;
      padding: .65rem .7rem;
      font-weight: 700;
      background: linear-gradient(90deg, rgba(255,255,255,.86), rgba(236,251,255,.74));
    }

    details.dropdown summary::-webkit-details-marker {
      display: none;
    }

    details.dropdown summary::after {
      content: "開く";
      color: var(--accent-2);
      font-size: .76rem;
      font-weight: 800;
    }

    details.dropdown[open] summary::after {
      content: "閉じる";
    }

    .dropdown-body {
      display: grid;
      gap: .45rem;
      padding: 0 .7rem .7rem;
    }

    .mini-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: .5rem;
      align-items: center;
      padding: .5rem;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      font-size: .84rem;
      box-shadow: 0 1px 0 rgba(255,255,255,.9) inset;
    }

    .mini-row button {
      min-height: 2rem;
      padding: .3rem .5rem;
      font-size: .8rem;
    }

    .owned-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: .45rem;
      align-items: start;
      padding: .5rem;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: linear-gradient(180deg, #fff, #fbfdff);
      font-size: .82rem;
      box-shadow: 0 1px 0 rgba(255,255,255,.85) inset;
    }

    .owned-row-main {
      display: grid;
      gap: .2rem;
      min-width: 0;
    }

    .owned-row strong,
    .owned-row .count-note {
      overflow-wrap: anywhere;
    }

    .owned-controls {
      display: grid;
      grid-template-columns: minmax(4.5rem, .9fr) minmax(5.2rem, .9fr) minmax(4.8rem, .9fr) minmax(5rem, 1fr);
      gap: .45rem;
      align-items: end;
    }

    .owned-row input[type="number"] {
      min-height: 2rem;
      padding: .25rem .4rem;
      text-align: right;
    }

    .owned-row .checkline {
      min-height: 2rem;
      align-items: center;
      font-size: .8rem;
    }

    .priority-group {
      display: grid;
      gap: .45rem;
      margin-top: .55rem;
    }

    .priority-group h4 {
      margin: 0;
      font-size: .86rem;
      color: var(--muted);
    }

    .priority-control {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 7rem;
      gap: .5rem;
      align-items: end;
      padding: .55rem;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: linear-gradient(180deg, #fff, #effaff);
    }

    .mobile-dock-actions,
    .mobile-stash-drop,
    .mobile-dock-tabs,
    .mobile-view-tabs,
    .mobile-picker-panel,
    .mobile-manage-list,
    .student-suggest-list {
      display: none;
    }

    .dock-panel {
      display: grid;
      gap: .65rem;
    }

    .dock-panel-ops,
    .dock-panel-picker {
      display: none;
    }

    .count-note {
      color: var(--muted);
      font-size: .76rem;
      line-height: 1.35;
    }

    .empty {
      color: var(--muted);
      font-size: .86rem;
      line-height: 1.5;
      padding: .8rem;
      border: 1px dashed var(--accent-2);
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(255,247,251,.82), rgba(236,251,255,.82));
    }

    .notice {
      padding: .65rem .75rem;
      border-radius: 8px;
      background: linear-gradient(180deg, #fff9df, #fff7fb);
      border: 1px solid #ffd34d;
      color: #6d4d00;
      font-size: .84rem;
      line-height: 1.45;
    }

    .source {
      color: var(--muted);
      font-size: .78rem;
      line-height: 1.45;
    }

    .source a { color: var(--accent); }

    .site-footer {
      border-top: 1px solid var(--line);
      background:
        linear-gradient(90deg, rgba(236,251,255,.95), rgba(255,247,251,.95), rgba(255,249,223,.92));
      padding: 1rem clamp(.9rem, 2vw, 1.4rem);
    }

    .site-footer-inner {
      display: grid;
      gap: .65rem;
      max-width: 1180px;
      margin: 0 auto;
    }

    .site-footer h2 {
      margin: 0;
      font-size: .95rem;
      letter-spacing: 0;
      color: #26306f;
    }

    @media (max-width: 1600px) {
      .boards-grid { grid-template-columns: 1fr; }
      .stash-panel { position: static; }
    }

    @media (max-width: 1380px) {
      :root { --cell: 20px; }
      .app {
        grid-template-columns: minmax(280px, 330px) minmax(520px, 1fr);
      }
      .inspector {
        grid-column: 1 / -1;
        border-width: 1px 0 0;
        max-height: none;
      }
      .inspector .pane {
        grid-template-columns: repeat(2, minmax(280px, 1fr));
        align-items: start;
      }
    }

    @media (max-width: 820px) {
      :root { --cell: clamp(15px, 4.45vw, 21px); }
      body { background-attachment: scroll; }
      .app {
        display: flex;
        flex-direction: column;
        min-height: auto;
        padding-bottom: 18rem;
      }
      .main { order: 1; }
      .sidebar { order: 2; }
      .inspector { order: 3; }
      .sidebar { max-height: none; border-width: 1px 0 0; }
      .mobile-view-tabs {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .35rem;
        padding: .22rem;
        border: 1px solid #bfe9ff;
        border-radius: 8px;
        background: linear-gradient(90deg, #effaff, #fff7fb);
      }
      .mobile-view-tab {
        min-height: 2.15rem;
        border: 0;
        border-radius: 6px;
        background: transparent;
        box-shadow: none;
        color: var(--muted);
        font-weight: 850;
      }
      .mobile-view-tab.active {
        color: var(--accent-deep);
        background: #fff;
        box-shadow: 0 6px 14px rgba(48,70,140,.10);
      }
      body.mobile-view-summary .workspace,
      body.mobile-view-summary .inspector {
        display: none;
      }
      body.mobile-view-summary .app {
        padding-bottom: 0;
      }
      body.mobile-view-cafe .sidebar {
        display: none;
      }
      .inspector {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 70;
        max-height: min(50dvh, 22rem);
        border-width: 1px 0 0;
        border-radius: 8px 8px 0 0;
        box-shadow: 0 -14px 34px rgba(48,70,140,.18);
        overflow: auto;
      }
      .topbar {
        position: static;
        display: grid;
        gap: .75rem;
        padding: .85rem .9rem .75rem;
      }
      h1 { font-size: 1.18rem; line-height: 1.25; }
      h2 { font-size: .96rem; }
      .sub { font-size: .8rem; }
      .status { justify-content: flex-start; }
      .topbar .pill {
        justify-content: center;
        min-width: 0;
        white-space: normal;
      }
      .pane { padding: .8rem; gap: .8rem; }
      .workspace { padding: .75rem; gap: .75rem; }
      .inspector .pane {
        display: grid;
        grid-template-columns: 1fr;
        padding: .55rem .65rem .7rem;
        gap: .55rem;
      }
      .inspector .card {
        padding: .65rem;
      }
      .inspector .card > .row:first-child {
        align-items: center;
        margin-bottom: .35rem;
      }
      .inspector .card h2 {
        font-size: .9rem;
      }
      .inspector .controls {
        gap: .45rem;
        margin-top: .35rem !important;
      }
      .mobile-dock-tabs {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: .3rem;
        padding: .22rem;
        border: 1px solid #bfe9ff;
        border-radius: 8px;
        background: linear-gradient(90deg, #effaff, #fff7fb);
      }
      .mobile-dock-tab {
        min-height: 2.05rem;
        padding: .28rem .25rem;
        border: 0;
        border-radius: 6px;
        background: transparent;
        box-shadow: none;
        color: var(--muted);
        font-size: .74rem;
        font-weight: 850;
        line-height: 1.15;
      }
      .mobile-dock-tab.active {
        color: var(--accent-deep);
        background: #fff;
        box-shadow: 0 6px 14px rgba(48,70,140,.10);
      }
      .dock-panel {
        display: none;
        gap: .45rem;
      }
      .dock-panel.active {
        display: grid;
      }
      .mobile-picker-panel,
      .mobile-manage-list {
        display: grid;
      }
      .inspector label {
        gap: .22rem;
        font-size: .78rem;
      }
      .inspector input {
        min-height: 2.15rem;
        padding: .42rem .55rem;
      }
      .student-suggest-list {
        display: grid;
        gap: .28rem;
        max-height: 8rem;
        overflow: auto;
      }
      .student-suggest-list.hidden {
        display: none;
      }
      .student-suggest-list button {
        min-height: 2rem;
        padding: .32rem .5rem;
        border-color: #d9e9ff;
        box-shadow: none;
        text-align: left;
      }
      .inspector .row {
        gap: .4rem;
      }
      .inspector .box-summary {
        margin-top: .2rem !important;
        padding-top: .45rem !important;
        gap: .45rem;
      }
      #selectedStudentList {
        display: none;
        max-height: 9rem;
        overflow: auto;
      }
      .mobile-picker-panel {
        gap: .45rem;
      }
      .mobile-picker-list {
        display: grid;
        gap: .4rem;
        max-height: 9.5rem;
        overflow: auto;
      }
      .mobile-manage-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: .35rem;
        max-height: 7rem;
        overflow: auto;
      }
      .mobile-student-chip {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: .3rem;
        padding: .35rem .4rem;
        border: 1px solid #d9e9ff;
        border-radius: 8px;
        background: #fff;
        font-size: .78rem;
      }
      .mobile-student-chip span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .mobile-student-chip button {
        min-height: 1.8rem;
        padding: .18rem .38rem;
        font-size: .75rem;
      }
      .mobile-manage-list .empty {
        grid-column: 1 / -1;
      }
      .legend {
        display: grid;
        grid-template-columns: 1fr;
        gap: .4rem;
        padding: .55rem;
      }
      .board-tools { display: none; }
      .mobile-dock-actions {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: .35rem;
      }
      .mobile-dock-actions button {
        width: 100%;
        min-height: 2.2rem;
        padding: .35rem .3rem;
        font-size: .76rem;
        line-height: 1.15;
      }
      .mobile-stash-drop {
        display: grid;
        place-items: center;
        min-height: 2.55rem;
        border: 2px dashed #9bd5ff;
        border-radius: 8px;
        background: linear-gradient(180deg, #f5fbff, #fff7fb);
        color: #3b4380;
        font-size: .82rem;
        font-weight: 800;
        text-align: center;
        transition: border-color .14s ease, background .14s ease, box-shadow .14s ease;
      }
      .mobile-stash-drop.drag-over {
        border-color: var(--accent);
        background: #effaff;
        box-shadow: 0 0 0 4px rgba(92,200,255,.18);
      }
      .mobile-stash-drop.bad {
        border-color: var(--danger);
        background: #fff1f5;
        color: #b31642;
      }
      .boards-grid { grid-template-columns: 1fr; }
      .rooms-stack { gap: .8rem; }
      .room-panel,
      .stash-panel {
        padding: .7rem;
        gap: .6rem;
      }
      .room-panel-head {
        display: grid;
        grid-template-columns: 1fr;
        justify-items: stretch;
      }
      .room-panel-head .status {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .stash-panel { position: static; }
      .board-wrap {
        width: 100%;
        overflow-x: auto;
        justify-items: center;
        padding-bottom: .15rem;
      }
      .board {
        max-width: calc(100vw - 1.5rem);
        max-height: calc(100vw - 1.5rem);
      }
      .axis { font-size: .64rem; }
      .furn { font-size: .62rem; padding: .08rem; border-width: 1px; }
      .furn.wall-decoration::after { font-size: .54rem; }
      .summary-tabs { grid-template-columns: 1fr; }
      .summary-tab { min-height: 2.35rem; }
      .arrival-groups { grid-template-columns: 1fr; }
      .arrival-list { max-height: 8.5rem; }
      .owned-controls {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-items: stretch;
      }
      .owned-row input[type="number"] { width: 100%; }
      .mini-row {
        grid-template-columns: 1fr;
        padding: .45rem;
      }
      .mini-row button {
        width: 100%;
      }
      .split, .triple { grid-template-columns: 1fr; }
    }

    @media (max-width: 430px) {
      :root { --cell: clamp(14px, 4.25vw, 18px); }
      button, input, select, textarea { font-size: .9rem; }
      .room-panel-head .status,
      .owned-controls {
        grid-template-columns: 1fr;
      }
      .app { padding-bottom: 20rem; }
      .inspector { max-height: min(56dvh, 24rem); }
      .mobile-dock-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .pill {
        width: 100%;
        justify-content: center;
      }
      .card { padding: .8rem; }
      .board::before,
      .board::after {
        font-size: .5rem;
      }
      .furn {
        font-size: .55rem;
        line-height: 1.05;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="pane">
        <section class="card">
          <div class="row" style="justify-content:space-between">
            <h2>集計</h2>
          </div>
          <div class="summary-tabs" role="tablist" aria-label="集計表示">
            <button id="summaryTabStudents" class="summary-tab active" type="button" role="tab" aria-selected="true" aria-controls="targetStudentsPanel" data-summary-tab="students">対象生徒</button>
            <button id="summaryTabBoxes" class="summary-tab" type="button" role="tab" aria-selected="false" aria-controls="requiredBoxesPanel" data-summary-tab="boxes">必要家具選択ボックス数</button>
          </div>
          <div id="targetStudentsPanel" class="summary-panel" role="tabpanel" aria-labelledby="summaryTabStudents">
            <div class="sub">1号店・2号店に置いた家具から、家具モーション対象の生徒を集計します。</div>
            <div id="roomSummaries" class="room-summary-list" style="margin-top:.75rem"></div>
          </div>
          <div id="requiredBoxesPanel" class="summary-panel hidden" role="tabpanel" aria-labelledby="summaryTabBoxes">
            <div id="requiredBoxSummary" class="box-summary">
              <div class="status" style="justify-content:flex-start">
                <span class="pill">家具 <strong id="requiredFurnitureCount">0</strong>個</span>
                <span class="pill">シリーズ <strong id="requiredSeriesCount">0</strong>種類</span>
                <span class="pill warn">製造不可 <strong id="requiredUnavailableCount">0</strong>個</span>
              </div>
              <div id="requiredRarityBreakdown" class="status" style="justify-content:flex-start; margin-top:.45rem"></div>
              <label class="checkline" style="margin-top:.5rem"><input id="hideOwnedRequired" type="checkbox">チェック済みを非表示</label>
              <div id="seriesBreakdown" class="series-breakdown"></div>
            </div>
          </div>
        </section>
      </div>
    </aside>

    <main class="main">
      <header class="topbar">
        <div class="brand-lockup">
          <div class="kicker">非公式ファンツール</div>
          <h1>ブルーアーカイブ カフェ配置シミュレータ</h1>
          <div class="sub">カフェ家具の配置、来る生徒、必要家具選択BOXをまとめて確認できます。</div>
        </div>
        <div class="status">
          <span class="pill">操作中 <strong id="activeRoomLabel">1号店</strong></span>
          <span class="pill"><strong id="placedCount">0</strong>家具</span>
          <span class="pill"><strong id="areaUsed">0</strong>/400マス</span>
          <span class="pill"><strong id="motionCount">0</strong>モーション</span>
          <span class="pill"><strong id="studentCount">0</strong>生徒</span>
          <span id="heightBadge" class="pill ok">最大高さ <strong id="maxHeight">0</strong>/7</span>
        </div>
        <div class="mobile-view-tabs" role="tablist" aria-label="スマホ表示切替">
          <button id="mobileViewCafeBtn" class="mobile-view-tab active" type="button" role="tab" aria-selected="true" data-mobile-view="cafe">カフェ</button>
          <button id="mobileViewSummaryBtn" class="mobile-view-tab" type="button" role="tab" aria-selected="false" data-mobile-view="summary">集計</button>
        </div>
      </header>

      <div class="workspace">
        <div class="legend">
          <span>家具は盤面間でドラッグ移動できます。</span>
          <span>壁装飾は上辺・左辺に沿って置けます。</span>
          <span>一時置き場は生徒・必要数の集計対象外です。</span>
        </div>
        <div class="board-tools">
          <div class="row">
            <button id="rotateBtn" type="button">回転</button>
            <button id="clearSelectionBtn" type="button">選択解除</button>
            <button id="clearBtn" class="danger" type="button">操作中の部屋を全消去</button>
            <button id="copyRoom1ToRoom2Btn" type="button">1号店を2号店へコピー</button>
          </div>
        </div>
        <div class="boards-grid">
          <div class="rooms-stack">
            <section id="panel-room1" class="room-panel active" data-room="room1">
              <div class="room-panel-head">
                <h2>1号店</h2>
                <div class="status"><span class="pill"><strong id="room1Placed">0</strong>家具</span><span class="pill"><strong id="room1Students">0</strong>生徒</span></div>
              </div>
              <div class="board-wrap">
                <div id="board-room1" class="board" data-room="room1" aria-label="1号店 20x20 cafe layout board">
                  <div id="preview-room1" class="preview"></div>
                </div>
              </div>
            </section>
            <section id="panel-room2" class="room-panel" data-room="room2">
              <div class="room-panel-head">
                <h2>2号店</h2>
                <div class="status"><span class="pill"><strong id="room2Placed">0</strong>家具</span><span class="pill"><strong id="room2Students">0</strong>生徒</span></div>
              </div>
              <div class="board-wrap">
                <div id="board-room2" class="board" data-room="room2" aria-label="2号店 20x20 cafe layout board">
                  <div id="preview-room2" class="preview"></div>
                </div>
              </div>
            </section>
          </div>
          <aside class="stash-panel">
            <div class="room-panel-head">
              <h2>一時置き場</h2>
              <div class="status"><span class="pill"><strong id="stashCount">0</strong>家具</span></div>
            </div>
            <div class="board-wrap">
              <div id="board-stash" class="board" data-room="stash" aria-label="一時置き場 20x20 temporary layout board">
                <div id="preview-stash" class="preview"></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>

    <aside class="inspector">
      <div class="pane">
        <section class="card">
          <div class="row" style="justify-content:space-between">
            <h2>生徒から家具を選ぶ</h2>
          </div>
          <div class="controls" style="margin-top:.75rem">
            <div class="mobile-dock-tabs" role="tablist" aria-label="スマホ操作メニュー">
              <button id="mobileTabOps" class="mobile-dock-tab active" type="button" role="tab" aria-selected="true" data-mobile-tab="ops">家具操作</button>
              <button id="mobileTabPicker" class="mobile-dock-tab" type="button" role="tab" aria-selected="false" data-mobile-tab="picker">選択生徒</button>
              <button id="mobileTabTargets" class="mobile-dock-tab" type="button" role="tab" aria-selected="false" data-mobile-tab="targets">生徒追加</button>
            </div>

            <div class="dock-panel dock-panel-ops active" data-mobile-panel="ops">
              <div class="mobile-dock-actions" aria-label="配置操作">
                <button id="mobileRotateBtn" type="button">回転</button>
                <button id="mobileClearSelectionBtn" type="button">選択解除</button>
                <button id="mobileClearBtn" class="danger" type="button">全消去</button>
                <button id="mobileCopyRoom1ToRoom2Btn" type="button">1→2コピー</button>
              </div>
              <div id="mobileStashDrop" class="mobile-stash-drop" role="button" tabindex="0">ここへドラッグで一時置き場へ移動</div>
            </div>

            <div class="dock-panel dock-panel-picker" data-mobile-panel="picker">
              <div class="mobile-picker-panel">
                <label>選択生徒
                  <select id="mobileStudentSelect"></select>
                </label>
                <div id="mobileStudentFurnitureList" class="mobile-picker-list"></div>
              </div>
            </div>

            <div class="dock-panel dock-panel-targets" data-mobile-panel="targets">
              <label>生徒名検索
                <input id="studentSearch" list="studentCandidates" type="search" placeholder="名前を入力して候補から選択">
                <datalist id="studentCandidates"></datalist>
              </label>
              <div id="studentSuggestList" class="student-suggest-list hidden"></div>
              <div class="row">
                <button id="useStudentFilterBtn" type="button">生徒を追加</button>
                <button id="clearTargetsBtn" type="button">検索クリア</button>
              </div>
              <div class="box-summary" style="margin-top:.1rem; padding-top:.75rem">
                <div class="row" style="justify-content:space-between">
                  <h3>選択生徒一覧</h3>
                  <button id="clearSelectedStudentsBtn" type="button">クリア</button>
                </div>
                <div id="mobileSelectedStudentManageList" class="mobile-manage-list"></div>
                <div id="selectedStudentList"></div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </aside>
  </div>

  <footer class="site-footer">
    <div class="site-footer-inner">
      <h2>データと注記</h2>
      <p class="source">このページは非公式ツールです。初期データは <a href="https://bluearchive.wikiru.jp/?%E5%AE%B6%E5%85%B7#FurnitureSeries" target="_blank" rel="noreferrer">ブルーアーカイブ攻略 Wiki の家具ページ</a>、家具モーション一覧、生徒一覧から抽出しています。</p>
      <div id="dataNotice" class="notice"></div>
    </div>
  </footer>

  <script id="initial-data" type="application/json">${embedded}</script>
  <script>
    const GRID = 20;
    const MAX_HEIGHT = 7;
    const BOARD_ROOMS = ["room1", "room2", "stash"];
    const rawData = JSON.parse(document.getElementById("initial-data").textContent);
    const studentData = (rawData.students || []).map(student => ({
      ...student,
      name: normalizeStudentName(student.name),
      id: normalizeStudentName(student.id || student.name),
    }));
    const schoolData = rawData.schools || unique(studentData.map(student => student.school).filter(Boolean)).sort(localeSort);
    const els = {};
    const state = {
      furniture: rawData.furniture.map(normalizeFurniture),
      currentRoom: "room1",
      rooms: {
        room1: { placed: [], history: [] },
        room2: { placed: [], history: [] },
      },
      stash: [],
      selectedFurnitureId: null,
      selectedPlacedId: null,
      selectedPlacedRoom: null,
      rotated: false,
      drag: null,
      lastTransfer: null,
      selectedStudents: [],
      studentPriorities: {},
      allowUnselectedMulti: false,
      optimizeNotice: "配置最適化は現在停止中です。",
      owned: {},
      ownedChecked: {},
      hideOwnedRequired: false,
      activeSummaryTab: "students",
      mobileDockTab: "ops",
      mobileView: "cafe",
      mobileSelectedStudent: "",
    };

    const colorCache = new Map();

    function $(id) { return document.getElementById(id); }

    function initEls() {
      [
        "summaryTabStudents", "summaryTabBoxes", "targetStudentsPanel", "requiredBoxesPanel",
        "roomSummaries", "activeRoomLabel", "board-room1", "board-room2", "board-stash", "preview-room1", "preview-room2", "preview-stash",
        "panel-room1", "panel-room2", "room1Placed", "room2Placed", "room1Students", "room2Students",
        "stashCount",
        "placedCount", "areaUsed",
        "motionCount", "studentCount", "maxHeight", "heightBadge", "rotateBtn", "clearSelectionBtn",
        "clearBtn", "copyRoom1ToRoom2Btn",
        "studentSearch", "studentCandidates", "useStudentFilterBtn", "clearTargetsBtn", "clearSelectedStudentsBtn",
        "selectedStudentList", "studentSuggestList",
        "mobileViewCafeBtn", "mobileViewSummaryBtn",
        "mobileTabOps", "mobileTabPicker", "mobileTabTargets", "mobileStudentSelect", "mobileStudentFurnitureList", "mobileSelectedStudentManageList",
        "mobileRotateBtn", "mobileClearSelectionBtn", "mobileClearBtn", "mobileCopyRoom1ToRoom2Btn", "mobileStashDrop",
        "requiredFurnitureCount", "requiredSeriesCount", "requiredUnavailableCount", "requiredRarityBreakdown", "hideOwnedRequired", "seriesBreakdown",
        "dataNotice"
      ].forEach(id => els[id] = $(id));
    }

    function normalizeFurniture(item) {
      const students = normalizeStudentList(item.students || []);
      return {
        id: item.id || compact(item.name),
        name: item.name || "名称未設定",
        rarity: item.rarity || "",
        type: item.type || "",
        series: item.series || "",
        size: {
          width: Number(item.size?.width || item.width || 1),
          depth: Number(item.size?.depth || item.depth || 1),
          height: Number(item.size?.height || item.height || 1),
        },
        motionText: item.motionText || students.join("、"),
        students,
        craftable: item.craftable === false ? false : item.craftable === true ? true : null,
        manufactureText: item.manufactureText || "",
        obtainText: item.obtainText || "",
      };
    }

    function compact(value) {
      return String(value || "").replace(/\s+/g, "").trim();
    }

    function normalizeStudentName(value) {
      return String(value || "").replace(/\s+/g, "").trim();
    }

    function normalizeStudentList(values) {
      const result = [];
      values.map(normalizeStudentName).filter(Boolean).forEach(name => {
        if (/^（.+）$/.test(name)) {
          const previous = result.at(-1);
          if (previous) {
            const combined = previous.replace(/（.*）$/, "") + name;
            result.pop();
            if (!result.includes(combined)) result.push(combined);
          }
          return;
        }
        if (!result.includes(name)) result.push(name);
      });
      return result.filter(name => !/^（.+）$/.test(name));
    }

    function dimsOf(item, rotated = false) {
      return rotated
        ? { width: item.size.depth, depth: item.size.width, height: item.size.height }
        : { ...item.size };
    }

    function areaOf(item, rotated = false) {
      const d = dimsOf(item, rotated);
      return d.width * d.depth;
    }

    function isWallDecoration(item) {
      return item.type === "壁の装飾";
    }

    function isValidWallPosition(item, x, y, rotated = false) {
      if (!isWallDecoration(item)) return true;
      const d = dimsOf(item, rotated);
      return (y === 0 && d.width >= d.depth) || (x === 0 && d.depth >= d.width);
    }

    function wallSideOf(item, x, y, rotated = false) {
      if (!isWallDecoration(item)) return null;
      const d = dimsOf(item, rotated);
      if (y === 0 && d.width >= d.depth) return "top";
      if (x === 0 && d.depth >= d.width) return "left";
      return null;
    }

    function wallSpanOf(item, x, y, rotated = false) {
      const d = dimsOf(item, rotated);
      const side = wallSideOf(item, x, y, rotated);
      if (side === "top") return { side, start: x, end: x + d.width, height: d.height };
      if (side === "left") return { side, start: y, end: y + d.depth, height: d.height };
      return null;
    }

    function wallSpansOverlap(a, b) {
      return a.side === b.side && a.start < b.end && a.end > b.start;
    }

    function heightsOverlap(aZ, aHeight, bZ, bHeight) {
      return aZ < bZ + bHeight && aZ + aHeight > bZ;
    }

    function setStudentOptions() {
      const names = studentData.map(student => student.name).sort(localeSort);
      els.studentCandidates.innerHTML = "";
      names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        els.studentCandidates.append(option);
      });
      els.useStudentFilterBtn.disabled = !names.length;
    }

    function studentNames() {
      return studentData.map(student => student.name).sort(localeSort);
    }

    function renderStudentSuggestions() {
      const root = els.studentSuggestList;
      if (!root) return;
      const query = normalizeStudentName(els.studentSearch.value);
      root.innerHTML = "";
      if (!query) {
        root.classList.add("hidden");
        return;
      }
      const exactSelected = state.selectedStudents.includes(query);
      const matches = studentNames()
        .filter(name => name.includes(query) && (!exactSelected || name !== query))
        .slice(0, 8);
      if (!matches.length) {
        root.classList.add("hidden");
        return;
      }
      matches.forEach(name => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = name;
        button.addEventListener("click", () => {
          filterByStudent(name);
          root.classList.add("hidden");
        });
        root.append(button);
      });
      root.classList.remove("hidden");
    }

    function filterByStudent(name) {
      name = normalizeStudentName(name);
      if (!name) return;
      els.studentSearch.value = name;
      addSelectedStudent(name);
      renderCoveredStudents();
      renderStudentSuggestions();
    }

    function useSelectedStudentFilter() {
      filterByStudent(els.studentSearch.value);
    }

    function addSelectedStudent(name) {
      name = normalizeStudentName(name);
      if (!name) return;
      if (!state.selectedStudents.includes(name)) {
        state.selectedStudents.push(name);
        if (!state.mobileSelectedStudent) state.mobileSelectedStudent = name;
        savePreferences();
      }
      renderSelectedStudentList();
    }

    function removeSelectedStudent(name) {
      state.selectedStudents = state.selectedStudents.filter(student => student !== name);
      delete state.studentPriorities[name];
      if (state.mobileSelectedStudent === name) state.mobileSelectedStudent = "";
      savePreferences();
      renderSelectedStudentList();
      renderCoveredStudents();
    }

    function furnitureForStudent(student) {
      return state.furniture
        .filter(item => item.students.includes(student))
        .sort((a, b) => a.series.localeCompare(b.series, "ja") || a.name.localeCompare(b.name, "ja"));
    }

    function renderSelectedStudentList() {
      els.selectedStudentList.innerHTML = "";
      if (!state.selectedStudents.length) {
        els.selectedStudentList.innerHTML = '<div class="empty">検索から生徒を追加すると、対応家具をここで確認できます。</div>';
        renderMobileStudentMenus();
        return;
      }
      state.selectedStudents.slice().sort(localeSort).forEach(student => {
        const items = furnitureForStudent(student);
        const details = document.createElement("details");
        details.className = "dropdown";
        details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
        details.querySelector("summary span").textContent = student;
        details.querySelector(".tag").textContent = \`\${items.length}家具\`;
        const body = details.querySelector(".dropdown-body");

        if (!items.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "対応家具が見つかりません。";
          body.append(empty);
        } else {
          items.forEach(item => {
            const row = document.createElement("div");
            row.className = "mini-row";
            row.innerHTML = '<div><strong></strong><div class="count-note"></div></div><button type="button">選択</button>';
            row.querySelector("strong").textContent = item.name;
            row.querySelector(".count-note").textContent = \`\${item.size.width}×\${item.size.depth}×\${item.size.height} / \${item.series || "シリーズなし"} / \${manufactureLabel(item)} / 来る生徒: \${item.students.join("、")}\`;
            row.querySelector("button").addEventListener("click", () => selectFurnitureItem(item));
            body.append(row);
          });
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "この生徒を外す";
        remove.addEventListener("click", () => removeSelectedStudent(student));
        body.append(remove);
        els.selectedStudentList.append(details);
      });
      renderMobileStudentMenus();
    }

    function selectFurnitureItem(item) {
      state.selectedFurnitureId = item.id;
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      renderAll();
    }

    function renderMobileStudentMenus() {
      renderMobileStudentPicker();
      renderMobileSelectedStudentManageList();
    }

    function renderMobileStudentPicker() {
      if (!els.mobileStudentSelect || !els.mobileStudentFurnitureList) return;
      const students = state.selectedStudents.slice().sort(localeSort);
      els.mobileStudentSelect.innerHTML = "";
      if (!students.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "選択生徒なし";
        els.mobileStudentSelect.append(option);
        els.mobileStudentFurnitureList.innerHTML = '<div class="empty">生徒追加タブで生徒を追加してください。</div>';
        state.mobileSelectedStudent = "";
        return;
      }
      if (!students.includes(state.mobileSelectedStudent)) state.mobileSelectedStudent = students[0];
      students.forEach(student => {
        const option = document.createElement("option");
        option.value = student;
        option.textContent = student;
        els.mobileStudentSelect.append(option);
      });
      els.mobileStudentSelect.value = state.mobileSelectedStudent;

      const items = furnitureForStudent(state.mobileSelectedStudent);
      els.mobileStudentFurnitureList.innerHTML = "";
      if (!items.length) {
        els.mobileStudentFurnitureList.innerHTML = '<div class="empty">対応家具が見つかりません。</div>';
        return;
      }
      items.forEach(item => {
        const row = document.createElement("div");
        row.className = "mini-row";
        row.innerHTML = '<div><strong></strong><div class="count-note"></div></div><button type="button">選択</button>';
        row.querySelector("strong").textContent = item.name;
        row.querySelector(".count-note").textContent = \`\${item.size.width}×\${item.size.depth}×\${item.size.height} / \${item.series || "シリーズなし"} / \${manufactureLabel(item)} / 来る生徒: \${item.students.join("、")}\`;
        row.querySelector("button").addEventListener("click", () => selectFurnitureItem(item));
        els.mobileStudentFurnitureList.append(row);
      });
    }

    function renderMobileSelectedStudentManageList() {
      if (!els.mobileSelectedStudentManageList) return;
      els.mobileSelectedStudentManageList.innerHTML = "";
      const students = state.selectedStudents.slice().sort(localeSort);
      if (!students.length) {
        els.mobileSelectedStudentManageList.innerHTML = '<div class="empty">選択中の生徒はいません。</div>';
        return;
      }
      students.forEach(student => {
        const chip = document.createElement("div");
        chip.className = "mobile-student-chip";
        chip.innerHTML = '<span></span><button type="button">外す</button>';
        chip.querySelector("span").textContent = student;
        chip.querySelector("button").addEventListener("click", () => removeSelectedStudent(student));
        els.mobileSelectedStudentManageList.append(chip);
      });
    }

    function fillSelect(select, values) {
      select.innerHTML = "";
      values.forEach(value => {
        const option = document.createElement("option");
        option.value = value === "すべて" ? "" : value;
        option.textContent = value;
        select.append(option);
      });
    }

    function localeSort(a, b) { return String(a).localeCompare(String(b), "ja"); }
    function unique(values) { return [...new Set(values)]; }

    function priorityOf(student) {
      const value = state.studentPriorities[student];
      return value === "high" || value === "low" ? value : "medium";
    }

    function manufactureLabel(item) {
      if (item.craftable === true) return "製造可";
      if (item.craftable === false) return "製造不可";
      return "製造不明";
    }

    function rarityGroup(item) {
      const match = String(item.rarity || "").match(/★\s*\d+/);
      return match ? match[0].replace(/\s+/g, "") : "レア不明";
    }

    function tag(text) {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = text;
      return span;
    }

    function itemById(id) {
      return state.furniture.find(f => f.id === id);
    }

    function placedById(id, room = state.selectedPlacedRoom || state.currentRoom) {
      return placedFor(room).find(p => p.id === id);
    }

    function roomData(room) {
      return state.rooms[room];
    }

    function placedFor(room) {
      if (room === "stash") return state.stash;
      return roomData(room).placed;
    }

    function setPlacedFor(room, placed) {
      if (room === "stash") state.stash = placed;
      else roomData(room).placed = placed;
    }

    function historyFor(room) {
      return roomData(room).history;
    }

    function currentRoom() {
      return state.rooms[state.currentRoom];
    }

    function currentPlaced() {
      return currentRoom().placed;
    }

    function currentHistory() {
      return currentRoom().history;
    }

    function boardEl(room = state.currentRoom) {
      return els[\`board-\${room}\`];
    }

    function previewEl(room = state.currentRoom) {
      return els[\`preview-\${room}\`];
    }

    function panelEl(room = state.currentRoom) {
      return els[\`panel-\${room}\`];
    }

    function normalizeWallHeights(list) {
      const next = list.map(placed => ({ ...placed, z: Number(placed.z || 0) }));
      const fixed = [];
      const walls = [];
      for (const placed of next) {
        const item = itemById(placed.furnitureId);
        if (!item) continue;
        if (isWallDecoration(item)) walls.push(placed);
        else {
          placed.z = 0;
          fixed.push(placed);
        }
      }

      for (let i = 0; i < fixed.length; i += 1) {
        const item = itemById(fixed[i].furnitureId);
        const d = dimsOf(item, fixed[i].rotated);
        if (d.height > MAX_HEIGHT) return null;
        const rect = { x: fixed[i].x, y: fixed[i].y, width: d.width, depth: d.depth };
        for (let j = i + 1; j < fixed.length; j += 1) {
          const other = itemById(fixed[j].furnitureId);
          const od = dimsOf(other, fixed[j].rotated);
          if (intersects(rect, { x: fixed[j].x, y: fixed[j].y, width: od.width, depth: od.depth })) return null;
        }
      }

      const assigned = fixed.slice();
      walls.sort((a, b) => Number(a.z || 0) - Number(b.z || 0));
      for (const placed of walls) {
        const item = itemById(placed.furnitureId);
        const d = dimsOf(item, placed.rotated);
        if (d.height > MAX_HEIGHT || !isValidWallPosition(item, placed.x, placed.y, placed.rotated)) return null;
        const rect = { x: placed.x, y: placed.y, width: d.width, depth: d.depth };
        const wallSpan = wallSpanOf(item, placed.x, placed.y, placed.rotated);
        let fitted = false;
        for (let z = 0; z <= MAX_HEIGHT - d.height; z += 1) {
          const blocked = assigned.some(otherPlaced => {
            const other = itemById(otherPlaced.furnitureId);
            if (!other) return false;
            const od = dimsOf(other, otherPlaced.rotated);
            const otherRect = { x: otherPlaced.x, y: otherPlaced.y, width: od.width, depth: od.depth };
            const otherWallSpan = wallSpanOf(other, otherPlaced.x, otherPlaced.y, otherPlaced.rotated);
            if (wallSpan && otherWallSpan) {
              return wallSpansOverlap(wallSpan, otherWallSpan)
                && heightsOverlap(z, d.height, Number(otherPlaced.z || 0), od.height);
            }
            return intersects(rect, otherRect)
              && heightsOverlap(z, d.height, Number(otherPlaced.z || 0), od.height);
          });
          if (!blocked) {
            placed.z = z;
            assigned.push(placed);
            fitted = true;
            break;
          }
        }
        if (!fitted) return null;
      }
      return next;
    }

    function fitPlacementInList(list, furniture, x, y, rotated, ignoreId = null, placedId = "__candidate__") {
      const d = dimsOf(furniture, rotated);
      if (d.height > MAX_HEIGHT || x < 0 || y < 0 || x + d.width > GRID || y + d.depth > GRID) {
        return null;
      }
      if (!isValidWallPosition(furniture, x, y, rotated)) return null;
      const candidate = { id: placedId, furnitureId: furniture.id, x, y, z: 0, rotated };
      const trial = list.filter(placed => placed.id !== ignoreId).concat(candidate);
      const adjusted = normalizeWallHeights(trial);
      if (!adjusted) return null;
      const placed = adjusted.find(row => row.id === placedId);
      return placed ? { z: Number(placed.z || 0), adjusted } : null;
    }

    function placementZInList(list, furniture, x, y, rotated, ignoreId = null) {
      const fit = fitPlacementInList(list, furniture, x, y, rotated, ignoreId);
      return fit ? fit.z : null;
    }

    function canPlace(furniture, x, y, rotated, ignoreId = null, room = state.currentRoom) {
      return placementZInList(placedFor(room), furniture, x, y, rotated, ignoreId) !== null;
    }

    function intersects(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
    }

    function pushHistory() {
      state.lastTransfer = null;
      currentHistory().push(JSON.stringify(currentPlaced()));
      if (currentHistory().length > 60) currentHistory().shift();
    }

    function makePlacedId() {
      return crypto.randomUUID ? crypto.randomUUID() : \`p-\${Date.now()}-\${Math.random()}\`;
    }

    function placeSelectedInRoom(room, x, y) {
      const furniture = itemById(state.selectedFurnitureId);
      const id = makePlacedId();
      const fit = furniture ? fitPlacementInList(placedFor(room), furniture, x, y, state.rotated, null, id) : null;
      if (!furniture || !fit) return false;
      if (room === state.currentRoom) pushHistory();
      else state.lastTransfer = null;
      setPlacedFor(room, fit.adjusted);
      state.selectedPlacedId = id;
      state.selectedPlacedRoom = room;
      save();
      renderAll();
      return true;
    }

    function placeSelected(x, y) {
      return placeSelectedInRoom(state.currentRoom, x, y);
    }

    function movePlaced(id, x, y) {
      const room = state.selectedPlacedRoom || state.currentRoom;
      const placed = placedById(id, room);
      if (!placed) return false;
      const item = itemById(placed.furnitureId);
      const fit = item ? fitPlacementInList(placedFor(room), item, x, y, placed.rotated, id, id) : null;
      if (!item || !fit) return false;
      state.lastTransfer = null;
      setPlacedFor(room, fit.adjusted);
      save();
      renderAll();
      return true;
    }

    function rotateSelectedPlaced() {
      const room = state.selectedPlacedRoom || state.currentRoom;
      const p = placedById(state.selectedPlacedId, room);
      if (!p) return;
      const item = itemById(p.furnitureId);
      const fit = item ? fitPlacementInList(placedFor(room), item, p.x, p.y, !p.rotated, p.id, p.id) : null;
      if (!item || !fit) return;
      if (room === state.currentRoom) pushHistory();
      else state.lastTransfer = null;
      setPlacedFor(room, fit.adjusted);
      save();
      renderAll();
    }

    function removeSelectedPlaced() {
      if (!state.selectedPlacedId) return;
      const room = state.selectedPlacedRoom || state.currentRoom;
      if (room === state.currentRoom) pushHistory();
      else state.lastTransfer = null;
      setPlacedFor(room, placedFor(room).filter(p => p.id !== state.selectedPlacedId));
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      save();
      renderAll();
    }

    function findOpenPosition(room, item, preferredX, preferredY, rotated) {
      const candidates = [{ x: preferredX, y: preferredY }];
      for (let y = 0; y < GRID; y += 1) {
        for (let x = 0; x < GRID; x += 1) {
          if (x !== preferredX || y !== preferredY) candidates.push({ x, y });
        }
      }
      for (const position of candidates) {
        const fit = fitPlacementInList(placedFor(room), item, position.x, position.y, rotated, null, "__transfer__");
        if (fit) return { ...position, z: fit.z, fit };
      }
      return null;
    }

    function transferSelectedPlaced() {
      const sourceRoom = state.selectedPlacedRoom || state.currentRoom;
      if (sourceRoom === "stash") return;
      const targetRoom = sourceRoom === "room1" ? "room2" : "room1";
      const selected = placedById(state.selectedPlacedId, sourceRoom);
      if (!selected) return;
      const item = itemById(selected.furnitureId);
      if (!item) return;
      const position = findOpenPosition(targetRoom, item, selected.x, selected.y, selected.rotated);
      if (!position) {
        alert("移動先にこの家具を置ける空き場所がありません。");
        return;
      }

      state.lastTransfer = {
        type: "room",
        sourceRoom,
        targetRoom,
        sourceBefore: JSON.parse(JSON.stringify(placedFor(sourceRoom))),
        targetBefore: JSON.parse(JSON.stringify(placedFor(targetRoom))),
      };
      setPlacedFor(sourceRoom, placedFor(sourceRoom).filter(placed => placed.id !== selected.id));
      setPlacedFor(targetRoom, position.fit.adjusted.map(placed =>
        placed.id === "__transfer__" ? { ...placed, id: selected.id } : placed
      ));
      state.currentRoom = targetRoom;
      state.selectedPlacedId = selected.id;
      state.selectedPlacedRoom = targetRoom;
      state.selectedFurnitureId = null;
      state.drag = null;
      save();
      renderAll();
    }

    function moveSelectedToStash() {
      const sourceRoom = state.selectedPlacedRoom || state.currentRoom;
      if (sourceRoom === "stash") return;
      const selected = placedById(state.selectedPlacedId, sourceRoom);
      if (!selected) return;
      const item = itemById(selected.furnitureId);
      if (!item) return;
      const position = findOpenPosition("stash", item, selected.x, selected.y, selected.rotated);
      if (!position) {
        alert("一時置き場にこの家具を置ける空き場所がありません。");
        return;
      }

      state.lastTransfer = {
        type: "room",
        sourceRoom,
        targetRoom: "stash",
        sourceBefore: JSON.parse(JSON.stringify(placedFor(sourceRoom))),
        targetBefore: JSON.parse(JSON.stringify(placedFor("stash"))),
      };
      setPlacedFor(sourceRoom, placedFor(sourceRoom).filter(placed => placed.id !== selected.id));
      setPlacedFor("stash", position.fit.adjusted.map(placed =>
        placed.id === "__transfer__" ? { ...placed, id: selected.id } : placed
      ));
      state.selectedPlacedId = selected.id;
      state.selectedPlacedRoom = "stash";
      state.selectedFurnitureId = null;
      state.drag = null;
      save();
      renderAll();
    }

    function copyRoom1ToRoom2() {
      const source = placedFor("room1");
      if (!source.length) {
        alert("1号店にコピーできる家具がありません。");
        return;
      }
      if (placedFor("room2").length && !confirm("2号店の現在の配置を、1号店の内容で上書きしますか？")) return;

      state.lastTransfer = null;
      const history = state.rooms.room2.history;
      history.push(JSON.stringify(placedFor("room2")));
      if (history.length > 60) history.shift();

      const copied = source.map(placed => ({ ...placed, id: makePlacedId() }));
      const adjusted = normalizeWallHeights(copied);
      if (!adjusted) {
        alert("1号店の配置を2号店へコピーできませんでした。");
        history.pop();
        return;
      }

      state.rooms.room2.placed = adjusted;
      state.currentRoom = "room2";
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      state.selectedFurnitureId = null;
      state.drag = null;
      save();
      renderAll();
    }

    function renderBoard(room = state.currentRoom) {
      const board = boardEl(room);
      [...board.querySelectorAll(".furn, .axis")].forEach(n => n.remove());
      for (let i = 0; i <= GRID; i += 5) {
        const x = document.createElement("div");
        x.className = "axis";
        x.style.left = \`\${i * cellSize(board) + 2}px\`;
        x.style.top = "2px";
        x.textContent = i;
        board.append(x);
        const y = document.createElement("div");
        y.className = "axis";
        y.style.left = "3px";
        y.style.top = \`\${i * cellSize(board) + 14}px\`;
        y.textContent = i;
        board.append(y);
      }
      const placed = placedFor(room);
      const underWallIds = new Set();
      const wallStackCounts = new Map();
      placed.forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item || !isWallDecoration(item)) return;
        const d = dimsOf(item, p.rotated);
        const rect = { x: p.x, y: p.y, width: d.width, depth: d.depth };
        const z = Number(p.z || 0);
        let stacked = 0;
        placed.forEach(otherPlaced => {
          if (otherPlaced.id === p.id) return;
          const other = itemById(otherPlaced.furnitureId);
          if (!other) return;
          const od = dimsOf(other, otherPlaced.rotated);
          const otherRect = { x: otherPlaced.x, y: otherPlaced.y, width: od.width, depth: od.depth };
          if (!intersects(rect, otherRect)) return;
          if (heightsOverlap(z, d.height, Number(otherPlaced.z || 0), od.height)) return;
          stacked += 1;
          if (!isWallDecoration(other)) underWallIds.add(otherPlaced.id);
        });
        wallStackCounts.set(p.id, stacked);
      });

      const renderOrder = placed.slice().sort((a, b) => {
        const ai = itemById(a.furnitureId);
        const bi = itemById(b.furnitureId);
        const aw = ai && isWallDecoration(ai) ? 1 : 0;
        const bw = bi && isWallDecoration(bi) ? 1 : 0;
        const selectedA = room === state.selectedPlacedRoom && a.id === state.selectedPlacedId ? 1 : 0;
        const selectedB = room === state.selectedPlacedRoom && b.id === state.selectedPlacedId ? 1 : 0;
        return aw - bw || Number(a.z || 0) - Number(b.z || 0) || selectedA - selectedB;
      });

      renderOrder.forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        const d = dimsOf(item, p.rotated);
        const wall = isWallDecoration(item);
        const stacked = wallStackCounts.get(p.id) || 0;
        const div = document.createElement("div");
        div.className = "furn" + (room === state.selectedPlacedRoom && p.id === state.selectedPlacedId ? " selected" : "");
        div.classList.toggle("wall-decoration", wall);
        div.classList.toggle("wall-stacked", wall && stacked > 0);
        div.classList.toggle("under-wall", underWallIds.has(p.id));
        div.dataset.id = p.id;
        div.dataset.motion = String(Boolean(item.students.length));
        div.style.left = \`\${p.x * cellSize(board)}px\`;
        div.style.top = \`\${p.y * cellSize(board)}px\`;
        div.style.width = \`\${d.width * cellSize(board)}px\`;
        div.style.height = \`\${d.depth * cellSize(board)}px\`;
        div.style.setProperty("--furn-color", colorFor(item.series));
        if (!wall) div.style.backgroundColor = colorFor(item.series);
        if (wall) {
          const z = Number(p.z || 0);
          const end = z + d.height;
          div.dataset.wallSide = wallSideOf(item, p.x, p.y, p.rotated) || "";
          div.dataset.wallLabel = \`H\${z}-\${end}\${stacked ? " / 下" + stacked : ""}\`;
          div.style.zIndex = String(12 + z);
        } else if (underWallIds.has(p.id)) {
          div.style.zIndex = "4";
        }
        const zLabel = wall ? \`\n高さ: \${Number(p.z || 0)}-\${Number(p.z || 0) + d.height} / \${MAX_HEIGHT}\` : "";
        const stackLabel = wall && stacked ? \`\n下に重なる家具: \${stacked}個\` : underWallIds.has(p.id) ? "\n壁装飾の下に配置" : "";
        div.title = \`\${item.name}\n\${d.width}×\${d.depth}×\${d.height}\${zLabel}\${stackLabel}\n\${item.students.join("、")}\`;
        div.textContent = compactLabel(item.name, d.width, d.depth, wall ? Number(p.z || 0) : null);
        div.addEventListener("pointerdown", ev => startDrag(ev, p.id, room));
        board.append(div);
      });
    }

    function compactLabel(name, w, d, z = null) {
      if (w * d <= 2) return "";
      const limit = w * d <= 4 ? 4 : 9;
      const label = name.length > limit ? \`\${name.slice(0, limit)}…\` : name;
      return z === null ? label : \`\${label}\nH\${z}\`;
    }

    function cellSize(board = boardEl()) {
      return board.clientWidth / GRID;
    }

    function pointToCell(ev, board = boardEl()) {
      const rect = board.getBoundingClientRect();
      return {
        x: Math.floor((ev.clientX - rect.left) / cellSize(board)),
        y: Math.floor((ev.clientY - rect.top) / cellSize(board)),
      };
    }

    function roomAtPoint(ev) {
      return BOARD_ROOMS.find(room => {
        const rect = boardEl(room).getBoundingClientRect();
        return ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
      }) || null;
    }

    function mobileStashDropAtPoint(ev) {
      const drop = els.mobileStashDrop;
      if (!drop || getComputedStyle(drop).display === "none") return false;
      const rect = drop.getBoundingClientRect();
      return ev.clientX >= rect.left && ev.clientX <= rect.right && ev.clientY >= rect.top && ev.clientY <= rect.bottom;
    }

    function setMobileStashDropState(active, bad = false) {
      const drop = els.mobileStashDrop;
      if (!drop) return;
      drop.classList.toggle("drag-over", active);
      drop.classList.toggle("bad", active && bad);
    }

    function hideDragPreviews() {
      BOARD_ROOMS.forEach(room => {
        const preview = previewEl(room);
        preview.style.display = "none";
        preview.classList.remove("bad");
      });
      setMobileStashDropState(false);
    }

    function dragDropTarget(ev, item, rotated) {
      const room = roomAtPoint(ev);
      if (!room) return null;
      const board = boardEl(room);
      const d = dimsOf(item, rotated);
      const pt = pointToCell(ev, board);
      const x = clamp(pt.x, 0, GRID - d.width);
      const y = clamp(pt.y, 0, GRID - d.depth);
      return { room, board, x, y, width: d.width, depth: d.depth };
    }

    function showCrossRoomPreview(target, item, rotated) {
      hideDragPreviews();
      const preview = previewEl(target.room);
      preview.style.display = "block";
      preview.style.left = \`\${target.x * cellSize(target.board)}px\`;
      preview.style.top = \`\${target.y * cellSize(target.board)}px\`;
      preview.style.width = \`\${target.width * cellSize(target.board)}px\`;
      preview.style.height = \`\${target.depth * cellSize(target.board)}px\`;
      preview.classList.toggle("bad", placementZInList(placedFor(target.room), item, target.x, target.y, rotated) === null);
    }

    function updatePreview(ev, room = state.currentRoom) {
      const item = itemById(state.selectedFurnitureId);
      const preview = previewEl(room);
      const board = boardEl(room);
      if (!item) {
        preview.style.display = "none";
        return;
      }
      const pt = pointToCell(ev, board);
      const d = dimsOf(item, state.rotated);
      preview.style.display = "block";
      preview.style.left = \`\${pt.x * cellSize(board)}px\`;
      preview.style.top = \`\${pt.y * cellSize(board)}px\`;
      preview.style.width = \`\${d.width * cellSize(board)}px\`;
      preview.style.height = \`\${d.depth * cellSize(board)}px\`;
      preview.classList.toggle("bad", !canPlace(item, pt.x, pt.y, state.rotated, null, room));
    }

    function startDrag(ev, id, room = state.currentRoom) {
      ev.preventDefault();
      if (state.currentRoom !== room) switchRoom(room, false);
      if (state.selectedFurnitureId) {
        const item = itemById(state.selectedFurnitureId);
        if (item) {
          const board = boardEl(room);
          const d = dimsOf(item, state.rotated);
          const pt = pointToCell(ev, board);
          const x = clamp(pt.x, 0, GRID - d.width);
          const y = clamp(pt.y, 0, GRID - d.depth);
          if (placeSelectedInRoom(room, x, y)) return;
        }
      }
      const p = placedById(id, room);
      if (!p) return;
      state.selectedPlacedId = id;
      state.selectedPlacedRoom = room;
      state.selectedFurnitureId = null;
      state.drag = {
        id,
        room,
        startX: p.x,
        startY: p.y,
        startClientX: ev.clientX,
        startClientY: ev.clientY,
        sourceBefore: JSON.parse(JSON.stringify(placedFor(room))),
        targetBefore: null,
        crossRoom: false,
        moved: false,
      };
      boardEl(room).setPointerCapture(ev.pointerId);
      renderAll();
    }

    function onBoardPointerMove(ev) {
      if (state.drag) {
        const sourceRoom = state.drag.room;
        const p = placedFor(sourceRoom).find(placed => placed.id === state.drag.id);
        const item = p && itemById(p.furnitureId);
        if (!p || !item) return;
        const d = dimsOf(item, p.rotated);
        if (sourceRoom !== "stash" && mobileStashDropAtPoint(ev)) {
          state.drag.crossRoom = true;
          if (!state.drag.targetBefore || state.drag.targetRoom !== "stash") {
            state.drag.targetRoom = "stash";
            state.drag.targetBefore = JSON.parse(JSON.stringify(placedFor("stash")));
          }
          const position = findOpenPosition("stash", item, p.x, p.y, p.rotated);
          setMobileStashDropState(true, !position);
          hideDragPreviews();
          setMobileStashDropState(true, !position);
          return;
        }
        setMobileStashDropState(false);
        const target = dragDropTarget(ev, item, p.rotated);
        if (target?.room && target.room !== sourceRoom) {
          state.drag.crossRoom = true;
          if (!state.drag.targetBefore || state.drag.targetRoom !== target.room) {
            state.drag.targetRoom = target.room;
            state.drag.targetBefore = JSON.parse(JSON.stringify(placedFor(target.room)));
          }
          showCrossRoomPreview(target, item, p.rotated);
          return;
        }
        hideDragPreviews();
        if (target?.room !== sourceRoom) return;
        const board = boardEl(sourceRoom);
        const pt = pointToCell(ev, board);
        const x = clamp(pt.x, 0, GRID - d.width);
        const y = clamp(pt.y, 0, GRID - d.depth);
        if (x !== p.x || y !== p.y) {
          if (!state.drag.moved) {
            if (sourceRoom === state.currentRoom) pushHistory();
            else state.lastTransfer = null;
            state.drag.moved = true;
          }
          const fit = fitPlacementInList(placedFor(sourceRoom), item, x, y, p.rotated, p.id, p.id);
          if (fit) {
            setPlacedFor(sourceRoom, fit.adjusted);
            save();
            renderBoard(sourceRoom);
          }
        }
        return;
      }
      updatePreview(ev, roomAtPoint(ev) || state.currentRoom);
    }

    function onBoardPointerUp(ev) {
      if (state.drag) {
        const drag = state.drag;
        const sourceRoom = drag.room;
        const p = placedFor(sourceRoom).find(placed => placed.id === drag.id);
        const item = p && itemById(p.furnitureId);
        if (sourceRoom !== "stash" && item && mobileStashDropAtPoint(ev)) {
          const position = findOpenPosition("stash", item, p.x, p.y, p.rotated);
          if (position) {
            state.lastTransfer = {
              type: "room",
              sourceRoom,
              targetRoom: "stash",
              sourceBefore: drag.sourceBefore,
              targetBefore: drag.targetBefore || JSON.parse(JSON.stringify(placedFor("stash"))),
            };
            setPlacedFor(sourceRoom, placedFor(sourceRoom).filter(placed => placed.id !== drag.id));
            setPlacedFor("stash", position.fit.adjusted.map(placed =>
              placed.id === "__transfer__" ? { ...placed, id: drag.id } : placed
            ));
            state.selectedPlacedId = drag.id;
            state.selectedPlacedRoom = "stash";
            state.selectedFurnitureId = null;
          } else if (drag.moved || drag.crossRoom) {
            setPlacedFor(sourceRoom, drag.sourceBefore);
            state.selectedPlacedId = drag.id;
            state.selectedPlacedRoom = sourceRoom;
          }
          hideDragPreviews();
          state.drag = null;
          try { boardEl(sourceRoom).releasePointerCapture(ev.pointerId); } catch {}
          save();
          renderAll();
          return;
        }
        const target = item ? dragDropTarget(ev, item, p.rotated) : null;
        const targetFit = target?.room && target.room !== sourceRoom && item
          ? fitPlacementInList(placedFor(target.room), item, target.x, target.y, p.rotated, null, p.id)
          : null;
        if (target?.room && target.room !== sourceRoom && item && targetFit) {
          state.lastTransfer = {
            type: "room",
            sourceRoom,
            targetRoom: target.room,
            sourceBefore: drag.sourceBefore,
            targetBefore: drag.targetBefore || JSON.parse(JSON.stringify(placedFor(target.room))),
          };
          setPlacedFor(sourceRoom, placedFor(sourceRoom).filter(placed => placed.id !== drag.id));
          setPlacedFor(target.room, targetFit.adjusted);
          if (target.room !== "stash") state.currentRoom = target.room;
          state.selectedPlacedId = drag.id;
          state.selectedPlacedRoom = target.room;
          state.selectedFurnitureId = null;
          hideDragPreviews();
          state.drag = null;
          try { boardEl(sourceRoom).releasePointerCapture(ev.pointerId); } catch {}
          save();
          renderAll();
          return;
        }
        if (drag.crossRoom && target?.room && target.room !== sourceRoom) {
          setPlacedFor(sourceRoom, drag.sourceBefore);
          if (sourceRoom !== "stash") state.currentRoom = sourceRoom;
          state.selectedPlacedId = drag.id;
          state.selectedPlacedRoom = sourceRoom;
          save();
        }
        hideDragPreviews();
        state.drag = null;
        try { boardEl(sourceRoom).releasePointerCapture(ev.pointerId); } catch {}
        renderAll();
      }
    }

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function colorFor(value) {
      const key = value || "none";
      if (colorCache.has(key)) return colorCache.get(key);
      let hash = 0;
      for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      const hue = hash % 360;
      const color = \`hsl(\${hue} 78% 93%)\`;
      colorCache.set(key, color);
      return color;
    }

    function computeStudentCounts(room = state.currentRoom) {
      const counts = new Map();
      placedFor(room).forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        item.students.forEach(student => counts.set(student, (counts.get(student) || 0) + 1));
      });
      return counts;
    }

    function computeSeriesCounts(room = state.currentRoom) {
      const counts = new Map();
      placedFor(room).forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        const series = item.series || "シリーズなし";
        counts.set(series, (counts.get(series) || 0) + 1);
      });
      return counts;
    }

    function computeFurnitureCounts(room = state.currentRoom) {
      const counts = new Map();
      placedFor(room).forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        const current = counts.get(item.id) || { item, count: 0 };
        current.count += 1;
        counts.set(item.id, current);
      });
      return counts;
    }

    function computeCombinedFurnitureCounts() {
      const counts = new Map();
      ["room1", "room2"].forEach(room => {
        computeFurnitureCounts(room).forEach(({ item, count }) => {
          const current = counts.get(item.id) || { item, count: 0 };
          current.count += count;
          counts.set(item.id, current);
        });
      });
      return counts;
    }

    function renderStats() {
      let used = 0;
      let motion = 0;
      let maxHeight = 0;
      const counts = computeStudentCounts();
      currentPlaced().forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        used += areaOf(item, p.rotated);
        maxHeight = Math.max(maxHeight, Number(p.z || 0) + dimsOf(item, p.rotated).height);
        if (item.students.length) motion += 1;
      });
      els.placedCount.textContent = currentPlaced().length;
      els.areaUsed.textContent = used;
      els.motionCount.textContent = motion;
      els.studentCount.textContent = counts.size;
      els.maxHeight.textContent = maxHeight;
      els.heightBadge.classList.toggle("ok", maxHeight <= MAX_HEIGHT);
      els.heightBadge.classList.toggle("warn", maxHeight > MAX_HEIGHT);
    }

    function renderRoomPanelStats() {
      ["room1", "room2"].forEach(room => {
        els[\`\${room}Placed\`].textContent = placedFor(room).length;
        els[\`\${room}Students\`].textContent = computeStudentCounts(room).size;
        panelEl(room).classList.toggle("active", state.currentRoom === room);
      });
    }

    function renderStashBoard() {
      els.stashCount.textContent = state.stash.length;
    }

    function legacyRenderCoveredStudents() {
      els.roomSummaries.innerHTML = "";
      ["room1", "room2"].forEach(room => {
        const label = room === "room1" ? "1号店" : "2号店";
        const details = document.createElement("details");
        details.className = "dropdown";
        details.open = true;
        details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
        details.querySelector("summary span").textContent = label;
        const counts = computeStudentCounts(room);
        details.querySelector(".tag").textContent = \`\${counts.size}人\`;
        const body = details.querySelector(".dropdown-body");
        const grid = document.createElement("div");
        grid.className = "student-grid";
        const all = [...counts.keys()].sort(localeSort);
        if (!all.length) {
          grid.innerHTML = '<div class="empty">家具モーション対象の家具を置くと、ここに生徒が表示されます。</div>';
        } else {
          all.forEach(student => {
            const count = counts.get(student) || 0;
            const span = document.createElement("button");
            span.type = "button";
            span.className = "student covered";
            span.textContent = \`\${student} \${count}個\`;
            span.title = "家具モーション対象の生徒";
            grid.append(span);
          });
        }
        body.append(grid);
        const box = document.createElement("div");
        box.className = "box-summary";
        box.innerHTML = '<h3>必要家具選択ボックス数</h3><div class="status" style="justify-content:flex-start"><span class="pill">家具 <strong data-role="furniture">0</strong>個</span><span class="pill">シリーズ <strong data-role="series">0</strong>種類</span><span class="pill warn">製造不可 <strong data-role="unavailable">0</strong>個</span></div><div class="series-breakdown"></div>';
        body.append(box);
        legacyRenderRequiredBoxes(room, box);
        els.roomSummaries.append(details);
      });
    }

    function legacyRenderRequiredBoxes(room, root) {
      const furnitureCounts = computeFurnitureCounts(room);
      const seriesMap = new Map();
      const unavailableRows = [];
      let totalNeeded = 0;
      let unavailableNeeded = 0;
      for (const { item, count } of furnitureCounts.values()) {
        const owned = Math.max(0, Number(state.owned[item.id] || 0));
        const shortage = Math.max(0, count - owned);
        const boxNeeded = item.craftable === false ? 0 : shortage;
        const unavailable = item.craftable === false ? shortage : 0;
        totalNeeded += boxNeeded;
        unavailableNeeded += unavailable;
        if (item.craftable === false) {
          if (unavailable > 0) unavailableRows.push({ item, count, owned, unavailable });
          continue;
        }
        const series = item.series || "シリーズなし";
        const entry = seriesMap.get(series) || { placed: 0, owned: 0, needed: 0, unavailable: 0, rows: [] };
        entry.placed += count;
        entry.owned += Math.min(owned, count);
        entry.needed += boxNeeded;
        entry.unavailable += unavailable;
        entry.rows.push({ item, count, owned, needed: boxNeeded, unavailable, shortage });
        seriesMap.set(series, entry);
      }
      const neededSeriesCount = [...seriesMap.values()].filter(entry => entry.needed > 0).length;
      const furnitureTarget = root.querySelector('[data-role="furniture"]');
      const seriesTarget = root.querySelector('[data-role="series"]');
      const unavailableTarget = root.querySelector('[data-role="unavailable"]');
      const breakdown = root.querySelector(".series-breakdown");
      furnitureTarget.textContent = totalNeeded;
      seriesTarget.textContent = neededSeriesCount;
      unavailableTarget.textContent = unavailableNeeded;
      breakdown.innerHTML = "";
      if (!seriesMap.size) {
        breakdown.innerHTML = placedFor(room).length ? "" : '<div class="empty">配置済み家具がありません。</div>';
      }
      if (unavailableRows.length) {
        const details = document.createElement("details");
        details.className = "dropdown";
        details.open = true;
        details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
        details.querySelector("summary span").textContent = "製造不可家具";
        details.querySelector(".tag").textContent = \`\${unavailableNeeded}個\`;
        const body = details.querySelector(".dropdown-body");
        unavailableRows
          .sort((a, b) => b.unavailable - a.unavailable || localeSort(a.item.name, b.item.name))
          .forEach(({ item, count, owned, unavailable }) => {
            const row = document.createElement("div");
            row.className = "owned-row";
            row.innerHTML = '<div class="owned-row-main"><strong></strong><div class="count-note"></div></div><div class="owned-controls"><div></div><label>所有<input type="number" min="0"></label><strong></strong></div>';
            row.querySelector(".owned-row-main strong").textContent = item.name;
            row.querySelector(".count-note").textContent = item.students.length
              ? \`入手: \${item.obtainText || "不明"} / 来る生徒: \${item.students.join("、")}\`
              : \`入手: \${item.obtainText || "不明"}\`;
            row.querySelector(".owned-controls div").textContent = \`配置\${count}\`;
            const input = row.querySelector("input");
            input.value = owned;
            input.addEventListener("input", () => {
              state.owned[item.id] = Math.max(0, Number(input.value || 0));
              savePreferences();
              renderCoveredStudents();
            });
            row.querySelector(".owned-controls strong").textContent = \`製造不可\${unavailable}\`;
            body.append(row);
          });
        breakdown.append(details);
      }
      [...seriesMap.entries()]
        .sort((a, b) => (b[1].needed + b[1].unavailable) - (a[1].needed + a[1].unavailable) || localeSort(a[0], b[0]))
        .forEach(([series, entry]) => {
          const details = document.createElement("details");
          details.className = "dropdown";
          details.open = entry.needed > 0 || !state.hideOwnedRequired;
          details.open = entry.needed > 0 || entry.unavailable > 0;
          details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
          details.querySelector("summary span").textContent = series;
          details.querySelector(".tag").textContent = \`不足\${entry.needed} / 製造不可\${entry.unavailable} / 配置\${entry.placed}\`;
          const body = details.querySelector(".dropdown-body");
          entry.rows
            .sort((a, b) => (b.needed + b.unavailable) - (a.needed + a.unavailable) || localeSort(a.item.name, b.item.name))
            .forEach(({ item, count, owned, needed, unavailable, shortage }) => {
              const row = document.createElement("div");
              row.className = "owned-row";
              row.innerHTML = '<div class="owned-row-main"><strong></strong><div class="count-note"></div></div><div class="owned-controls"><div></div><label>所有<input type="number" min="0"></label><strong></strong></div>';
              row.querySelector(".owned-row-main strong").textContent = item.name;
              row.querySelector(".count-note").textContent = item.students.length
                ? \`\${manufactureLabel(item)} / 来る生徒: \${item.students.join("、")}\`
                : manufactureLabel(item);
              row.querySelector(".owned-controls div").textContent = \`配置\${count}\`;
              const input = row.querySelector("input");
              input.value = owned;
              input.addEventListener("input", () => {
                state.owned[item.id] = Math.max(0, Number(input.value || 0));
                savePreferences();
                renderCoveredStudents();
              });
              row.querySelector(".owned-controls strong").textContent = unavailable > 0 ? "製造不可" : shortage === 0 ? "所持済" : \`不足\${needed}\`;
              body.append(row);
            });
          breakdown.append(details);
        });
    }

    // The summary is shared by both rooms; room names stay visible together.
    function renderCoveredStudents() {
      els.roomSummaries.innerHTML = "";
      ["room1", "room2"].forEach(room => {
        const counts = computeStudentCounts(room);
        const selectedSet = new Set(state.selectedStudents);
        const section = document.createElement("section");
        section.className = "arrival-room";
        const head = document.createElement("div");
        head.className = "arrival-room-head";
        const heading = document.createElement("h3");
        heading.textContent = room === "room1" ? "1号店" : "2号店";
        const total = document.createElement("span");
        total.className = "tag";
        total.textContent = selectedSet.size
          ? counts.size + "人 / 対象" + selectedSet.size + "人"
          : counts.size + "人";
        head.append(heading, total);
        section.append(head);

        const countGroups = new Map();
        counts.forEach((count, student) => {
          const group = countGroups.get(count) || [];
          group.push(student);
          countGroups.set(count, group);
        });
        state.selectedStudents.forEach(student => {
          if (counts.has(student)) return;
          const group = countGroups.get(0) || [];
          group.push(student);
          countGroups.set(0, group);
        });
        if (!countGroups.size) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "家具モーション対象の家具を置くとここに表示されます。";
          section.append(empty);
        } else {
          const groups = document.createElement("div");
          groups.className = "arrival-groups";
          [...countGroups.entries()]
            .sort((a, b) => b[0] - a[0])
            .forEach(([countValue, students]) => {
              const uniqueStudents = unique(students);
              const targetCount = uniqueStudents.filter(student => selectedSet.has(student)).length;
              const group = document.createElement("div");
              group.className = "arrival-group";
              group.classList.toggle("has-target", targetCount > 0);
              const row = document.createElement("div");
              row.className = "arrival-count-row";
              const count = document.createElement("div");
              count.className = "arrival-count";
              count.textContent = String(countValue) + "個";
              const people = document.createElement("span");
              people.className = "count-note";
              people.textContent = targetCount
                ? uniqueStudents.length + "人 / 対象" + targetCount + "人"
                : uniqueStudents.length + "人";
              row.append(count, people);
              group.append(row);
              const list = document.createElement("ul");
              list.className = "arrival-list";
              uniqueStudents.sort((a, b) => {
                const targetDelta = Number(selectedSet.has(b)) - Number(selectedSet.has(a));
                return targetDelta || localeSort(a, b);
              }).forEach(student => {
                const li = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = student;
                button.classList.toggle("selected-target", selectedSet.has(student));
                button.title = selectedSet.has(student)
                  ? "選択生徒一覧にいる生徒です"
                  : "クリックでこの生徒を選択生徒一覧に追加";
                button.addEventListener("click", () => filterByStudent(student));
                li.append(button);
                list.append(li);
              });
              group.append(list);
              groups.append(group);
            });
          section.append(groups);
        }
        els.roomSummaries.append(section);
      });
      renderRequiredBoxes();
    }

    function renderRequiredBoxes() {
      const furnitureCounts = computeCombinedFurnitureCounts();
      const seriesMap = new Map();
      const unavailableRows = [];
      const rarityNeeded = new Map();
      let totalNeeded = 0;
      let unavailableNeeded = 0;

      furnitureCounts.forEach(({ item, count }) => {
        const owned = Math.max(0, Number(state.owned[item.id] || 0));
        const shortage = Math.max(0, count - owned);
        const needed = item.craftable === false ? 0 : shortage;
        const unavailable = item.craftable === false ? shortage : 0;
        totalNeeded += needed;
        unavailableNeeded += unavailable;
        if (needed > 0) {
          const rarity = rarityGroup(item);
          rarityNeeded.set(rarity, (rarityNeeded.get(rarity) || 0) + needed);
        }

        if (item.craftable === false) {
          unavailableRows.push({ item, count, owned, needed, unavailable, shortage });
          return;
        }
        const series = item.series || "シリーズなし";
        const entry = seriesMap.get(series) || { placed: 0, needed: 0, unavailable: 0, rows: [] };
        entry.placed += count;
        entry.needed += needed;
        entry.rows.push({ item, count, owned, needed, unavailable, shortage });
        seriesMap.set(series, entry);
      });

      els.requiredFurnitureCount.textContent = String(totalNeeded);
      els.requiredSeriesCount.textContent = String([...seriesMap.values()].filter(entry => entry.needed > 0).length);
      els.requiredUnavailableCount.textContent = String(unavailableNeeded);
      els.requiredRarityBreakdown.innerHTML = "";
      ["★1", "★2", "★3", "レア不明"].forEach(rarity => {
        const count = rarityNeeded.get(rarity) || 0;
        if (!count && rarity !== "レア不明") return;
        if (!count && rarity === "レア不明" && !rarityNeeded.has(rarity)) return;
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.innerHTML = '<strong></strong> ' + count + '個';
        pill.querySelector("strong").textContent = rarity;
        els.requiredRarityBreakdown.append(pill);
      });
      if (!els.requiredRarityBreakdown.children.length) {
        els.requiredRarityBreakdown.innerHTML = '<span class="pill"><strong>★別</strong> 0個</span>';
      }
      els.seriesBreakdown.innerHTML = "";

      const addOwnedRow = (parent, rowData, label) => {
        const { item, count, owned, needed, unavailable, shortage } = rowData;
        if (state.hideOwnedRequired && state.ownedChecked[item.id] === true) return;
        const row = document.createElement("div");
        row.className = "owned-row";
        row.innerHTML = '<div class="owned-row-main"><strong></strong><div class="count-note"></div></div><div class="owned-controls"><div></div><label class="checkline"><input type="checkbox" data-role="owned-check">所持済</label><label>所有<input type="number" min="0"></label><strong></strong></div>';
        row.querySelector(".owned-row-main strong").textContent = item.name;
        const rarity = String(item.rarity || "レア不明").replace(/\s+/g, " ").trim();
        const detailLabel = "レアリティ: " + rarity + " / " + label;
        row.querySelector(".count-note").textContent = item.students.length
          ? detailLabel + " / 来る生徒: " + item.students.join("、")
          : detailLabel;
        row.querySelector(".owned-controls div").textContent = "配置" + count;
        const ownedCheck = row.querySelector('[data-role="owned-check"]');
        const input = row.querySelector('input[type="number"]');
        ownedCheck.checked = state.ownedChecked[item.id] === true;
        ownedCheck.addEventListener("change", () => {
          if (ownedCheck.checked) {
            state.ownedChecked[item.id] = true;
            state.owned[item.id] = Math.max(count, Number(state.owned[item.id] || 0));
          } else {
            delete state.ownedChecked[item.id];
            state.owned[item.id] = 0;
          }
          savePreferences();
          renderCoveredStudents();
        });
        input.value = owned;
        input.addEventListener("input", () => {
          state.owned[item.id] = Math.max(0, Number(input.value || 0));
          delete state.ownedChecked[item.id];
          savePreferences();
          renderCoveredStudents();
        });
        row.querySelector(".owned-controls strong").textContent = unavailable > 0
          ? "製造不可"
          : shortage === 0 ? "所持済" : "不足" + needed;
        parent.append(row);
      };

      if (unavailableRows.length) {
        const visibleUnavailableRows = unavailableRows.filter(row => !(state.hideOwnedRequired && state.ownedChecked[row.item.id] === true));
        if (visibleUnavailableRows.length) {
          const details = document.createElement("details");
          details.className = "dropdown";
          details.open = true;
          details.innerHTML = '<summary><span>製造不可家具</span><span class="tag"></span></summary><div class="dropdown-body"></div>';
          details.querySelector(".tag").textContent = String(unavailableNeeded) + "個";
          const body = details.querySelector(".dropdown-body");
          visibleUnavailableRows
            .sort((a, b) => localeSort(a.item.name, b.item.name))
            .forEach(row => addOwnedRow(body, row, "入手: " + (row.item.obtainText || "不明")));
          els.seriesBreakdown.append(details);
        }
      }

      [...seriesMap.entries()]
        .sort((a, b) => localeSort(a[0], b[0]))
        .forEach(([series, entry]) => {
          const visibleRows = entry.rows.filter(row => !(state.hideOwnedRequired && state.ownedChecked[row.item.id] === true));
          if (!visibleRows.length) return;
          const details = document.createElement("details");
          details.className = "dropdown";
          details.open = true;
          details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
          details.querySelector("summary span").textContent = series;
          details.querySelector(".tag").textContent = "不足" + entry.needed + " / 配置" + entry.placed;
          const body = details.querySelector(".dropdown-body");
          visibleRows
            .sort((a, b) => localeSort(a.item.name, b.item.name))
            .forEach(row => addOwnedRow(body, row, manufactureLabel(row.item)));
          els.seriesBreakdown.append(details);
        });

      if (!furnitureCounts.size) {
        els.seriesBreakdown.innerHTML = '<div class="empty">配置済み家具がありません。</div>';
      } else if (!els.seriesBreakdown.children.length) {
        els.seriesBreakdown.innerHTML = '<div class="empty">表示対象の不足家具はありません。</div>';
      }
    }

    function renderSuggestions() {
      const suggestions = computeSuggestions(8);
      els.suggestions.innerHTML = "";
      if (!suggestions.length) {
        els.suggestions.innerHTML = '<div class="empty">置ける候補がありません。</div>';
        return;
      }
      suggestions.forEach(s => {
        const item = s.item;
        const div = document.createElement("div");
        div.className = "placed";
        div.innerHTML = '<div><div class="placed-name"></div><div class="placed-pos"></div></div><button type="button">選択</button>';
        div.querySelector(".placed-name").textContent = item.name;
        div.querySelector(".placed-pos").textContent = \`x\${s.x + 1}, y\${s.y + 1} / \${dimsOf(item, s.rotated).width}×\${dimsOf(item, s.rotated).depth}\`;
        div.querySelector("button").addEventListener("click", () => {
          state.selectedFurnitureId = item.id;
          state.rotated = s.rotated;
          renderAll();
        });
        els.suggestions.append(div);
      });
    }

    function parseTargets() {
      return unique(els.targetStudents.value.split(/[\n,、\s]+/).map(s => normalizeStudentName(s)).filter(Boolean));
    }

    function itemScore(item, targets, counts) {
      if (!item.students.length) return 0;
      const matchingStudents = targets.length
        ? item.students.filter(s => targets.includes(s))
        : item.students;
      const targetHits = matchingStudents.reduce((sum, student) => {
        const remaining = Math.max(0, 4 - (counts.get(student) || 0));
        return sum + (remaining > 0 ? 1 + remaining / 4 : 0);
      }, 0);
      if (!targetHits) return 0;
      const rarity = item.rarity.includes("★3") ? 5 : item.rarity.includes("★2") ? 2 : 0;
      const area = item.size.width * item.size.depth;
      return targetHits * 100 + item.students.length * 9 + rarity - (els.avoidLarge.checked ? area : 0);
    }

    function exportLayout() {
      const layout = {
        app: "bluearchive-cafe-simulator",
        grid: { width: GRID, depth: GRID, maxHeight: MAX_HEIGHT },
        room: state.currentRoom,
        exportedAt: new Date().toISOString(),
        placed: currentPlaced().map(p => {
          const item = itemById(p.furnitureId);
          return {
            furnitureId: p.furnitureId,
            name: item?.name || p.furnitureId,
            x: p.x,
            y: p.y,
            z: Number(p.z || 0),
            rotated: p.rotated,
          };
        }),
      };
      els.ioBox.value = JSON.stringify(layout, null, 2);
    }

    function importLayout() {
      try {
        const data = JSON.parse(els.ioBox.value);
        const incoming = Array.isArray(data) ? data : data.placed;
        if (!Array.isArray(incoming)) throw new Error("placed がありません");
        let next = [];
        for (const row of incoming) {
          const id = row.furnitureId || state.furniture.find(f => f.name === row.name)?.id;
          const item = itemById(id);
          if (!item) continue;
          const p = {
            id: crypto.randomUUID ? crypto.randomUUID() : \`p-\${Date.now()}-\${Math.random()}\`,
            furnitureId: item.id,
            x: Number(row.x || 0),
            y: Number(row.y || 0),
            z: Number(row.z || 0),
            rotated: Boolean(row.rotated),
          };
          const fit = fitPlacementInList(next, item, p.x, p.y, p.rotated, null, p.id);
          if (fit) next = fit.adjusted;
        }
        pushHistory();
        currentRoom().placed = next;
        state.selectedPlacedId = null;
        state.selectedPlacedRoom = null;
        save();
        renderAll();
      } catch (error) {
        alert(\`配置を読み込めません: \${error.message}\`);
      }
    }

    function canPlaceInList(list, furniture, x, y, rotated) {
      return placementZInList(list, furniture, x, y, rotated) !== null;
    }

    function countStudentsInList(list) {
      const counts = new Map();
      list.forEach(placed => {
        const item = itemById(placed.furnitureId);
        if (!item) return;
        item.students.forEach(student => counts.set(student, (counts.get(student) || 0) + 1));
      });
      return counts;
    }

    function findBestPlacementInList(list, item) {
      const rotations = item.size.width === item.size.depth ? [false] : [false, true];
      for (const rotated of rotations) {
        const d = dimsOf(item, rotated);
        for (let y = 0; y <= GRID - d.depth; y += 1) {
          for (let x = 0; x <= GRID - d.width; x += 1) {
            const fit = fitPlacementInList(list, item, x, y, rotated);
            if (fit) return { x, y, z: fit.z, rotated, fit };
          }
        }
      }
      return null;
    }

    function optimizationCandidateScore(item, selectedSet, counts, usedCounts) {
      if (!item.students.length) return null;
      const selectedHits = item.students.filter(student => selectedSet.has(student));
      if (!selectedHits.length) return null;
      const outsiders = item.students.filter(student => !selectedSet.has(student));
      if (outsiders.length && item.students.length > 1 && !state.allowUnselectedMulti) return null;
      const maxCopies = item.craftable === false ? 1 : 4;
      if ((usedCounts.get(item.id) || 0) >= maxCopies) return null;

      let needScore = 0;
      let openTargets = 0;
      selectedHits.forEach(student => {
        const current = counts.get(student) || 0;
        const remaining = Math.max(0, 4 - current);
        if (!remaining) return;
        const weight = priorityOf(student) === "high" ? 9 : priorityOf(student) === "low" ? 2 : 5;
        needScore += weight * (8 + remaining);
        openTargets += 1;
      });
      if (!openTargets) return null;

      const allTargetsSelected = item.students.length > 1 && outsiders.length === 0;
      const area = item.size.width * item.size.depth;
      const craftPenalty = item.craftable === false ? 12 : 0;
      const outsiderPenalty = outsiders.length * 45;
      const multiBonus = allTargetsSelected ? 90 + selectedHits.length * 30 : 0;
      const score = needScore * 100 + multiBonus + selectedHits.length * 20 - outsiderPenalty - area - craftPenalty;
      return { item, score, selectedHits, outsiders };
    }

    function optimizeRoom(room) {
      alert("配置最適化は現在停止中です。");
      return;
      const selected = state.selectedStudents.slice();
      if (!selected.length) {
        alert("最適化する生徒を選択生徒一覧に追加してください。");
        return;
      }
      const label = room === "room1" ? "1号店" : "2号店";
      if (placedFor(room).length && !confirm(label + "の現在の配置を最適化結果で置き換えますか？")) return;

      state.lastTransfer = null;
      roomData(room).history.push(JSON.stringify(placedFor(room)));
      if (roomData(room).history.length > 60) roomData(room).history.shift();

      const selectedSet = new Set(selected);
      let next = [];
      const counts = countStudentsInList(next);
      const usedCounts = new Map();
      ["room1", "room2"].forEach(otherRoom => {
        if (otherRoom === room) return;
        placedFor(otherRoom).forEach(placed => {
          const item = itemById(placed.furnitureId);
          if (item?.craftable === false) usedCounts.set(item.id, (usedCounts.get(item.id) || 0) + 1);
        });
      });
      const maxPlacements = Math.min(GRID * GRID, selected.length * 4 + 80);

      for (let step = 0; step < maxPlacements; step += 1) {
        const unfinished = selected.some(student => (counts.get(student) || 0) < 4);
        if (!unfinished) break;
        const candidates = state.furniture
          .map(item => optimizationCandidateScore(item, selectedSet, counts, usedCounts))
          .filter(Boolean)
          .sort((a, b) => b.score - a.score || areaOf(a.item) - areaOf(b.item) || localeSort(a.item.name, b.item.name));

        let placed = false;
        for (const candidate of candidates) {
          const position = findBestPlacementInList(next, candidate.item);
          if (!position) continue;
          const placedId = crypto.randomUUID ? crypto.randomUUID() : \`p-\${Date.now()}-\${Math.random()}\`;
          next = position.fit.adjusted.map(placed =>
            placed.id === "__candidate__" ? { ...placed, id: placedId } : placed
          );
          usedCounts.set(candidate.item.id, (usedCounts.get(candidate.item.id) || 0) + 1);
          candidate.item.students.forEach(student => counts.set(student, (counts.get(student) || 0) + 1));
          placed = true;
          break;
        }
        if (!placed) break;
      }

      state.rooms[room].placed = next;
      state.currentRoom = room;
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      state.selectedFurnitureId = null;
      const finishedCount = selected.filter(student => (counts.get(student) || 0) >= 4).length;
      state.optimizeNotice = label + "を最適化しました。配置 " + next.length + "個 / 4個到達 " + finishedCount + "人";
      save();
      renderAll();
    }

    function importFurniture() {
      try {
        const text = els.ioBox.value.trim();
        if (!text) return;
        const rows = text.startsWith("[") || text.startsWith("{") ? parseFurnitureJson(text) : parseFurnitureTable(text);
        let added = 0;
        for (const raw of rows) {
          const item = normalizeFurniture(raw);
          if (!item.name || !item.size.width || !item.size.depth || !item.size.height) continue;
          const existing = state.furniture.findIndex(f => f.id === item.id || f.name === item.name);
          if (existing >= 0) state.furniture[existing] = item;
          else state.furniture.push(item);
          added += 1;
        }
        saveFurniture();
        renderAll();
        alert(\`\${added}件の家具データを反映しました。\`);
      } catch (error) {
        alert(\`家具データを読み込めません: \${error.message}\`);
      }
    }

    function parseFurnitureJson(text) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.furniture)) return parsed.furniture;
      throw new Error("家具配列が見つかりません");
    }

    function parseFurnitureTable(text) {
      const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
      const delimiter = text.includes("\t") ? "\t" : ",";
      const header = lines.shift().split(delimiter).map(h => h.trim());
      const index = name => header.findIndex(h => h.includes(name));
      const nameIdx = index("名称") >= 0 ? index("名称") : index("name");
      const sizeIdx = index("サイズ") >= 0 ? index("サイズ") : index("size");
      if (nameIdx < 0 || sizeIdx < 0) throw new Error("名称とサイズの列が必要です");
      const seriesIdx = index("シリーズ");
      const typeIdx = index("種別");
      const rarityIdx = index("ﾚｱ") >= 0 ? index("ﾚｱ") : index("レア");
      const motionIdx = index("家具") >= 0 ? index("家具") : index("students");
      return lines.map(line => {
        const cols = line.split(delimiter).map(c => c.trim());
        const size = parseSize(cols[sizeIdx] || "");
        return {
          name: cols[nameIdx],
          rarity: cols[rarityIdx] || "",
          type: cols[typeIdx] || "",
          series: cols[seriesIdx] || "",
          size,
          students: splitStudents(cols[motionIdx] || ""),
          motionText: cols[motionIdx] || "",
        };
      });
    }

    function parseSize(text) {
      const match = String(text).match(/(\d+)\s*[×xX]\s*(\d+)\s*[×xX]\s*(\d+)/);
      if (!match) return { width: 1, depth: 1, height: 1 };
      return { width: Number(match[1]), depth: Number(match[2]), height: Number(match[3]) };
    }

    function splitStudents(text) {
      return unique(String(text).split(/[\n、,／/・]+/).map(s => normalizeStudentName(s)).filter(Boolean));
    }

    function undo() {
      if (state.lastTransfer) {
        const transfer = state.lastTransfer;
        setPlacedFor(transfer.sourceRoom, transfer.sourceBefore);
        setPlacedFor(transfer.targetRoom, transfer.targetBefore);
        if (transfer.sourceRoom !== "stash") state.currentRoom = transfer.sourceRoom;
        state.selectedPlacedId = null;
        state.selectedPlacedRoom = null;
        state.lastTransfer = null;
        save();
        renderAll();
        return;
      }
      const previous = currentHistory().pop();
      if (!previous) return;
      currentRoom().placed = JSON.parse(previous);
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      save();
      renderAll();
    }

    function save() {
      localStorage.setItem("baCafeRooms", JSON.stringify({
        room1: state.rooms.room1.placed,
        room2: state.rooms.room2.placed,
        stash: state.stash,
      }));
      localStorage.setItem("baCafeCurrentRoom", state.currentRoom);
    }

    function savePreferences() {
      localStorage.setItem("baCafeSelectedStudents", JSON.stringify(state.selectedStudents));
      localStorage.setItem("baCafeStudentPriorities", JSON.stringify(state.studentPriorities));
      localStorage.setItem("baCafeAllowUnselectedMulti", JSON.stringify(state.allowUnselectedMulti));
      localStorage.setItem("baCafeOwnedFurniture", JSON.stringify(state.owned));
      localStorage.setItem("baCafeOwnedCheckedFurniture", JSON.stringify(state.ownedChecked));
      localStorage.setItem("baCafeHideOwnedRequired", JSON.stringify(state.hideOwnedRequired));
    }

    function saveFurniture() {
      localStorage.setItem("baCafeFurniture", JSON.stringify(state.furniture));
    }

    function loadSaved() {
      try {
        const customFurniture = JSON.parse(localStorage.getItem("baCafeFurniture") || "null");
        if (Array.isArray(customFurniture)) state.furniture = customFurniture.map(normalizeFurniture);
        const savedRooms = JSON.parse(localStorage.getItem("baCafeRooms") || "null");
        if (savedRooms && typeof savedRooms === "object") {
          ["room1", "room2"].forEach(room => {
            if (Array.isArray(savedRooms[room])) state.rooms[room].placed = savedRooms[room].filter(p => itemById(p.furnitureId));
          });
          if (Array.isArray(savedRooms.stash)) state.stash = savedRooms.stash.filter(p => itemById(p.furnitureId));
        } else {
          const saved = JSON.parse(localStorage.getItem("baCafeLayout") || "[]");
          if (Array.isArray(saved)) state.rooms.room1.placed = saved.filter(p => itemById(p.furnitureId));
        }
        const currentRoom = localStorage.getItem("baCafeCurrentRoom");
        if (currentRoom === "room1" || currentRoom === "room2") state.currentRoom = currentRoom;
        const selectedStudents = JSON.parse(localStorage.getItem("baCafeSelectedStudents") || "[]");
        if (Array.isArray(selectedStudents)) state.selectedStudents = unique(selectedStudents.map(normalizeStudentName).filter(Boolean));
        const priorities = JSON.parse(localStorage.getItem("baCafeStudentPriorities") || "{}");
        if (priorities && typeof priorities === "object" && !Array.isArray(priorities)) {
          state.studentPriorities = Object.fromEntries(
            Object.entries(priorities)
              .map(([student, priority]) => [normalizeStudentName(student), priority])
              .filter(([student]) => state.selectedStudents.includes(student))
          );
        }
        state.selectedStudents.forEach(student => {
          if (!state.studentPriorities[student]) state.studentPriorities[student] = "medium";
        });
        state.allowUnselectedMulti = JSON.parse(localStorage.getItem("baCafeAllowUnselectedMulti") || "false") === true;
        const owned = JSON.parse(localStorage.getItem("baCafeOwnedFurniture") || "{}");
        if (owned && typeof owned === "object" && !Array.isArray(owned)) state.owned = owned;
        const ownedChecked = JSON.parse(localStorage.getItem("baCafeOwnedCheckedFurniture") || "{}");
        if (ownedChecked && typeof ownedChecked === "object" && !Array.isArray(ownedChecked)) state.ownedChecked = ownedChecked;
        state.hideOwnedRequired = JSON.parse(localStorage.getItem("baCafeHideOwnedRequired") || "false") === true;
      } catch {}
    }

    function renderDataNotice() {
      els.dataNotice.textContent =
        \`\${rawData.count}件の家具、\${rawData.motionCount}件のモーション行、\${rawData.studentCount || 0}人の生徒を同梱。家具取得: \${new Date(rawData.fetchedAt).toLocaleString("ja-JP")} / 生徒取得: \${new Date(rawData.studentFetchedAt || rawData.fetchedAt).toLocaleString("ja-JP")}\`;
    }

    function switchRoom(room, shouldRender = true) {
      if (room !== "room1" && room !== "room2") return;
      state.currentRoom = room;
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      state.drag = null;
      save();
      if (shouldRender) renderAll();
      else {
        renderRoomButtons();
        renderRoomPanelStats();
      }
    }

    function renderRoomButtons() {
      els.activeRoomLabel.textContent = state.currentRoom === "room1" ? "1号店" : "2号店";
    }

    function renderPreferenceControls() {
      els.hideOwnedRequired.checked = state.hideOwnedRequired;
    }

    function renderSummaryTabs() {
      const showBoxes = state.activeSummaryTab === "boxes";
      els.summaryTabStudents.classList.toggle("active", !showBoxes);
      els.summaryTabBoxes.classList.toggle("active", showBoxes);
      els.summaryTabStudents.setAttribute("aria-selected", String(!showBoxes));
      els.summaryTabBoxes.setAttribute("aria-selected", String(showBoxes));
      els.targetStudentsPanel.classList.toggle("hidden", showBoxes);
      els.requiredBoxesPanel.classList.toggle("hidden", !showBoxes);
    }

    function renderMobileDockTabs() {
      ["ops", "picker", "targets"].forEach(tab => {
        const active = state.mobileDockTab === tab;
        const button = document.querySelector(\`[data-mobile-tab="\${tab}"]\`);
        const panel = document.querySelector(\`[data-mobile-panel="\${tab}"]\`);
        button?.classList.toggle("active", active);
        button?.setAttribute("aria-selected", String(active));
        panel?.classList.toggle("active", active);
      });
    }

    function renderMobileViewTabs() {
      document.body.classList.toggle("mobile-view-cafe", state.mobileView === "cafe");
      document.body.classList.toggle("mobile-view-summary", state.mobileView === "summary");
      [els.mobileViewCafeBtn, els.mobileViewSummaryBtn].forEach(button => {
        const active = button.dataset.mobileView === state.mobileView;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
    }

    function rotateAction() {
      if (state.selectedPlacedId) rotateSelectedPlaced();
      else state.rotated = !state.rotated;
    }

    function clearSelectionAction() {
      state.selectedFurnitureId = null;
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      renderAll();
    }

    function clearCurrentRoomAction() {
      if (!currentPlaced().length) return;
      if (!confirm(\`\${state.currentRoom === "room1" ? "1号店" : "2号店"}の配置をすべて消去しますか？\`)) return;
      pushHistory();
      currentRoom().placed = [];
      state.selectedPlacedId = null;
      state.selectedPlacedRoom = null;
      save();
      renderAll();
    }

    function renderAll() {
      renderRoomButtons();
      renderBoard("room1");
      renderBoard("room2");
      renderBoard("stash");
      renderRoomPanelStats();
      renderStashBoard();
      renderStats();
      renderCoveredStudents();
      renderSelectedStudentList();
      renderPreferenceControls();
      renderSummaryTabs();
      renderMobileDockTabs();
      renderMobileViewTabs();
      renderDataNotice();
    }

    function bindEvents() {
      BOARD_ROOMS.forEach(room => {
        const board = boardEl(room);
        board.addEventListener("pointermove", ev => {
          if (!state.drag && room !== "stash" && state.currentRoom !== room) switchRoom(room, false);
          onBoardPointerMove(ev);
        });
        board.addEventListener("pointerup", onBoardPointerUp);
        board.addEventListener("pointercancel", onBoardPointerUp);
        board.addEventListener("pointerleave", () => { if (!state.drag) previewEl(room).style.display = "none"; });
        board.addEventListener("click", ev => {
          if (room !== "stash" && state.currentRoom !== room) switchRoom(room, false);
          if (state.drag) return;
          if (ev.target.classList.contains("furn")) return;
          const pt = pointToCell(ev, board);
          placeSelectedInRoom(room, pt.x, pt.y);
        });
      });
      els.hideOwnedRequired.addEventListener("change", () => {
        state.hideOwnedRequired = els.hideOwnedRequired.checked;
        savePreferences();
        renderCoveredStudents();
      });
      [els.summaryTabStudents, els.summaryTabBoxes].forEach(button => {
        button.addEventListener("click", () => {
          state.activeSummaryTab = button.dataset.summaryTab;
          renderSummaryTabs();
        });
      });
      [els.mobileTabOps, els.mobileTabPicker, els.mobileTabTargets].forEach(button => {
        button.addEventListener("click", () => {
          state.mobileDockTab = button.dataset.mobileTab;
          renderMobileDockTabs();
        });
      });
      [els.mobileViewCafeBtn, els.mobileViewSummaryBtn].forEach(button => {
        button.addEventListener("click", () => {
          state.mobileView = button.dataset.mobileView;
          renderMobileViewTabs();
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      });
      els.mobileStudentSelect.addEventListener("change", () => {
        state.mobileSelectedStudent = els.mobileStudentSelect.value;
        renderMobileStudentPicker();
      });
      els.useStudentFilterBtn.addEventListener("click", useSelectedStudentFilter);
      els.clearSelectedStudentsBtn.addEventListener("click", () => {
        state.selectedStudents = [];
        state.studentPriorities = {};
        state.mobileSelectedStudent = "";
        savePreferences();
        renderSelectedStudentList();
        renderCoveredStudents();
      });
      els.studentSearch.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          filterByStudent(els.studentSearch.value);
        }
      });
      els.studentSearch.addEventListener("input", renderStudentSuggestions);
      els.studentSearch.addEventListener("focus", renderStudentSuggestions);
      els.rotateBtn.addEventListener("click", rotateAction);
      els.clearSelectionBtn.addEventListener("click", clearSelectionAction);
      els.clearTargetsBtn.addEventListener("click", () => {
        els.studentSearch.value = "";
        renderStudentSuggestions();
        renderCoveredStudents();
      });
      els.clearBtn.addEventListener("click", clearCurrentRoomAction);
      els.copyRoom1ToRoom2Btn.addEventListener("click", copyRoom1ToRoom2);
      els.mobileRotateBtn.addEventListener("click", rotateAction);
      els.mobileClearSelectionBtn.addEventListener("click", clearSelectionAction);
      els.mobileClearBtn.addEventListener("click", clearCurrentRoomAction);
      els.mobileCopyRoom1ToRoom2Btn.addEventListener("click", copyRoom1ToRoom2);
      els.mobileStashDrop.addEventListener("click", moveSelectedToStash);
      els.mobileStashDrop.addEventListener("keydown", ev => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        moveSelectedToStash();
      });
      window.addEventListener("keydown", ev => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
        if (ev.key === "Delete" || ev.key === "Backspace") removeSelectedPlaced();
        if (ev.key.toLowerCase() === "r") {
          rotateAction();
        }
        if (ev.key === "Escape") {
          clearSelectionAction();
        }
      });
      window.addEventListener("resize", () => {
        BOARD_ROOMS.forEach(room => renderBoard(room));
      });
    }

    initEls();
    loadSaved();
    setStudentOptions();
    bindEvents();
    renderAll();
  </script>
</body>
</html>`;

const finalHtml = html.replace(/\\`/g, "`").replace(/\\\$\{/g, "${");

await mkdir("outputs", { recursive: true });
await writeFile("outputs/bluearchive-cafe-simulator.html", finalHtml, "utf8");
await writeFile("outputs/index.html", finalHtml, "utf8");
console.log("outputs/bluearchive-cafe-simulator.html");
console.log("outputs/index.html");


