# À faire

1. ⬜ Décider du sort de [examples/test.txt](examples/test.txt) : supprimé dans la copie de travail (pas par Claude), restauré en attendant ton arbitrage.

# v2026.8.0.6 — préparation de la publication 2026.8.0

1. ✅ Traductions passées en revue avant publication (lot unique, comme prévu) :
   1. ✅ `package.nls.json` / `package.nls.fr.json` : les 65 clés `%…%` du manifeste sont déclarées et traduites, aucune clé morte.
   2. ✅ [l10n/bundle.l10n.fr.json](l10n/bundle.l10n.fr.json) aligné 1:1 sur le code (36 chaînes) : ajout de « New diagram » → « Nouveau diagramme » (nom de l'onglet sans titre, item ⏳ de v2026.8.0.4), retrait de 4 clés mortes depuis la réécriture de la barre d'activité (`Create`, `Diagrams`, `Cannot create or open file "{0}"!`, `Launch Draw.io`).
   3. ✅ Dialogue « Propriétés d'exportation » du plugin webview ([propertiesDialog.ts](drawio-custom-plugins/src/propertiesDialog.ts)) : les deux derniers libellés figés en anglais (« Export Properties », « Disable SVG 1.1 warning ») passent par un mini-dictionnaire indexé sur `mxLanguage`, avec repli anglais. Le reste du dialogue utilisait déjà `mxResources`.
2. ✅ [CHANGELOG.md](CHANGELOG.md) : section `[2026.8.0] - 2026-08-23` (Added / Fixed / Changed) résumant les lots 2026.7.1.1 → 2026.8.0.5, plus le lien de release.
3. ✅ [README.md](README.md) (langue de base) : commandes « New/Open Draw.io Diagram » et « Associate .drawio Files » ajoutées au tableau, nouvelle section « Windows Explorer association », rubrique « What changed in this fork » actualisée.
4. ✅ Build extension + plugins vérifié (webpack production, exit 0) ; `tsc --noEmit` sans erreur dans `src/` et `drawio-custom-plugins/src/`.
5. ⏳ Publication elle-même (`vsce publish`) : en attente de l'accord explicite de Frank.

# v2026.8.0.5

1. ✅ **Cause des « trois clics » trouvée** : le garde-fou anti-démarrage de [ActivityBarFeature.ts](src/features/ActivityBarFeature.ts) reposait sur l'âge du processus hôte (≥ 3 s) ; un clic sur l'icône dans les trois secondes suivant le lancement de VS Code était donc avalé. Remplacé par une seule fenêtre de **400 ms mesurée depuis la création de la vue** : l'extension s'active sur `onStartupFinished`, la restauration du volet suit de quelques millisecondes, un clic humain arrive toujours après.
2. ✅ Barre latérale refermée **avant** l'ouverture du diagramme (au lieu d'après) : plus de volet vide qui apparaît le temps du chargement.

# v2026.8.0.4

