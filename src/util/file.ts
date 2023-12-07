import type { Mode, PathLike } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import { FALSECB, TRUECB } from "./types.js";
import path from "node:path";
import type { Parameters } from "tsafe";

export function fileAccess(...args: Parameters<typeof fs.access>) {
	return fs.access(...args).then(TRUECB, FALSECB);
}
export async function fileExists(file: PathLike) {
	return await fileAccess(file, fs.constants.F_OK);
}

export async function openFile<R, A extends unknown[]>(
	path: PathLike,
	mode: Mode,
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

/** Returns the path to filename */
export async function findFile(filename: string, from: string = process.cwd()) {
	// Important to allow dirname to always find the parent
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

/**
 * Recursively walks the directory tree and yields all files and (optionally) directories
 * All returned paths are absolute paths.
 */
export async function* walk(
	dir: string,
	// Whether to yeild directories or not.
	directories: boolean = false
): AsyncGenerator<string> {
	dir = path.resolve(dir);
	const files = await fs.readdir(dir, { withFileTypes: true });
	for (const file of files) {
		const filepath = path.join(dir, file.name);
		const isDirectory = file.isDirectory();
		if (isDirectory) yield* walk(filepath); // we've found a directory. Yeild all the files from it
		if (!isDirectory || directories) yield filepath; // yeild the current file or directory
	}
}

export async function downloadFile(url: URL | string, dest: string | null) {
	url = typeof url === "string" ? new URL(url) : url;
	if (dest === null) {
		// Default to the filename in the current directory
		dest = path.basename(url.pathname);
		if (dest === "") {
			const msg = "Pathname must not be empty to get filename from URL.";
			throw new TypeError(msg);
		}
	}
	if (dest === "") throw new TypeError("dest must be a non-empty string");

	await fs.mkdir(path.dirname(dest), { recursive: true });
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(`Failed to download file. Status code: ${res.status}`);
	if (!res.body) throw new Error("Failed to download file. No body included.");
	await fs.writeFile(dest, res.body);
	return dest;
}
