#!/usr/bin/env node
///@ts-check
/*
 * This is a fork of yarpm (https://www.npmjs.com/package/yarpm), which is simplified and can run bun
 * The major difference is that if $npm_execpath is an executable file, then it will be spawned instead of `node $npm_execpath`
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Gets the path to the npm executable and the arguments to pass to it.
 *
 * @param {string|undefined} npmPath - The path to the npm executable.
 * @param {string[]} argv - The argument list to pass to npm/pnpm/yarn.
 */
function getArgs(npmPath, argv) {
	if (!npmPath) return { execPath: "npm", spawnArgs: argv }; // default to npm
	// Given an .exe (windows), just run that
	if (path.extname(npmPath) === ".exe")
		return { execPath: npmPath, spawnArgs: argv };
	// Check if executable. This check allows bun to work.
	try {
		fs.accessSync(npmPath, fs.constants.X_OK); // This throws if it is not executable
		return { execPath: npmPath, spawnArgs: argv }; // npmPath is executable, pass argv to it
	} catch {}
	return { execPath: process.execPath, spawnArgs: [npmPath, ...argv] }; // npmPath is not executable, pass it to node
}
/**
 * Runs either npm, pnpm or yarn in a child process, depending on whether current process was itself started via
 * `npm run`, `pnpm run` or `yarn run`. Passes all command line arguments down to the child process.
 *
 * @param {string[]} argv - The argument list to pass to npm/pnpm/yarn.
 * @returns {Promise<{ spawnArgs: string[], code: number? }>}
 *   A promise object which becomes fulfilled when npm/yarn child process is finished.
 */
export function yarpm(argv) {
	const { execPath, spawnArgs } = getArgs(process.env.npm_execpath, argv);
	const child = spawn(execPath, spawnArgs, { stdio: "inherit" });

	// Piping stdio.
	if (child.stdin) process.stdin.pipe(child.stdin);
	child.stdout?.pipe(process.stdout, { end: false });
	child.stderr?.pipe(process.stderr, { end: false });

	return new Promise((resolve, reject) => {
		child.on("error", err => reject(err));
		child.on("close", code => resolve({ spawnArgs, code }));
	});
}
await yarpm(process.argv.slice(2));
