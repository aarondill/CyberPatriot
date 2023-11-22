import { question, chalk } from "zx";
export async function confirm(
	what: string,
	defaultResponse = false
): Promise<boolean> {
	const choices = ["yes", "no"]; // Note: This order cannot change! The below index relies on it.
	const shortOptions = choices.map(s => s.charAt(0));
	const i = +!defaultResponse; // 0 or 1 -- Index of the default response
	shortOptions[i] = shortOptions[i].toUpperCase();

	const msg = `Do you want to ${what}? (${shortOptions.join("/")}) `;
	const res = await question(msg, {
		choices: choices.concat(choices.map(s => s.toUpperCase())),
	});

	const lres = res.toLowerCase().trim();
	if (lres === "") return defaultResponse;
	// Yes or y are true, anything else is considered no.
	return lres === "yes" || lres === "y";
}

/**
 * Support $NO_COLOR
 * usage: where you would write: `chalk.bold.red(msg)`, instead use `colors(chalk.bold.red, msg)`
 */
export function colors(chalkFunc: (arg0: string) => string, s: string) {
	if (process.env.NO_COLOR && process.env.NO_COLOR.trim() !== "") return s;
	return chalkFunc(s);
}
// Note: This does not exit the process! Make sure you return after this!
export function abort(msg?: string | null, code?: number | null): void {
	console.error(colors(chalk.bold.red, msg ? `Aborting: ${msg}` : "Aborting"));
	process.exitCode = code ?? 1;
}
