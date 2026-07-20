const {run} = require("./harness");
// Даты считаем относительно сегодняшнего дня: жёстко зашитые ломались каждые сутки.
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };

const {api, els, store, harness} = run();
let fail = 0;
const ok = (n,c,e="") => { console.log((c?"✅":"❌")+" "+n+(c?"":"  → "+e)); if(!c) fail++; };

// Регистрируемся
els.gateName.value = "Герой";
els.gateForm.onsubmit({preventDefault(){}});

// === Главная регрессия: обработчики назначены ОДИН раз при загрузке,
// когда startDate был пуст (день 1). Меняем день и проверяем, что они
// не захватили старое значение. ===
api.state.startDate = daysAgo(28);   // 4 недели назад → день 29 → зона 4
ok("день пересчитался", api.courseDay() === 29, `${api.courseDay()}`);
ok("зона дня = 4", api.courseZone() === 4, `${api.courseZone()}`);

els.completeToday.onclick();
ok("«Сдал артефакт» открыл квест ТЕКУЩЕГО дня (4:0)", api.activeQuest.z === 4 && api.activeQuest.q === 0, JSON.stringify(api.activeQuest));
ok("кнопка больше не ставит отметку сама", api.state.done["4:0"] === undefined, JSON.stringify(api.state.done));
ok("selected перешёл на зону 4", api.selected === 4, `${api.selected}`);

api.state.startDate = daysAgo(0);    // снова день 1
els.goToday.onclick();
ok("«Перейти к зоне» использует свежий день", api.selected === 0, `${api.selected}`);

// === Сброс ===
harness.confirmAnswer = true;
els.resetState.onclick();
ok("сброс: не зарегистрирован", api.isRegistered() === false);
ok("сброс: имя очищено", api.state.name === "");
ok("сброс: прогресс очищен", Object.keys(api.state.done).length === 0, JSON.stringify(api.state.done));
ok("сброс: ключ состояния удалён", !("aiAgentsRpgState2" in store), JSON.stringify(Object.keys(store)));
ok("сброс: ключ selected удалён", !("aiAgentsRpgSelected2" in store), JSON.stringify(Object.keys(store)));
ok("сброс: показан экран создания", els.gate.hidden === false && els.app.hidden === true);

// Сброс с отказом в confirm ничего не трогает
els.gateName.value = "Второй";
els.gateForm.onsubmit({preventDefault(){}});
harness.confirmAnswer = false;
els.resetState.onclick();
ok("отказ в confirm сохраняет персонажа", api.isRegistered() === true && api.state.name === "Второй");

process.exit(fail);
