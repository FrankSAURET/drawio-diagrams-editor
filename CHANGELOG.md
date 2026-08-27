# Change Log

All notable changes to this project will be documented in this file.
New format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — Versioning: [CalVer](https://calver.org/) (`YYYY.M.micro`).

## [2026.8.1] - 2026-08-27

### Added

-   **Shape library folders**: the new `electropol-fr.drawio-diagrams-editor.libraryFolders` setting lists folders scanned recursively (8 levels, hidden folders and `node_modules` skipped) for `.xml` files containing `<mxlibrary>`. Every library found appears in the **More Shapes** dialog under its file name followed by a star, in **one category per folder** named after that folder, and can be switched on or off like any other shape set — the checked state survives a reload. Absolute paths only; `${workspaceFolder}` is supported. Two folders sharing a name stay two distinct categories (the title then shows one more path segment, `Shapes/Electronics`).
-   **Preview of our libraries in the More Shapes dialog**: the shapes are drawn in the right-hand panel, for both `libraryFolders` and `customLibraries` entries. A library referenced by URL is only downloaded when it is actually looked at, and the preview stops past 300 shapes so the window never freezes.
-   **Open Library From → Device** now opens the native VS Code file dialog, filtered on `.xml` and positioned on the first configured library folder. It can be used any number of times in a session.
-   **File → Save As…** added to the Draw.io File menu (routed to VS Code, which owns the document), and the **Export as** submenu restored.
-   **Exports and library saves now work**: instead of a blob download that a webview cannot perform, `saveLocalFile` is routed to the extension, which opens the native VS Code save dialog and writes the file. Applies to the whole `Export as` submenu (PNG, JPEG, SVG, PDF, HTML, XML, JSON…) and to shape libraries, which default to the first configured library folder.
-   **Copy a selection as SVG**: the clipboard receives `text/html` with the SVG as a `data:` URI (what Word, PowerPoint and Outlook read), the `image/svg+xml` flavour, and the SVG `content` attribute carrying the cell XML — so a paste back into Draw.io stays editable.
-   **Paste an SVG copied from another application** (Inkscape, Kablix, Draw.io…): a complete SVG document is now recognised and imported as an image instead of being pasted as a long text label.
-   **Extras → Theme…** now calls the extension theme picker, so the choice is written to the VS Code settings and survives a webview reload.
-   **Version number shown in the editor menu bar**, aligned to the right, in every theme.

### Fixed

-   **Ctrl+S had to be pressed twice.** Draw.io copies the originating action into the `message` field of its events, including `autosave`; the extension took every such event for a request answer and swallowed it, so no change ever reached the document. Answers are now matched against pending requests only.
-   **Pasting an SVG did nothing.** `Editor.enableNativeClipboard` is defined as `window == window.top`, which is never true in a VS Code webview, so Draw.io never read the clipboard. The flag now depends on the availability of `navigator.clipboard.read`, with the internal clipboard as a fallback. Side effect: `Copy as Image` / `Copy as PNG` reappear in the menus.
-   **A library removed then re-imported was refused ("file already exists")** — two causes: the copy kept in browser storage was left behind by the sidebar close button, and the webview `localStorage` bridge relayed writes to the extension but not deletions, so deleted keys came back on reload.
-   **A library closed by its cross could not be reopened in the same session**: `EditorUi.closeLibrary` forgets to clear `ui.loadedLibraries`, and `App.loadLibraries` then silently refuses the library. The flag is now cleared.
-   **The "Open Library From" submenu was missing** from the File menu: Draw.io only adds it when the URL carries `libraries=1`, which the webview does not pass. Both entries (Device…, Browser…) are added by the extension.
-   **Version label invisible in the kennedy theme**: it was attached to a container that is only the visible bar in the `min` theme. The parent is now chosen per theme, with a floating fallback if the label ends up clipped.
-   **PlantUML rendering**: since Draw.io v31 the renderer is bundled and local, and the webview script sequence had to be aligned — no remote server is contacted any more.

### Changed

-   **Draw.io submodule updated from v30.0.1 to v31.3.2**: libavoid auto-routing, built-in ELK layouts, offline PlantUML rendering. All the APIs patched by the webview were re-verified against the new build.
-   **"New Library…" removed from the File menu**: `Open Library From → Device` covers the need, and saving a library goes through the VS Code dialog anyway.
-   French translation completed for the new settings and dialog labels.
-   The generated VSIX file name now carries the build number, so two packages from the same month can be told apart.

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

[2026.8.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.8.1
[2026.8.0]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.8.0
[2026.7.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.1
[2026.7.0]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/v2026.7.0
[2026.5.1]: https://github.com/FrankSAURET/drawio-diagrams-editor/releases/tag/2026.5.1
