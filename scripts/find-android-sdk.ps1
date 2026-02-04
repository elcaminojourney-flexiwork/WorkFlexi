# Find and Setup Android SDK
Write-Host "=== ANDROID SDK KERESESE ES BEALLITASA ===" -ForegroundColor Green
Write-Host ""

# Common SDK locations
$searchPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT",
    "C:\Android\Sdk",
    "C:\Program Files\Android\Sdk",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk",
    "C:\Users\$env:USERNAME\AppData\Local\Android\android-sdk"
)

$foundSdk = $null

foreach ($path in $searchPaths) {
    if ($path -and (Test-Path $path)) {
        $platformTools = Join-Path $path "platform-tools"
        if (Test-Path $platformTools) {
            $foundSdk = $path
            Write-Host "✅ Android SDK talalhato: $path" -ForegroundColor Green
            break
        }
    }
}

if (-not $foundSdk) {
    Write-Host "❌ Android SDK nem talalhato az automatikus helyeken." -ForegroundColor Red
    Write-Host ""
    Write-Host "Kovetkezo lepesek:" -ForegroundColor Yellow
    Write-Host "1. Inditsd el az Android Studio-t" -ForegroundColor Cyan
    Write-Host "2. Menj a: File > Settings > Appearance & Behavior > System Settings > Android SDK" -ForegroundColor Cyan
    Write-Host "3. Nezd meg az 'Android SDK Location' erteket" -ForegroundColor Cyan
    Write-Host "4. Futtasd ezt a parancsot (csereld ki az SDK_LOCATION-t):" -ForegroundColor Cyan
    Write-Host "   `$env:ANDROID_HOME = 'SDK_LOCATION'" -ForegroundColor Gray
    Write-Host "   `$env:Path += ';`$env:ANDROID_HOME\platform-tools;`$env:ANDROID_HOME\emulator'" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Set environment variables for current session
$env:ANDROID_HOME = $foundSdk
$env:ANDROID_SDK_ROOT = $foundSdk

# Add to PATH
$platformTools = Join-Path $foundSdk "platform-tools"
$emulator = Join-Path $foundSdk "emulator"

if (Test-Path $platformTools) {
    if ($env:Path -notlike "*$platformTools*") {
        $env:Path += ";$platformTools"
        Write-Host "✅ platform-tools hozzaadva a PATH-hoz" -ForegroundColor Green
    }
}

if (Test-Path $emulator) {
    if ($env:Path -notlike "*$emulator*") {
        $env:Path += ";$emulator"
        Write-Host "✅ emulator hozzaadva a PATH-hoz" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== ELLENORZES ===" -ForegroundColor Cyan

if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "✅ ADB elerheto!" -ForegroundColor Green
    adb version | Select-Object -First 1
} else {
    Write-Host "❌ ADB meg mindig nem elerheto" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== CSATLAKOZOTT ESZKOZOK ===" -ForegroundColor Cyan
if (Get-Command adb -ErrorAction SilentlyContinue) {
    adb devices
} else {
    Write-Host "ADB nem elerheto, nem lehet ellenorizni az eszkozoket" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== AVD LISTA ===" -ForegroundColor Cyan
$emulatorExe = Join-Path $emulator "emulator.exe"
if (Test-Path $emulatorExe) {
    & $emulatorExe -list-avds
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Nincs AVD letrehozva. Hozz letre egyet az Android Studio Device Manager-ben." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Emulator nem talalhato" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== KOVETKEZO LEPESEK ===" -ForegroundColor Green
Write-Host "1. Ha nincs AVD, hozz letre egyet: Android Studio > Device Manager > Create Device" -ForegroundColor Yellow
Write-Host "2. Inditsd el az emulatort: Android Studio > Device Manager > Play gomb" -ForegroundColor Yellow
Write-Host "3. Ellenorizd: adb devices (kell lennie egy 'device' sor)" -ForegroundColor Yellow
Write-Host "4. Futtasd a Maestro teszteket: npm run maestro:test" -ForegroundColor Yellow
Write-Host ""
