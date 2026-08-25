import { sendEvent } from "./vscode";

/**
 * Copier une sélection doit produire du SVG, pas seulement du XML Draw.io.
 *
 * Draw.io sait déjà le faire (`copySvg`, câblé sur Ctrl+Alt+Maj+X) : on le
 * branche sur les deux gestes usuels, l'action `copy` (menu Édition et clic
 * droit) et l'événement `copy` du navigateur (Ctrl+C).
 *
 * L'écriture système contient trois saveurs : `text/html` avec le SVG en
 * `data:` (ce que lisent Word, PowerPoint, Outlook…), `image/svg+xml` pour les
 * applications qui la gèrent, et l'attribut `content` du SVG qui porte le XML
 * des cellules — un rappel dans Draw.io reste donc éditable.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "copy-selection-as-svg" });

	const graph = ui.editor.graph;

	/** Cellules copiables de la sélection courante, sommets les plus hauts. */
	function selectedCells(): DrawioCell[] {
		return mxUtils.sortCells(
			graph.model.getTopmostCells(
				graph.getExportableCells(graph.getSelectionCells())
			)
		);
	}

	function canCopyAsSvg(): boolean {
		return (
			graph.isEnabled() &&
			!graph.isSelectionEmpty() &&
			// Une boîte de dialogue ouverte : le presse-papiers y appartient.
			(ui as any).dialog == null &&
			// Une étiquette en cours d'édition : c'est du texte qu'on copie.
			!graph.isEditing()
		);
	}

	function copyAsSvg(): void {
		const cells = selectedCells();
		if (cells.length === 0) {
			return;
		}

		let xml: string | null = null;
		try {
			xml = mxUtils.getXml(graph.encodeCells(cells));
		} catch (e) {
			// Sans XML le SVG reste utilisable, simplement non éditable au
			// retour dans Draw.io.
		}

		ui.copySvg(cells, xml);
	}

	// 1. Action `copy` : menu Édition et menu contextuel du clic droit.
	const copyAction = ui.actions.get("copy");
	if (copyAction != null) {
		const oldFunct = copyAction.funct;
		copyAction.funct = function (...args: any[]) {
			oldFunct.apply(this, args);

			if (canCopyAsSvg()) {
				copyAsSvg();
			}
		};
	}

	// 2. Ctrl+C : Draw.io passe par l'événement `copy` d'un champ caché, dont
	//    le comportement par défaut écrase le presse-papiers avec le seul XML.
	//    On l'annule en phase de capture (donc avant le gestionnaire de
	//    Draw.io, qui garde son presse-papiers interne pour le collage local)
	//    et on écrit nous-mêmes, l'événement valant geste utilisateur.
	document.addEventListener(
		"copy",
		(evt) => {
			// `clipboardElt` est le champ caché que Draw.io focalise pour ses
			// raccourcis presse-papiers : s'en servir de repère évite de
			// détourner une copie de texte faite ailleurs dans l'interface.
			const clipboardElt = (ui as any).clipboardElt as Node | undefined;
			if (
				!evt.isTrusted ||
				clipboardElt == null ||
				evt.target !== clipboardElt ||
				!canCopyAsSvg()
			) {
				return;
			}

			evt.preventDefault();
			copyAsSvg();
		},
		true
	);
});
