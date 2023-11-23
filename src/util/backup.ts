// import fs from 'node:fs'
import path from "path";
import os from "os";
import { fs as fsExtra } from "zx";
import fs from "node:fs/promises";
import { fileExists, warn } from "./index.js";
import { isNativeError } from "node:util/types";

export const BACKUP_DIR = path.join(os.userInfo().homedir, "file-backups");
async function ensureBackupDirectory() {
	await fs.mkdir(BACKUP_DIR, { recursive: true });
	return BACKUP_DIR;
}

// Backup src to BACKUP_DIR
export async function backup(src: string): Promise<boolean> {
	const dest = await ensureBackupDirectory();
	const newDest = path.join(dest, src);
	if (await fileExists(newDest))
		return warn("Refusing to overwrite existing backup file: " + newDest);

	await fs.mkdir(path.dirname(newDest), { recursive: true }); // ensure parents exist

	console.log(`Backing up file '${src}' to '${dest}'`);
	const stat = await fs.stat(src);
	if (!stat.isDirectory()) {
		await fs.copyFile(src, newDest);
		return true;
	}

	await fs.mkdir(newDest);
	await fsExtra.copy(src, newDest);
	return true;
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
			if (typeof newLine === "string") newStream.write(appendNewline(newLine));
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
