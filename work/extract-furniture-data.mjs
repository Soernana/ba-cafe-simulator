import { writeFile } from "node:fs/promises";

const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "accept-language": "ja,en-US;q=0.9,en;q=0.8",
};

const pages = {
  furniture: "https://bluearchive.wikiru.jp/index.php?%E5%AE%B6%E5%85%B7",
  motions:
    "https://bluearchive.wikiru.jp/index.php?%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%2F%E5%AE%B6%E5%85%B7%E3%83%A2%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E4%B8%80%E8%A6%A7",
};

function decodeEntities(input) {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&dagger;/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function cellText(html) {
  return decodeEntities(
    html
      .replace(/<br\b[^>]*>/gi, "\n")
      .replace(/<img\b[^>]*>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function extractCells(rowHtml) {
  const cells = [];
  const re = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = re.exec(rowHtml))) cells.push(cellText(match[2]));
  return cells;
}

function extractTables(html) {
  const tables = [];
  const re = /<table\b[^>]*class="[^"]*style_table[^"]*"[^>]*>[\s\S]*?<\/table>/gi;
  let match;
  while ((match = re.exec(html))) {
    tables.push({ index: match.index, html: match[0] });
  }
  return tables;
}

function nearestHeading(html, index) {
  const before = html.slice(Math.max(0, index - 9000), index);
  const matches = [...before.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
  if (!matches.length) return "";
  return cellText(matches.at(-1)[1])
    .replace(/\s+/g, " ")
    .replace(/詳細.*$/, "")
    .replace(/シリーズ.*$/, "")
    .trim();
}

function nearestSeriesInfo(html, index) {
  const before = html.slice(Math.max(0, index - 14000), index);
  const h3Matches = [...before.matchAll(/<h3\b[^>]*>[\s\S]*?<\/h3>/gi)];
  const start = h3Matches.length ? before.lastIndexOf(h3Matches.at(-1)[0]) + h3Matches.at(-1)[0].length : 0;
  const sectionText = cellText(before.slice(start));
  const manufactureDenied = /製造からは出現しない|交換不可能|製造不可能/.test(sectionText);
  const hasManufacture = /入手[:：][\s\S]{0,80}製造|製造（|通常の製造|テイラーメイド/.test(sectionText);
  return {
    obtainText: (sectionText.match(/入手[:：][^\n。]+/)?.[0] ?? "").trim(),
    craftable: manufactureDenied ? false : hasManufacture ? true : null,
  };
}

function parseCraftable(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/[○◯◎]/.test(text)) return true;
  if (/[×✕]/.test(text)) return false;
  if (/不可|なし|無/.test(text)) return false;
  if (/可|製造/.test(text)) return true;
  return null;
}

function parseRows(tableHtml) {
  const rows = [];
  const re = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = re.exec(tableHtml))) rows.push(extractCells(match[1]));
  return rows.filter(Boolean);
}

function keyOf(name) {
  return name.replace(/\s+/g, "").trim();
}

function parseSize(value) {
  const match = value.match(/(\d+)\s*[×xX]\s*(\d+)\s*[×xX]\s*(\d+)/);
  if (!match) return null;
  return {
    width: Number(match[1]),
    depth: Number(match[2]),
    height: Number(match[3]),
  };
}

function splitStudents(value) {
  return [...new Set(
    value
      .split(/[\n、,／/・]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !["-", "―", "なし"].includes(s))
  )];
}

async function fetchText(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return await res.text();
}

