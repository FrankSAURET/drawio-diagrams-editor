// Chaine d'integration du sous-module Draw.io.
//
// Trois modes :
//   --check   n'ecrit rien : compare l'etiquette du sous-module a la derniere
//             publiee en amont, puis controle les ressources attendues.
//   (defaut)  amene le sous-module a la derniere etiquette publiee, puis
//             controle les ressources attendues.
//   --to X.Y.Z  meme chose, vers une etiquette precise.
//
// Le controle est le vrai interet du script : la webview hors ligne charge une
// liste de fichiers ecrite a la main (webview-content.html) et le paquet publie
// une liste d'exclusions (.vscodeignore). Une version amont qui renomme ou
// deplace un bundle passe la construction sans erreur et ne casse qu'a
// l'execution. On verifie donc que chaque chemin cite existe reellement.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const submodule = join(root, "drawio");
const webapp = join(submodule, "src/main/webapp");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const toIndex = args.indexOf("--to");
const wanted = toIndex >= 0 ? args[toIndex + 1] : null;

function git(cwd, ...params) {
	return execFileSync("git", params, { cwd, encoding: "utf8" }).trim();
}

/** Compare deux versions « 31.4.2 » champ par champ. */
function compareVersions(a, b) {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] || 0) - (pb[i] || 0);
		if (d !== 0) return d;
	}
	return 0;
}

/** Derniere etiquette « vX.Y.Z » publiee en amont (les tags de test sont ecartes). */
function latestUpstreamTag() {
	const out = execFileSync(
		"git",
		["ls-remote", "--tags", "--refs", "origin"],
		{ cwd: submodule, encoding: "utf8" }
	);
	const versions = out
		.split("\n")
		.map((line) => /refs\/tags\/v(\d+\.\d+\.\d+)$/.exec(line.trim()))
		.filter(Boolean)
		.map((m) => m[1]);
	versions.sort(compareVersions);
	return versions[versions.length - 1];
}

/** Etiquette actuellement sortie dans le sous-module. */
function currentTag() {
	try {
		return git(submodule, "describe", "--tags", "--exact-match").replace(
			/^v/,
			""
		);
	} catch {
		return null;
	}
}

/** Chemins de `webapp` cites par webview-content.html (src=… et href=…). */
function webviewResources() {
	const html = readFileSync(
		join(root, "src/DrawioClient/webview-content.html"),
		"utf8"
	);
	const paths = new Set();
	for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
		const p = m[1];
		// On ne garde que les chemins relatifs vers des ressources du sous-module.
		if (/^(https?:|data:|#|\$\$)/.test(p)) continue;
		if (!/\.(js|css|json)$/.test(p)) continue;
		paths.add(p);
	}
	return [...paths];
}

/** Chemins de `drawio/` explicitement conserves par .vscodeignore (lignes `!drawio/…`). */
function packagedResources() {
	const ignore = readFileSync(join(root, ".vscodeignore"), "utf8");
	return ignore
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.startsWith("!drawio/"))
		.map((l) => l.slice(1).replace(/\/?\*\*$/, ""));
}

/** Verifie l'existence de tout ce que la webview et le paquet supposent present. */
function checkResources() {
	const missing = [];

	for (const p of webviewResources()) {
		if (!existsSync(join(webapp, p))) {
			missing.push(`webview-content.html : ${p}`);
		}
	}

	for (const p of packagedResources()) {
		if (!existsSync(join(root, p))) {
			missing.push(`.vscodeignore : ${p}`);
		}
	}

	if (missing.length > 0) {
		console.error(
			`\n${missing.length} ressource(s) attendue(s) absente(s) du sous-module :`
		);
		for (const m of missing) console.error(`  - ${m}`);
		console.error(
			"\nLa version amont a renomme ou deplace ces fichiers : corriger" +
				" webview-content.html et/ou .vscodeignore avant de livrer."
		);
		return false;
	}

	console.log(
		"Ressources : toutes les entrees de webview-content.html et de" +
			" .vscodeignore existent dans le sous-module."
	);
	return true;
}

const current = currentTag();
console.log(`Sous-module Draw.io : ${current ?? "(hors etiquette)"}`);

console.log("Interrogation des etiquettes amont…");
const latest = latestUpstreamTag();
console.log(`Derniere version publiee : ${latest}`);

const target = wanted ?? latest;

if (checkOnly) {
	if (current !== target) {
		console.log(`\nMise a jour disponible : ${current} -> ${target}`);
	} else {
		console.log("\nSous-module a jour.");
	}
	process.exit(checkResources() ? 0 : 1);
}

if (current !== target) {
	const dirty = git(submodule, "status", "--porcelain");
	if (dirty) {
		console.error(
			"\nLe sous-module contient des modifications locales : les traiter" +
				" avant toute mise a jour.\n" +
				dirty
		);
		process.exit(1);
	}

	console.log(`\nRecuperation de v${target}…`);
	execFileSync("git", ["fetch", "--tags", "origin"], {
		cwd: submodule,
		stdio: "inherit",
	});
	execFileSync("git", ["checkout", `v${target}`], {
		cwd: submodule,
		stdio: "inherit",
	});
	console.log(`Sous-module amene a v${target}.`);
} else {
	console.log("\nSous-module deja a la version voulue.");
}

if (!checkResources()) process.exit(1);

console.log(
	"\nReste a faire a la main : construire (yarn build-extension &&" +
		" yarn build-plugins), essayer un diagramme, puis enregistrer le" +
		" nouveau pointeur du sous-module (git add drawio)."
);
