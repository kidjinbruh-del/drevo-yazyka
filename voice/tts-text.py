#!/usr/bin/env python
"""Текст для синтеза: из текста на экране — в текст для голоса.

Зачем отдельный слой: то, что читает ребёнок, и то, что произносит
нейросеть, — разные вещи. На экране «33 буквы», «ъ и ь», «твёрдый
знак после согласной» — коротко и понятно. В озвучке те же места
должны звучать как речь: «тридцать три буквы», «твёрдый знак и мягкий
знак», пауза там, где глаз спотыкается о запятую.

Что делает модуль:
  * ставит ударения из voice/stress-ru.txt (омографы: «вода́» / «во́дный»);
  * числа превращает в слова: «33» -> «тридцать три»;
  * буквы-знаки разворачивает в названия: «ъ и ь» -> «твёрдый знак и
    мягкий знак»;
  * ставит паузы в местах, где без них голос сливает фразы в одну.

Экранный текст при этом не меняется: ударения и развёрнутые знаки
существуют только здесь, в озвучке.

Запуск: python voice/tts-text.py            # показать примеры
"""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT_PATH = ROOT / "voice" / "stress-ru.txt"

ACUTE = "́"
WORD = re.compile(r"[А-Яа-яЁё]+")

ONES = [
    "", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
]
TEENS = [
    "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
    "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
]
TENS = [
    "", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят",
    "семьдесят", "восемьдесят", "девяносто",
]
HUNDREDS = [
    "", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот",
    "семьсот", "восемьсот", "девятьсот",
]

# Буквы, которые читаются не как буквы. Их названия нужны словами.
# Название всегда с маленькой: регистр на звучание не влияет, а «и Мя́гкий
# знак» в середине фразы звучит как опечатка.
SYMBOL_NAMES = {
    "ъ": "твёрдый знак",
    "ь": "мягкий знак",
    "Ъ": "твёрдый знак",
    "Ь": "мягкий знак",
}

# Паузы перед словами-связками: без запятой фразы слипаются в одну.
PAUSE_BEFORE = (
    "потому что", "а значит", "то есть", "а если", "а когда", "но если",
    "и если", "и когда", "и потому", "и это", "а он", "а она", "а они",
    "и тогда", "и вот", "какой? ", "что делает? ", "где? ",
)

# Длинный перечисляющий ряд читается на одном дыхании и теряет конец.
# Ставим запятую перед «и», если до него тянется список из трёх и более
# коротких членов подряд.
ENUM_TAIL = re.compile(r"(, [^,]{2,18}), и ")


def number_to_words(value: int) -> str:
    if value < 0:
        return "минус " + number_to_words(-value)
    if value < 20:
        return (TEENS if value >= 10 else ONES)[value - 10] if value >= 10 else ONES[value]
    if value < 100:
        tens, rest = divmod(value, 10)
        return TENS[tens] + (" " + ONES[rest] if rest else "")
    if value < 1000:
        hundreds, rest = divmod(value, 100)
        return HUNDREDS[hundreds] + (" " + number_to_words(rest) if rest else "")
    return str(value)


def load_stress() -> dict[str, str]:
    """Слово в нижнем регистре -> слово с ударением."""
    if not DICT_PATH.exists():
        return {}
    table: dict[str, str] = {}
    for line in DICT_PATH.read_text(encoding="utf-8").splitlines():
        word = line.strip()
        if not word or word.startswith("#"):
            continue
        plain = unicodedata.normalize("NFC", word.replace(ACUTE, "")).lower()
        table[plain] = word
    return table


def apply_stress(text: str, table: dict[str, str]) -> str:
    def replace(match: re.Match) -> str:
        word = match.group(0)
        marked = table.get(word.lower())
        if marked is None:
            return word
        # Регистр берём из исходного слова: иначе «Ударение» в начале
        # фразы превращалось в «ударе́ние», и голос звучал странно.
        if word[:1].isupper():
            return marked[:1].upper() + marked[1:]
        return marked

    return WORD.sub(replace, text)


def spell_numbers(text: str) -> str:
    def replace(match: re.Match) -> str:
        raw = match.group(0)
        # Дробные и годы не трогаем: «3,5» и «2024» — не то и не это.
        if "," in raw or "." in raw or len(raw) > 3:
            return raw
        return number_to_words(int(raw))

    return re.sub(r"\d+", replace, text)


def spell_symbols(text: str) -> str:
    """«ъ и ь» -> «твёрдый знак и мягкий знак», но «подъезд» не трогаем."""
    out = text
    for symbol, name in SYMBOL_NAMES.items():
        # Только когда знак стоит отдельным словом: после буквы это часть слова.
        out = re.sub(rf"(?<![\w]){re.escape(symbol)}(?![\w])", name, out)
    return out


def add_pauses(text: str) -> str:
    for phrase in PAUSE_BEFORE:
        text = re.sub(rf"(?<!\s)(?<!\n)(?<!, )\b{re.escape(phrase)}", ", " + phrase, text)
    text = ENUM_TAIL.sub(r"\1, и ", text)
    # Двойная запятая после замены — убираем.
    text = re.sub(r",\s*,", ",", text)
    text = re.sub(r"\s+,", ",", text)
    return text


def for_speech(display_text: str, table: dict[str, str] | None = None) -> str:
    table = table if table is not None else load_stress()
    text = spell_numbers(display_text)
    text = spell_symbols(text)
    text = add_pauses(text)
    text = apply_stress(text, table)
    return re.sub(r"\s{2,}", " ", text).strip()


SAMPLES = [
    "В русском алфавите 33 буквы: десять гласных, двадцать одна согласная и два знака-помощника — твёрдый и мягкий.",
    "Ударение — это слог, который произносится громче и дольше.",
    "Ъ и Ь — буквы, но не звуки: сами не звучат, только помогают другим.",
]


def main() -> int:
    table = load_stress()
    print(f"записей в словаре ударений: {len(table)}\n")
    for text in SAMPLES:
        print("экран:")
        print(f"  {text}")
        print("озвучка:")
        print(f"  {for_speech(text, table)}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
