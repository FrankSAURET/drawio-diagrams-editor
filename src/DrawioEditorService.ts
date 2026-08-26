import { l10n } from "vscode";
import { Disposable } from "@hediet/std/disposable";
import { EventEmitter } from "@hediet/std/events";
import { autorun, computed, observable, ObservableSet } from "mobx";
import { extname } from "path";
import {
	commands,
	QuickPickItem, QuickPickItemKind, StatusBarAlignment,
	TextDocument,
	Uri,
	WebviewPanel,
	window,
	workspace
} from "vscode";
import { Config, DiagramConfig, ResolvedDrawioTheme } from "./Config";
import {
	CustomizedDrawioClient,
	DrawioClientFactory,
	DrawioClientOptions,
} from "./DrawioClient";
import { DrawioBinaryDocument } from "./DrawioEditorProviderBinary";
import { registerFailableCommand } from "./utils/registerFailableCommand";
import { BufferImpl } from "./utils/buffer";

const drawioChangeThemeCommand = "electropol-fr.drawio-diagrams-editor.changeTheme";

export class DrawioEditorService {
	public readonly dispose = Disposable.fn();

	private readonly onEditorOpenedEmitter = new EventEmitter<{
		editor: DrawioEditor;
	}>();
	public readonly onEditorOpened = this.onEditorOpenedEmitter.asEvent();

	public readonly openedEditors = new ObservableSet<DrawioEditor>();

	@computed
	get activeDrawioEditor(): DrawioEditor | undefined {
		return [...this.openedEditors].find((e) => e.isActive);
	}

	@observable private _lastActiveDrawioEditor: DrawioEditor | undefined;
	get lastActiveDrawioEditor(): DrawioEditor | undefined {
		return this._lastActiveDrawioEditor;
	}

	private readonly statusBar = this.dispose.track(
		window.createStatusBarItem(StatusBarAlignment.Right)
	);

	constructor(
		private readonly config: Config,
		private readonly drawioClientFactory: DrawioClientFactory
	) {
		autorun(() => {
			const a = this.activeDrawioEditor;
			if (a) {
				this._lastActiveDrawioEditor = a;
			}
			commands.executeCommand(
				"setContext",
				"electropol-fr.drawio-diagrams-editor.active",
				!!a
			);
		});

		this.dispose.track(
			registerFailableCommand(drawioChangeThemeCommand, () => {
				const activeDrawioEditor = this.activeDrawioEditor;
				if (!activeDrawioEditor) {
					return;
				}
				activeDrawioEditor.handleChangeThemeCommand();
			})
		);

		this.dispose.track(
			registerFailableCommand("electropol-fr.drawio-diagrams-editor.convert", () => {
				const activeDrawioEditor = this.activeDrawioEditor;
				if (!activeDrawioEditor) {
					return;
				}
				activeDrawioEditor.handleConvertCommand();
			})
		);

		this.dispose.track(
			registerFailableCommand(
				"electropol-fr.drawio-diagrams-editor.reload-webview",
				() => {
					for (const e of this.openedEditors) {
						e.drawioClient.reloadWebview();
					}
				}
			)
		);

		this.dispose.track(
			registerFailableCommand("electropol-fr.drawio-diagrams-editor.export", () => {
				const activeDrawioEditor = this.activeDrawioEditor;
				if (!activeDrawioEditor) {
					return;
				}
				activeDrawioEditor.handleExportCommand();
			})
		);

		this.dispose.track({
			dispose: autorun(
				() => {
					const activeEditor = this.activeDrawioEditor;
					this.statusBar.command = drawioChangeThemeCommand;

					if (activeEditor) {
						this.statusBar.text = `Theme: ${activeEditor.config.resolvedTheme.toString()}`;
						this.statusBar.show();
					} else {
						this.statusBar.hide();
					}
				},
				{ name: "Update UI" }
			),
		});
	}

	public async createDrawioEditorInWebview(
		webviewPanel: WebviewPanel,
		document:
			| { kind: "text"; document: TextDocument }
			| { kind: "drawio"; document: DrawioBinaryDocument },
		options: DrawioClientOptions
	): Promise<DrawioEditor> {
		const instance =
			await this.drawioClientFactory.createDrawioClientInWebview(
				document.document.uri,
				webviewPanel,
				options
			);

		const config = this.config.getDiagramConfig(document.document.uri);
		const editor = new DrawioEditor(
			PrivateSymbol,
			webviewPanel,
			instance,
			document,
			config
		);

		this.openedEditors.add(editor);
		this.onEditorOpenedEmitter.emit({ editor });

		editor.webviewPanel.onDidDispose(() => {
			this.openedEditors.delete(editor);
		});

		return editor;
	}
}

const PrivateSymbol = Symbol();

/**
 * Represents a drawio editor in VS Code.
 * Wraps a `CustomizedDrawioClient` and a webview.
 */
export class DrawioEditor {
	public readonly dispose = Disposable.fn();

