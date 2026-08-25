import { sendEvent } from "./vscode";

/**
 * Coller une image SVG qui arrive sous forme de texte.
 *
 * Beaucoup d'applications (dont Kablix) déposent leur dessin dans le
 * presse-papiers en deux exemplaires : la saveur `image/svg+xml` et le même
 * SVG en `text/plain`, pour les programmes qui ne lisent que du texte.
 *
 * Draw.io renonce à lire l'image dès qu'une saveur texte est présente
 * (`installImagePasteHandler` : `if (!consumed && !containsText)`), et Chromium
 * n'expose jamais `image/svg+xml` sur l'événement `paste` lui-même. Résultat :
 * le SVG était collé comme une longue étiquette de texte.
 *
 * On intercepte donc le collage en phase de capture — donc avant les
 * gestionnaires de Draw.io — et, si le texte collé EST un document SVG, on
 * l'importe comme image. Le XML des cellules éventuellement porté par
 * l'attribut `content` du SVG est retrouvé par `importFiles`, donc un dessin
 * venu de Draw.io reste modifiable.
 *
 * Une étiquette en cours d'édition n'est jamais interceptée : y coller la
 * source d'un SVG reste possible.
 */

/** Le texte est-il un document SVG complet ? */
function isSvgDocument(text: string): boolean {
	return (
		/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!DOCTYPE[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(
			text
		) && /<\/svg\s*>\s*$/i.test(text)
	);
}

Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "paste-svg-text" });

	const anyUi = ui as any;
	const graph = ui.editor.graph as any;
	const container = graph.container as HTMLElement | null;

	if (container == null) {
		return;
	}

	container.addEventListener(
		"paste",
		(evt: ClipboardEvent) => {
			if (
				!evt.isTrusted ||
				evt.defaultPrevented ||
				!graph.isEnabled() ||
				graph.isEditing() ||
				graph.isCellLocked(graph.getDefaultParent())
			) {
				return;
			}

			const clipboard = evt.clipboardData;
			if (clipboard == null) {
				return;
			}

			let text: string;
			try {
				text = clipboard.getData("text/plain");
			} catch (e) {
				return;
			}

			if (!text || !isSvgDocument(text)) {
				return;
			}

			const file = new Blob([text], { type: "image/svg+xml" });
			const pt = graph.getInsertPoint();
			anyUi.importFiles([file], pt.x, pt.y, anyUi.maxImageSize);

			// Annule aussi la propagation : les gestionnaires de Draw.io sont
			// posés sur ce conteneur et sur le champ caché qu'il contient.
			evt.preventDefault();
			evt.stopPropagation();
		},
		true
	);
});
