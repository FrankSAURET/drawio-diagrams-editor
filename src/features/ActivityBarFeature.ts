import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";
import { openOrRevealDiagram } from "../utils/diagramTabs";

/**
 * Fenêtre de démarrage pendant laquelle un volet Draw.io visible est mis sur le
 * compte de la restauration de session, pas d'un clic de l'utilisateur. Mesurée
 * depuis le lancement du processus hôte, pas depuis l'activation.
 */
const STARTUP_GRACE_MS = 3000;

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
	private startupSettled: boolean;
	/** Instant à partir duquel une visibilité vaut vraiment « clic ». */
	private readonly readyAt = Date.now() + 1500;

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

		// Garde-fou de démarrage : la restauration de session peut faire
		// transiter le volet hidden→visible sans action de l'utilisateur, ce
		// qui ouvrirait un diagramme au lancement. Le repère est l'âge du
		// processus hôte, qui démarre bien avec la fenêtre.
		const sinceWindowStart =
			typeof process !== "undefined" && process.uptime
				? process.uptime() * 1000
				: STARTUP_GRACE_MS;
		this.startupSettled = sinceWindowStart >= STARTUP_GRACE_MS;
		if (!this.startupSettled) {
			const timer = setTimeout(() => {
				this.startupSettled = true;
			}, STARTUP_GRACE_MS - sinceWindowStart);
			this.dispose.track({ dispose: () => clearTimeout(timer) });
		}

		this.dispose.track(
			view.onDidChangeVisibility((e) => {
				if (e.visible) {
					this.launch();
				}
			})
		);

		// Pas de rattrapage « déjà visible à l'activation » : l'extension
		// s'active au démarrage de VS Code (onStartupFinished), donc le
		// listener est en place bien avant qu'un clic soit possible. En
		// ajouter un rouvrirait un diagramme à chaque démarrage dès lors que
		// la barre latérale a été restaurée sur le volet Draw.io.
	}

	private launch(): void {
		const now = Date.now();
		if (
			!this.startupSettled ||
			now < this.readyAt ||
			now - this.lastOpen < 500
		) {
			// Restauration de session : le volet peut passer hidden→visible
			// sans le moindre clic, juste après l'activation.
			return;
		}
		this.lastOpen = now;
		void openOrRevealDiagram().then(() =>
			// Le volet est vide : il n'a rien à afficher, on rend la place au
			// diagramme (« plein format »).
			vscode.commands.executeCommand("workbench.action.closeSidebar")
		);
	}
}
