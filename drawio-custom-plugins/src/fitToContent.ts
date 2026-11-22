import { sendEvent } from "./vscode";

/**
 * Deux entrées « ajuster au contenu » :
 *  - menu Zoom : « Ajuster au contenu », juste après « Ajuster à la fenêtre ».
 *    Cette dernière cadre les pages quand la vue des pages est active ; la
 *    nouvelle cadre toujours les formes dessinées, au zoom le plus fort.
 *  - menu des pages (bouton ≡ en bas à gauche, sous-menu de la page courante)
 *    et clic droit sur un onglet : « Ajuster la page au contenu ». Le format
 *    de la page prend la taille du contenu, et le contenu est déplacé à
 *    l'origine : Draw.io aligne les pages sur des multiples de leur taille,
 *    une page ajustée ne tombe juste que si le dessin part de (0, 0).
 *    Le tout en une seule étape d'annulation.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "fit-to-content" });

	const anyUi = ui as any;
	const anyWindow = window as any;

	// Libellés absents du dictionnaire de Draw.io : petit dictionnaire local.
	const strings: { [lang: string]: { [key: string]: string } } = {
		fr: {
			fitContent: "Ajuster au contenu",
			fitPageToContent: "Ajuster la page au contenu",
		},
	};
	const lang = String(anyWindow.mxLanguage || "en")
		.split("-")[0]
		.toLowerCase();
	const t = (key: string, fallback: string) =>
		(strings[lang] && strings[lang][key]) || fallback;

	const fitContentAction = "vscode.fitContent";
	const fitPageAction = "vscode.fitPageToContent";
	mxResources.parse(`${fitContentAction}=${t("fitContent", "Fit to Content")}`);
	mxResources.parse(
		`${fitPageAction}=${t("fitPageToContent", "Fit Page to Content")}`
	);

	/** Zoom maximal qui montre tout le contenu, sélection ignorée. */
	ui.actions.addAction(fitContentAction, () => {
		anyUi.setFitWindowEnabled(false);
		anyUi.fitDiagramToWindow(null, null, false, true);
	});

	/** Taille de la page = boîte du contenu, contenu ramené à l'origine. */
	function fitPageToContent(): void {
		const graph = anyUi.editor.graph;
		const model = graph.getModel();
		const b = graph.getGraphBounds();

		if (b == null || b.width == 0 || b.height == 0) {
			return;
		}

		// Boîte à l'écran → coordonnées du modèle, arrondie à l'entier.
		const s = graph.view.scale;
		const tr = graph.view.translate;
		const x0 = Math.floor(b.x / s - tr.x);
		const y0 = Math.floor(b.y / s - tr.y);
		const x1 = Math.ceil((b.x + b.width) / s - tr.x);
		const y1 = Math.ceil((b.y + b.height) / s - tr.y);
		const scale = graph.pageScale || 1;
		const format = new anyWindow.mxRectangle(
			0,
			0,
			(x1 - x0) / scale,
			(y1 - y0) / scale
		);

		model.beginUpdate();
		try {
			if (x0 != 0 || y0 != 0) {
				// Toutes les formes de tous les calques bougent ensemble :
				// aucun lien n'est décroché.
				const cells: any[] = [];
				const root = model.getRoot();
				for (let i = 0; i < model.getChildCount(root); i++) {
					const layer = model.getChildAt(root, i);
					for (let j = 0; j < model.getChildCount(layer); j++) {
						cells.push(model.getChildAt(layer, j));
					}
				}
				graph.moveCells(cells, -x0, -y0);
			}

			const pf = graph.pageFormat;
			if (pf == null || pf.width != format.width || pf.height != format.height) {
				const change = new anyWindow.ChangePageSetup(ui, null, null, format);
				change.ignoreColor = true;
				change.ignoreImage = true;
				model.execute(change);
			}
		} finally {
			model.endUpdate();
		}

		if (graph.pageVisible) {
			ui.actions.get("fitPage").funct();
		}
	}

	ui.actions.addAction(fitPageAction, fitPageToContent);

	// Menu Zoom : insertion juste après « Ajuster à la fenêtre ». On ne peut
	// pas remplacer `viewZoom.funct` : la liste déroulante du zoom (barre
	// d'outils) en garde une référence prise AVANT le chargement des greffons
	// (`createZoomInput` → `addMenuHandler(zoomInput, zoomMenu.funct)`).
	// On intercepte donc en permanence `addMenuItems`, appelé par ce menu
	// avec la liste `['resetView', 'fitWindow', '-']` (Menus.js) — seule
	// liste de Draw.io qui contienne `fitWindow`.
	const menus = anyUi.menus;
	const oldAdd = menus.addMenuItems;
	menus.addMenuItems = function (
		this: any,
		menu: any,
		keys: string[],
		...rest: any[]
	) {
		const i = Array.isArray(keys) ? keys.indexOf("fitWindow") : -1;
		if (i >= 0 && keys.indexOf(fitContentAction) < 0) {
			keys = keys.slice();
			keys.splice(i + 1, 0, fitContentAction);
		}
		return oldAdd.call(this, menu, keys, ...rest);
	};

	// Sous-menu de la page courante (bouton ≡ des pages).
	const currentPageMenu = ui.menus.get("currentPage");
	if (currentPageMenu != null) {
		const oldFunct = currentPageMenu.funct;
		currentPageMenu.funct = function (this: any, menu: any, parent: any) {
			oldFunct.apply(this, arguments);
			if (anyUi.editor.graph.isEnabled()) {
				ui.menus.addMenuItems(menu, ["-", fitPageAction], parent);
			}
		};
	}

	// Clic droit sur un onglet : la page visée devient la page courante.
	const oldCreatePageMenu = anyUi.createPageMenu;
	if (typeof oldCreatePageMenu === "function") {
		anyUi.createPageMenu = function (this: any, page: any, label: any) {
			const build = oldCreatePageMenu.apply(this, arguments);
			return (menu: any, parent: any) => {
				build(menu, parent);
				if (anyUi.editor.graph.isEnabled()) {
					menu.addSeparator(parent);
					menu.addItem(
						mxResources.get(fitPageAction),
						null,
						() => {
							if (page != null && page != anyUi.currentPage) {
								anyUi.selectPage(page);
							}
							fitPageToContent();
						},
						parent
					);
				}
			};
		};
	}
});
