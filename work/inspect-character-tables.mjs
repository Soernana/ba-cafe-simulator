import { readFile } from "node:fs/promises";

const html = await readFile("work/characters.html", "utf8");

function text(s) {
  return s
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim()
    .replace(/\s+/g, " ");
}

const tables = [...html.matchAll(/<table\b[^>]*class="[^"]*style_table[^"]*"[^>]*>[\s\S]*?<\/table>/gi)];
console.log("tables", tables.length);
tables.forEach((match, index) => {
  const rows = [...match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const cells = [...((rows[0]?.[1] ?? "").matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi))].map((cell) => text(cell[2]));
  console.log(index, cells.join(" | "));
});

const main = tables[46]?.[0] ?? "";
const rows = [...main.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
  .slice(0, 8)
  .map((row) => [...row[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((cell) => text(cell[2])));
console.log(JSON.stringify(rows, null, 2));
