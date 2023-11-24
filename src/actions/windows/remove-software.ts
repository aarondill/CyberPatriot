import { warn } from "../../util/flow.js";
import type { Action } from "../index.js";

export function run() {
	warn(`"${__filename}" is not yet implemented`);
	return true;
}

export default run satisfies Action;
