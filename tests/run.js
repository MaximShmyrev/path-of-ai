#!/usr/bin/env node
// Прогоняет все наборы тестов. Код выхода 1, если хоть один упал.
//
//   node tests/run.js
//
// Тесты гоняют приложение в Node поверх заглушки DOM (harness.js): браузера
// в CI нет, а проверить логику викторины, механик класса и экрана создания надо.

const {execFileSync} = require("child_process");
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => /^t\d+\.js$/.test(f)).sort(
  (a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0])
);

let passed = 0, failed = 0, broken = 0;

for (const f of files) {
  let out = "";
  let ok = true;
  try {
    out = execFileSync(process.execPath, [path.join(dir, f)], {encoding: "utf8"});
  } catch (e) {
    ok = false;
    out = (e.stdout || "") + (e.stderr || "");
  }
  const good = (out.match(/✅/g) || []).length;
  const bad = (out.match(/❌/g) || []).length;
  passed += good;
  failed += bad;

  // Ноль проверок при ненулевом коде — набор упал до первой проверки.
  if (!ok && bad === 0) {
    broken++;
    console.log(`✖ ${f}: набор не отработал`);
    console.log(out.split("\n").slice(-12).map(l => "    " + l).join("\n"));
    continue;
  }
  console.log(`${bad ? "✖" : "•"} ${f.padEnd(8)} ✅ ${String(good).padStart(3)}  ❌ ${bad}`);
  if (bad) out.split("\n").filter(l => l.includes("❌")).forEach(l => console.log("    " + l));
}

console.log(`\nПроверок пройдено: ${passed}, провалено: ${failed}${broken ? `, наборов сломано: ${broken}` : ""}`);
process.exit(failed || broken ? 1 : 0);
