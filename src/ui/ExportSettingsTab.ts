import { PluginSettingTab, Setting, App } from "obsidian";
import { ExportPluginSettings } from "../types";
import { DEFAULT_SETTINGS } from "../utils/constants";
import ExportPlugin from "../ExportPlugin";

export class ExportSettingsTab extends PluginSettingTab {
	plugin: ExportPlugin;
	app: App;

	constructor(app: App, plugin: ExportPlugin) {
		super(app, plugin);
		this.app = app;
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Link Depth Setting
		new Setting(containerEl)
			.setName("Default Link Depth")
			.setDesc(
				"How many levels of linked files to include in exports. 0 = only source file, 1 = source + directly linked files, etc.",
			)
			.addSlider((slider) =>
				slider
					.setLimits(0, 10, 1)
					.setValue(this.plugin.settings.linkDepth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.linkDepth = value;
						await this.plugin.saveSettings();
					}),
			);

		// ZIP Output Setting
		new Setting(containerEl)
			.setName("Default ZIP Output")
			.setDesc(
				"Whether to create a ZIP archive by default when exporting files",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.zipOutput)
					.onChange(async (value) => {
						this.plugin.settings.zipOutput = value;
						await this.plugin.saveSettings();
					}),
			);

		// Keep Directory Structure Setting
		new Setting(containerEl)
			.setName("Default Keep Folder Structure")
			.setDesc(
				"Whether to keep folder structure by default when exporting files (ZIP and regular exports). Note: This is mutually exclusive with 'Use Header Hierarchy'.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.keepFolderStructure)
					.onChange(async (value) => {
						this.plugin.settings.keepFolderStructure = value;
						// Mutual exclusivity: if this is enabled, disable header hierarchy
						if (value) {
							this.plugin.settings.useHeaderHierarchy = false;
						}
						await this.plugin.saveSettings();
						this.display(); // Refresh to show updated toggle states
					}),
			);

		// Use Header Hierarchy Setting
		new Setting(containerEl)
			.setName("Default Use Header Hierarchy")
			.setDesc(
				"Organize exported files according to header structure in the source note. Headers become directories, and linked notes are placed under their respective header sections. Note: This is mutually exclusive with 'Keep Folder Structure'.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useHeaderHierarchy)
					.onChange(async (value) => {
						this.plugin.settings.useHeaderHierarchy = value;
						// Mutual exclusivity: if this is enabled, disable keep folder structure
						if (value) {
							this.plugin.settings.keepFolderStructure = false;
						}
						await this.plugin.saveSettings();
						this.display(); // Refresh to show updated toggle states
					}),
			);

		// Ignore Folders Setting
		new Setting(containerEl)
			.setName("Ignore Folders")
			.setDesc(
				"Comma-separated list of folder paths to exclude from exports (e.g., 'Templates, Archive')",
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., Templates, Archive")
					.setValue(this.plugin.settings.ignoreFolders.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.ignoreFolders = value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					}),
			);

		// Ignore Tags Setting
		new Setting(containerEl)
			.setName("Ignore Tags")
			.setDesc(
				"Comma-separated list of tags to exclude from exports. Use 'tag/*' to ignore all subtags (e.g., '#draft, #personal/*')",
			)
			.addText((text) =>
				text
					.setPlaceholder("e.g., #draft, #personal/*")
					.setValue(this.plugin.settings.ignoreTags.join(", "))
					.onChange(async (value) => {
						this.plugin.settings.ignoreTags = value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						await this.plugin.saveSettings();
					}),
			);

		// Reset to Defaults Button
		new Setting(containerEl)
			.setName("Reset to Defaults")
			.setDesc("Reset all settings to their default values")
			.addButton((button) =>
				button
					.setButtonText("Reset")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings = { ...DEFAULT_SETTINGS };
						await this.plugin.saveSettings();
						this.display(); // Refresh the settings display
					}),
			);
	}
}
