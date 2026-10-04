package ru.drevo.yazyka.data

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Режимы темы: как в системе, всегда тёмная, всегда светлая. */
const val THEME_SYSTEM = "system"
const val THEME_DARK = "dark"
const val THEME_LIGHT = "light"

/** Как в системе / всегда тёмная / всегда светлая. */
fun themeLabel(theme: String): String = when (theme) {
    THEME_DARK -> "Тёмная"
    THEME_LIGHT -> "Светлая"
    else -> "Как в системе"
}

/**
 * Прогресс ребёнка: выбранный класс, выученные правила, достижения и
 * результаты тренажёра. Хранится в SharedPreferences — объём копеечный,
 * синхронизации нет, всё живёт только на устройстве.
 *
 * Состояние раздаётся как StateFlow: экраны перерисовываются сами, когда
 * ребёнок выучил правило.
 */
class Progress private constructor(private val prefs: SharedPreferences) {

    private val _state = MutableStateFlow(read())
    val state: StateFlow<State> = _state.asStateFlow()

    data class State(
        val grade: Int = 0,
        val seen: Set<String> = emptySet(),
        val achievements: Set<String> = emptySet(),
        val quiz: Map<String, Int> = emptyMap(),
        val theme: String = THEME_SYSTEM,
    ) {
        fun learned(grade: Int = -1): Int =
            if (grade < 0) seen.size else Rules.byGrade(grade).count { it.id in seen }

        fun total(grade: Int = -1): Int =
            if (grade < 0) Rules.ALL.size else Rules.byGrade(grade).size

        /** Лучший результат тренажёра в классе, 0 — тренажёр ещё не проходили. */
        fun quizScore(grade: Int): Int = quiz["g$grade"] ?: 0

        /** Следующий режим темы по кругу: как в системе -> тёмная -> светлая. */
        fun nextTheme(): String = when (theme) {
            THEME_SYSTEM -> THEME_DARK
            THEME_DARK -> THEME_LIGHT
            else -> THEME_SYSTEM
        }
    }

    fun setTheme(theme: String) {
        if (theme !in setOf(THEME_SYSTEM, THEME_DARK, THEME_LIGHT)) return
        write(_state.value.copy(theme = theme))
    }

    private fun read(): State = State(
        grade = prefs.getInt(KEY_GRADE, 0),
        theme = prefs.getString(KEY_THEME, THEME_SYSTEM) ?: THEME_SYSTEM,
        seen = prefs.getStringSet(KEY_SEEN, emptySet()) ?: emptySet(),
        achievements = prefs.getStringSet(KEY_ACH, emptySet()) ?: emptySet(),
        quiz = prefs.getString(KEY_QUIZ, null)
            ?.split(';')
            .orEmpty()
            .mapNotNull { part ->
                val bits = part.split('=')
                if (bits.size == 2) bits[0] to bits[1].toIntOrNull() else null
            }
            .filter { it.second != null }
            .associate { it.first to it.second!! },
    )

    private fun write(s: State) {
        prefs.edit()
            .putInt(KEY_GRADE, s.grade)
            .putString(KEY_THEME, s.theme)
            .putStringSet(KEY_SEEN, s.seen)
            .putStringSet(KEY_ACH, s.achievements)
            .putString(KEY_QUIZ, s.quiz.entries.joinToString(";") { "${it.key}=${it.value}" })
            .apply()
        _state.value = s
    }

    fun setGrade(grade: Int) {
        if (grade !in 1..3) return
        write(_state.value.copy(grade = grade))
    }

    fun isLearned(ruleId: String): Boolean = ruleId in _state.value.seen

    /** Отмечает правило выученным. Повторное нажатие ничего не меняет. */
    fun markLearned(ruleId: String): Boolean {
        val s = _state.value
        if (Rules.byId(ruleId) == null || ruleId in s.seen) return false
        val seen = s.seen + ruleId
        write(s.copy(seen = seen, achievements = s.achievements + checkAchievements(seen)))
        return true
    }

    fun quizScore(grade: Int): Int = _state.value.quizScore(grade)

    fun recordQuiz(grade: Int, score: Int) {
        if (score <= quizScore(grade)) return
        write(_state.value.copy(quiz = _state.value.quiz + ("g$grade" to score)))
    }

    fun reset() {
        prefs.edit().remove(KEY_SEEN).remove(KEY_ACH).remove(KEY_QUIZ).apply()
        _state.value = read()
    }

    /** Выгрузка для «Поделиться»: тот же состав, что и файл на сайте. */
    fun exportJson(): String {
        val s = _state.value
        val seen = Rules.ALL.joinToString(",") { "\"${it.id}\":${it.id in s.seen}" }
        val quiz = s.quiz.entries.joinToString(",") { "\"${it.key}\":${it.value}" }
        return buildString {
            append("{\n")
            append("  \"app\": \"drevo-yazyka\",\n")
            append("  \"format\": 2,\n")
            append("  \"exportedAt\": \"")
            append(java.time.Instant.now().toString())
            append("\",\n")
            append("  \"grade\": ").append(s.grade).append(",\n")
            append("  \"achievements\": [")
            append(s.achievements.joinToString(",") { "\"$it\"" })
            append("],\n")
            append("  \"quiz\": {").append(quiz).append("},\n")
            append("  \"learned\": {").append(seen).append("}\n")
            append("}\n")
        }
    }

    /** Загрузка из файла. Возвращает пару (сколько принято, сколько отброшено). */
    fun importJson(text: String): Pair<Int, Int> {
        val root = runCatching { org.json.JSONObject(text) }.getOrNull()
            ?: return 0 to 0
        val learned = root.optJSONObject("learned")
        val incoming = learned?.keys()?.asSequence()?.toList().orEmpty()
        val valid = incoming.filter { Rules.byId(it) != null }
        val current = _state.value
        val merged = current.seen + valid.toSet()
        val grade = root.optInt("grade", current.grade).coerceIn(0, 3)
        val ach = root.optJSONArray("achievements")?.let { arr ->
            buildSet { for (i in 0 until arr.length()) add(arr.getString(i)) }
        } ?: current.achievements
        write(current.copy(grade = grade, seen = merged, achievements = ach))
        return valid.size to (incoming.size - valid.size)
    }

    internal companion object {
        const val KEY_GRADE = "grade"
        const val KEY_SEEN = "seen"
        const val KEY_ACH = "ach"
        const val KEY_QUIZ = "quiz"
        const val KEY_THEME = "theme"

        fun of(context: Context): Progress = Progress(
            context.getSharedPreferences("drevo", Context.MODE_PRIVATE),
        )
    }

    /** Достижения считаются по факту пройденного, а не по кнопке. */
    private fun checkAchievements(seen: Set<String>): Set<String> {
        val out = mutableSetOf<String>()
        fun add(id: String, cond: Boolean) { if (cond) out += id }
        add("first", seen.isNotEmpty())
        add("five", seen.size >= 5)
        add("branch1", Rules.byGrade(1).all { it.id in seen })
        add("branch2", Rules.byGrade(2).all { it.id in seen })
        add("branch3", Rules.byGrade(3).all { it.id in seen })
        add("all", seen.size == Rules.ALL.size)
        return out
    }
}

/**
 * Единственный экземпляр на процесс — состояние должно быть общим для всех экранов.
 */
object DrevoProgress {
    private var instance: Progress? = null

    fun get(context: Context): Progress =
        instance ?: synchronized(this) {
            instance ?: Progress.of(context.applicationContext).also { instance = it }
        }
}