import { parse } from "node-html-parser";
import { assert } from "tsafe";

export type AdminUser = { username: string; password: string };
export type Users = {
	admin: AdminUser[];
	regular: string[];
	all: string[]; // admin + regular
};

function parseUsers(lines: readonly string[]): Users {
	const startAdmin = lines.findIndex(s =>
		s.includes("Authorized Administrators:")
	); // should be 0
	assert(startAdmin !== -1, "Could not find start of admins");
	const startUsers = lines.findIndex(s => s.includes("Authorized Users:"));
	assert(startUsers !== -1, "Could not find start of users");

	const res: Users = {
		admin: [],
		regular: [],
		all: [],
	};

	// parse out admins
	let curAdmin: string | undefined;
	// startAdmin+1 to avoid including start of admins header
	for (let i = startAdmin + 1; i < startUsers; i++) {
		// perry (you)
		//     password: M4mm@lOfAct!0n
		const line = lines[i].trim();
		if (line === "") continue;
		if (line.startsWith("password:")) {
			assert(curAdmin, "Found a password line before an admin username line");
			res.admin.push({
				username: curAdmin,
				password: line.slice(line.indexOf(":") + 1).trim(),
			}); // add to admins
		} else {
			// user name -- assumes no spaces in usernames!
			const username = line.split(" ")[0].trim();
			res.all.push(username); // add to all users
			curAdmin = username;
		}
	}

	// +1 so the header isn't included
	const users = lines.slice(startUsers + 1).filter(s => s.length > 0);
	res.regular.push(...users);
	res.all.push(...users);

	res.regular.sort((a, b) => a.localeCompare(b));
	res.all.sort((a, b) => a.localeCompare(b));
	res.admin.sort((a, b) => a.username.localeCompare(b.username));

	return res;
}

export function getUsers(html: string): Users {
	const root = parse(html);
	const preElems = root.getElementsByTagName("pre");

	const pre = preElems.find(pre =>
		pre.rawText.toUpperCase().includes("AUTHORIZED ADMINISTRATORS")
	); // check the header contains "Administrators and Users"
	if (!pre) throw new Error("Could not find the users section in the readme!");

	const { textContent } = pre;
	const lines = textContent.split(/\r?\n/);
	return parseUsers(lines);
}

// const TESTING_URL = "https://www.uscyberpatriot.org/Pages/Readme/cpxvi_tr_e_ubu22_readme_s985trsq44.aspx";

export async function getUsersFromURL(url: string | URL): Promise<Users> {
	if (!url) throw new Error("No URL provided");
	const res = await fetch(url);
	if (!res.ok)
		throw new Error(
			`Could not fetch '${url instanceof URL ? url.href : url}': ${
				res.status
			} ${res.statusText}`
		);
	const text = await res.text();
	return getUsers(text);
}
