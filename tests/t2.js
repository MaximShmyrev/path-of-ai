const {run} = require("./harness");
// Даты считаем относительно сегодняшнего дня: жёстко зашитые ломались каждые сутки.
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

const {api, els, store, harness} = run();
let fail = 0;
const ok = (n,c,e="") => { console.log((c?"✅":"❌")+" "+n+(c?"":"  → "+e)); if(!c) fail++; };

// Регистрация
els.gateClasses.children[3].onclick();   // класс "Мастер промптов"
els.gateAvatars.children[5].onclick();   // лик 6
els.gateName.value = "  Тестовый Герой  ";
els.gateForm.onsubmit({preventDefault(){}});

const today = api.localDateStr();
ok("зарегистрирован", api.isRegistered() === true);
ok("имя обрезано по краям", api.state.name === "Тестовый Герой", JSON.stringify(api.state.name));
ok("класс сохранён", api.state.class === 3, `${api.state.class}`);
ok("аватар сохранён (независимо от класса)", api.state.avatar === 5, `${api.state.avatar}`);
ok("дата старта = сегодня, локальная", api.state.startDate === today, api.state.startDate);
ok("формат даты YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(api.state.startDate), api.state.startDate);

// ГЛАВНОЕ: день 1, а не 51
ok("courseDay() === 1", api.courseDay() === 1, `${api.courseDay()}`);
ok("зона дня === 0", api.courseZone() === 0, `${api.courseZone()}`);
ok("квест дня === 0", api.courseQuest() === 0, `${api.courseQuest()}`);
ok("заголовок показывает День 1", els.todayTitle.textContent.startsWith("День 1:"), els.todayTitle.textContent);
ok("зона дня — первая", els.todayZone.textContent.startsWith("Зона 1:"), els.todayZone.textContent);

// UI переключился
ok("экран создания скрыт", els.gate.hidden === true);
ok("приложение показано", els.app.hidden === false);
ok("герой в шапке: имя", els.playerCard.innerHTML.includes("Тестовый Герой"));
ok("герой в шапке: класс", els.playerCard.innerHTML.includes("Мастер промптов"), els.playerCard.innerHTML.slice(0,120));
ok("герой в шапке: день 1", els.playerCard.innerHTML.includes("день 1"));
ok("selected сброшен в 0", api.selected === 0, `${api.selected}`);
ok("состояние записано", "aiAgentsRpgState2" in store);

// Ход времени: подменяем дату старта
api.state.startDate = daysAgo(7);            // ровно неделя назад
ok("через 7 дней → День 8", api.courseDay() === 8, `${api.courseDay()}`);
ok("через 7 дней → зона 1 (вторая)", api.courseZone() === 1, `${api.courseZone()}`);
ok("через 7 дней → квест 0", api.courseQuest() === 0, `${api.courseQuest()}`);
api.render();
ok("UI после смены даты: День 8", els.todayTitle.textContent.startsWith("День 8:"), els.todayTitle.textContent);
ok("UI после смены даты: Зона 2", els.todayZone.textContent.startsWith("Зона 2:"), els.todayZone.textContent);

process.exit(fail);
