import { sendEvent } from "./vscode";

/**
 * Numéro de version de l'extension, affiché à droite de la barre de menus.
 *
 * La chaîne est calculée côté extension et déposée dans la webview : version
 * publique seule en production, version interne à quatre segments sinon.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "version-label" });

	const label = (window as any).vsCodeDrawioVersionLabel as
		| string
		| undefined;
	const container = ui.menubarContainer;

	if (!label || container == null) {
		// Mode lecture seule (`chrome=0`) : pas de barre de menus.
		return;
	}

	const elt = document.createElement("div");
	elt.className = "geVsCodeVersion";
	elt.textContent = label;
	elt.title = label;
	elt.style.cssText = [
		"position:absolute",
		"right:10px",
		"top:0",
		"bottom:0",
		"display:flex",
		"align-items:center",
		"font-size:10px",
		"opacity:0.55",
		"pointer-events:none",
		"user-select:none",
		"white-space:nowrap",
	].join(";");

	container.appendChild(elt);
});
