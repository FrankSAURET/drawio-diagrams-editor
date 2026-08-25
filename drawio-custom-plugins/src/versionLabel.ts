import { sendEvent } from "./vscode";

/**
 * Numéro de version de l'extension, affiché à droite de la barre de menus.
 *
 * La chaîne est calculée côté extension et déposée dans la webview : elle
 * porte la version publique ET le numéro de lot (`v2026.8.0.11`).
 *
 * Les deux thèmes ne rangent pas la barre de menus au même endroit :
 *  - thème « min » : Minimal.js reconstruit sa propre barre et remplace
 *    `ui.menubarContainer` par son conteneur de boutons, qui est flexible ;
 *  - thème « kennedy » : `ui.menubarContainer` est le bandeau, et la rangée
 *    réellement visible est `ui.menubar.container` (`.geMenubar`, flexible).
 *
 * Comme ces conteneurs coupent ce qui dépasse (`overflow:hidden`) et que
 * d'autres éléments y prennent déjà toute la place restante, l'étiquette est
 * mesurée après coup : si elle n'est pas réellement visible, elle bascule sur
 * un affichage flottant épinglé en haut à droite, qui ne dépend d'aucun thème.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "version-label" });

	const anyUi = ui as any;
	const anyWindow = window as any;

	/** Journal de l'extension (défini par la webview), pour la mise au point. */
	function log(...msg: any[]): void {
		try {
			if (typeof anyWindow.log === "function") {
				anyWindow.log(...msg);
			}
		} catch (e) {
			// Le journal ne doit jamais casser l'affichage.
		}
	}

	const label = anyWindow.vsCodeDrawioVersionLabel as string | undefined;

	if (!label) {
		log("versionLabel: aucune chaîne fournie par l'extension");
		return;
	}

	const elt = document.createElement("div");
	elt.className = "geVsCodeVersion";
	elt.textContent = label;
	elt.title = label;

	/** Style « dans la rangée » : dernier élément d'une barre flexible. */
	const inlineStyle = [
		"display:inline-flex",
		"align-items:center",
		// Pousse l'étiquette au bout de la rangée quand le parent est flexible.
		"margin-left:auto",
		"padding:0 8px",
		"flex:0 0 auto",
		"font-size:10px",
		"opacity:0.55",
		"pointer-events:none",
		"user-select:none",
		"white-space:nowrap",
	].join(";");

	/** Style de repli : épinglé en haut à droite de la webview. */
	const floatingStyle = [
		"position:fixed",
		"top:7px",
		"right:10px",
		"z-index:9999",
		"font-size:10px",
		"opacity:0.55",
		"pointer-events:none",
		"user-select:none",
		"white-space:nowrap",
	].join(";");

	elt.style.cssText = inlineStyle;

	/** Conteneur visible de la barre de menus pour le thème courant. */
	function menuBarHost(): HTMLElement | null {
		let theme: string | undefined;
		try {
			theme = Editor.currentTheme;
		} catch (e) {
			theme = undefined;
		}

		if (theme !== "min" && anyUi.menubar != null) {
			const container = anyUi.menubar.container as HTMLElement | null;
			if (container != null) {
				return container;
			}
		}

		return anyUi.menubarContainer ?? null;
	}

	function place(): void {
		if (elt.style.position === "fixed") {
			return;
		}

		const host = menuBarHost();

		// Mode lecture seule (`chrome=0`) : pas de barre de menus.
		if (host != null && elt.parentNode !== host) {
			host.appendChild(elt);
		}
	}

	/** L'étiquette occupe-t-elle vraiment des pixels visibles ? */
	function isVisible(): boolean {
		if (!elt.isConnected || elt.offsetParent === null) {
			return false;
		}

		const r = elt.getBoundingClientRect();

		return (
			r.width > 0 &&
			r.height > 0 &&
			r.left >= -1 &&
			r.top >= -1 &&
			r.right <= window.innerWidth + 1 &&
			r.bottom <= window.innerHeight + 1
		);
	}

	/** Bascule sur l'affichage flottant, indépendant du thème. */
	function floatOnTop(): void {
		elt.style.cssText = floatingStyle;
		document.body.appendChild(elt);
	}

	function check(): void {
		const host = elt.parentElement;
		const r = elt.getBoundingClientRect();

		log(
			"versionLabel: theme=" +
				(typeof Editor !== "undefined" ? Editor.currentTheme : "?") +
				" parent=" +
				(host != null ? host.className || host.tagName : "aucun") +
				" rect=" +
				Math.round(r.left) +
				"," +
				Math.round(r.top) +
				" " +
				Math.round(r.width) +
				"x" +
				Math.round(r.height) +
				" fenetre=" +
				window.innerWidth +
				"x" +
				window.innerHeight
		);

		if (!isVisible()) {
			log("versionLabel: invisible dans la barre, repli flottant");
			floatOnTop();
		}
	}

	place();
	// La barre de menus est encore remaniée après le chargement des greffons
	// (mode compact, boutons de la barre) : on vérifie une fois posé.
	window.setTimeout(check, 1500);

	// Changer de thème reconstruit la barre : il faut s'y raccrocher.
	const oldSwitchTheme = anyUi.switchTheme;
	if (typeof oldSwitchTheme === "function") {
		anyUi.switchTheme = function (...args: any[]) {
			const result = oldSwitchTheme.apply(this, args);
			place();
			window.setTimeout(check, 500);
			return result;
		};
	}
});
