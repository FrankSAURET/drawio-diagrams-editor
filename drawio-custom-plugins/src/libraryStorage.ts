import { sendEvent } from "./vscode";

/**
 * Retirer une bibliothèque « navigateur » efface aussi sa copie rangée.
 *
 * Draw.io range les bibliothèques du mode « navigateur » dans un stockage
 * caché (IndexedDB, ou le stockage local relayé vers VS Code). La croix de la
 * barre latérale, elle, ne fait que retirer la bibliothèque de la liste
 * affichée : le fichier rangé, lui, reste. Dans un navigateur ordinaire ce
 * n'est pas gênant — un écran liste ces fichiers. Dans VS Code, cet écran
 * n'existe pas : le fichier devient introuvable, mais son nom reste pris, et
 * un nouvel import du même nom répond « existe déjà ».
 *
 * On efface donc la copie rangée en même temps que l'entrée de la barre.
 * Le bloc-notes (`.scratchpad`) est épargné : il se referme et se rouvre.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "library-storage" });

	const anyUi = ui as any;
	const oldCloseLibrary = anyUi.closeLibrary;

	if (typeof oldCloseLibrary !== "function") {
		return;
	}

	anyUi.closeLibrary = function (file: any) {
		const result = oldCloseLibrary.apply(this, arguments);

		try {
			if (
				file != null &&
				typeof StorageLibrary === "function" &&
				file.constructor === StorageLibrary &&
				file.getTitle() !== ".scratchpad"
			) {
				StorageFile.deleteFile(
					this,
					file.getTitle(),
					() => {
						/* rien à faire */
					},
					() => {
						/* rien à faire */
					}
				);
			}
		} catch (e) {
			// Une bibliothèque non effacée ne doit pas casser la fermeture.
		}

		return result;
	};
});
