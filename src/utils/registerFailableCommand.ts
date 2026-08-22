import { l10n } from "vscode";
import { commands, window, Disposable } from "vscode";

export function registerFailableCommand(
	commandName: string,
	commandFn: (...args: any[]) => any
): Disposable {
	return commands.registerCommand(commandName, async (...args: any[]) => {
		try {
			return await commandFn(...args);
		} catch (e : any) {
			window.showErrorMessage(
					l10n.t("The command failed: {0}", e.message)
				);
			return false;
		}
	});
}
