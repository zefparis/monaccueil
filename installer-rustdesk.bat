@echo off
REM ============================================================
REM  MonAccueil - installation de RustDesk (optionnel)
REM  RustDesk est un logiciel libre (licence AGPL) de prise en main a
REM  distance, utilisable gratuitement en usage professionnel.
REM  Ce script n'installe rien automatiquement : il explique la procedure,
REM  et propose d'ouvrir la page officielle de telechargement.
REM ============================================================
setlocal
echo.
echo ===== Installation de RustDesk (poste du client) =====
echo.
echo 1. Telechargez RustDesk UNIQUEMENT depuis le site officiel :
echo       https://rustdesk.com/   (ou https://github.com/rustdesk/rustdesk/releases)
echo    Prenez la version Windows "x86_64" (.exe), lancez-la, cliquez
echo    "Installer" (installation standard, pas "executer sans installer").
echo.
echo 2. Reglages de securite a faire dans RustDesk, menu Parametres ^> Securite :
echo    - Mot de passe : choisissez "Utiliser un mot de passe unique" (temporaire,
echo      change a chaque session). NE cochez PAS "mot de passe permanent".
echo    - Permissions : "Accepter les sessions via clic" (le client doit cliquer
echo      sur Accepter a chaque fois).
echo    - Laissez decoches : demarrage automatique, acces sans surveillance.
echo    - Verifiez que l'ID et le mot de passe temporaire s'affichent en grand
echo      sur l'ecran principal : c'est ce que le client vous lira au telephone.
echo.
echo 3. Cote technicien : installez RustDesk sur votre propre PC, entrez l'ID du
echo    client, puis le mot de passe temporaire qu'il vous lit. Le client clique
echo    "Accepter". Fermez la session a la fin, devant lui.
echo.
echo 4. REGLE : jamais d'acces non surveille (mot de passe permanent, acces sans
echo    acceptation) sans accord ECRIT et signe du client, conserve dans son dossier.
echo    Meme avec accord, preferez toujours l'acces a la demande.
echo.
echo 5. Dans MonAccueil (mode technicien), choisissez l'outil "RustDesk" et notez
echo    l'ID du poste, puis "Enregistrer" et "Exporter" (remplacez config.json et
echo    config.js dans C:\MonAccueil).
echo.
set /p REP="Ouvrir maintenant la page officielle de telechargement ? (O/N) : "
if /i "%REP%"=="O" start "" "https://rustdesk.com/"
echo.
pause
endlocal
