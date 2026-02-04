# Wait for Android Studio setup to complete and configure SDK
Write-Host "=== ANDROID SDK BEALLITASA A TELEPITES UTAN ===" -ForegroundColor Green
Write-Host ""

# Wait a bit for Android Studio to finish
Write-Host "Varok 10 masodpercet..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check default SDK location
$defaultSdk = "$env:LOCALAPPDATA\Android\Sdk"
$sdkFound = $false

if (Test-Path $defaultSdk) {
    Write-Host "✅ SDK talalhato az alapertelmezett helyen: $defaultSdk" -ForegroundColor Green
    $sdkFound = $true
} else {
    # Try to find in Android Studio config
    Write-Host "Keresem az SDK-t az Android Studio config-ban..." -ForegroundColor Yellow
    $configPath = "$env:APPDATA\Google\AndroidStudio*\options\other.xml"
    $configFiles = Get-ChildItem -Path $configPath -ErrorAction SilentlyContinue
    
    if ($configFiles) {
        foreach ($file in $configFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -and $content -match 'SDK_LOCATION.*value="([^"]+)"') {
                $defaultSdk = $matches[1]
                if (Test-Path $defaultSdk) {
                    Write-Host "✅ SDK talalhato: $defaultSdk" -ForegroundColor Green
                    $sdkFound = $true
                }
            }
        }
    }
}

if (-not $sdkFound) {
    Write-Host "❌ SDK meg nem talalhato" -ForegroundColor Red
    Write-Host ""
    Write-Host "Kovetkezo lepesek:" -ForegroundColor Yellow
    Write-Host "1. Varj, amig az Android Studio Setup befejezodik" -ForegroundColor Cyan
    Write-Host "2. Ellenorizd: File > Settings > Android SDK > Android SDK Location" -ForegroundColor Cyan
    Write-Host "3. Futtasd ujra ezt a scriptet" -ForegroundColor Cyan
    exit 1
}

# Set environment variables
$env:ANDROID_HOME = $defaultSdk
$env:ANDROID_SDK_ROOT = $defaultSdk

# Add to PATH
$platformTools = Join-Path $defaultSdk "platform-tools"
$emulator = Join-Path $defaultSdk "emulator"

if (Test-Path $platformTools) {
    if ($env:Path -notlike "*$platformTools*") {
        $env:Path += ";$platformTools"
        Write-Host "✅ platform-tools hozzaadva a PATH-hoz" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  platform-tools nem talalhato" -ForegroundColor Yellow
}

if (Test-Path $emulator) {
    if ($env:Path -notlike "*$emulator*") {
        $env:Path += ";$emulator"
        Write-Host "✅ emulator hozzaadva a PATH-hoz" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  emulator nem talalhato (meg lehet, hogy letoltodik)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== ELLENORZES ===" -ForegroundColor Cyan

if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "✅ ADB elerheto!" -ForegroundColor Green
    adb version | Select-Object -First 1
} else {
    Write-Host "⚠️  ADB meg nem elerheto" -ForegroundColor Yellow
    Write-Host "   Lehet, hogy meg nem fejezodott be a telepites" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== KOVETKEZO LEPESEK ===" -ForegroundColor Green
Write-Host "1. Varj, amig az Android Studio Setup teljesen befejezodik" -ForegroundColor Yellow
Write-Host "2. Hozz letre egy AVD-t: Device Manager > Create Device" -ForegroundColor Yellow
Write-Host "3. Inditsd el az emulatort" -ForegroundColor Yellow
Write-Host "4. Futtasd: .\scripts\find-android-sdk.ps1" -ForegroundColor Yellow
Write-Host ""
