/**
 * Thème « Coloré » : icônes en couleur, aspect 3D (dégradé, reflet, ombre
 * portée), dessinées pour cette extension — libres, même licence qu'elle.
 *
 * Chaque clé remplace l'image Draw.io du même nom (`Editor.undoImage`…).
 * Draw.io lit ces images à la construction de l'interface : la webview les
 * substitue juste avant `App.main()`.
 *
 * Le marqueur `vscolore`, laissé lisible dans l'adresse `data:`, permet à la
 * feuille de style de la webview d'annuler l'inversion des couleurs que
 * Draw.io applique aux boutons en mode sombre.
 */

type Pal = "blue" | "green" | "red" | "orange" | "yellow" | "purple" | "teal" | "grey" | "slate" | "glass" | "brown";

/** Clair (haut gauche), foncé (bas droite), contour. */
const PAL: Record<Pal, [string, string, string]> = {
	blue: ["#8fd0ff", "#1565c0", "#0b3d91"],
	green: ["#b6f08f", "#2e7d32", "#1b5e20"],
	red: ["#ff9e94", "#c62828", "#8e0000"],
	orange: ["#ffd59a", "#ef6c00", "#a84300"],
	yellow: ["#fff8b0", "#f9a825", "#b07400"],
	purple: ["#dcb6ff", "#6a1b9a", "#45006e"],
	teal: ["#9ffcf4", "#00838f", "#005662"],
	grey: ["#ffffff", "#a8b0b8", "#5f6a75"],
	slate: ["#b0c4cf", "#37474f", "#1f2b31"],
	glass: ["#ffffff", "#9fd8ff", "#3d7fb8"],
	brown: ["#e8b98a", "#8d5524", "#5d3412"],
};

/** Remplissage dégradé + contour de la teinte. */
function f(p: Pal, sw = 0.7): string {
	return `fill="url(#g-${p})" stroke="${PAL[p][2]}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
}

/** Reflet blanc, posé sur le haut d'une forme. */
function gloss(d: string, opacity = 0.5): string {
	return `<path d="${d}" fill="#fff" opacity="${opacity}"/>`;
}

function rect(x: number, y: number, w: number, h: number, p: Pal, r = 1.2): string {
	return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${f(p)}/>`;
}

/** Barre fine avec reflet (lignes de texte, traits). */
function bar(x: number, y: number, w: number, p: Pal, h = 2.6): string {
	return rect(x, y, w, h, p, h / 2) + gloss(`M${x + 0.8} ${y + 0.5}h${Math.max(w - 1.6, 0.2)}v${h * 0.35}h-${Math.max(w - 1.6, 0.2)}z`, 0.55);
}

function letter(ch: string, p: Pal, opts: { size?: number; x?: number; y?: number; italic?: boolean; family?: string } = {}): string {
	const size = opts.size ?? 19;
	const family = opts.family ?? "Arial Black,Arial,Helvetica,sans-serif";
	return `<text x="${opts.x ?? 12}" y="${opts.y ?? 19.5}" text-anchor="middle" font-family="${family}" font-weight="900" font-size="${size}"${opts.italic ? ' font-style="italic"' : ""} ${f(p, 0.6)}>${ch}</text>`;
}

function circle(cx: number, cy: number, r: number, p: Pal): string {
	return `<circle cx="${cx}" cy="${cy}" r="${r}" ${f(p)}/>` + `<ellipse cx="${cx - r * 0.25}" cy="${cy - r * 0.42}" rx="${r * 0.55}" ry="${r * 0.32}" fill="#fff" opacity=".55"/>`;
}

/** Loupe, avec un symbole facultatif dans le verre. */
function magnifier(inner = ""): string {
	return `<path d="M14.2 15.6l2-2 5.3 5.3a1.4 1.4 0 0 1-2 2z" ${f("brown")}/>`
		+ `<circle cx="9.5" cy="9.5" r="7" ${f("slate", 0.8)}/>`
		+ `<circle cx="9.5" cy="9.5" r="5.2" fill="url(#g-glass)" stroke="#3d7fb8" stroke-width=".5"/>`
		+ inner
		+ `<ellipse cx="7.8" cy="6.9" rx="2.6" ry="1.4" fill="#fff" opacity=".7"/>`;
}

