# À faire

1. ⬜ Tester manuellement le VSIX 2026.7.1 installé (ouvrir un .drawio, un .drawio.png, More Shapes, insertion Mermaid, export SVG/PNG).
2. ⬜ Décider du sort des fichiers supprimables listés dans la v2026.7.1 (aucun fichier supprimé, seulement exclus du VSIX).
3. ⬜ Éventuel : retirer `tslint` (devDependencies + tslint.json) — lint mort (`lint` = echo).

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
