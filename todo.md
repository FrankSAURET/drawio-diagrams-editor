# À faire
1. Rajoute un menu ouvrir à fichier. Attention il devra toujours revenir à chaque update à partir du dépot de drawio
2. Masque le volet  drawio au démarage. et ne met qu'une entrée dedans : Drawio qui lance drawio.
3. traduit les entrées non traduites

# v2026.7.1.1

1. ✅ Historique et mémoire récupérés après le déplacement du dossier (`H:/OneDrive/…/drawio-in-vscode` → `c:/- VS Code/Extensions/drawio-diagrams-editor`) : mémoire copiée dans le dossier projet Claude actuel. ℹ️ Aucun transcript de session n'a survécu à l'ancienne purge à 30 jours ; `cleanupPeriodDays` est désormais à **365** dans `~/.claude/settings.json`.
2. ✅ Bug « Ouvrir un diagramme » corrigé ([Extension.ts](src/Extension.ts)) : la commande ajoutait le dossier parent au workspace quand le fichier était en dehors (redémarrage de l'hôte d'extensions → erreur), puis ouvrait avec `vscode.open` — donc l'éditeur texte si `workbench.editorAssociations` vaut `default`. Elle ouvre maintenant directement avec le bon viewType (`…-text` ou binaire pour `.drawio.png`), avec repli sur `vscode.open`.
3. ✅ Association de fichiers Windows proposée à l'utilisateur ([FileAssociationFeature.ts](src/features/FileAssociationFeature.ts)) :
   1. ✅ Proposition unique au démarrage (Oui / Plus tard / Ne plus demander), 15 s après l'activation ; `activationEvents` passe à `onStartupFinished` pour que la question arrive à l'installation comme à la mise à jour.
   2. ✅ Écriture dans `HKEY_CURRENT_USER\Software\Classes` via un `.reg` temporaire (UTF-16 LE + BOM) importé par `reg.exe` — aucun privilège administrateur.
   3. ✅ ProgId `ElectropolFr.DrawioDiagram` : icône `media/drawio.ico`, commande `"Code.exe" "%1"`, extensions `.drawio` et `.dio`.
   4. ✅ Chemin d'installation re-vérifié à chaque démarrage et corrigé en silence (il change à chaque mise à jour de l'extension).
   5. ✅ Commande manuelle « Associate .drawio Files With VS Code (Windows) », masquée de la palette hors Windows.
   6. ⏳ Traduction FR des nouvelles clés nls (lot de traduction avant publication).
4. ✅ Fichiers supprimables déplacés dans `A Examiner/` (arborescence d'origine conservée, rien de supprimé) : [debug.log](A%20Examiner/debug.log), [NOTES.md](A%20Examiner/NOTES.md), [README original.md](A%20Examiner/README%20original.md), [tslint.json](A%20Examiner/tslint.json), [examples/temp/](A%20Examiner/examples/temp/). `A Examiner/**` et `Archives/**` exclus du VSIX dans [.vscodeignore](.vscodeignore) mais versionnés dans git.
5. ✅ `tslint` retiré des `devDependencies` (lint mort : le script `lint` n'est qu'un `echo`).

# v2026.7.1

1. ✅ Audit complet du code — 7 bugs corrigés :
   1. ✅ Clé de contexte `experimentalFeaturesEnabled` erronée (`vscode-drawio.…` → `electropol-fr.drawio-diagrams-editor.…`) : la commande « Modifier le diagramme en texte » ne pouvait jamais s'activer ([Config.ts](src/Config.ts)).
   2. ✅ Réglage `enableExperimentalFeatures` lu par le code mais jamais déclaré dans package.json → ajouté + nls en/fr.
   3. ✅ `VsCodeSetting.set()` : `else` manquant → un réglage de dossier de workspace était écrasé au niveau Global ([VsCodeSetting.ts](src/vscode-utils/VsCodeSetting.ts)).
   4. ✅ Listener `onDidChangeTextDocument` jamais disposé à la fermeture d'un diagramme (fuite + merges vers webview morte) ([DrawioEditorProviderText.ts](src/DrawioEditorProviderText.ts)).
   5. ✅ StatusBar « Code Link » jamais disposée ([CodeLinkFeature.ts](src/features/CodeLinkFeature.ts)).
   6. ✅ QuickPick de thème : crash possible sur un séparateur (`onSelect` non gardé) ([DrawioEditorService.ts](src/DrawioEditorService.ts)).
   7. ✅ « Edit Diagram As Text » : `\n` manquant entre sommets mis à jour et nouveaux ([EditDiagramAsTextFeature.ts](src/features/EditDiagramAsTextFeature.ts)).
2. ✅ `.vscodeignore` réécrit : VSIX 57 Mo → **28,5 Mo**. Webapp drawio réduit au runtime réellement chargé (exclus : js/diagramly, js/grapheditor, mxgraph/src, shapes/, integrate.min.js, viewer*.min.js, WEB-INF, templates, SDK onedrive/dropbox, service-worker/workbox, cartes .map, sources dev). Images du README non embarquées (réécrites en URLs GitHub par vsce). debug.log et « README original.md » exclus.
3. ✅ CHANGELOG 2026.7.1 + bump version + build extension/plugins + vsix empaqueté et installé localement.
4. ℹ️ Fichiers supprimables (RIEN n'a été supprimé) :
   1. [debug.log](debug.log) — bruit crashpad Electron.
   2. drawio-diagrams-editor-2026.5.1.vsix et 2026.7.0.vsix — anciens artefacts (61 Mo).
   3. [README original.md](README%20original.md) — copie de l'ancien README hediet.
   4. [NOTES.md](NOTES.md) — notes de dev upstream.
   5. [examples/temp/](examples/temp/) — fichiers d'essai temporaires.
   6. [tslint.json](tslint.json) — TSLint mort (aucun lint branché).
