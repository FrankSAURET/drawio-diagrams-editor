import { sendEvent } from "./vscode";

/**
 * SVG lisible hors navigateur : Word, PowerPoint, Inkscape, LibreOffice…
 *
 * Draw.io écrit un SVG pensé pour un navigateur moderne :
 * - l'ombre est un filtre CSS `filter: drop-shadow(...)` dans l'attribut
 *   `style` — ignoré par tous les moteurs SVG hors navigateur, d'où l'export
 *   « sans ombre » ;
 * - les couleurs passent par `light-dark(clair, sombre)` et par des variables
 *   `var(--ge-adaptive-bg, #ffffff)` — non comprises, elles donnent du noir ou
 *   des couleurs fausses une fois collées ailleurs.
 *
 * Ce greffon reprend le SVG produit par `Graph.getSvg` :
 * 1. toujours : chaque `drop-shadow` CSS devient un vrai `<filter>` SVG 1.1
 *    (rendu identique dans un navigateur, reconnu partout ailleurs) ;
 * 2. quand le thème demandé est fixé (« light » ou « dark », pas « auto ») :
 *    `light-dark()` est résolu vers la bonne couleur et `var()` vers sa valeur
 *    de repli. En « auto » ces couleurs adaptatives sont laissées telles quelles.
 *
 * La copie elle-même (thème clair imposé, saveurs écrites) est dans
 * copySelectionAsSvg.ts.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Position de la parenthèse fermante qui répond à celle de `open`. */
function matchParen(s: string, open: number): number {
	let depth = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === "(") depth++;
		else if (s[i] === ")" && --depth === 0) return i;
	}
	return -1;
}

