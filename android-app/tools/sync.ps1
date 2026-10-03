# device-lab -> обычный скрипт: копирует сайт в www и синхронизирует проект
# Запуск из папки android-app:  powershell -File tools\sync.ps1
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $PSScriptRoot
$site = Split-Path -Parent $app

$www = Join-Path $app 'www'
if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Force -Path $www | Out-Null

# Копируем всё, кроме служебного: android-app, .git, tests и README.
Get-ChildItem $site -Force | Where-Object {
    $_.Name -notin @('android-app', '.git', 'tests', 'tools', '.github', 'README.md', 'PROJECT-SPEC.md')
} | ForEach-Object {
    Copy-Item $_.FullName -Destination $www -Recurse -Force
}

Write-Host "www собран: $((Get-ChildItem $www -Recurse -File | Measure-Object).Count) файлов"
Push-Location $app
try {
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'cap sync не отработал' }
} finally {
    Pop-Location
}
Write-Host 'готово'