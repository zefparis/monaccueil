@echo off
REM ============================================================
REM  MonAccueil - "Aide a distance" (lance par le raccourci Bureau)
REM  Lit l'outil choisi dans C:\MonAccueil\config.json puis lance :
REM    - quickassist : Assistance rapide de Windows
REM    - rustdesk    : RustDesk s'il est installe, sinon un message clair
REM  Le client initie et accepte toujours la connexion. Aucun acces cache.
REM ============================================================
setlocal
set "DOSSIER=C:\MonAccueil"
set "OUTIL=quickassist"

REM --- Lecture de l'outil dans config.json (PowerShell, sans dependance) ---
for /f "usebackq delims=" %%O in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c = Get-Content -Raw -Encoding UTF8 '%DOSSIER%\config.json' | ConvertFrom-Json; if ($c.aideDistance.outil) { $c.aideDistance.outil } else { 'quickassist' } } catch { 'quickassist' }"`) do set "OUTIL=%%O"

if /i "%OUTIL%"=="rustdesk" goto :rustdesk

:quickassist
REM Windows 10 : programme systeme. Windows 11 : application du Store (alias quickassist.exe).
if exist "%SystemRoot%\System32\quickassist.exe" (
  start "" "%SystemRoot%\System32\quickassist.exe"
  goto :fin
)
if exist "%LocalAppData%\Microsoft\WindowsApps\quickassist.exe" (
  start "" "%LocalAppData%\Microsoft\WindowsApps\quickassist.exe"
  goto :fin
)
REM Repli : protocole ms-quick-assist (ouvre l'application si elle est installee)
start "" "ms-quick-assist:" 2>nul
if not errorlevel 1 goto :fin
REM Dernier repli : page de l'Assistance rapide dans le Microsoft Store
call :message "L'Assistance rapide n'est pas installee. Le Microsoft Store va s'ouvrir : cliquez sur Installer, puis relancez Aide a distance."
start "" "ms-windows-store://pdp/?ProductId=9P7BP5VNWKX5"
goto :fin

:rustdesk
set "RD=%ProgramFiles%\RustDesk\rustdesk.exe"
if not exist "%RD%" set "RD=%ProgramFiles(x86)%\RustDesk\rustdesk.exe"
if not exist "%RD%" set "RD=%LocalAppData%\rustdesk\rustdesk.exe"
if exist "%RD%" (
  start "" "%RD%"
  goto :fin
)
call :message "RustDesk n'est pas installe sur cet ordinateur. Appelez votre technicien : il l'installera avec vous (fichier installer-rustdesk.bat dans C:\MonAccueil)."
goto :fin

:message
REM Affiche un message en grande fenetre (le client ne lit pas une console noire)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Add-Type -AssemblyName PresentationFramework; [void][System.Windows.MessageBox]::Show('%~1', 'Aide a distance', 'OK', 'Information')"
exit /b 0

:fin
endlocal
