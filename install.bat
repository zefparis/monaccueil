@echo off
REM ============================================================
REM  MonAccueil - installation sur Windows 10 / 11
REM  1. Copie le dossier dans C:\MonAccueil
REM  2. Cree un raccourci "Mon Accueil" sur le Bureau
REM  3. Affiche comment definir la page d'accueil du navigateur
REM  (A lancer par un clic droit > "Executer en tant qu'administrateur"
REM   si C:\ est protege ; sinon un double-clic suffit.)
REM ============================================================
setlocal
set "SOURCE=%~dp0"
set "DEST=C:\MonAccueil"

echo.
echo ===== Installation de MonAccueil =====
echo.
echo Copie des fichiers vers %DEST% ...
if not exist "%DEST%" mkdir "%DEST%"
robocopy "%SOURCE%." "%DEST%" /E /NFL /NDL /NJH /NJS /NC /NS /NP /XD .git outils >nul
if %ERRORLEVEL% GEQ 8 (
  echo ERREUR : la copie a echoue. Verifiez les droits sur C:\ et relancez.
  pause
  exit /b 1
)
echo Copie terminee.

echo Creation du raccourci sur le Bureau ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d=[Environment]::GetFolderPath('Desktop');" ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Mon Accueil.lnk'));" ^
  "$s.TargetPath='%DEST%\lancer-plein-ecran.bat';" ^
  "$s.WorkingDirectory='%DEST%';" ^
  "$s.IconLocation='%DEST%\icons\mon-accueil.ico,0';" ^
  "$s.Description='Ouvrir Mon Accueil';" ^
  "$s.Save()"
if %ERRORLEVEL% NEQ 0 (
  echo ATTENTION : le raccourci n'a pas pu etre cree. Creez-le a la main vers %DEST%\lancer-plein-ecran.bat
) else (
  echo Raccourci "Mon Accueil" cree sur le Bureau.
)

echo Creation du raccourci "Aide a distance" sur le Bureau ...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d=[Environment]::GetFolderPath('Desktop');" ^
  "$n='Aide ' + [char]0xE0 + ' distance.lnk';" ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d $n));" ^
  "$s.TargetPath='%DEST%\aide-a-distance.bat';" ^
  "$s.WorkingDirectory='%DEST%';" ^
  "$s.IconLocation='%DEST%\icons\aide-distance.ico,0';" ^
  "$s.WindowStyle=7;" ^
  "$s.Description='Appelez votre technicien avant de double-cliquer ici';" ^
  "$s.Save()"
if %ERRORLEVEL% NEQ 0 (
  echo ATTENTION : le raccourci "Aide a distance" n'a pas pu etre cree. Creez-le a la main vers %DEST%\aide-a-distance.bat
) else (
  echo Raccourci "Aide a distance" cree sur le Bureau.
)

echo.
echo ===== Derniere etape : definir la page d'accueil du navigateur =====
echo.
echo Adresse a utiliser :   file:///C:/MonAccueil/index.html
echo.
echo  - Microsoft Edge : Parametres ^> Demarrer, Accueil et nouveaux onglets
echo       ^> "Ouvrir ces pages" ^> Ajouter une nouvelle page ^> coller l'adresse.
echo       Activez aussi le bouton Accueil et donnez-lui la meme adresse.
echo.
echo  - Google Chrome : Parametres ^> Au demarrage ^> "Ouvrir une page ou un ensemble
echo       de pages specifiques" ^> Ajouter une page ^> coller l'adresse.
echo       Puis Apparence ^> Afficher le bouton Accueil ^> meme adresse.
echo.
echo  - Mozilla Firefox : Parametres ^> Accueil ^> Page d'accueil et nouvelles fenetres
echo       ^> "Adresses personnalisees" ^> coller l'adresse.
echo.
echo Conseil : lancez une fois "lancer-plein-ecran.bat" pour verifier.
echo Code PIN par defaut du mode technicien : 1234 (a changer !).
echo Aide a distance : outil choisi dans config.json (quickassist par defaut).
echo   Pour RustDesk, voir installer-rustdesk.bat.
echo.
pause
endlocal
