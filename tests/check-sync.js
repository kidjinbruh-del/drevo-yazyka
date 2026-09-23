/* check-sync.js — RULES.json актуален: результат eval js/data.js
   должен совпасть с RULES.json намертво.                             */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.dirname(__dirname);

const dataPath = path.join(root, "js", "data.js");
const jsonPath = path.join(root, "RULES.json");

const sandbox = { module: { exports: {} }, exports: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(dataPath, "utf8"), sandbox, { filename: "data.js" });
const fromJS = sandbox.module.exports;
const fromJSON = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

if (JSON.stringify(fromJS) !== JSON.stringify(fromJSON)) {
  console.error("check-sync: js/data.js и RULES.json расходятся. Запусти: node tests/build-data.js");
  process.exit(1);
}
console.log("check-sync: OK — data.js и RULES.json совпадают");