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
		const download = `Voir Draw.io ${latest}`;
		const requestUpdate = "Demander la mise à jour";
		const dismiss = "Ignorer";

		vscode.window
			.showWarningMessage(
				`Draw.io ${latest} est disponible (version actuelle intégrée : ${current}). ⚠️ Attention : mettre à jour Draw.io peut provoquer des dysfonctionnements de l'extension. Si c'est le cas, réinstallez l'extension depuis le Marketplace. Vous pouvez aussi envoyer une demande de mise à jour sur GitHub.`,
				download,
				requestUpdate,
				dismiss
			)
			.then((choice) => {
				if (choice === download) {
					vscode.env.openExternal(
						vscode.Uri.parse(GITHUB_RELEASES_PAGE)
					);
				} else if (choice === requestUpdate) {
					vscode.env.openExternal(
						vscode.Uri.parse(
							"https://github.com/FrankSAURET/drawio-diagrams-editor/issues/new?title=Demande+de+mise+%C3%A0+jour+Draw.io+vers+" +
								encodeURIComponent(latest) +
								"&body=La+version+" +
								encodeURIComponent(latest) +
								"+de+Draw.io+est+disponible.+Merci+de+mettre+%C3%A0+jour+l%27extension."
						)
					);
				} else if (choice === dismiss) {
					this.globalState.update(DISMISSED_VERSION_KEY, latest);
				}
			});
	}
}
