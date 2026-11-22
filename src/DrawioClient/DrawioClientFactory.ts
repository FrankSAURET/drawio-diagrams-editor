import { l10n } from "vscode";
import {
	Webview,
	OutputChannel,
	Uri,
	window,
	WebviewPanel,
	workspace,
} from "vscode";
import {
	CustomizedDrawioClient,
	folderDrawioLibrary,
	simpleDrawioLibrary,
} from ".";
import { Config, DiagramConfig } from "../Config";
import html from "./webview-content.html";
import { getColoredIconUris } from "./coloredIcons";
import { formatValue } from "../utils/formatValue";
import { autorun, observable, runInAction, untracked } from "mobx";
import { sha256 } from "js-sha256";
import { getDrawioExtensions } from "../DrawioExtensionApi";
import { BufferImpl } from "../utils/buffer";

export class DrawioClientFactory {
	constructor(
		private readonly config: Config,
		private readonly log: OutputChannel,
		private readonly extensionUri: Uri,
		/** Numéro affiché dans la barre de menus de la webview. */
		private readonly versionLabel: string
	) { }

	public async createDrawioClientInWebview(
		uri: Uri,
		webviewPanel: WebviewPanel,
		options: DrawioClientOptions
	): Promise<CustomizedDrawioClient> {
		const config = this.config.getDiagramConfig(uri);
		const plugins = await this.getPlugins(config);

		const webview = webviewPanel.webview;

		webview.options = {
			enableScripts: true,
		};
		const reloadId = observable({ id: 0 });
		let i = 0;
		const disposeAutorun = autorun(
			() => {
				reloadId.id;
				// these getters triggers a reload on change
				config.customLibraries;
				config.libraryFolders;
				config.customFonts;
				config.presetColors;
				config.customColorSchemes;
				config.styles;
				config.defaultVertexStyle;
				config.defaultEdgeStyle;
				config.colorNames;
				config.simpleLabels;
				config.showLinkIcons;
				config.showTooltipIcons;
				config.showConnectHandle;
				config.zoomFactor;
				config.globalVars;
				config.resizeImages;
				const html =
					this.getHtml(config, options, webview, plugins) +
					" ".repeat(i++);

				if (config.isResizeImageUpdating) {
					config.isResizeImageUpdating = false;
				} else if (config.isDisplayOptionUpdating) {
					// Bascule venue des cases du panneau : deja appliquee dans la page.
				} else {
					webview.html = html;
				}
			},
			{ name: "Update Webview Html" }
		);

		const drawioClient = new CustomizedDrawioClient(
			{
				sendMessage: (msg) => {
					this.log.appendLine("vscode -> drawio: " + prettify(msg));
					webview.postMessage(msg);
				},
				registerMessageHandler: (handler) => {
					return webview.onDidReceiveMessage((msg) => {
						this.log.appendLine(
							"vscode <- drawio: " + prettify(msg)
						);
						handler(msg);
					});
				},
			},
			async () => {
				const libs = await config.customLibraries;
				const folderLibs = await config.libraryFolders;
				return {
					compressXml: false,
					customFonts: config.customFonts,
					presetColors: config.presetColors,
					customColorSchemes: config.customColorSchemes,
					styles: config.styles,
					defaultVertexStyle: config.defaultVertexStyle,
					defaultEdgeStyle: config.defaultEdgeStyle,
					colorNames: config.colorNames,
					simpleLabels: config.simpleLabels,
					showLinkIcons: config.showLinkIcons,
					showTooltipIcons: config.showTooltipIcons,
					showConnectHandle: config.showConnectHandle,
					defaultLibraries: "general",
					libraries: [
						...simpleDrawioLibrary(libs),
						...folderDrawioLibrary(folderLibs),
					],
					zoomFactor: config.zoomFactor,
					globalVars: config.globalVars,
				};
			},
			() => {
				runInAction("Force reload", () => {
					reloadId.id++;
				});
			}
		);

		drawioClient.onUnknownMessage.sub(({ message }) => {
			if (message.event === "updateLocalStorage") {
				const newLocalStorage = message.newLocalStorage;
				config.setLocalStorage(newLocalStorage);
			}
		});

		webviewPanel.onDidDispose(() => {
			disposeAutorun();
			drawioClient.dispose();
		});

		return drawioClient;
	}

	private async getPlugins(
		config: DiagramConfig
	): Promise<{ jsCode: string }[]> {
		const pluginsToLoad = new Array<{ jsCode: string }>();
		const promises = new Array<Promise<void>>();

		for (const ext of getDrawioExtensions()) {
			promises.push(
				(async () => {
					pluginsToLoad.push(
						...(await ext.getDrawioPlugins({ uri: config.uri }))
					);
				})()
			);
		}

		for (const p of config.plugins) {
			let jsCode: string;
			try {
				jsCode = BufferImpl.from(
					await workspace.fs.readFile(p.file)
				).toString("utf-8");
			} catch (e) {
				window.showErrorMessage(
					l10n.t('Could not read plugin file "{0}"!', `${p.file}`)
				);
				continue;
			}

			const fingerprint = sha256.hex(jsCode);
			const pluginId = p.file.toString();

			const isAllowed = this.config.isPluginAllowed(
				pluginId,
				fingerprint
			);
			if (isAllowed) {
				pluginsToLoad.push({ jsCode });
			} else if (isAllowed === undefined) {
				promises.push(
					(async () => {
						const result = await window.showWarningMessage(
							l10n.t(
								'Found unknown plugin "{0}" with fingerprint "{1}"',
								pluginId,
								fingerprint
							),
							{},
							{
								title: l10n.t("Allow"),
								action: async () => {
									pluginsToLoad.push({ jsCode });
									await this.config.addKnownPlugin(
										pluginId,
										fingerprint,
										true
									);
								},
							},
							{
								title: l10n.t("Disallow"),
								action: async () => {
									await this.config.addKnownPlugin(
										pluginId,
										fingerprint,
										false
									);
								},
							}
						);

						if (result) {
							await result.action();
						}
					})()
				);
			}
		}

		await Promise.all(promises);
		return pluginsToLoad;
	}