/** Découpe `s` sur `sep` au premier niveau (hors parenthèses). */
function splitTop(s: string, sep: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s[i];
		if (c === "(") depth++;
		else if (c === ")") depth--;
		else if (c === sep && depth === 0) {
			parts.push(s.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(s.slice(start));
	return parts.map((p) => p.trim()).filter((p) => p !== "");
}

/**
 * Remplace chaque appel `fn(...)` de `s` par ce que renvoie `pick` à partir de
 * ses arguments. `pick` renvoie null pour laisser l'appel intact.
 */
function replaceCalls(
	s: string,
	fn: string,
	pick: (args: string[]) => string | null
): string {
	let from = 0;
	for (;;) {
		const at = s.indexOf(fn + "(", from);
		if (at < 0) return s;
		const open = at + fn.length;
		const close = matchParen(s, open);
		if (close < 0) return s;
		const repl = pick(splitTop(s.slice(open + 1, close), ","));
		if (repl == null) {
			from = close + 1;
			continue;
		}
		s = s.slice(0, at) + repl + s.slice(close + 1);
		from = at;
	}
}

/**
 * Résout `light-dark()` et `var(--x, repli)` pour un thème fixé. `vars` porte
 * les variables définies dans le SVG lui-même (déjà résolues) : elles priment
 * sur le repli, qui ne vaut que pour le thème clair.
 */
function resolveColors(
	value: string,
	dark: boolean,
	vars: Map<string, string> = new Map()
): string {
	if (value.indexOf("light-dark(") >= 0) {
		value = replaceCalls(value, "light-dark", (a) =>
			a.length === 2 ? a[dark ? 1 : 0] : null
		);
	}
	if (value.indexOf("var(") >= 0) {
		// Une variable inconnue et sans repli n'a pas d'équivalent : on la garde.
		value = replaceCalls(value, "var", (a) =>
			vars.get(a[0]) ?? (a.length >= 2 ? a.slice(1).join(", ") : null)
		);
	}
	return value;
}

/** Variables CSS déclarées dans les `<style>` du SVG, résolues au thème. */
function collectVars(root: Element, dark: boolean): Map<string, string> {
	const vars = new Map<string, string>();
	const rx = /(--[\w-]+)\s*:\s*([^;}]+)/g;
	for (const st of Array.from(root.getElementsByTagName("style"))) {
		const text = st.textContent || "";
		let m: RegExpExecArray | null;
		while ((m = rx.exec(text)) != null) {
			vars.set(m[1], resolveColors(m[2].trim(), dark, vars));
		}
	}
	return vars;
}

/** Couleur CSS → couleur et opacité séparées, comme les veut `feFlood`. */
function splitAlpha(color: string): { color: string; opacity: number } {
	const m = /^rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i.exec(
		color
	);
	if (m) {
		return {
			color: `rgb(${m[1]}, ${m[2]}, ${m[3]})`,
			opacity: parseFloat(m[4]),
		};
	}
	return { color, opacity: 1 };
}

interface Shadow {
	dx: number;
	dy: number;
	blur: number;
	color: string;
}

/**
 * Lit `drop-shadow(...)` : trois longueurs et une couleur, la couleur placée
 * avant (mxSvgCanvas2D) ou après (mxShape) selon le code de Draw.io qui l'écrit.
 */
function parseDropShadow(args: string, dark: boolean): Shadow | null {
	const tokens = splitTop(args, " ");
	const lengths: number[] = [];
	let color = "black";
	for (const t of tokens) {
		if (/^-?[\d.]+(px)?$/.test(t)) lengths.push(parseFloat(t));
		else color = t;
	}
	if (lengths.length < 2) return null;
	return {
		dx: lengths[0],
		dy: lengths[1],
		blur: lengths[2] ?? 0,
		color: resolveColors(color, dark),
	};
}

/** Retire la déclaration `prop` d'un attribut `style`. */
function removeStyleProp(style: string, prop: string): string {
	return splitTop(style, ";")
		.filter((d) => d.split(":")[0].trim() !== prop)
		.map((d) => d + ";")
		.join(" ");
}

/** Filtre SVG 1.1 équivalent à `drop-shadow` (flou CSS = 2 × écart type). */
function createShadowFilter(
	doc: Document,
	id: string,
	s: Shadow
): Element {
	const el = (name: string, attrs: Record<string, string | number>) => {
		const e = doc.createElementNS(SVG_NS, name);
		for (const k of Object.keys(attrs)) e.setAttribute(k, String(attrs[k]));
		return e;
	};
	const { color, opacity } = splitAlpha(s.color);
	// Région de filtre en coordonnées absolues et très large : en
	// `objectBoundingBox` (défaut) un trait horizontal, de hauteur nulle,
	// disparaîtrait avec son ombre.
	const filter = el("filter", {
		id,
		filterUnits: "userSpaceOnUse",
		x: "-100000",
		y: "-100000",
		width: "200000",
		height: "200000",
		"color-interpolation-filters": "sRGB",
	});
	filter.appendChild(
		el("feGaussianBlur", {
			in: "SourceAlpha",
			stdDeviation: s.blur / 2,
			result: "blur",
		})
	);
	filter.appendChild(
		el("feOffset", { in: "blur", dx: s.dx, dy: s.dy, result: "offset" })
	);
	filter.appendChild(
		el("feFlood", {
			"flood-color": color,
			"flood-opacity": opacity,
			result: "color",
		})
	);
	filter.appendChild(
		el("feComposite", {
			in: "color",
			in2: "offset",
			operator: "in",
			result: "shadow",
		})
	);
	const merge = el("feMerge", {});
	merge.appendChild(el("feMergeNode", { in: "shadow" }));
	merge.appendChild(el("feMergeNode", { in: "SourceGraphic" }));
	filter.appendChild(merge);
	return filter;
}

/** Applique les deux conversions au SVG racine, en place. */
export function makeSvgCompatible(
	root: Element,
	theme: string | null | undefined
): void {
	const fixedTheme = theme === "light" || theme === "dark";
	const dark = theme === "dark";
	const doc = root.ownerDocument;

	let defs = root.getElementsByTagName("defs")[0] as Element | undefined;
	if (defs == null) {
		defs = doc.createElementNS(SVG_NS, "defs");
		root.insertBefore(defs, root.firstChild);
	}

	const vars = fixedTheme ? collectVars(root, dark) : new Map<string, string>();
	const base = (root.getAttribute("id") || "ge-svg") + "-shadow-";
	const filters = new Map<string, string>(); // ombre → id du filtre partagé
	const all = Array.from(root.getElementsByTagName("*"));
	all.unshift(root);

	for (const node of all) {
		// 1. Couleurs adaptatives, dans tous les attributs (style compris).
		if (fixedTheme) {
			for (const attr of Array.from(node.attributes)) {
				const v = attr.value;
				if (v.indexOf("light-dark(") >= 0 || v.indexOf("var(") >= 0) {
					node.setAttribute(attr.name, resolveColors(v, dark, vars));
				}
			}
		}

		// 2. Ombre CSS → filtre SVG.
		const style = node.getAttribute("style");
		if (style == null || style.indexOf("drop-shadow(") < 0) continue;
		const decl = splitTop(style, ";").find(
			(d) => d.split(":")[0].trim() === "filter"
		);
		if (decl == null) continue;
		const value = decl.slice(decl.indexOf(":") + 1).trim();
		const m = /^drop-shadow\((.*)\)$/.exec(value);
		const shadow = m ? parseDropShadow(m[1], dark) : null;
		if (shadow == null) continue;

		const key = JSON.stringify(shadow);
		let id = filters.get(key);
		if (id == null) {
			id = base + filters.size;
			filters.set(key, id);
			defs.appendChild(createShadowFilter(doc, id, shadow));
		}
		node.setAttribute("filter", `url(#${id})`);
		const rest = removeStyleProp(style, "filter");
		if (rest) node.setAttribute("style", rest);
		else node.removeAttribute("style");
	}

	if (fixedTheme) {
		// Le bloc `@supports` des variables adaptatives ne sert plus à rien.
		for (const st of Array.from(root.getElementsByTagName("style"))) {
			if ((st.textContent || "").indexOf("--ge-adaptive") >= 0) {
				st.parentNode?.removeChild(st);
			}
		}
	}
}

Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "svg-compat" });

	const Graph = (window as any).Graph;
	const oldGetSvg = Graph.prototype.getSvg;

	// Index du paramètre `theme` dans Graph.getSvg(background, scale, border,
	// nocrop, crisp, ignoreSelection, showText, imgExport, linkTarget,
	// hasShadow, incExtFonts, theme, ...).
	const THEME_ARG = 11;

	Graph.prototype.getSvg = function (...args: any[]) {
		const root = oldGetSvg.apply(this, args);
		try {
			makeSvgCompatible(root, args[THEME_ARG]);
		} catch (e) {
			// Un SVG non converti reste valable dans un navigateur.
			console.error("svgCompat", e);
		}
		return root;
	};
});
