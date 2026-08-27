import { groupBy } from "../utils/groupBy";
import { DrawioLibraryData, DrawioLibrarySection, res } from "./DrawioTypes";

function mapLib(lib: DrawioLibraryData) {
	return lib.data.kind === "value"
		? {
				title: res(lib.libName),
				data: lib.data.value,
		  }
		: {
				title: res(lib.libName),
				url: lib.data.url,
		  };
}

export function simpleDrawioLibrary(
	libs: DrawioLibraryData[]
): DrawioLibrarySection[] {
	const groupedLibs = groupBy(libs, (l) => l.entryId);

	return [
		{
			title: res("Custom Libraries"),
			entries: [...groupedLibs.values()].map((group) => ({
				title: res(group.key),
				id: group.key,
				libs: group.items.map(mapLib),
			})),
		},
	];
}

/**
 * Nom lisible d'un dossier à partir de son adresse, en gardant les `depth`
 * derniers segments (`Formes/Électronique`). Sert à séparer deux dossiers qui
 * portent le même nom.
 */
function folderLabel(id: string, depth: number): string {
	const parts = id.split("/").filter((p) => p.length > 0);
	return parts
		.slice(-depth)
		.map((p) => {
			try {
				return decodeURIComponent(p);
			} catch (e) {
				return p;
			}
		})
		.join("/");
}

/**
 * Bibliothèques trouvées dans les dossiers configurés.
 *
 * Une catégorie par dossier, titrée du nom du dossier ; à l'intérieur, une
 * entrée par fichier — l'utilisateur coche et décoche chaque bibliothèque
 * séparément dans « Plus de formes ». Le titre affiché est le nom du fichier
 * suivi d'une étoile ; l'identifiant, lui, reprend le chemin relatif et ne
 * doit pas bouger, c'est la clé sous laquelle Draw.io retient les cases
 * cochées d'une session à l'autre.
 */
export function folderDrawioLibrary(
	libs: DrawioLibraryData[]
): DrawioLibrarySection[] {
	if (libs.length === 0) {
		return [];
	}

	// Regroupement par dossier, dans l'ordre où les fichiers ont été trouvés
	// (les dossiers sont parcourus par ordre alphabétique).
	const groups = new Map<
		string,
		{ title: string; items: DrawioLibraryData[] }
	>();
	for (const lib of libs) {
		const id = lib.group ? lib.group.id : "";
		const title = lib.group ? lib.group.title : "Shape Libraries";
		const existing = groups.get(id);
		if (existing) {
			existing.items.push(lib);
		} else {
			groups.set(id, { title, items: [lib] });
		}
	}

	// Deux dossiers de même nom donneraient deux catégories indistinguables :
	// on remonte alors d'un cran dans le chemin pour les départager.
	const sameTitle = new Map<string, number>();
	for (const group of groups.values()) {
		sameTitle.set(group.title, (sameTitle.get(group.title) || 0) + 1);
	}

	return [...groups.entries()].map(([id, group]) => ({
		title: res(
			id !== "" && (sameTitle.get(group.title) || 0) > 1
				? folderLabel(id, 2)
				: group.title
		),
		entries: group.items.map((lib) => ({
			title: res(lib.libName),
			id: lib.entryId,
			libs: [mapLib(lib)],
		})),
	}));
}
