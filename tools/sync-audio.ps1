<#
    Переносит озвучку с сайта в ресурсы нативного приложения.

    Зачем отдельный скрипт: файлы лежат в audio/ с дефисами в именах
    (g1-sounds_human.mp3), а Android запрещает дефис в имени ресурса.
    Здесь же проверяется, что для каждого правила нашлись обе дорожки —
    иначе приложение умолчит при нажатии «Послушать», и это заметят
    только родители.
#>
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'audio'
$dst = Join-Path $root 'android\app\src\main\res\raw'

if (-not (Test-Path $src)) { throw "Нет папки с озвучкой: $src" }
New-Item -ItemType Directory -Force -Path $dst | Out-Null

# Старое имя могло остаться после смены правил — убираем, чтобы в APK
# не копились мёртвые килобайты.
Get-ChildItem $dst -Filter *.mp3 -ErrorAction SilentlyContinue |
    Where-Object { $_.BaseName -match '-' } |
    ForEach-Object { Remove-Item $_.FullName -Force }

$copied = 0
Get-ChildItem $src -Filter *.mp3 | ForEach-Object {
    $name = $_.BaseName -replace '-', '_'
    Copy-Item $_.FullName (Join-Path $dst "$name.mp3") -Force
    $copied++
}

# Правила знаем из RULES.json: ждём по две дорожки на каждое.
$json = [System.IO.File]::ReadAllText((Join-Path $root 'RULES.json'), [Text.Encoding]::UTF8) | ConvertFrom-Json
$missing = @()
foreach ($rule in $json.rules) {
    $id = $rule.id -replace '-', '_'
    foreach ($kind in 'human', 'textbook') {
        if (-not (Test-Path (Join-Path $dst "${id}_${kind}.mp3"))) {
            $missing += "${id}_${kind}"
        }
    }
}

"скопировано файлов: $copied"
if ($missing.Count -gt 0) {
    # Бросаем исключение, а не exit: вызывающий скрипт увидит ошибку сразу,
    # иначе сборка пойдёт дальше и соберёт APK без части озвучки.
    throw "НЕ ХВАТАЕТ дорожек: $($missing -join ', ')"
}
"все дорожки на месте ($($json.rules.Count) правил)"