	@observable private _isActive = false;
	@observable private _hasFocus = false;

	private readonly knownDrawioFileExtensions: ReadonlyArray<string> = [
		".drawio",
		".dio",
		".drawio.svg",
		".drawio.png",
		".dio.svg",
		".dio.png",
	];

	public get fileExtension(): string {
		const currentFilePath = this.uri.path;
		// Just in case an extension is the prefix of another,
		// we want to return the longest.
		const sortedExtensionsByLengthDesc = this.knownDrawioFileExtensions
			.slice()
			.sort((a, b) => b.length - a.length);
		return (
			sortedExtensionsByLengthDesc.find((ext) =>
				currentFilePath.endsWith(ext)
			) || extname(currentFilePath)
		);
	}

	constructor(
		_constructorGuard: typeof PrivateSymbol,
		public readonly webviewPanel: WebviewPanel,
		public readonly drawioClient: CustomizedDrawioClient,
		public readonly document:
			| { kind: "text"; document: TextDocument }
			| { kind: "drawio"; document: DrawioBinaryDocument },
		public readonly config: DiagramConfig
	) {
		this._isActive = webviewPanel.active;
		this.dispose.track(
			webviewPanel.onDidChangeViewState(() => {
				this._isActive = webviewPanel.active;
			})
		);

		this.dispose.track(
			drawioClient.onFocusChanged.sub(({ hasFocus }) => {
				this._hasFocus = hasFocus;
			})
		);

		drawioClient.onInvokeCommand.sub(({ command }) => {
			if (command === "convert") {
				this.handleConvertCommand();
			} else if (command === "export") {
				this.handleExportCommand();
			} else if (command === "save") {
				this.drawioClient.triggerOnSave();
			} else if (command === "open") {
				commands.executeCommand(
					"electropol-fr.drawio-diagrams-editor.openDiagram"
				);
			} else if (command === "saveAs") {
				commands.executeCommand("workbench.action.files.saveAs");
			} else if (command === "changeTheme") {
				this.handleChangeThemeCommand();
			}
		});

		drawioClient.onSaveLocalFile.sub((file) => {
			this.saveLocalFile(file);
		});

		drawioClient.onPickLibraryFile.sub(() => {
			this.pickLibraryFile();
		});
	}

	/**
	 * « Ouvrir une bibliothèque depuis → Périphérique… ». Draw.io réutilise un
	 * champ de fichier caché qui ne rend plus rien au second appel dans une
	 * webview ; c'est donc VS Code qui demande le fichier et le lit.
	 */
	private async pickLibraryFile(): Promise<void> {
		const folders = this.config.libraryFolderPaths;

		const chosen = await window.showOpenDialog({
			canSelectMany: false,
			defaultUri:
				folders.length > 0
					? Uri.file(folders[0])
					: this.uri.scheme === "file"
						? Uri.joinPath(this.uri, "..")
						: undefined,
			filters: { [l10n.t("Shape Library")]: ["xml"] },
			openLabel: l10n.t("Open Library"),
		});

		if (!chosen || chosen.length === 0) {
			return;
		}

		const file = chosen[0];
		let content: string;
		try {
			content = BufferImpl.from(
				await workspace.fs.readFile(file)
			).toString("utf-8");
		} catch (e) {
			await window.showErrorMessage(
				l10n.t('Could not read library file "{0}"!', file.fsPath)
			);
			return;
		}

		if (content.indexOf("<mxlibrary") < 0) {
			await window.showErrorMessage(
				l10n.t('"{0}" is not a shape library!', file.fsPath)
			);
			return;
		}

		const name = file.path.substring(file.path.lastIndexOf("/") + 1);
		this.drawioClient.libraryFilePicked(name, content);
	}

	/**
	 * Exports et bibliothèques de Draw.io : la webview ne peut pas télécharger,
	 * c'est donc l'extension qui demande l'emplacement et écrit le fichier.
	 */
	private async saveLocalFile(file: {
		filename: string;
		mimeType: string | null;
		base64Encoded: boolean;
		data: string;
		isLibrary: boolean;
	}): Promise<void> {
		const bytes = BufferImpl.from(
			file.data,
			file.base64Encoded ? "base64" : "utf8"
		);

		// Une bibliothèque va de préférence dans le dossier suivi : elle y sera
		// relue au prochain chargement et proposée dans « Plus de formes ».
		const libraryFolders = file.isLibrary
			? this.config.libraryFolderPaths
			: [];
		const defaultUri =
			libraryFolders.length > 0
				? Uri.joinPath(Uri.file(libraryFolders[0]), file.filename)
				: this.uri.scheme === "file"
					? Uri.joinPath(this.uri, "..", file.filename)
					: undefined;

		const targetUri = await window.showSaveDialog({
			defaultUri,
			saveLabel: file.isLibrary ? l10n.t("Save Library") : l10n.t("Export"),
		});

		if (!targetUri) {
			return;
		}
		await workspace.fs.writeFile(targetUri, bytes);
	}

