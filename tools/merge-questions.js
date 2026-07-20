#!/usr/bin/env node
// Собирает questions.js из уже принятого банка и файлов очередного захода.
// Dev-only, в образ не попадает.
//
//   node tools/merge-questions.js <файл-захода> [ещё файлы...]
//
// Файл захода — CommonJS: module.exports = {questions: {...}, criteria: {...}}.
// Существующий банк сохраняется, новые ключи добавляются. Конфликт ключа —
// ошибка: перезапись уже отревьюенного контента должна быть осознанной.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "questions.js");

const inputs = process.argv.slice(2);
if (!inputs.length) {
  console.error("укажи хотя бы один файл захода");
  process.exit(1);
}

function loadCurrent() {
  if (!fs.existsSync(OUT)) return {QUESTIONS: {}, QUEST_CRITERIA: {}};
  const src = fs.readFileSync(OUT, "utf8");
  return new Function(`${src}; return {QUESTIONS, QUEST_CRITERIA};`)();
}

function loadZones() {
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const start = src.indexOf("const zones = [");
  let depth = 0, end = -1;
  for (let i = src.indexOf("[", start); i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) { end = i + 1; break; }
  }
  return new Function(`return ${src.slice(src.indexOf("[", start), end)};`)();
}

const cur = loadCurrent();
const zones = loadZones();
const questions = Object.assign({}, cur.QUESTIONS);
const criteria = Object.assign({}, cur.QUEST_CRITERIA);
let added = 0;

for (const file of inputs) {
  const mod = require(path.resolve(file));
  for (const [k, v] of Object.entries(mod.questions || {})) {
    if (k in questions || k in criteria) { console.error(`конфликт ключа ${k} (${file})`); process.exit(1); }
    questions[k] = v; added++;
  }
  for (const [k, v] of Object.entries(mod.criteria || {})) {
    if (k in questions || k in criteria) { console.error(`конфликт ключа ${k} (${file})`); process.exit(1); }
    criteria[k] = v; added++;
  }
}

const byKey = (a, b) => {
  const [az, aq] = a.split(":").map(Number), [bz, bq] = b.split(":").map(Number);
  return az - bz || aq - bq;
};
const s = v => JSON.stringify(v);

// Группируем по зонам, чтобы диффы по заходам читались глазами.
function emit() {
  const zoneOf = k => Number(k.split(":")[0]);
  const usedZones = [...new Set([...Object.keys(questions), ...Object.keys(criteria)].map(zoneOf))].sort((a, b) => a - b);

  let out = `/* Банк вопросов «Путь ИИ».
 *
 * Ключ — questKey(zoneIndex, questIndex) вида "z:q", тот же, что в state.done.
 * Тип квеста выводится из данных: есть в QUESTIONS → викторина,
 * есть в QUEST_CRITERIA → самопроверка, нет нигде → ещё не написан.
 *
 * Правила авторинга — docs/QUESTIONS-STYLE.md.
 * Сборка — node tools/merge-questions.js <файлы захода>
 * Проверка — node tools/check-questions.js
 */

const QUESTIONS_META = { optionCount: 4, questionsPerQuest: 5 };

const QUESTIONS = {
`;
  usedZones.forEach(zi => {
    const keys = Object.keys(questions).filter(k => zoneOf(k) === zi).sort(byKey);
    if (!keys.length) return;
    out += `\n  // ── Зона ${zi + 1}: ${zones[zi].t} ──\n\n`;
    keys.forEach(k => {
      out += `  ${s(k)}: [\n`;
      questions[k].forEach(q => {
        out += `    {\n      prompt: ${s(q.prompt)},\n      options: [\n`;
        q.options.forEach(o => { out += `        ${s(o)},\n`; });
        out = out.replace(/,\n$/, "\n");
        out += `      ],\n      answer: ${q.answer},\n      explanation: ${s(q.explanation)}\n    },\n`;
      });
      out = out.replace(/,\n$/, "\n");
      out += `  ],\n`;
    });
  });
  out = out.replace(/,\n$/, "\n");
  out += `};\n\nconst QUEST_CRITERIA = {\n`;

  usedZones.forEach(zi => {
    const keys = Object.keys(criteria).filter(k => zoneOf(k) === zi).sort(byKey);
    if (!keys.length) return;
    out += `\n  // ── Зона ${zi + 1}: ${zones[zi].t} ──\n\n`;
    keys.forEach(k => {
      out += `  ${s(k)}: [\n`;
      criteria[k].forEach(c => { out += `    ${s(c)},\n`; });
      out = out.replace(/,\n$/, "\n");
      out += `  ],\n`;
    });
  });
  out = out.replace(/,\n$/, "\n");
  out += `};\n`;
  return out;
}

fs.writeFileSync(OUT, emit());
const quizzes = Object.keys(questions).length, crits = Object.keys(criteria).length;
console.log(`Добавлено ключей: ${added}`);
console.log(`Банк: ${quizzes} викторин (${quizzes * 5} вопросов), ${crits} самопроверок`);
