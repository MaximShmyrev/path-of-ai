#!/usr/bin/env node
// Валидатор банка вопросов. Node без зависимостей, dev-only, в образ не попадает.
//
//   node tools/check-questions.js              полная проверка
//   node tools/check-questions.js --coverage   таблица покрытия
//   node tools/check-questions.js --todo       ненаписанные квесты (маркер границы захода)
//   node tools/check-questions.js --zone 5     ограничить зоной
//
// Код выхода 1, если есть хотя бы одна ошибка. Предупреждения не валят прогон.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OPTION_COUNT = 4;
const QUESTIONS_PER_QUEST = 5;

const args = process.argv.slice(2);
const has = f => args.includes(f);
const zoneFilter = args.includes("--zone") ? Number(args[args.indexOf("--zone") + 1]) - 1 : null;

// ── Загрузка ────────────────────────────────────────────────────────────────

// questions.js — обычный скрипт с глобалами. Выполняем в изолированной
// области через new Function, чтобы сам файл остался без модульного синтаксиса.
function loadBank() {
  const file = path.join(ROOT, "questions.js");
  if (!fs.existsSync(file)) return { QUESTIONS: {}, QUEST_CRITERIA: {}, src: "", missing: true };
  const src = fs.readFileSync(file, "utf8");
  const fn = new Function(`${src}; return {QUESTIONS, QUEST_CRITERIA, QUESTIONS_META};`);
  return Object.assign(fn(), { src });
}

// zones достаём из index.html тем же способом, что и приложение их объявляет.
function loadZones() {
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const start = src.indexOf("const zones = [");
  if (start < 0) throw new Error("не нашёл `const zones = [` в index.html");
  let depth = 0, end = -1;
  for (let i = src.indexOf("[", start); i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]" && --depth === 0) { end = i + 1; break; }
  }
  return new Function(`return ${src.slice(src.indexOf("[", start), end)};`)();
}

// ── Текстовые утилиты ───────────────────────────────────────────────────────

