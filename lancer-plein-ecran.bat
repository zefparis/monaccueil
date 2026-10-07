@echo off
REM ============================================================
REM  MonAccueil - ouverture en mode application plein ecran
REM  Cherche Microsoft Edge puis Google Chrome. A defaut, ouvre la
REM  page dans le navigateur par defaut.
REM ============================================================
setlocal
set "PAGE=file:///C:/MonAccueil/index.html"
set "OPTS=--app=%PAGE% --start-fullscreen --no-first-run --no-default-browser-check"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" %OPTS%
  goto :fin
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" %OPTS%
  goto :fin
)

REM Ni Edge ni Chrome : navigateur par defaut (sans plein ecran)
start "" "C:\MonAccueil\index.html"

:fin
endlocal
