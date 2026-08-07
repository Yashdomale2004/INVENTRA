Write-Host "Starting INVENTRA clients..."

Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "..\frontend"; npm run dev'
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "..\mobile"; npm run start'
