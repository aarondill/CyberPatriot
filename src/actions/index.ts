// Note: this is proper use of void because it's used for the function return
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ActionRet = boolean | undefined | null | void;
/**
 * The return value should be considered success.
 * If false is returned, the function failed.
 * Otherwise, the function was successful.
 */
export type Action = (argv: string[]) => Promise<ActionRet> | ActionRet;

import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import { fileExists } from "../util/index.js";

// Returns a string that can be used to import() actions
export async function* getActionList() {
	const thisfile = path.resolve(fileURLToPath(import.meta.url));
	const base = path.dirname(thisfile);
	const dir = await fs.opendir(base);

	let next;
	while ((next = await dir.read())) {
		const filepath = path.join(base, next.name);
		if (filepath === thisfile) continue; // No recursive import!

		if (next.isDirectory()) {
			// Check if it's a directory, if so return ./actions/dir/index.js
			const index = path.join(filepath, "index.js");
			if (!(await fileExists(index))) continue;
			yield index;
		}
		// Not a file or directory. move on.
		if (!next.isFile()) continue;
		// Not a .js file. move on.
		if (path.extname(filepath) !== ".js") continue;
		// return ./actions/file.js
		yield filepath;
	}
}

// Note: this uses `as Action`. There's no way to properly check the return type
async function importAction(filepath: string): Promise<Action | string> {
	const actionModule = (await import(filepath)) as unknown;
	if (!actionModule || typeof actionModule !== "object")
		throw new Error(
			"Import returned falsey or non-object. This should be impossible. Is there a then() method?"
		);
	if (!("default" in actionModule)) return "no default action exported!";
	const action = actionModule.default;
	if (typeof action !== "function") return `not a function!`;
	// Don't use Function, but there's nothing else I can infer here.
	// eslint-disable-next-line @typescript-eslint/ban-types
	return action satisfies Function as Action;
}

export async function runActions(args: string[]): Promise<boolean> {
	for await (const filepath of getActionList()) {
		const action = await importAction(filepath);
		if (typeof action === "string")
			throw new Error(`Error importing ${filepath}: ${action}`);
		const suc = await action(args);
		if (suc === false) return false;
	}
	return true;
}
