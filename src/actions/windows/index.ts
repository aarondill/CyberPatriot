import type { Extends } from "tsafe";
import { assert } from "tsafe";
import { isWindows } from "../../util/index.js";
import type { ActionModule } from "../index.js";
// This module is a noop on non-Windows
export const importChildren = isWindows;

// If you are seeing an error on one of these lines, check the module referenced to make sure it matches the ActionModule interface!
// NOTE: This list must be manually maintained!
assert<Extends<typeof import("./index.js"), ActionModule>>();
assert<Extends<typeof import("./automatic-updates.js"), ActionModule>>();
assert<Extends<typeof import("./remove-software.js"), ActionModule>>();
assert<Extends<typeof import("./remove-users.js"), ActionModule>>();
