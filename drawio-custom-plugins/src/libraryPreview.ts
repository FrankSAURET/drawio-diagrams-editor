import { sendEvent } from "./vscode";

/**
 * Aperçu des bibliothèques personnalisées dans « Plus de formes ».
 *
 * `MoreShapesDialog` sait afficher un aperçu de deux façons : une image toute
 * faite (`entry.image`) ou un habillage qui remplit lui-même le panneau
 * (`entry.imageCallback`). Mais il ne conserve `imageCallback` que pour les
 * jeux de formes livrés avec Draw.io : les sections venues de la
 * configuration (`sidebar.customEntries`, nos bibliothèques) sont recopiées
 * en ne gardant que `id`, `title`, `desc` et `preview`. Sans image fournie,
 * le panneau reste donc désespérément vide — le défaut signalé.
 *
 * Ce greffon reconstruit ces sections avec un `imageCallback` qui dessine les
 * formes de la bibliothèque, puis les passe par le troisième argument du
 * dialogue, le seul chemin qui les recopie telles quelles.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "library-preview" });

	const globals = window as any;
	const originalDialog = globals.MoreShapesDialog;

	if (typeof originalDialog !== "function") {
		return;
	}

	// Au-delà, le rendu de toutes les vignettes d'un coup fige la fenêtre : on
	// s'arrête et on annonce le reste en clair.
	const maxPreviewShapes = 300;

	const message = (parent: HTMLElement, text: string) => {
		const div = document.createElement("div");
		div.style.padding = "20px";
		div.style.textAlign = "center";
		div.style.color = "rgb(179, 179, 179)";
		div.textContent = text;
		parent.appendChild(div);
	};

	/** Dessine les formes d'une bibliothèque déjà lue dans le panneau. */
	const renderShapes = (parent: HTMLElement, images: any[]) => {
		const shapes = document.createElement("div");
		shapes.style.display = "flex";
		shapes.style.flexWrap = "wrap";
		shapes.style.alignItems = "flex-start";
		shapes.style.padding = "12px";
		shapes.style.textAlign = "center";
		parent.appendChild(shapes);

		if (!Array.isArray(images) || images.length === 0) {
			message(parent, mxResources.get("noPreview", null, "No preview"));
			return;
		}

		const shown = images.slice(0, maxPreviewShapes);
		ui.addLibraryEntries(shown, shapes);

		if (images.length > shown.length) {
			message(parent, `+ ${images.length - shown.length}`);
		}
	};

	/** Panneau d'aperçu d'une entrée : une ou plusieurs bibliothèques. */
	const previewEntry = (entry: any, parent: HTMLElement) => {
		const libs: any[] = entry.libs || [];

		if (libs.length === 0) {
			message(parent, mxResources.get("noPreview", null, "No preview"));
			return;
		}

		for (const lib of libs) {
			try {
				if (lib.data != null) {
					renderShapes(parent, lib.data);
				} else if (lib.url != null) {
					// Bibliothèque désignée par une adresse : elle n'est lue
					// qu'au moment où on la regarde.
					const loading = document.createElement("div");
					loading.style.padding = "20px";
					loading.textContent = `${mxResources.get("loading")}...`;
					parent.appendChild(loading);

					ui.editor.loadUrl(lib.url, (data: string) => {
						loading.remove();
						try {
							const doc = mxUtils.parseXml(data);
							if (doc.documentElement.nodeName !== "mxlibrary") {
								message(
									parent,
									mxResources.get("notALibraryFile")
								);
								return;
							}
							renderShapes(
								parent,
								JSON.parse(
									mxUtils.getTextContent(doc.documentElement)
								)
							);
						} catch (e) {
							message(parent, `${mxResources.get("error")}: ${e}`);
						}
					}, () => {
						loading.remove();
						message(parent, mxResources.get("error"));
					});
				}
			} catch (e) {
				message(parent, `${mxResources.get("error")}: ${e}`);
			}
		}
	};

	globals.MoreShapesDialog = function (
		editorUi: any,
		expanded: boolean,
		entries: any
	) {
		const sidebar = editorUi.sidebar;
		const customEntries = sidebar != null ? sidebar.customEntries : null;

		if (!expanded || customEntries == null) {
			return new originalDialog(editorUi, expanded, entries);
		}

		const sections = [];
		for (const section of customEntries) {
			const converted = ((section || {}).entries || []).map(
				(entry: any) => ({
					id: entry.id,
					title: editorUi.getResource(entry.title),
					desc: editorUi.getResource(entry.desc),
					image: entry.preview,
					imageCallback:
						entry.preview != null
							? null
							: (parent: HTMLElement) =>
									previewEntry(entry, parent),
				})
			);

			if (converted.length > 0) {
				sections.push({
					title: editorUi.getResource((section || {}).title),
					entries: converted,
				});
			}
		}

		if (sections.length === 0) {
			return new originalDialog(editorUi, expanded, entries);
		}

		const base = entries != null ? entries : sidebar.entries;

		// Nos sections passent maintenant par le chemin des jeux de formes
		// intégrés : il faut donc les soustraire au chemin d'origine, sinon
		// elles seraient listées deux fois.
		const enabled = sidebar.enabledLibraries;
		sidebar.customEntries = null;

		if (enabled != null) {
			// Ce filtre ne connaît que les jeux livrés avec Draw.io ; sans nos
			// identifiants, il effacerait nos sections.
			sidebar.enabledLibraries = enabled.concat(
				sections.reduce(
					(ids: string[], s: any) =>
						ids.concat(s.entries.map((e: any) => e.id)),
					[]
				)
			);
		}

		try {
			return new originalDialog(
				editorUi,
				expanded,
				sections.concat(base)
			);
		} finally {
			sidebar.customEntries = customEntries;
			sidebar.enabledLibraries = enabled;
		}
	};
});
