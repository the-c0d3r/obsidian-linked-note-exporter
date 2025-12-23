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
			.setName("Linked Notes Depth")
			.setDesc(
				"How deep should we follow links? 0 = only the note + dependencies. 1 = immediate linked notes. 2 = links of links.",
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
			.setName("Create ZIP Archive")
			.setDesc(
				"Automatically compress the exported files into a single .zip file?",
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
			.setName("Maintain Vault Folders")
			.setDesc(
				"Preserve the original folder structure from your vault. (e.g. 'Project/Notes/Note.md' stays in that folder).",
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
			.setName("Organize by Headers")
			.setDesc(
				"Create folders based on your note's headers (H1, H2, etc.) and place linked notes inside them. Useful for structured exports.",
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
			.setName("Folders to skip")
			.setDesc(
				"Notes in these folders will be skipped (comma separated, e.g., 'Templates, Archive').",
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
			.setName("Tags to skip")
			.setDesc(
				"Notes with these tags will be skipped (comma separated). Use 'tag/*' for subtags.",
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
			.setDesc("Restore original settings.")
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
