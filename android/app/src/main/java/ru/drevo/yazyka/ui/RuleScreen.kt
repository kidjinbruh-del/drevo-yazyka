package ru.drevo.yazyka.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.drevo.yazyka.audio.Narrator
import ru.drevo.yazyka.data.Rule
import ru.drevo.yazyka.ui.theme.scaled

/**
 * Паспорт правила: человеческое объяснение, учебниковая формулировка,
 * примеры, «так нельзя» с разбором, типичные ошибки и связи.
 *
 * Озвучка двух полей: «по-человечески» и «как в учебнике» — отдельными
 * файлами, чтобы ребёнок слышал разницу.
 */
@Composable
fun RuleScreen(
    rule: Rule,
    learned: Boolean,
    narrator: Narrator,
    onToggleLearned: () -> Unit,
    onBack: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    // Пока открывается паспорт, обе дорожки уже декодируются: к нажатию
    // «Послушать» звук готов, и первый тап не пропадает.
    LaunchedEffect(rule.id) {
        narrator.prepare(rule.humanAudio)
        narrator.prepare(rule.textbookAudio)
    }
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp.scaled()),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Назад") }
            Text(
                "${rule.grade} класс · ${rule.branch}",
                style = MaterialTheme.typography.labelMedium,
                color = scheme.onSurfaceVariant,
            )
        }
        SpacerGap(4)
        Text(rule.title, style = MaterialTheme.typography.headlineSmall)
        SpacerGap()

        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = scheme.primaryContainer),
        ) {
            Column(Modifier.padding(16.dp.scaled())) {
                Text("По-человечески", style = MaterialTheme.typography.labelMedium)
                SpacerGap(4)
                Text(rule.human, style = MaterialTheme.typography.bodyLarge)
                SpacerGap()
                FilledTonalButton(
                    onClick = { narrator.play(rule.humanAudio) },
                    modifier = Modifier.height(48.dp),
                ) {
                    Icon(Icons.Filled.PlayArrow, null)
                    Text("  Послушать")
                }
            }
        }

        SpacerGap()
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = scheme.surfaceVariant),
        ) {
            Column(Modifier.padding(16.dp.scaled())) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.MenuBook, null, tint = scheme.onSurfaceVariant)
                    Text(
                        "  Как в учебнике",
                        style = MaterialTheme.typography.labelMedium,
                        color = scheme.onSurfaceVariant,
                    )
                }
                SpacerGap(4)
                Text(rule.textbook, style = MaterialTheme.typography.bodyMedium)
                SpacerGap()
                FilledTonalButton(
                    onClick = { narrator.play(rule.textbookAudio) },
                    modifier = Modifier.height(44.dp),
                ) {
                    Icon(Icons.Filled.PlayArrow, null)
                    Text("  Послушать формулировку")
                }
            }
        }

        if (rule.examples.isNotEmpty()) {
            SpacerGap()
            Text("Живые примеры", style = MaterialTheme.typography.titleMedium)
            rule.examples.forEach {
                SpacerGap(6)
                Text("— $it", style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (rule.wrongText.isNotBlank()) {
            SpacerGap()
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = scheme.errorContainer),
            ) {
                Column(Modifier.padding(16.dp.scaled())) {
                    Text("Так нельзя", style = MaterialTheme.typography.labelMedium)
                    SpacerGap(4)
                    Text(rule.wrongText, style = MaterialTheme.typography.bodyLarge)
                    SpacerGap(4)
                    Text(
                        rule.wrongWhy,
                        style = MaterialTheme.typography.bodyMedium,
                        color = scheme.onErrorContainer,
                    )
                }
            }
        }

        if (rule.errors.isNotEmpty()) {
            SpacerGap()
            Text("Типичные ошибки", style = MaterialTheme.typography.titleMedium)
            rule.errors.forEach {
                SpacerGap(6)
                Text("• $it", style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (rule.links.isNotEmpty()) {
            SpacerGap()
            Text("Выросло из", style = MaterialTheme.typography.titleMedium)
            rule.links.forEach {
                SpacerGap(6)
                Text("↑ $it", style = MaterialTheme.typography.bodyMedium)
            }
        }

        SpacerGap(16)
        Button(
            onClick = onToggleLearned,
            enabled = !learned,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            if (learned) {
                Icon(Icons.Filled.CheckCircle, null)
                Text("Листик вырос", style = MaterialTheme.typography.titleMedium)
            } else {
                Text("Я понял — вырастить листик", style = MaterialTheme.typography.titleMedium)
            }
        }
        SpacerGap(12)
    }
}