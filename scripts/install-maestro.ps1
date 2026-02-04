# Maestro Installation Script for Windows
Write-Host "Installing Maestro..." -ForegroundColor Green

try {
    # Download and install Maestro
    irm https://get.maestro.mobile.dev | iex
    
    Write-Host "`n✅ Maestro installed successfully!" -ForegroundColor Green
    Write-Host "Run 'maestro --version' to verify installation" -ForegroundColor Yellow
} catch {
    Write-Host "`n❌ Error installing Maestro: $_" -ForegroundColor Red
    Write-Host "Please install manually from: https://maestro.mobile.dev/getting-started/installing-maestro" -ForegroundColor Yellow
    exit 1
}