function plusSign(cx: number, cy: number, s: number, p: Pal): string {
	const t = s * 0.36;
	return `<path d="M${cx - t / 2} ${cy - s / 2}h${t}v${(s - t) / 2}h${(s - t) / 2}v${t}h-${(s - t) / 2}v${(s - t) / 2}h-${t}v-${(s - t) / 2}h-${(s - t) / 2}v-${t}h${(s - t) / 2}z" ${f(p, 0.5)}/>`;
}

function minusSign(cx: number, cy: number, s: number, p: Pal): string {
	const t = s * 0.36;
	return `<rect x="${cx - s / 2}" y="${cy - t / 2}" width="${s}" height="${t}" rx="${t / 3}" ${f(p, 0.5)}/>`;
}

/** Badge rond (plus/moins) en coin d'icône. */
function badge(kind: "plus" | "minus", cx = 18, cy = 18): string {
	const p: Pal = kind === "plus" ? "green" : "red";
	return circle(cx, cy, 4.6, p) + (kind === "plus"
		? `<path d="M${cx - 0.7} ${cy - 2.6}h1.4v1.9h1.9v1.4h-1.9v1.9h-1.4v-1.9h-1.9v-1.4h1.9z" fill="#fff"/>`
		: `<rect x="${cx - 2.6}" y="${cy - 0.7}" width="5.2" height="1.4" fill="#fff"/>`);
}

/** Petit tableau 3×3 avec en-tête bleu. */
function table(x = 2, y = 3, w = 16, h = 14): string {
	const cw = w / 3, rh = h / 3;
	let lines = "";
	for (let i = 1; i < 3; i++) {
		lines += `<path d="M${x + cw * i} ${y}v${h}M${x} ${y + rh * i}h${w}" stroke="#5f6a75" stroke-width=".7"/>`;
	}
	return rect(x, y, w, h, "grey", 1)
		+ `<rect x="${x}" y="${y}" width="${w}" height="${rh}" rx="1" ${f("blue", 0.6)}/>`
		+ lines
		+ gloss(`M${x + 0.8} ${y + 0.6}h${w - 1.6}v1.2h-${w - 1.6}z`, 0.6);
}

/** Document avec coin plié. */
function doc(x: number, y: number, p: Pal, lines = true): string {
	return `<path d="M${x} ${y}h7.5l3.5 3.5v11.5h-11z" ${f(p)}/>`
		+ `<path d="M${x + 7.5} ${y}v3.5h3.5" fill="#fff" fill-opacity=".6" stroke="${PAL[p][2]}" stroke-width=".6" stroke-linejoin="round"/>`
		+ (lines ? `<path d="M${x + 2} ${y + 6.5}h7M${x + 2} ${y + 9}h7M${x + 2} ${y + 11.5}h5" stroke="${PAL[p][2]}" stroke-width=".9" stroke-linecap="round" opacity=".7"/>` : "");
}

/** Alignement d'objets : trait de référence rouge + deux blocs bleus. */
function alignObjects(mode: "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom"): string {
	const vertical = mode === "left" || mode === "hcenter" || mode === "right";
	if (vertical) {
		const lineX = mode === "left" ? 4 : mode === "right" ? 20 : 12;
		const x1 = mode === "left" ? 4 : mode === "right" ? 20 - 14 : 12 - 7;
		const x2 = mode === "left" ? 4 : mode === "right" ? 20 - 9 : 12 - 4.5;
		return rect(x1, 5, 14, 5, "blue") + rect(x2, 13, 9, 5, "teal")
			+ `<rect x="${lineX - 0.8}" y="2" width="1.6" height="20" rx=".8" ${f("red", 0.4)}/>`;
	}
	const lineY = mode === "top" ? 4 : mode === "bottom" ? 20 : 12;
	const y1 = mode === "top" ? 4 : mode === "bottom" ? 20 - 14 : 12 - 7;
	const y2 = mode === "top" ? 4 : mode === "bottom" ? 20 - 9 : 12 - 4.5;
	return rect(5, y1, 5, 14, "blue") + rect(13, y2, 5, 9, "teal")
		+ `<rect x="2" y="${lineY - 0.8}" width="20" height="1.6" rx=".8" ${f("red", 0.4)}/>`;
}

