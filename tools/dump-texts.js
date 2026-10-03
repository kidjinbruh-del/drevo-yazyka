/* dump-texts.js — каталог всех текстов, которые озвучиваются.
   Пишет voice/texts.json (для ручной записи и для генерации голосом).
   Слоты: {ruleId}_human | {ruleId}_textbook | {ruleId}_ex{i}
   Запуск: node tools/dump-texts.js   */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BASE = path.resolve(__dirname, "..");
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(BASE, "js", "data.js"), "utf8"), sandbox);
const RULES = sandbox.RULES;

const catalog = RULES.map(r => {
  const slots = [
    { key: r.id + "_human", label: "Правило (человеческий язык)", text: r.human },
    { key: r.id + "_textbook", label: "Как в учебнике", text: r.textbook }
  ];
  (r.examples || []).forEach((ex, i) => {
    slots.push({ key: r.id + "_ex" + i, label: "Пример " + (i + 1), text: ex });
  });
  return { ruleId: r.id, title: r.title, grade: r.grade, slots };
});

const outPath = path.join(BASE, "voice", "texts.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ generated: new Date().toISOString(), rules: catalog }, null, 2), "utf8");
console.log("dump-texts: " + RULES.length + " правил, слотов: " + catalog.reduce((a, r) => a + r.slots.length, 0));