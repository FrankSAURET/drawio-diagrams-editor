import { l10n } from "vscode";
import * as vscode from "vscode";

/** Éditeur personnalisé des diagrammes stockés en texte (.drawio, .dio, *.svg). */
export const TEXT_VIEW_TYPE = "electropol-fr.drawio-diagrams-editor-text";
/** Éditeur personnalisé des diagrammes stockés en binaire (*.drawio.png). */
export const BINARY_VIEW_TYPE = "electropol-fr.drawio-diagrams-editor";

/** Éditeur personnalisé à utiliser pour un fichier donné. */
export function viewTypeFor(uri: vscode.Uri): string {
	return /\.(drawio|dio)\.png$/i.test(uri.path)
		? BINARY_VIEW_TYPE
		: TEXT_VIEW_TYPE;
}

/** Vrai si l'onglet est un diagramme ouvert dans un de nos éditeurs. */
export function isDiagramTab(tab: vscode.Tab): boolean {
	return (
		tab.input instanceof vscode.TabInputCustom &&
		(tab.input.viewType === TEXT_VIEW_TYPE ||
			tab.input.viewType === BINARY_VIEW_TYPE)
	);
}

/**
 * Onglet de diagramme déjà ouvert dans la fenêtre, vu depuis les GROUPES
 * D'ONGLETS : un éditeur personnalisé restauré n'est résolu que lorsqu'il
 * devient visible, une session vivante ne suffit donc pas à le repérer.
 *
 * Priorité : onglet actif du groupe actif, puis onglet actif d'un autre groupe,
 * puis premier diagramme trouvé.
 */
export function findOpenDiagramTab(): vscode.Tab | undefined {
	const groups = vscode.window.tabGroups.all;
	const activeGroup = vscode.window.tabGroups.activeTabGroup;
	const ordered = [
		...(activeGroup ? [activeGroup] : []),
		...groups.filter((g) => g !== activeGroup),
	];
	for (const group of ordered) {
		if (group.activeTab && isDiagramTab(group.activeTab)) {
			return group.activeTab;
		}
	}
	for (const group of ordered) {
		const found = group.tabs.find(isDiagramTab);
		if (found) {
			return found;
		}
	}
	return undefined;
}

/** Compteur d'« sans titre » : une URI identique révélerait l'onglet existant. */
let untitledCounter = 0;

/**
 * Ouvre un nouveau diagramme vierge dans un onglet plein format, SANS créer de
 * fichier ni afficher de boîte de dialogue : le document est « sans titre »
 * (untitled), donc le point ● et le choix de l'emplacement n'arrivent qu'au
 * premier enregistrement.
 */
export async function openNewDiagram(): Promise<void> {
	const suffix = untitledCounter === 0 ? "" : ` ${untitledCounter + 1}`;
	untitledCounter++;
	const name = l10n.t("New diagram") + suffix + ".drawio";
	const uri = vscode.Uri.parse("untitled:" + name);
	// Le modèle sans titre est créé AVANT l'ouverture : l'éditeur personnalisé
	// est un éditeur de TEXTE, il lui faut un document résolvable. L'extension
	// « .drawio » du nom donne au passage le bon langage à VS Code.
	await vscode.workspace.openTextDocument(uri);
	await vscode.commands.executeCommand(
		"vscode.openWith",
		uri,
		TEXT_VIEW_TYPE
	);
}

/**
 * Clic sur l'icône Draw.io : révèle le diagramme déjà ouvert s'il y en a un,
 * sinon ouvre un nouveau diagramme vierge.
 */
export async function openOrRevealDiagram(): Promise<void> {
	const tab = findOpenDiagramTab();
	if (tab && tab.input instanceof vscode.TabInputCustom) {
		try {
			// Rouvrir la MÊME uri dans le MÊME viewType ne duplique rien :
			// VS Code active l'onglet en place (et le résout au passage).
			await vscode.commands.executeCommand(
				"vscode.openWith",
				tab.input.uri,
				tab.input.viewType,
				tab.group.viewColumn
			);
			return;
		} catch {
			// Fichier disparu du disque : on n'abandonne pas l'utilisateur.
		}
	}
	await openNewDiagram();
}
