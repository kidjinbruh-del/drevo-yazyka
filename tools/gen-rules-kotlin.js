// Генератор Kotlin-моделей правил из RULES.json.
//
// Зачем: правила живут в data.js сайта (он и есть источник истины), а
// нативное приложение на Kotlin читает уже скомпилированные модели. Держать
// две копии вручную — значит гарантированно их развести, поэтому код
// генерируется, а в репозиторий попадает уже проверенный результат.
//
// Запуск:  node tools/gen-rules-kotlin.js
// Результат: android/app/src/main/java/ru/drevo/yazyka/data/Rules.kt

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'RULES.json');
const out = path.join(root, 'android', 'app', 'src', 'main', 'java', 'ru', 'drevo', 'yazyka', 'data', 'Rules.kt');

const data = JSON.parse(fs.readFileSync(src, 'utf8'));

/** Строка в виде Kotlin-литерала: кавычки, переводы строк, обратные слэши. */
function ktString(s) {
  if (s === null || s === undefined) return '""';
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '') + '"';
}

function ktList(items, fn, indent) {
  const pad = ' '.repeat(indent || 0);
  return 'listOf(\n' + items.map((x) => pad + '    ' + fn(x)).join(',\n') + '\n' + pad + ')';
}

function renderQuiz(q) {
  if (q.type === 'choice') {
    const options = ktList(q.options, (o) =>
      'ChoiceOption(' + ktString(o.t) + ', ok = ' + (o.ok ? 'true' : 'false') + ', ' + ktString(o.why || '') + ')', 12);
    return '            Quiz.Choice(\n                question = ' + ktString(q.q) + ',\n                options = ' + options + ',\n            )';
  }
  if (q.type === 'tap') {
    const tokens = ktList(q.tokens || [], (t) => ktString(t), 16);
    const steps = ktList(q.steps || [], (s) =>
      'TapStep(i = ' + s.i + ', mark = ' + ktString(s.mark || '') + ', ' + ktString(s.why || '') + ')', 16);
    return '            Quiz.Tap(\n                question = ' + ktString(q.q) + ',\n                tokens = ' + tokens + ',\n                steps = ' + steps + ',\n            )';
  }
  return null;
}

const rules = data.rules.map((r) => {
  const examples = ktList(r.examples || [], ktString, 12);
  const errors = ktList(r.errors || [], ktString, 12);
  const links = ktList(r.links || [], ktString, 12);
  const quiz = (r.quiz || []).map(renderQuiz).filter(Boolean);
  return `    Rule(
        id = ${ktString(r.id)},
        grade = ${r.grade},
        branch = ${ktString(r.branch)},
        title = ${ktString(r.title)},
        human = ${ktString(r.human)},
        textbook = ${ktString(r.textbook)},
        examples = ${examples},
        wrongText = ${ktString((r.wrong && r.wrong.text) || '')},
        wrongWhy = ${ktString((r.wrong && r.wrong.why) || '')},
        errors = ${errors},
        links = ${links},
        quiz = ${quiz.length ? 'listOf(\n' + quiz.join(',\n') + '\n        )' : 'emptyList()'},
    )`;
}).join(',\n');

const translations = (data.translations || []).map((t) =>
  '    Translation(from = ' + ktString(t.from) + ', ' + ktString(t.to) + ', ruleId = ' + ktString(t.ruleId) + ')'
).join(',\n');

const header = `package ru.drevo.yazyka.data

// ФАЙЛ СГЕНЕРИРОВАН: tools/gen-rules-kotlin.js. Правьте RULES.json, а не его.
// Источник истины — сайт drevo-yazyka; здесь он лежит уже разобранным на части.

data class ChoiceOption(val text: String, val ok: Boolean, val why: String)

data class TapStep(val i: Int, val mark: String, val why: String)

sealed interface Quiz {
    val question: String

    /** «Выбери правильное»: один вопрос — один верный вариант. */
    data class Choice(
        override val question: String,
        val options: List<ChoiceOption>,
    ) : Quiz {
        val correct: ChoiceOption get() = options.first { it.ok }
    }

    /** «Кликни слово»: ребёнок отмечает токены по индексу. */
    data class Tap(
        override val question: String,
        val tokens: List<String>,
        val steps: List<TapStep>,
    ) : Quiz
}

data class Rule(
    val id: String,
    val grade: Int,
    val branch: String,
    val title: String,
    val human: String,
    val textbook: String,
    val examples: List<String>,
    val wrongText: String,
    val wrongWhy: String,
    val errors: List<String>,
    val links: List<String>,
    val quiz: List<Quiz>,
) {
    /** Имя аудиофайла человеческого объяснения: g1-sounds_human. */
    val humanAudio: String get() = id.replace('-', '_') + "_human"
    val textbookAudio: String get() = id.replace('-', '_') + "_textbook"
}

data class Translation(val from: String, val to: String, val ruleId: String)

object Rules {
    val ALL: List<Rule> = listOf(
${rules}
    )

    val TRANSLATIONS: List<Translation> = listOf(
${translations}
    )

    fun byId(id: String): Rule? = ALL.firstOrNull { it.id == id }

    fun byGrade(grade: Int): List<Rule> = ALL.filter { it.grade == grade }

    /** Переводчик по учебниковой формулировке: ищет точное совпадение. */
    fun translate(phrase: String): String? =
        TRANSLATIONS.firstOrNull { it.from.equals(phrase.trim(), ignoreCase = true) }?.to
}
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, header, 'utf8');
console.log('ok: ' + data.rules.length + ' правил, ' + (data.translations || []).length + ' переводов -> ' + path.relative(root, out));

// --- Карта озвучки -----------------------------------------------------------
// Имена ресурсов нужны как прямые ссылки R.raw.*, иначе сборка с
// shrinkResources считает mp3 неиспользуемыми и вырезает все 36 дорожек:
// обращение по строке (getIdentifier) для aapt2 невидимо. Раньше так и
// вышло — APK собирался, озвучки в нём не было, и это замечали только
// нажатием кнопки «Послушать».

const audioEntries = [];
data.rules.forEach((r) => {
  ['human', 'textbook'].forEach((kind) => {
    const res = String(r.id).replace(/-/g, '_') + '_' + kind;
    audioEntries.push('        ' + ktString(res) + ' to R.raw.' + res);
  });
});

const audio = `package ru.drevo.yazyka.data

import ru.drevo.yazyka.R

// ФАЙЛ СГЕНЕРИРОВАН: tools/gen-rules-kotlin.js. Правьте RULES.json, а не его.
//
// Здесь прямые ссылки на R.raw.*. Это не удобство, а необходимость: при
// сборке с shrinkResources файлы, на которые нет ссылки в коде, из APK
// вырезаются. Поиск по имени через Resources.getIdentifier сборщику не
// виден, и все дорожки озвучки исчезали из подписанного APK.

object Audio {
    private val byName: Map<String, Int> = mapOf(
${audioEntries.join(',\n')}
    )

    /** Идентификатор ресурса по имени файла без расширения, null если нет. */
    fun id(name: String): Int? = byName[name]

    val names: Set<String> = byName.keys
}
`;

const outAudio = path.join(path.dirname(out), 'Audio.kt');
fs.writeFileSync(outAudio, audio, 'utf8');
console.log('ok: ' + audioEntries.length + ' дорожек -> ' + path.relative(root, outAudio));