import * as vscode from "vscode";
import { Disposable } from "@hediet/std/disposable";

// Minimal fetch type declaration for both browser and Node.js environments
declare function fetch(
	url: string,
	init?: { headers?: Record<string, string> }
): Promise<{ ok: boolean; json(): Promise<unknown> }>;

const GITHUB_API_LATEST =
	"https://api.github.com/repos/jgraph/drawio/releases/latest";
const GITHUB_RELEASES_PAGE =
	"https://github.com/jgraph/drawio/releases/latest";

const LAST_CHECK_KEY = "drawio-update.lastCheck";
const DISMISSED_VERSION_KEY = "drawio-update.dismissedVersion";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 heures

/** Compare two versions au format "X.Y.Z". Retourne true si b > a. */
function isNewer(current: string, latest: string): boolean {
	const parse = (v: string) =>
		v
			.replace(/^v/, "")
			.split(".")
			.map((n) => parseInt(n, 10) || 0);
	const [ca, cb, cc] = parse(current);
	const [la, lb, lc] = parse(latest);
	if (la !== ca) return la > ca;
	if (lb !== cb) return lb > cb;
	return lc > cc;
}

export class DrawioUpdateFeature {
	public readonly dispose = Disposable.fn();

	constructor(private readonly globalState: vscode.Memento) {
		// Délai au démarrage pour ne pas ralentir l'activation
		const timer = setTimeout(() => this.checkForUpdate(), 5000);
		this.dispose.track({
			dispose: () => clearTimeout(timer),
		});
	}

	private async checkForUpdate(): Promise<void> {
		try {
			const lastCheck = this.globalState.get<number>(LAST_CHECK_KEY, 0);
			const now = Date.now();
			if (now - lastCheck < CHECK_INTERVAL_MS) {
				return;
			}

			await this.globalState.update(LAST_CHECK_KEY, now);

			const response = await fetch(GITHUB_API_LATEST, {
				headers: { "User-Agent": "DrawIo-In-VsCode-extension" },
			});
			if (!response.ok) {
				return;
			}

			const data = await response.json();
			const tagName = (data as { tag_name?: string }).tag_name;
			if (!tagName) {
				return;
			}

			const latestVersion = tagName.replace(/^v/, "");
			const currentVersion = DRAWIO_VERSION;

			if (!isNewer(currentVersion, latestVersion)) {
				return;
			}

			const dismissed =
				this.globalState.get<string>(DISMISSED_VERSION_KEY);
			if (dismissed === latestVersion) {
				return;
			}

			this.showUpdateNotification(currentVersion, latestVersion);
		} catch {
			// Ignorer les erreurs réseau silencieusement
		}
	}

	private showUpdateNotification(
		current: string,
		latest: string
	): void {
		const download = `Télécharger Draw.io ${latest}`;
		const dismiss = "Ignorer";

		vscode.window
			.showInformationMessage(
				`Une nouvelle version de Draw.io est disponible : ${latest} (version actuelle : ${current}).`,
				download,
				dismiss
			)
			.then((choice) => {
				if (choice === download) {
					vscode.env.openExternal(
						vscode.Uri.parse(GITHUB_RELEASES_PAGE)
					);
				} else if (choice === dismiss) {
					this.globalState.update(DISMISSED_VERSION_KEY, latest);
				}
			});
	}
}
