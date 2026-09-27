
    const GRID = 20;
    const MAX_HEIGHT = 7;
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
      selectedFurnitureId: null,
      selectedPlacedId: null,
      rotated: false,
      drag: null,
      selectedStudents: [],
      owned: {},
    };

    const colorCache = new Map();

    function $(id) { return document.getElementById(id); }

    function initEls() {
      [
        "roomSummaries", "activeRoomLabel", "board-room1", "board-room2", "preview-room1", "preview-room2",
        "panel-room1", "panel-room2", "room1Placed", "room2Placed", "room1Students", "room2Students",
        "placedCount", "areaUsed",
        "motionCount", "studentCount", "maxHeight", "heightBadge", "rotateBtn", "clearSelectionBtn",
        "undoBtn", "clearBtn", "exportBtn", "copyBtn", "schoolFilter", "studentSelect", "studentSearch",
        "studentCandidates", "useStudentFilterBtn", "clearTargetsBtn", "clearSelectedStudentsBtn",
        "selectedStudentList",
        "motionOnly", "visibleCount", "furnitureList",
        "ioBox", "importLayoutBtn", "importFurnitureBtn",
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

    function setStudentOptions() {
      fillSelect(els.schoolFilter, ["すべて", ...schoolData]);
      els.studentCandidates.innerHTML = "";
      studentData
        .map(student => student.name)
        .sort(localeSort)
        .forEach(name => {
          const option = document.createElement("option");
          option.value = name;
          els.studentCandidates.append(option);
        });
      renderStudentOptions();
    }

    function renderStudentOptions() {
      const school = els.schoolFilter.value;
      const students = studentData
        .filter(student => !school || student.school === school)
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));
      els.studentSelect.innerHTML = "";
      students.forEach(student => {
        const option = document.createElement("option");
        option.value = student.name;
        option.textContent = student.name;
        els.studentSelect.append(option);
      });
      els.useStudentFilterBtn.disabled = !students.length;
    }

    function filterByStudent(name) {
      name = normalizeStudentName(name);
      if (!name) return;
      els.studentSearch.value = name;
      addSelectedStudent(name);
      renderFurnitureList();
      renderCoveredStudents();
    }

    function useSelectedStudentFilter() {
      filterByStudent(els.studentSearch.value || els.studentSelect.value);
    }

    function addSelectedStudent(name) {
      name = normalizeStudentName(name);
      if (!name) return;
      if (!state.selectedStudents.includes(name)) {
        state.selectedStudents.push(name);
        savePreferences();
      }
      renderSelectedStudentList();
    }

    function removeSelectedStudent(name) {
      state.selectedStudents = state.selectedStudents.filter(student => student !== name);
      savePreferences();
      renderSelectedStudentList();
    }

    function furnitureForStudent(student) {
      return state.furniture
        .filter(item => item.students.includes(student))
        .sort((a, b) => a.series.localeCompare(b.series, "ja") || a.name.localeCompare(b.name, "ja"));
    }

    function renderSelectedStudentList() {
      els.selectedStudentList.innerHTML = "";
      if (!state.selectedStudents.length) {
        els.selectedStudentList.innerHTML = '<div class="empty">学校や検索から生徒を追加すると、対応家具をここで確認できます。</div>';
        return;
      }
      state.selectedStudents.slice().sort(localeSort).forEach(student => {
        const items = furnitureForStudent(student);
        const details = document.createElement("details");
        details.className = "dropdown";
        details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
        details.querySelector("summary span").textContent = student;
        details.querySelector(".tag").textContent = `${items.length}家具`;
        const body = details.querySelector(".dropdown-body");
        if (!items.length) {
          body.innerHTML = '<div class="empty">対応家具が見つかりません。</div>';
        } else {
          items.forEach(item => {
            const row = document.createElement("div");
            row.className = "mini-row";
            row.innerHTML = '<div><strong></strong><div class="count-note"></div></div><button type="button">選択</button>';
            row.querySelector("strong").textContent = item.name;
            row.querySelector(".count-note").textContent = `${item.size.width}×${item.size.depth}×${item.size.height} / ${item.series || "シリーズなし"} / ${manufactureLabel(item)} / 来る生徒: ${item.students.join("、")}`;
            row.querySelector("button").addEventListener("click", () => {
              state.selectedFurnitureId = item.id;
              state.selectedPlacedId = null;
              els.studentSearch.value = student;
              renderFurnitureList();
              renderBoard();
            });
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

    function manufactureLabel(item) {
      if (item.craftable === true) return "製造可";
      if (item.craftable === false) return "製造不可";
      return "製造不明";
    }

    function filteredFurniture() {
      const studentQuery = normalizeStudentName(els.studentSearch.value);
      return state.furniture.filter(item => {
        if (els.motionOnly.checked && !item.students.length) return false;
        if (studentQuery && !item.students.some(student => student.includes(studentQuery))) return false;
        return true;
      });
    }

    function renderFurnitureList() {
      const list = filteredFurniture().slice(0, 220);
      els.visibleCount.textContent = filteredFurniture().length;
      els.furnitureList.innerHTML = "";
      if (!list.length) {
        els.furnitureList.innerHTML = '<div class="empty">条件に合う家具がありません。</div>';
        return;
      }
      const frag = document.createDocumentFragment();
      list.forEach(item => {
        const div = document.createElement("button");
        div.type = "button";
        div.className = "item" + (item.id === state.selectedFurnitureId ? " selected" : "");
        div.dataset.id = item.id;
        div.innerHTML = '<div class="item-title"></div><div class="meta"></div><div class="motion"></div>';
        div.querySelector(".item-title").textContent = item.name;
        div.querySelector(".meta").append(
          tag(`${item.size.width}×${item.size.depth}×${item.size.height}`),
          tag(item.type || "種別なし"),
          tag(item.series || "シリーズなし"),
          tag(item.rarity || "レア不明"),
          tag(manufactureLabel(item))
        );
        div.querySelector(".motion").textContent = item.students.length
          ? `来る生徒: ${item.students.join("、")}`
          : "家具モーションなし";
        div.addEventListener("click", () => {
          state.selectedFurnitureId = item.id;
          state.selectedPlacedId = null;
          renderAll();
        });
        frag.append(div);
      });
      els.furnitureList.append(frag);
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

    function placedById(id) {
      return currentPlaced().find(p => p.id === id);
    }

    function roomData(room) {
      return state.rooms[room];
    }

    function placedFor(room) {
      return roomData(room).placed;
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
      return els[`board-${room}`];
    }

    function previewEl(room = state.currentRoom) {
      return els[`preview-${room}`];
    }

    function panelEl(room = state.currentRoom) {
      return els[`panel-${room}`];
    }

    function canPlace(furniture, x, y, rotated, ignoreId = null) {
      const d = dimsOf(furniture, rotated);
      if (d.height > MAX_HEIGHT || x < 0 || y < 0 || x + d.width > GRID || y + d.depth > GRID) {
        return false;
      }
      if (!isValidWallPosition(furniture, x, y, rotated)) return false;
      const rect = { x, y, width: d.width, depth: d.depth };
      return !currentPlaced().some(p => {
        if (p.id === ignoreId) return false;
        const item = itemById(p.furnitureId);
        if (!item) return false;
        const pd = dimsOf(item, p.rotated);
        return intersects(rect, { x: p.x, y: p.y, width: pd.width, depth: pd.depth });
      });
    }

    function intersects(a, b) {
      return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
    }

    function pushHistory() {
      currentHistory().push(JSON.stringify(currentPlaced()));
      if (currentHistory().length > 60) currentHistory().shift();
    }

    function placeSelected(x, y) {
      const furniture = itemById(state.selectedFurnitureId);
      if (!furniture || !canPlace(furniture, x, y, state.rotated)) return false;
      pushHistory();
      currentPlaced().push({
        id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`,
        furnitureId: furniture.id,
        x, y,
        rotated: state.rotated,
      });
      save();
      renderAll();
      return true;
    }

    function movePlaced(id, x, y) {
      const placed = placedById(id);
      if (!placed) return false;
      const item = itemById(placed.furnitureId);
      if (!item || !canPlace(item, x, y, placed.rotated, id)) return false;
      placed.x = x;
      placed.y = y;
      save();
      renderAll();
      return true;
    }

    function rotateSelectedPlaced() {
      const p = placedById(state.selectedPlacedId);
      if (!p) return;
      const item = itemById(p.furnitureId);
      if (!item || !canPlace(item, p.x, p.y, !p.rotated, p.id)) return;
      pushHistory();
      p.rotated = !p.rotated;
      save();
      renderAll();
    }

    function removeSelectedPlaced() {
      if (!state.selectedPlacedId) return;
      pushHistory();
      currentRoom().placed = currentPlaced().filter(p => p.id !== state.selectedPlacedId);
      state.selectedPlacedId = null;
      save();
      renderAll();
    }

    function renderBoard(room = state.currentRoom) {
      const board = boardEl(room);
      [...board.querySelectorAll(".furn, .axis")].forEach(n => n.remove());
      for (let i = 0; i <= GRID; i += 5) {
        const x = document.createElement("div");
        x.className = "axis";
        x.style.left = `${i * cellSize(board) + 2}px`;
        x.style.top = "2px";
        x.textContent = i;
        board.append(x);
        const y = document.createElement("div");
        y.className = "axis";
        y.style.left = "3px";
        y.style.top = `${i * cellSize(board) + 14}px`;
        y.textContent = i;
        board.append(y);
      }
      placedFor(room).forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        const d = dimsOf(item, p.rotated);
        const div = document.createElement("div");
        div.className = "furn" + (room === state.currentRoom && p.id === state.selectedPlacedId ? " selected" : "");
        div.dataset.id = p.id;
        div.dataset.motion = String(Boolean(item.students.length));
        div.style.left = `${p.x * cellSize(board)}px`;
        div.style.top = `${p.y * cellSize(board)}px`;
        div.style.width = `${d.width * cellSize(board)}px`;
        div.style.height = `${d.depth * cellSize(board)}px`;
        div.style.backgroundColor = colorFor(item.series);
        div.title = `${item.name}\n${d.width}×${d.depth}×${d.height}\n${item.students.join("、")}`;
        div.textContent = compactLabel(item.name, d.width, d.depth);
        div.addEventListener("pointerdown", ev => startDrag(ev, p.id, room));
        board.append(div);
      });
    }

    function compactLabel(name, w, d) {
      if (w * d <= 2) return "";
      const limit = w * d <= 4 ? 4 : 9;
      return name.length > limit ? `${name.slice(0, limit)}…` : name;
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
      preview.style.left = `${pt.x * cellSize(board)}px`;
      preview.style.top = `${pt.y * cellSize(board)}px`;
      preview.style.width = `${d.width * cellSize(board)}px`;
      preview.style.height = `${d.depth * cellSize(board)}px`;
      preview.classList.toggle("bad", !canPlace(item, pt.x, pt.y, state.rotated));
    }

    function startDrag(ev, id, room = state.currentRoom) {
      ev.preventDefault();
      if (state.currentRoom !== room) switchRoom(room, false);
      const p = placedById(id);
      if (!p) return;
      state.selectedPlacedId = id;
      state.selectedFurnitureId = null;
      state.drag = { id, startX: p.x, startY: p.y, moved: false };
      boardEl(room).setPointerCapture(ev.pointerId);
      renderAll();
    }

    function onBoardPointerMove(ev) {
      if (state.drag) {
        const p = placedById(state.drag.id);
        const item = p && itemById(p.furnitureId);
        if (!p || !item) return;
        const d = dimsOf(item, p.rotated);
        const board = boardEl(state.currentRoom);
        const pt = pointToCell(ev, board);
        const x = clamp(pt.x, 0, GRID - d.width);
        const y = clamp(pt.y, 0, GRID - d.depth);
        if (x !== p.x || y !== p.y) {
          if (!state.drag.moved) {
            pushHistory();
            state.drag.moved = true;
          }
          if (canPlace(item, x, y, p.rotated, p.id)) {
            p.x = x;
            p.y = y;
            save();
            renderBoard(state.currentRoom);
          }
        }
        return;
      }
      updatePreview(ev, state.currentRoom);
    }

    function onBoardPointerUp(ev) {
      if (state.drag) {
        state.drag = null;
        try { boardEl(state.currentRoom).releasePointerCapture(ev.pointerId); } catch {}
      }
    }

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    function colorFor(value) {
      const key = value || "none";
      if (colorCache.has(key)) return colorCache.get(key);
      let hash = 0;
      for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      const hue = hash % 360;
      const color = `hsl(${hue} 78% 93%)`;
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

    function renderStats() {
      let used = 0;
      let motion = 0;
      let maxHeight = 0;
      const counts = computeStudentCounts();
      currentPlaced().forEach(p => {
        const item = itemById(p.furnitureId);
        if (!item) return;
        used += areaOf(item, p.rotated);
        maxHeight = Math.max(maxHeight, item.size.height);
        if (item.students.length) motion += 1;
      });
      els.placedCount.textContent = currentPlaced().length;
      els.areaUsed.textContent = used;
      els.motionCount.textContent = motion;
      els.studentCount.textContent = counts.size;
      els.maxHeight.textContent = maxHeight;
      els.heightBadge.classList.toggle("ok", maxHeight <= MAX_HEIGHT);
      els.heightBadge.classList.toggle("warn", maxHeight > MAX_HEIGHT);
      els.undoBtn.disabled = !currentHistory().length;
    }

    function renderRoomPanelStats() {
      ["room1", "room2"].forEach(room => {
        els[`${room}Placed`].textContent = placedFor(room).length;
        els[`${room}Students`].textContent = computeStudentCounts(room).size;
        panelEl(room).classList.toggle("active", state.currentRoom === room);
      });
    }

    function renderCoveredStudents() {
      els.roomSummaries.innerHTML = "";
      ["room1", "room2"].forEach(room => {
        const label = room === "room1" ? "1号店" : "2号店";
        const details = document.createElement("details");
        details.className = "dropdown";
        details.open = true;
        details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
        details.querySelector("summary span").textContent = label;
        const counts = computeStudentCounts(room);
        details.querySelector(".tag").textContent = `${counts.size}人`;
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
            span.textContent = `${student} ${count}個`;
            span.title = "クリックでこの生徒の家具に絞り込み";
            span.addEventListener("click", () => {
              filterByStudent(student);
            });
            grid.append(span);
          });
        }
        body.append(grid);
        const box = document.createElement("div");
        box.className = "box-summary";
        box.innerHTML = '<h3>必要家具選択ボックス数</h3><div class="status" style="justify-content:flex-start"><span class="pill">家具 <strong data-role="furniture">0</strong>個</span><span class="pill">シリーズ <strong data-role="series">0</strong>種類</span><span class="pill warn">製造不可 <strong data-role="unavailable">0</strong>個</span></div><div class="series-breakdown"></div>';
        body.append(box);
        renderRequiredBoxes(room, box);
        els.roomSummaries.append(details);
      });
    }

    function renderRequiredBoxes(room, root) {
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
        details.querySelector(".tag").textContent = `${unavailableNeeded}個`;
        const body = details.querySelector(".dropdown-body");
        unavailableRows
          .sort((a, b) => b.unavailable - a.unavailable || localeSort(a.item.name, b.item.name))
          .forEach(({ item, count, owned, unavailable }) => {
            const row = document.createElement("div");
            row.className = "owned-row";
            row.innerHTML = '<div class="owned-row-main"><strong></strong><div class="count-note"></div></div><div class="owned-controls"><div></div><label>所有<input type="number" min="0"></label><strong></strong></div>';
            row.querySelector(".owned-row-main strong").textContent = item.name;
            row.querySelector(".count-note").textContent = item.students.length
              ? `入手: ${item.obtainText || "不明"} / 来る生徒: ${item.students.join("、")}`
              : `入手: ${item.obtainText || "不明"}`;
            row.querySelector(".owned-controls div").textContent = `配置${count}`;
            const input = row.querySelector("input");
            input.value = owned;
            input.addEventListener("input", () => {
              state.owned[item.id] = Math.max(0, Number(input.value || 0));
              savePreferences();
              renderCoveredStudents();
            });
            row.querySelector(".owned-controls strong").textContent = `製造不可${unavailable}`;
            body.append(row);
          });
        breakdown.append(details);
      }
      [...seriesMap.entries()]
        .sort((a, b) => (b[1].needed + b[1].unavailable) - (a[1].needed + a[1].unavailable) || localeSort(a[0], b[0]))
        .forEach(([series, entry]) => {
          const details = document.createElement("details");
          details.className = "dropdown";
          details.open = entry.needed > 0;
          details.open = entry.needed > 0 || entry.unavailable > 0;
          details.innerHTML = '<summary><span></span><span class="tag"></span></summary><div class="dropdown-body"></div>';
          details.querySelector("summary span").textContent = series;
          details.querySelector(".tag").textContent = `不足${entry.needed} / 製造不可${entry.unavailable} / 配置${entry.placed}`;
          const body = details.querySelector(".dropdown-body");
          entry.rows
            .sort((a, b) => (b.needed + b.unavailable) - (a.needed + a.unavailable) || localeSort(a.item.name, b.item.name))
            .forEach(({ item, count, owned, needed, unavailable, shortage }) => {
              const row = document.createElement("div");
              row.className = "owned-row";
              row.innerHTML = '<div class="owned-row-main"><strong></strong><div class="count-note"></div></div><div class="owned-controls"><div></div><label>所有<input type="number" min="0"></label><strong></strong></div>';
              row.querySelector(".owned-row-main strong").textContent = item.name;
              row.querySelector(".count-note").textContent = item.students.length
                ? `${manufactureLabel(item)} / 来る生徒: ${item.students.join("、")}`
                : manufactureLabel(item);
              row.querySelector(".owned-controls div").textContent = `配置${count}`;
              const input = row.querySelector("input");
              input.value = owned;
              input.addEventListener("input", () => {
                state.owned[item.id] = Math.max(0, Number(input.value || 0));
                savePreferences();
                renderCoveredStudents();
              });
              row.querySelector(".owned-controls strong").textContent = unavailable > 0 ? "製造不可" : shortage === 0 ? "所持済" : `不足${needed}`;
              body.append(row);
            });
          breakdown.append(details);
        });
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
        div.querySelector(".placed-pos").textContent = `x${s.x + 1}, y${s.y + 1} / ${dimsOf(item, s.rotated).width}×${dimsOf(item, s.rotated).depth}`;
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
        const next = [];
        for (const row of incoming) {
          const id = row.furnitureId || state.furniture.find(f => f.name === row.name)?.id;
          const item = itemById(id);
          if (!item) continue;
          const p = {
            id: crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`,
            furnitureId: item.id,
            x: Number(row.x || 0),
            y: Number(row.y || 0),
            rotated: Boolean(row.rotated),
          };
          if (canPlaceInList(next, item, p.x, p.y, p.rotated)) next.push(p);
        }
        pushHistory();
        currentRoom().placed = next;
        save();
        renderAll();
      } catch (error) {
        alert(`配置を読み込めません: ${error.message}`);
      }
    }

    function canPlaceInList(list, furniture, x, y, rotated) {
      const d = dimsOf(furniture, rotated);
      if (d.height > MAX_HEIGHT || x < 0 || y < 0 || x + d.width > GRID || y + d.depth > GRID) return false;
      if (!isValidWallPosition(furniture, x, y, rotated)) return false;
      const rect = { x, y, width: d.width, depth: d.depth };
      return !list.some(p => {
        const item = itemById(p.furnitureId);
        if (!item) return false;
        const pd = dimsOf(item, p.rotated);
        return intersects(rect, { x: p.x, y: p.y, width: pd.width, depth: pd.depth });
      });
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
        alert(`${added}件の家具データを反映しました。`);
      } catch (error) {
        alert(`家具データを読み込めません: ${error.message}`);
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
      const previous = currentHistory().pop();
      if (!previous) return;
      currentRoom().placed = JSON.parse(previous);
      save();
      renderAll();
    }

    function save() {
      localStorage.setItem("baCafeRooms", JSON.stringify({
        room1: state.rooms.room1.placed,
        room2: state.rooms.room2.placed,
      }));
      localStorage.setItem("baCafeCurrentRoom", state.currentRoom);
    }

    function savePreferences() {
      localStorage.setItem("baCafeSelectedStudents", JSON.stringify(state.selectedStudents));
      localStorage.setItem("baCafeOwnedFurniture", JSON.stringify(state.owned));
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
        } else {
          const saved = JSON.parse(localStorage.getItem("baCafeLayout") || "[]");
          if (Array.isArray(saved)) state.rooms.room1.placed = saved.filter(p => itemById(p.furnitureId));
        }
        const currentRoom = localStorage.getItem("baCafeCurrentRoom");
        if (currentRoom === "room1" || currentRoom === "room2") state.currentRoom = currentRoom;
        const selectedStudents = JSON.parse(localStorage.getItem("baCafeSelectedStudents") || "[]");
        if (Array.isArray(selectedStudents)) state.selectedStudents = unique(selectedStudents.map(normalizeStudentName).filter(Boolean));
        const owned = JSON.parse(localStorage.getItem("baCafeOwnedFurniture") || "{}");
        if (owned && typeof owned === "object" && !Array.isArray(owned)) state.owned = owned;
      } catch {}
    }

    function renderDataNotice() {
      els.dataNotice.textContent =
        `${rawData.count}件の家具、${rawData.motionCount}件のモーション行、${rawData.studentCount || 0}人の生徒を同梱。家具取得: ${new Date(rawData.fetchedAt).toLocaleString("ja-JP")} / 生徒取得: ${new Date(rawData.studentFetchedAt || rawData.fetchedAt).toLocaleString("ja-JP")}`;
    }

    function switchRoom(room, shouldRender = true) {
      if (room !== "room1" && room !== "room2") return;
      state.currentRoom = room;
      state.selectedPlacedId = null;
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

    function renderAll() {
      renderRoomButtons();
      renderBoard("room1");
      renderBoard("room2");
      renderRoomPanelStats();
      renderStats();
      renderCoveredStudents();
      renderSelectedStudentList();
      renderFurnitureList();
      renderDataNotice();
    }

    function bindEvents() {
      ["room1", "room2"].forEach(room => {
        const board = boardEl(room);
        board.addEventListener("pointermove", ev => {
          if (!state.drag && state.currentRoom !== room) switchRoom(room, false);
          onBoardPointerMove(ev);
        });
        board.addEventListener("pointerup", onBoardPointerUp);
        board.addEventListener("pointerleave", () => { if (!state.drag) previewEl(room).style.display = "none"; });
        board.addEventListener("click", ev => {
          if (state.currentRoom !== room) switchRoom(room, false);
          if (state.drag) return;
          if (ev.target.classList.contains("furn")) return;
          const pt = pointToCell(ev, board);
          placeSelected(pt.x, pt.y);
        });
      });
      els.schoolFilter.addEventListener("change", renderStudentOptions);
      els.useStudentFilterBtn.addEventListener("click", useSelectedStudentFilter);
      els.clearSelectedStudentsBtn.addEventListener("click", () => {
        state.selectedStudents = [];
        savePreferences();
        renderSelectedStudentList();
      });
      els.studentSearch.addEventListener("keydown", ev => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          filterByStudent(els.studentSearch.value);
        }
      });
      els.studentSearch.addEventListener("input", renderFurnitureList);
      els.motionOnly.addEventListener("change", renderFurnitureList);
      els.rotateBtn.addEventListener("click", () => {
        if (state.selectedPlacedId) rotateSelectedPlaced();
        else state.rotated = !state.rotated;
      });
      els.clearSelectionBtn.addEventListener("click", () => {
        state.selectedFurnitureId = null;
        state.selectedPlacedId = null;
        renderAll();
      });
      els.clearTargetsBtn.addEventListener("click", () => {
        els.studentSearch.value = "";
        renderFurnitureList();
        renderCoveredStudents();
      });
      els.undoBtn.addEventListener("click", undo);
      els.clearBtn.addEventListener("click", () => {
        if (!currentPlaced().length) return;
        if (!confirm(`${state.currentRoom === "room1" ? "1号店" : "2号店"}の配置をすべて消去しますか？`)) return;
        pushHistory();
        currentRoom().placed = [];
        state.selectedPlacedId = null;
        save();
        renderAll();
      });
      els.exportBtn.addEventListener("click", exportLayout);
      els.copyBtn.addEventListener("click", async () => {
        if (!els.ioBox.value.trim()) exportLayout();
        await navigator.clipboard.writeText(els.ioBox.value);
      });
      els.importLayoutBtn.addEventListener("click", importLayout);
      els.importFurnitureBtn.addEventListener("click", importFurniture);
      window.addEventListener("keydown", ev => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
        if (ev.key === "Delete" || ev.key === "Backspace") removeSelectedPlaced();
        if (ev.key.toLowerCase() === "r") {
          if (state.selectedPlacedId) rotateSelectedPlaced();
          else state.rotated = !state.rotated;
        }
        if (ev.key === "Escape") {
          state.selectedFurnitureId = null;
          state.selectedPlacedId = null;
          renderAll();
        }
      });
      window.addEventListener("resize", renderBoard);
    }

    initEls();
    loadSaved();
    setStudentOptions();
    bindEvents();
    renderAll();
  
