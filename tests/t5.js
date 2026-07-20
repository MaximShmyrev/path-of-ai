// Механики: викторина, XP по точности, специализация класса, способность.
let fail = 0;
const ok = (n, c, e = "") => { console.log((c ? "✅" : "❌") + " " + n + (c ? "" : "  → " + e)); if (!c) fail++; };

function fresh(seed, opts) {
  delete require.cache[require.resolve("./harness")];
  return require("./harness").run(seed, opts);
}
// Регистрируем героя нужного класса и открываем квест 4:0 (зона 5 — LLM).
function withClass(classIdx) {
  const r = fresh();
  r.els.gateClasses.children[classIdx].onclick();
  r.els.gateName.value = "Тест";
  r.els.gateForm.onsubmit({ preventDefault() {} });
  return r;
}
// Отвечает на квиз: correct — сколько вопросов ответить верно.
function answer(r, z, q, correct) {
  r.api.startAttempt(z, q);
  r.api.render();
  const items = r.api.bankQuiz(z, q);
  items.forEach((it, i) => {
    const pick = i < correct ? it.answer : (it.answer + 1) % it.options.length;
    r.api.attempt.picks[i] = pick;
  });
  r.api.render();
  r.els.submitQuiz.onclick();
}

// ── Классификация квестов ───────────────────────────────────────────────────
let r = withClass(0);
ok("4:0 — викторина", r.api.questKind(4, 0) === "quiz", r.api.questKind(4, 0));
ok("4:1 — самопроверка", r.api.questKind(4, 1) === "criteria", r.api.questKind(4, 1));
// Ищем ненаписанный квест динамически: хардкод устаревает каждый заход.
function findTodo(api) {
  for (let z = 0; z < api.zones.length; z++)
    for (let q = 0; q < api.zones[z].q.length; q++)
      if (api.questKind(z, q) === "todo") return {z, q};
  return null;
}
const todo = findTodo(r.api);
ok("есть ненаписанный квест", !!todo, "банк покрыт целиком — проверку можно снять");

// ── Порог 3/5 и XP по точности ──────────────────────────────────────────────
const base = r.api.baseQuestXp(4);            // 700/7 = 100
ok("базовый XP квеста = 100", base === 100, `${base}`);
ok("класс 0 (Математик) — зона 5 чужая", r.api.isHomeZone(4) === false);

r = withClass(0); answer(r, 4, 0, 2);
ok("2/5 — квест НЕ засчитан", r.api.record(4, 0) === null, JSON.stringify(r.api.record(4, 0)));
ok("2/5 — XP не начислен", r.api.totals().xp === 0, `${r.api.totals().xp}`);

r = withClass(0); answer(r, 4, 0, 3);
ok("3/5 — квест засчитан", !!r.api.record(4, 0));
ok("3/5 — XP = 70% базы", r.api.questXp(4, 0) === 70, `${r.api.questXp(4, 0)}`);

r = withClass(0); answer(r, 4, 0, 4);
ok("4/5 — XP = 85% базы", r.api.questXp(4, 0) === 85, `${r.api.questXp(4, 0)}`);

r = withClass(0); answer(r, 4, 0, 5);
ok("5/5 — XP = полная база", r.api.questXp(4, 0) === 100, `${r.api.questXp(4, 0)}`);

// ── Специализация класса ────────────────────────────────────────────────────
r = withClass(3);                              // Мастер промптов → ветка LLM (зоны 4,5)
ok("класс 3 (Мастер промптов) — зона 5 родная", r.api.isHomeZone(4) === true);
ok("множитель родной ветки = 1.5", r.api.classMultiplier(4) === 1.5, `${r.api.classMultiplier(4)}`);
ok("вне родной ветки множитель = 1", r.api.classMultiplier(0) === 1, `${r.api.classMultiplier(0)}`);
answer(r, 4, 0, 5);
ok("5/5 в родной ветке — XP = 150", r.api.questXp(4, 0) === 150, `${r.api.questXp(4, 0)}`);

// каждый класс имеет ровно одну родную ветку, все ветки разные
const branches = r.api.CLASS_BRANCH;
ok("8 классов ↔ 8 разных веток", new Set(branches).size === 8 && branches.length === 8, JSON.stringify(branches));

