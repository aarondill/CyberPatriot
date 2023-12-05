export * from "./pstdin.js";
export * from "./flow.js";
export * from "./vm.js";
export * from "./constants.js";
export * from "./backup.js";
export * from "./root.js";
export * from "./types.js";

import { spawn, type SpawnOptions } from "node:child_process";
import type { PathLike } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import { isNodeError } from "./types.js";

export const run = (args: readonly string[], options?: SpawnOptions) =>
	spawn(args[0], args.slice(1), options ?? {});

export async function fileExists(file: PathLike) {
	try {
		await fs.access(file, fs.constants.F_OK);
		return true;
	} catch (e) {
		if (isNodeError(e)) return false;
		throw e; // this is unexpected. Throw it.
	}
}

export async function openFile<R, A extends unknown[]>(
	path: string,
	mode: string | undefined,
	cb: (fd: FileHandle, ...args: A) => R | PromiseLike<R>,
	...args: A
): Promise<R> {
	let fd;
	try {
		fd = await fs.open(path, mode);
		return await cb(fd, ...args);
	} finally {
		await fd?.close();
	}
}
