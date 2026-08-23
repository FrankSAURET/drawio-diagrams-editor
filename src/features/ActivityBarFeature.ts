import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";
import { openOrRevealDiagram } from "../utils/diagramTabs";

/**
 * Délai, à partir de la création de la vue, en deçà duquel une visibilité est
 * mise sur le compte de la restauration de session et non d'un clic.
 *
 * L'extension s'active sur `onStartupFinished` : la restauration du volet suit
 * la création de la vue de quelques millisecondes, tandis qu'un clic humain
 * demande au bas mot une demi-seconde. Un délai plus long (l'âge du processus
 * hôte, par exemple) avalerait les vrais clics d'un utilisateur pressé.
 */
const RESTORE_WINDOW_MS = 400;

/**
 * Icône Draw.io de la barre d'activité. Le volet lui-même est VIDE et n'a
 * aucune vocation à rester affiché : cliquer l'icône ouvre directement un
 * onglet Draw.io plein format, puis referme la barre latérale.
 *
 * Le mécanisme est celui d'un volet « bouton » : VS Code n'expose pas de clic
 * sur l'icône d'un conteneur, on écoute donc la visibilité de la vue.
 */
export class ActivityBarFeature {
	public readonly dispose = Disposable.fn();

	/** Anti-doublon : un même clic peut déclencher deux chemins d'ouverture. */
	private lastOpen = 0;
	/** Instant à partir duquel une visibilité vaut vraiment « clic ». */
	private readonly readyAt = Date.now() + RESTORE_WINDOW_MS;

	constructor() {
		const view = this.dispose.track(
			vscode.window.createTreeView(
				"drawio-diagrams-editor-welcome",
				{
					treeDataProvider: {
						getChildren: () => [],
						getTreeItem: (item: vscode.TreeItem) => item,
					},
				}
			)
		);

		this.dispose.track(
			view.onDidChangeVisibility((e) => {
				if (e.visible) {
					this.launch();
				}
			})
		);

		// Pas de rattrapage « déjà visible à l'activation » : il rouvrirait un
		// diagramme à chaque démarrage dès lors que la barre latérale a été
		// restaurée sur le volet Draw.io.
	}

	private launch(): void {
		const now = Date.now();
		if (now < this.readyAt || now - this.lastOpen < 500) {
			return;
		}
		this.lastOpen = now;

		// La barre latérale est refermée TOUT DE SUITE : le volet est vide, il
		// n'a rien à afficher, et l'onglet s'ouvre ainsi en plein format sans
		// que l'utilisateur voie passer un volet blanc.
		void vscode.commands.executeCommand("workbench.action.closeSidebar");
		void openOrRevealDiagram();
	}
}
