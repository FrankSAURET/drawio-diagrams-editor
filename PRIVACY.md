# Privacy Notice

This document describes the network behaviour and local data handling of the VS Code extension.

## Scope

This notice covers the VS Code integration shipped in this repository.
It does not replace the privacy terms of third-party services that you may choose to use, such as diagrams.net when online mode is enabled.

## Local data

The extension stores configuration and state inside VS Code, including:

- editor settings such as offline mode, theme, zoom, plugins, and custom libraries;
- local extension state for the update check, including the last check timestamp and the last dismissed version.

Diagram files remain in your workspace unless you explicitly open them with a remote editor or configure external resources.

## Network access

### Default behaviour

Offline mode is enabled by default.
In this mode, the bundled editor is used locally.

The extension performs an automatic update check at most once every 24 hours against:

- `https://api.github.com/repos/jgraph/drawio/releases/latest`

This request is used only to detect whether a newer upstream Draw.io release is available.

### Optional network behaviour

Additional network traffic can occur if you opt into features that require it:

- If you disable offline mode, the extension loads the configured remote editor URL. The default value is `https://embed.diagrams.net/`.
- If you configure external custom libraries or other remote resources, the corresponding URLs may be requested.

When online mode or remote resources are used, document content and related metadata may transit through the remote service you selected.
You are responsible for ensuring that this is acceptable for your environment.

## Telemetry

The VS Code extension layer in this repository does not include telemetry or analytics reporting.

## Publishing and support

The source code for this fork is published at:

- `https://github.com/FrankSAURET/drawio-diagrams-editor`

For support or privacy questions about this fork, use the repository issue tracker.