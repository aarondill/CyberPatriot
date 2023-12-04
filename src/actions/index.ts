// Note: this is proper use of void because it's used for the function return
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ActionRet = boolean | undefined | null | void;
/**
 * The return value should be considered success.
 * If false is returned, the function failed.
 * Otherwise, the function was successful.
 */
export type Action = (argv: string[]) => Promise<ActionRet> | ActionRet;
// This type is only permitted in index.js files (they may include only export importChildren)
export type ActionModuleIndexJS = {
	importChildren: boolean;
};
export type ActionModuleOthers = {
	default: Action;
	description?: string;
	// Note: only for index.js files. Ignored elsewhere.
	importChildren?: boolean;
};
export type ActionModule = ActionModuleIndexJS | ActionModuleOthers;

import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import {
	assertDynamicImport,
	colors,
	confirm,
	fileExists,
	warn,
} from "../util/index.js";
import { assert, is, typeGuard } from "tsafe";
import { chalk } from "zx";

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
				const indexMod = await importAction(index, true);
				if (indexMod && indexMod.importChildren === true)
					yield* getActionList(filepath);
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

function importAction(
	filepath: string,
	indexJS: true
): Promise<ActionModuleIndexJS>;
function importAction(
	filepath: string,
	indexJS?: false
): Promise<ActionModuleOthers | null>;
function importAction(
	filepath: string,
	indexJS: boolean
): Promise<ActionModule | null>;

// Note: this uses `as Action`. There's no way to properly check the return type of a function
async function importAction(
	filepath: string,
	// ie. importChildren
	onlyCheckIndexJSRequiredTypes?: boolean
): Promise<ActionModule | null> {
	const actionModule = (await import(filepath)) as unknown;
	assertDynamicImport(actionModule);
	const defaultExport = actionModule.default;
	let { importChildren, description } = actionModule;

	if (typeof importChildren !== "boolean") {
		warn(
			`action "${filepath}" contains an invalid export importChildren=${String(
				importChildren
			)}`
		);
		importChildren = false; // set to false if invalid
		assert(is<false>(importChildren));
	}

	if (onlyCheckIndexJSRequiredTypes) {
		return {
			importChildren: importChildren,
		} satisfies ActionModuleIndexJS;
	}

	if (!typeGuard<Action>(defaultExport, typeof defaultExport === "function")) {
		const msg = `Skipping import action "${filepath}" because default export is not a function.`;
		warn(msg); // skip
		return null;
	}

	if (description !== undefined && typeof description !== "string") {
		warn(`action "${filepath}" contains an invalid description type."`);
		description = undefined;
		assert(is<undefined>(description));
	}

	return {
		// Note: this can't be guarenteed because we can't check the return type.
		default: defaultExport,
		importChildren: importChildren,
		description: description,
	} satisfies ActionModuleOthers;
}

export async function runActions(args: string[]): Promise<boolean> {
	for await (const filepath of getActionList()) {
		const action = await importAction(filepath);
		if (!action) continue;
		const msg = `run action '${action.description ?? filepath}'`;
		if (!(await confirm(msg))) continue;

		const suc = await action.default(args);
		if (suc === false) return false;
	}
	console.log(colors(chalk.bold.green, "All actions completed successfully."));
	return true;
}
// This should be considered an action
runActions satisfies Action;
