import path from "node:path";
import os from "node:os";
import { fs as fsExtra } from "zx";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { egid, euid, fileAccess, fileExists, warn } from "./index.js";
import { once } from "node:events";

async function ensureBackupDirectory() {
	const BACKUP_DIR = path.join("/", "file-backups");
	await fs.mkdir(BACKUP_DIR, { recursive: true });
	const canrw = await fileAccess(
		BACKUP_DIR,
		fs.constants.R_OK | fs.constants.W_OK
	);
	// chown to ensure we can write to it
	if (!canrw) await fs.chown(BACKUP_DIR, euid, egid);
	return BACKUP_DIR;
}

// Backup src to BACKUP_DIR
export async function backup(src: string): Promise<boolean> {
	const dest = await ensureBackupDirectory();
	const newDest = path.join(dest, src);
	if (await fileExists(newDest))
		return warn("Refusing to overwrite existing backup file: " + newDest);

	await fs.mkdir(path.dirname(newDest), { recursive: true }); // ensure parents exist

	console.log(`Backing up file '${src}' to '${newDest}'`);
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
	// False means stop -- Don't write any more. The rest of the file will be lost
	cb: (line: string) => string | undefined | null | false
) {
	file = path.normalize(file);
	const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), "new-file-"));
	const newPath = path.join(tmpdir, path.basename(file));

	let fd, newStream;
	try {
		fd = await fs.open(file, "r");
		const mode = (await fd.stat()).mode;

		// Keep the same permissions as the existing file
		newStream = createWriteStream(newPath, { flags: "wx", mode: mode });
		await once(newStream, "open");

		for await (const line of fd.readLines({ autoClose: true })) {
			const newLine = cb(line);
			if (newLine === false) break;
			if (typeof newLine !== "string") continue;
			newStream.write(appendNewline(newLine));
		}
		newStream.close();
		await once(newStream, "close");

		await fs.copyFile(newPath, file); // overwrite existing file
	} finally {
		newStream?.close();
		await fd?.close();
		await fs.rm(tmpdir, { recursive: true, force: true }); // clean up the temp dir
	}
}
export default backup;
