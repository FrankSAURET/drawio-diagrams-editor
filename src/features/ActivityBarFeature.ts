import { l10n } from "vscode";
import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";

/**
 * Vue Draw.io de la barre d'activité : une seule entrée, « Drawio », qui
 * lance l'éditeur. La vue est repliée au démarrage (voir `visibility`
 * dans package.json) pour ne pas s'ouvrir toute seule.
 */
export class ActivityBarFeature {
	public readonly dispose = Disposable.fn();

	constructor(extensionUri: vscode.Uri) {
		this.dispose.track(
			vscode.window.registerTreeDataProvider(
				"drawio-diagrams-editor-welcome",
				new DrawioLauncherTreeDataProvider(extensionUri)
			)
		);
	}
}

class DrawioLauncherTreeDataProvider
	implements vscode.TreeDataProvider<string>
{
	constructor(private readonly extensionUri: vscode.Uri) {}

	getTreeItem(): vscode.TreeItem {
		const item = new vscode.TreeItem("Drawio");
		item.iconPath = vscode.Uri.joinPath(
			this.extensionUri,
			"media",
			"drawio-icon.svg"
		);
		item.tooltip = l10n.t("Launch Draw.io");
		item.command = {
			command: "electropol-fr.drawio-diagrams-editor.newDiagram",
			title: "Drawio",
		};
		return item;
	}

	getChildren(): string[] {
		return ["drawio"];
	}
}
