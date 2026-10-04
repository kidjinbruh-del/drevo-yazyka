package ru.drevo.yazyka.data

import ru.drevo.yazyka.R

// ФАЙЛ СГЕНЕРИРОВАН: tools/gen-rules-kotlin.js. Правьте RULES.json, а не его.
//
// Здесь прямые ссылки на R.raw.*. Это не удобство, а необходимость: при
// сборке с shrinkResources файлы, на которые нет ссылки в коде, из APK
// вырезаются. Поиск по имени через Resources.getIdentifier сборщику не
// виден, и все дорожки озвучки исчезали из подписанного APK.

object Audio {
    private val byName: Map<String, Int> = mapOf(
        "g1_sounds_human" to R.raw.g1_sounds_human,
        "g1_sounds_textbook" to R.raw.g1_sounds_textbook,
        "g1_vow_human" to R.raw.g1_vow_human,
        "g1_vow_textbook" to R.raw.g1_vow_textbook,
        "g1_voiced_human" to R.raw.g1_voiced_human,
        "g1_voiced_textbook" to R.raw.g1_voiced_textbook,
        "g1_syllable_human" to R.raw.g1_syllable_human,
        "g1_syllable_textbook" to R.raw.g1_syllable_textbook,
        "g1_stress_human" to R.raw.g1_stress_human,
        "g1_stress_textbook" to R.raw.g1_stress_textbook,
        "g1_sentence_human" to R.raw.g1_sentence_human,
        "g1_sentence_textbook" to R.raw.g1_sentence_textbook,
        "g2_pos_human" to R.raw.g2_pos_human,
        "g2_pos_textbook" to R.raw.g2_pos_textbook,
        "g2_noun_human" to R.raw.g2_noun_human,
        "g2_noun_textbook" to R.raw.g2_noun_textbook,
        "g2_verb_human" to R.raw.g2_verb_human,
        "g2_verb_textbook" to R.raw.g2_verb_textbook,
        "g2_adj_human" to R.raw.g2_adj_human,
        "g2_adj_textbook" to R.raw.g2_adj_textbook,
        "g2_root_human" to R.raw.g2_root_human,
        "g2_root_textbook" to R.raw.g2_root_textbook,
        "g3_members_human" to R.raw.g3_members_human,
        "g3_members_textbook" to R.raw.g3_members_textbook,
        "g3_pairs_human" to R.raw.g3_pairs_human,
        "g3_pairs_textbook" to R.raw.g3_pairs_textbook,
        "g3_silent_human" to R.raw.g3_silent_human,
        "g3_silent_textbook" to R.raw.g3_silent_textbook,
        "g3_marks_human" to R.raw.g3_marks_human,
        "g3_marks_textbook" to R.raw.g3_marks_textbook,
        "g3_names_human" to R.raw.g3_names_human,
        "g3_names_textbook" to R.raw.g3_names_textbook,
        "g3_comma_human" to R.raw.g3_comma_human,
        "g3_comma_textbook" to R.raw.g3_comma_textbook,
        "g3_others_human" to R.raw.g3_others_human,
        "g3_others_textbook" to R.raw.g3_others_textbook
    )

    /** Идентификатор ресурса по имени файла без расширения, null если нет. */
    fun id(name: String): Int? = byName[name]

    val names: Set<String> = byName.keys
}
