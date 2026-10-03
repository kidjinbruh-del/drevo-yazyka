# gen-audio.ps1 -- "bridge" voices human+textbook with local SAPI voice (e.g., Microsoft Irina).
# Note: ASCII-only on purpose (Windows PowerShell 5.1 reads .ps1 without BOM as ANSI).
# Fills audio/<key>.mp3 until real recordings (GPT-SoVITS / manual voice) replace them.
# Requires: ffmpeg in PATH. Run: powershell -File tools\gen-audio.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$audioDir = Join-Path $root "audio"
New-Item -ItemType Directory -Path $audioDir -Force | Out-Null

$texts = Get-Content (Join-Path $root "voice\texts.json") -Raw -Encoding UTF8 | ConvertFrom-Json

try { Add-Type -AssemblyName System.Speech } catch { Write-Error "No System.Speech (requires Windows)" }
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$irina = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*Irina*" }
if ($irina) { $synth.SelectVoice($irina.VoiceInfo.Name) } else { Write-Warning "Irina not found; using default voice" }
$synth.Rate = -1

$done = 0
foreach ($rule in $texts.rules) {
  foreach ($slot in $rule.slots) {
    if ($slot.key -like "*_ex*") { continue }
    $wav = Join-Path $env:TEMP ($slot.key + ".wav")
    $mp3 = Join-Path $audioDir ($slot.key + ".mp3")
    if (Test-Path $mp3) { continue }
    $synth.SetOutputToWaveFile($wav)
    $synth.Speak($slot.text)
    $synth.SetOutputToNull()
    & ffmpeg -y -loglevel error -i $wav -codec:a libmp3lame -q:a 5 -ar 44100 -ac 1 $mp3
    if ($LASTEXITCODE -ne 0) { Write-Warning ("ffmpeg failed for " + $slot.key); Remove-Item $wav -ErrorAction SilentlyContinue; continue }
    Remove-Item $wav -ErrorAction SilentlyContinue
    $done++
  }
}
$synth.Dispose()
Write-Output ("gen-audio: " + $done + " new files -> audio/")