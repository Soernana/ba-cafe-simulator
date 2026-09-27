import { readFile } from "node:fs/promises";

const html = await readFile("work/furniture.html", "utf8");

function text(s) {
  return s
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<img\b[^>]*>/gi, "")
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
  const header = [...((rows[0]?.[1] ?? "").matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi))].map((cell) => text(cell[2]));
  if (header.some((h) => h.includes("名称") || h.includes("入手") || h.includes("製造"))) {
    console.log(index, header.join(" | "));
    const sample = [...((rows[1]?.[1] ?? "").matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi))].map((cell) => text(cell[2]));
    console.log("  sample:", sample.join(" | "));
  }
});

for (const pattern of ["入手：", "製造", "家具選択ボックス", "製造不可"]) {
  const idx = html.indexOf(pattern);
  console.log(pattern, idx, idx >= 0 ? text(html.slice(Math.max(0, idx - 500), idx + 800)) : "");
}
