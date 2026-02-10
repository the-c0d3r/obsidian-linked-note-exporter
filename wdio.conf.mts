import * as path from "path";

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
