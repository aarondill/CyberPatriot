import { question } from "zx";
import type { YeildValueFunction } from "../../util/generator.js";
import { createGeneratorFromCallback } from "../../util/generator.js";
import { openFile } from "../../util/index.js";
import type { Action } from "../index.js";
import type { FileHandle } from "fs/promises";
import { getUsersFromURL } from "../../util/users.js";

// for await (const [username, uid] of getNonSystemUsers())
type Info = [string, number];
async function _getNonSystemUsers(
	fd: FileHandle,
	yeildVal: YeildValueFunction<Info>
) {
	// awk -F: '($3>=1000)&&($3<60000)&&($1!="nobody"){print $1}' /etc/passwd
	for await (const line of fd.readLines()) {
		const [username, , uidString] = line.split(":");
		const uid = +uidString;
		if (uid < 1000) continue; // System users
		if (uid >= 60000) continue; /// System users
		if (username === "nobody") continue; // nobody is sometimes in a weird uid
		await yeildVal([username, uid]);
	}
}

function getNonSystemUsers() {
	return createGeneratorFromCallback((yeildVal: YeildValueFunction<Info>) =>
		openFile("/etc/passwd", "r", _getNonSystemUsers, yeildVal)
	);
}

async function getUsersInGroup(group: string | number) {
	return await openFile("/etc/group", "r", async fd => {
		for await (const line of fd.readLines()) {
			const [groupName, , gidString, users] = line.trim().split(":");
			if (gidString.trim() === "")
				throw new Error(`Empty group id: ${groupName}`);
			const gid = +gidString;
			if (isNaN(gid)) throw new Error(`Invalid group id: ${gidString}`);
			// Check if group matches the name or the id.
			if (group !== groupName && group !== gid) continue;

			return users.split(",");
		}
		return null;
	});
}

export async function run() {
	const url = await question("What is the url of the readme? ");
	if (!url) return true;
	const permittedUsers = await getUsersFromURL(url);
	void permittedUsers; // TODO: THIS!
	console.log("Getting the list of non-system users...");
	for await (const [username, uid] of getNonSystemUsers()) {
		// TODO: Compare with user-provided list (scrape the URL?)
		// TODO: remove unauthorized users (with confirmation)
		console.log(username, uid);
	}
	console.log("Getting the list of sudo users...");
	const sudoers = await getUsersInGroup("sudo");
	for (const username of sudoers ?? []) {
		// TODO: Compare with user list
		console.log(username);
	}
}

export const description = `Remove unauthorized users from the system and manage administrators`;
export default run satisfies Action;
