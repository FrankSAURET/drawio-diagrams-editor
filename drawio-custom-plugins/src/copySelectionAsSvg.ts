import { sendEvent } from "./vscode";
import { convertHtmlLabels } from "./htmlLabelsToSvg";

/**
 * Copier une sélection produit un SVG, avec le XML Draw.io dedans.
 *
 * Branché sur les deux gestes usuels : l'action `copy` (menu Édition et clic
 * droit) et l'événement `copy` du navigateur (Ctrl+C). « Copier en SVG »
 * devient inutile et disparaît des menus.
 *
 * Saveurs écrites :
 * - `image/svg+xml` : le dessin, lu par Word, PowerPoint, Inkscape… ;
 * - `text/plain` : la même source SVG, pour les programmes qui ne lisent que du
 *   texte, et pour le retour dans Draw.io (Chromium n'expose pas l'image à
 *   l'événement `paste` ; pasteSvgText.ts reprend ce texte). L'attribut
 *   `content` du SVG porte le XML des cellules : le dessin recollé reste
 *   modifiable.
 *
 * Pas de `text/html` (ce que fait Draw.io : `<img src="data:…">`) : Word lit
 * cette saveur en premier, ne sait pas charger l'image en `data:` et colle un
 * cadre vide. Word garde bien l'image quand `image/svg+xml` et `text/plain`
 * sont présents ensemble (vérifié par automatisation de Word).
 *
 * Thème clair imposé : Draw.io prenait le thème sombre dès que VS Code l'était,
 * et le dessin collé dans un document arrivait en couleurs inversées.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "copy-selection-as-svg" });

	const anyUi = ui as any;
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
			anyUi.dialog == null &&
			// Une étiquette en cours d'édition : c'est du texte qu'on copie.
			!graph.isEditing()
		);
	}

	/** SVG des cellules, au thème clair, sans l'avertissement de texte. */
	function createSvg(cells: DrawioCell[], xml?: string | null, scale?: number): string {
		const g = graph as any;
		// « Text is not SVG - cannot display » : lien de secours que Word et
		// Inkscape affichent par-dessus le dessin. Draw.io le retire aussi
		// quand il intègre un SVG ailleurs.
		const oldWarning = g.addForeignObjectWarning;
		g.addForeignObjectWarning = function () {};
		try {
			const svgRoot: Element = g.getSvg(
				null, scale, null, null, null, null, null, null, null, null,
				null, "light", null, cells.length > 0 ? cells : null
			);
			// Gras, italique, centrage, traits `<hr>` : hors navigateur, seul
			// du texte SVG natif les conserve.
			convertHtmlLabels(svgRoot);
			if (xml != null) {
				svgRoot.setAttribute("content", xml);
			}
			return mxUtils.getXml(svgRoot);
		} finally {
			g.addForeignObjectWarning = oldWarning;
		}
	}

	// Remplace EditorUi.copySvg : sert aussi le raccourci Ctrl+Alt+Maj+X.
	anyUi.copySvg = function (cells: DrawioCell[], xml?: string | null, scale?: number) {
		try {
			const ClipboardItemCtor = (window as any).ClipboardItem;
			if (navigator.clipboard == null || typeof ClipboardItemCtor !== "function") {
				return;
			}
			const svg = createSvg(cells, xml, scale);
			const data: Record<string, Blob> = {
				"text/plain": new Blob([svg], { type: "text/plain" }),
			};
			if (ClipboardItemCtor.supports == null || ClipboardItemCtor.supports("image/svg+xml")) {
				data["image/svg+xml"] = new Blob([svg], { type: "image/svg+xml" });
			}
			navigator.clipboard
				.write([new ClipboardItemCtor(data)])
				.catch((e: any) => anyUi.handleError(e));
		} catch (e) {
			anyUi.handleError(e);
		}
	};

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

		anyUi.copySvg(cells, xml);
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

	// « Copier en SVG » fait double emploi avec « Copier » : retiré des menus
	// (Édition et clic droit), qui sautent les actions invisibles.
	const copyAsSvgAction = ui.actions.get("copyAsSvg");
	if (copyAsSvgAction != null) {
		(copyAsSvgAction as any).visible = false;
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
			const clipboardElt = anyUi.clipboardElt as Node | undefined;
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
