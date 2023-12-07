import fs from "node:fs/promises";
import path from "node:path";
import { isNodeError } from "./util/types.js";
import yaml from "yaml";
import { isNativeError } from "node:util/types";
import { error, warn } from "./util/flow.js";

export type CloneOptions = {
	url: string;
	// Options for the git clone command.
	args?: null | string[];
};
export type YamlConfig = Partial<{
	packages?: null | {
		// Special case
		"*"?: null | string[];
		// id parsed from /etc/os-release
		[id: string]: undefined | null | string[];
	};
	clone?: null | {
		[path: string]: undefined | null | CloneOptions;
	};
}>;
export async function parseConfig(root: string): Promise<YamlConfig> {
	const rc = path.join(root, "config.yaml");
	const content = await fs.readFile(rc, { encoding: "utf8" }).catch(e => {
		if (!isNodeError(e)) throw e;
		return null;
	});
	if (!content) return {}; // file didn't exist (or not readable)
	let config;
	try {
		config = yaml.parse(content) as unknown;
	} catch (e) {
		const err = isNativeError(e) ? e.message : String(e);
		error(`Could not parse yaml file '${rc}': ${err}`);
		return {};
	}

	if (!config) return {}; // empty file
	if (typeof config !== "object") {
		warn(`${rc} contains only a scalar. Ignoring...`);
		return {};
	}

	return config;
}
