declare const Draw: {
    loadPlugin(handler: (ui: DrawioUI) => void): void;
};

declare const log: any;

// Langue courante de l'éditeur Draw.io (définie par le paramètre `lang` de l'iframe).
declare const mxLanguage: string | undefined;

declare class mxCellHighlight {
    constructor(graph: DrawioGraph, color: string, arg: number);

    public highlight(arg: DrawioCellState | null): void;
    public destroy(): void;
}

declare class mxResources {
    static parse(value: string): void;
    static get(
        key: string,
        params?: string[] | null,
        defaultValue?: string
    ): string;
}

declare class mxMouseEvent {
    public readonly graphX: number;
    public readonly graphY: number;
}

declare const mxEvent: {
    DOUBLE_CLICK: string;
    CHANGE: string;
};

declare const mxUtils: {
	isNode(node: any): node is HTMLElement;
	createXmlDocument(): XMLDocument;
	sortCells(cells: DrawioCell[]): DrawioCell[];
	getXml(node: any): string;
	parseXml(xml: string): XMLDocument;
	getTextContent(node: any): string;
};

declare const App: {
	MODE_DEVICE: string;
	MODE_BROWSER: string;
};

/** Objet global de Draw.io portant l'etat de l'editeur. */
declare const Editor: {
	/** Theme courant : « min », « kennedy », « atlas », « sketch »... */
	currentTheme: string;
};

/** Bibliotheque rangee dans le stockage du navigateur (mode « browser »). */
declare const StorageLibrary: Function | undefined;

/** Bibliotheque venue d'un fichier de l'appareil (mode « device »). */
declare const LocalLibrary: {
	new (ui: DrawioUI, data: string, title: string): any;
};

/** Menu de Draw.io : `new Menu(function(menu, parent) { ... })`. */
declare const Menu: {
	new (funct: (menu: any, parent: any) => void, enabled?: boolean): any;
};

/** Acces au stockage de fichiers du navigateur (IndexedDB, repli localStorage). */
declare const StorageFile: {
	deleteFile(
		ui: DrawioUI,
		title: string,
		success: () => void,
		error?: () => void
	): void;
};

/** Reglages de Draw.io ranges dans le stockage local (cle `.drawio-config`). */
declare const mxSettings: {
	getCustomLibraries(): string[];
	addCustomLibrary(id: string): void;
	removeCustomLibrary(id: string): void;
};


declare interface DrawioUI {
    fileNode: Element | null;
    hideDialog(): void;
    showDialog(...args: any[]): void;
    editor: DrawioEditor;
    actions: DrawioActions;
    menus: DrawioMenus;
    importLocalFile(args: boolean): void;
    /** Ouvre une bibliotheque existante : `App.MODE_DEVICE`, `MODE_BROWSER`... */
    pickLibrary(mode: string): void;
    /** Charge une bibliotheque deja construite dans la barre laterale. */
    loadLibrary(file: any, expand?: boolean): void;
    /** Deplie la barre laterale des formes. */
    showSidebar(): void;
    /** Boite d'erreur de Draw.io. */
    handleError(resp: any, title?: string | null): void;

    /** Conteneur de la barre de menus (offert seulement quand `chrome=1`). */
    menubarContainer?: HTMLElement;
    /** Boite de dialogue « nouvelle bibliotheque ». */
    showLibraryDialog(
        name: any,
        sidebar: any,
        images: any,
        file: any,
        mode: string
    ): void;
    /** Copie les cellules donnees dans le presse-papiers systeme, en SVG. */
    copySvg(cells: DrawioCell[], xml?: string | null, scale?: number): void;
    /** Chemin de telechargement de Draw.io, redirige vers VS Code. */
    saveLocalFile: (...args: any[]) => void;
    doSaveLocalFile: (...args: any[]) => void;

    /** Barre laterale des formes, porteuse des sections configurees. */
    sidebar: DrawioSidebar;
    /** Dessine les vignettes d'une bibliotheque dans le conteneur donne. */
    addLibraryEntries(images: any[], content: HTMLElement): void;
    /** Choisit la traduction courante d'un libelle multilingue. */
    getResource(obj: any): string;
}

interface DrawioSidebar {
    /** Sections venues de la configuration (`libraries`). */
    customEntries: any[] | null;
    /** Jeux de formes livres avec Draw.io. */
    entries: any[];
    /** Liste blanche facultative d'identifiants de jeux de formes. */
    enabledLibraries: string[] | null;
}

interface DrawioMenus {
    get(name: string): any;
    /** Enregistre un menu (ou sous-menu) sous ce nom. */
    put(name: string, menu: any): any;
    addMenuItems(menu: any, arg: any, arg2: any): void;
    addSubmenu(name: string, menu: any, parent: any): void;
}

interface DrawioActions {
    addAction(name: string, action: () => void): void;
    get(name: string): { funct: (...args: any[]) => void };
}

declare interface DrawioEditor {
	graph: DrawioGraph;
	/** Telecharge une adresse, en passant par le mandataire si besoin. */
	loadUrl(
		url: string,
		success: (data: string) => void,
		error?: (e: any) => void
	): void;
}

declare interface DrawioGraph {
	defaultThemeName: string;
	getSelectionCells(): DrawioCell[];
	isSelectionEmpty(): boolean;
	isEnabled(): boolean;
	isEditing(): boolean;
	getExportableCells(cells: DrawioCell[]): DrawioCell[];
	encodeCells(cells: DrawioCell[]): any;
	insertVertex(arg0: undefined, arg1: null, label: string, arg3: number, arg4: number, arg5: number, arg6: number, arg7: string): void;
	addListener: any;
	model: DrawioGraphModel;
	getLabel(cell: DrawioCell): string;
    getSelectionModel(): DrawioGraphSelectionModel;
    view: DrawioGraphView;

    addMouseListener(listener: {
        mouseMove?: (graph: DrawioGraph, event: mxMouseEvent) => void;
        mouseDown?: (graph: DrawioGraph, event: mxMouseEvent) => void
        mouseUp?: (graph: DrawioGraph, event: mxMouseEvent) => void;
    }): void;
}

declare interface DrawioGraphView {
    getState(cell: DrawioCell): DrawioCellState;
    canvas: SVGElement;
}

declare interface DrawioCellState {
    cell: DrawioCell;
}

declare interface DrawioGraphSelectionModel {
	addListener(event: string, handler: (...args: any[]) => void): void;
    cells: DrawioCell[];
}

declare interface DrawioCell {
    id: string;
    style: string
}

declare interface DrawioGraphModel {
    getTopmostCells(cells: DrawioCell[]): DrawioCell[];
    setValue(c: DrawioCell, label: string | any): void;
    beginUpdate(): void;
    endUpdate(): void;
	cells: Record<any, DrawioCell>;
    setStyle(cell: DrawioCell, style: string): void;
    isVertex(cell: DrawioCell): boolean;
}