package ru.drevo.yazyka.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrightnessAuto
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilledTonalIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import ru.drevo.yazyka.data.Progress
import ru.drevo.yazyka.data.Rule
import ru.drevo.yazyka.data.Rules
import ru.drevo.yazyka.data.THEME_DARK
import ru.drevo.yazyka.data.THEME_LIGHT
import ru.drevo.yazyka.data.themeLabel
import ru.drevo.yazyka.ui.theme.scaled
import kotlin.math.atan2

/**
 * Личное дерево: три ветви — классы, листья — правила.
 *
 * Рисуется на Canvas, а не картинкой: листья раскладываются по кривым Безье,
 * поэтому при любом размере экрана дерево остаётся пропорциональным, а
 * «собранные» листья меняют вид мгновенно — без перерисовки ресурсов.
 *
 * Лист нажимается: геометрия листьев считается функцией layoutLeaves и
 * используется дважды — для рисования и для проверки попадания тапа,
 * поэтому картинка и «живая» область не могут разойтись.
 */
@Composable
fun TreeScreen(
    state: Progress.State,
    onSetGrade: (Int) -> Unit,
    onOpenRule: (String) -> Unit,
    onCycleTheme: () -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    // Прокрутка — страховка: при крупном шрифте настройки телефона нижняя
    // кнопка иначе схлопывается в полоску у нижней панели.
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp.scaled()),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(
                    "Русский язык растёт вместе с тобой",
                    style = MaterialTheme.typography.headlineSmall,
                )
                Text(
                    "Каждое правило — листик на твоём дереве.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = scheme.onSurfaceVariant,
                )
            }
            // Только значок: подпись режима занимала целую строку, из-за чего
            // заголовок переносился на три строки, а главная кнопка уходила
            // за край экрана и схлопывалась в полоску.
            FilledTonalIconButton(
                onClick = onCycleTheme,
                modifier = Modifier
                    .padding(start = 8.dp)
                    .size(48.dp),
            ) {
                Icon(
                    when (state.theme) {
                        THEME_DARK -> Icons.Filled.DarkMode
                        THEME_LIGHT -> Icons.Filled.LightMode
                        else -> Icons.Filled.BrightnessAuto
                    },
                    contentDescription = "Тема: ${themeLabel(state.theme)}",
                )
            }
        }

        SpacerGap(14)

        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = scheme.surface),
        ) {
            Column(Modifier.padding(16.dp.scaled())) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "Моё дерево",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "выросло ${state.learned()} из ${state.total()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = scheme.secondary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                SpacerGap(6)
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    KnowledgeTree(
                        learnedIds = state.seen,
                        onLeafTap = onOpenRule,
                    )
                }
                SpacerGap(8)
                ProgressBar(
                    done = state.learned().toFloat(),
                    total = state.total().toFloat(),
                )
                SpacerGap(6)
                Text(
                    "Нажми на листик — откроется правило.",
                    style = MaterialTheme.typography.bodySmall,
                    color = scheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }

        SpacerGap(16)

        Text("С какого класса начнём?", style = MaterialTheme.typography.titleMedium)
        SpacerGap(8)
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(1, 2, 3).forEach { grade ->
                FilterChip(
                    selected = state.grade == grade,
                    onClick = { onSetGrade(grade) },
                    label = { Text("$grade класс · ${state.learned(grade)}/${state.total(grade)}") },
                    modifier = Modifier.height(44.dp),
                )
            }
        }
        SpacerGap(14)

        Button(
            onClick = { nextRule(state)?.let { onOpenRule(it.id) } ?: onOpenRule(Rules.ALL.first().id) },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Text(
                nextRule(state)?.let { "Продолжить: ${it.title}" } ?: "Начать с правил",
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}

/** Первое невыученное правило выбранного класса (или любой класс, если класс не выбран). */
fun nextRule(state: Progress.State): Rule? =
    state.grade
        .takeIf { it > 0 }
        ?.let { g -> Rules.byGrade(g).firstOrNull { it.id !in state.seen } }
        ?: Rules.ALL.firstOrNull { it.id !in state.seen }

@Composable
fun ProgressBar(done: Float, total: Float) {
    val scheme = MaterialTheme.colorScheme
    val pct = if (total <= 0f) 0f else (done / total).coerceIn(0f, 1f)
    Box(
        Modifier
            .fillMaxWidth()
            .height(10.dp)
            .background(scheme.surfaceVariant, RoundedCornerShape(5.dp)),
    ) {
        if (pct > 0f) {
            Box(
                Modifier
                    .fillMaxWidth(pct)
                    .height(10.dp)
                    .background(
                        Brush.horizontalGradient(listOf(scheme.primary, scheme.primary.copy(alpha = 0.75f))),
                        RoundedCornerShape(5.dp),
                    ),
            )
        }
    }
}

/** Одна ветвь: четыре контрольные точки кривой Безье в долях холста. */
private data class Branch(val points: List<Offset>)

private val BRANCHES = listOf(
    1 to Branch(
        listOf(
            Offset(0.50f, 0.74f),
            Offset(0.36f, 0.68f),
            Offset(0.20f, 0.56f),
            Offset(0.09f, 0.30f),
        ),
    ),
    2 to Branch(
        listOf(
            Offset(0.50f, 0.72f),
            Offset(0.52f, 0.52f),
            Offset(0.48f, 0.30f),
            Offset(0.50f, 0.10f),
        ),
    ),
    3 to Branch(
        listOf(
            Offset(0.50f, 0.74f),
            Offset(0.66f, 0.68f),
            Offset(0.82f, 0.56f),
            Offset(0.92f, 0.32f),
        ),
    ),
)

/** Лист: где стоит, куда смотрит и какое правило открывает. */
private data class Leaf(val rule: Rule, val center: Offset, val angle: Float)

private fun cubic(p: List<Offset>, t: Float): Offset {
    val u = 1 - t
    return Offset(
        u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
        u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
    )
}

private fun cubicTangent(p: List<Offset>, t: Float): Float {
    val a = cubic(p, (t - 0.03f).coerceAtLeast(0f))
    val b = cubic(p, (t + 0.03f).coerceAtMost(1f))
    return atan2(b.y - a.y, b.x - a.x)
}

/**
 * Ветвь переменной толщины: широкая у ствола, тонкая у кончика.
 * Одним штрихом одинаковой ширины дерево выглядит как верёвка, поэтому
 * толщину считаем по обе стороны кривой и склеиваем в заливку.
 */
private fun taperedBranch(p: List<Offset>, w0: Float, w1: Float, steps: Int = 24): Path {
    val left = ArrayList<Offset>(steps + 1)
    val right = ArrayList<Offset>(steps + 1)
    for (i in 0..steps) {
        val t = i / steps.toFloat()
        val c = cubic(p, t)
        val dir = cubicTangent(p, t)
        val nx = -kotlin.math.sin(dir)
        val ny = kotlin.math.cos(dir)
        val half = (w0 + (w1 - w0) * t) / 2f
        left += Offset(c.x + nx * half, c.y + ny * half)
        right += Offset(c.x - nx * half, c.y - ny * half)
    }
    return Path().apply {
        moveTo(left[0].x, left[0].y)
        for (i in 1..steps) lineTo(left[i].x, left[i].y)
        for (i in steps downTo 0) lineTo(right[i].x, right[i].y)
        close()
    }
}

/**
 * Раскладка листьев по холсту заданного размера. Общая для рисования и
 * для проверки тапа, поэтому «область нажатия» не может разъехаться с
 * картинкой после смены ориентации или размера шрифта.
 *
 * Лист отодвинут от ветви по нормали: если рисовать его прямо на линии,
 * контур листа сливается с веткой и дерево выглядит голым.
 */
private fun layoutLeaves(size: Size, leafRadius: Float): List<Leaf> {
    val out = mutableListOf<Leaf>()
    BRANCHES.forEach { (grade, branch) ->
        val pts = branch.points.map { Offset(size.width * it.x, size.height * it.y) }
        val rules = Rules.byGrade(grade)
        rules.forEachIndexed { index, rule ->
            val t = if (rules.size == 1) 0.6f else 0.28f + (index / (rules.size - 1f)) * 0.64f
            val base = cubic(pts, t)
            val dir = cubicTangent(pts, t)
            val side = if (index % 2 == 0) 1f else -1f
            // Нормаль к касательной: (-sin, cos).
            val off = leafRadius * 1.15f
            out += Leaf(
                rule = rule,
                center = Offset(base.x - kotlin.math.sin(dir) * off * side, base.y + kotlin.math.cos(dir) * off * side),
                angle = dir + side * 0.45f,
            )
        }
    }
    return out
}

@Composable
fun KnowledgeTree(
    learnedIds: Set<String>,
    onLeafTap: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scheme = MaterialTheme.colorScheme
    val bark = lerp(scheme.surfaceVariant, scheme.secondary, 0.35f)
    val learnedFill = scheme.primary
    val planned = scheme.primary.copy(alpha = 0.45f)

    Canvas(
        modifier
            .fillMaxWidth()
            .height(220.dp.scaled())
            .padding(horizontal = 4.dp)
            .pointerInput(learnedIds) {
                // Палец детский, промах обязателен: берём щедрую зону вокруг листа.
                val radius = 16.dp.toPx()
                val hit = radius * 1.8f
                val canvas = Size(size.width.toFloat(), size.height.toFloat())
                detectTapGestures { tap ->
                    layoutLeaves(canvas, radius)
                        .minByOrNull { (it.center - tap).getDistance() }
                        ?.takeIf { (it.center - tap).getDistance() <= hit }
                        ?.let { onLeafTap(it.rule.id) }
                }
            },
    ) {
        val w = size.width
        val h = size.height
        fun at(fx: Float, fy: Float) = Offset(w * fx, h * fy)

        // земля
        drawOval(
            color = scheme.primary.copy(alpha = 0.10f),
            topLeft = Offset(w * 0.12f, h * 0.90f),
            size = Size(w * 0.76f, h * 0.07f),
        )

        // ствол
        val trunk = Path().apply {
            moveTo(w * 0.47f, h * 0.74f)
            lineTo(w * 0.44f, h * 0.93f)
            lineTo(w * 0.56f, h * 0.93f)
            lineTo(w * 0.53f, h * 0.74f)
            close()
        }
        drawPath(trunk, bark)
        drawLine(
            color = bark,
            start = at(0.50f, 0.76f),
            end = at(0.36f, 0.92f),
            strokeWidth = 7.dp.toPx(),
            cap = StrokeCap.Round,
        )
        drawLine(
            color = bark,
            start = at(0.50f, 0.78f),
            end = at(0.65f, 0.92f),
            strokeWidth = 7.dp.toPx(),
            cap = StrokeCap.Round,
        )

        // ветви
        BRANCHES.forEach { (_, branch) ->
            val pts = branch.points.map { at(it.x, it.y) }
            drawPath(taperedBranch(pts, 9.dp.toPx(), 4.dp.toPx()), bark)
        }

        // листья: собранные — сплошные, остальные — пунктирные
        val radius = 16.dp.toPx()
        layoutLeaves(size, radius).forEach { leaf ->
            val on = leaf.rule.id in learnedIds
            drawLeaf(
                center = leaf.center,
                angle = leaf.angle,
                radius = radius,
                fill = if (on) learnedFill else Color.Transparent,
                stroke = if (on) learnedFill else planned,
                strokeWidth = if (on) 0f else 2.dp.toPx(),
                dashed = !on,
            )
        }
    }
}

/**
 * Лист-«капелька»: две дуги и остриё, у выученного листа вдоль оси белая
 * жилка. Поворот делаем трансформацией холста, а не матрицей Android:
 * так угол остаётся в тех же градусах, что и касательная к ветви.
 */
private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawLeaf(
    center: Offset,
    angle: Float,
    radius: Float,
    fill: Color,
    stroke: Color,
    strokeWidth: Float,
    dashed: Boolean,
) {
    val path = Path().apply {
        moveTo(center.x - radius, center.y)
        cubicTo(
            center.x - radius * 0.4f, center.y - radius * 0.75f,
            center.x + radius * 0.5f, center.y - radius * 0.7f,
            center.x + radius, center.y,
        )
        cubicTo(
            center.x + radius * 0.5f, center.y + radius * 0.7f,
            center.x - radius * 0.4f, center.y + radius * 0.75f,
            center.x - radius, center.y,
        )
        close()
    }
    val vein = Path().apply {
        moveTo(center.x - radius * 0.8f, center.y)
        lineTo(center.x + radius * 0.8f, center.y)
    }

    rotate(Math.toDegrees(angle.toDouble()).toFloat(), center) {
        if (dashed) {
            drawPath(
                path,
                stroke,
                style = Stroke(
                    width = strokeWidth,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(7f, 7f)),
                ),
            )
        } else {
            drawPath(path, fill)
            drawPath(vein, Color.White.copy(alpha = 0.7f), style = Stroke(width = 1.2f))
        }
    }
}
