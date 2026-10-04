#!/usr/bin/env python
"""Длительность mp3 без внешних библиотек.

Зачем: mutagen на машине нет, а проверить, что дорожка стала короче после
правки текста, нужно было чем-то измеримым. Разбор кадров MPEG Layer III
занимает полсотни строк и не тянет зависимостей.

Запуск: python voice/mp3-length.py audio/g1-voiced_human.mp3
"""
from __future__ import annotations

import sys
from pathlib import Path

# Битрейты, кбит/с. Индекс — поле «битрейт» заголовка кадра.
V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]

SAMPLE_RATES = {
    3: [44100, 48000, 32000],   # MPEG-1
    2: [22050, 24000, 16000],   # MPEG-2
    0: [11025, 12000, 8000],    # MPEG-2.5
}


def frame_length(header: int) -> int:
    """Длина кадра в байтах или 0, если это не Layer III."""
    version = (header >> 19) & 0x3          # 3 = MPEG-1, 2 = MPEG-2, 0 = 2.5
    layer = (header >> 17) & 0x3            # 1 = Layer III
    if layer != 1 or version == 1:
        return 0
    bitrate_index = (header >> 12) & 0xF
    rate_index = (header >> 10) & 0x3
    if bitrate_index in (0, 15) or rate_index == 3:
        return 0
    table = V1_L3 if version == 3 else V2_L3
    bitrate = table[bitrate_index] * 1000
    sample_rate = SAMPLE_RATES[version][rate_index]
    padding = (header >> 9) & 0x1
    samples_per_frame = 1152 if version == 3 else 576
    return int(samples_per_frame / 8 * bitrate / sample_rate) + padding


def duration(path: Path) -> float:
    data = path.read_bytes()
    total = 0.0
    index = 0
    size = len(data)
    while index + 4 <= size:
        if data[index] == 0xFF and (data[index + 1] & 0xE0) == 0xE0:
            header = int.from_bytes(data[index + 1:index + 4], "big")
            length = frame_length(header)
            if length:
                version = (header >> 19) & 0x3
                rate_index = (header >> 10) & 0x3
                rate = SAMPLE_RATES[version][rate_index]
                total += (1152 if version == 3 else 576) / rate
                index += length
                continue
        index += 1
    return total


def main(argv: list[str]) -> int:
    if not argv:
        print("нужны пути к mp3")
        return 1
    for name in argv:
        path = Path(name)
        print(f"{path.name:<28} {duration(path):6.2f} с")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))