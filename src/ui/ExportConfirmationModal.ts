import { Modal, TFile, App } from "obsidian";
import { ExportModalResult, FilteredFile } from "../types";
import { UI_CONSTANTS } from "../utils/constants";
import { FileUtils } from "../utils/file-utils";
import { injectExportModalStyles } from "./styles/ExportModalStyles";
import { FileTreeComponent } from "./components/FileTreeComponent";
import { ExportSettingsSection } from "./components/ExportSettingsSection";

export class ExportConfirmationModal extends Modal {
	private resolve: (value: ExportModalResult) => void;
	private sourceFile: TFile;
	private filesToExport: Map<string, TFile>;
	private filteredFiles: Map<string, FilteredFile>;
	private fileCheckboxes: Map<string, HTMLInputElement>;
	private plugin: any;
	private headerMap: Map<string, string[][]>;
	private parentMap: Map<string, Set<string>>;
	private depthMap: Map<string, number>;
	private childrenMap: Map<string, Set<string>>;

	private settingsSection: ExportSettingsSection;
	private treeComponent: FileTreeComponent;

	constructor(
		app: App,
		sourceFile: TFile,
		defaultZipSetting: boolean,
		defaultkeepFolderStructureSetting: boolean,
		defaultUseHeaderHierarchy: boolean,
		resolve: (value: ExportModalResult) => void,
		plugin: any,
	) {
		super(app);
		this.sourceFile = sourceFile;
		this.filesToExport = new Map();
		this.filteredFiles = new Map();
		this.resolve = resolve;
		this.plugin = plugin;
		this.fileCheckboxes = new Map();
		this.headerMap = new Map();
		this.parentMap = new Map();
		this.depthMap = new Map();
		this.childrenMap = new Map();

		// Handle mutual exclusivity for initial settings
		let zip = defaultZipSetting;
		let folders = defaultkeepFolderStructureSetting;
		let headers = defaultUseHeaderHierarchy;

		if (folders && headers) {
			folders = false;
			headers = true;
		}

		// Initialize components
		this.settingsSection = new ExportSettingsSection({
			plugin: this.plugin,
			contentEl: this.contentEl,
			currentLinkDepth: plugin.settings.linkDepth,
			defaultZipSetting: zip,
			defaultkeepFolderStructureSetting: folders,
			defaultUseHeaderHierarchy: headers,
			filesToExport: this.filesToExport,
			parentMap: this.parentMap,
			depthMap: this.depthMap,
			sourceFile: this.sourceFile,
			recalculateFiles: this.recalculateFiles.bind(this),
			renderFileList: (container) => this.treeComponent.render(container, this.sourceFile)
		});

		this.treeComponent = new FileTreeComponent({
			app: this.app,
			plugin: this.plugin,
			getFilesToExport: () => this.filesToExport,
			getFilteredFiles: () => this.filteredFiles,
			getFileCheckboxes: () => this.fileCheckboxes,
			getChildrenMap: () => this.childrenMap,
			getIgnoreFoldersInput: () => this.settingsSection?.ignoreFoldersInput,
			getIgnoreTagsInput: () => this.settingsSection?.ignoreTagsInput,
			updateSelectedCount: this.updateSelectedCount.bind(this),
			updateSourceInfo: this.updateSourceInfo.bind(this)
		});
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("export-modal-root");
		contentEl.style.backgroundColor = "var(--background-primary)";

		injectExportModalStyles();

		this.createHeader();
		this.createSourceInfo();

		// Render settings first to create inputs
		this.settingsSection.render(contentEl);

		// Initial calculation and file list creation
		await this.recalculateFiles();
		this.createFileList();
		this.createButtons();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createHeader() {
		this.titleEl.setText("Ready to Export?");
	}

	private createSourceInfo() {
		const container = this.contentEl.createEl("div", { cls: "export-source-info" });

		const details = container.createEl("div", { cls: "source-details" });
		details.createEl("span", { cls: "source-label", text: "Exporting Note:" });
		details.createEl("span", { cls: "source-name", text: this.sourceFile.basename });

		const stats = container.createEl("div", { cls: "source-stats", attr: { id: "source-stats-container" } });
		this.updateSourceInfo();
	}

	private createFileList() {
		const fileListHeader = this.contentEl.createEl("div", { cls: "file-list-header" });
		fileListHeader.createEl("span", { text: "Files:" });
		const selectedCount = fileListHeader.createEl("span", { cls: "file-meta", attr: { id: "selected-file-count" } });

		const fileListContainer = this.contentEl.createEl("div", { cls: "export-file-list" });
		fileListContainer.style.maxHeight = UI_CONSTANTS.MODAL.MAX_FILE_LIST_HEIGHT;
		fileListContainer.style.overflowY = "auto";
		fileListContainer.style.marginBottom = UI_CONSTANTS.SPACING.DEFAULT_MARGIN;

		this.treeComponent.render(fileListContainer, this.sourceFile);
	}

	private createButtons() {
		const buttonContainer = this.contentEl.createEl("div", {
			cls: "modal-button-container",
			attr: { style: "margin-top: 20px;" }
		});

		const cancelButton = buttonContainer.createEl("button", { text: "Cancel" });
		cancelButton.addEventListener("click", () => this.close());

		const exportButton = buttonContainer.createEl("button", {
			cls: "mod-cta",
			text: "Export",
			attr: { style: "background-color: #7c4dff; color: white; border: none;" }
		});

		exportButton.addEventListener("click", () => {
			this.resolve({
				confirmed: true,
				createZip: this.settingsSection.zipToggle.checked,
				keepFolderStructure: this.settingsSection.keepFolderStructureToggle.checked,
				useHeaderHierarchy: this.settingsSection.useHeaderHierarchyToggle.checked,
				selectedFiles: this.getSelectedFiles(),
				headerMap: this.settingsSection.headerMap,
				linkDepth: this.settingsSection.currentLinkDepth,
				ignoreFolders: this.settingsSection.ignoreFoldersInput.value.split(",").map(f => f.trim()).filter(f => f),
				ignoreTags: this.settingsSection.ignoreTagsInput.value.split(",").map(t => t.trim()).filter(t => t)
			});
			this.close();
		});
	}

	private updateSourceInfo() {
		const statsContainer = this.contentEl.querySelector("#source-stats-container");
		if (statsContainer) {
			statsContainer.empty();

			const included = statsContainer.createEl("span", { cls: "stat-item" });
			included.innerHTML = `<strong>${this.filesToExport.size}</strong> included`;

			statsContainer.createEl("span", { cls: "stat-item", text: "•" }).style.color = "var(--text-muted)";

			const filtered = statsContainer.createEl("span", { cls: "stat-item" });
			filtered.innerHTML = `<strong>${this.filteredFiles.size}</strong> filtered`;
			if (this.filteredFiles.size > 0) {
				filtered.style.color = "var(--text-error)";
			}
		}
		this.updateSelectedCount();
	}

	private updateSelectedCount() {
		const selectedCountEl = this.contentEl.querySelector("#selected-file-count");
		if (selectedCountEl) {
			const selected = Array.from(this.fileCheckboxes.values()).filter(cb => cb.checked).length;
			selectedCountEl.textContent = `${selected} selected`;
		}
	}

	private getSelectedFiles(): TFile[] {
		const selectedFiles: TFile[] = [];
		this.fileCheckboxes.forEach((checkbox, path) => {
			if (checkbox.checked) {
				const file = this.filesToExport.get(path);
				if (file) selectedFiles.push(file);
			}
		});
		return selectedFiles;
	}

	private async recalculateFiles() {
		this.filesToExport.clear();
		this.filteredFiles.clear();
		this.fileCheckboxes.clear();

		const ignoreFolders = this.settingsSection.ignoreFoldersInput?.value.split(",").map(f => f.trim()).filter(f => f) || [];
		const ignoreTags = this.settingsSection.ignoreTagsInput?.value.split(",").map(t => t.trim()).filter(t => t) || [];

		const allFilesToCopy = new Map<string, TFile>();
		const visited = new Set<string>();
		const parentMap = new Map<string, Set<string>>();
		const depthMap = new Map<string, number>();
		this.childrenMap.clear();

		const processFile = async (f: TFile, level = 0, parentPath?: string) => {
			if (visited.has(f.path) || level > this.settingsSection.currentLinkDepth) return;
			visited.add(f.path);

			if (parentPath) {
				if (!this.childrenMap.has(parentPath)) this.childrenMap.set(parentPath, new Set());
				this.childrenMap.get(parentPath)!.add(f.path);
			}

			const shouldExclude = FileUtils.shouldExcludeFile(f, this.plugin.app, ignoreFolders, ignoreTags);

			if (shouldExclude) {
				this.filteredFiles.set(f.path, { file: f, reason: shouldExclude });
				return;
			}

			allFilesToCopy.set(f.path, f);

			if (f.extension !== "md" && f.extension !== "canvas") return;

			const content = await this.plugin.app.vault.read(f);
			let linkedPaths: string[] = [];

			if (f.extension === "md") {
				linkedPaths = FileUtils.getLinkedPaths(content);
			} else if (f.extension === "canvas") {
				linkedPaths = FileUtils.extractCanvasLinks(content);
			}

			for (const path of linkedPaths) {
				const linkedFile = this.plugin.app.metadataCache.getFirstLinkpathDest(path, f.path);
				if (linkedFile instanceof TFile) {
					await processFile(linkedFile, level + 1, f.path);
				}
			}
		};

		await processFile(this.sourceFile);

		// Populate existing maps instead of reassigning them to maintain references
		this.filesToExport.clear();
		allFilesToCopy.forEach((value, key) => this.filesToExport.set(key, value));


		if (this.settingsSection.useHeaderHierarchyToggle?.checked) {
			this.settingsSection.headerMap = await FileUtils.buildHeaderHierarchyAsync(
				this.sourceFile,
				this.plugin.app,
				Array.from(this.filesToExport.values()),
				this.parentMap,
				this.depthMap,
			);
		} else {
			this.settingsSection.headerMap = new Map();
		}

		// Refresh UI
		const fileListContainer = this.contentEl.querySelector(".export-file-list") as HTMLElement;
		if (fileListContainer) {
			fileListContainer.empty();
			this.treeComponent.render(fileListContainer, this.sourceFile);
		}
	}
}
