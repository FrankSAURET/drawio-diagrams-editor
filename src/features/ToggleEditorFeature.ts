import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";

export class ToggleEditorFeature {
	public readonly dispose = Disposable.fn();

	constructor() {
		this.dispose.track(
			vscode.commands.registerCommand(
				"electropol-fr.DrawIo_In_VsCode.openAsText",
				this.openAsText
			)
		);
		this.dispose.track(
			vscode.commands.registerCommand(
				"electropol-fr.DrawIo_In_VsCode.openAsDiagram",
				this.openAsDiagram
			)
		);
	}

	private openAsText = async () => {
		const uri = this.getActiveEditorUri();
		if (!uri) {
			return;
		}
		await vscode.commands.executeCommand(
			"vscode.openWith",
			uri,
			"default",
			vscode.ViewColumn.Beside
		);
	};

	private openAsDiagram = async () => {
		const uri = this.getActiveEditorUri();
		if (!uri) {
			return;
		}
		const viewType = /\.(drawio|dio)\.(png)$/i.test(uri.fsPath)
			? "electropol-fr.DrawIo_In_VsCode"
			: "electropol-fr.DrawIo_In_VsCode-text";

		await vscode.commands.executeCommand(
			"vscode.openWith",
			uri,
			viewType,
			vscode.ViewColumn.Beside
		);
	};

	private getActiveEditorUri(): vscode.Uri | undefined {
		// When in a custom editor (drawio), activeTextEditor is undefined.
		// Use the tab API to retrieve the URI from the active tab.
		const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
		if (!activeTab) {
			return undefined;
		}
		const input = activeTab.input;
		if (input instanceof vscode.TabInputCustom) {
			return input.uri;
		}
		if (input instanceof vscode.TabInputText) {
			return input.uri;
		}
		return vscode.window.activeTextEditor?.document.uri;
	}
}
