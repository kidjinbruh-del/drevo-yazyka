# Правила и переводы приходят кодом (RULES.json -> Kotlin), поэтому сжимать
# нечего: уберём имена полей у моделей, чтобы отчёт о падении оставался
# читаемым.
-keepattributes SourceFile,LineNumberTable

# Имена mp3 используются как строки в logcat при отладке озвучки.
-keepattributes *Annotation*
