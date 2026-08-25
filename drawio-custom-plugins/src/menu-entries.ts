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

	// « Enregistrer sous » : c'est VS Code qui possede le document, donc c'est
	// sa boite native qu'il faut ouvrir, pas celle de Draw.io.
	const saveAsActionName = "vscode.saveAs";
	mxResources.parse(`${saveAsActionName}=${label("saveAs", "Save as")}...`);
	ui.actions.addAction(saveAsActionName, () => {
		sendEvent({ event: "invokeCommand", command: "saveAs" });
	});

	// « Nouvelle bibliotheque » : le sous-menu amont ne liste que des services
	// en ligne indisponibles hors ligne, on va droit au dialogue local.
	const newLibraryActionName = "vscode.newLibrary";
	mxResources.parse(
		`${newLibraryActionName}=${label("newLibrary", "New Library")}...`
	);
	ui.actions.addAction(newLibraryActionName, () => {
		ui.showLibraryDialog(null, null, null, null, App.MODE_DEVICE);
	});

	// « Ouvrir une bibliotheque depuis » : en mode integre (`embed=1`),
	// Draw.io n'ajoute ses sous-menus de bibliotheque que si `libraries=1`
	// figure dans l'adresse — ce que la webview ne fait pas. Sans cette
	// entree, une bibliotheque fermee par sa croix ne peut plus jamais etre
	// rouverte : c'est le seul chemin pour la remettre.
	const openLibraryMenuName = "vscode.openLibraryFrom";
	mxResources.parse(
		`${openLibraryMenuName}=${label("openLibraryFrom", "Open Library from")}`
	);
	ui.menus.put(
		openLibraryMenuName,
		new Menu((menu: any, parent: any) => {
			menu.addItem(
				`${label("device", "Device")}...`,
				null,
				() => ui.pickLibrary(App.MODE_DEVICE),
				parent
			);
			menu.addItem(
				`${label("browser", "Browser")}...`,
				null,
				() => ui.pickLibrary(App.MODE_BROWSER),
				parent
			);
		})
	);

	// « Themes » : reprend le selecteur de l'extension, qui ecrit le theme dans
	// les reglages VS Code — celui de Draw.io serait perdu au rechargement.
	const themeActionName = "vscode.theme";
	mxResources.parse(`${themeActionName}=${label("theme", "Theme")}...`);
	ui.actions.addAction(themeActionName, () => {
		sendEvent({ event: "invokeCommand", command: "changeTheme" });
	});

	const propertiesActionName = "properties";
	ui.actions.addAction(propertiesActionName, () => {
		showDialog(ui);
	});

	const fileMenu = ui.menus.get("file");
	const oldFileFunct = fileMenu.funct;
	fileMenu.funct = function (menu: any, parent: any) {
		oldFileFunct.apply(this, arguments);
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
				newLibraryActionName,
			],
			parent
		);
		// Un sous-menu ne peut pas figurer dans `addMenuItems` : il s'ajoute
		// a part, d'ou la liste coupee en deux pour garder l'ordre voulu.
		ui.menus.addSubmenu(openLibraryMenuName, menu, parent);
		ui.menus.addMenuItems(
			menu,
			["-", saveActionName, saveAsActionName],
			parent
		);
	};

	const extrasMenu = ui.menus.get("extras");
	if (extrasMenu != null) {
		const oldExtrasFunct = extrasMenu.funct;
		extrasMenu.funct = function (menu: any, parent: any) {
			oldExtrasFunct.apply(this, arguments);
			ui.menus.addMenuItems(menu, ["-", themeActionName], parent);
		};
	}
});
