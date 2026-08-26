import { sendEvent } from "./vscode";

/**
 * Cycle de vie des bibliothèques de formes.
 *
 * Deux choses ici :
 *
 * 1. **Correction** — fermer une bibliothèque laissait des restes.
 *    - `EditorUi.closeLibrary` retire l'entrée de la barre latérale mais
 *      oublie `ui.loadedLibraries`, la liste de ce qui a déjà été chargé.
 *      Tant que ce drapeau reste posé, remettre la même bibliothèque dans la
 *      même session est ignoré **sans le moindre message**.
 *    - Une bibliothèque du mode « navigateur » garde en plus sa copie rangée
 *      dans le stockage caché : son nom reste pris, alors que VS Code n'offre
 *      aucun écran pour la retrouver. On efface donc cette copie.
 *
 * 2. **Journal** — les gestes sur les bibliothèques (ouverture, fermeture,
 *    enregistrement) et les messages d'erreur de Draw.io sont écrits dans
 *    « Drawio Integration Log », avec le nom, l'empreinte et le type du
 *    fichier. Sans cela, un « le fichier existe déjà » ne dit pas d'où il
 *    vient : les boîtes de Draw.io ne laissent aucune trace.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "library-storage" });

	const anyUi = ui as any;
	const anyWindow = window as any;

	/** Journal de l'extension (défini par la webview). */
	function log(...msg: any[]): void {
		try {
			if (typeof anyWindow.log === "function") {
				anyWindow.log(...msg);
			}
		} catch (e) {
			// Le journal ne doit jamais casser une action.
		}
	}

	/** Description courte d'un fichier de bibliothèque. */
	function describe(file: any): string {
		if (file == null) {
			return "aucun";
		}

		let type = "?";
		try {
			type = file.constructor != null ? file.constructor.name : "?";
		} catch (e) {
			// rien
		}

		let hash = "?";
		try {
			hash = file.getHash();
		} catch (e) {
			// rien
		}

		let title = "?";
		try {
			title = file.getTitle();
		} catch (e) {
			// rien
		}

		return `${type} titre="${title}" empreinte="${hash}"`;
	}

	/** Liste des bibliothèques retenues dans les réglages. */
	function customLibraries(): string {
		try {
			return JSON.stringify(mxSettings.getCustomLibraries());
		} catch (e) {
			return "?";
		}
	}

	/** Remplace une méthode en la journalisant. */
	function watch(name: string, describeArgs: (args: any[]) => string): void {
		const old = anyUi[name];

		if (typeof old !== "function") {
			return;
		}

		anyUi[name] = function (...args: any[]) {
			log(`bibliotheque: ${name}(${describeArgs(args)})`);

			try {
				return old.apply(this, args);
			} catch (e) {
				log(
					`bibliotheque: ${name} a echoue : ` +
						((e && (e as any).message) || String(e))
				);
				throw e;
			}
		};
	}

	// « Ouvrir une bibliotheque depuis > Peripherique » : Draw.io fabrique un
	// <input type=file> cache, le garde sur `ui.libFileInputElt` et le
	// reinitialise (`type=''` puis `type='file'`) apres chaque choix. En
	// webview, cet element ne rend plus rien au second appel : la boite
	// s'ouvre, le fichier est choisi, et aucune donnee n'arrive — d'ou la
	// bibliotheque qui « se charge » mais reste vide. On demande le fichier a
	// VS Code, qui a une vraie boite d'ouverture et lit le disque lui-meme.
	const oldPickLibrary = anyUi.pickLibrary;
	if (typeof oldPickLibrary === "function") {
		anyUi.pickLibrary = function (mode: string) {
			if (mode === App.MODE_DEVICE) {
				log("bibliotheque: pickLibrary(peripherique) via VS Code");
				sendEvent({ event: "pickLibraryFile" });
				return;
			}

			return oldPickLibrary.apply(this, arguments);
		};
	}

	window.addEventListener("message", (evt) => {
		if (evt.source !== window.opener) {
			return;
		}

		let data: CustomDrawioAction;
		try {
			data = JSON.parse(evt.data) as CustomDrawioAction;
		} catch (e) {
			return;
		}

		if (data.action !== "libraryFilePicked") {
			return;
		}

		try {
			const file = new LocalLibrary(ui, data.xml, data.name);
			log(`bibliotheque: fichier choisi ${describe(file)}`);

			// Le drapeau « deja chargee » survit a une fermeture par la croix
			// (defaut amont) : sans ce nettoyage, rouvrir le meme fichier dans
			// la meme session est ignore sans le moindre message.
			const hash = file.getHash();
			if (anyUi.loadedLibraries != null && hash != null) {
				delete anyUi.loadedLibraries[hash];
			}

			ui.loadLibrary(file);
			ui.showSidebar();
		} catch (e) {
			log(
				"bibliotheque: chargement refuse : " +
					((e && (e as any).message) || String(e))
			);
			ui.handleError(e, mxResources.get("errorLoadingFile"));
		}

		evt.preventDefault();
		evt.stopPropagation();
	});

	watch("loadLibrary", (args) => describe(args[0]));
	watch("libraryLoaded", (args) => describe(args[0]));
	watch(
		"saveLibrary",
		(args) => `nom="${args[0]}" mode=${args[3]} ${describe(args[2])}`
	);

	// Les erreurs de Draw.io ne laissent aucune trace : on note le message et
	// l'endroit d'où il part, sinon impossible de savoir qui se plaint.
	const oldHandleError = anyUi.handleError;
	if (typeof oldHandleError === "function") {
		anyUi.handleError = function (resp: any, ...rest: any[]) {
			try {
				const message =
					resp != null
						? resp.message || resp.error || String(resp)
						: rest[0] || "?";
				log(
					"drawio erreur: " +
						message +
						" | origine: " +
						(new Error().stack || "?")
							.split("\n")
							.slice(1, 5)
							.join(" << ")
				);
			} catch (e) {
				// rien
			}

			return oldHandleError.apply(this, arguments);
		};
	}

	const oldCloseLibrary = anyUi.closeLibrary;

	if (typeof oldCloseLibrary !== "function") {
		return;
	}

	anyUi.closeLibrary = function (file: any) {
		log(
			`bibliotheque: closeLibrary(${describe(file)}) reglages=` +
				customLibraries()
		);

		const result = oldCloseLibrary.apply(this, arguments);

		try {
			if (file != null) {
				const hash = file.getHash();

				// Sans cela, remettre la même bibliothèque dans la session
				// est ignoré en silence.
				if (this.loadedLibraries != null && hash != null) {
					delete this.loadedLibraries[hash];
				}

				if (
					typeof StorageLibrary === "function" &&
					file.constructor === StorageLibrary &&
					file.getTitle() !== ".scratchpad"
				) {
					StorageFile.deleteFile(
						this,
						file.getTitle(),
						() => {
							log("bibliotheque: copie rangee effacee");
						},
						() => {
							log("bibliotheque: copie rangee NON effacee");
						}
					);
				}
			}
		} catch (e) {
			// Une bibliothèque non effacée ne doit pas casser la fermeture.
		}

		log("bibliotheque: apres fermeture, reglages=" + customLibraries());

		return result;
	};
});
