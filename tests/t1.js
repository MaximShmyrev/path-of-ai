const {run} = require("./harness");
const {api, els, store, harness} = run();
let fail = 0;
const ok = (name, cond, extra="") => { console.log((cond?"✅":"❌")+" "+name+(cond?"":"  → "+extra)); if(!cond) fail++; };

// --- 1. Чистый браузер: должен показаться экран создания ---
ok("не зарегистрирован при пустом хранилище", api.isRegistered() === false);
ok("экран создания показан", els.gate.hidden === false, `gate.hidden=${els.gate.hidden}`);
ok("приложение скрыто", els.app.hidden === true, `app.hidden=${els.app.hidden}`);
ok("фокус в поле имени", harness.focused === "gateName", `focused=${harness.focused}`);
ok("карточки классов отрисованы", els.gateClasses.children.length === 8, `${els.gateClasses.children.length}`);
ok("лики отрисованы", els.gateAvatars.children.length === 8, `${els.gateAvatars.children.length}`);
ok("старые ключи v1 удалены", !("aiAgentsRpgState" in store) && !("aiAgentsRpgSelected" in store));
ok("новые ключи ещё не записаны", !("aiAgentsRpgState2" in store), JSON.stringify(store));

// --- 2. Валидация: пустое имя ---
els.gateName.value = "   ";
els.gateForm.onsubmit({preventDefault(){}});
ok("пустое имя отклонено", api.isRegistered() === false);
ok("показана подсказка об ошибке", els.gateError.hidden === false);
ok("приложение всё ещё скрыто", els.app.hidden === true);

process.exit(fail);
