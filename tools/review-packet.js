#!/usr/bin/env node
// Готовит пакет для слепого ревью: варианты перемешаны, ключ и разбор сняты.
// Dev-only, в образ не попадает.
//
//   node tools/review-packet.js <каталог-вывода> [зона ...]
//
// Пишет packet.txt (его видит ревьюер) и key.json (его видит только сверка).
// Перемешивание детерминированное — прогон воспроизводим, Math.random не нужен.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const outDir = process.argv[2];
if (!outDir) { console.error("укажи каталог вывода"); process.exit(1); }
const zoneFilter = process.argv.slice(3).map(n => Number(n) - 1);

const src = fs.readFileSync(path.join(ROOT, "questions.js"), "utf8");
const {QUESTIONS} = new Function(`${src}; return {QUESTIONS};`)();

// Простой детерминированный хеш ключа — даёт разный порядок у разных вопросов,
// но один и тот же при каждом запуске.
function shiftFor(key, i) {
  let h = i * 7 + 13;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
  return h % 4;
}

const packet = [], key = [];
Object.keys(QUESTIONS).sort((a, b) => {
  const [az, aq] = a.split(":").map(Number), [bz, bq] = b.split(":").map(Number);
  return az - bz || aq - bq;
}).forEach(k => {
  if (zoneFilter.length && !zoneFilter.includes(Number(k.split(":")[0]))) return;
  QUESTIONS[k].forEach((q, i) => {
    const shift = shiftFor(k, i);
    const order = [0, 1, 2, 3].map(j => (j + shift) % 4);
    packet.push(`${k}#${i}\n${q.prompt}\n` + order.map((j, pos) => `  ${pos}) ${q.options[j]}`).join("\n") + "\n");
    key.push({id: `${k}#${i}`, answer: order.indexOf(q.answer)});
  });
});

fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, "packet.txt"), packet.join("\n"));
fs.writeFileSync(path.join(outDir, "key.json"), JSON.stringify(key));
console.log(`Вопросов в пакете: ${key.length}`);
console.log(`packet.txt и key.json записаны в ${outDir}`);
