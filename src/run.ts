#!/usr/bin/env zx
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface Process {
			/**@deprecated Use zx.cd() instead */
			// HACK: Mark chdir as deprecated, since it won't work with zx
			chdir(directory: string): void;
		}
	}
}

// import "zx/globals";
import { $ } from "zx";
$.prefix = "set -euC -o pipefail;";

async function main(args: string[]) {
	void args;

	return await Promise.resolve(0);
}

void main(process.argv.slice(2)).then(c => process.exit(c ?? 0));
