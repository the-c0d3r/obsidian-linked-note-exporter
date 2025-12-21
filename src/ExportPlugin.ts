import { Plugin, TFile, Menu, Notice } from "obsidian";
import { ExportPluginSettings, ExportModalResult } from "./types";
import { DEFAULT_SETTINGS } from "./utils/constants";
import { ExportConfirmationModal } from "./ui/ExportConfirmationModal";
import { ExportSettingsTab } from "./ui/ExportSettingsTab";
import { ExportService } from "./utils/export-service";

export default class ExportPlugin extends Plugin {
	settings: ExportPluginSettings;
	exportService: ExportService;

	async onload() {
		// Plugin loaded successfully

		// Load settings
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);

		// Initialize export service
		this.exportService = new ExportService(this.app);

		// Add settings tab
		this.addSettingTab(new ExportSettingsTab(this.app, this));

		// Add file menu item
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
				if (file.extension === "md" || file.extension === "canvas") {
					menu.addItem((item) => {
						item.setTitle("Export with linked notes")
							.setIcon("download")
							.onClick(async () => {
								await this.handleExportRequest(file);
							});
					});
				}
			}),
		);

		// Add command palette command
		this.addCommand({
			id: "export-current-file-with-links",
			name: "Export current file with linked notes",
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "md") {
					await this.handleExportRequest(activeFile);
				} else {
					new Notice("Please open a markdown file first.");
				}
			},
		});
	}

	onunload() {
		// Plugin unloaded successfully
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Handle export request for a specific file
	 */
	private async handleExportRequest(sourceFile: TFile): Promise<void> {
		try {
			// Show export confirmation modal
			const result = await this.showExportModal(sourceFile);

			if (!result.confirmed) {
				return; // User cancelled
			}

			// Show directory picker
			const targetDir = await this.exportService.showDirectoryPicker();
			if (!targetDir) {
				return; // User cancelled directory selection
			}

			// Perform the export
			await this.exportService.exportFiles(
				result.selectedFiles,
				targetDir,
				result.createZip,
				result.keepFolderStructure,
				result.useHeaderHierarchy,
				result.headerMap,
				sourceFile.basename,
			);
		} catch (error) {
			console.error("Export request failed:", error);
			new Notice(`Export failed: ${error.message}`, 5000);
		}
	}

	/**
	 * Show the export confirmation modal
	 */
	private async showExportModal(
		sourceFile: TFile,
	): Promise<ExportModalResult> {
		return new Promise((resolve) => {
			const modal = new ExportConfirmationModal(
				this.app,
				sourceFile,
				this.settings.zipOutput,
				this.settings.keepFolderStructure,
				this.settings.useHeaderHierarchy,
				resolve,
				this,
			);
			modal.open();
		});
	}
}
