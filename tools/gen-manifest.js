/* gen-manifest.js — строит js/audio.js из js/data.js и реальных файлов в audio/.
   Ключи слотов: {ruleId}_human, {ruleId}_textbook, {ruleId}_ex0..exN.
   Файлы: audio/{key}.mp3 приоритетнее .ogg, затем .wav.
   Запуск: node tools/gen-manifest.js   */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const BASE = path.resolve(__dirname, "..");

const sandbox = { window: {}, console };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(BASE, "js", "data.js"), "utf8"), sandbox);
const RULES = sandbox.RULES;

const audioDir = path.join(BASE, "audio");
fs.mkdirSync(audioDir, { recursive: true });

function existing(key) {
  for (const ext of ["mp3", "ogg", "wav"]) {
    const p = path.join(audioDir, key + "." + ext);
    if (fs.existsSync(p)) return "audio/" + key + "." + ext;
  }
  return null;
}

const map = {};
for (const r of RULES) {
  const slots = { human: "_human", textbook: "_textbook" };
  for (const k of Object.keys(slots)) {
    const key = r.id + slots[k];
    const u = existing(key);
    if (u) map[key] = u;
  }
  (r.examples || []).forEach((_, i) => {
    const key = r.id + "_ex" + i;
    const u = existing(key);
    if (u) map[key] = u;
  });
}

const lines = Object.keys(map).sort().map(k => "  " + JSON.stringify(k) + ": " + JSON.stringify(map[k]));
const out = "/* audio.js — манифест готовых озвучек (генерируется tools/gen-manifest.js). */\n" +
  "window.__AUDIO__ = {\n" + lines.join(",\n") + "\n};\n";
fs.writeFileSync(path.join(BASE, "js", "audio.js"), out, "utf8");
console.log("gen-manifest: записано js/audio.js — " + Object.keys(map).length + " слотов (" +
  RULES.length + " правил)");