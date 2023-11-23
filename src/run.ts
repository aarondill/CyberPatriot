#!/usr/bin/env zx
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
import { $, which } from "zx";
import { abort, confirm, error, isVM, warn } from "./util/index.js";
import { hostname, userInfo } from "node:os";
import path from "node:path";
import { isWindows } from "./util/constants.js";
import { runActions } from "./actions/index.js";
import { assertRoot } from "./util/root.js";

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

	await runActions(args);

	return 0;
}

void Promise.resolve(main(process.argv.slice(2))).then(
	c => (process.exitCode = c ?? 0)
);
