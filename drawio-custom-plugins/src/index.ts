import "./linkSelectedNodeWithData";
import "./liveshare";
import "./focus";
import "./menu-entries";
import "./localFileSave";
import "./copySelectionAsSvg";
import "./versionLabel";

Draw.loadPlugin((ui) => {
	(window as any).hediet_DbgUi = ui;
});
