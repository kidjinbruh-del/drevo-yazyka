package ru.drevo.yazyka.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import ru.drevo.yazyka.audio.Narrator
import ru.drevo.yazyka.data.DrevoProgress
import ru.drevo.yazyka.data.THEME_DARK
import ru.drevo.yazyka.data.THEME_LIGHT
import ru.drevo.yazyka.data.Rules
import ru.drevo.yazyka.ui.theme.DrevoTheme

private enum class Tab(val title: String, val icon: ImageVector) {
    TREE("Дерево", Icons.Filled.Home),
    RULES("Правила", Icons.Filled.MenuBook),
    TRAINER("Тренажёр", Icons.Filled.Edit),
    PARENT("Родителям", Icons.Filled.Insights),
}

@Composable
fun App() {
    val context = LocalContext.current
    val progress = remember { DrevoProgress.get(context) }
    val narrator = remember { Narrator(context) }
    val state by progress.state.collectAsState()

    // Тема переключается по кругу прямо в дереве: ночью ребёнку нужен
    // тёмный экран, родителю при проверке — светлый, и лезть в настройки
    // телефона не хочется.
    val dark = when (state.theme) {
        THEME_DARK -> true
        THEME_LIGHT -> false
        else -> isSystemInDarkTheme()
    }

    DrevoTheme(dark = dark) {
        var tab by remember { mutableStateOf(Tab.TREE) }
        var openRule by remember { mutableStateOf<String?>(null) }

        // Системная «назад» на паспорте правила возвращает к списку,
        // а не выбрасывает из приложения.
        BackHandler(enabled = openRule != null) { openRule = null }

        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                // На паспорте правила панель вкладок лишняя: ребёнок читает,
                // а не выбирает, куда идти дальше.
                if (openRule == null) {
                    NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                        Tab.entries.forEach { entry ->
                            NavigationBarItem(
                                selected = tab == entry,
                                onClick = { tab = entry; openRule = null },
                                icon = { Icon(entry.icon, entry.title) },
                                // На 480 px подписи вкладок переносились по
                                // слогам («Правил а»). Одна строка с троеточием
                                // выглядит опрятнее, чем рваная.
                                label = {
                                    Text(
                                        entry.title,
                                        maxLines = 1,
                                        softWrap = false,
                                        overflow = TextOverflow.Ellipsis,
                                        style = MaterialTheme.typography.labelMedium,
                                    )
                                },
                            )
                        }
                    }
                }
            },
        ) { padding ->
            Box(
                Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(padding),
            ) {
                val current = openRule?.let { id ->
                    Rules.byId(id)
                }
                when {
                    current != null -> RuleScreen(
                        rule = current,
                        learned = current.id in state.seen,
                        narrator = narrator,
                        onToggleLearned = { progress.markLearned(current.id) },
                        onBack = { openRule = null },
                    )

                    else -> when (tab) {
                        Tab.TREE -> TreeScreen(
                            state = state,
                            onSetGrade = progress::setGrade,
                            onOpenRule = { openRule = it },
                            onCycleTheme = { progress.setTheme(state.nextTheme()) },
                        )

                        Tab.RULES -> RulesScreen(
                            state = state,
                            onOpenRule = { openRule = it },
                        )

                        Tab.TRAINER -> TrainerScreen(
                            state = state,
                            narrator = narrator,
                            onMarkLearned = progress::markLearned,
                            onScore = progress::recordQuiz,
                        )

                        Tab.PARENT -> ParentScreen(
                            progress = progress,
                            state = state,
                        )
                    }
                }
            }
        }
    }
}