// ── Лучший результат побеждает ──────────────────────────────────────────────
r = withClass(0);
answer(r, 4, 0, 5);
const best = r.api.questXp(4, 0);
answer(r, 4, 0, 3);                            // повтор хуже
ok("повтор хуже не понижает результат", r.api.record(4, 0).c === 5, JSON.stringify(r.api.record(4, 0)));
ok("повтор хуже не понижает XP", r.api.questXp(4, 0) === best, `${r.api.questXp(4, 0)} против ${best}`);
r = withClass(0);
answer(r, 4, 0, 3);
answer(r, 4, 0, 5);                            // повтор лучше
ok("повтор лучше поднимает результат", r.api.record(4, 0).c === 5, JSON.stringify(r.api.record(4, 0)));

// ── Способность ─────────────────────────────────────────────────────────────
r = withClass(1);                              // Python-мастер: засчитать вопрос верным
r.api.startAttempt(4, 0); r.api.render();
ok("способность заряжена", r.api.abilityReady() === true);
r.api.useAbility();
ok("способность потрачена", r.api.abilityReady() === false);
ok("Автоматизация засчитала вопрос верным", r.api.attempt.picks[0] === r.api.bankQuiz(4, 0)[0].answer);
const usedOn = r.api.state.abilityUsedOn;
ok("дата использования записана", usedOn === r.api.localDateStr(), usedOn);
r.api.state.abilityUsedOn = "2020-01-01";
ok("заряд восстановился при смене дня", r.api.abilityReady() === true);

r = withClass(0);                               // Математик: убрать неверный вариант
r.api.startAttempt(4, 0); r.api.render(); r.api.useAbility();
ok("Расчёт вероятностей убрал вариант в каждом вопросе", Object.keys(r.api.attempt.gone).length === 5, JSON.stringify(r.api.attempt.gone));
const goneIdx = Object.keys(r.api.attempt.gone).map(k => k.split(":").map(Number));
ok("убранные варианты — все неверные", goneIdx.every(([qi, oi]) => r.api.bankQuiz(4, 0)[qi].answer !== oi));

r = withClass(6);                               // Командир: делегировать вопрос
r.api.startAttempt(4, 0); r.api.render(); r.api.useAbility();
ok("Делегирование исключило вопрос", r.api.attempt.dropped === 0, `${r.api.attempt.dropped}`);

// ── Квест-артефакт ──────────────────────────────────────────────────────────
r = withClass(0);
r.api.startAttempt(4, 1); r.api.render();
const crit = r.api.bankCriteria(4, 1);
const boxes = () => r.els.questBody.children.find(c => c.className === "criteria").children;
boxes()[0].querySelector("input").onchange({ target: { checked: true } });
ok("не все критерии — квест не засчитан", r.api.record(4, 1) === null, JSON.stringify(r.api.record(4, 1)));
r.api.startAttempt(4, 1); r.api.render();
crit.forEach((_, i) => { r.api.attempt.picks[i] = true; });
boxes()[crit.length - 1].querySelector("input").onchange({ target: { checked: true } });
ok("все критерии — квест засчитан", !!r.api.record(4, 1), JSON.stringify(r.api.record(4, 1)));
ok("артефакт даёт полный XP", r.api.questXp(4, 1) === 100, `${r.api.questXp(4, 1)}`);

// ── Квест без вопросов ──────────────────────────────────────────────────────
r = withClass(0);
const td = findTodo(r.api);
r.api.startAttempt(td.z, td.q); r.api.render();
ok("квест без вопросов не ломает рендер", r.els.questBody.innerHTML.includes("ещё не написаны"), r.els.questBody.innerHTML.slice(0, 80));
// Считаем полностью покрытые зоны сами и сверяем со строкой в интерфейсе.
const full = r.api.zones.filter((z, zi) => z.q.every((_, qi) => r.api.questKind(zi, qi) !== "todo")).length;
ok("покрытие показано честно", r.els.coverageLine.textContent.includes(`${full}/24 зон`), r.els.coverageLine.textContent);

// ── Банк отсутствует целиком ────────────────────────────────────────────────
r = fresh(null, { withBank: false });
r.els.gateName.value = "Без банка";
r.els.gateForm.onsubmit({ preventDefault() {} });
ok("без questions.js приложение работает", r.els.app.hidden === false);
ok("без банка все квесты — todo", r.api.questKind(4, 0) === "todo", r.api.questKind(4, 0));
ok("без банка карта дня рисуется", r.els.todayTitle.textContent.startsWith("День 1"), r.els.todayTitle.textContent);

process.exit(fail);
