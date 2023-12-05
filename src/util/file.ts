import type { PathLike } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import { isNodeError } from "./types.js";
import path from "node:path";

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

export async function findFile(filename: string, from: string = process.cwd()) {
	from = path.resolve(from);
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const filepath = path.join(from, filename);
		if (await fileExists(filepath)) return filepath;
		const dirname = path.dirname(from);
		if (from === dirname) return null; // we've reached root
		from = dirname; // next iteration use the parent directory
	}
}
