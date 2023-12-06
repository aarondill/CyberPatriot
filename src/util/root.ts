// Asserts that the process is running as root. Also sets the euid as non-root.
import os from "node:os";

export let euid: number;
export let egid: number;

let assertHasRunSuccessfully = false;
// If a string is returned, it is the error message!
export function assertRoot(): string | undefined {
	if (assertHasRunSuccessfully) return; // This should be safe to use repeatedly
	if (
		!process.geteuid ||
		!process.seteuid ||
		!process.getegid ||
		!process.setegid
	)
		return; // Windows
	if (process.geteuid() !== 0)
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

let cachedHome: string | undefined;
// This function will return the home directory of the current *non-root* user.
// This should be used instead of os.homedir
// This should be used instad of $HOME because the sudo command will set the HOME variable
export function getHome() {
	if (cachedHome) return cachedHome;
	const { homedir } = os.userInfo(); // use userInfo instead of os.homedir because sudo will set the HOME variable.
	const prevUID = process.geteuid?.();
	if (
		// windows
		!process.geteuid ||
		!process.seteuid ||
		prevUID === undefined ||
		// we are already non-root. Don't change the euid.
		euid === prevUID
	) {
		cachedHome = homedir;
		return homedir;
	}

	// We are currently root. We need to deescalate so os.userInfo can get the right user
	try {
		process.seteuid(euid); // deescale from root to non-root
		cachedHome = os.userInfo().homedir;
		return cachedHome;
	} finally {
		process.seteuid(prevUID); // return to what it was before
	}
}

// Always returns false on Windows
export function isRoot() {
	return process.geteuid?.() === 0;
}

/**
 * @deprecated
 * A wrapper around cb(...args)
 */
export async function useRoot<R, A extends unknown[]>(
	cb: (...args: A) => R | PromiseLike<R>,
	...args: Parameters<typeof cb>
): Promise<ReturnType<typeof cb>> {
	return await cb(...args);
}
