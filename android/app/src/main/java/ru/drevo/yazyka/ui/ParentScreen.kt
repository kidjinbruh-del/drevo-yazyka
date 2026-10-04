package ru.drevo.yazyka.ui

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import ru.drevo.yazyka.data.Progress
import ru.drevo.yazyka.data.Rule
import ru.drevo.yazyka.data.Rules
import ru.drevo.yazyka.io.ProgressFile
import ru.drevo.yazyka.ui.theme.scaled

/**
 * Страница родителя: переводчик с учебникового на человеческий, выгрузка
 * и загрузка «своего дерева» файлом.
 *
 * Выгрузка идёт через системный выбор места — файл уходит на диск телефона
 * или в мессенджер, без всяких серверов: это осознанное требование проекта.
 */
@Composable
fun ParentScreen(
    progress: Progress,
    state: Progress.State,
) {
    val context = LocalContext.current
    var query by remember { mutableStateOf("") }
    var note by remember { mutableStateOf<String?>(null) }

    val save = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri == null) {
            note = "Сохранение отменено"
        } else {
            val ok = ProgressFile.write(context, uri, progress.exportJson())
            note = if (ok) "Файл сохранён" else "Не удалось записать файл"
        }
    }

    val open = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) {
            note = "Загрузка отменена"
        } else {
            val text = ProgressFile.read(context, uri)
            if (text == null) {
                note = "Файл не прочитан"
            } else {
                val (accepted, rejected) = progress.importJson(text)
                note = "Принято правил: $accepted" + if (rejected > 0) ", отброшено: $rejected" else ""
            }
        }
    }

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp.scaled()),
    ) {
        Text("Родителям", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Переведу формулировку учебника на обычный язык и покажу, как идёт дело.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        SpacerGap(16)
        Text("Переводчик", style = MaterialTheme.typography.titleMedium)
        Text(
            "Вставьте фразу из учебника — например: «В основе предложения заключается главный смысл предложения».",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        SpacerGap(8)
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Фраза из учебника") },
            minLines = 2,
        )
        SpacerGap(8)

        val exact = Rules.translate(query)
        if (exact != null) {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                ),
            ) {
                Column(Modifier.padding(16.dp.scaled())) {
                    Text("По-человечески", style = MaterialTheme.typography.labelMedium)
                    SpacerGap(4)
                    Text(exact, style = MaterialTheme.typography.bodyLarge)
                }
            }
        } else if (query.length >= 8) {
            var best: Rule? = null
            var bestScore = 0
            Rules.ALL.forEach { rule ->
                var score = 0
                rule.textbook.split(' ', '.', ',').forEach { word ->
                    val w = word.trim().lowercase()
                    if (w.length > 3 && query.lowercase().contains(w)) score += w.length
                }
                if (score > bestScore) {
                    bestScore = score
                    best = rule
                }
            }
            if (best != null) {
                Card(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(Modifier.padding(16.dp.scaled())) {
                        Text("Похожее правило: ${best.title}", style = MaterialTheme.typography.labelMedium)
                        SpacerGap(4)
                        Text(best!!.human, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            } else {
                Text(
                    "Такой фразы в базе нет. Введите точную формулировку из учебника.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        SpacerGap(20)
        Text("Своё дерево", style = MaterialTheme.typography.titleMedium)
        Text(
            "Прогресс хранится только на устройстве. Файл нужен, чтобы перенести его на другой телефон или не потерять при переустановке.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        SpacerGap(8)
        // Кнопки в столбик, а не в строку: на узком экране три подписи
        // в одну линию не влезали и переносились на вторую, обрезаясь.
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { save.launch("drevo-progress.json") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
            ) { Text("Сохранить файл") }
            Button(
                onClick = { open.launch(arrayOf("application/json", "text/plain", "*/*")) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
            ) { Text("Загрузить файл") }
            OutlinedButton(
                onClick = {
                    val intent = ProgressFile.shareIntent(context, "drevo-progress.json", progress.exportJson())
                    if (intent == null) {
                        note = "Не удалось подготовить файл"
                    } else {
                        context.startActivity(Intent.createChooser(intent, "Поделиться деревом"))
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
            ) { Text("Поделиться деревом") }
        }
        val message = note
        if (message != null) {
            SpacerGap(8)
            Text(message, style = MaterialTheme.typography.bodyMedium)
        }

        SpacerGap(20)
        Text("Как идёт дело", style = MaterialTheme.typography.titleMedium)
        SpacerGap(8)
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface,
            ),
        ) {
            Column(Modifier.padding(16.dp.scaled())) {
                SummaryLine("Всего правил", "${state.learned()} из ${state.total()}")
                SummaryLine("1 класс", "${state.learned(1)} из ${state.total(1)}")
                SummaryLine("2 класс", "${state.learned(2)} из ${state.total(2)}")
                SummaryLine("3 класс", "${state.learned(3)} из ${state.total(3)}")
                SummaryLine("Достижения", "${state.achievements.size} из ${ACHIEVEMENTS.size}")
                SpacerGap(8)
                Text("Не диагноз и не оценка: это счётчик пройденных правил.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private val ACHIEVEMENTS = listOf(
    "first" to "Первый листик",
    "five" to "Пять листьев",
    "branch1" to "Ветка 1 класса",
    "branch2" to "Ветка 2 класса",
    "branch3" to "Ветка 3 класса",
    "all" to "Всё дерево",
)

@Composable
private fun SummaryLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f),
        )
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}