// Новый экран создания героя: восемь разных внешностей, предпросмотр, «Дар пути».
let fail = 0;
const ok = (n, c, e = "") => { console.log((c ? "✅" : "❌") + " " + n + (c ? "" : "  → " + e)); if (!c) fail++; };
const r = require("./harness").run();
const a = r.api;

// ── Данные ──────────────────────────────────────────────────────────────────
ok("восемь внешностей", a.looks.length === 8, `${a.looks.length}`);
ok("восемь наборов снаряжения", a.GEAR.length === 8, `${a.GEAR.length}`);
ok("восемь палитр", a.classPalette.length === 8, `${a.classPalette.length}`);
ok("у каждой внешности есть название", a.looks.every(l => l.label && l.note));

// Главное: это разные фигуры, а не перекраска одной.
const bodies = a.looks.map(l => l.draw({skin:"#1",skin2:"#2",hair:"#3",hair2:"#4",cloak:"#5",acc:"#6",bg:"#7"}));
ok("восемь РАЗНЫХ силуэтов, не перекраска", new Set(bodies).size === 8, `уникальных: ${new Set(bodies).size}`);
const gears = a.GEAR.map(g => g({skin:"#1",acc:"#6"}));
ok("восемь разных наборов снаряжения", new Set(gears).size === 8, `уникальных: ${new Set(gears).size}`);

// ── Все 64 комбинации ───────────────────────────────────────────────────────
let bad = 0, minLen = 1e9;
for (let c = 0; c < 8; c++) for (let l = 0; l < 8; l++) {
  const uri = a.portraitSvg(c, l);
  if (!uri.startsWith("data:image/svg+xml")) { bad++; continue; }
  const svg = decodeURIComponent(uri.split(",")[1]);
  if (!svg.startsWith("<svg") || !svg.endsWith("</svg>")) bad++;
  minLen = Math.min(minLen, svg.length);
}
ok("все 64 комбинации дают валидный SVG", bad === 0, `битых: ${bad}`);
ok("портреты непустые", minLen > 1500, `минимум ${minLen} байт`);

// Портрет зависит и от класса, и от внешности — оси независимы
ok("смена класса меняет портрет", a.portraitSvg(0, 0) !== a.portraitSvg(1, 0));
ok("смена внешности меняет портрет", a.portraitSvg(0, 0) !== a.portraitSvg(0, 1));
// Вызов с одним аргументом жив — им пользуется renderDetail для портрета зоны
ok("вызов с одним аргументом работает", a.portraitSvg(3).startsWith("data:image/svg+xml"));

// ── Экран отрисован ─────────────────────────────────────────────────────────
ok("экран создания показан", r.els.gate.hidden === false);
ok("8 карточек классов", r.els.gateClasses.children.length === 8, `${r.els.gateClasses.children.length}`);
ok("8 карточек внешностей", r.els.gateAvatars.children.length === 8, `${r.els.gateAvatars.children.length}`);
ok("портрет героя подставлен", r.els.heroBig.src && r.els.heroBig.src.startsWith("data:image/svg+xml"));
ok("имя класса показано", r.els.heroClassName.textContent === a.classes[0][0], r.els.heroClassName.textContent);
ok("название внешности показано", r.els.heroLookName.textContent === a.looks[0].label, r.els.heroLookName.textContent);

// ── «Дар пути» читается из механики, а не дублируется ───────────────────────
const branchOf = ci => a.SKILL_BUCKETS[a.CLASS_BRANCH[ci]][0];
ok("ветка совпадает с механикой", r.els.giftBranch.textContent === branchOf(0), r.els.giftBranch.textContent);
ok("множитель из константы", r.els.giftMult.textContent === String(a.HOME_BRANCH_XP), r.els.giftMult.textContent);
ok("способность совпадает с ABILITIES", r.els.giftAbility.textContent === a.ABILITIES[0].name, r.els.giftAbility.textContent);
ok("описание способности из ABILITIES", r.els.giftAbilityDesc.textContent === a.ABILITIES[0].desc);

// Переключение класса обновляет и портрет, и «Дар пути»
r.els.gateClasses.children[5].onclick();
ok("после смены класса — новая ветка", r.els.giftBranch.textContent === branchOf(5), r.els.giftBranch.textContent);
ok("после смены класса — новая способность", r.els.giftAbility.textContent === a.ABILITIES[5].name, r.els.giftAbility.textContent);
ok("после смены класса — новое имя класса", r.els.heroClassName.textContent === a.classes[5][0]);
r.els.gateAvatars.children[3].onclick();
ok("после смены внешности — новое название", r.els.heroLookName.textContent === a.looks[3].label, r.els.heroLookName.textContent);

// Выбор сохраняется при создании героя
r.els.gateName.value = "Герой";
r.els.gateForm.onsubmit({preventDefault(){}});
ok("класс сохранён", a.state.class === 5, `${a.state.class}`);
ok("внешность сохранена", a.state.avatar === 3, `${a.state.avatar}`);

process.exit(fail);
