# Change Log

All notable changes to this project will be documented in this file.
New format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — Versioning: [CalVer](https://calver.org/) (`YYYY.M.micro`).

## [2026.8.0] - 2026-08-23

### Added

-   Clicking the Draw.io icon in the activity bar now opens a full Draw.io editor tab straight away — no dialog, no side panel. Clicking it again reveals the diagram that is already open instead of stacking new tabs.
-   `Draw.io: New Draw.io Diagram` creates an **untitled** document: nothing is written to disk and no "Save as" dialog appears; the location is only asked at the first save.
-   `Draw.io: Open Draw.io Diagram`, also available as an **Open…** entry in the File menu of the Draw.io editor itself.
-   Windows file association (optional): a one-time prompt offers to open `.drawio` and `.dio` files in VS Code from the Explorer, with the Draw.io icon. Available at any time through `Draw.io: Associate .drawio Files With VS Code (Windows)`. Everything is written to the current user's registry hive — no administrator privileges required.
-   Working folder memory: the folder of the last diagram opened or saved is the one proposed by Open and Save As, including for files opened from the Windows Explorer.

### Fixed

-   `Open Draw.io Diagram` no longer adds the parent folder to the workspace when the file lies outside it (which restarted the extension host), and no longer falls back to the plain text editor when `workbench.editorAssociations` maps the extension to `default`.
-   Clicking the activity bar icon within the first seconds after VS Code starts is no longer swallowed by the anti-auto-open guard.
-   The side panel is now closed *before* the diagram opens, so no empty panel flashes while the editor loads.
-   Explorer icon on Windows: a stale `UserChoice` association could override the registered file type, and the icon path pointed inside the installation folder, which changes at every extension update. The icon is now copied to a stable location and the shell is notified explicitly.

### Changed

-   All user-visible strings migrated to the `vscode.l10n` API — English base bundle plus a French translation (interface, commands, settings). The labels added to the Draw.io File menu follow the language of the editor itself.
-   Minimum required VS Code version raised to **1.73** (the version that introduced the `l10n` API).

## [2026.7.1] - 2026-07-07

### Fixed

-   "Edit Diagram As Text" command could never be enabled: the context key set by the extension (`vscode-drawio.experimentalFeaturesEnabled`) did not match the one declared in `package.json`. The `enableExperimentalFeatures` setting is now also declared and localized (en/fr).
-   Settings written from the UI (theme, code link…) were saved in the User settings even when a Workspace Folder value existed (missing `else if` in `VsCodeSetting.set`).
-   Text editor change listener was never disposed when closing a diagram, leaking listeners and sending merges to dead webviews.
-   "Edit Diagram As Text" document serialization was missing a newline between updated and new vertices.
-   Code Link status bar item was never disposed on deactivation.
-   Theme quick pick could crash when a separator item was previewed.

### Changed

-   Massive VSIX size reduction (~57 MB → ~35 MB): the packaged draw.io webapp now only ships the runtime actually loaded by the webview. Removed dev sources (`js/diagramly`, `js/grapheditor`, `mxgraph/src`, `shapes/`), unused bundles (`integrate.min.js`, `viewer*.min.js`), server files (`WEB-INF`), templates, cloud SDKs and service workers. Doc images/GIFs are no longer packaged (loaded from GitHub by the Marketplace), and source maps are excluded.

## [2026.7.0] - 2026-07-03

This release marks the transition to an independently maintained fork.
The original extension by [Henning Dieterichs (hediet)](https://github.com/hediet/vscode-drawio)
has not merged pull requests for over a year. This fork continues development under the same GPL-3.0 licence.

### Added

-   Activity bar toggle with i18n support (`fr`, `en`)
-   Internationalization of all new UI strings (French/English)
- Button to open xml.

### Fixed

-   Updated file patterns for Draw.io v29 (`math` → `math4`, added `shapes/stencils`)
-   SVG export fix
-   Reverts change to automatically follow VS Code dark/light theme [#457](https://github.com/hediet/vscode-drawio/issues/457)

### Changed

-   Mise à jour du sous-module Draw.io vers la version **30.0.1** 

[2026.8.0]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.8.0
[2026.7.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.1
[2026.7.0]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.0
[2026.5.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/2026.5.1
