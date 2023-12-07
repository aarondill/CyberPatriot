import fs from "node:fs/promises";
import path from "node:path";
import type { DeepNullable } from "./util/types.js";
import { NULLCB } from "./util/types.js";
import yaml, { YAMLException } from "js-yaml";
import { error, warn } from "./util/flow.js";
export const CONFIG_FILE_NAME = "config.yaml";

export type CloneOptions = {
	/** URL to clone */
	url: string;
	/** Options for the git clone command. */
	args?: string[];
};
export type YamlConfig = DeepNullable<{
	packages: {
		/** Special case. All platforms. */
		"*": string[];
		/** id parsed from /etc/os-release */
		[id: string]: string[];
	};
	clone: {
		[path: string]: CloneOptions;
	};
}>;

async function parse(file: string): Promise<object> {
	const content = await fs.readFile(file, { encoding: "utf8" }).catch(NULLCB);
	if (content === null) return {}; // file didn't exist (or not readable)
	let config;
	try {
		config = yaml.load(content) ?? {};
	} catch (e) {
		if (!(e instanceof YAMLException)) throw e;
		error(`Could not parse yaml file '${file}': ${e.message}`);
		return {};
	}
	if (typeof config !== "object") {
		warn(`${CONFIG_FILE_NAME} contains only a scalar. Ignoring...`);
		return {};
	}
	return config;
}
export async function parseConfig(root: string): Promise<YamlConfig> {
	const configPath = path.join(root, CONFIG_FILE_NAME);
	const config = await parse(configPath);
	return config;
}
