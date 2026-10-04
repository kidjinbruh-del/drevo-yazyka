#!/usr/bin/env python
"""Готовит тексты для озвучки веб-версии в js/speech.js.

Зачем: js/voice.js, если для слота нет готового mp3, читает строку с
экрана как есть. А на экране «й-й-й», «а-а-а» и «под-ъ-езд» — записи
для глаза, и браузерный голос произносил их по именам букв («и краткая»).
В приложении таких дорожек 36, а слотов 90, поэтому примеры уходили
именно в этот запасной путь.

Здесь те же правила, что и при синтезе mp3: voice/tts-text.py. Один слой
на оба пути — иначе веб и приложение со временем начнут читать по-разному.

Запуск: python voice/gen-speech.py
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
TEXTS = ROOT / "voice" / "texts.json"
OUT = ROOT / "js" / "speech.js"

_spec = importlib.util.spec_from_file_location("tts_text", HERE / "tts-text.py")
tts_text = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tts_text)


def main() -> int:
    data = json.loads(TEXTS.read_text(encoding="utf-8"))
    stress = tts_text.load_stress()

    speech: dict[str, str] = {}
    for rule in data.get("rules", []):
        for slot in rule.get("slots", []):
            key = slot.get("key")
            text = slot.get("text")
            if key and isinstance(text, str) and text.strip():
                speech[key] = tts_text.for_speech(text, stress)

    lines = [
        "/* speech.js — тексты для озвучки (генерируется voice/gen-speech.py).",
        "",
        "   Тот же слой, что и при синтезе mp3: числа словами, буквы-знаки",
        "   названиями, цепочек одиночных букв нет, ударение только там, где",
        "   знак меняет слово. Правь voice/tts-text.py, не этот файл. */",
        "window.__SPEECH__ = {",
    ]
    for key, value in sorted(speech.items()):
        lines.append(f'  {json.dumps(key, ensure_ascii=False)}: {json.dumps(value, ensure_ascii=False)},')
    lines.append("};")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"слотов: {len(speech)} -> {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())