// Asserts that the process is running as root. Also sets the euid as non-root.

export let euid: number;

let assertHasRunSuccessfully = false;
// When later root-only checks are needed, call useRoot() to set the new euid
// If a string is returned, it is the error message!
export function assertRoot(): string | undefined {
	if (assertHasRunSuccessfully) return; // This should be safe to use repeatedly
	if (!process.geteuid || !process.seteuid) return; // Windows
	if (process.geteuid() !== 0)
		return "This script should be run as root (using sudo)";

	const userid = (process.env.SUDO_UID ?? "").trim();
	const username = (process.env.SUDO_USER ?? "").trim();
	if (userid === "" && username === "")
		return "Set $SUDO_UID or SUDO_USER to current user (should usually not be 0)";

	process.seteuid(userid === "" ? username : +userid);
	euid = process.geteuid();

	assertHasRunSuccessfully = true;
}

// Always returns false on Windows
export function isRoot() {
	return process.geteuid?.() === 0;
}

let rootCount = 0;
const cleanup = () => {
	rootCount--; // Ensure that serveral levels don't overwrite each other
	if (rootCount <= 0) process.seteuid?.(euid);
};

// Sets the euid to 0 and runs cb, then resets the euid
// Note: This keeps track of the current number of calls, and only resets the euid when that count is 0
// It's possible that after calling this function, the euid is still 0, because there is another pending call.
// Or because the parent of the current function has called it (root -> root == root)
export async function useRoot<R, A extends unknown[]>(
	cb: (...args: A) => R | PromiseLike<R>,
	...args: Parameters<typeof cb>
): Promise<ReturnType<typeof cb>> {
	if (!process.geteuid || !process.seteuid) return await cb(...args); // Windows
	if (assertRoot())
		throw new Error(
			"You must run assertRoot with a passing result before using useRoot()!"
		);
	rootCount++;
	process.seteuid(0); // root escalation!

	let ret;
	try {
		ret = await cb(...args);
	} catch (e) {
		cleanup();
		throw e;
	}
	cleanup();
	return ret;
}
