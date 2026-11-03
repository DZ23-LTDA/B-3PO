#!/usr/bin/env pwsh
# Build reproduzível da casca de marca B-3PO para Android, sem Gradle.
# Requer: ANDROID_HOME com build-tools e platforms; JDK 21 no PATH.
# Uso: pwsh build.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$sdk = $env:ANDROID_HOME
if (-not $sdk) { throw 'ANDROID_HOME nao definido' }

$bt = Get-ChildItem "$sdk\build-tools" -Directory | Sort-Object Name -Descending | Select-Object -First 1
$platform = Get-ChildItem "$sdk\platforms" -Directory | Where-Object { $_.Name -like 'android-*' } |
    Sort-Object Name -Descending | Select-Object -First 1
$androidJar = Join-Path $platform.FullName 'android.jar'
$build = Join-Path $root 'build'
$out = Join-Path $root 'dist'

Remove-Item $build, $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $build, $out | Out-Null

Write-Host "build-tools: $($bt.Name) | platform: $($platform.Name)"

& (Join-Path $bt.FullName 'aapt2.exe') compile --dir (Join-Path $root 'res') -o (Join-Path $build 'res.zip')
if ($LASTEXITCODE) { throw 'aapt2 compile falhou' }

& (Join-Path $bt.FullName 'aapt2.exe') link -o (Join-Path $build 'base.apk') `
    -I $androidJar --manifest (Join-Path $root 'AndroidManifest.xml') `
    (Join-Path $build 'res.zip') --auto-add-overlay --java (Join-Path $build 'gen')
if ($LASTEXITCODE) { throw 'aapt2 link falhou' }

$src = Join-Path $root 'src\com\dz23\b3po\shell\MainActivity.java'
$rjava = Join-Path $build 'gen\com\dz23\b3po\shell\R.java'
& javac --release 8 -encoding UTF-8 -classpath $androidJar -d (Join-Path $build 'classes') $src $rjava
if ($LASTEXITCODE) { throw 'javac falhou' }

& jar cf (Join-Path $build 'classes.jar') -C (Join-Path $build 'classes') .
New-Item -ItemType Directory -Force -Path (Join-Path $build 'dex') | Out-Null
& (Join-Path $bt.FullName 'd8.bat') --lib $androidJar --min-api 24 `
    --output (Join-Path $build 'dex') (Join-Path $build 'classes.jar')
if ($LASTEXITCODE) { throw 'd8 falhou' }

Push-Location (Join-Path $build 'dex')
& 7z a -y -tzip ..\base.apk classes.dex | Out-Null
Pop-Location
if ($LASTEXITCODE) { throw 'falha ao inserir classes.dex' }

& (Join-Path $bt.FullName 'zipalign.exe') -f 4 (Join-Path $build 'base.apk') (Join-Path $build 'aligned.apk')
if ($LASTEXITCODE) { throw 'zipalign falhou' }

$ks = Join-Path $root 'debug.keystore'
if (-not (Test-Path $ks)) {
    & keytool -genkeypair -v -keystore $ks -storepass android -keypass android `
        -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 `
        -dname 'CN=B-3PO Debug,O=DZ23,C=BR' | Out-Null
    if ($LASTEXITCODE) { throw 'keytool falhou' }
}

$apk = Join-Path $out 'b3po-android-shell-debug.apk'
& (Join-Path $bt.FullName 'apksigner.bat') sign --ks $ks --ks-pass pass:android --key-pass pass:android `
    --out $apk (Join-Path $build 'aligned.apk')
if ($LASTEXITCODE) { throw 'apksigner falhou' }

& (Join-Path $bt.FullName 'apksigner.bat') verify $apk
if ($LASTEXITCODE) { throw 'verificacao de assinatura falhou' }

Write-Host "APK: $apk"
Get-FileHash $apk -Algorithm SHA256 | Select-Object Hash, Path
