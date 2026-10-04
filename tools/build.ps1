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
function Resolve-Java {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    return $env:JAVA_HOME
  }
  $cmd = Get-Command java -ErrorAction SilentlyContinue
  if ($cmd) {
    return (Split-Path -Parent (Split-Path -Parent $cmd.Source))
  }
  $known = @(
    'C:\Program Files\Android\Android Studio\jbr',
    'C:\Program Files\Java',
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
  )
  foreach ($k in $known) {
    if (Test-Path (Join-Path $k 'bin\java.exe')) { return $k }
  }
  throw 'Не найден JDK. Задайте JAVA_HOME и повторите.'
}

$env:JAVA_HOME = Resolve-Java
Write-Host "JDK: $env:JAVA_HOME" -ForegroundColor DarkGray

Write-Host '1/4 озвучка -> res/raw' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'sync-audio.ps1')

Write-Host '2/4 RULES.json -> Kotlin' -ForegroundColor Cyan
Push-Location $root
try { node (Join-Path $PSScriptRoot 'gen-rules-kotlin.js') } finally { Pop-Location }

if (-not $SkipTests) {
  Write-Host '3/4 тесты правил' -ForegroundColor Cyan
  Invoke-Gradle -Task ':app:test' -Where $android
} else {
  Write-Host '3/4 тесты правил — пропущены' -ForegroundColor DarkGray
}

Write-Host '4/4 сборка APK' -ForegroundColor Cyan
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
