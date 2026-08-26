import { sendEvent } from "./vscode";

/**
 * Draw.io enregistre ses exports en fabriquant un `<a download>` sur une URL
 * blob, puis en affichant sa propre boîte « Enregistrer » (nom + destination).
 * Dans une webview VS Code, cette boîte propose des destinations qui n'existent
 * pas et le téléchargement n'aboutit pas.
 *
 * On court-circuite les deux points d'entrée (`saveLocalFile`, appelé par les
 * exports et les bibliothèques, et `doSaveLocalFile`, appelé directement par
 * quelques chemins) pour envoyer les octets à l'extension : elle ouvre la boîte
 * d'enregistrement native de VS Code et écrit le fichier.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "local-file-save" });

	function saveThroughVsCode(
		data: string,
		filename: string,
		mimeType: string | null,
		base64Encoded: boolean,
		defaultExtension?: string
	) {
		// Même complément d'extension que `doSaveLocalFile` en amont : sans lui
		// un export XML ressort sans extension.
		if (
			mimeType === "text/xml" &&
			!/\.(drawio|xml|svg|html)$/i.test(filename)
		) {
			filename = filename + "." + (defaultExtension || "drawio");
		}

		// Une bibliotheque de formes se reconnait a sa racine XML. Pas besoin
		// de suivre un drapeau au travers des enregistrements asynchrones :
		// l'extension saura proposer le dossier de bibliotheques.
		const isLibrary =
			!base64Encoded && /^\s*(<\?xml[^>]*\?>\s*)?<mxlibrary/.test(data);

		sendEvent({
			event: "saveLocalFile",
			filename,
			mimeType,
			base64Encoded: !!base64Encoded,
			data,
			isLibrary,
		});
	}

	ui.saveLocalFile = function (
		data: string,
		filename: string,
		mimeType: string | null,
		base64Encoded: boolean,
		_format: string,
		_allowBrowser: boolean,
		_allowTab: boolean,
		defaultExtension: string
	) {
		saveThroughVsCode(
			data,
			filename,
			mimeType,
			base64Encoded,
			defaultExtension
		);
	};

	ui.doSaveLocalFile = function (
		data: string,
		filename: string,
		mimeType: string | null,
		base64Encoded: boolean,
		_format: string,
		defaultExtension: string
	) {
		saveThroughVsCode(
			data,
			filename,
			mimeType,
			base64Encoded,
			defaultExtension
		);
	};
});
