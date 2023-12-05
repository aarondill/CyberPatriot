import { $, question } from "zx";
import fs from "node:fs/promises";
import { confirm, openFile } from "../../util/index.js";
import type { Action } from "../index.js";
import { getUsersFromURL } from "../../util/users.js";
import { warn } from "console";

// for await (const [username, uid] of getNonSystemUsers())
async function* getNonSystemUsers(): AsyncGenerator<[string, number]> {
	// awk -F: '($3>=1000)&&($3<60000)&&($1!="nobody"){print $1}' /etc/passwd
	const fd = await fs.open("/etc/passwd", "r");
	for await (const line of fd.readLines({ autoClose: true })) {
		const [username, , uidString] = line.split(":");
		const uid = +uidString;
		if (uid < 1000) continue; // System users
		if (uid >= 60000) continue; /// System users
		if (username === "nobody") continue; // nobody is sometimes in a weird uid
		yield [username, uid];
	}
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

	console.log("Getting the list of non-system users...");
	const foundUsers: string[] = [];
	for await (const [username, _uid] of getNonSystemUsers()) {
		foundUsers.push(username);
		if (permittedUsers.all.includes(username)) continue; // This is a permitted user
		if (!(await confirm(`remove ${username}`, true))) continue;
		const { exitCode } = await $`userdel -r -- ${username}`.nothrow();
		if (exitCode !== 0) warn("Command failed!");
	}

	console.log("Getting the list of missing users...");
	const missingUsers = permittedUsers.all.filter(x => !foundUsers.includes(x));
	for (const username of missingUsers) {
		if (!(await confirm(`add ${username}`, true))) continue;
		const { exitCode } =
			await $`useradd -m -s /bin/bash -- ${username}`.nothrow();
		if (exitCode !== 0) warn("Command failed!");
	}

	console.log("Getting the list of sudo users...");
	const sudoers = await getUsersInGroup("sudo");
	if (!sudoers) return warn("Could not find sudoers");
	for (const username of sudoers) {
		if (permittedUsers.admin.find(u => u.username === username)) continue; // This is a permitted user

		if (!(await confirm(`remove ${username} from sudo group`, true))) continue;

		const { exitCode } = await $`deluser ${username} sudo`.nothrow();
		if (exitCode !== 0) warn("Command failed!");
	}

	console.log("Getting list of missing admin users...");
	const missingAdmins = permittedUsers.admin.filter(
		u => !sudoers.includes(u.username)
	);
	for (const { username } of missingAdmins) {
		if (!(await confirm(`add ${username} to sudo group`, true))) continue;

		const { exitCode } = await $`usermod -a -G sudo -- ${username}`.nothrow();
		if (exitCode !== 0) warn("Command failed!");
	}
}

export const description = `Remove unauthorized users from the system and manage administrators`;
export default run satisfies Action;
