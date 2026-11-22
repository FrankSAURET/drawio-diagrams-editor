import { sendEvent } from "./vscode";
import { convertHtmlLabels } from "./htmlLabelsToSvg";

/**
 * Export SVG lisible hors navigateur : étiquettes HTML → texte SVG natif.
 *
 * Même conversion que la copie (htmlLabelsToSvg.ts), appliquée au seul
 * `EditorUi.exportSvg` (Fichier → Exporter en → SVG). Les fichiers
 * `.drawio.svg` enregistrés par l'extension passent par le protocole
 * « embed » (`xmlsvg`), pas par cette fonction : ils ne sont pas touchés.
 *
 * `exportSvg` appelle `Graph.getSvg` de façon synchrone (la reprise après
 * attente des contours rappelle `this.exportSvg`, donc ce même habillage) :
 * un drapeau posé pendant l'appel suffit à reconnaître l'export.
 *
 * Diagramme avec formules (MathJax) : non converti, les formules se
 * composent après coup dans le HTML des étiquettes.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "export-svg-text" });

	const anyUi = ui as any;
	const Graph = (window as any).Graph;
	let exporting = 0;

	const oldExportSvg = anyUi.exportSvg;
	anyUi.exportSvg = function (...args: any[]) {
		exporting++;
		try {
			return oldExportSvg.apply(this, args);
		} finally {
			exporting--;
		}
	};

	// Chargé après svgCompat : cet habillage l'entoure, donc la conversion
	// voit des couleurs déjà résolues pour le thème demandé.
	const oldGetSvg = Graph.prototype.getSvg;
	Graph.prototype.getSvg = function (...args: any[]) {
		if (exporting === 0 || this.mathEnabled) {
			return oldGetSvg.apply(this, args);
		}
		// Plus aucun foreignObject à la sortie : le lien « Text is not SVG -
		// cannot display » n'a plus lieu d'être.
		const oldWarning = this.addForeignObjectWarning;
		this.addForeignObjectWarning = function () {};
		let root: Element;
		try {
			root = oldGetSvg.apply(this, args);
		} finally {
			this.addForeignObjectWarning = oldWarning;
		}
		try {
			convertHtmlLabels(root);
		} catch (e) {
			// Étiquettes laissées en HTML : export valable en navigateur.
			console.error("exportSvgText", e);
		}
		return root;
	};
});
