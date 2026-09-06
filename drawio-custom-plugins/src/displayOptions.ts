import { sendEvent } from "./vscode";

/**
 * Trois cases à cocher dans le panneau de droite, onglet « Diagramme »,
 * catégorie « Options » : icônes de lien, icônes de bulle d'aide, poignée
 * de connexion.
 *
 * Ces trois options existent déjà côté Draw.io mais uniquement en
 * configuration (`Editor.showLinkIcons`…), donc figées au chargement. Le
 * greffon les rend basculables en cours d'édition, et renvoie chaque
 * changement à l'extension pour qu'il soit écrit dans les réglages de
 * VS Code : les cases et la page des paramètres restent d'accord, et l'état
 * survit à la fermeture du document.
 *
 * Deux niveaux à tenir à jour pour un basculement à chaud :
 *  - `Editor.showLinkIcons` / `showTooltipIcons` : lus à l'initialisation
 *    seulement, puis recopiés dans `graph.*` (`EditorUi.js`, `installShapePicker`) ;
 *  - `graph.showLinkIcons` / `showTooltipIcons` : ce que le rendu consulte
 *    réellement à chaque survol de forme.
 * `showConnectHandle` échappe à cette recopie : `Graph.isConnectHandleEnabled`
 * relit `Editor.showConnectHandle` à chaque fois.
 */
Draw.loadPlugin((ui) => {
	sendEvent({ event: "pluginLoaded", pluginId: "display-options" });

	const anyWindow = window as any;
	const anyEditor = Editor as any;

	function log(...msg: any[]): void {
		try {
			if (typeof anyWindow.log === "function") {
				anyWindow.log(...msg);
			}
		} catch (e) {
			// Le journal ne doit jamais casser l'éditeur.
		}
	}

	/**
	 * L'interface est-elle en français ? Les libellés viennent du
	 * dictionnaire de Draw.io, mais pas les descriptions : celui-ci ne connaît
	 * que les trois titres, sans texte explicatif.
	 */
	const isFrench = String(
		anyWindow.mxLanguage || anyWindow.mxClient?.language || ""
	)
		.toLowerCase()
		.startsWith("fr");

	/** Les trois options, dans l'ordre où elles s'affichent. */
	const options: {
		/** Nom du réglage VS Code, sans le préfixe de l'extension. */
		setting: DisplayOptionName;
		/** Clé de libellé de Draw.io — les trois sont déjà traduites. */
		labelKey: string;
		/** Libellé de repli si le dictionnaire ne connaît pas la clé. */
		fallback: string;
		/** Info-bulle : ce que la case fait réellement. */
		hint: string;
		hintFr: string;
		/**
		 * Champ recopié dans `graph` à l'initialisation. Absent pour la
		 * poignée de connexion, relue directement sur `Editor`.
		 */
		graphField?: "showLinkIcons" | "showTooltipIcons";
	}[] = [
		{
			setting: "showLinkIcons",
			labelKey: "linkIcons",
			fallback: "Link Icons",
			hint: "Permanently shows a small link icon on every shape that carries a link, instead of only on hover.",
			hintFr:
				"Affiche en permanence une petite icône de lien sur chaque forme qui porte un lien, au lieu de ne la montrer qu'au survol.",
			graphField: "showLinkIcons",
		},
		{
			setting: "showTooltipIcons",
			labelKey: "tooltipIcons",
			fallback: "Tooltip Icons",
			hint: "Permanently shows a small marker on every shape that carries a tooltip, instead of only on hover.",
			hintFr:
				"Affiche en permanence un petit marqueur sur chaque forme qui porte une bulle d'aide, au lieu de ne le montrer qu'au survol.",
			graphField: "showTooltipIcons",
		},
		{
			setting: "showConnectHandle",
			labelKey: "cfgShowConnectHandle",
			fallback: "Show Connect Handle",
			hint: "Shows the connection handle (the blue arrow used to draw an edge) on the selected shape.",
			hintFr:
				"Affiche la poignée de connexion (la flèche bleue qui sert à tirer un lien) sur la forme sélectionnée.",
		},
	];

	function get(o: (typeof options)[number]): boolean {
		return anyEditor[o.setting] === true;
	}

	function set(o: (typeof options)[number], value: boolean): void {
		anyEditor[o.setting] = value;

		if (o.graphField != null) {
			(ui.editor.graph as any)[o.graphField] = value;
		}
	}

	/**
	 * Panneau du diagramme : on ajoute nos trois cases à la suite de celles
	 * de Draw.io (flèches de connexion, points de connexion, guides).
	 */
	const oldAddOptions = (DiagramFormatPanel as any).prototype.addOptions;

	(DiagramFormatPanel as any).prototype.addOptions = function (
		div: HTMLElement
	) {
		const result = oldAddOptions.apply(this, arguments as any);
		const graph = this.editorUi.editor.graph;

		if (!graph.isEnabled()) {
			return result;
		}

		for (const o of options) {
			const label = mxResources.get(o.labelKey, null, o.fallback);
			// Sans cela, `createOption` met le libellé lui-même en info-bulle,
			// ce qui n'apprend rien : on y met la description.
			const hint = label + " — " + (isFrench ? o.hintFr : o.hint);

			div.appendChild(
				this.createOption(
					label,
					function () {
						return get(o);
					},
					function (checked: boolean) {
						set(o, checked);

						// Les icônes ne sont posées qu'au survol suivant :
						// un redessin complet évite d'attendre.
						graph.refresh();

						sendEvent({
							event: "setDisplayOption",
							setting: o.setting,
							value: checked,
						});

						log(
							"displayOptions: " + o.setting + " = " + checked
						);
					},
					null,
					function (optionDiv: HTMLElement) {
						optionDiv.setAttribute("title", hint);

						// La case et son libellé portent aussi le titre posé
						// par `createOption` : sans cela, survoler l'un ou
						// l'autre montrerait encore l'ancienne info-bulle.
						const children =
							optionDiv.querySelectorAll("[title]");
						for (let i = 0; i < children.length; i++) {
							children[i].setAttribute("title", hint);
						}
					}
				)
			);
		}

		return result;
	};
});
