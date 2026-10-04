package ru.drevo.yazyka.io

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

/**
 * Файловый обмен прогрессом. Пользователь сам выбирает место через
 * системный диалог — приложение не пишет в чужие папки и не знает,
 * куда уйдёт файл.
 */
object ProgressFile {

    fun write(context: Context, uri: Uri, json: String): Boolean = runCatching {
        val stream = context.contentResolver.openOutputStream(uri) ?: return false
        stream.use { out ->
            out.write(json.toByteArray(Charsets.UTF_8))
            out.flush()
        }
        true
    }.getOrDefault(false)

    fun read(context: Context, uri: Uri): String? = runCatching {
        val stream = context.contentResolver.openInputStream(uri) ?: return null
        stream.use { input -> input.readBytes().toString(Charsets.UTF_8) }
    }.getOrNull()

    /**
     * Копия файла во внутреннем кэше и Intent для отправки. Кэш нужен,
     * потому что наружу отдаётся только Uri от своего FileProvider:
     * так файл читает приложение-получатель, а не наш процесс.
     */
    fun shareIntent(context: Context, name: String, json: String): Intent? = runCatching {
        val dir = File(context.cacheDir, "export").apply { mkdirs() }
        val file = File(dir, name)
        file.writeText(json, Charsets.UTF_8)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        Intent(Intent.ACTION_SEND).apply {
            type = "application/json"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, "Моё дерево — Древо языка")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
    }.getOrNull()
}
