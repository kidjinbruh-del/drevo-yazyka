package ru.drevo.yazyka.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.drevo.yazyka.audio.Narrator
import ru.drevo.yazyka.data.Progress
import ru.drevo.yazyka.data.Quiz
import ru.drevo.yazyka.data.Rules
import ru.drevo.yazyka.ui.theme.scaled

/**
 * Тренажёр. Два типа заданий, как на сайте:
 *  - «выбери правильное» — один верный вариант с разбором;
 *  - «кликни слово» — ребёнок отмечает токены, порядок не важен.
 *
 * Пройденные задания растят листья: ответили все — правило отмечено выученным.
 */
@Composable
fun TrainerScreen(
    state: Progress.State,
    narrator: Narrator,
    onMarkLearned: (String) -> Boolean,
    onScore: (Int, Int) -> Unit,
) {
    var grade by remember { mutableIntStateOf(state.grade.takeIf { it > 0 } ?: 1) }
    val quiz = remember(grade) { Rules.byGrade(grade).flatMap { r -> r.quiz.map { q -> r to q } } }
    var index by remember(grade) { mutableIntStateOf(0) }
    var correct by remember { mutableIntStateOf(0) }
    var done by remember { mutableStateOf(false) }

    if (quiz.isEmpty()) {
        EmptyNote("В этом классе заданий нет")
        return
    }
    val current = quiz[index.coerceIn(0, quiz.lastIndex)]

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp.scaled()),
    ) {
        Text("Тренировка", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Заданий в классе: ${quiz.size}. Отвечай — и листья растут.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        SpacerGap()
        // Чипы с рекордом не влезали в строку на узком экране, а обрезанный
        // третий класс читался как ошибка. Прокрутка по горизонтали честнее.
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(1, 2, 3).forEach { g ->
                FilterChip(
                    selected = grade == g,
                    onClick = {
                        grade = g
                        index = 0
                        correct = 0
                        done = false
                    },
                    label = {
                        val best = state.quizScore(g)
                        Text(if (best > 0) "$g класс · рекорд $best" else "$g класс")
                    },
                    modifier = Modifier.height(48.dp),
                )
            }
        }
        SpacerGap()
        ProgressBar(correct.toFloat(), (index + 1).toFloat())

        SpacerGap(16)
        when (val q = current.second) {
            is Quiz.Choice -> ChoiceCard(
                question = q,
                answered = done,
                onAnswer = { ok ->
                    if (ok) correct++
                    done = true
                    if (ok) onMarkLearned(current.first.id)
                },
            )

            is Quiz.Tap -> TapCard(
                quiz = q,
                answered = done,
                onAnswer = { ok ->
                    if (ok) correct++
                    done = true
                    if (ok) onMarkLearned(current.first.id)
                },
            )
        }

        SpacerGap(16)
        Button(
            onClick = {
                if (index == quiz.lastIndex) {
                    onScore(grade, correct)
                }
                if (index < quiz.lastIndex) {
                    index++
                    done = false
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text(
                when {
                    index == quiz.lastIndex -> "Итог: $correct из ${quiz.size}"
                    else -> "Следующее задание"
                },
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}

@Composable
private fun ChoiceCard(question: Quiz.Choice, answered: Boolean, onAnswer: (Boolean) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
    ) {
        Column(Modifier.padding(16.dp.scaled())) {
            Text(question.question, style = MaterialTheme.typography.titleMedium)
            SpacerGap()
            question.options.forEach { option ->
                val show = answered && option.ok
                val hide = answered && !option.ok
                Card(
                    onClick = { if (!answered) onAnswer(option.ok) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = when {
                            show -> scheme.primaryContainer
                            hide -> scheme.errorContainer.copy(alpha = 0.5f)
                            else -> scheme.surfaceVariant
                        },
                    ),
                ) {
                    Column(Modifier.padding(14.dp.scaled())) {
                        Text(option.text, style = MaterialTheme.typography.bodyLarge)
                        if (answered) {
                            SpacerGap(4)
                            Text(
                                option.why,
                                style = MaterialTheme.typography.bodySmall,
                                color = scheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TapCard(quiz: Quiz.Tap, answered: Boolean, onAnswer: (Boolean) -> Unit) {
    val scheme = MaterialTheme.colorScheme
    var picked by remember { mutableStateOf<Set<Int>>(emptySet()) }
    val wanted = quiz.steps.map { it.i }.toSet()

    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = scheme.surface),
    ) {
        Column(Modifier.padding(16.dp.scaled())) {
            Text(quiz.question, style = MaterialTheme.typography.titleMedium)
            SpacerGap()
            quiz.tokens.forEachIndexed { i, token ->
                val on = i in picked
                val mark = quiz.steps.firstOrNull { it.i == i }
                val container = when {
                    answered && mark != null -> scheme.primaryContainer
                    answered && on -> scheme.errorContainer.copy(alpha = 0.55f)
                    on -> scheme.primaryContainer
                    else -> scheme.surfaceVariant
                }
                Box(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp)
                        .background(container, RoundedCornerShape(12.dp))
                        .clickable(enabled = !answered) {
                            picked = if (i in picked) picked - i else picked + i
                        }
                        .padding(horizontal = 14.dp, vertical = 16.dp),
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(token, style = MaterialTheme.typography.titleMedium)
                        if (answered && mark != null) {
                            Text(
                                "  ← ${mark.mark}",
                                style = MaterialTheme.typography.bodySmall,
                                color = scheme.primary,
                            )
                        }
                    }
                }
            }
            SpacerGap()
            if (answered) {
                quiz.steps.forEach { step ->
                    Text(
                        "«${quiz.tokens.getOrNull(step.i) ?: "?"}» — ${step.mark}: ${step.why}",
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.onSurfaceVariant,
                    )
                    SpacerGap(4)
                }
            } else {
                Button(
                    onClick = { onAnswer(picked == wanted) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Проверить", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

@Composable
private fun EmptyNote(text: String) {
    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
        Text(text, style = MaterialTheme.typography.bodyLarge)
    }
}
