// Note: this is proper use of void because it's used for the function return
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ActionRet = boolean | undefined | null | void;
export type ActionOptions = {
	args: string[];
	config: YamlConfig;
	root: string;
	home: string;
};
/**
 * The return value should be considered success.
 * If false is returned, the function failed.
 * Otherwise, the function was successful.
 */
export type Action = (opts: ActionOptions) => Promise<ActionRet> | ActionRet;
// This type is only permitted in index.js files (they may include only export importChildren)
export type ActionModuleIndexJS = {
	importChildren: boolean;
};
export type ActionModuleOthers = {
	default: Action;
	description?: string;
	// Note: only for index.js files. Ignored elsewhere.
	importChildren?: boolean;
	// if true, this action will not be run or prompted
	disabled?: boolean;
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
import type { YamlConfig } from "../config.js";

// Returns a string that can be used to import() actions
// thisfile is used for recursive imports
// Note: `export const importChildren = true` in a dir/index.js to import dir/*
export async function* getActionList(
	thisfile?: string
): AsyncGenerator<string> {
	thisfile ??= path.resolve(fileURLToPath(import.meta.url)); // default is the file this is defined in
	const base = path.dirname(thisfile);
	const dir = await fs.readdir(base, { withFileTypes: true });
	dir.sort((a, b) => a.name.localeCompare(b.name)); // sort lexagraphically. This is only to ensure consistent ording for the user.

	for (const next of dir) {
		const filepath = path.join(base, next.name);
		// Note: thisfile is the current index.js file executing. This should never be an issue because you can't have multiple index.js files in the same directory.
		if (filepath === thisfile) continue; // No recursive import!

		if (next.isDirectory()) {
			// Check if it's a directory, if so return ./actions/dir/index.js
			const index = path.join(filepath, "index.js");
			if (!(await fileExists(index))) continue;
			const indexMod = await importAction(index, true);
			if (indexMod && indexMod.importChildren === true)
				yield* getActionList(index);
			// Check that the index.js file exports a function before yeilding it
			if ("default" in indexMod && typeof indexMod.default === "function")
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
	let { importChildren, description, disabled } = actionModule;

	if (!importChildren) importChildren = false; // undefined and any falsey values are false
	if (typeof importChildren !== "boolean") {
		warn(
			`Action "${filepath}" contains an invalid export importChildren=${String(
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

	if (!disabled) disabled = false; // undefined and any falsey values are false
	if (typeof disabled !== "boolean") {
		warn(
			`Action "${filepath}" contains an invalid export disabled=${String(
				disabled
			)}`
		);
		disabled = false; // set to false if invalid
		assert(is<false>(disabled));
	}

	if (!typeGuard<Action>(defaultExport, typeof defaultExport === "function")) {
		const msg = `Skipping import action "${filepath}" because default export is not a function.`;
		warn(msg); // skip
		return null;
	}

	if (description !== undefined && typeof description !== "string") {
		warn(`Action "${filepath}" contains an invalid description type."`);
		description = undefined;
		assert(is<undefined>(description));
	}

	return {
		// Note: this can't be guarenteed because we can't check the return type.
		default: defaultExport,
		importChildren,
		description,
		disabled,
	} satisfies ActionModuleOthers;
}

export async function runActions(opts: ActionOptions): Promise<boolean> {
	for await (const filepath of getActionList()) {
		const action = await importAction(filepath);
		if (!action) continue;
		if (action.disabled) continue;
		console.log(); // Place spacing
		const msg = colors(
			chalk.yellow,
			`run action '${action.description ?? filepath}'`
		);
		if (!(await confirm(msg, true))) continue;

		const suc = await action.default(opts);
		if (suc === false) return false;
	}
	console.log(colors(chalk.bold.green, "All actions completed successfully."));
	return true;
}
// This should be considered an action
void (runActions satisfies Action);
