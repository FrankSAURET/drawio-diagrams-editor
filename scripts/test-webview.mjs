// Test de fumee de la webview : charge le VRAI draw.io du sous-module avec les
// VRAIS greffons construits (dist/custom-drawio-plugins/index.js) dans un
// navigateur, comme le fait l'extension. Sert de garde-fou avant de fusionner
// une mise a jour de draw.io : un symbole interne renomme ou une API changee
// y fait echouer un greffon, ce que ni la construction ni `check-drawio` ne voient.
//
// Usage : yarn test-webview   (apres `yarn build-plugins`)
// Navigateur : Chrome installe (local) ou Chromium de Playwright (CI).
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webapp = join(root, "drawio/src/main/webapp");
const pluginFile = join(root, "dist/custom-drawio-plugins/index.js");
const htmlFile = join(root, "src/DrawioClient/webview-content.html");

// Greffons qui doivent s'annoncer (evenement `pluginLoaded`).
const EXPECTED_PLUGINS = [
	"menu-entries", "version-label", "display-options", "library-storage",
	"library-preview", "local-file-save", "copy-selection-as-svg",
	"paste-svg-text", "focus", "linkSelectedNodeWithData", "LiveShare",
];
// Actions que les greffons doivent avoir enregistrees dans draw.io.
const EXPECTED_ACTIONS = ["vscode.open", "vscode.theme", "properties"];

const DIAGRAM =
	'<mxfile><diagram id="t" name="Page-1"><mxGraphModel><root><mxCell id="0"/>' +
	'<mxCell id="1" parent="0"/><mxCell id="a" value="Hello" vertex="1" parent="1">' +
	'<mxGeometry x="40" y="40" width="80" height="40" as="geometry"/></mxCell>' +
	"</root></mxGraphModel></diagram></mxfile>";

if (!existsSync(pluginFile)) {
	console.error("Greffons absents : lancer `yarn build-plugins` d'abord.");
	process.exit(2);
}
if (!existsSync(join(webapp, "js/app.min.js"))) {
	console.error("Sous-module drawio absent : `git submodule update --init`.");
	process.exit(2);
}

const MIME = {
	".html": "text/html", ".js": "text/javascript", ".css": "text/css",
	".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
	".gif": "image/gif", ".xml": "application/xml", ".txt": "text/plain",
};

/** Meme remplacement de marqueurs que DrawioClientFactory.getOfflineHtml. */
function buildHtml(origin) {
	return readFileSync(htmlFile, "utf8")
		.replace(/\$\$literal-vsuri\$\$/g, `${origin}/webapp`)
		.replace("$$theme$$", JSON.stringify("kennedy"))
		.replace("$$appearance$$", JSON.stringify(0))
		.replace("$$lang$$", JSON.stringify("fr"))
		.replace("$$versionLabel$$", JSON.stringify("2000.1.0"))
		.replace("$$chrome$$", JSON.stringify("1"))
		.replace("$$customPluginPaths$$", JSON.stringify([`${origin}/plugin/index.js`]))
		.replace("$$localStorage$$", JSON.stringify({}))
		.replace("$$additionalCode$$", JSON.stringify([]));
}

const server = createServer((req, res) => {
	const url = new URL(req.url, "http://x");
	let file = null;
	if (url.pathname === "/host.html") {
		res.setHeader("content-type", "text/html");
		return res.end(buildHtml(`http://${req.headers.host}`));
	}
	if (url.pathname === "/plugin/index.js") file = pluginFile;
	else if (url.pathname.startsWith("/webapp/")) {
		const rel = normalize(decodeURIComponent(url.pathname.slice(8)));
		if (!rel.startsWith("..")) file = join(webapp, rel);
	}
	if (file && existsSync(file) && statSync(file).isFile()) {
		res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
		return res.end(readFileSync(file));
	}
	res.statusCode = 404;
	res.end();
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
	browser = await chromium.launch({ channel: "chrome" });
} catch {
	browser = await chromium.launch();
}

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

try {
	const page = await browser.newPage();
	const pageErrors = [];
	page.on("pageerror", (e) => pageErrors.push(e.message));

	// Remplace l'API VS Code : les messages de la webview s'empilent dans __msgs.
	await page.addInitScript(() => {
		window.__msgs = [];
		window.acquireVsCodeApi = () => ({
			postMessage: (m) => window.__msgs.push(m),
		});
	});

	await page.goto(`${origin}/host.html`);

	// Poignee de main du protocole « embed » : configure -> init -> load.
	const events = () => page.evaluate(() => window.__msgs.map((m) => {
		try { return typeof m === "string" ? JSON.parse(m) : m; } catch { return {}; }
	}));
	const waitEvent = async (name, timeout = 60000) => {
		const t0 = Date.now();
		while (Date.now() - t0 < timeout) {
			if ((await events()).some((e) => e.event === name)) return true;
			await page.waitForTimeout(200);
		}
		return false;
	};
	const send = (obj) => page.evaluate((o) => window.postMessage(JSON.stringify(o), "*"), obj);

	check(await waitEvent("configure"), "draw.io n'a pas envoye `configure`");
	await send({ action: "configure", config: {} });
	check(await waitEvent("init"), "draw.io n'a pas envoye `init`");
	await send({ action: "load", xml: DIAGRAM, autosave: 1 });
	check(await waitEvent("load"), "draw.io n'a pas confirme `load`");
	await page.waitForTimeout(1500); // laisse les setTimeout des greffons passer

	// 1. Chaque greffon s'est annonce.
	const loaded = (await events()).filter((e) => e.event === "pluginLoaded").map((e) => e.pluginId);
	for (const id of EXPECTED_PLUGINS) check(loaded.includes(id), `greffon non charge : ${id}`);

	// 2. Actions, menus, etiquette de version.
	const probe = await page.evaluate((actions) => ({
		actions: actions.map((a) => [a, !!editorUi.actions.get(a)]),
		fileMenu: !!editorUi.menus.get("file"),
		versionLabel: document.querySelector(".geVsCodeVersion")?.textContent ?? null,
		cells: Object.keys(editorUi.editor.graph.getModel().cells),
		fileData: editorUi.getFileData(true),
	}), EXPECTED_ACTIONS);
	for (const [name, ok] of probe.actions) check(ok, `action absente : ${name}`);
	check(probe.fileMenu, "menu Fichier absent");
	check(probe.versionLabel?.includes("2000.1.0"), `etiquette de version absente (${probe.versionLabel})`);

	// 3. Aller-retour du diagramme.
	check(probe.cells.includes("a"), "la forme chargee est absente du modele");
	check(/value="Hello"/.test(probe.fileData), "la forme n'est pas dans le XML ecrit");

	// 4. Aucune exception non rattrapee.
	// Bruit amont connu : le module OrgChart (Bridge.NET) est defini a la fois
	// dans extensions.min.js et dans orgchart.min.js, charge a la volee.
	const KNOWN_NOISE = [/OrgChart\.Annotations\.CanBeNullAttribute' is already defined/];
	for (const e of pageErrors) {
		if (!KNOWN_NOISE.some((rx) => rx.test(e))) check(false, `exception de page : ${e}`);
	}
} finally {
	await browser.close();
	server.close();
}

if (failures.length) {
	console.error("ECHEC test-webview :");
	for (const f of failures) console.error(" - " + f);
	process.exit(1);
}
console.log("OK test-webview : draw.io + greffons chargent et le diagramme fait l'aller-retour.");
