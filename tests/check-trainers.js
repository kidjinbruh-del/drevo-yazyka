/* check-trainers.js — валидация вопросов тренажёра:
   у choice ровно один верный вариант; tap указывает в пределы tokens.    */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.dirname(__dirname);
const data = JSON.parse(fs.readFileSync(path.join(root, "RULES.json"), "utf8"));

let errors = 0;
function fail(msg) { console.error("  ! " + msg); errors++; }

data.rules.forEach(r => {
  r.quiz.forEach((q, qi) => {
    const tag = r.id + "#" + (qi + 1);
    if (!q.q) fail(tag + ": без вопроса");
    if (q.type === "choice") {
      if (!Array.isArray(q.options) || q.options.length < 2) fail(tag + ": меньше двух вариантов");
      const goods = (q.options || []).filter(o => o.ok);
      if (goods.length !== 1) fail(tag + ": верных вариантов должно быть ровно 1, а здесь " + goods.length);
      q.options.forEach((o, oi) => { if (!o.why) fail(tag + ": вариант " + (oi + 1) + " без объяснения"); });
    } else if (q.type === "tap") {
      if (!Array.isArray(q.tokens) || !q.tokens.length) fail(tag + ": без tokens");
      if (!Array.isArray(q.steps) || !q.steps.length) fail(tag + ": без steps");
      q.steps.forEach((s, si) => {
        if (!q.tokens[s.i]) fail(tag + ": шаг " + (si + 1) + " указывает за границы tokens");
        if (!s.why) fail(tag + ": шаг " + (si + 1) + " без объяснения");
      });
      // запрещаем два шага на одно слово
      const seen = {};
      q.steps.forEach(s => {
        if (seen[s.i]) fail(tag + ": шаги дублируют слово " + s.i);
        seen[s.i] = 1;
      });
    } else {
      fail(tag + ": неизвестный тип «" + q.type + "»");
    }
  });
});

// Флагман «главные члены» обязан иметь не меньше трёх вопросов — это витрина MVP.
const flagship = data.rules.find(r => r.id === "g3-members");
if (!flagship || flagship.quiz.length < 3) fail("g3-members: ожидалось минимум 3 вопроса");

if (errors) { console.error("check-trainers: найдено ошибок — " + errors); process.exit(1); }
console.log("check-trainers: OK");