// Заглушка DOM/localStorage, чтобы прогнать инлайновый скрипт index.html в Node.
const fs = require("fs");
const ROOT = require("path").join(__dirname, "..");
const path = require("path").join(ROOT, "index.html");
const html = fs.readFileSync(path, "utf8");
// Инлайновых скриптов теперь два (банк подключается через src), берём последний.
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const code = blocks[blocks.length - 1];
// Банк вопросов — отдельный файл; withBank=false воспроизводит его отсутствие.
const bankSrc = fs.readFileSync(require("path").join(ROOT, "questions.js"), "utf8");

function makeEl(id) {
  const el = {
    id, _html: "", _text: "", value: "", hidden: false, checked: false,
    // Настоящий DOM приводит textContent к строке — воспроизводим,
    // иначе присвоение числа проходит проверку на строгое равенство иначе.
    get textContent(){ return this._text; },
    set textContent(v){ this._text = String(v); },
    style: {}, className: "", children: [],
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);} },
    // Настоящий DOM при записи innerHTML сносит потомков — воспроизводим это,
    // иначе тесты видят узлы от предыдущего рендера.
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = String(v); this.children = []; },
    get offsetWidth(){ return 1; },
    appendChild(c){ this.children.push(c); },
    setAttribute(){}, focus(){ harness.focused = id; },
    insertAdjacentHTML(pos, h){ this._html += h; },
    remove(){},
    querySelector(){ return this._input || (this._input = makeEl("input")); },
    querySelectorAll(){ return []; },
    scrollIntoView(){},
  };
  return el;
}

const els = {};
const harness = { focused: null, alerts: [], confirmAnswer: true };

global.document = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  createElement(tag) { return makeEl(`<${tag}>`); },
  createElementNS(ns, tag) { return makeEl(`<${tag}>`); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
};
global.requestAnimationFrame = () => {};
global.alert = m => harness.alerts.push(m);
global.confirm = () => harness.confirmAnswer;
global.navigator = { clipboard: { writeText: async () => {} } };

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};

// Экспортируем внутренности скрипта наружу для проверок.
const EXPORTS = `
;globalThis.__api = {
  state, get selected(){return selected;}, get activeQuest(){return activeQuest;},
  get attempt(){return attempt;}, courseDay, courseZone, courseQuest,
  localDateStr, isRegistered, render, zones, classes, looks, GEAR, portraitSvg,
  classPalette, SKILL_BUCKETS: SKILL_BUCKETS, ABILITIES, HOME_BRANCH_XP,
  loadSelected, save, defaultState, questKind, questXp, baseQuestXp, totals,
  isHomeZone, classMultiplier, xpFactor, record, startAttempt, useAbility,
  abilityReady, ability, bankQuiz, bankCriteria, SKILL_BUCKETS, CLASS_BRANCH
};`;

// seed засевается ДО выполнения скрипта — иначе он стартует с пустым хранилищем.
module.exports = {
  run: (seed, opts = {}) => {
    Object.assign(store, seed || {});
    const withBank = opts.withBank !== false;
    (0, eval)((withBank ? bankSrc + "\n" : "") + code + EXPORTS);
    return { api: globalThis.__api, els, store, harness };
  }
};
