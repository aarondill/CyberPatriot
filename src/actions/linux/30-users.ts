import { warn } from "console";
import fs from "node:fs/promises";
import { $, question } from "zx";
import {
	commandStatus,
	confirm,
	error,
	getURL,
	openFile,
} from "../../util/index.js";
import type { AdminUser } from "../../util/users.js";
import { getUsersFromURL } from "../../util/users.js";
import type { Action } from "../index.js";
import { isNativeError } from "util/types";

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

async function removeNonPermittedUsers(permitted: string[]) {
	console.log("Getting the list of non-system users...");
	const foundUsers: string[] = [];
	for await (const [username, _uid] of getNonSystemUsers()) {
		foundUsers.push(username);
		if (permitted.includes(username)) continue; // This is a permitted user
		if (!(await confirm(`remove ${username}`, true))) continue;
		await commandStatus($`userdel -r -- ${username}`);
	}
	return foundUsers;
}
async function addMissingUsers(permittedUsers: string[], foundUsers: string[]) {
	console.log("Getting the list of missing users...");
	const missingUsers = permittedUsers.filter(x => !foundUsers.includes(x));
	for (const username of missingUsers) {
		if (!(await confirm(`add ${username}`, true))) continue;
		await commandStatus($`useradd -m -s /bin/bash -- ${username}`);
	}
}

async function removeNonAdminUsers(sudoers: string[], adminUsers: AdminUser[]) {
	for (const username of sudoers) {
		if (adminUsers.find(u => u.username === username)) continue; // This is a permitted user

		if (!(await confirm(`remove ${username} from sudo group`, true))) continue;

		await commandStatus($`deluser ${username} sudo`);
	}
	return sudoers;
}

async function addMissingAdminUsers(admins: AdminUser[], sudoers: string[]) {
	console.log("Getting list of missing admin users...");
	const missingAdmins = admins.filter(u => !sudoers.includes(u.username));
	for (const { username } of missingAdmins) {
		if (!(await confirm(`add ${username} to sudo group`, true))) continue;

		await commandStatus($`usermod -a -G sudo -- ${username}`);
	}
}
async function setPasswords(admin: AdminUser[]) {
	console.log("Setting admin passwords...");
	console.log(`num : name : password`);
	for (const [i, user] of admin.entries()) {
		console.log(`${i} : ${user.username} : ${user.password}`);
	}
	console.log("Enter the number of the password you would like to change:");
	const choice = (await question(`[${0}-${admin.length - 1}]/All? `))
		.trim()
		.toLowerCase();
	// Split user input by whitespace, convert to numbers, remove duplicates, then sort.
	const chosen =
		choice === "all"
			? [...Array(admin.length).keys()]
			: [...new Set(choice.split(/\s+/).map(s => +s))].sort((a, b) => a - b);

	for (const i of chosen) {
		const user = admin[i];
		if (!user) {
			error(`Could not find user at index ${i}`);
			continue;
		}
		console.log(`Changing ${user.username}'s password...'`);
		await commandStatus($`passwd -- ${user.username}`);
	}
}

export async function run() {
	let permittedUsers;
	while (!permittedUsers) {
		const url = await getURL("What is the URL of the readme? ");
		if (!url) return true; // abort -- empty input
		try {
			permittedUsers = await getUsersFromURL(url);
		} catch (e) {
			error(
				`Failed to get users from URL. Error: ${
					isNativeError(e) ? e.message : String(e)
				}`
			);
			error("Check your spelling and internet connection and try again.");
			permittedUsers = undefined;
		}
	}
	const foundUsers = await removeNonPermittedUsers(permittedUsers.all);

	await addMissingUsers(permittedUsers.all, foundUsers);

	console.log("Getting the list of sudo users...");
	const sudoers = await getUsersInGroup("sudo");
	if (!sudoers) return warn("Could not find sudoers");

	await removeNonAdminUsers(sudoers, permittedUsers.admin);
	await addMissingAdminUsers(permittedUsers.admin, sudoers);
	await setPasswords(permittedUsers.admin);
}

export const description = `Remove unauthorized users from the system and manage administrators`;
export default run satisfies Action;
