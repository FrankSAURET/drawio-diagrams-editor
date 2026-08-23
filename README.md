# Edit Diagrams with draw.io

<img src="docs/Logo-drawio-diagrams-editor.png" alt="Edit Diagrams with draw.io" width="100"/>

Draw and maintain diagrams without leaving VS Code. This extension embeds the full [Draw.io / diagrams.net](https://app.diagrams.net/) editor — **offline, no browser, no account**.

> Unofficial version with no affiliation, sponsorship or endorsement in any way from draw.io  or diagrams.net.

> Fork of [hediet/vscode-drawio](https://github.com/hediet/vscode-drawio) (GPL-3.0), actively maintained with bug fixes and improvements not yet merged upstream.

---

## Network and privacy

Default behaviour is designed to stay local:

- **Offline mode is enabled by default**. The bundled editor is used locally.
- The extension performs a **version check once every 24 hours** against the GitHub releases API to detect new upstream Draw.io versions.
- This check only stores a local timestamp and the last dismissed version in VS Code state.
- The VS Code extension layer does **not include telemetry or analytics reporting**.

Network access can still occur in these cases:

- If you disable offline mode, the editor loads the configured remote URL, which is `https://embed.diagrams.net/` by default.
- If you configure external resources such as custom library URLs, those resources may trigger additional requests.

See [PRIVACY.md](./PRIVACY.md) for the full privacy notice.

---

## Supported formats

| Extension | Description |
|-----------|-------------|
| `.drawio` / `.dio` | Native XML format, best for version control and diffs |
| `.drawio.svg` | SVG with embedded diagram — renderable on GitHub without export |
| `.drawio.png` | PNG with embedded diagram — same idea, lower quality than SVG |

Just create an empty file with one of these extensions and open it — the editor starts automatically.

![Quick start](docs/RunIt.png)

---

## Editing diagram and XML side by side

Click the **sheet + arrow** icon in the top-right corner of the editor to open the raw XML alongside the visual editor. Both stay synchronized: edits in one reflect instantly in the other.

This makes bulk renaming, find/replace and scripted edits much faster than working in the visual editor alone.

![XML side by side](docs/drawio-xml.gif)

---

## Code Link

Label any node or edge `#SymbolName`. When **Code Link** is active (toggle in the status bar), double-clicking that node jumps straight to the matching symbol definition in your source code.

Works with any language that supports VS Code workspace symbol search (TypeScript, Python, C#, Java, …).

![Code Link demo](docs/demo-code-link.gif)

---

## Themes

Switch themes at any time with the **`Draw.io: Change Theme`** command.

<details>
<summary>Available themes</summary>

| atlas | Kennedy |
|-------|---------|
| <img src="docs/theme-atlas.png" width="380"> | <img src="docs/theme-Kennedy.png" width="380"> |

| min | dark |
|-----|------|
| <img src="docs/theme-min.png" width="380"> | <img src="docs/theme-dark.png" width="380"> |

</details>

---

## Commands

| Command | Description |
|---------|-------------|
| `Draw.io: New Draw.io Diagram` | Create a diagram — untitled, the location is asked at the first save |
| `Draw.io: Open Draw.io Diagram` | Open an existing diagram in the right editor |
| `Draw.io: Convert To…` | Convert a diagram to another format |
| `Draw.io: Export To…` | Export to PNG, SVG, PDF, … |
| `Draw.io: Change Theme` | Switch the editor theme |
| `Draw.io: Toggle Code Link Activation` | Enable/disable the Code Link feature |
| `Draw.io: Associate .drawio Files With VS Code (Windows)` | Register `.drawio` / `.dio` in the Windows Explorer |

The activity bar icon is a shortcut for the first two: one click opens a full editor tab, a second click brings the diagram already open back to the front.

---

## Windows Explorer association

On Windows, the extension offers once to open `.drawio` and `.dio` files in VS Code directly from the Explorer, with the Draw.io icon. Everything is written to the current user's registry hive (`HKEY_CURRENT_USER\Software\Classes`) — no administrator privileges are needed, and nothing is written unless you accept.

If you dismissed the prompt, run `Draw.io: Associate .drawio Files With VS Code (Windows)` from the command palette.

---

## Associate plain `.svg` files with the editor

By default only `*.drawio.svg` files open in this editor. To handle all `.svg` files, add to `settings.json`:

```json
"workbench.editorAssociations": {
    "*.svg": "electropol-fr.drawio-diagrams-editor-text"
}
```

Only Draw.io-generated SVGs can be edited this way — arbitrary SVG files are not supported.

---

## What changed in this fork

- One-click activity bar icon: opens a full Draw.io tab, no dialog, no side panel
- `New Draw.io Diagram` creates an untitled document — nothing is written to disk until you save
- `Open…` entry added to the File menu of the Draw.io editor itself
- Optional Windows Explorer association for `.drawio` / `.dio`, with the Draw.io icon
- Fully localized interface (🇬🇧 English / 🇫🇷 French), including the settings
- Button to open XML source beside the diagram (no need for `View: Reopen Editor With…`)
- SVG export fix
- Updated to Draw.io v30.0.1 (new shape libraries, `math4` format)
- Ongoing bug fixes not yet merged in the original project

---

### Draw.io — highlights since 2026

Key features brought by the Draw.io versions bundled in this extension.

| Version | Date | Highlights |
|---------|------|------------|
| 2026.2.0 | Feb 2026 | Inline edge toolbar; dockable floating windows; animated GIF export; `autosizeText` style for sticky notes |
| 2026.4.0 | Mar–Apr 2026 | Collapsible sections in Format panel; improved omni search; copy/paste text style; compressed SVG CLI export; elastic pop animation |
| 2026.4.1 | Apr 2026 | Desktop presentation mode; localized shape search; page actions in omnibox |
| 2026.5.0 | May 2026 | Native Mermaid shapes; MathJax label sizing; adaptive colors in page setup; `lockedGroup` cell style |

---

## Credits

- **Frank Sauret** — fork maintainer ([GitHub](https://github.com/FrankSAURET))
- **Henning Dieterichs** — original author ([hediet/vscode-drawio](https://github.com/hediet/vscode-drawio))
- **Vincent Rouillé** — contributor ([Speedy37](https://github.com/Speedy37))