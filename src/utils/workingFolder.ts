import * as vscode from "vscode";

const KEY = "drawio-diagrams-editor.workingFolder";

/**
 * Dossier « courant » de l'extension : celui du dernier diagramme ouvert ou
 * enregistré. Il sert de dossier proposé par les boîtes de dialogue (ouvrir,
 * enregistrer sous), de sorte que l'utilisateur reste dans son projet sans
 * avoir à ouvrir un dossier dans VS Code.
 */
export class WorkingFolder {
	constructor(private readonly memento: vscode.Memento) {}

	/** Dossier mémorisé, à défaut le premier dossier du workspace. */
	public get uri(): vscode.Uri | undefined {
		const stored = this.memento.get<string>(KEY);
		if (stored) {
			try {
				return vscode.Uri.parse(stored);
			} catch {
				// Valeur corrompue : on retombe sur le workspace.
			}
		}
		const folders = vscode.workspace.workspaceFolders;
		return folders && folders.length > 0 ? folders[0].uri : undefined;
	}

	/** Mémorise le dossier parent du fichier donné (fichiers sur disque seuls). */
	public rememberFile(file: vscode.Uri): void {
		if (file.scheme !== "file") {
			return;
		}
		const folder = vscode.Uri.joinPath(file, "..").toString();
		if (this.memento.get<string>(KEY) === folder) {
			return;
		}
		void this.memento.update(KEY, folder);
	}

	/**
	 * URI proposée par défaut dans une boîte de dialogue. `fileName` ajoute un
	 * nom de fichier au dossier courant.
	 */
	public defaultUri(fileName?: string): vscode.Uri | undefined {
		const folder = this.uri;
		if (!folder) {
			return fileName ? vscode.Uri.file(fileName) : undefined;
		}
		return fileName ? vscode.Uri.joinPath(folder, fileName) : folder;
	}
}
