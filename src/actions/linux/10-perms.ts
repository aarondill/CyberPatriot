/**
handle
/files/root/ -- copy all files (except perms.txt)
/files/root/perms.txt
/files/perms.txt -- set file permissions if the file exists `PERM NAME WITH SPACES`
*/

import { fileURLToPath } from "node:url";
import type { Action } from "../index.js";
import path from "node:path";
import fs from "node:fs/promises";
import type { PathLike } from "node:fs";
import { cmp, fileExists, findFile, openFile, walk } from "../../util/file.js";
import { confirm, error } from "../../util/flow.js";
import backup from "../../util/backup.js";
import { id } from "tsafe";
import { isNodeError } from "../../util/types.js";
const filename = fileURLToPath(import.meta.url);

async function handlePerms(permsFile: PathLike) {
	const errors: string[] = [];
	await openFile(permsFile, "r", async fd => {
		for await (const line of fd.readLines()) {
			const spaceI = line.indexOf(" ");
			const perm = line.slice(0, spaceI).trim();
			const name = line.slice(spaceI + 1);
			const stat = await fs.stat(name).catch(_ => null);
			if (!stat) continue; // File doesn't exist
			const fpString = (stat.mode & parseInt("7777", 8)).toString(8);
			// If current matches desired, skip
			if (fpString === perm) continue;
			// Change the permissions to match
			const msg = `Changing permissions of ${name} from ${fpString} to ${perm}`;
			console.log(msg);
			const e = await fs.chmod(name, perm).catch(id<unknown>);

			if (!e) continue; // no error. stop
			if (!isNodeError(e)) throw e as unknown;
			const errMessage = `Failed to change permisssions of ${name}: ${e.message}`;
			error(errMessage);
			errors.push(errMessage);
		}
	});
	if (errors.length > 0) {
		console.error("Congregated Errors:");
		for (const err of errors) error(err);
		return false;
	}
	return true;
}

async function copyRoot(rootdir: string) {
	rootdir = path.resolve(rootdir);
	const perms = path.join(rootdir, "perms.txt");

	// Copy all files (except perms.txt)
	for await (const file of walk(rootdir)) {
		if (file === perms) continue; // Skip the perms file
		const rel = path.relative(rootdir, file);
		const dest = path.join("/", rel);
		const destDir = path.dirname(dest);
		if ((await fileExists(dest)) && !(await cmp(file, dest))) {
			const conf = await confirm(`overwrite ${dest}?`, true);
			if (!conf) continue;
		}
		await fs.mkdir(destDir, { recursive: true });
		await backup(dest);
		await fs.copyFile(file, dest);
	}

	// Do this *AFTER* copying the root folder
	await handlePerms(perms);
}

export async function run() {
	const packageJson = await findFile("package.json", path.dirname(filename));
	if (!packageJson) throw new Error("Could not find root directory");
	const root = path.dirname(packageJson);
	const filesdir = path.join(root, "files");

	const permsFile = path.join(filesdir, "perms.txt");
	await handlePerms(permsFile); // Handle files existing before
	const rootdir = path.join(filesdir, "root");
	await copyRoot(rootdir);
}

export const description = `Copy drop-in files and check file permissions.`;
export default run satisfies Action;
