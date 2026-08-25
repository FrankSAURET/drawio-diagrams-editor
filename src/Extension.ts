import { l10n } from "vscode";
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
import { WorkingFolder } from "./utils/workingFolder";
import {
	isDiagramTab,
	openNewDiagram,
	viewTypeFor,
} from "./utils/diagramTabs";

export class Extension {
	public readonly dispose = Disposable.fn();
	private readonly log = this.dispose.track(
		vscode.window.createOutputChannel("Drawio Integration Log")
	);

	private readonly config = new Config(this.context.globalState);
	private readonly drawioClientFactory = new DrawioClientFactory(
		this.config,
		this.log,
		this.context.extensionUri,
		versionLabelFor(this.context)
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
	/** Dossier courant : celui du dernier diagramme ouvert ou enregistré. */
	private readonly workingFolder = new WorkingFolder(
		this.context.globalState
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
					// Aucun fichier créé, aucune boîte de dialogue : le
					// diagramme est un document « sans titre ». L'emplacement
					// n'est demandé qu'au premier enregistrement.
					await openNewDiagram();
				}
			)
		);

		this.dispose.track(
			registerFailableCommand(
				"electropol-fr.drawio-diagrams-editor.openDiagram",
				async () => {
					const uris = await vscode.window.showOpenDialog({
						canSelectMany: false,
						defaultUri: this.workingFolder.defaultUri(),
						filters: {
							[l10n.t("Draw.io Diagrams")]: [
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
					const viewType = viewTypeFor(targetUri);

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

		// Dossier courant : tout diagramme qui apparaît dans un onglet fixe le
		// dossier proposé par les dialogues suivants — qu'il vienne de la boîte
		// « Ouvrir », de l'Explorateur Windows, ou du premier enregistrement
		// d'un document sans titre.
		this.dispose.track(
			vscode.window.tabGroups.onDidChangeTabs((e) => {
				for (const tab of [...e.opened, ...e.changed]) {
					if (
						isDiagramTab(tab) &&
						tab.input instanceof vscode.TabInputCustom
					) {
						this.workingFolder.rememberFile(tab.input.uri);
					}
				}
			})
		);
	}
}

/**
 * Numéro affiché dans la barre de menus de l'éditeur.
 *
 * Les deux numéros sont montrés en permanence, à la demande expresse de Frank :
 * le `buildNumber` est la version publique suivie du numéro de lot, donc
 * `v2026.8.0.10` se lit « version 2026.8.0, lot 10 ».
 */
function versionLabelFor(context: vscode.ExtensionContext): string {
	const manifest = context.extension.packageJSON as {
		version?: string;
		buildNumber?: string;
	};
	const version = manifest.buildNumber ?? manifest.version ?? "";
	return version ? `v${version}` : "";
}
