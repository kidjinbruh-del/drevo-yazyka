#!/usr/bin/env python
"""Проверка словаря ударений voice/stress-ru.txt.

Три проверки, все на файле, без синтеза:

1. знак ударения стоит на гласной (иначе слово читается неправильно);
2. нет латиницы, потерянной при копировании (типичная беда: ó вместо ó);
3. покрытие: каждое многосложное слово из voice/texts.json есть в словаре.

Последнее — главная: пропущенное слово не сломается, но останется
прочитанным так, как нейросеть догадается. Это тихо портит качество.

Запуск: python voice/check-stress.py
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT = ROOT / "voice" / "stress-ru.txt"
TEXTS = ROOT / "voice" / "texts.json"

VOWELS = set("аеиоуыэюяАЕИОУЫЭЮЯ")
ACUTE = "́"

# Слова, которые размечать не нужно, с причиной. Без исключений проверка
# покрытия ругается на них каждый раз, и её перестают читать.
NO_STRESS_NEEDED = {
    "абвгдеёж": "произносится по буквам, ударение не ставится",
    "весёлый": "ударная буква ё, знак не нужен",
    # Служебные слова без собственного ударения: знак над ними только
    # сбивает голос.
    "если": "служебное, ударения нет",
    "или": "служебное, ударения нет",
    "это": "служебное, ударения нет",
    "этом": "служебное, ударения нет",
    "этот": "служебное, ударения нет",
}


def load_dictionary() -> list[str]:
    return [
        line.strip()
        for line in DICT.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    ]


def base(word: str) -> str:
    return unicodedata.normalize("NFC", word.replace(ACUTE, "")).lower()


def corpus_words() -> set[str]:
    data = json.loads(TEXTS.read_text(encoding="utf-8"))
    words: set[str] = set()
    for rule in data.get("rules", []):
        for slot in rule.get("slots", []):
            words.update(re.findall(r"[А-Яа-яЁё]+", slot.get("text", "")))
    return words


def main() -> int:
    entries = load_dictionary()
    problems: list[str] = []

    latin: set[str] = set()
    for entry in entries:
        for char in entry:
            # Латиница любого блока, не только a-z: «ó» — это U+00F3, и
            # простая проверка диапазона его пропускала.
            if unicodedata.name(char, "").startswith("LATIN"):
                latin.add(char)
        if ACUTE not in entry:
            continue
        marked = entry[entry.index(ACUTE) - 1]
        if marked not in VOWELS:
            problems.append(f"«{entry}»: знак ударения не над гласной (над «{marked}»)")
    if latin:
        problems.append(f"латиница в словаре: {sorted(latin)} — русские буквы, не английские")

    index: dict[str, str] = {}
    duplicates: dict[str, list[str]] = {}
    for entry in entries:
        key = base(entry)
        if key in index:
            duplicates.setdefault(key, [index[key], entry]).append(entry)
        index[key] = entry
    for word, forms in duplicates.items():
        problems.append(f"«{word}» встречается несколько раз: {', '.join(forms)}")

    needed = {
        w.lower()
        for w in corpus_words()
        if len(re.findall(r"[аеиоуыэюяАЕИОУЫЭЮЯ]", w)) >= 2
    } - set(NO_STRESS_NEEDED)
    missing = sorted(needed - set(index))
    unused = sorted(set(index) - needed - set(NO_STRESS_NEEDED))

    print(f"записей в словаре: {len(entries)}")
    print(f"многосложных слов в текстах: {len(needed)}")
    print(f"не размечено: {len(missing)}")
    print(f"лишних записей: {len(unused)}")
    if unused:
        print("  " + " ".join(unused))
    if missing:
        print("\nНЕ РАЗМЕЧЕНО:")
        print("  " + "\n  ".join(" ".join(missing[i:i + 8]) for i in range(0, len(missing), 8)))

    for problem in problems:
        print(f"\nОШИБКА: {problem}")

    return 1 if (missing or problems) else 0


if __name__ == "__main__":
    sys.exit(main())