1. ✅ Clic sur l'icône de la barre d'activité : ouvre DIRECTEMENT un onglet Draw.io plein format, referme la barre latérale, aucune boîte de dialogue ([ActivityBarFeature.ts](src/features/ActivityBarFeature.ts) réécrite sur le modèle Kablix — `createTreeView` vide + `onDidChangeVisibility`). Le volet n'affiche plus d'entrée « Drawio » ; `"visibility": "collapsed"` retiré de [package.json](package.json) (un volet replié ne déclenche jamais l'événement de visibilité).
2. ✅ Anti-réouverture au démarrage : double garde-fou (âge du processus hôte ≥ 3 s **et** ≥ 1,5 s après l'activation), et plus de rattrapage « déjà visible » — sinon une barre latérale restaurée sur Draw.io ouvrait un diagramme à chaque lancement.
3. ✅ « Nouveau diagramme » n'écrit plus de fichier et n'affiche plus « Enregistrer sous » : le document est **sans titre** (`untitled:Nouveau diagramme.drawio`), créé via `openTextDocument` puis `vscode.openWith` ([diagramTabs.ts](src/utils/diagramTabs.ts)). L'emplacement n'est demandé qu'au premier Ctrl+S ([DrawioEditorProviderText.ts](src/DrawioEditorProviderText.ts) : `saveAs` natif si le document est sans titre).
4. ✅ Re-clic sur l'icône : révèle le diagramme déjà ouvert au lieu d'empiler des onglets vierges (repérage par les groupes d'onglets, `TabInputCustom`).
5. ✅ Dossier courant ([workingFolder.ts](src/utils/workingFolder.ts)) : le dossier du dernier diagramme ouvert ou enregistré devient le dossier proposé par « Ouvrir » et « Enregistrer sous ». Mis à jour par un écouteur `tabGroups.onDidChangeTabs`, donc valable aussi pour un fichier ouvert depuis l'Explorateur Windows.
6. ✅ **Cause de l'ouverture « en mode texte » trouvée** : [.vscode/settings.json](.vscode/settings.json) du dépôt forçait `"workbench.editorAssociations": { "*.drawio": "default", "*.dio": "default", "*.svg": "default" }` (héritage du dépôt hediet). Entrées supprimées.
7. ✅ Réglages globaux de VS Code corrigés : `files.associations` `"*.drawio": "xml"` supprimé (héritage hediet) ; `workbench.editorAssociations` complété par `*.drawio.svg`/`*.dio.svg` → éditeur texte Draw.io et `*.drawio.png`/`*.dio.png` → éditeur binaire, sans quoi les règles existantes `*.svg`/`*.png` → aperçu d'image les ouvraient en image.
8. ✅ **Cause de l'icône absente dans l'Explorateur trouvée** : Windows gardait `Explorer\FileExts\.drawio\UserChoice = Applications\Maxthon.exe`, qui l'emporte sur le ProgId. [FileAssociationFeature.ts](src/features/FileAssociationFeature.ts) efface désormais `UserChoice`/`UserChoiceLatest` (Windows interdit de les écrire, pas de les effacer), déclare `OpenWithProgids` et notifie le shell par `SHChangeNotify` en plus de `ie4uinit`.
9. ✅ Icône `.ico` copiée à un emplacement **stable** (`%LOCALAPPDATA%\drawio-diagrams-editor\drawio.ico`) : le registre ne pointe plus dans le dossier d'installation, qui change à chaque mise à jour et laissait un ProgId sans icône.
10. ✅ Registre de la machine réparé dans la foulée (UserChoice Maxthon effacé, icône recopiée) — l'Explorateur affiche l'icône Draw.io sans attendre la prochaine publication.
11. ✅ Traduction FR de la chaîne « New diagram » (nom de l'onglet sans titre) — faite dans le lot de traductions v2026.8.0.6.

# v2026.8.0.2

1. ✅ Version publique passée au calver du mois : **2026.8.0** (prochaine publication), build interne `2026.8.0.2`.
2. ✅ Entrée « Ouvrir… » ajoutée au menu Fichier de la webview ([menu-entries.ts](drawio-custom-plugins/src/menu-entries.ts)) : c'est un plugin Draw.io, donc il survit à chaque mise à jour du dépôt drawio. L'action envoie `invokeCommand: "open"` → [DrawioEditorService.ts](src/DrawioEditorService.ts) déclenche la commande VS Code `openDiagram` (boîte de dialogue native + bon éditeur personnalisé).
3. ✅ Volet Draw.io masqué au démarrage (`"visibility": "collapsed"` dans [package.json](package.json)) et réduit à une seule entrée « Drawio » qui lance l'éditeur ([ActivityBarFeature.ts](src/features/ActivityBarFeature.ts) : `TreeDataProvider` avec l'icône `media/drawio-icon.svg`). Le bloc `viewsWelcome` a été supprimé.
4. ✅ Toutes les chaînes visibles migrées vers l'API `vscode.l10n` (39 chaînes dans 10 fichiers de `src/`), base en anglais + bundle FR [l10n/bundle.l10n.fr.json](l10n/bundle.l10n.fr.json). `"l10n": "./l10n"` déclaré dans le manifeste ; `engines.vscode` et `@types/vscode` passés à **1.73** (version minimale de l'API `l10n`).
5. ✅ Libellés du menu Fichier de la webview tirés du dictionnaire de Draw.io (`mxResources.get("open"/"import"/"export"/"save")`) : ils suivent désormais la langue de l'éditeur au lieu d'être figés en anglais.
6. ✅ `package.nls.fr.json` complété : plus aucune clé manquante (`displayName`, `description`, `commands.associateFileType.title`).

# v2026.7.1.1

1. ✅ Historique et mémoire récupérés après le déplacement du dossier (`H:/OneDrive/…/drawio-in-vscode` → `c:/- VS Code/Extensions/drawio-diagrams-editor`) : mémoire copiée dans le dossier projet Claude actuel. ℹ️ Aucun transcript de session n'a survécu à l'ancienne purge à 30 jours ; `cleanupPeriodDays` est désormais à **365** dans `~/.claude/settings.json`.
2. ✅ Bug « Ouvrir un diagramme » corrigé ([Extension.ts](src/Extension.ts)) : la commande ajoutait le dossier parent au workspace quand le fichier était en dehors (redémarrage de l'hôte d'extensions → erreur), puis ouvrait avec `vscode.open` — donc l'éditeur texte si `workbench.editorAssociations` vaut `default`. Elle ouvre maintenant directement avec le bon viewType (`…-text` ou binaire pour `.drawio.png`), avec repli sur `vscode.open`.
3. ✅ Association de fichiers Windows proposée à l'utilisateur ([FileAssociationFeature.ts](src/features/FileAssociationFeature.ts)) :
   1. ✅ Proposition unique au démarrage (Oui / Plus tard / Ne plus demander), 15 s après l'activation ; `activationEvents` passe à `onStartupFinished` pour que la question arrive à l'installation comme à la mise à jour.
   2. ✅ Écriture dans `HKEY_CURRENT_USER\Software\Classes` via un `.reg` temporaire (UTF-16 LE + BOM) importé par `reg.exe` — aucun privilège administrateur.
   3. ✅ ProgId `ElectropolFr.DrawioDiagram` : icône `media/drawio.ico`, commande `"Code.exe" "%1"`, extensions `.drawio` et `.dio`.
   4. ✅ Chemin d'installation re-vérifié à chaque démarrage et corrigé en silence (il change à chaque mise à jour de l'extension).
   5. ✅ Commande manuelle « Associate .drawio Files With VS Code (Windows) », masquée de la palette hors Windows.
   6. ✅ Traduction FR des nouvelles clés nls (faite dans le lot v2026.8.0.2).
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
