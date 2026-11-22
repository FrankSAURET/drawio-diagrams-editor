// Test de fumee de la webview : charge le VRAI draw.io du sous-module avec les
// VRAIS greffons construits (dist/custom-drawio-plugins/index.js) dans un
// navigateur, comme le fait l'extension. Sert de garde-fou avant de fusionner
// une mise a jour de draw.io : un symbole interne renomme ou une API changee
// y fait echouer un greffon, ce que ni la construction ni `check-drawio` ne voient.
//
// Usage : yarn test-webview   (apres `yarn build-plugins`)
// Navigateur : Chrome installe (local) ou Chromium de Playwright (CI).
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webapp = join(root, "drawio/src/main/webapp");
// PLUGIN_FILE : greffons construits ailleurs (construction isolée).
const pluginFile = process.env.PLUGIN_FILE || join(root, "dist/custom-drawio-plugins/index.js");
const htmlFile = join(root, "src/DrawioClient/webview-content.html");

// Greffons qui doivent s'annoncer (evenement `pluginLoaded`).
const EXPECTED_PLUGINS = [
	"menu-entries", "version-label", "display-options", "library-storage",
	"library-preview", "local-file-save", "svg-compat", "export-svg-text", "copy-selection-as-svg",
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
	// Presse-papiers autorisé : le test 5 relit ce que « Copier » y a écrit.
	const context = await browser.newContext({
		permissions: ["clipboard-read", "clipboard-write"],
	});
	const page = await context.newPage();
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

	// 4. SVG lisible hors navigateur (greffon svgCompat) : ombre en vrai
	//    <filter>, couleurs resolues au theme clair, plus de CSS adaptatif.
	const svg = await page.evaluate(() => {
		const graph = editorUi.editor.graph;
		const xml = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
			'<mxCell id="s" value="Ombre" style="rounded=1;html=1;shadow=1;fillColor=#dae8fc;" vertex="1" parent="1">' +
			'<mxGeometry x="200" y="40" width="120" height="60" as="geometry"/></mxCell></root></mxGraphModel>';
		graph.model.beginUpdate();
		try { editorUi.pasteXml(xml, false); } finally { graph.model.endUpdate(); }
		const cells = graph.getSelectionCells();
		return mxUtils.getXml(graph.getSvg(null, null, null, null, null, null,
			null, null, null, null, null, "light", null, cells));
	});
	check(/<filter[^>]*>.*feGaussianBlur/.test(svg), "SVG : ombre non convertie en <filter>");
	check(!/drop-shadow\(/.test(svg), "SVG : filtre CSS drop-shadow restant");
	check(!/light-dark\(|var\(--ge-/.test(svg), "SVG : couleurs adaptatives non resolues");
	check(/#dae8fc|rgb\(218, 232, 252\)/i.test(svg), "SVG : couleur de remplissage perdue");

	// 5. « Copier » écrit un SVG (avec le XML Draw.io) dans le presse-papiers.
	const clip = await page.evaluate(async () => {
		const errors = [];
		const oldHandleError = editorUi.handleError;
		editorUi.handleError = function (e) {
			errors.push(String(e && (e.message || e)));
			return oldHandleError.apply(this, arguments);
		};
		// Bloc SysML : étiquette HTML avec italique, gras, centrage et <hr>.
		const graph = editorUi.editor.graph;
		const label = '<p style="margin:0px;margin-top:4px;text-align:center;"><i>«block»</i><br><b>Usager</b></p>' +
			'<hr size="1" style="border-style:solid;"><p style="margin:0px;margin-left:4px;"><i>values</i><br>piéton, cycliste</p>';
		const block = '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
			'<mxCell id="b" value="' + mxUtils.htmlEntities(label) + '" style="verticalAlign=top;align=left;overflow=fill;html=1;whiteSpace=wrap;fillColor=#dae8fc;" vertex="1" parent="1">' +
			'<mxGeometry x="200" y="140" width="140" height="80" as="geometry"/></mxCell></root></mxGraphModel>';
		const shadowCells = graph.getSelectionCells();
		graph.model.beginUpdate();
		try { editorUi.pasteXml(block, false); } finally { graph.model.endUpdate(); }
		graph.addSelectionCells(shadowCells);
		await navigator.clipboard.writeText("vide");
		editorUi.actions.get("copy").funct();
		await new Promise((ok) => setTimeout(ok, 1500));
		const out = {
			errors, types: [], text: "", svg: "",
			copyAsSvgVisible: editorUi.actions.get("copyAsSvg")?.visible,
		};
		for (const item of await navigator.clipboard.read()) {
			for (const t of item.types) {
				out.types.push(t);
				const text = await (await item.getType(t)).text();
				if (t === "text/plain") out.text = text;
				if (t === "image/svg+xml") out.svg = text;
			}
		}
		return out;
	});
	const types = clip.types.join(", ");
	check(clip.errors.length === 0, `copie : erreur ${clip.errors.join(" | ")}`);
	check(clip.types.includes("image/svg+xml"), `copie : pas d'image/svg+xml (types : ${types})`);
	// text/html (<img src="data:…">) : Word le lit en premier et colle un cadre vide.
	check(!clip.types.includes("text/html"), `copie : text/html present (types : ${types})`);
	check(/^<svg[\s>]/.test(clip.text), "copie : text/plain n'est pas la source SVG");
	check(/<svg[^>]*\scontent="/.test(clip.svg), "copie : SVG sans le XML Draw.io (attribut content)");
	check(!/Text is not SVG/.test(clip.svg), "copie : avertissement « Text is not SVG » present");
	// Étiquettes HTML converties en texte SVG natif (Word ignore foreignObject).
	check(!/<foreignObject/.test(clip.svg), "copie : foreignObject restant");
	check(/<text[^>]*font-weight="bold"[^>]*>Usager<\/text>/.test(clip.svg), "copie : gras perdu (Usager)");
	check(/<text[^>]*font-style="italic"[^>]*>«block»<\/text>/.test(clip.svg), "copie : italique perdu («block»)");
	check(/<text[^>]*>Ombre<\/text>/.test(clip.svg), "copie : texte simple perdu (Ombre)");
	check(clip.copyAsSvgVisible === false, "« Copier en SVG » encore visible dans les menus");

	// 5 bis. Retour dans Draw.io : Ctrl+V réel (événement de confiance) du
	//        presse-papiers écrit ci-dessus → cellules modifiables, pas une image.
	await page.evaluate(() => {
		const graph = editorUi.editor.graph;
		graph.clearSelection();
		window.__cellsBefore = Object.keys(graph.model.cells).length;
		// Presse-papiers interne vidé : comme un collage dans un autre onglet
		// (autre webview), seul le presse-papiers système compte.
		mxClipboard.setCells(null);
		graph.container.focus();
		editorUi.clipboardElt?.focus?.();
	});
	await page.keyboard.press("Control+V");
	await page.waitForTimeout(2000);
	const pasted = await page.evaluate(() => {
		const graph = editorUi.editor.graph;
		const added = Object.values(graph.model.cells).slice(window.__cellsBefore);
		return added.map((c) => ({
			value: typeof c.value === "string" ? c.value : "",
			style: c.style || "",
		}));
	});
	check(pasted.some((c) => /Usager/.test(c.value)), `recollage : bloc « Usager » non retrouve comme cellule (${pasted.length} cellule(s) : ${pasted.map((c) => c.style.slice(0, 40)).join(" | ")})`);
	check(!pasted.some((c) => /shape=image|image=data:image\/svg/.test(c.style)), "recollage : arrive en image au lieu de cellules");

	// 5 ter. Export SVG (Fichier → Exporter) : étiquettes en texte SVG natif,
	//        diagramme toujours embarqué quand « modifiable » est demandé.
	const exported = await page.evaluate(() => new Promise((ok) => {
		const timer = setTimeout(() => ok(null), 15000);
		editorUi.editor.graph.clearSelection();
		// scale, transparent, ignoreSelection, shadow, editable, embedImages,
		// border, noCrop, currentPage, linkTarget, theme, exportType,
		// embedFonts, saveFn
		editorUi.exportSvg(1, false, true, false, true, true, 0, false, false,
			null, "light", "diagram", false, (svg) => { clearTimeout(timer); ok(svg); });
	}));
	check(exported != null, "export SVG : rien recu");
	if (exported != null) {
		check(!/<foreignObject/.test(exported), "export SVG : foreignObject restant");
		check(!/Text is not SVG/.test(exported), "export SVG : avertissement « Text is not SVG » present");
		check(/<text[^>]*font-weight="bold"[^>]*>Usager<\/text>/.test(exported), "export SVG : gras perdu (Usager)");
		check(/<svg[^>]*\scontent="/.test(exported), "export SVG : diagramme non embarque (content)");
	}

	// 5 quater. Fichier .drawio.svg (protocole embed, `xmlsvg` → getEmbeddedSvg) :
	//           non converti, il reste le diagramme lui-même.
	const embedded = await page.evaluate(() => new Promise((ok) => {
		const timer = setTimeout(() => ok(null), 15000);
		editorUi.getEmbeddedSvg(editorUi.getFileData(true), editorUi.editor.graph,
			null, true, (svg) => { clearTimeout(timer); ok(svg); });
	}));
	check(embedded != null && /<foreignObject/.test(embedded), ".drawio.svg : etiquettes HTML converties a tort");

	// 5 quinquies. Diagramme avec formules : MathJax compose les formules en SVG
	//              dans l'étiquette ; elles doivent survivre à la conversion.
	const mathSvg = await page.evaluate(() => new Promise((ok) => {
		const timer = setTimeout(() => ok(null), 30000);
		const graph = editorUi.editor.graph;
		Editor.loadMath(() => {
			editorUi.setMathEnabled(true);
			graph.model.beginUpdate();
			try {
				window.__mathCell = graph.insertVertex(graph.getDefaultParent(), null,
					"<b>Aire</b> : `x^2+1`", 400, 300, 160, 60, "text;html=1;align=center;");
			} finally {
				graph.model.endUpdate();
			}
			graph.clearSelection();
			setTimeout(() => editorUi.exportSvg(1, false, true, false, true, true, 0, false, false,
				null, "light", "diagram", false, (svg) => {
					clearTimeout(timer);
					graph.removeCells([window.__mathCell]);
					editorUi.setMathEnabled(false);
					ok(svg);
				}), 1000);
		});
	}));
	if (process.env.DUMP_MATH) writeFileSync(process.env.DUMP_MATH, mathSvg ?? "");
	check(mathSvg != null, "export SVG maths : rien recu");
	if (mathSvg != null) {
		check(!/<foreignObject/.test(mathSvg), "export SVG maths : foreignObject restant");
		check(/<text[^>]*font-weight="bold"[^>]*>Aire<\/text>/.test(mathSvg), "export SVG maths : texte autour de la formule perdu");
		check(!/x\^2/.test(mathSvg.replace(/\scontent="[^"]*"/, "")), "export SVG maths : formule restee en source");
		check(!/<use\b/.test(mathSvg) && !/mjx-/.test(mathSvg.replace(/<style[\s\S]*?<\/style>/g, "").replace(/\scontent="[^"]*"/, "")), "export SVG maths : formule non aplatie (use / mjx)");
		check(/<path[^>]*\sd="/.test(mathSvg), "export SVG maths : traces de la formule absents");
	}

	// 6. Aucune exception non rattrapee.
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
