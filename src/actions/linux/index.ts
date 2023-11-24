import { isWindows } from "../../util/index.js";
// This module is a noop on Windows
export const importChildren = !isWindows;
