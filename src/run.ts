#!/usr/bin/env node
// {{{1
// HACK: Mark chdir as deprecated, since it won't work with zx
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface Process {
			/**@deprecated Use zx.cd() instead */
			chdir(directory: string): void;
		}
	}
}
// }}}
// import "zx/globals";
import { hostname, userInfo } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { $, which } from "zx";
import { runActions } from "./actions/index.js";
import { parseConfig } from "./config.js";
import {
    abort,
    assertRoot,
    confirm,
    error,
    findFile,
    getHome,
    isVM,
    isWindows,
    warn,
} from "./util/index.js";

$.prefix = "set -euC -o pipefail;";
// Check $.shell before running which.sync
if (isWindows && path.basename($.shell.toString()) !== "powershell.exe") {
	$.shell = which.sync("powershell.exe"); // On windows, use powershell, not cmd.exe!
}

async function main(args: string[]) {
	const errmsg = assertRoot();
	if (errmsg) return error(errmsg), 3;

	if (!(await isVM()))
		warn("Warning: This machine was not detected as a virtual machine!");

	const { username } = userInfo();
	const msg = `run the script on this machine (${username}:${hostname()})`;
	if (!(await confirm(msg, false))) return abort(null, 1);

	const thisfile = fileURLToPath(import.meta.url);
	const packageJson = await findFile("package.json", path.dirname(thisfile));
	if (!packageJson) throw new Error("Could not find root directory");

	const root = path.dirname(packageJson);
	const config = await parseConfig(root);
	const suc = await runActions({
		args,
		config,
		root,
		home: getHome(),
	});
	return suc === false ? 1 : 0;
}

void Promise.resolve(main(process.argv.slice(2))).then(
	c => (process.exitCode = c ?? 0)
);
