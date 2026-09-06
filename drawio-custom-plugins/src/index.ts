import "./linkSelectedNodeWithData";
import "./liveshare";
import "./focus";
import "./menu-entries";
import "./localFileSave";
import "./copySelectionAsSvg";
import "./pasteSvgText";
import "./libraryStorage";
import "./libraryPreview";
import "./versionLabel";
import "./displayOptions";

Draw.loadPlugin((ui) => {
	(window as any).hediet_DbgUi = ui;
});
