import { readdir, stat } from "node:fs/promises";
import { URL } from "node:url";
import { predicate as commandPredicate } from "../commands/index.js";
import { predicate as eventPredicate } from "../events/index.js";
import { predicate as callsystemPredicate } from "../lib/callsystems/index.js";
import { basename } from "node:path";

/**
 * A predicate to check if the structure is valid.
 *
 * @template T
 * @typedef {(structure: unknown) => structure is T} StructurePredicate
 */

/**
 * Loads all the structures in the provided directory.
 *
 * @template T
 * @param {import('node:fs').PathLike} dir - The directory to load the structures from
 * @param {StructurePredicate<T>} predicate - The predicate to check if the structure is valid
 * @param {boolean} recursive - Whether to recursively load the structures in the directory
 * @returns {Promise<T[]>}
 */
export async function loadStructures(dir, predicate, recursive = true, allowIndex = false) {
	// Get the stats of the directory
	const statDir = await stat(dir);

	// If the provided directory path is not a directory, throw an error
	if (!statDir.isDirectory()) {
		throw new Error(`The directory '${dir}' is not a directory.`);
	}

	// Get all the files in the directory
	const files = await readdir(dir);

	// Create an empty array to store the structures
	/** @type {T[]} */
	const structures = [];

	// Loop through all the files in the directory
	for (const file of files) {
		// Get the stats of the file
		const statFile = await stat(new URL(`${dir}/${file}`));

		// If the file is a directory and recursive is true, recursively load the structures in the directory
		if (statFile.isDirectory() && recursive) {
			const dirName = basename(file);
			const recur = await loadStructures(new URL(`${dir}${dirName}`), predicate, recursive, allowIndex);
			structures.push(...recur);
			continue;
		}

		// If the file is index.js or the file does not end with .js, skip the file
		// If allowIndex is true, then index.js is allowed
		if ((file === "index.js" && !allowIndex) || !file.endsWith(".js")) {
			continue;
		}

		// Import the structure dynamically from the file
		const structure = (await import(`${dir}/${file}`)).default;

		// If the structure is a valid structure, add it
		if (predicate(structure)) structures.push(structure);
	}

	return structures;
}

/**
 * @param {import('node:fs').PathLike} dir
 * @param {boolean} [recursive]
 * @returns {Promise<Map<string,import('../commands/index.js').Command>>}
 */
export async function loadCommands(dir, recursive = true) {
	return (await loadStructures(dir, commandPredicate, recursive)).reduce(
		(acc, cur) => acc.set(cur.data.name, cur),
		new Map(),
	);
}

/**
 * @param {import('node:fs').PathLike} dir
 * @param {boolean} [recursive]
 * @returns {Promise<import('../events/index.js').Event[]>}
 */
export async function loadEvents(dir, recursive = true) {
	return loadStructures(dir, eventPredicate, recursive);
}

/**
 * @param {import('node:fs').PathLike} dir
 * @param {boolean} [recursive]
 * @returns {Promise<Map<string,import('../lib/callsystems/index.js).Callsystem[]>>}
 */
export async function loadCallsystems(dir, recursive = true, allowIndex = true) {
	const structs = await loadStructures(dir, callsystemPredicate, recursive, allowIndex);

	return structs.reduce((acc, cur) => acc.set(cur.packageId + "-" + cur.version, cur), new Map());
}
