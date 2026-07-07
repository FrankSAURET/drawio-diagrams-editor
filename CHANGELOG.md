# Change Log

All notable changes to this project will be documented in this file.
New format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — Versioning: [CalVer](https://calver.org/) (`YYYY.M.micro`).

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

[2026.7.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.1
[2026.7.0]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.0
[2026.5.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/2026.5.1
