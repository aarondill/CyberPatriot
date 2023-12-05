import { warn } from "node:console";
import type { Action } from "../index.js";
export function run() {
	warn("This action is not implemented yet.");
	return true;
}
export default run satisfies Action;
export const description = "Copy common config to the VM for easier usage.";
