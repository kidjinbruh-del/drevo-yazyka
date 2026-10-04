#!/usr/bin/env python
"""Синтез озвучки правил нейросетевым голосом Microsoft Edge.

Зачем не SAPI: на этой машине для русского стоит только Microsoft Irina —
ровный, но роботичный. Ребёнку такое слушать тяжело. Edge-tts отдаёт
настоящие нейросетевые голоса, и выбор шире: можно взять тёплый
Светлану или живую Дашу.

Что делает:
  * берёт тексты из voice/texts.json (тот же список, что у gen-audio.ps1);
  * синтезирует каждый слот в voice/samples/<голос>/<слот>.mp3;
  * печатает отчёт: сколько файлов, сколько секунд речи.

Запуск:
  python voice/gen-edge.py --voices ru-RU-SvetlanaNeural ru-RU-DashaNeural
  python voice/gen-edge.py --list          # показать доступные ru-RU голоса
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXTS = ROOT / "voice" / "texts.json"
OUT_ROOT = ROOT / "voice" / "samples"

# Свой модуль с буквой в имени, поэтому импорт обычный не сработает.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util

_spec = importlib.util.spec_from_file_location(
    "tts_text", Path(__file__).resolve().parent / "tts-text.py"
)
tts_text = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tts_text)

# Скорость и высота: объяснение правила читают вслух, спешка неуместна.
RATE = "-8%"
PITCH = "+2Hz"


def slots() -> list[tuple[str, str]]:
    """Слоты для синтеза: имя слота -> текст.

    Структура texts.json: {"rules": [{"ruleId": …, "slots": [
    {"key": "g1-sounds_human", "text": "…"}]}]}. Плоский список собираем
    отсюда, а не из RULES.json: в texts.json уже помечены примеры.
    """
    data = json.loads(TEXTS.read_text(encoding="utf-8"))
    out: list[tuple[str, str]] = []
    for rule in data.get("rules", []):
        for slot in rule.get("slots", []):
            key = slot.get("key")
            text = slot.get("text")
            if key and isinstance(text, str) and text.strip():
                out.append((key, text))
    return sorted(out)


def app_slots() -> list[tuple[str, str]]:
    """Только те слоты, которые слушает приложение: human и textbook."""
    return [(k, t) for k, t in slots() if k.endswith(("_human", "_textbook"))]


async def list_voices() -> None:
    import edge_tts

    voices = await edge_tts.list_voices()
    ru = [v for v in voices if v["Locale"].startswith("ru-RU")]
    if not ru:
        print("русских голосов не найдено")
        return
    print(f"русских голосов: {len(ru)}")
    for v in sorted(ru, key=lambda x: x["ShortName"]):
        tags = ",".join(v.get("VoiceTag", {}).get("VoicePersonalities", []))
        print(f"  {v['ShortName']:<44} {v['Gender']:<7} {tags}")


async def synth(voice: str, rate: str, pitch: str, only_app: bool = False, prepare: bool = True) -> int:
    import edge_tts

    pairs = app_slots() if only_app else slots()
    if not pairs:
        print("в voice/texts.json нет текстов")
        return 0

    out_dir = OUT_ROOT / voice
    out_dir.mkdir(parents=True, exist_ok=True)
    stress = tts_text.load_stress()

    for index, (name, text) in enumerate(pairs, 1):
        target = out_dir / f"{name}.mp3"
        tmp = target.with_suffix(".part.mp3")
        # На экран идёт исходный текст, в озвучку — текст с ударениями,
        # числами словами и паузами: см. voice/tts-text.py.
        spoken = tts_text.for_speech(text, stress) if prepare else text
        await edge_tts.Communicate(
            spoken,
            voice,
            rate=rate,
            pitch=pitch,
            boundary="SentenceBoundary",
        ).save(str(tmp))
        tmp.replace(target)
        print(f"  [{index}/{len(pairs)}] {name}.mp3  {target.stat().st_size // 1024} КБ", flush=True)

    print(f"\nготово: {len(pairs)} файлов в {out_dir}")
    return len(pairs)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voices", nargs="*", default=["ru-RU-SvetlanaNeural"])
    parser.add_argument("--rate", default=RATE)
    parser.add_argument("--pitch", default=PITCH)
    parser.add_argument("--app-only", action="store_true", help="только human и textbook")
    parser.add_argument("--raw", action="store_true",
                        help="без ударений и пауз: читать исходный текст как есть")
    parser.add_argument("--list", action="store_true", help="показать русские голоса")
    args = parser.parse_args()

    if args.list:
        asyncio.run(list_voices())
        return 0

    total = 0
    for voice in args.voices:
        print(f"голос: {voice}", flush=True)
        total += asyncio.run(synth(voice, args.rate, args.pitch, args.app_only, not args.raw))
    print(f"всего файлов: {total}")
    return 0 if total else 1


if __name__ == "__main__":
    sys.exit(main())
