import { readFile, writeFile } from "node:fs/promises";

const source = "https://bluearchive.wikiru.jp/index.php?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7";
const headers = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  "accept-language": "ja,en-US;q=0.9,en;q=0.8",
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

function normalizeName(name) {
  return name
    .replace(/\s+/g, "")
    .replace(/（/g, "（")
    .replace(/）/g, "）")
    .trim();
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
  while ((match = re.exec(html))) tables.push(match[0]);
  return tables;
}

function parseRows(tableHtml) {
  return [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) => extractCells(row[1]));
}

async function fetchText(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return await res.text();
}

let html;
try {
  html = await fetchText(source);
} catch {
  html = await readFile("work/characters.html", "utf8");
}

const tables = extractTables(html);
const students = [];

for (const table of tables) {
  const rows = parseRows(table);
  const header = rows[0] ?? [];
  const nameIdx = header.findIndex((h) => h === "名前");
  const schoolIdx = header.findIndex((h) => h === "学校");
  const rarityIdx = header.findIndex((h) => h.includes("レ") || h.includes("ﾚ"));
  if (nameIdx < 0 || schoolIdx < 0) continue;

  for (const row of rows.slice(1)) {
    const name = normalizeName(row[nameIdx] ?? "");
    const school = (row[schoolIdx] ?? "").trim();
    if (!name || !school || name === "名前") continue;
    students.push({
      id: name,
      name,
      school,
      rarity: row[rarityIdx] ?? "",
    });
  }
}

students.sort((a, b) => a.school.localeCompare(b.school, "ja") || a.name.localeCompare(b.name, "ja"));
const schools = [...new Set(students.map((student) => student.school))].sort((a, b) => a.localeCompare(b, "ja"));

await writeFile(
  "work/student-data.json",
  JSON.stringify(
    {
      source,
      fetchedAt: new Date().toISOString(),
      count: students.length,
      schools,
      students,
    },
    null,
    2
  ),
  "utf8"
);

console.log(JSON.stringify({ count: students.length, schools: schools.length }, null, 2));
