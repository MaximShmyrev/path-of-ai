// Перезагрузка = повторный запуск скрипта поверх того же хранилища.
const fs=require("fs");
let fail=0; const ok=(n,c,e="")=>{console.log((c?"✅":"❌")+" "+n+(c?"":"  → "+e)); if(!c)fail++;};

function fresh(seed) {
  delete require.cache[require.resolve("./harness")];
  const {run} = require("./harness");
  return run(seed);
}

// Прогон 1: регистрируемся, забираем хранилище
let r = fresh();
r.els.gateClasses.children[2].onclick();
r.els.gateAvatars.children[7].onclick();
r.els.gateName.value = "Странник";
r.els.gateForm.onsubmit({preventDefault(){}});
r.api.state.done["0:0"]={c:5,n:5}; r.api.save();
const saved = JSON.parse(JSON.stringify(r.store));
ok("прогон 1: зарегистрирован", r.api.isRegistered());

// Прогон 2: та же память → экран создания НЕ показывается
r = fresh(saved);
ok("перезагрузка: экран создания не показан", r.els.gate.hidden === true, `gate.hidden=${r.els.gate.hidden}`);
ok("перезагрузка: приложение показано", r.els.app.hidden === false);
ok("перезагрузка: имя на месте", r.api.state.name === "Странник", r.api.state.name);
ok("перезагрузка: класс на месте", r.api.state.class === 2, `${r.api.state.class}`);
ok("перезагрузка: аватар на месте", r.api.state.avatar === 7, `${r.api.state.avatar}`);
ok("перезагрузка: день по-прежнему 1", r.api.courseDay() === 1, `${r.api.courseDay()}`);
ok("перезагрузка: прогресс на месте", r.api.state.done["0:0"].c === 5, JSON.stringify(r.api.state.done));

// Битый JSON не должен ронять страницу
r = fresh({aiAgentsRpgState2: "{не json"});
ok("битое хранилище: скрипт не упал", true);
ok("битое хранилище: откат на дефолт", r.api.state.name === "" && r.api.isRegistered() === false);
ok("битое хранилище: доступен экран создания", r.els.gate.hidden === false);

// Частичное состояние (нет поля done) не должно ронять isDone
r = fresh({aiAgentsRpgState2: JSON.stringify({name:"Куцый", startDate:"2026-07-18", class:1})});
ok("частичное состояние: done подставлен", JSON.stringify(r.api.state.done) === "{}");
ok("частичное состояние: отрисовалось", r.els.app.hidden === false);
r.api.state.done["0:0"]={c:5,n:5}; r.api.save();
ok("частичное состояние: отметка работает", r.api.state.done["0:0"].c === 5);
ok("done не протёк в дефолт", JSON.stringify(r.api.defaultState().done) === "{}");

// Мусор в ключе selected
r = fresh({aiAgentsRpgState2: JSON.stringify({name:"X", startDate:"2026-07-18"}), aiAgentsRpgSelected2:"999"});
ok("мусорный selected приведён в диапазон", r.api.selected >= 0 && r.api.selected < r.api.zones.length, `${r.api.selected}`);

process.exit(fail);