function furnitureFromPage(html) {
  const furniture = new Map();
  for (const table of extractTables(html)) {
    const rows = parseRows(table.html);
    const header = rows[0] ?? [];
    const nameIdx = header.findIndex((h) => h.includes("名称"));
    const sizeIdx = header.findIndex((h) => h.includes("サイズ"));
    if (nameIdx < 0 || sizeIdx < 0) continue;

    const rarityIdx = header.findIndex((h) => h.includes("ﾚｱ") || h.includes("レア"));
    const typeIdx = header.findIndex((h) => h.includes("種別"));
    const motionIdx = header.findIndex((h) => h.includes("家具ﾓｰｼｮﾝ") || h.includes("家具モーション"));
    const seriesIdx = header.findIndex((h) => h.includes("シリーズ"));
    const manufactureIdx = header.findIndex((h) => h.includes("製造"));
    const obtainIdx = header.findIndex((h) => h.includes("入手"));
    const fallbackSeries = nearestHeading(html, table.index);
    const seriesInfo = nearestSeriesInfo(html, table.index);

    for (const row of rows.slice(1)) {
      const name = row[nameIdx]?.trim();
      const size = parseSize(row[sizeIdx] ?? "");
      if (!name || !size) continue;
      const key = keyOf(name);
      const existing = furniture.get(key);
      const item = existing ?? {
        id: key,
        name,
        rarity: "",
        type: "",
        size,
        series: "",
        motionText: "",
        students: [],
        craftable: null,
        manufactureText: "",
        obtainText: "",
      };
      item.rarity ||= row[rarityIdx] ?? "";
      item.type ||= row[typeIdx] ?? "";
      item.series ||= (seriesIdx >= 0 ? row[seriesIdx] : fallbackSeries) ?? "";
      const manufactureText = manufactureIdx >= 0 ? row[manufactureIdx] ?? "" : "";
      const obtainText = obtainIdx >= 0 ? row[obtainIdx] ?? "" : "";
      item.manufactureText ||= manufactureText;
      item.obtainText ||= obtainText || seriesInfo.obtainText;
      const explicitCraftable = parseCraftable(manufactureText);
      if (explicitCraftable !== null) item.craftable = explicitCraftable;
      else if (item.craftable === null && seriesInfo.craftable !== null) item.craftable = seriesInfo.craftable;
      const motionText = motionIdx >= 0 ? row[motionIdx] ?? "" : "";
      item.motionText ||= motionText;
      item.students = [...new Set([...item.students, ...splitStudents(motionText)])];
      furniture.set(key, item);
    }
  }
  return furniture;
}

function motionsFromPage(html) {
  const motions = [];
  for (const table of extractTables(html)) {
    const rows = parseRows(table.html);
    const header = rows[0] ?? [];
    const studentIdx = header.findIndex((h) => h.includes("対象生徒"));
    const furnitureIdx = header.findIndex((h) => h.includes("対象家具"));
    if (studentIdx < 0 || furnitureIdx < 0) continue;
    const rarityIdx = header.findIndex((h) => h.includes("ﾚｱ") || h.includes("レア"));
    const typeIdx = header.findIndex((h) => h.includes("種別"));
    const seriesIdx = header.findIndex((h) => h.includes("シリーズ"));
    const noteIdx = header.findIndex((h) => h.includes("備考"));
    for (const row of rows.slice(1)) {
      const student = row[studentIdx]?.trim();
      const furnitureName = row[furnitureIdx]?.trim();
      if (!student || !furnitureName) continue;
      motions.push({
        student,
        furnitureName,
        rarity: row[rarityIdx] ?? "",
        type: row[typeIdx] ?? "",
        series: row[seriesIdx] ?? "",
        note: row[noteIdx] ?? "",
      });
    }
  }
  return motions;
}

const [furnitureHtml, motionHtml] = await Promise.all([
  fetchText(pages.furniture),
  fetchText(pages.motions),
]);

const furnitureMap = furnitureFromPage(furnitureHtml);
const motions = motionsFromPage(motionHtml);

for (const motion of motions) {
  const key = keyOf(motion.furnitureName);
  const item = furnitureMap.get(key);
  if (!item) continue;
  item.rarity ||= motion.rarity;
  item.type ||= motion.type;
  item.series ||= motion.series;
  if (!item.students.includes(motion.student)) item.students.push(motion.student);
  const note = motion.note ? `（${motion.note}）` : "";
  const line = `${motion.student}${note}`;
  item.motionText = item.motionText ? `${item.motionText}\n${line}` : line;
}

const data = [...furnitureMap.values()].sort((a, b) => {
  const ma = a.students.length ? 0 : 1;
  const mb = b.students.length ? 0 : 1;
  return ma - mb || a.series.localeCompare(b.series, "ja") || a.name.localeCompare(b.name, "ja");
});

await writeFile(
  "work/furniture-data.json",
  JSON.stringify(
    {
      source: pages.furniture,
      motionSource: pages.motions,
      fetchedAt: new Date().toISOString(),
      count: data.length,
      motionCount: motions.length,
      furniture: data,
    },
    null,
    2
  ),
  "utf8"
);

console.log(JSON.stringify({ count: data.length, motionCount: motions.length }, null, 2));
