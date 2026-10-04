package ru.drevo.yazyka.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.drevo.yazyka.data.Progress
import ru.drevo.yazyka.data.Rules
import ru.drevo.yazyka.ui.theme.scaled

/** Список правил: по классу или по ветке, с отметкой «выучено». */
@Composable
fun RulesScreen(
    state: Progress.State,
    onOpenRule: (String) -> Unit,
) {
    var gradeFilter by remember { mutableStateOf(state.grade.takeIf { it > 0 } ?: 1) }
    var branchFilter by remember { mutableStateOf<String?>(null) }

    val rules = remember(gradeFilter, branchFilter) {
        Rules.byGrade(gradeFilter).let { list ->
            branchFilter?.let { b -> list.filter { it.branch == b } } ?: list
        }
    }
    val branches = remember(gradeFilter) { Rules.byGrade(gradeFilter).map { it.branch }.distinct() }

    Column(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp.scaled())) {
            Text("Все листья", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Правила по классам. Каждое пройденное правило вырастает листиком.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            SpacerGap()
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(1, 2, 3).forEach { g ->
                    FilterChip(
                        selected = gradeFilter == g,
                        onClick = { gradeFilter = g; branchFilter = null },
                        label = { Text("$g класс") },
                        modifier = Modifier.height(48.dp),
                    )
                }
            }
            SpacerGap()
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = branchFilter == null,
                    onClick = { branchFilter = null },
                    label = { Text("Все") },
                    modifier = Modifier.height(44.dp),
                )
                branches.forEach { b ->
                    FilterChip(
                        selected = branchFilter == b,
                        onClick = { branchFilter = if (branchFilter == b) null else b },
                        label = { Text(b) },
                        modifier = Modifier.height(44.dp),
                    )
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(start = 16.dp.scaled(), end = 16.dp.scaled(), bottom = 16.dp.scaled()),
            verticalArrangement = Arrangement.spacedBy(10.dp.scaled()),
        ) {
            items(rules, key = { it.id }) { rule ->
                val learned = rule.id in state.seen
                Card(
                    Modifier
                        .fillMaxWidth()
                        .clickable { onOpenRule(rule.id) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (learned) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surface
                        },
                    ),
                ) {
                    Column(Modifier.padding(16.dp.scaled())) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                rule.title,
                                style = MaterialTheme.typography.titleMedium,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                if (learned) "выучено" else "новое",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (learned) {
                                    MaterialTheme.colorScheme.primary
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                            )
                        }
                        Text(
                            rule.human,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 3,
                        )
                    }
                }
            }
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                ) {
                    Column(Modifier.padding(16.dp.scaled())) {
                        Text(
                            "Класс $gradeFilter: ${state.learned(gradeFilter)} из ${state.total(gradeFilter)}",
                            style = MaterialTheme.typography.titleSmall,
                        )
                        SpacerGap()
                        LinearProgressIndicator(
                            progress = {
                                val total = state.total(gradeFilter).coerceAtLeast(1)
                                state.learned(gradeFilter).toFloat() / total
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = MaterialTheme.colorScheme.background,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun SpacerGap(height: Int = 10) =
    androidx.compose.foundation.layout.Spacer(Modifier.height(height.dp.scaled()))