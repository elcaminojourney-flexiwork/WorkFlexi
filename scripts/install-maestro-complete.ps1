# Maestro és Java automatikus telepítő script
# Futtasd PowerShell-ben admin jogokkal

Write-Host "🚀 Maestro és Java automatikus telepítés" -ForegroundColor Green
Write-Host ""

# 1. Java ellenőrzése
Write-Host "📋 1. lépés: Java ellenőrzése..." -ForegroundColor Yellow
$javaInstalled = $false
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    if ($javaVersion -match "version") {
        Write-Host "✅ Java már telepítve van: $javaVersion" -ForegroundColor Green
        $javaInstalled = $true
    }
} catch {
    Write-Host "❌ Java nincs telepítve" -ForegroundColor Red
}

# 2. Java telepítése (ha nincs)
if (-not $javaInstalled) {
    Write-Host "📦 2. lépés: Java telepítése..." -ForegroundColor Yellow
    
    # Próbáljuk meg winget-tel (Windows 10/11)
    $wingetAvailable = $false
    try {
        $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
        if ($wingetCheck) {
            $wingetAvailable = $true
            Write-Host "   Winget használata Java telepítéséhez..." -ForegroundColor Cyan
            winget install --id Microsoft.OpenJDK.17 --accept-package-agreements --accept-source-agreements --silent
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Java telepítve winget-tel" -ForegroundColor Green
                $javaInstalled = $true
            } else {
                Write-Host "   Winget telepítés nem sikerült, próbáljuk a Chocolatey-t..." -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "   Winget nem elérhető" -ForegroundColor Yellow
    }
    
    # Ha winget nem működött, próbáljuk Chocolatey-t
    if (-not $javaInstalled) {
        $chocoAvailable = $false
        try {
            $chocoCheck = Get-Command choco -ErrorAction SilentlyContinue
            if ($chocoCheck) {
                $chocoAvailable = $true
                Write-Host "   Chocolatey használata Java telepítéséhez..." -ForegroundColor Cyan
                choco install openjdk17 -y
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Java telepítve Chocolatey-vel" -ForegroundColor Green
                    $javaInstalled = $true
                }
            }
        } catch {
            Write-Host "   Chocolatey nem elérhető" -ForegroundColor Yellow
        }
    }
    
    # Ha egyik sem működött, manuális letöltés
    if (-not $javaInstalled) {
        Write-Host ""
        Write-Host "⚠️  Automatikus Java telepítés nem sikerült" -ForegroundColor Yellow
        Write-Host "   Kérlek, telepítsd manuálisan:" -ForegroundColor Yellow
        Write-Host "   1. Látogasd meg: https://adoptium.net/temurin/releases/" -ForegroundColor Cyan
        Write-Host "   2. Töltsd le a Java 17+ verziót Windows x64-re (MSI installer)" -ForegroundColor Cyan
        Write-Host "   3. Futtasd az MSI-t és telepítsd" -ForegroundColor Cyan
        Write-Host "   4. Indítsd újra a terminált" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   Utána futtasd újra ezt a scriptet!" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Vagy próbáld meg manuálisan winget-tel:" -ForegroundColor Yellow
        Write-Host "   winget install Microsoft.OpenJDK.17" -ForegroundColor Cyan
        exit 1
    }
    
    # PATH frissítése
    Write-Host "🔄 PATH frissítése..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    # Várjunk egy kicsit, hogy a telepítés befejeződjön
    Start-Sleep -Seconds 3
}

# 3. Java verzió ellenőrzése (újra)
Write-Host ""
Write-Host "🔍 Java verzió ellenőrzése..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java verzió: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Java még mindig nem elérhető." -ForegroundColor Red
    Write-Host "   Kérlek, indítsd újra a terminált és próbáld újra!" -ForegroundColor Yellow
    Write-Host "   Vagy telepítsd manuálisan: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# 4. Maestro telepítése
Write-Host ""
Write-Host "📦 3. lépés: Maestro telepítése..." -ForegroundColor Yellow

# Próbáljuk meg winget-tel először
$maestroInstalled = $false
try {
    $wingetCheck = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCheck) {
        Write-Host "   Winget használata Maestro telepítéséhez..." -ForegroundColor Cyan
        winget install --id MobileDevInc.Maestro --accept-package-agreements --accept-source-agreements --silent
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Maestro telepítve winget-tel" -ForegroundColor Green
            $maestroInstalled = $true
        }
    }
} catch {
    Write-Host "   Winget nem elérhető Maestro-hoz" -ForegroundColor Yellow
}

# Ha winget nem működött, próbáljuk a hivatalos telepítőt
if (-not $maestroInstalled) {
    Write-Host "   Hivatalos telepítő próbálása..." -ForegroundColor Cyan
    try {
        # Próbáljuk meg a redirect-et követni
        $installScript = Invoke-WebRequest -Uri "https://get.maestro.mobile.dev" -MaximumRedirection 10 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($installScript -and $installScript.StatusCode -eq 200) {
            Write-Host "   Maestro telepítő script futtatása..." -ForegroundColor Cyan
            Invoke-Expression ($installScript.Content)
            Start-Sleep -Seconds 2
            $maestroInstalled = $true
        }
    } catch {
        Write-Host "   Hivatalos telepítő nem elérhető" -ForegroundColor Yellow
    }
}

# PATH frissítése
Write-Host "🔄 PATH frissítése..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Várjunk egy kicsit
Start-Sleep -Seconds 2

# 5. Végleges ellenőrzés
Write-Host ""
Write-Host "✅ 4. lépés: Végleges ellenőrzés..." -ForegroundColor Yellow
Write-Host ""

# Java ellenőrzés
$javaOk = $false
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    if ($javaVersion -match "version") {
        Write-Host "✅ Java: $javaVersion" -ForegroundColor Green
        $javaOk = $true
    }
} catch {
    Write-Host "❌ Java nem elérhető" -ForegroundColor Red
}

# Maestro ellenőrzés
$maestroOk = $false
try {
    $maestroVersion = maestro --version 2>&1
    if ($LASTEXITCODE -eq 0 -and $maestroVersion) {
        Write-Host "✅ Maestro: $maestroVersion" -ForegroundColor Green
        $maestroOk = $true
    } else {
        Write-Host "❌ Maestro nem elérhető (verzió ellenőrzés sikertelen)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Maestro nem elérhető" -ForegroundColor Red
}

Write-Host ""

if ($javaOk -and $maestroOk) {
    Write-Host "🎉 Sikeres telepítés! Minden működik!" -ForegroundColor Green
} elseif ($javaOk -and -not $maestroOk) {
    Write-Host "⚠️  Java telepítve, de Maestro nem elérhető" -ForegroundColor Yellow
    Write-Host "   Kérlek, indítsd újra a terminált és próbáld újra!" -ForegroundColor Yellow
    Write-Host "   Vagy telepítsd manuálisan: https://maestro.mobile.dev/getting-started/installing-maestro" -ForegroundColor Yellow
} elseif (-not $javaOk) {
    Write-Host "❌ Java telepítés nem sikerült" -ForegroundColor Red
    Write-Host "   Kérlek, telepítsd manuálisan: https://adoptium.net/" -ForegroundColor Yellow
} else {
    Write-Host "❌ Telepítés nem teljes" -ForegroundColor Red
    Write-Host "   Kérlek, indítsd újra a terminált és próbáld újra!" -ForegroundColor Yellow
}

Write-Host ""
