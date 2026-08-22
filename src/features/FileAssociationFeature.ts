import { l10n } from "vscode";
import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";

// Échappatoire webpack : le bundle cible aussi le web, où ces modules Node
// n'existent pas. `__non_webpack_require__` est compilé en `require` brut et
// n'est donc jamais résolu à la compilation.
declare const __non_webpack_require__: (id: string) => any;

/** ProgId Windows sous lequel l'association est enregistrée. */
const PROG_ID = "ElectropolFr.DrawioDiagram";
/** Extensions dont Windows connaît la dernière partie (.drawio.svg → .svg : exclu). */
const EXTENSIONS = [".drawio", ".dio"];

const PROMPTED_KEY = "fileAssociation.prompted";
const REGISTERED_KEY = "fileAssociation.registered";
/** Laisse le démarrage se terminer avant d'afficher quoi que ce soit. */
const PROMPT_DELAY_MS = 15000;

/**
 * Propose (une seule fois) d'ouvrir les fichiers .drawio/.dio dans VS Code
 * depuis l'Explorateur Windows, avec l'icône Draw.io. Tout est écrit dans
 * HKEY_CURRENT_USER : aucun privilège administrateur n'est requis.
 */
export class FileAssociationFeature {
	public readonly dispose = Disposable.fn();

	private readonly isWindows =
		typeof process !== "undefined" && process.platform === "win32";

	constructor(
		private readonly globalState: vscode.Memento,
		private readonly extensionUri: vscode.Uri
	) {
		this.dispose.track(
			vscode.commands.registerCommand(
				"electropol-fr.drawio-diagrams-editor.associateFileType",
				() => this.associate(true)
			)
		);

		if (!this.isWindows) {
			return;
		}

		const timer = setTimeout(() => this.onStartup(), PROMPT_DELAY_MS);
		this.dispose.track({ dispose: () => clearTimeout(timer) });
	}

	private async onStartup(): Promise<void> {
		try {
			if (this.globalState.get<boolean>(REGISTERED_KEY, false)) {
				// Le dossier d'installation change à chaque mise à jour de
				// l'extension : on remet la base de registre à jour en silence.
				if (!(await this.isUpToDate())) {
					await this.writeRegistry();
				}
				return;
			}
			if (this.globalState.get<boolean>(PROMPTED_KEY, false)) {
				return;
			}
			await this.prompt();
		} catch {
			// Association facultative : jamais d'erreur bruyante au démarrage.
		}
	}

	private async prompt(): Promise<void> {
		const yes = l10n.t("Yes, associate");
		const later = l10n.t("Later");
		const never = l10n.t("Don't ask again");

		const choice = await vscode.window.showInformationMessage(
			l10n.t(
				"Open .drawio and .dio files in VS Code from Windows Explorer (with the Draw.io icon)?"
			),
			yes,
			later,
			never
		);

		if (choice === yes) {
			await this.associate(true);
		} else if (choice === never) {
			await this.globalState.update(PROMPTED_KEY, true);
		}
		// « Plus tard » ou fermeture : la question sera reposée au prochain démarrage.
	}

	private async associate(showFeedback: boolean): Promise<void> {
		if (!this.isWindows) {
			if (showFeedback) {
				vscode.window.showWarningMessage(
					l10n.t(
						"File type association is only available on Windows."
					)
				);
			}
			return;
		}

		try {
			await this.writeRegistry();
			await this.globalState.update(REGISTERED_KEY, true);
			await this.globalState.update(PROMPTED_KEY, true);
			if (showFeedback) {
				vscode.window.showInformationMessage(
					l10n.t(
						'.drawio and .dio files are now associated with VS Code. If Windows still opens another application, right-click a file, choose "Open with" then "Choose another app" and select Visual Studio Code.'
					)
				);
			}
		} catch (e: any) {
			vscode.window.showErrorMessage(
				l10n.t("Association failed: {0}", e?.message ?? String(e))
			);
		}
	}

	private get iconPath(): string {
		return vscode.Uri.joinPath(this.extensionUri, "media", "drawio.ico")
			.fsPath;
	}

	/** Construit un fichier .reg (UTF-16 LE avec BOM, comme l'exige regedit). */
	private buildRegFile(): string {
		const esc = (v: string) =>
			v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

		const root = "HKEY_CURRENT_USER\\Software\\Classes";

		const lines = [
			"\ufeffWindows Registry Editor Version 5.00",
			"",
			`[${root}\\${PROG_ID}]`,
			`@="${l10n.t("Draw.io Diagram")}"`,
			"",
			`[${root}\\${PROG_ID}\\DefaultIcon]`,
			`@="${esc(this.iconPath)},0"`,
			"",
			`[${root}\\${PROG_ID}\\shell\\open\\command]`,
			`@="${esc(`"${process.execPath}" "%1"`)}"`,
			"",
		];

		for (const ext of EXTENSIONS) {
			lines.push(`[${root}\\${ext}]`, `@="${PROG_ID}"`, "");
		}

		return lines.join("\r\n");
	}

	private async writeRegistry(): Promise<void> {
		const cp = __non_webpack_require__("child_process");
		const fs = __non_webpack_require__("fs");
		const os = __non_webpack_require__("os");
		const path = __non_webpack_require__("path");

		const file = path.join(
			os.tmpdir(),
			`drawio-diagrams-editor-${Date.now()}.reg`
		);
		fs.writeFileSync(file, this.buildRegFile(), "utf16le");

		try {
			await new Promise<void>((resolve, reject) => {
				cp.execFile(
					"reg.exe",
					["import", file],
					(err: any, _stdout: string, stderr: string) => {
						if (err) {
							reject(
								new Error(
									(stderr || "").trim() || err.message
								)
							);
						} else {
							resolve();
						}
					}
				);
			});
		} finally {
			try {
				fs.unlinkSync(file);
			} catch {
				// Fichier temporaire : un reliquat est sans conséquence.
			}
		}

		// Force l'Explorateur à relire le cache d'icônes (échec sans impact).
		try {
			cp.execFile("ie4uinit.exe", ["-show"], () => undefined);
		} catch {
			// Absent sur certaines éditions de Windows.
		}
	}

	/** Vrai si le registre pointe déjà sur cette installation de VS Code. */
	private async isUpToDate(): Promise<boolean> {
		const key = `HKCU\\Software\\Classes\\${PROG_ID}`;
		const command = await this.queryDefaultValue(
			`${key}\\shell\\open\\command`
		);
		const icon = await this.queryDefaultValue(`${key}\\DefaultIcon`);
		if (!command || !icon) {
			return false;
		}
		return (
			command.toLowerCase().includes(process.execPath.toLowerCase()) &&
			icon.toLowerCase().startsWith(this.iconPath.toLowerCase())
		);
	}

	private queryDefaultValue(key: string): Promise<string | undefined> {
		const cp = __non_webpack_require__("child_process");
		return new Promise((resolve) => {
			cp.execFile(
				"reg.exe",
				["query", key, "/ve"],
				(err: any, stdout: string) => {
					if (err) {
						resolve(undefined);
						return;
					}
					const match = /REG_SZ\s+(.*)/.exec(stdout || "");
					resolve(match ? match[1].trim() : undefined);
				}
			);
		});
	}
}
