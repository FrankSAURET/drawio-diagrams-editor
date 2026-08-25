import { sendEvent } from "./vscode";

/**
 * Numéro de version de l'extension, affiché à droite de la barre de menus.
 *
 * La chaîne est calculée côté extension et déposée dans la webview : elle
 * porte la version publique ET le numéro de lot (`v2026.8.0.10`).
 *
 * Les deux thèmes de l'extension ne rangent pas la barre de menus au même
 * endroit :
 *  - thème « min » : Minimal.js reconstruit sa propre barre et remplace
 *    `ui.menubarContainer` par le petit conteneur de boutons placé à droite ;
 *  - thème « kennedy » : `ui.menubarContainer` est le grand bandeau, et la
 *    rangée réellement visible est `ui.menubar.container` — un conteneur
 *    flexible, dans lequel une marge automatique pousse l'étiquette à droite.
 * D'où le choix du parent selon le thème, refait après chaque changement de
 * thème (Draw.io reconstruit alors toute la barre).
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "version-label" });

	const label = (window as any).vsCodeDrawioVersionLabel as
		| string
		| undefined;

	if (!label) {
		return;
	}

	const elt = document.createElement("div");
	elt.className = "geVsCodeVersion";
	elt.textContent = label;
	elt.title = label;
	elt.style.cssText = [
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

	/** Conteneur visible de la barre de menus pour le thème courant. */
	function menuBarHost(): HTMLElement | null {
		const anyUi = ui as any;

		if (Editor.currentTheme !== "min" && anyUi.menubar != null) {
			const container = anyUi.menubar.container as HTMLElement | null;
			if (container != null) {
				return container;
			}
		}

		return anyUi.menubarContainer ?? null;
	}

	function place(): void {
		const host = menuBarHost();

		// Mode lecture seule (`chrome=0`) : pas de barre de menus.
		if (host != null && elt.parentNode !== host) {
			host.appendChild(elt);
		}
	}

	place();

	// Changer de thème reconstruit la barre : il faut s'y raccrocher.
	const anyUi = ui as any;
	const oldSwitchTheme = anyUi.switchTheme;
	if (typeof oldSwitchTheme === "function") {
		anyUi.switchTheme = function (...args: any[]) {
			const result = oldSwitchTheme.apply(this, args);
			place();
			return result;
		};
	}
});
