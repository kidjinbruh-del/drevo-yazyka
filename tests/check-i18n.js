/* check-i18n.js — форк не использует i18n: весь контент русский.
   Проверяем, что ни в одном HTML не подключён i18n.js,
   и что правила не содержат транслит-ключей.                        */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.dirname(__dirname);

let errors = 0;
function fail(msg) { console.error("  ! " + msg); errors++; }

fs.readdirSync(root).filter(f => f.endsWith(".html")).forEach(f => {
  const html = fs.readFileSync(path.join(root, f), "utf8");
  if (html.indexOf("i18n") !== -1) fail(f + ": встретился i18n — этот форк русскоязычный, без перевода");
});

const data = JSON.parse(fs.readFileSync(path.join(root, "RULES.json"), "utf8"));
data.rules.forEach(r => {
  if (/[a-zA-Z]{3,}/.test(r.title + r.human)) fail(r.id + ": в человеческом тексте затесался латинский текст");
});

if (errors) { console.error("check-i18n: найдено ошибок — " + errors); process.exit(1); }
console.log("check-i18n: OK — контент полностью на русском");