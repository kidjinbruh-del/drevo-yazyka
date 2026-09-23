/* build-data.js — генерирует RULES.json из js/data.js (источник истины).
   Запуск: node tests/build-data.js                        */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.dirname(__dirname);
const dataPath = path.join(root, "js", "data.js");
const outPath = path.join(root, "RULES.json");

const sandbox = { module: { exports: {} }, exports: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, "utf8"), sandbox, { filename: "data.js" });

const rulesData = sandbox.module.exports || sandbox.module.exports.rulesData || (sandbox.module && sandbox.module.exports);
if (!rulesData || !Array.isArray(rulesData.rules)) {
  console.error("build-data: не удалось прочитать rulesData из js/data.js");
  process.exit(1);
}

fs.writeFileSync(outPath, JSON.stringify(rulesData, null, 2) + "\n", "utf8");
console.log("build-data: RULES.json обновлён — " + rulesData.rules.length + " правил, " + (rulesData.translations || []).length + " переводов");