	public get isActive(): boolean {
		return this._isActive;
	}

	public get hasFocus(): boolean {
		return this._hasFocus;
	}

	public get uri(): Uri {
		return this.document.document.uri;
	}

	/**
	 * Supports `.drawio`, `.dio`, `.drawio.svg` `.drawio.png` and other extensions.
	 *
	 * @param newExtension Must start with a dot.
	 */
	public getUriWithExtension(newExtension: string): Uri {
		return this.uri.with({
			path: removeEnd(this.uri.path, this.fileExtension) + newExtension,
		});
	}

	public async convertTo(targetExtension: string): Promise<void> {
		if (this.document.document.isDirty) {
			await window.showErrorMessage(l10n.t("Save your diagram first!"));
			return;
		}

		const targetUri = this.getUriWithExtension(targetExtension);
		if (await fileExists(targetUri)) {
			await window.showErrorMessage(
				l10n.t('File "{0}" already exists!', targetUri.toString())
			);
			return;
		}

		const buffer = await this.drawioClient.export(targetExtension);

		const sourceUri = this.document.document.uri;
		const oldContent = await workspace.fs.readFile(sourceUri);

		await workspace.fs.writeFile(sourceUri, buffer);
		try {
			await workspace.fs.rename(sourceUri, targetUri);
		} catch (e) {
			await workspace.fs.writeFile(sourceUri, oldContent);
			throw e;
		}
	}

	public async exportTo(targetExtension: string): Promise<void> {
		const buffer = await this.drawioClient.export(targetExtension);
		const targetUri = await window.showSaveDialog({
			defaultUri: this.getUriWithExtension(targetExtension),
		});

		if (!targetUri) {
			return;
		}
		await workspace.fs.writeFile(targetUri, buffer);
	}

	public async handleConvertCommand(): Promise<void> {
		const result = await window.showQuickPick(
			[
				{
					label: ".drawio.svg",
					description: l10n.t(
						"Converts the diagram to an editable SVG file"
					),
				},
				{
					label: ".drawio",
					description: l10n.t("Converts the diagram to a drawio file"),
				},

				{
					label: ".drawio.png",
					description: l10n.t(
						"Converts the diagram to an editable png file"
					),
				},
			].filter((x) => x.label !== this.fileExtension)
		);

		if (!result) {
			return;
		}
		await this.convertTo(result.label);
	}

	public async handleExportCommand(): Promise<void> {
		const result = await window.showQuickPick([
			{
				label: ".svg",
				description: l10n.t("Exports the diagram to a SVG file"),
			},
			{
				label: ".png",
				description: l10n.t("Exports the diagram to a png file"),
			},
			{
				label: ".drawio",
				description: l10n.t("Exports the diagram to a drawio file"),
			},
		]);

		if (!result) {
			return;
		}
		await this.exportTo(result.label);
	}

	public async handleChangeThemeCommand(): Promise<void> {
		const originalTheme = this.config.theme;
		const originalAppearance = this.config.appearance;
		const availableThemes = withFirstUnique(ResolvedDrawioTheme.getThemeNames(), originalTheme);

		const availableOptions: (QuickPickItem & { onSelect?: (preview: boolean) => void })[] = [];

		const curVsCodeAppearance = this.config.getVsCodeAppearance();

		const appearances = withFirstUnique(["automatic", "light", "dark"], originalAppearance);
		for (const appearance of appearances) {
			const appearanceLabel = appearance === "automatic" ? l10n.t("always match VS Code theme '{0}'", curVsCodeAppearance) : appearance;

			availableOptions.push({
				kind: QuickPickItemKind.Separator,
				label: appearanceLabel,
			});
			for (const theme of availableThemes) {
				availableOptions.push({
					label: `${theme} - ${appearance}`,
					onSelect: () => {
						this.config.setTheme(theme);
						this.config.setAppearance(appearance);
					}
				});
			}
		}
		const result = await window.showQuickPick(
			availableOptions,
			{
				onDidSelectItem: async (item) => {
					// Separators have no onSelect handler.
					(item as any).onSelect?.(true);
				},
			}
		);
		if (!result || !result.onSelect) {
			await this.config.setTheme(originalTheme);
			await this.config.setAppearance(originalAppearance);
			return;
		}
		result.onSelect(false);
	}
}

function withFirstUnique<T>(items: T[], firstItem: T): T[] {
	const filtered = items.filter(t => t !== firstItem);
	return [firstItem, ...filtered];
}

async function fileExists(uri: Uri): Promise<boolean> {
	try {
		await workspace.fs.stat(uri);
		return true;
	} catch (e) {
		return false;
	}
}

function removeEnd(value: string, end: string): string {
	if (!value.endsWith(end)) {
		throw new Error(`Value does not end with "${end}"!`);
	}
	return value.substr(0, value.length - end.length);
}
