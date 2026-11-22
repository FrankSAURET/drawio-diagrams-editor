/**
 * Étiquettes HTML → texte SVG natif, pour les logiciels hors navigateur.
 *
 * Draw.io écrit chaque étiquette HTML (gras, italique, centrage, traits `<hr>`,
 * tableaux…) dans un `<foreignObject>`, suivi d'un `<text>` de secours sans
 * mise en forme. Word, PowerPoint, Inkscape ignorent le `<foreignObject>` et
 * n'affichent que ce secours : texte brut, aligné à gauche, sans séparateur.
 *
 * Ici le navigateur fait la mise en page : chaque étiquette est rendue dans un
 * conteneur caché, puis relevée caractère par caractère (`Range`). On en tire :
 * - un `<text>` par morceau de ligne, à sa position exacte, avec police,
 *   taille, graisse, italique, soulignement et couleur ;
 * - un `<rect>` par fond coloré et par bordure visible (dont les `<hr>`) ;
 * - un `<image>` par `<img>`.
 * Le tout remplace le `<switch>` d'origine, dans le même groupe (les rotations
 * et décalages de l'étiquette s'appliquent donc toujours).
 *
 * Limites : retour à la ligne figé (la police de remplacement du logiciel cible
 * peut décaler légèrement la fin des lignes), puces de liste et rognage
 * `overflow=hidden` non reproduits.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Couleur CSS calculée → couleur + opacité ; null si transparente. */
function parseColor(css: string): { color: string; opacity: number } | null {
	const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(css);
	if (m == null) {
		return css === "transparent" || css === "" ? null : { color: css, opacity: 1 };
	}
	let a = m[4] == null ? 1 : parseFloat(m[4]);
	if (m[4] != null && m[4].endsWith("%")) a /= 100;
	if (a <= 0) return null;
	return { color: `rgb(${m[1]}, ${m[2]}, ${m[3]})`, opacity: a };
}

function svgEl(doc: Document, name: string, attrs: Record<string, string | number>): Element {
	const e = doc.createElementNS(SVG_NS, name);
	for (const k of Object.keys(attrs)) e.setAttribute(k, String(attrs[k]));
	return e;
}

function setFill(e: Element, c: { color: string; opacity: number }): void {
	e.setAttribute("fill", c.color);
	if (c.opacity < 1) e.setAttribute("fill-opacity", String(c.opacity));
}

/** Arrondi à 2 décimales : SVG plus court, précision largement suffisante. */
const r2 = (n: number) => Math.round(n * 100) / 100;

let measureCtx: CanvasRenderingContext2D | null = null;

/** Hauteur au-dessus de la ligne de base pour la police d'un élément. */
function fontAscent(cs: CSSStyleDeclaration): number {
	if (measureCtx == null) {
		measureCtx = document.createElement("canvas").getContext("2d");
	}
	const size = parseFloat(cs.fontSize) || 12;
	if (measureCtx == null) return size * 0.8;
	measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	const m = measureCtx.measureText("Hg");
	return m.fontBoundingBoxAscent ?? size * 0.8;
}

interface Run {
	text: string;
	left: number;
	top: number;
	right: number;
}

/** Découpe un nœud texte en morceaux de ligne, d'après la mise en page. */
function textRuns(node: Text, range: Range): Run[] {
	const runs: Run[] = [];
	const data = node.data;
	let cur: Run | null = null;
	for (let i = 0; i < data.length; i++) {
		range.setStart(node, i);
		range.setEnd(node, i + 1);
		const rects = range.getClientRects();
		// Blanc fusionné par le moteur : aucune boîte.
		if (rects.length === 0) continue;
		const rc = rects[rects.length - 1];
		const ch = /\s/.test(data[i]) ? " " : data[i];
		if (rc.width === 0 && ch === " ") continue;
		if (
			cur == null ||
			Math.abs(rc.top - cur.top) > 1 ||
			rc.left < cur.right - 1
		) {
			cur = { text: "", left: rc.left, top: rc.top, right: rc.right };
			runs.push(cur);
		}
		cur.text += ch;
		cur.right = rc.right;
	}
	for (const run of runs) run.text = run.text.replace(/\s+$/, "");
	return runs.filter((run) => run.text.trim() !== "");
}

/** Applique `text-transform` au texte relevé. */
function transformText(text: string, cs: CSSStyleDeclaration): string {
	switch (cs.textTransform) {
		case "uppercase":
			return text.toUpperCase();
		case "lowercase":
			return text.toLowerCase();
		case "capitalize":
			return text.replace(/(^|\s)(\S)/g, (_m, s, c) => s + c.toUpperCase());
		default:
			return text;
	}
}

