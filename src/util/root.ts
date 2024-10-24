// Asserts that the process is running as root. Also sets the euid as non-root.
import os from "node:os";
import { assert } from "tsafe";

export let euid: number;
export let egid: number;

let assertHasRunSuccessfully = false;
// If a string is returned, it is the error message!
export function assertRoot(): string | undefined {
	if (assertHasRunSuccessfully) return; // This should be safe to use repeatedly
	if (
		typeof process.geteuid !== "function" ||
		typeof process.seteuid !== "function" ||
		typeof process.getegid !== "function" ||
		typeof process.setegid !== "function"
	)
		return; // Windows
	if (process.geteuid?.() !== 0)
		return "This script should be run as root (using sudo)";

	const userid = (process.env.SUDO_UID ?? "").trim();
	const username = (process.env.SUDO_USER ?? "").trim();
	const gid = (process.env.SUDO_GID ?? "").trim();
	if ((userid === "" && username === "") || gid === "")
		return "Set $SUDO_UID or SUDO_USER to current user (should usually not be 0)";

	process.setegid(+gid); // Note: this must be done before setting euid
	process.seteuid(userid === "" ? username : +userid);
	euid = process.geteuid();
	egid = process.getegid();

	// I give up. Run everything as root.
	process.setegid(0);
	process.seteuid(0);

	assertHasRunSuccessfully = true;
}

function asUser<Args extends unknown[], T>(
	run: (...a: Args) => T,
	...args: Args
): T {
	const prevUID = process.geteuid?.();
	if (
		typeof process.geteuid !== "function" || // windows
		typeof process.seteuid !== "function" ||
		typeof process.getegid !== "function" ||
		typeof process.setegid !== "function" ||
		euid === prevUID // we are already non-root. Don't change the euid.
	)
		return run(...args);
	assert(prevUID !== undefined, "Something went terribly wrong!"); // bug

	// We are currently root. We need to deescalate
	try {
		process.seteuid(euid); // deescale from root to non-root
		return run(...args);
	} finally {
		process.seteuid(prevUID); // return to what it was before
	}
}

// This function will return the home directory of the current *non-root* user.
// This should be used instead of os.homedir
// This should be used instad of $HOME because the sudo command will set the HOME variable
// use userInfo instead of os.homedir because sudo will set the HOME variable.
export const userInfo = asUser.bind(os.userInfo);
