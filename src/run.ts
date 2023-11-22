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
import { $, chalk, which } from "zx";
import { abort, colors, confirm, isVM } from "./util/init.js";
import { hostname, userInfo } from "node:os";
import path from "node:path";
import { isWindows } from "./util/contants.js";

$.prefix = "set -euC -o pipefail;";
// Check $.shell before running which.sync
if (isWindows && path.basename($.shell.toString()) !== "powershell.exe") {
	$.shell = which.sync("powershell.exe"); // On windows, use powershell, not cmd.exe!
}

async function main(args: string[]) {
	void args;
	if (!(await isVM()))
		console.error(
			colors(
				chalk.yellowBright.bold,
				"Warning: This machine was not detected as a virtual machine!"
			)
		);

	const { username } = userInfo();
	const msg = `run the script on this machine (${username}:${hostname()})`;
	if (!(await confirm(msg, false))) return abort(null, 1);

	return 0;
}

void Promise.resolve(main(process.argv.slice(2))).then(
	c => (process.exitCode = c ?? 0)
);
