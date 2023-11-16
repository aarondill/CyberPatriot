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
import "zx/globals";
import { $ } from "zx";

$.prefix = "set -euC -o pipefail;";

async function main(args: string[]) {
	void args;
	// Do some things!

	return await Promise.resolve(0);
}

void Promise.resolve(main(process.argv.slice(2))).then(c =>
	process.exit(c ?? 0)
);
