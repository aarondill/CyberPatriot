// Note: this is proper use of void because it's used for the function return
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type ActionRet = boolean | undefined | null | void;
/**
 * The return value should be considered success.
 * If false is returned, the function failed.
 * Otherwise, the function was successful.
 */
export type Action = (argv: string[]) => Promise<ActionRet> | ActionRet;

import fixApt from "./fix-apt.js";
export const actionList: Action[] = [fixApt];
export async function runActions(args: string[]): Promise<boolean> {
	for (const a of actionList) {
		const suc = await a(args);
		if (suc === false) return false;
	}
	return true;
}
