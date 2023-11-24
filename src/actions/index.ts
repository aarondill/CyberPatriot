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
import { fileExists, warn } from "../util/index.js";

function assertDynamicImport(
	module: unknown
): asserts module is Record<string, unknown> {
	if (module && typeof module === "object") return;
	throw new Error(
		"Import returned falsy or non-object. This should be impossible. Is there a then() method?"
	);
}

// Returns a string that can be used to import() actions
// thisfile is used for recursive imports
// Note: `export const importChildren = true` in a dir/index.js to import dir/*
export async function* getActionList(
	thisfile?: string
): AsyncGenerator<string> {
	thisfile ??= path.resolve(fileURLToPath(import.meta.url)); // default is the file this is defined in
	const base = path.dirname(thisfile);
	let dir;
	try {
		dir = await fs.opendir(base);
		// This will close the dir automagically
		for await (const next of dir) {
			const filepath = path.join(base, next.name);
			if (filepath === thisfile) continue; // No recursive import!

			if (next.isDirectory()) {
				// Check if it's a directory, if so return ./actions/dir/index.js
				const index = path.join(filepath, "index.js");
				if (!(await fileExists(index))) continue;
				const indexMod = (await import(index)) as unknown;
				assertDynamicImport(indexMod);
				if (indexMod.importChildren === true) yield* getActionList(filepath);
				yield index;
			}
			// Not a file or directory. move on.
			if (!next.isFile()) continue;
			// Not a .js file. move on.
			if (path.extname(filepath) !== ".js") continue;
			// return ./actions/file.js
			yield filepath;
		}
	} finally {
		await dir?.close();
	}
}

// Note: this uses `as Action`. There's no way to properly check the return type
async function importAction(filepath: string): Promise<Action | false> {
	const actionModule = (await import(filepath)) as unknown;
	assertDynamicImport(actionModule);
	if (!("default" in actionModule)) return false; // skip -- no default export
	const action = actionModule.default;
	if (typeof action !== "function") {
		const msg = `Skipping import action "${filepath}" because the default export is not a function.`;
		return warn(msg); // skip
	}
	// Don't use Function, but there's nothing else I can infer here.
	// eslint-disable-next-line @typescript-eslint/ban-types
	return action satisfies Function as Action;
}

export async function runActions(args: string[]): Promise<boolean> {
	for await (const filepath of getActionList()) {
		const action = await importAction(filepath);
		if (!action) continue;
		const suc = await action(args);
		if (suc === false) return false;
	}
	return true;
}
// This should be considered an action
runActions satisfies Action;
