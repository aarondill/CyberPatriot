import { isWindows } from "../../util/index.js";
// This module is a noop on non-Windows
export const importChildren = isWindows;
