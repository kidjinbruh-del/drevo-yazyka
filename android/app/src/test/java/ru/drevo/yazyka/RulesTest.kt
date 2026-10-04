package ru.drevo.yazyka

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import ru.drevo.yazyka.data.Audio
import ru.drevo.yazyka.data.Quiz
import ru.drevo.yazyka.data.Rules

/**
 * Проверки целостности правил. Данные генерируются из RULES.json скриптом
 * tools/gen-rules-kotlin.js, поэтому тест ловит случай, когда генератор
 * отработал на неполных данных: пустые паспорта, задания без верного
 * ответа, ссылки на несуществующие правила.
 */
class RulesTest {

    @Test
    fun `всего 18 правил по трем классам`() {
        assertEquals(18, Rules.ALL.size)
        assertEquals(6, Rules.byGrade(1).size)
        assertEquals(5, Rules.byGrade(2).size)
        assertEquals(7, Rules.byGrade(3).size)
    }

    @Test
    fun `у каждого правила есть паспорт`() {
        Rules.ALL.forEach { rule ->
            assertTrue("${rule.id}: пустое название", rule.title.isNotBlank())
            assertTrue("${rule.id}: пустое объяснение", rule.human.length > 40)
            assertTrue("${rule.id}: нет учебниковой формулировки", rule.textbook.isNotBlank())
            assertTrue("${rule.id}: нет примеров", rule.examples.isNotEmpty())
        }
    }

    @Test
    fun `у каждого правила есть задание тренажера`() {
        Rules.ALL.forEach { rule ->
            assertTrue("${rule.id}: нет заданий", rule.quiz.isNotEmpty())
        }
    }

    @Test
    fun `в задании выбора ровно один верный ответ`() {
        Rules.ALL.flatMap { it.quiz }.filterIsInstance<Quiz.Choice>().forEach { q ->
            val correct = q.options.count { it.ok }
            assertEquals("«${q.question}»: верных вариантов $correct", 1, correct)
            assertTrue("«${q.question}»: мало вариантов", q.options.size >= 2)
            assertTrue("«${q.question}»: нет разбора", q.options.all { it.why.isNotBlank() })
        }
    }

    @Test
    fun `в задании клика индексы в пределах токенов`() {
        Rules.ALL.flatMap { it.quiz }.filterIsInstance<Quiz.Tap>().forEach { q ->
            assertTrue("«${q.question}»: пустое слово", q.tokens.isNotEmpty())
            q.steps.forEach { step ->
                assertTrue(
                    "«${q.question}»: индекс ${step.i} вне списка",
                    step.i in q.tokens.indices,
                )
            }
            assertTrue("«${q.question}»: нечего отмечать", q.steps.isNotEmpty())
        }
    }

    @Test
    fun `переводы ссылаются на существующие правила`() {
        assertTrue(Rules.TRANSLATIONS.isNotEmpty())
        Rules.TRANSLATIONS.forEach { tr ->
            assertNotNull("перевод без правила: ${tr.from}", Rules.byId(tr.ruleId))
        }
    }

    @Test
    fun `идентификаторы уникальны и ищутся`() {
        assertEquals(Rules.ALL.size, Rules.ALL.map { it.id }.toSet().size)
        Rules.ALL.forEach { assertNotNull(Rules.byId(it.id)) }
    }

    /**
     * Сборщик ресурсов выкидывает mp3, на которые нет прямой ссылки в коде.
     * Проверка ловит это на тестах, а не на телефоне: без неё приложение
     * собирается, молчит на кнопке «Послушать» и выглядит сломанным.
     */
    @Test
    fun `у каждого правила обе дорожки озвучки на месте`() {
        Rules.ALL.forEach { rule ->
            assertNotNull("${rule.id}: нет человеческой дорожки", Audio.id(rule.humanAudio))
            assertNotNull("${rule.id}: нет учебниковой дорожки", Audio.id(rule.textbookAudio))
        }
        assertEquals("ожидалось 2 дорожки на правило", Rules.ALL.size * 2, Audio.names.size)
    }
}