/* smoke-core.js — исполняет логику в vm-контексте без браузера:
   прогресс/достижения, движение тренажёра grill (choice + tap),
   поиск перевода. Дополняет статические проверки. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const BASE = path.resolve(__dirname, "..");

function makeClassList() {
  const set = [];
  return {
    add: (...cs) => cs.forEach(c => set.indexOf(c) === -1 && set.push(c)),
    remove: (...cs) => cs.forEach(c => { const i = set.indexOf(c); if (i !== -1) set.splice(i, 1); }),
    toggle: (c, on) => { if (on) { if (set.indexOf(c) === -1) set.push(c); } else { const i = set.indexOf(c); if (i !== -1) set.splice(i, 1); } },
    contains: c => set.indexOf(c) !== -1
  };
}
function makeEl(tag) {
  const listeners = {};
  const el = {
    tag, children: [], _text: "", _attrs: {}, _html: "", className: "", classList: makeClassList(),
    setAttribute: (k, v) => { el._attrs[k] = v; }, getAttribute: k => el._attrs[k],
    addEventListener: (ev, fn) => { listeners[ev] = fn; }, _fire: ev => { if (listeners[ev]) listeners[ev]({ preventDefault() {} }); },
    appendChild(c) { el.children.push(c); return c; },
    querySelector: s => find(el, s),
    querySelectorAll: s => { const out = []; findAll(el, s, out); return out; },
    remove() {}, get style() { el._style = el._style || {}; return el._style; }
  };
  Object.defineProperty(el, "textContent", { get: () => el._text, set: v => { el._text = String(v); } });
  Object.defineProperty(el, "innerHTML", { get: () => el._html, set: v => { el._html = String(v); el.children = []; } });
  return el;
}
function matches(el, sel) {
  const cls = String(el.className || "");
  if (sel === ".tr-reveal") return cls.indexOf("tr-reveal") !== -1;
  if (sel === ".tr-btn" || sel === ".tr-btn.ok") return cls.indexOf("tr-btn") !== -1;
  if (sel === ".tr-tok") return cls.indexOf("tr-tok") !== -1;
  if (sel === ".tr-result") return cls.indexOf("tr-result") !== -1;
  return false;
}
function findAll(el, sel, out) { walk(el, n => { if (matches(n, sel)) out.push(n); }); }
function find(el, sel) { let r = null; walk(el, n => { if (!r && matches(n, sel)) r = n; }); return r; }
function walk(el, cb) { cb(el); el.children.forEach(c => walk(c, cb)); }

const storage = (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })();

const sandbox = { console, require, module: { exports: {} }, process, Buffer, setTimeout: fn => { fn && fn(); return 0; }, setInterval: () => 0, Promise, URLSearchParams: globalThis.URLSearchParams };
sandbox.document = {
  readyState: "complete",
  querySelector: () => null, querySelectorAll: () => [],
  createElement: makeEl, createElementNS: () => makeEl("svg"),
  addEventListener: () => {}, body: makeEl("body")
};
sandbox.window = sandbox;
sandbox.location = { pathname: "/ok/index.html", search: "" };
sandbox.localStorage = storage;
sandbox.CustomEvent = function () { return {}; };
sandbox.IntersectionObserver = undefined;
vm.createContext(sandbox);

["js/data.js", "js/icons.js", "js/voice.js", "js/progress.js", "js/trainer.js", "js/main.js", "js/index.js"]
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(BASE, f), "utf8"), sandbox, { filename: f }));

const s = sandbox;
let fails = 0;
function check(name, cond) { if (cond) console.log("  ok  " + name); else { console.error("  ! " + name); fails++; } }

check("18 правил загружено", s.RULES.length === 18);
check("14 переводов загружено", s.TRANSLATIONS.length >= 10);
check("в начале ничего не изучено", s.Progress.learnedCount() === 0);

s.Progress.markLearned("g1-sounds");
check("изучение правила зачтено", s.Progress.isLearned("g1-sounds") && s.Progress.learnedCount() === 1);
check("достижение «первый листик»", s.Progress.ach().find(a => a.id === "first").got);
check("повторное изучение не засчитывается", s.Progress.markLearned("g1-sounds")["new"] === false);

["g1-vow", "g1-voiced", "g1-syllable", "g1-stress"].forEach(id => s.Progress.markLearned(id));
check("достижение «пять»", s.Progress.ach().find(a => a.id === "five").got);
s.Progress.markLearned("g1-sentence");
check("достижение «целая ветка»", s.Progress.ach().find(a => a.id === "branch").got);

const rootC = makeEl("div");
let doneC = 0;
s.Trainer.mount(rootC, s.RULES.find(x => x.id === "g1-sounds").quiz, {
  onDone: (sc, tot) => { check("choice: все ответы верны (" + sc + "/" + tot + ")", sc === tot); doneC++; }
});
for (let i = 0; i < 30; i++) {
  let nb = null; walk(rootC, n => { if (!nb && n.tag === "button" && n._text === "Дальше") nb = n; });
  if (nb) { nb._fire("click"); continue; }
  const any = rootC.querySelector(".tr-btn");
  if (any) { any._fire("click"); continue; }
  break;
}
check("choice-флоу завершён результатом", !!rootC.querySelector(".tr-result") && doneC === 1);

const qTap = s.RULES.find(x => x.id === "g1-vow").quiz[0];
const rootT = makeEl("div");
let doneT = 0;
s.Trainer.mount(rootT, [qTap], { onDone: (sc, tot) => { check("tap: вопрос засчитан один раз (" + sc + "/" + tot + ")", sc === tot); doneT++; } });
const toks = rootT.querySelectorAll(".tr-tok");
check("tap: токенов по числу слов", toks.length === qTap.tokens.length);
toks[qTap.steps[0].i]._fire("click");
toks[qTap.steps[1].i]._fire("click");
let nb2 = null; walk(rootT, n => { if (!nb2 && n.tag === "button" && n._text === "Дальше") nb2 = n; });
if (nb2) nb2._fire("click");
check("tap-флоу завершён результатом", !!rootT.querySelector(".tr-result") && doneT === 1);

const nq = "Основу предложения составляют главные члены".toLowerCase().replace(/ё/g, "е");
const scored = s.TRANSLATIONS.filter(x => x.from.toLowerCase().replace(/ё/g, "е") === nq);
check("переводчик: прямая пара нашлась", scored.length === 1 && !!scored[0].ruleId);

if (fails) { console.error("smoke-core: ошибок — " + fails); process.exit(1); }
console.log("smoke-core: OK");