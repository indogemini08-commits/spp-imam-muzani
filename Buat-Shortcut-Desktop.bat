@echo off
title Buat Shortcut Desktop SPP Imam Muzani
cd /d "%~dp0"

echo ====================================================
echo   BUAT SHORTCUT DESKTOP APLIKASI SPP IMAM MUZANI
echo ====================================================
echo.

powershell -NoProfile -Command ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$shortcutPath = Join-Path $desktop 'Aplikasi SPP Imam Muzani.lnk';" ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$s = $ws.CreateShortcut($shortcutPath);" ^
    "$s.TargetPath = '%~dp0Buka-Aplikasi-SPP.bat';" ^
    "$s.WorkingDirectory = '%~dp0';" ^
    "$s.Description = 'Aplikasi Keuangan SPP Imam Muzani Boarding School';" ^
    "$s.Save();" ^
    "if (Test-Path $shortcutPath) { Write-Host '[SUKSES] Shortcut berhasil dibuat di Desktop Anda!' -ForegroundColor Green; Write-Host ('Lokasi: ' + $shortcutPath); } else { Write-Host '[GAGAL] Tidak dapat membuat shortcut.' -ForegroundColor Red; }"

echo.
pause
exit
