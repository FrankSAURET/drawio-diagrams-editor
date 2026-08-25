// Construit le paquet .vsix en nommant le fichier avec le numero de lot
// (buildNumber) et non la seule version publique : deux paquets d'un meme
// mois se distinguent alors au premier coup d'oeil.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.buildNumber || pkg.version;
// Nom relatif : le chemin du projet contient des espaces, et npx est
// lance via le shell, qui recolle les arguments sans les proteger.
const out = `${pkg.name}-${version}.vsix`;

const args = [
	"vsce",
	"package",
	"--yarn",
	"--githubBranch",
	"main",
	"--out",
	out,
	...process.argv.slice(2),
];

console.log(`Paquet : ${join(root, out)}`);
execFileSync("npx", args, { cwd: root, stdio: "inherit", shell: true });