	private getHtml(
		config: DiagramConfig,
		options: DrawioClientOptions,
		webview: Webview,
		plugins: { jsCode: string }[]
	): string {
		if (config.mode.kind === "offline") {
			return this.getOfflineHtml(config, options, webview, plugins);
		} else {
			return this.getOnlineHtml(config, config.mode.url);
		}
	}

	private getOfflineHtml(
		config: DiagramConfig,
		options: DrawioClientOptions,
		webview: Webview,
		plugins: { jsCode: string }[]
	): string {
		const vsuri = webview.asWebviewUri(
			Uri.joinPath(this.extensionUri, "drawio/src/main/webapp")
		);
		const customPluginsPath = webview.asWebviewUri(
			// See webpack configuration.
			Uri.joinPath(
				this.extensionUri,
				"dist/custom-drawio-plugins/index.js"
			)
		);

		const localStorage = untracked(() => config.localStorage);

		// TODO use template engine
		// Prevent injection attacks by using JSON.stringify.
		const patchedHtml = html
			.replace(/\$\$literal-vsuri\$\$/g, vsuri.toString())
			.replace("$$theme$$", JSON.stringify(config.resolvedTheme.themeName))
			.replace("$$appearance$$", JSON.stringify(config.resolvedTheme.getAppearanceDrawioValue()))
			.replace(
				"$$coloredIcons$$",
				JSON.stringify(config.resolvedTheme.iconSet === "colore" ? getColoredIconUris() : null)
			)
			.replace("$$lang$$", JSON.stringify(config.drawioLanguage))
			.replace("$$versionLabel$$", JSON.stringify(this.versionLabel))
			.replace("$$simpleLabels$$", JSON.stringify(config.simpleLabels))
			.replace(
				"$$chrome$$",
				JSON.stringify(options.isReadOnly ? "0" : "1")
			)
			.replace(
				"$$customPluginPaths$$",
				JSON.stringify([customPluginsPath.toString()])
			)
			.replace("$$localStorage$$", JSON.stringify(localStorage))
			.replace(
				"$$additionalCode$$",
				JSON.stringify(plugins.map((p) => p.jsCode))
			);
		return patchedHtml;
	}

	private getOnlineHtml(config: DiagramConfig, drawioUrl: string): string {
		// Le relais ne parle qu'à l'origine de l'application configurée : les
		// données du diagramme ne peuvent pas partir vers une page où le cadre
		// aurait navigué. Une URL sans origine http(s) garde le relais ouvert.
		// frame-src reste ouvert (application auto-hébergée derrière une page
		// de connexion sur une autre origine).
		let drawioOrigin = "*";
		try {
			const url = new URL(drawioUrl);
			if (url.protocol === "https:" || url.protocol === "http:") {
				drawioOrigin = url.origin;
			}
		} catch {
			// URL non absolue
		}
		const nonce = getNonce();
		return `
			<html>
			<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; frame-src *;">
			<style>
				html { height: 100%; width: 100%; padding: 0; margin: 0; }
				body { height: 100%; width: 100%; padding: 0; margin: 0; }
				iframe { height: 100%; width: 100%; padding: 0; margin: 0; border: 0; display: block; }
			</style>
			</head>
			<body>
				<script nonce="${nonce}">
					const api = window.VsCodeApi = acquireVsCodeApi();
					const drawioOrigin = ${JSON.stringify(drawioOrigin)};
					window.addEventListener('message', event => {

						if (event.source === window.frames[0]) {
							//console.log("frame -> vscode", event.data);
							if (drawioOrigin === "*" || event.origin === drawioOrigin) {
								api.postMessage(event.data);
							}
						} else {
							//console.log("vscode -> frame", event.data);
							window.frames[0].postMessage(event.data, drawioOrigin);
						}
					});
				</script>

				<iframe src="${drawioUrl}?embed=1&ui=${encodeURIComponent(
			config.resolvedTheme.themeName
		)}&proto=json&configure=1&noSaveBtn=1&noExitBtn=1&simpleLabels=${encodeURIComponent(
			config.simpleLabels
		)}&lang=${encodeURIComponent(config.drawioLanguage)}"></iframe>
			</body>
		</html>
			`;
	}
}

export interface DrawioClientOptions {
	isReadOnly: boolean;
}

function getNonce(): string {
	let text = "";
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return text;
}

function prettify(msg: unknown): string {
	try {
		if (typeof msg === "string") {
			const obj = JSON.parse(msg as string);
			return formatValue(obj, process.env.DEV === "1" ? 500 : 80);
		}
		return formatValue(msg, process.env.DEV === "1" ? 500 : 80);
	} catch { }
	return "" + msg;
}
