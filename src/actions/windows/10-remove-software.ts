import { fileURLToPath } from "url";
import { warn } from "../../util/flow.js";
import type { Action } from "../index.js";
const filename = fileURLToPath(import.meta.url);
export function run() {
	warn(`"${filename}" is not yet implemented`);
	return true;
}

export const description = `An unimplemented action at ${filename}.`;
export default run satisfies Action;
