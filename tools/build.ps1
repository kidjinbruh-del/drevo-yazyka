<#
    Сборка APK от данных до подписанного файла.

    Порядок важен: сначала данные превращаются в код и ресурсы, потом
    Gradle. Иначе можно получить APK, собранный из прошлой версии
    RULES.json, и не заметить этого — тесты на правила прошли бы тоже,
    ведь они собраны из того же файла.

        .\tools\build.ps1              # релизный APK + тесты
        .\tools\build.ps1 -Dev         # отладочный для стенда

    Требуется: node, JDK 21, Android SDK.
#>
[CmdletBinding()]
param(
  # Не называем -Debug: это имя параметра у самого PowerShell, оно занято.
  [switch]$Dev,
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$root = Split-Path -Parent $PSScriptRoot
$android = Join-Path $root 'android'

# Gradle пишет ход работы в stderr, и при ErrorActionPreference=Stop PowerShell
# считает это ошибкой. На время вызова снижаем строгость, а результат судим
# по коду возврата.
function Invoke-Gradle {
  param([string]$Task, [string]$Where)
  Push-Location $Where
  try {
    $saved = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      $out = & .\gradlew.bat $Task '--console=plain' 2>&1
      $code = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $saved
    }
    $out | Select-String -Pattern 'BUILD|^e: |FAILED'
    if ($code -ne 0) {
      Write-Host '--- последние строки вывода Gradle ---' -ForegroundColor Red
      $out | Select-Object -Last 12 | ForEach-Object { Write-Host $_ -ForegroundColor DarkRed }
      throw "Сборка не удалась: $Task (код $code)"
    }
  } finally { Pop-Location }
}

# Java нужна для Gradle. Берём из окружения, иначе ищем в известных местах:
# молчаливый фолбэк на "java не найдена" оборачивается невнятной ошибкой.
# Ищем именно JDK: на машине есть JRE-заглушка Oracle в общих файлах, Gradle
# с ней падает с "JAVA_HOME is set to an invalid directory", а не с понятным
# текстом. Признак JDK — наличие javac рядом с java.
function Resolve-Java {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\javac.exe'))) {
    return $env:JAVA_HOME
  }
  $cmd = Get-Command java -ErrorAction SilentlyContinue
  if ($cmd) {
    $home = Split-Path -Parent (Split-Path -Parent $cmd.Source)
    if (Test-Path (Join-Path $home 'bin\javac.exe')) { return $home }
  }
  $known = @(
    "$env:LOCALAPPDATA\Temp\opencode\jdk\jdk-21",
    'C:\Program Files\Android\Android Studio\jbr',
    'C:\Program Files\Java',
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
  )
  foreach ($k in $known) {
    if (Test-Path (Join-Path $k 'bin\javac.exe')) { return $k }
  }
  throw 'Не найден JDK (нужен javac, не только java). Задайте JAVA_HOME и повторите.'
}

# Python нужен для voice/gen-speech.py и проверки словарей.
function Resolve-Python {
  $cmd = Get-Command python -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $cmd = Get-Command py -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$env:JAVA_HOME = Resolve-Java
Write-Host "JDK: $env:JAVA_HOME" -ForegroundColor DarkGray

Write-Host '1/5 озвучка -> audio/ -> res/raw' -ForegroundColor Cyan
# Синтез кладёт дорожки в voice/samples/<голос>/, а единственный источник
# правды в репозитории — audio/. Без этого шага сборка молча берёт старые
# файлы: ровно так в 1.1.2 в APK попала озвучка, синтезированная до правок.
$samples = Join-Path $root 'voice\samples\ru-RU-SvetlanaNeural'
if (Test-Path $samples) {
  $fresh = @(Get-ChildItem $samples -Filter *.mp3)
  if ($fresh.Count -gt 0) {
    foreach ($f in $fresh) {
      Copy-Item $f.FullName (Join-Path $root ('audio\' + $f.Name)) -Force
    }
    Write-Host "  свежих дорожек из синтеза: $($fresh.Count)" -ForegroundColor DarkGray
  }
}
& (Join-Path $PSScriptRoot 'sync-audio.ps1')

Write-Host '2/5 тексты для веб-озвучки' -ForegroundColor Cyan
# js/speech.js нужен запасным путём в браузере: без него примеры читаются
# как есть, и «й-й-й» звучит как «и краткая».
$py = Resolve-Python
if ($py) {
  & $py (Join-Path $root 'voice\gen-speech.py')
  if ($LASTEXITCODE -ne 0) { throw 'gen-speech.py не отработал' }
} else {
  Write-Host '  Python не найден, js/speech.js оставлен как есть' -ForegroundColor Yellow
}

Write-Host '3/5 RULES.json -> Kotlin' -ForegroundColor Cyan
Push-Location $root
try { node (Join-Path $PSScriptRoot 'gen-rules-kotlin.js') } finally { Pop-Location }

if (-not $SkipTests) {
  Write-Host '4/5 тесты правил' -ForegroundColor Cyan
  Invoke-Gradle -Task ':app:test' -Where $android
} else {
  Write-Host '4/5 тесты правил — пропущены' -ForegroundColor DarkGray
}

Write-Host '5/5 сборка APK' -ForegroundColor Cyan
Invoke-Gradle -Task $(if ($Dev) { ':app:assembleDebug' } else { ':app:assembleRelease' }) -Where $android

$apk = if ($Dev) {
  Join-Path $android 'app\build\outputs\apk\debug\app-debug.apk'
} else {
  Join-Path $android 'app\build\outputs\apk\release\app-release.apk'
}
$info = Get-Item $apk
"APK:     $($info.FullName)"
"размер:  {0:N0} байт" -f $info.Length
"SHA-256: $((Get-FileHash $apk -Algorithm SHA256).Hash)"