/** Convertit une étiquette déjà posée dans `host` ; renvoie le groupe SVG. */
function convertLabel(doc: Document, host: HTMLElement, dx: number, dy: number): Element {
	const g = svgEl(doc, "g", {});
	const shapes = svgEl(doc, "g", {});
	const texts = svgEl(doc, "g", {});
	g.appendChild(shapes);
	g.appendChild(texts);

	const origin = host.getBoundingClientRect();
	const X = (x: number) => r2(x - origin.left + dx);
	const Y = (y: number) => r2(y - origin.top + dy);

	// 1. Fonds, bordures, images.
	for (const el of Array.from(host.querySelectorAll("*")) as HTMLElement[]) {
		const cs = getComputedStyle(el);
		const rects = Array.from(el.getClientRects());
		if (rects.length === 0) continue;

		if (el.tagName.toLowerCase() === "img") {
			const src = (el as HTMLImageElement).src;
			const rc = rects[0];
			if (src && rc.width > 0 && rc.height > 0) {
				const img = svgEl(doc, "image", {
					x: X(rc.left), y: Y(rc.top), width: r2(rc.width), height: r2(rc.height),
					preserveAspectRatio: "none",
				});
				img.setAttribute("href", src);
				img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", src);
				shapes.appendChild(img);
			}
			continue;
		}

		const bg = parseColor(cs.backgroundColor);
		const sides: Array<[string, (rc: DOMRect, w: number) => number[]]> = [
			["Top", (rc, w) => [rc.left, rc.top, rc.width, w]],
			["Bottom", (rc, w) => [rc.left, rc.bottom - w, rc.width, w]],
			["Left", (rc, w) => [rc.left, rc.top, w, rc.height]],
			["Right", (rc, w) => [rc.right - w, rc.top, w, rc.height]],
		];
		for (const rc of rects) {
			if (rc.width <= 0 && rc.height <= 0) continue;
			if (bg != null && rc.width > 0 && rc.height > 0) {
				const e = svgEl(doc, "rect", { x: X(rc.left), y: Y(rc.top), width: r2(rc.width), height: r2(rc.height) });
				setFill(e, bg);
				shapes.appendChild(e);
			}
			for (const [side, box] of sides) {
				const w = parseFloat((cs as any)[`border${side}Width`]) || 0;
				const style = (cs as any)[`border${side}Style`];
				const color = parseColor((cs as any)[`border${side}Color`]);
				if (w <= 0 || style === "none" || style === "hidden" || color == null) continue;
				const [x, y, bw, bh] = box(rc, w);
				const e = svgEl(doc, "rect", { x: X(x), y: Y(y), width: r2(bw), height: r2(bh) });
				setFill(e, color);
				shapes.appendChild(e);
			}
		}
	}

	// 2. Texte, morceau de ligne par morceau de ligne.
	const range = document.createRange();
	const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
	for (let n = walker.nextNode(); n != null; n = walker.nextNode()) {
		const node = n as Text;
		const parent = node.parentElement;
		if (parent == null || node.data.trim() === "") continue;
		const cs = getComputedStyle(parent);
		const color = parseColor(cs.color);
		if (color == null) continue;
		const ascent = fontAscent(cs);
		const weight = parseInt(cs.fontWeight, 10) || 400;
		const deco = cs.textDecorationLine || "";

		for (const run of textRuns(node, range)) {
			const t = svgEl(doc, "text", {
				x: X(run.left),
				y: Y(run.top + ascent),
				"font-family": cs.fontFamily,
				"font-size": cs.fontSize,
			});
			if (weight >= 600) t.setAttribute("font-weight", "bold");
			if (cs.fontStyle === "italic" || cs.fontStyle === "oblique") t.setAttribute("font-style", "italic");
			if (deco !== "none" && deco !== "") t.setAttribute("text-decoration", deco);
			setFill(t, color);
			t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
			t.textContent = transformText(run.text, cs);
			texts.appendChild(t);
		}
	}
	range.detach();
	return g;
}

/**
 * Remplace, dans `root` (SVG produit par Graph.getSvg), chaque étiquette en
 * `<foreignObject>` par son équivalent SVG natif. Une étiquette qui échoue
 * garde son `<switch>` d'origine.
 */
export function convertHtmlLabels(root: Element): void {
	const doc = root.ownerDocument;
	const fos = Array.from(root.getElementsByTagNameNS(SVG_NS, "foreignObject"));
	if (fos.length === 0) return;

	// Conteneur invisible (opacité nulle : non annulable par les enfants,
	// contrairement à `visibility`), même mise en page qu'à l'écran.
	const w = parseFloat(root.getAttribute("width") || "") || 1000;
	const h = parseFloat(root.getAttribute("height") || "") || 1000;
	const box = document.createElement("div");
	box.style.cssText =
		"position:fixed;left:0;top:0;opacity:0;pointer-events:none;" +
		`overflow:hidden;z-index:-1;margin:0;padding:0;border:0;width:${w}px;height:${h}px;`;
	document.body.appendChild(box);

	try {
		for (const fo of fos) {
			const sw = fo.parentNode as Element | null;
			// Un foreignObject hors `<switch>` (rare) n'a pas de secours : on le
			// traite aussi, en le remplaçant lui-même.
			const target = sw != null && sw.localName === "switch" ? sw : fo;
			if (target.parentNode == null) continue;
			try {
				// Isolation complète de la page, comme dans un SVG autonome :
				// - Shadow DOM : les feuilles de style de l'éditeur (règles sur
				//   `p`, `box-sizing`…) ne s'appliquent pas à l'étiquette ;
				// - `all:initial` : rien n'est hérité (couleur, police…).
				const shadowHost = document.createElement("div");
				shadowHost.style.cssText =
					"all:initial;display:block;position:absolute;left:0;top:0;" +
					`width:${w}px;height:${h}px;`;
				const host = document.createElement("div");
				host.style.cssText =
					"all:initial;display:block;color-scheme:light;color:#000000;" +
					"position:absolute;left:0;top:0;margin:0;padding:0;border:0;" +
					`width:${w}px;height:${h}px;`;
				for (const child of Array.from(fo.childNodes)) {
					host.appendChild(document.importNode(child, true));
				}
				shadowHost.attachShadow({ mode: "open" }).appendChild(host);
				box.appendChild(shadowHost);
				const dx = parseFloat(fo.getAttribute("x") || "0") || 0;
				const dy = parseFloat(fo.getAttribute("y") || "0") || 0;
				const g = convertLabel(doc, host, dx, dy);
				box.removeChild(shadowHost);
				target.parentNode.replaceChild(g, target);
			} catch (e) {
				console.error("htmlLabelsToSvg", e);
			}
		}
	} finally {
		document.body.removeChild(box);
	}
}
