import type { Mode, PathLike } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import { isNodeError } from "./types.js";
import path from "node:path";
import type { Parameters } from "tsafe";
import https from "node:https";
import http from "node:http";
import { createWriteStream } from "node:fs";

export async function fileAccess(...args: Parameters<typeof fs.access>) {
	try {
		await fs.access(...args);
		return true;
	} catch (e) {
		if (isNodeError(e)) return false;
		throw e; // this is unexpected. Throw it.
	}
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

interface DownloadFileOptions extends http.RequestOptions {
	// Timeout in milliseconds. Zero means no timeout.
	timeout?: number;
	// If undefined, defaults to current working directory.
	output?: string;
}

// Note: This does not remove the file on failure
export function downloadFile(url: URL, options: DownloadFileOptions = {}) {
	type Ret = string;
	let _resolve: (v: Ret) => void, _reject: (e: Error) => void;
	const _value = new Promise<Ret>(
		(resolve, reject) => ((_resolve = resolve), (_reject = reject))
	);

	const timeout = options.timeout ?? 0;
	// Download to current directory if null
	const output = options.output ?? path.posix.basename(url.pathname);

	const req = url.protocol === "https:" ? https : http;
	const request = req.get(url, options, async res => {
		const { statusCode } = res;
		const ok = statusCode && statusCode >= 200 && statusCode <= 299;
		if (!ok)
			return _reject(
				new Error(`Unexpected status code: ${statusCode}`, {
					cause: { statusCode },
				})
			);
		// Do something with res
		const dir = path.dirname(output);
		await fs.mkdir(dir, { recursive: true });
		const file = createWriteStream(output);
		res.pipe(file);

		res.on("end", () => _resolve(output));
	});

	request.setTimeout(timeout, () => {
		request.end();
		_reject(
			new Error(`Download timed out after ${timeout}ms`, {
				cause: { timeout },
			})
		);
	});
	request.on("error", err => _reject(err));
	return _value;
}
