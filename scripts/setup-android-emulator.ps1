# Android Emulator Setup Script for Maestro E2E Tests
# This script helps set up Android SDK and emulator for running Maestro tests

Write-Host "=== ANDROID EMULATOR SETUP FOR MAESTRO ===" -ForegroundColor Green
Write-Host ""

# Check if Android SDK is installed
$sdkPath = $null
$possiblePaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:ANDROID_HOME",
    "$env:ANDROID_SDK_ROOT",
    "C:\Android\Sdk"
)

foreach ($path in $possiblePaths) {
    if ($path -and (Test-Path $path)) {
        $sdkPath = $path
        Write-Host "✅ Android SDK found: $sdkPath" -ForegroundColor Green
        break
    }
}

if (-not $sdkPath) {
    Write-Host "❌ Android SDK not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install one of the following:" -ForegroundColor Yellow
    Write-Host "  1. Android Studio (recommended): https://developer.android.com/studio" -ForegroundColor Cyan
    Write-Host "  2. Command Line Tools: https://developer.android.com/studio#command-tools" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installation, set ANDROID_HOME environment variable:" -ForegroundColor Yellow
    Write-Host "  ANDROID_HOME=C:\Users\$env:USERNAME\AppData\Local\Android\Sdk" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Add SDK tools to PATH
$platformTools = Join-Path $sdkPath "platform-tools"
$emulatorPath = Join-Path $sdkPath "emulator"
$toolsPath = Join-Path $sdkPath "tools"
$toolsBinPath = Join-Path $sdkPath "tools\bin"

if (Test-Path $platformTools) {
    $env:Path += ";$platformTools"
    Write-Host "✅ Added platform-tools to PATH" -ForegroundColor Green
}

if (Test-Path $emulatorPath) {
    $env:Path += ";$emulatorPath"
    Write-Host "✅ Added emulator to PATH" -ForegroundColor Green
}

# Check if ADB is available
if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Host "✅ ADB is available" -ForegroundColor Green
    Write-Host "   Version: $(adb version | Select-Object -First 1)" -ForegroundColor Gray
} else {
    Write-Host "❌ ADB not found in PATH" -ForegroundColor Red
    exit 1
}

# Check if emulator is available
if (Get-Command emulator -ErrorAction SilentlyContinue) {
    Write-Host "✅ Emulator is available" -ForegroundColor Green
} else {
    Write-Host "❌ Emulator not found" -ForegroundColor Red
    Write-Host "   Make sure Android Emulator is installed via Android Studio SDK Manager" -ForegroundColor Yellow
    exit 1
}

# List available AVDs (Android Virtual Devices)
Write-Host ""
Write-Host "=== AVAILABLE ANDROID VIRTUAL DEVICES ===" -ForegroundColor Cyan
$avdManager = Join-Path $toolsBinPath "avdmanager.bat"
if (Test-Path $avdManager) {
    & $avdManager list avd
} else {
    Write-Host "⚠️  AVD Manager not found. Listing devices via emulator:" -ForegroundColor Yellow
    $emulator = Join-Path $emulatorPath "emulator.exe"
    if (Test-Path $emulator) {
        & $emulator -list-avds
    }
}

# Check connected devices
Write-Host ""
Write-Host "=== CONNECTED DEVICES ===" -ForegroundColor Cyan
adb devices

Write-Host ""
Write-Host "=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. If no AVD exists, create one via Android Studio:" -ForegroundColor Yellow
Write-Host "   - Open Android Studio" -ForegroundColor Gray
Write-Host "   - Tools > Device Manager" -ForegroundColor Gray
Write-Host "   - Create Device > Choose a device > Download system image" -ForegroundColor Gray
Write-Host "   - Finish setup" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start an emulator:" -ForegroundColor Yellow
Write-Host "   - Via Android Studio: Device Manager > Play button" -ForegroundColor Gray
Write-Host "   - Or via command line: emulator -avd <AVD_NAME>" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verify device is connected:" -ForegroundColor Yellow
Write-Host "   adb devices" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Run Maestro tests:" -ForegroundColor Yellow
Write-Host "   npm run maestro:test" -ForegroundColor Gray
Write-Host ""
