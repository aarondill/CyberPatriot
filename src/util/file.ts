import type { Mode, PathLike } from "node:fs";
import { Stats } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import fs from "node:fs/promises";
import { FALSECB, TRUECB } from "./types.js";
import path from "node:path";
import { objectEntries, type Parameters } from "tsafe";

export function fileAccess(...args: Parameters<typeof fs.access>) {
	return fs.access(...args).then(TRUECB, FALSECB);
}
export async function fileExists(file: PathLike) {
	return await fileAccess(file, fs.constants.F_OK);
}
/** The possible return types of fileType */
export type FileType =
	| "file"
	| "directory"
	| "link"
	| "block"
	| "character"
	| "fifo"
	| "socket"
	| "unknown";

/** A set of methods needed to be implemented while checking Stats file type */
type FileTypeMethods<T> = {
	[K in keyof T]: T[K] extends () => boolean
		? K extends `is${string}`
			? K
			: never
		: never;
}[keyof T];
/** A set of methods needed to be implemented while checking Stats file type */
type FileMetaProps<T> = {
	[K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? never : K;
}[keyof T];

/** null if the file can't be accessed */
export async function fileType(file: PathLike): Promise<FileType | null>;
/** This can't be null, since the user passed the stats */
export async function fileType(file: Stats): Promise<FileType>;
/** Returns a string describing the type of file */
export async function fileType(file: PathLike | Stats): Promise<FileType> {
	const stats = file instanceof Stats ? file : await fs.lstat(file);
	const methods: Record<FileTypeMethods<Stats>, FileType> = {
		isDirectory: "directory",
		isFile: "file",
		isSymbolicLink: "link",
		isBlockDevice: "block",
		isCharacterDevice: "character",
		isFIFO: "fifo",
		isSocket: "socket",
	} as const;
	for (const [method, type] of objectEntries(methods)) {
		const isType = stats[method];
		if (isType.call(stats)) return type;
	}
	if (stats.isDirectory()) return "directory";
	if (stats.isFile()) return "file";
	if (stats.isSymbolicLink()) return "link";
	if (stats.isCharacterDevice()) return "character";
	if (stats.isBlockDevice()) return "block";
	if (stats.isFIFO()) return "fifo";
	if (stats.isSocket()) return "socket";
	return "unknown";
}

async function normalizeStat(
	file: PathLike | Stats | FileHandle
): Promise<Stats> {
	if (file instanceof Stats) return file;
	if (typeof file === "object" && "stat" in file) return await file.stat();
	return await fs.lstat(file);
}
// Note: this doesn't close the FileHandles
// Call stat and pass size. Check that it's equal before hand!
async function compareFiles(h1: FileHandle, h2: FileHandle, size: number) {
	const kReadSize = 1024 * 8;
	const buf1 = Buffer.alloc(kReadSize),
		buf2 = Buffer.alloc(kReadSize);
	let pos = 0;
	let remainingSize = size;
	while (remainingSize > 0) {
		const readSize = Math.min(kReadSize, remainingSize);
		const [r1, r2] = await Promise.all([
			h1.read(buf1, 0, readSize, pos),
			h2.read(buf2, 0, readSize, pos),
		]);
		if (r1.bytesRead !== readSize || r2.bytesRead !== readSize) {
			throw new Error("Failed to read desired number of bytes");
		}
		if (buf1.compare(buf2, 0, readSize, 0, readSize) !== 0) {
			return false;
		}
		remainingSize -= readSize;
		pos += readSize;
	}
	return true;
}
type CmpOptions = {
	metadata?: boolean | FileMetaProps<Stats>[] | FileMetaProps<Stats>;
	contents?: boolean;
};
/**
 * Check if two files are the same
 * if opts.metadata is true, also check the file metadata -- mode, uid, gid
 * This may throw if a path is passed that is not accessable
 */
export async function cmp(
	a: PathLike,
	b: PathLike,
	{ metadata = true, contents = true }: CmpOptions = {}
): Promise<boolean> {
	const statA = await normalizeStat(a),
		statB = await normalizeStat(b);
	// The filetype is different - exit early
	// The files can't be equal in metadata or contents
	if (fileType(statA) !== fileType(statB)) return false;

	// Only check mode, uid, and gid if metadata is true
	if (metadata) {
		const compare =
			metadata === true
				? (["mode", "uid", "gid"] as const)
				: typeof metadata === "string"
					? [metadata]
					: metadata;
		for (const key of compare) {
			if (statA[key] !== statB[key]) return false;
		}
	}
	// Only check the actual contents if contents is true
	if (contents) {
		// Check the size first. if they are different, the content is different.
		if (statA.size !== statB.size) return false;

		let h1, h2;
		try {
			const res = await Promise.allSettled([fs.open(a, "r"), fs.open(b, "r")]);
			// Get the values. This allows us to close any successfully opened handles.
			[h1, h2] = res.map(v => (v.status === "fulfilled" ? v.value : undefined));
			// If either rejected, throw an error
			const failed = res.find(v => v.status === "rejected");
			if (failed && failed.status === "rejected") throw failed.reason; // Throws the first failed promise.

			h1 = await fs.open(a, "r");
			h2 = await fs.open(b, "r");
			if (!(await compareFiles(h1, h2, statA.size))) return false;
		} finally {
			await h1?.close();
			await h2?.close();
		}
	}
	return true;
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
	directories: boolean = false,
	maxDepth: number = Infinity
): AsyncGenerator<string> {
	if (maxDepth < 0) return; // we've reached the max depth
	dir = path.resolve(dir);
	const files = await fs.readdir(dir, { withFileTypes: true });
	for (const file of files) {
		const filepath = path.join(dir, file.name);
		const isDirectory = file.isDirectory();
		if (isDirectory) yield* walk(filepath, directories, maxDepth - 1); // we've found a directory. Yeild all the files from it
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
