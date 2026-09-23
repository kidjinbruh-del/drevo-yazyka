/* check-data.js — валидация RULES.json: поля, классы, человеческий язык,
   связи входят в граф, переводчики ссылаются на существующие правила.    */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.dirname(__dirname);

const data = JSON.parse(fs.readFileSync(path.join(root, "RULES.json"), "utf8"));
const rules = data.rules || [];
const t = data.translations || [];

let errors = 0;
function fail(msg) { console.error("  ! " + msg); errors++; }

const required = ["id", "grade", "branch", "title", "human", "textbook", "examples", "wrong", "errors", "links", "quiz"];
const branches = ["корни", "ствол", "ветви"];

if (!rules.length) fail("нет правил");

const ids = new Set(rules.map(r => r.id));
const byGrade = { 1: 0, 2: 0, 3: 0 };

rules.forEach(r => {
  required.forEach(f => {
    if (r[f] === undefined || r[f] === null || r[f] === "") fail(r.id + ": пустое поле «" + f + "»");
  });

  if (!(r.grade >= 1 && r.grade <= 3)) fail(r.id + ": grade вне 1-3");
  else byGrade[r.grade]++;

  if (branches.indexOf(r.branch) === -1) fail(r.id + ": неизвестная ветка «" + r.branch + "»");

  if (typeof r.human === "string" && r.human.length > 300) fail(r.id + ": human длиннее 300 символов (" + r.human.length + ")");
  if (typeof r.textbook === "string" && r.textbook.length < 20) fail(r.id + ": textbook подозрительно короткий");

  if (!Array.isArray(r.examples) || r.examples.length < 2) fail(r.id + ": примеров меньше двух");
  if (r.wrong && (!r.wrong.text || !r.wrong.why)) fail(r.id + ": «так нельзя» без text/why");
  if (!Array.isArray(r.errors) || !r.errors.length) fail(r.id + ": нет типичных ошибок");

  (r.links || []).forEach(l => { if (!ids.has(l)) fail(r.id + ": ссылка на несуществующее правило «" + l + "»"); });

  if (!Array.isArray(r.quiz) || !r.quiz.length) fail(r.id + ": нет вопросов тренажёра");
});

if (!(byGrade[1] >= 5 && byGrade[1] <= 7)) fail("1 класс: ожидалось 5-7 правил, получилось " + byGrade[1]);
if (!(byGrade[2] >= 5 && byGrade[2] <= 7)) fail("2 класс: ожидалось 5-7 правил, получилось " + byGrade[2]);
if (!(byGrade[3] >= 5 && byGrade[3] <= 7)) fail("3 класс: ожидалось 5-7 правил, получилось " + byGrade[3]);

if (new Set(rules.map(r => r.id)).size !== rules.length) fail("дубликаты id");

t.forEach(x => {
  if (!x.from || !x.to) fail("перевод без from/to");
  if (x.ruleId && !ids.has(x.ruleId)) fail("перевод «" + x.from + "» ссылается на " + x.ruleId);
});

if (errors) { console.error("check-data: найдено ошибок — " + errors); process.exit(1); }
console.log("check-data: OK — " + rules.length + " правил (" + byGrade[1] + "/" + byGrade[2] + "/" + byGrade[3] + "), " + t.length + " переводов");