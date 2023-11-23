// import fs from 'node:fs'
import path from "path";
import os from "os";
import { fs as fsExtra } from "zx";
import fs from "node:fs/promises";
import { isNodeError } from "./init.js";
import { isNativeError } from "util/types";

export const BACKUP_DIR = path.join(os.homedir(), "file-backups");
async function ensureBackupDirectory() {
	await fs.mkdir(BACKUP_DIR, { recursive: true });
	return BACKUP_DIR;
}

// Backup src to BACKUP_DIR
export async function backup(src: string) {
	const dest = await ensureBackupDirectory();
	const newDest = path.join(dest, src);
	const newDestExists = await fs
		.access(newDest)
		.then(() => true)
		.catch(e => {
			if (!isNodeError(e)) throw e;
			return false;
		});
	if (newDestExists) throw new Error("Can not overwrite existing backup file");

	await fs.mkdir(path.dirname(newDest), { recursive: true }); // ensure parents exist

	const stat = await fs.stat(src);
	if (!stat.isDirectory()) {
		return await fs.copyFile(src, newDest);
	}

	await fs.mkdir(newDest);
	await fsExtra.copy(src, newDest);
}
const appendNewline = (s: string) => (s.endsWith("\n") ? s : s + "\n");
export async function mapFile(
	file: string,
	cb: (line: string) => string | undefined | null
) {
	file = path.normalize(file);
	const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "new-file-"));
	const newPath = path.join(tmpdir, path.basename(file));

	let fdNew, fd, newStream;
	let error: Error | undefined;
	try {
		fdNew = await fs.open(newPath, "w");
		newStream = fdNew.createWriteStream({ autoClose: true });

		fd = await fs.open(file, "r");
		for await (const line of fd.readLines()) {
			const newLine = cb(line);
			if (newLine) newStream.write(appendNewline(newLine));
		}
		newStream.close(); // This closes the fdNew

		await fs.copyFile(newPath, file); // overwrite existing file
	} catch (e) {
		if (isNativeError(e) || e instanceof Error) error = e;
		else error = new Error(String(e));
	} finally {
		newStream?.close();
		await fdNew?.close();
		await fd?.close();
		await fs.rm(tmpdir, { recursive: true, force: true }); // clean up the temp dir
	}
	if (error) throw error;
}
export default backup;
