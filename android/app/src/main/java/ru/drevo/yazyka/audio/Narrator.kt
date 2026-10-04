package ru.drevo.yazyka.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.SoundPool
import android.util.Log
import ru.drevo.yazyka.data.Audio
import java.util.concurrent.ConcurrentHashMap

/**
 * Озвучка правил: mp3 лежат внутри приложения, сеть не нужна.
 *
 * SoundPool, а не MediaPlayer: объяснения короткие, их часто переключают
 * туда-сюда, и MediaPlayer на каждый раз открывал бы файл заново.
 *
 * Важная деталь: SoundPool.load возвращает идентификатор сразу, а сам файл
 * декодируется позже. Поэтому первый тап по «Послушать» не должен
 * проигрывать (файла ещё нет в памяти) — ждём готовности и запускаем
 * сами. Без этого кнопка молчала бы при первом нажатии на каждое правило.
 */
class Narrator(context: Context) {

    private val appContext = context.applicationContext
    private val pool = SoundPool.Builder()
        .setMaxStreams(3)
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .build(),
        )
        .build()

    /** Имя дорожки -> идентификатор в пуле. */
    private val samples = ConcurrentHashMap<String, Int>()

    /** Идентификатор в пуле -> имя дорожки, ждущей загрузки. */
    private val pending = ConcurrentHashMap<Int, String>()

    /** Что играет сейчас, чтобы выключить перед следующим. */
    private var current = 0

    init {
        pool.setOnLoadCompleteListener { _, sampleId, status ->
            val name = pending.remove(sampleId)
            when {
                status != 0 -> Log.w(TAG, "не загрузилась дорожка $name (код $status)")
                name != null -> {
                    // Запоминаем под идентификатором: со второго раза играем сразу.
                    samples[name] = sampleId
                    playSample(sampleId)
                }
            }
        }
    }

    /**
     * Готовит дорожку заранее: пока файл декодируется, ребёнок читает
     * заголовок, и к моменту нажатия звук уже есть.
     */
    fun prepare(name: String) {
        if (samples.containsKey(name)) return
        val resId = Audio.id(name) ?: run {
            Log.w(TAG, "нет ресурса для дорожки $name")
            return
        }
        pending[pool.load(appContext, resId, 1)] = name
    }

    /** Имя ресурса без расширения, например g1_sounds_human. */
    fun play(name: String, volume: Float = 1f): Boolean {
        samples[name]?.let {
            playSample(it, volume)
            return true
        }
        prepare(name)
        // Если файл уже грузится, его запустит обработчик загрузки.
        return pending.values.contains(name)
    }

    private fun playSample(sampleId: Int, volume: Float = 1f) {
        stop()
        current = pool.play(sampleId, volume, volume, 1, 0, 1f)
        if (current == 0) Log.w(TAG, "пул не отдал голос для дорожки $sampleId")
    }

    fun stop() {
        if (current != 0) {
            pool.stop(current)
            current = 0
        }
    }

    fun release() {
        stop()
        pool.release()
    }

    private companion object {
        const val TAG = "DrevoAudio"
    }
}