/** Alignement de texte : quatre barres. */
function alignText(mode: "left" | "center" | "right" | "justify"): string {
	const widths = mode === "justify" ? [18, 18, 18, 18] : [18, 12, 16, 10];
	return widths.map((w, i) => {
		const x = mode === "right" ? 21 - w : mode === "center" ? 12 - w / 2 : 3;
		return bar(x, 4 + i * 4.4, w, i === 0 ? "blue" : "slate");
	}).join("");
}

/** Flèche de retour (annuler) ; « refaire » la retourne. */
const undoPath = "M9.5 3.5L2.5 9.8l7 6.3v-3.9h4.3c2.6 0 4.2 1.4 4.2 3.6s-1.6 3.7-4.2 3.7H11v3.1h2.8c4.6 0 7.6-2.7 7.6-6.8s-3-6.8-7.6-6.8H9.5z";

const ICONS: Record<string, string> = {
	undoImage: `<path d="${undoPath}" ${f("blue")}/>` + gloss("M9 5.2L4.4 9.4l.9.8L9.5 6.5z M10.3 8.4h3.6c2.6 0 4.8 1 6 2.8-1.6-1.2-3.5-1.6-6-1.6h-3.6z", 0.6),
	redoImage: `<g transform="matrix(-1 0 0 1 24 0)"><path d="${undoPath}" ${f("blue")}/>` + gloss("M9 5.2L4.4 9.4l.9.8L9.5 6.5z M10.3 8.4h3.6c2.6 0 4.8 1 6 2.8-1.6-1.2-3.5-1.6-6-1.6h-3.6z", 0.6) + `</g>`,

	zoomInImage: magnifier(plusSign(9.5, 9.5, 6, "green")),
	zoomOutImage: magnifier(minusSign(9.5, 9.5, 6, "red")),
	magnifyImage: magnifier(),
	zoomFitImage: rect(6, 6, 12, 12, "glass", 1.5)
		+ ["M2 7V2h5", "M17 2h5v5", "M22 17v5h-5", "M7 22H2v-5"].map((d) => `<path d="${d}" fill="none" stroke="${PAL.teal[2]}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="url(#g-teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join(""),

	trashImage: `<path d="M5 7.5h14l-1.3 13a1.6 1.6 0 0 1-1.6 1.5H7.9a1.6 1.6 0 0 1-1.6-1.5z" ${f("red")}/>`
		+ `<path d="M9 10.5v8.5M12 10.5v8.5M15 10.5v8.5" stroke="#8e0000" stroke-width="1" stroke-linecap="round" opacity=".55"/>`
		+ rect(3.5, 4.2, 17, 3, "red", 1) + `<path d="M9.5 4.2V3a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.2" fill="none" stroke="#8e0000" stroke-width="1.1"/>`
		+ gloss("M6.6 8.4h2l.8 12h-1.4z", 0.45),

	toFrontImage: rect(2.5, 2.5, 11, 11, "grey") + rect(9.5, 9.5, 12, 12, "blue") + gloss("M10.5 10.5h10v2.5h-10z", 0.45),
	toBackImage: rect(9.5, 9.5, 12, 12, "blue") + rect(2.5, 2.5, 11, 11, "grey") + gloss("M3.5 3.5h9v2.2h-9z", 0.6),

	fillColorImage: `<path d="M10.5 2.8l8.4 8.4-7.6 7.6a1.5 1.5 0 0 1-2.1 0l-6.3-6.3a1.5 1.5 0 0 1 0-2.1z" ${f("grey")}/>`
		+ `<path d="M3.8 11.2h14.5l-7 7a1.5 1.5 0 0 1-2.1 0z" ${f("orange", 0.5)}/>`
		+ `<path d="M20 13.5c1.3 2.1 2 3.4 2 4.4a2 2 0 0 1-4 0c0-1 .7-2.3 2-4.4z" ${f("red", 0.5)}/>`
		+ `<rect x="2" y="20.5" width="20" height="2.5" rx=".8" ${f("orange", 0.5)}/>`,
	strokeColorImage: `<path d="M15.5 2.5l3.5 3.5-10 10-4.6 1.1 1.1-4.6z" ${f("yellow")}/>`
		+ `<path d="M15.5 2.5l3.5 3.5 1.5-1.5a1.2 1.2 0 0 0 0-1.7l-1.8-1.8a1.2 1.2 0 0 0-1.7 0z" ${f("red", 0.5)}/>`
		+ `<path d="M5.5 12.9l3.6 3.6-4.6 1.1z" fill="#f2d3a8" stroke="#a87b45" stroke-width=".5"/>`
		+ `<rect x="2" y="20.5" width="20" height="2.5" rx=".8" ${f("blue", 0.5)}/>`,
	shadowImage: `<rect x="7" y="7" width="15" height="15" rx="2" fill="#37474f" opacity=".55"/>` + rect(2.5, 2.5, 15, 15, "glass", 2) + gloss("M3.5 3.5h13v3.5h-13z", 0.6),

	plusImage: circle(12, 12, 10, "green") + `<path d="M10.6 6h2.8v4.6H18v2.8h-4.6V18h-2.8v-4.6H6v-2.8h4.6z" fill="#fff" stroke="#1b5e20" stroke-width=".4"/>`,
	shapesImage: `<path d="M6.5 2.5l5.5 9.5H1z" ${f("yellow")}/>` + rect(11, 11, 11, 11, "blue", 1.5) + circle(15.5, 7.5, 5.5, "red"),
	freehandImage: `<path d="M2.5 17c3-6 5-8 6.5-6.5S7 16 9 17s5-9 7.5-9-1 9 1.5 9 3-3 3.5-4" fill="none" stroke="${PAL.purple[2]}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`
		+ `<path d="M2.5 17c3-6 5-8 6.5-6.5S7 16 9 17s5-9 7.5-9-1 9 1.5 9 3-3 3.5-4" fill="none" stroke="url(#g-purple)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,
	sparklesImage: `<path d="M9 3l1.9 5.1L16 10l-5.1 1.9L9 17l-1.9-5.1L2 10l5.1-1.9z" ${f("yellow")}/>`
		+ `<path d="M18 13l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z" ${f("orange", 0.5)}/>`
		+ `<path d="M18 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" ${f("orange", 0.4)}/>`,
	layoutImage: `<path d="M12 8v4M5.5 16v-4h13v4" fill="none" stroke="#5f6a75" stroke-width="1.6" stroke-linejoin="round"/>`
		+ rect(7.5, 2, 9, 6, "orange") + rect(1.5, 16, 8, 6, "blue") + rect(14.5, 16, 8, 6, "blue")
		+ gloss("M8.5 2.8h7v1.6h-7z") + gloss("M2.5 16.8h6v1.6h-6z") + gloss("M15.5 16.8h6v1.6h-6z"),
	tableImage: table(2, 3, 20, 18),
	dockRightImage: rect(2, 3, 20, 18, "grey", 2) + `<rect x="2" y="3" width="20" height="4" rx="2" ${f("slate", 0.6)}/>` + `<rect x="14" y="7" width="8" height="14" rx="1" ${f("blue", 0.6)}/>` + gloss("M15 8h6v2h-6z"),
	formatImage: `<path d="M12 2.5c5.5 0 9.5 3.6 9.5 8 0 3-2.3 4.4-4.6 4.4h-1.8c-1 0-1.6.8-1.6 1.6 0 1.2 1 1.6 1 2.8 0 1.4-1.2 2.2-2.5 2.2-5.5 0-9.5-4.2-9.5-9.5S6.5 2.5 12 2.5z" ${f("orange")}/>`
		+ circle(7.5, 9.5, 1.8, "red") + circle(11.5, 6.5, 1.8, "yellow") + circle(16.2, 8, 1.8, "green") + circle(7.5, 14.3, 1.8, "blue"),
	fullscreenImage: ["M3 9V3h6", "M15 3h6v6", "M21 15v6h-6", "M9 21H3v-6"].map((d) => `<path d="${d}" fill="none" stroke="${PAL.teal[2]}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="url(#g-teal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`).join(""),
	fullscreenExitImage: ["M3 9h6V3", "M15 3v6h6", "M21 15h-6v6", "M9 21v-6H3"].map((d) => `<path d="${d}" fill="none" stroke="${PAL.teal[2]}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="url(#g-teal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`).join(""),

	// Mise en forme du texte
	boldImage: letter("B", "blue"),
	italicImage: letter("I", "purple", { italic: true, family: "Georgia,Times New Roman,serif", size: 21 }),
	underlineImage: letter("U", "teal", { y: 16.5, size: 16 }) + bar(4, 19.5, 16, "red"),
	strikethroughImage: letter("S", "slate") + `<rect x="2.5" y="11.6" width="19" height="2.4" rx="1.2" ${f("red", 0.5)}/>`,
	textFormatImage: letter("A", "blue", { y: 16.5, size: 17 }) + bar(3, 19.5, 18, "orange"),
	fontColorImage: letter("A", "slate", { y: 16.5, size: 17 }) + `<rect x="3" y="19" width="18" height="3.5" rx="1" ${f("red", 0.5)}/>`,
	backgroundColorImage: rect(2.5, 2.5, 19, 19, "yellow", 2.5) + letter("A", "slate", { size: 16, y: 18 }),
	removeFormatImage: letter("T", "slate", { x: 10 }) + circle(17.5, 17.5, 4.6, "red") + `<path d="M15.6 15.6l3.8 3.8M19.4 15.6l-3.8 3.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
	subscriptImage: letter("X", "blue", { x: 9, size: 16, y: 15 }) + letter("2", "orange", { x: 18.5, size: 10, y: 22 }),
	superscriptImage: letter("X", "blue", { x: 9, size: 16, y: 20 }) + letter("2", "orange", { x: 18.5, size: 10, y: 9 }),
	codeImage: `<path d="M8 6l-5.5 6L8 18M16 6l5.5 6L16 18" fill="none" stroke="${PAL.purple[2]}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>`
		+ `<path d="M8 6l-5.5 6L8 18M16 6l5.5 6L16 18" fill="none" stroke="url(#g-purple)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
		+ `<path d="M13.6 4.5l-3.2 15" stroke="${PAL.orange[2]}" stroke-width="3.2" stroke-linecap="round"/><path d="M13.6 4.5l-3.2 15" stroke="url(#g-orange)" stroke-width="1.8" stroke-linecap="round"/>`,
	alignLeftImage: alignText("left"),
	alignCenterImage: alignText("center"),
	alignRightImage: alignText("right"),
	alignJustifyImage: alignText("justify"),
	orderedListImage: letter("1", "orange", { x: 4.5, size: 8, y: 8.5, family: "Arial,sans-serif" }) + letter("2", "orange", { x: 4.5, size: 8, y: 14.5, family: "Arial,sans-serif" }) + letter("3", "orange", { x: 4.5, size: 8, y: 20.5, family: "Arial,sans-serif" })
		+ bar(9, 4.6, 12, "slate") + bar(9, 10.6, 12, "slate") + bar(9, 16.6, 12, "slate"),
	unorderedListImage: circle(4.5, 6, 2.2, "blue") + circle(4.5, 12, 2.2, "green") + circle(4.5, 18, 2.2, "orange")
		+ bar(9, 4.7, 12, "slate") + bar(9, 10.7, 12, "slate") + bar(9, 16.7, 12, "slate"),
	indentImage: bar(3, 3, 18, "slate") + bar(11, 8.2, 10, "slate") + bar(11, 13.2, 10, "slate") + bar(3, 18.4, 18, "slate")
		+ `<path d="M2.5 8.2l5.5 3.8-5.5 3.8z" ${f("green", 0.5)}/>`,
	outdentImage: bar(3, 3, 18, "slate") + bar(11, 8.2, 10, "slate") + bar(11, 13.2, 10, "slate") + bar(3, 18.4, 18, "slate")
		+ `<path d="M8 8.2l-5.5 3.8L8 15.8z" ${f("red", 0.5)}/>`,
	horizontalRuleImage: bar(2, 10.7, 20, "blue"),
	linkImage: `<path d="M10.2 14.2l4-4" stroke="${PAL.blue[2]}" stroke-width="3.4" stroke-linecap="round"/>`
		+ `<path d="M7.6 11.4l-2.8 2.8a3.4 3.4 0 0 0 4.8 4.8l2.8-2.8M16.4 12.6l2.8-2.8a3.4 3.4 0 0 0-4.8-4.8l-2.8 2.8" fill="none" stroke="${PAL.blue[2]}" stroke-width="3.8" stroke-linecap="round"/>`
		+ `<path d="M7.6 11.4l-2.8 2.8a3.4 3.4 0 0 0 4.8 4.8l2.8-2.8M16.4 12.6l2.8-2.8a3.4 3.4 0 0 0-4.8-4.8l-2.8 2.8M10.2 14.2l4-4" fill="none" stroke="url(#g-blue)" stroke-width="2.2" stroke-linecap="round"/>`,

	// Édition, outils
	copyImage: doc(3, 2, "grey") + doc(10, 6, "blue"),
	duplicateImage: doc(3, 2, "blue") + doc(10, 6, "blue") + badge("plus", 18, 18),
	pasteImage: rect(3.5, 4, 14, 18, "brown", 1.5) + rect(7, 2, 7, 4, "grey", 1) + doc(10, 8, "grey"),
	editImage: `<path d="M16 2.5l5.5 5.5-12 12-6.4 1.4 1.4-6.4z" ${f("yellow")}/>`
		+ `<path d="M16 2.5l5.5 5.5 1-1a1.8 1.8 0 0 0 0-2.5l-3-3a1.8 1.8 0 0 0-2.5 0z" ${f("red", 0.5)}/>`
		+ `<path d="M4.5 15l4.5 4.5-6.4 1.4z" fill="#f2d3a8" stroke="#a87b45" stroke-width=".5"/>`,
	gearImage: `<path d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z" ${f("slate")}/>`
		+ `<circle cx="12" cy="12" r="3.6" fill="url(#g-glass)" stroke="#1f2b31" stroke-width=".7"/>`,
	helpImage: circle(12, 12, 10, "blue") + `<text x="12" y="17.6" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="15" fill="#fff">?</text>`,
	layersImage: `<path d="M12 13.5l9.5 4.5-9.5 4.5L2.5 18z" ${f("orange")}/>`
		+ `<path d="M12 8l9.5 4.5L12 17l-9.5-4.5z" ${f("green")}/>`
		+ `<path d="M12 2.5L21.5 7 12 11.5 2.5 7z" ${f("blue")}/>` + gloss("M12 3.6l6 2.8-6 1z", 0.5),
	lockedImage: `<path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" fill="none" stroke="#5f6a75" stroke-width="2.6"/>` + rect(4, 10.5, 16, 11.5, "yellow", 2)
		+ `<circle cx="12" cy="15.4" r="1.6" fill="#7a4f00"/><path d="M11.3 16h1.4l.4 3h-2.2z" fill="#7a4f00"/>` + gloss("M5 11.5h14v2.5H5z", 0.5),
	unlockedImage: `<path d="M7.5 11V7.5a4.5 4.5 0 0 1 8.8-1.3" fill="none" stroke="#5f6a75" stroke-width="2.6"/>` + rect(4, 10.5, 16, 11.5, "green", 2)
		+ `<circle cx="12" cy="15.4" r="1.6" fill="#1b5e20"/><path d="M11.3 16h1.4l.4 3h-2.2z" fill="#1b5e20"/>` + gloss("M5 11.5h14v2.5H5z", 0.5),
	visibleImage: `<path d="M1.5 12C4 7 8 4.5 12 4.5S20 7 22.5 12C20 17 16 19.5 12 19.5S4 17 1.5 12z" ${f("grey")}/>` + circle(12, 12, 4.6, "blue") + `<circle cx="12" cy="12" r="2" fill="#0b2545"/>`,
	hiddenImage: `<path d="M1.5 12C4 7 8 4.5 12 4.5S20 7 22.5 12C20 17 16 19.5 12 19.5S4 17 1.5 12z" ${f("grey")}/>` + circle(12, 12, 4.6, "slate")
		+ `<path d="M3.5 3.5l17 17" stroke="#8e0000" stroke-width="3.4" stroke-linecap="round"/><path d="M3.5 3.5l17 17" stroke="url(#g-red)" stroke-width="2" stroke-linecap="round"/>`,
	imageImage: rect(2, 3.5, 20, 17, "glass", 2)
		+ `<path d="M2.6 18.5l6-7 4.5 5 2.8-3 5.5 5.5v.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.4-1z" ${f("green", 0.5)}/>` + circle(16.5, 8.5, 2.3, "yellow"),
	saveImage: rect(2.5, 2.5, 19, 19, "blue", 2) + `<rect x="6" y="2.5" width="11" height="6.5" rx=".6" ${f("grey", 0.5)}/><rect x="13.5" y="3.6" width="2" height="4" fill="#37474f"/>`
		+ `<rect x="5.5" y="12.5" width="13" height="9" rx=".8" fill="#fff" stroke="#0b3d91" stroke-width=".5"/>`,
	refreshImage: `<path d="M19.5 9A8 8 0 0 0 5 7.5" fill="none" stroke="${PAL.green[2]}" stroke-width="3.6" stroke-linecap="round"/><path d="M19.5 9A8 8 0 0 0 5 7.5" fill="none" stroke="url(#g-green)" stroke-width="2.2" stroke-linecap="round"/>`
		+ `<path d="M4.5 15A8 8 0 0 0 19 16.5" fill="none" stroke="${PAL.green[2]}" stroke-width="3.6" stroke-linecap="round"/><path d="M4.5 15A8 8 0 0 0 19 16.5" fill="none" stroke="url(#g-green)" stroke-width="2.2" stroke-linecap="round"/>`
		+ `<path d="M21.5 3.5v7h-7z" ${f("green", 0.5)}/><path d="M2.5 20.5v-7h7z" ${f("green", 0.5)}/>`,

	// Format > Disposer
	alignHorizontalLeftImage: alignObjects("left"),
	alignHorizontalCenterImage: alignObjects("hcenter"),
	alignHorizontalRightImage: alignObjects("right"),
	alignVerticalTopImage: alignObjects("top"),
	alignVerticalMiddleImage: alignObjects("vmiddle"),
	alignVerticalBottomImage: alignObjects("bottom"),

	// Tableaux
	addColumnLeftImage: table() + badge("plus", 18, 18),
	addColumnRightImage: table() + badge("plus", 18, 18),
	addRowAboveImage: table() + badge("plus", 18, 18),
	addRowBelowImage: table() + badge("plus", 18, 18),
	removeColumnImage: table() + badge("minus", 18, 18),
	removeRowImage: table() + badge("minus", 18, 18),
};

/** Définitions partagées : ombre portée + dégradés réellement utilisés. */
function defs(body: string): string {
	let grads = "";
	for (const p of Object.keys(PAL) as Pal[]) {
		if (body.includes(`#g-${p})`)) {
			const [light, dark] = PAL[p];
			grads += `<linearGradient id="g-${p}" x1="0" y1="0" x2=".55" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
		}
	}
	return `<defs>${grads}<filter id="s" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx=".4" dy=".9" stdDeviation=".7" flood-color="#000" flood-opacity=".35"/></filter></defs>`;
}

/** Adresse `data:` lisible en CSS sans guillemets (`url(...)`), marqueur compris. */
function toDataUri(body: string): string {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" data-vsc="vscolore">${defs(body)}<g filter="url(#s)">${body}</g></svg>`;
	return "data:image/svg+xml," + encodeURIComponent(svg)
		.replace(/\(/g, "%28")
		.replace(/\)/g, "%29")
		.replace(/'/g, "%27");
}

let cache: Record<string, string> | undefined;

/** Clé `Editor.xxxImage` → adresse `data:` de l'icône colorée. */
export function getColoredIconUris(): Record<string, string> {
	if (!cache) {
		cache = {};
		for (const [key, body] of Object.entries(ICONS)) {
			cache[key] = toDataUri(body);
		}
	}
	return cache;
}
