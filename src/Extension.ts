import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";
import { DrawioEditorProviderBinary } from "./DrawioEditorProviderBinary";
import { DrawioEditorProviderText } from "./DrawioEditorProviderText";
import { Config } from "./Config";
import { DrawioEditorService } from "./DrawioEditorService";
import { LinkCodeWithSelectedNodeService } from "./features/CodeLinkFeature";
import { EditDiagramAsTextFeature } from "./features/EditDiagramAsTextFeature";
import { LiveshareFeature } from "./features/LiveshareFeature";
import { ToggleEditorFeature } from "./features/ToggleEditorFeature";
import { ActivityBarFeature } from "./features/ActivityBarFeature";
import { DrawioUpdateFeature } from "./features/DrawioUpdateFeature";
import { FileAssociationFeature } from "./features/FileAssociationFeature";
import { DrawioClientFactory } from "./DrawioClient";
import { registerFailableCommand } from "./utils/registerFailableCommand";

export class Extension {
	public readonly dispose = Disposable.fn();
	private readonly log = this.dispose.track(
		vscode.window.createOutputChannel("Drawio Integration Log")
	);

	private readonly config = new Config(this.context.globalState);
	private readonly drawioClientFactory = new DrawioClientFactory(
		this.config,
		this.log,
		this.context.extensionUri
	);
	private readonly editorService = new DrawioEditorService(
		this.config,
		this.drawioClientFactory
	);
	private readonly linkCodeWithSelectedNodeService = this.dispose.track(
		new LinkCodeWithSelectedNodeService(this.editorService, this.config)
	);
	private readonly editDiagramsAsTextFeature = this.dispose.track(
		new EditDiagramAsTextFeature(this.editorService, this.config)
	);
	private readonly liveshareFeature = this.dispose.track(
		new LiveshareFeature(this.editorService, this.config)
	);
	private readonly toggleEditorFeature = this.dispose.track(
		new ToggleEditorFeature()
	);
	private readonly activityBarFeature = this.dispose.track(
		new ActivityBarFeature()
	);
	private readonly drawioUpdateFeature = this.dispose.track(
		new DrawioUpdateFeature(this.context.globalState)
	);
	private readonly fileAssociationFeature = this.dispose.track(
		new FileAssociationFeature(
			this.context.globalState,
			this.context.extensionUri
		)
	);

	constructor(private readonly context: vscode.ExtensionContext) {
		this.dispose.track(
			vscode.window.registerCustomEditorProvider(
				"electropol-fr.drawio-diagrams-editor-text",
				new DrawioEditorProviderText(this.editorService),
				{ webviewOptions: { retainContextWhenHidden: true } }
			)
		);

		this.dispose.track(
			vscode.window.registerCustomEditorProvider(
				"electropol-fr.drawio-diagrams-editor",
				new DrawioEditorProviderBinary(this.editorService),
				{
					supportsMultipleEditorsPerDocument: false,
					webviewOptions: { retainContextWhenHidden: true },
				}
			)
		);

		this.dispose.track(
			registerFailableCommand(
				"electropol-fr.drawio-diagrams-editor.newDiagram",
				async () => {
					const targetUri = await vscode.window.showSaveDialog({
						saveLabel: "Create",
						filters: {
							Diagrams: ["drawio"],
						},
					});
					if (!targetUri) {
						return;
					}
					try {
						await vscode.workspace.fs.writeFile(
							targetUri,
							new Uint8Array()
						);
						await vscode.commands.executeCommand(
							"vscode.openWith",
							targetUri,
							"electropol-fr.drawio-diagrams-editor-text"
						);
					} catch (e) {
						console.error("Cannot create or open file", e);
						await vscode.window.showErrorMessage(
							`Cannot create or open file "${targetUri.toString()}"!`
						);
					}
				}
			)
		);

		this.dispose.track(
			registerFailableCommand(
				"electropol-fr.drawio-diagrams-editor.openDiagram",
				async () => {
					const uris = await vscode.window.showOpenDialog({
						canSelectMany: false,
						filters: {
							"Draw.io Diagrams": [
								"drawio",
								"dio",
								"drawio.svg",
								"dio.svg",
								"drawio.png",
								"dio.png",
							],
						},
					});
					if (!uris || uris.length === 0) {
						return;
					}
					const targetUri = uris[0];

					// Le fichier n'a pas besoin d'appartenir au workspace :
					// les éditeurs personnalisés acceptent n'importe quel URI.
					// On ouvre explicitement avec le bon viewType, ce qui
					// contourne aussi un `workbench.editorAssociations`
					// réglé sur "default" pour *.drawio.
					const viewType = /\.(drawio|dio)\.png$/i.test(targetUri.path)
						? "electropol-fr.drawio-diagrams-editor"
						: "electropol-fr.drawio-diagrams-editor-text";

					try {
						await vscode.commands.executeCommand(
							"vscode.openWith",
							targetUri,
							viewType
						);
					} catch (e) {
						// Extension non gérée par un éditeur personnalisé :
						// on retombe sur l'ouverture par défaut.
						await vscode.commands.executeCommand(
							"vscode.open",
							targetUri
						);
					}
				}
			)
		);
	}
}
