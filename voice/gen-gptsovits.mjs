// gen-gptsovits.mjs — пакетная генерация озвучки твоим голосом через GPT-SoVITS api_v2
// (OpenAI-совместимый сервер). Сначала подготовь голос в WebUI GPT-SoVITS
// (вкладка «推理服务配置», имя пресета → переменная окружения GPT_SOVITS_VOICE).
//
//   $env:GPT_SOVITS_URL   = "http://127.0.0.1:9880/v1/audio/speech"   (по умолчанию)
//   $env:GPT_SOVITS_VOICE = "sonya-mom"    ← имя пресета голоса из WebUI
//   node tools/gen-gptsovits.mjs
//
// Пройти заново: node tools/gen-manifest.js  →  git add audio js/audio.js  →  push.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = path.resolve(import.meta.dirname, "..");
const URL = process.env.GPT_SOVITS_URL || "http://127.0.0.1:9880/v1/audio/speech";
const VOICE = process.env.GPT_SOVITS_VOICE || "";
if (!VOICE) { console.error("Задай GPT_SOVITS_VOICE (имя пресета голоса из WebUI)."); process.exit(1); }
const MODEL = process.env.GPT_SOVITS_MODEL || "GPT-SoVITS-v2";

const texts = JSON.parse(fs.readFileSync(path.join(BASE, "voice", "texts.json"), "utf8"));
const audioDir = path.join(BASE, "audio");
fs.mkdirSync(audioDir, { recursive: true });
const tmpWav = path.join(audioDir, "_tmp.wav");

let ok = 0, skip = 0, fail = 0;
for (const rule of texts.rules) {
  for (const slot of rule.slots) {
    const mp3 = path.join(audioDir, slot.key + ".mp3");
    if (fs.existsSync(mp3)) { skip++; continue; }
    process.stdout.write(`… ${slot.key} `);
    try {
      const res = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, input: slot.text, voice: VOICE, response_format: "wav" })
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      fs.writeFileSync(tmpWav, Buffer.from(await res.arrayBuffer()));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmpWav, "-codec:a", "libmp3lame", "-q:a", "5", "-ar", "44100", "-ac", "1", mp3]);
      ok++; console.log("OK");
    } catch (e) { fail++; console.log("FAIL: " + e.message); }
  }
}
try { fs.rmSync(tmpWav, { force: true }); } catch {}
console.log(`gen-gptsovits: готово ${ok}, скипнуто ${skip}, ошибок ${fail}`);
if (fail) process.exit(1);