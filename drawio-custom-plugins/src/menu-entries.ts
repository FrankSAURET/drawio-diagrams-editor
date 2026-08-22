import { showDialog } from "./propertiesDialog";
import { sendEvent } from "./vscode";

Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "menu-entries" });

	// Les libellés réutilisent les clés du dictionnaire de Draw.io : ils
	// suivent donc automatiquement la langue de l'éditeur. `defaultValue`
	// couvre les clés absentes d'une traduction.
	const label = (key: string, fallback: string) =>
		mxResources.get(key, null, fallback) || fallback;

	// Entrée « Ouvrir » : délègue à la commande VS Code, qui gère la boîte de
	// dialogue et le choix de l'éditeur personnalisé.
	const openActionName = "vscode.open";
	mxResources.parse(`${openActionName}=${label("open", "Open")}...`);
	ui.actions.addAction(openActionName, () => {
		sendEvent({ event: "invokeCommand", command: "open" });
	});

	const importActionName = "vscode.import";
	mxResources.parse(`${importActionName}=${label("import", "Import")}...`);
	ui.actions.addAction(importActionName, () => ui.importLocalFile(true));

	const exportActionName = "vscode.export";
	mxResources.parse(`${exportActionName}=${label("export", "Export")}...`);
	ui.actions.addAction(exportActionName, () => {
		sendEvent({ event: "invokeCommand", command: "export" });
	});

	const convertActionName = "vscode.convert";
	mxResources.parse(`${convertActionName}=${label("convert", "Convert")}...`);
	ui.actions.addAction(convertActionName, () => {
		sendEvent({ event: "invokeCommand", command: "convert" });
	});

	const saveActionName = "vscode.save";
	mxResources.parse(`${saveActionName}=${label("save", "Save")}`);
	ui.actions.addAction(saveActionName, () => {
		sendEvent({ event: "invokeCommand", command: "save" });
	});

	const propertiesActionName = "properties";
	ui.actions.addAction(propertiesActionName, () => {
		showDialog(ui);
	});

	const menu = ui.menus.get("file");
	const oldFunct = menu.funct;
	menu.funct = function (menu: any, parent: any) {
		oldFunct.apply(this, arguments);
		ui.menus.addMenuItems(
			menu,
			[
				"-",
				propertiesActionName,
				"-",
				openActionName,
				importActionName,
				exportActionName,
				convertActionName,
				"-",
				saveActionName,
			],
			parent
		);
	};
});
