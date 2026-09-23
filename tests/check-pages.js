/* check-pages.js — битые ссылки в HTML: ресурсы на месте, rule.html?id
   ссылаются на существующие правила, каждый script-файл существует.     */
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.dirname(__dirname);

let errors = 0;
function fail(msg) { console.error("  ! " + msg); errors++; }

const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith(".html"));
if (!htmlFiles.length) fail("нет HTML-страниц");

const data = JSON.parse(fs.readFileSync(path.join(root, "RULES.json"), "utf8"));
const ids = new Set(data.rules.map(r => r.id));

htmlFiles.forEach(f => {
  const html = fs.readFileSync(path.join(root, f), "utf8");

  const local = html.match(/(?:href|src)="([^"#][^"]*)"/g) || [];
  local.forEach(m => {
    const raw = m.replace(/^(?:href|src)="/, "").replace(/"$/, "");
    const href = raw.split("#")[0].split("?")[0];
    if (href.startsWith("http") || href.startsWith("mailto:")) return;
    const file = href.replace(/^\.\//, "");
    if (!fs.existsSync(path.join(root, file))) fail(f + ": не найден ресурс «" + raw + "»");
  });

  const ruleLinks = html.match(/rule\.html\?id=([a-z0-9_-]+)/g) || [];
  ruleLinks.forEach(m => {
    const id = m.split("=")[1];
    if (!ids.has(id)) fail(f + ": rule.html?id=" + id + " — нет такого правила");
  });

  if (html.indexOf("js/data.js") === -1) fail(f + ": не подключён js/data.js");
});

if (errors) { console.error("check-pages: найдено ошибок — " + errors); process.exit(1); }
console.log("check-pages: OK — " + htmlFiles.length + " страниц, все ссылки целы");