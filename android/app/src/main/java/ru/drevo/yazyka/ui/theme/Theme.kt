package ru.drevo.yazyka.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.view.WindowCompat

/**
 * Оформление «лес вечером».
 *
 * Тёмная база — глубокий хвойный, листья — свежая зелень, янтарь отдан
 * под «урожай» (выученные правила, достижения). Светлая тема написана
 * отдельно, а не вывернута из тёмной: иначе зелёные подписи на белом
 * теряют контраст.
 *
 * Шрифт — только системный: приложение работает офлайн, Google Fonts
 * здесь был бы лишней сетью и мигающим экраном при первом запуске.
 */
private object Forest {
    val dark = darkColorScheme(
        primary = Color(0xFF46C98A),
        onPrimary = Color(0xFF052014),
        primaryContainer = Color(0xFF0C4A38),
        onPrimaryContainer = Color(0xFFA6F5D2),
        secondary = Color(0xFFF0B45C),
        onSecondary = Color(0xFF3A2606),
        secondaryContainer = Color(0xFF4A3313),
        onSecondaryContainer = Color(0xFFF7D9A4),
        tertiary = Color(0xFF6FB7D8),
        onTertiary = Color(0xFF06263A),
        error = Color(0xFFE8837B),
        onError = Color(0xFF450F0B),
        errorContainer = Color(0xFF5E211C),
        onErrorContainer = Color(0xFFFFDAD6),
        background = Color(0xFF0B1410),
        onBackground = Color(0xFFE8F3EC),
        surface = Color(0xFF142420),
        onSurface = Color(0xFFE8F3EC),
        surfaceVariant = Color(0xFF1B3129),
        onSurfaceVariant = Color(0xFF93B3A3),
        surfaceContainerLowest = Color(0xFF070F0C),
        surfaceContainerLow = Color(0xFF101C18),
        surfaceContainer = Color(0xFF142420),
        surfaceContainerHigh = Color(0xFF1B3129),
        surfaceContainerHighest = Color(0xFF234036),
        outline = Color(0xFF3D5A4D),
        outlineVariant = Color(0xFF1F3A31),
    )

    val light = lightColorScheme(
        primary = Color(0xFF1F9D63),
        onPrimary = Color.White,
        primaryContainer = Color(0xFFA8F0CB),
        onPrimaryContainer = Color(0xFF04240F),
        secondary = Color(0xFFB4761A),
        onSecondary = Color.White,
        secondaryContainer = Color(0xFFF7E3C4),
        onSecondaryContainer = Color(0xFF3A2606),
        tertiary = Color(0xFF2F7EA6),
        onTertiary = Color.White,
        error = Color(0xFFB3261E),
        onError = Color.White,
        errorContainer = Color(0xFFF9DEDC),
        onErrorContainer = Color(0xFF410E0B),
        background = Color(0xFFF2F7F2),
        onBackground = Color(0xFF10221A),
        surface = Color.White,
        onSurface = Color(0xFF10221A),
        surfaceVariant = Color(0xFFE4F0E6),
        onSurfaceVariant = Color(0xFF4D6D5D),
        surfaceContainerLowest = Color.White,
        surfaceContainerLow = Color(0xFFF4F9F4),
        surfaceContainer = Color(0xFFEDF5EE),
        surfaceContainerHigh = Color(0xFFE3EDE4),
        surfaceContainerHighest = Color(0xFFDCE7DD),
        outline = Color(0xFF8DA798),
        outlineVariant = Color(0xFFD2E3D6),
    )
}

private val AppTypography = Typography(
    headlineMedium = TextStyle(fontSize = 27.sp, lineHeight = 33.sp, fontWeight = FontWeight.SemiBold),
    headlineSmall = TextStyle(fontSize = 23.sp, lineHeight = 29.sp, fontWeight = FontWeight.SemiBold),
    titleLarge = TextStyle(fontSize = 20.sp, lineHeight = 26.sp, fontWeight = FontWeight.SemiBold),
    titleMedium = TextStyle(fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold),
    titleSmall = TextStyle(fontSize = 14.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
    bodyLarge = TextStyle(fontSize = 16.sp, lineHeight = 24.sp),
    bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 21.sp),
    bodySmall = TextStyle(fontSize = 12.5.sp, lineHeight = 18.sp),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium),
)

/** Множитель плотности: им пользуются отступы и размеры целей. */
val LocalDensity = staticCompositionLocalOf { 1.0f }

@Composable
fun Dp.scaled(): Dp = this * LocalDensity.current

@Composable
fun DrevoTheme(
    dark: Boolean = isSystemInDarkTheme(),
    density: Float = 1.0f,
    content: @Composable () -> Unit,
) {
    val colors = if (dark) Forest.dark else Forest.light
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            // Цвет полос не задаём: MainActivity включает edge-to-edge, полосы
            // прозрачные, и под ними виден фон Scaffold — он уже нужного цвета.
            // Остаётся переключить значки: на светлой теме они тёмные.
            val window = LocalContextActivity(view)?.window ?: return@SideEffect
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
        }
    }
    CompositionLocalProvider(LocalDensity provides density) {
        MaterialTheme(colorScheme = colors, typography = AppTypography, content = content)
    }
}

private fun LocalContextActivity(view: android.view.View): Activity? {
    var ctx = view.context
    while (ctx is android.content.ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}