#!/usr/bin/env node
// Сверяет ответы двух слепых ревьюеров с ключом и раскладывает вопросы
// по решениям согласно правилам захода. Dev-only.
//
//   node tools/score-review.js <key.json> <reviewerA.md> <reviewerB.md>
//
// Файлы ревьюеров — их markdown-таблицы как есть:
//   | 0:1#0 | 2 | 3 |  |  |
//   | id | pick | confidence | flags | note |

const fs = require("fs");

const [keyPath, aPath, bPath] = process.argv.slice(2);
if (!keyPath || !aPath || !bPath) {
  console.error("нужны: key.json ответыA ответыB");
  process.exit(1);
}

// Парсим строки вида | 2:0#3 | 1 | 3 | multi-correct | ... |
function parse(file) {
  const out = {};
  fs.readFileSync(file, "utf8").split("\n").forEach(line => {
    const m = line.match(/^\s*\|\s*(\d+:\d+#\d+)\s*\|\s*(\d)\s*\|\s*(\d)\s*\|([^|]*)\|/);
    if (!m) return;
    out[m[1]] = {
      pick: Number(m[2]),
      conf: Number(m[3]),
      flags: m[4].trim().split(/[,\s]+/).filter(f => f && f !== "-")
    };
  });
  return out;
}

const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const A = parse(aPath), B = parse(bPath);

const HARD = new Set(["multi-correct", "no-correct"]);
const buckets = {accept: [], edit: [], rewrite: [], adjudicate: [], missing: []};
let agreeA = 0, agreeB = 0, both = 0;

key.forEach(({id, answer}) => {
  const a = A[id], b = B[id];
  if (!a || !b) { buckets.missing.push(id); return; }
  const okA = a.pick === answer, okB = b.pick === answer;
  if (okA) agreeA++;
  if (okB) agreeB++;
  if (okA && okB) both++;

  const flags = [...new Set([...a.flags, ...b.flags])];
  const hard = flags.filter(f => HARD.has(f));
  const minConf = Math.min(a.conf, b.conf);

  if (hard.length) buckets.adjudicate.push(`${id}  [${hard.join(",")}]`);
  else if (!okA || !okB) buckets.rewrite.push(`${id}  ключ ${answer}, A=${a.pick} B=${b.pick}`);
  else if (a.conf === 1 && b.conf === 1) buckets.rewrite.push(`${id}  оба угадывали`);
  else if (minConf < 3 || flags.length) buckets.edit.push(`${id}  [${flags.join(",") || "низкая уверенность"}]`);
  else buckets.accept.push(id);
});

const n = key.length;
const pct = x => `${Math.round(x / n * 100)}%`;
console.log(`Вопросов: ${n}`);
console.log(`Согласие A с ключом: ${agreeA}/${n} = ${pct(agreeA)}`);
console.log(`Согласие B с ключом: ${agreeB}/${n} = ${pct(agreeB)}`);
console.log(`Оба попали:          ${both}/${n} = ${pct(both)}   ← ворота захода (нужно ≥90%)`);
console.log("");
console.log(`Принять без правок:  ${buckets.accept.length}`);
console.log(`Правка на месте:     ${buckets.edit.length}`);
console.log(`Переписать:          ${buckets.rewrite.length}`);
console.log(`Третейский разбор:   ${buckets.adjudicate.length}`);
if (buckets.missing.length) console.log(`НЕТ ОТВЕТА:          ${buckets.missing.length}`);

const dump = (title, list) => { if (list.length) { console.log(`\n=== ${title} ===`); list.forEach(x => console.log("  " + x)); } };
dump("Третейский разбор (multi-correct / no-correct)", buckets.adjudicate);
dump("Переписать", buckets.rewrite);
dump("Правка на месте", buckets.edit);
dump("Нет ответа ревьюера", buckets.missing);

// Ворота: <80% — заход отклоняется целиком.
const ratio = both / n;
console.log("");
if (ratio < 0.8) { console.log("❌ Согласие ниже 80% — заход отклоняется целиком и переписывается."); process.exit(1); }
if (ratio < 0.9) console.log("⚠ Согласие 80-90% — чинить точечно и переревьюить исправленное.");
else console.log("✅ Ворота согласия пройдены.");