const norm = s => s.toLowerCase()
  .replace(/ё/g, "е")
  .replace(/[«»"“”„'’]/g, "")
  .replace(/[.,!?;:()\[\]—–-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const trigrams = s => {
  const t = ` ${norm(s)} `, out = new Set();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
};

const jaccard = (a, b) => {
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
};

const STOP = new Set(["это", "для", "как", "что", "при", "или", "его", "она", "они", "все", "так", "если", "чтобы", "тогда", "когда", "быть", "может"]);
// Грубый стеммер вместо морфологической библиотеки: 5-символьный префикс.
// Шести не хватало — «ошибка/ошибку» и «порог/порога» расходились, и проверки
// H6/H7 шумели на верном контенте.
const stems = s => new Set(
  norm(s).split(" ").filter(w => w.length >= 4 && !STOP.has(w)).map(w => w.slice(0, 5))
);

const BANNED = /всё вышеперечисленное|все вышеперечисленное|ничего из перечисленного|оба варианта|все варианты верны|ни один из перечисленных|все ответы верны/i;
const TRANSLIT = /эмбеддинг|чанкинг|реранкинг|ретривал|промптинг|файнтюнинг|ретрай/i;
const CONTRAST = /а не |в отличие|тогда как|наоборот|напротив|не влия|не гарант|ошибочно|путают|тогда как|тогда как/i;

// ── Накопление проблем ──────────────────────────────────────────────────────

const errors = [], warnings = [];
const err = (id, where, msg) => errors.push(`${id} ${where}: ${msg}`);
const warn = (id, where, msg) => warnings.push(`${id} ${where}: ${msg}`);

// Подавление: строчный комментарий `// ok:H4 — причина` рядом с вопросом.
function suppressions(src) {
  const out = new Set();
  src.split("\n").forEach(line => {
    const m = line.match(/\/\/\s*ok:([A-Z0-9,]+)/);
    if (m) m[1].split(",").forEach(code => out.add(`${code}`));
  });
  return out;
}

// ── Проверки ────────────────────────────────────────────────────────────────

function main() {
  const bank = loadBank();
  const zones = loadZones();
  const { QUESTIONS = {}, QUEST_CRITERIA = {} } = bank;
  const suppressed = suppressions(bank.src || "");

  if (bank.missing) {
    console.log("questions.js отсутствует — банк пуст (приложение работает в режиме чекбоксов).");
  }

  const validKeys = new Set();
  zones.forEach((z, zi) => z.q.forEach((_, qi) => validKeys.add(`${zi}:${qi}`)));

  const inZone = key => zoneFilter === null || Number(key.split(":")[0]) === zoneFilter;

  // S1/S2 — ключи
  for (const key of [...Object.keys(QUESTIONS), ...Object.keys(QUEST_CRITERIA)]) {
    if (!/^\d+:\d+$/.test(key)) { err("S1", key, "ключ не в формате z:q"); continue; }
    if (!validKeys.has(key)) err("S1", key, "нет такого квеста в zones");
  }
  for (const key of Object.keys(QUESTIONS)) {
    if (key in QUEST_CRITERIA) err("S2", key, "ключ есть и в QUESTIONS, и в QUEST_CRITERIA");
  }

  // Вопросы
  const allPrompts = [];
  const answerHistogram = [0, 0, 0, 0];

  for (const [key, items] of Object.entries(QUESTIONS)) {
    if (!inZone(key)) continue;
    if (!Array.isArray(items) || items.length !== QUESTIONS_PER_QUEST) {
      err("S3", key, `ожидалось ${QUESTIONS_PER_QUEST} вопросов, получено ${Array.isArray(items) ? items.length : typeof items}`);
      continue;
    }

    let longestCorrect = 0;
    const idxCount = [0, 0, 0, 0];

    items.forEach((q, i) => {
      const at = `${key}#${i}`;
      const keys = Object.keys(q).sort().join(",");
      if (keys !== "answer,explanation,options,prompt") { err("S4", at, `поля: ${keys}`); return; }
      if (!Array.isArray(q.options) || q.options.length !== OPTION_COUNT) { err("S5", at, `вариантов: ${q.options && q.options.length}`); return; }
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= OPTION_COUNT) { err("S6", at, `answer=${q.answer}`); return; }
      if (!String(q.prompt).trim() || !String(q.explanation).trim() || q.options.some(o => !String(o).trim())) { err("S7", at, "пустое поле"); return; }

      const normed = q.options.map(norm);
      if (new Set(normed).size !== normed.length) err("S8", at, "дублирующиеся варианты");

      if (BANNED.test(q.prompt) || q.options.some(o => BANNED.test(o))) err("H10", at, "запрещённая конструкция");
      if (TRANSLIT.test(q.prompt) || TRANSLIT.test(q.explanation) || q.options.some(o => TRANSLIT.test(o))) {
        err("H13", at, "транслитерация вместо латиницы");
      }

      allPrompts.push({ at, prompt: q.prompt, tri: trigrams(q.prompt) });
      answerHistogram[q.answer]++;
      idxCount[q.answer]++;

      // H3 — близкие варианты внутри вопроса
      for (let a = 0; a < q.options.length; a++) {
        for (let b = a + 1; b < q.options.length; b++) {
          // Порог поднят с 0.80: минимальные пары («столбцы A и строки B» против
          // «строки A и строки B») — законный приём там, где различие понятий
          // и есть предмет вопроса. Ловим настоящие дубли, а не близкие формулировки.
          if (jaccard(trigrams(q.options[a]), trigrams(q.options[b])) > 0.9) {
            warn("H3", at, `варианты ${a} и ${b} почти совпадают`);
          }
        }
      }

      // H4 — length-tell
      const lens = q.options.map(o => o.length);
      const correct = lens[q.answer];
      const others = lens.filter((_, i2) => i2 !== q.answer);
      const maxOther = Math.max(...others);
      const meanOther = others.reduce((a, b) => a + b, 0) / others.length;
      // Для агрегата считаем и ничью: если ключ раз за разом не короче всех
      // остальных, это та же систематическая утечка, просто мягче выраженная.
      if (correct >= maxOther) longestCorrect++;
      if (!suppressed.has("H4") && correct > maxOther && correct > meanOther * 1.35 && correct - meanOther > 20) {
        warn("H4", at, `верный вариант заметно длиннее (${correct} против ${Math.round(meanOther)})`);
      }

      // H5 — вариант-филлер
      const sorted = [...lens].sort((a, b) => a - b);
      const median = sorted[Math.floor(lens.length / 2)];
      lens.forEach((l, i2) => {
        if (l * 2 < median && median - l > 15) warn("H5", at, `вариант ${i2} вдвое короче остальных`);
      });

      // H6 — explanation упоминает верный вариант
      const optStems = stems(q.options[q.answer]);
      const expStems = stems(q.explanation);
      let hit = 0;
      for (const st of optStems) if (expStems.has(st)) hit++;
      // Достаточно одного совпадения содержательной основы. Порог в два давал
      // сплошные ложные срабатывания: разбор «…типично для leakage» дословно
      // называет ключевой термин, но совпадает с вариантом лишь одним словом.
      if (!suppressed.has("H6") && hit < 1) warn("H6", at, "разбор не упоминает верный вариант");

      // H7 — explanation противопоставляет
      let touchesDistractor = false;
      q.options.forEach((o, i2) => {
        if (i2 === q.answer) return;
        for (const st of stems(o)) if (expStems.has(st)) { touchesDistractor = true; break; }
      });
      if (!suppressed.has("H7") && !touchesDistractor && !CONTRAST.test(q.explanation)) {
        warn("H7", at, "разбор не объясняет, почему падает дистрактор");
      }

      if (q.prompt.length < 40) warn("H8", at, `prompt короткий (${q.prompt.length})`);
      const el = q.explanation.length;
      if (el < 60 || el > 350) warn("H9", at, `explanation ${el} символов (норма 60-350)`);
      // Версия — только с явным маркером. Голое десятичное число ловить нельзя:
      // в ML-вопросах это метрики и пороги (accuracy 0.99, порог 0.5), без них
      // задачу не сформулировать.
      if (/\bv\d+\.\d+|верси[яию]\s*\d|\bpython\s*\d+\.\d+/i.test(q.prompt) || /\$|₽|руб\./.test(q.prompt)) {
        warn("H16", at, "вопрос на заучивание версии или цены");
      }

      // H15 — смешение грамматических форм
      const endsDot = q.options.map(o => /[.!?]$/.test(o.trim()));
      if (new Set(endsDot).size > 1) warn("H15", at, "варианты разной грамматической формы");
    });

    if (longestCorrect >= 3) warn("H4agg", key, `верный вариант — самый длинный в ${longestCorrect} из 5 вопросов`);
    idxCount.forEach((n, i) => { if (n >= 3) warn("H11", key, `индекс ${i} использован ${n} раз из 5`); });
  }

  // H1/H2 — дубли по всему банку
  for (let i = 0; i < allPrompts.length; i++) {
    for (let j = i + 1; j < allPrompts.length; j++) {
      const A = allPrompts[i], B = allPrompts[j];
      if (norm(A.prompt) === norm(B.prompt)) { err("H1", A.at, `дубль вопроса с ${B.at}`); continue; }
      const ratio = A.prompt.length / B.prompt.length;
      if (ratio < 0.6 || ratio > 1.67) continue;
      if (jaccard(A.tri, B.tri) > 0.75) warn("H2", A.at, `почти дубль ${B.at}`);
    }
  }

  // H12 — перекос позиции ключа по банку
  const totalQ = answerHistogram.reduce((a, b) => a + b, 0);
  if (totalQ >= 20) {
    answerHistogram.forEach((n, i) => {
      if (n / totalQ > 0.35) warn("H12", "банк", `индекс ${i} — ${Math.round(n / totalQ * 100)}% всех ключей`);
    });
  }

  // Критерии
  for (const [key, list] of Object.entries(QUEST_CRITERIA)) {
    if (!inZone(key)) continue;
    if (!Array.isArray(list) || list.length < 3 || list.length > 5) {
      err("S9", key, `ожидалось 3-5 критериев, получено ${Array.isArray(list) ? list.length : typeof list}`);
    } else if (list.some(c => !String(c).trim())) {
      err("S9", key, "пустой критерий");
    }
  }

  // ── Отчёты ────────────────────────────────────────────────────────────────

  if (has("--coverage") || has("--todo")) {
    report(zones, QUESTIONS, QUEST_CRITERIA, answerHistogram, totalQ);
  }

  if (!has("--todo")) {
    warnings.forEach(w => console.log(`  ⚠ ${w}`));
    errors.forEach(e => console.log(`  ✖ ${e}`));
    console.log(`\nОшибок: ${errors.length}, предупреждений: ${warnings.length}`);
  }
  process.exit(errors.length ? 1 : 0);
}

function report(zones, QUESTIONS, QUEST_CRITERIA, hist, totalQ) {
  const todo = [];
  let quizzes = 0, criteria = 0, none = 0, zonesFull = 0;

  if (has("--coverage")) {
    console.log("Зона  Название                             Квизы  Критерии  Нет контента");
  }
  zones.forEach((z, zi) => {
    let a = 0, b = 0, c = 0;
    z.q.forEach((title, qi) => {
      const key = `${zi}:${qi}`;
      if (QUESTIONS[key]) a++;
      else if (QUEST_CRITERIA[key]) b++;
      else { c++; todo.push(`${key}  ${z.t} / «${title}»`); }
    });
    quizzes += a; criteria += b; none += c;
    if (c === 0) zonesFull++;
    if (has("--coverage")) {
      console.log(`${String(zi + 1).padStart(4)}  ${z.t.slice(0, 34).padEnd(34)}  ${String(a).padStart(5)}  ${String(b).padStart(8)}  ${String(c).padStart(12)}`);
    }
  });

  if (has("--coverage")) {
    console.log(`\nИТОГО: ${quizzes} квизов (${quizzes * QUESTIONS_PER_QUEST} вопросов), ${criteria} критериев, ${none} квестов без контента`);
    console.log(`Зон с полным покрытием: ${zonesFull}/${zones.length}`);
    if (totalQ) console.log(`Распределение ключей: ${hist.map((n, i) => `[${i}]=${n}`).join(" ")}`);
    console.log("");
  }
  if (has("--todo")) {
    todo.forEach(t => console.log(t));
    console.log(`\nНенаписанных квестов: ${todo.length}`);
  }
}

main();
