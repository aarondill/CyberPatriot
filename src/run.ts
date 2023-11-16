#!/usr/bin/env zx
import "zx/globals";
$.prefix = "set -euC -o pipefail;";

async function main(args: string[]) {
	void args;
	return await Promise.resolve(0);
}

void main(process.argv.slice(2)).then(c => process.exit(c ?? 0));
