# Change Log

All notable changes to this project will be documented in this file.
New format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — Versioning: [CalVer](https://calver.org/) (`YYYY.0M.micro`).

## [2026.5.1] — 12 mai 2026

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
