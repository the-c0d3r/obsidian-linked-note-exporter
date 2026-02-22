import * as path from "path";
import * as fs from "fs";
import {
	obsidianBetaAvailable,
	parseObsidianVersions,
} from "wdio-obsidian-service";
import { env } from "process";

// wdio-obsidian-service will download Obsidian versions into this directory
const cacheDir = path.resolve(".obsidian-cache");

// choose Obsidian versions to test
let defaultVersions = "earliest/earliest latest/latest";
if (await obsidianBetaAvailable({ cacheDir })) {
	defaultVersions += " latest-beta/latest";
}
const desktopVersions = await parseObsidianVersions(
	env.OBSIDIAN_VERSIONS ?? defaultVersions,
	{ cacheDir },
);
const mobileVersions = await parseObsidianVersions(
	env.OBSIDIAN_MOBILE_VERSIONS ?? env.OBSIDIAN_VERSIONS ?? defaultVersions,
	{ cacheDir },
);
if (env.CI) {
	// Print the resolved Obsidian versions to use as the workflow cache key
	// (see .github/workflows/test.yaml)
	console.log(
		"obsidian-cache-key:",
		JSON.stringify([desktopVersions, mobileVersions]),
	);
}

// Ensure vault directory exists
const vaultPath = path.resolve("./.obsidian-vaults/e2e-vault");
if (!fs.existsSync(vaultPath)) {
	fs.mkdirSync(vaultPath, { recursive: true });
}

export const config = {
	runner: "local",
	autoCompileOpts: {
		autoCompile: true,
		tsNodeOpts: {
			transpileOnly: true,
			project: "tsconfig.json",
		},
	},
	specs: ["./tests/e2e/**/*.test.ts"],
	// Patterns to exclude.
	exclude: [
		// 'path/to/excluded/files'
	],
	maxInstances: 1, // Only 1 instance at a time to avoid conflicts
	capabilities: [
		{
			browserName: "obsidian",
			"wdio:obsidianOptions": {
				// Install the plugin from the current directory
				plugins: ["."],
				// Use a fresh test vault in .obsidian-vaults/e2e-vault
				vault: "./.obsidian-vaults/e2e-vault",
			},
		},
	],
	logLevel: "info",
	bail: 0,
	baseUrl: "http://localhost",
	waitforTimeout: 10000,
	connectionRetryTimeout: 120000,
	connectionRetryCount: 3,
	services: ["obsidian"],
	framework: "mocha",
	reporters: ["spec", "obsidian"],
	mochaOpts: {
		ui: "bdd",
		timeout: 60000,
	},
};
