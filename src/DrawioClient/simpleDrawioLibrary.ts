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
 * Bibliothèques trouvées dans les dossiers configurés.
 *
 * Une entrée par fichier — l'utilisateur coche et décoche chaque bibliothèque
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

	return [
		{
			title: res("Library Folders"),
			entries: libs.map((lib) => ({
				title: res(lib.libName),
				id: lib.entryId,
				libs: [mapLib(lib)],
			})),
		},
	];
}
