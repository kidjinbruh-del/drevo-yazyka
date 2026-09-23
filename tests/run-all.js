/* run-all.js — прогон всех проверок по очереди.
   Запуск: node tests/run-all.js  */
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const suites = [
  "build-data.js",
  "check-data.js",
  "check-trainers.js",
  "check-sync.js",
  "check-pages.js",
  "check-i18n.js",
  "smoke-core.js"
];

let failed = 0;
suites.forEach(name => {
  const file = path.join(__dirname, name);
  if (!fs.existsSync(file)) { console.error("Нет сюиты: " + name); failed++; return; }
  const r = spawnSync(process.execPath, [file], { encoding: "utf8", timeout: 30000 });
  const head = "== " + name + " " + (r.status === 0 ? "OK" : "FAIL");
  console.log(head);
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.status !== 0) failed++;
});

console.log("\n" + (failed ? "Провалено сюит: " + failed : "Все сюиты прошли."));
process.exit(failed ? 1 : 0);