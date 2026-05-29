import { Modal, TFile, App, Notice } from "obsidian";
import { ExportModalResult, FilteredFile } from "../types";

import { LinkExtractor } from "../utils/link-extractor";
import { FilterUtils } from "../utils/filter-utils";
import { HeaderHierarchy } from "../utils/header-hierarchy";
import { injectExportModalStyles } from "./styles/ExportModalStyles";
import { FileTreeComponent } from "./components/FileTreeComponent";
import { ExportSettingsSection } from "./components/ExportSettingsSection";
import { ExportService } from "../utils/export-service";
import ExportPlugin from "../ExportPlugin";

export class ExportConfirmationModal extends Modal {
	private resolve: (value: ExportModalResult) => void;
	private sourceFile: TFile;
	private filesToExport: Map<string, TFile>;
	private filteredFiles: Map<string, FilteredFile>;
	private fileCheckboxes: Map<string, HTMLInputElement>;
	private plugin: ExportPlugin;
	private headerMap: Map<string, string[][]>;
	private parentMap: Map<string, Set<string>>;
	private depthMap: Map<string, number>;
	private childrenMap: Map<string, Set<string>>;
	private backlinksSet: Set<string> = new Set();

	private settingsSection: ExportSettingsSection;
	private treeComponent: FileTreeComponent;
	private exportService: ExportService;

	constructor(
		app: App,
		sourceFile: TFile,
		defaultZipSetting: boolean,
		defaultkeepFolderStructureSetting: boolean,
		defaultUseHeaderHierarchy: boolean,
		resolve: (value: ExportModalResult) => void,
		plugin: ExportPlugin,
		exportService: ExportService,
	) {
		super(app);
		this.sourceFile = sourceFile;
		this.filesToExport = new Map();
		this.filteredFiles = new Map();
		this.resolve = resolve;
		this.plugin = plugin;
		this.exportService = exportService;
		this.fileCheckboxes = new Map();
		this.headerMap = new Map();
		this.parentMap = new Map();
		this.depthMap = new Map();
		this.childrenMap = new Map();

		// Handle mutual exclusivity for initial settings
		const zip = defaultZipSetting;
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
			defaultIncludeBacklinks: plugin.settings.includeBacklinks,
			filesToExport: this.filesToExport,
			parentMap: this.parentMap,
			depthMap: this.depthMap,
			sourceFile: this.sourceFile,
			recalculateFiles: this.recalculateFiles.bind(this),
			renderFileList: (container) =>
				this.treeComponent.render(container, this.sourceFile),
		});

		this.treeComponent = new FileTreeComponent({
			app: this.app,
			plugin: this.plugin,
			getFilesToExport: () => this.filesToExport,
			getFilteredFiles: () => this.filteredFiles,
			getFileCheckboxes: () => this.fileCheckboxes,
			getChildrenMap: () => this.childrenMap,
			getBacklinksSet: () => this.backlinksSet,
			getIgnoreFoldersInput: () =>
				this.settingsSection?.ignoreFoldersInput,
			getIgnoreTagsInput: () => this.settingsSection?.ignoreTagsInput,
			updateSelectedCount: this.updateSelectedCount.bind(this),
			updateSourceInfo: this.updateSourceInfo.bind(this),
		});
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("export-modal-root");

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
		const container = this.contentEl.createDiv({ cls: "export-source-info" });

		const details = container.createDiv({ cls: "source-details" });
		details.createSpan({ cls: "source-label", text: "Exporting Note:" });
		details.createSpan({ cls: "source-name", text: this.sourceFile.basename });

		container.createDiv({
			cls: "source-stats",
			attr: { id: "source-stats-container" },
		});
		this.updateSourceInfo();
	}

	private createFileList() {
		const fileListHeader = this.contentEl.createDiv({ cls: "file-list-header" });
		fileListHeader.createSpan({ text: "Files:" });
		fileListHeader.createSpan({
			cls: "file-meta",
			attr: { id: "selected-file-count" },
		});

		const fileListContainer = this.contentEl.createDiv({
			cls: "export-file-list export-file-list-scroll",
		});

		this.treeComponent.render(fileListContainer, this.sourceFile);
	}

	private createButtons() {
		const buttonContainer = this.contentEl.createDiv({
			cls: "modal-button-container",
			attr: { style: "margin-top: 20px;" },
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.addEventListener("click", () => this.close());

		const exportButton = buttonContainer.createEl("button", {
			cls: "mod-cta",
			text: "Export",
			attr: {
				style: "background-color: #7c4dff; color: white; border: none;",
			},
		});

		exportButton.addEventListener("click", async () => {
			// IMPORTANT: showDirectoryPicker must be called directly in the click handler
			// to preserve the transient user activation context required by the File System Access API.
			// Moving this call outside the click handler (e.g., after awaiting a modal) causes
			// DOMException on Windows: "The request is not allowed by the user agent or the platform"
			let targetDir: FileSystemDirectoryHandle | null = null;
			try {
				targetDir = await this.exportService.showDirectoryPicker();
			} catch (error) {
				// console.error removed for compliance
				new Notice(
					`Failed to open directory picker: ${error.message}`,
					5000,
				);
				return; // Don't close modal on error
			}

			if (!targetDir) {
				// User cancelled directory selection, keep modal open
				return;
			}

			this.resolve({
				confirmed: true,
				createZip: this.settingsSection.zipToggle.checked,
				keepFolderStructure:
					this.settingsSection.keepFolderStructureToggle.checked,
				useHeaderHierarchy:
					this.settingsSection.useHeaderHierarchyToggle.checked,
				selectedFiles: this.getSelectedFiles(),
				headerMap: this.settingsSection.headerMap,
				targetDir,
			});
			this.close();
		});
	}

	private updateSourceInfo() {
		const statsContainer = this.contentEl.querySelector(
			"#source-stats-container",
		);
		if (statsContainer) {
			statsContainer.empty();

			const included = statsContainer.createSpan({ cls: "stat-item" });
			included.createEl("strong", { text: `${this.filesToExport.size}` });
			included.createSpan({ text: " included" });

			statsContainer.createSpan({
				cls: "stat-item stat-item-muted",
				text: "•",
			});

			const filtered = statsContainer.createSpan({ cls: "stat-item" });
			filtered.createEl("strong", { text: `${this.filteredFiles.size}` });
			filtered.createSpan({ text: " filtered" });
			if (this.filteredFiles.size > 0) {
				filtered.addClass("stat-item-error");
			}
		}
		this.updateSelectedCount();
	}

	private updateSelectedCount() {
		const selectedCountEl = this.contentEl.querySelector(
			"#selected-file-count",
		);
		if (selectedCountEl) {
			const selected = Array.from(this.fileCheckboxes.values()).filter(
				(cb) => cb.checked,
			).length;
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

		const ignoreFolders =
			this.settingsSection.ignoreFoldersInput?.value
				.split(",")
				.map((f) => f.trim())
				.filter((f) => f) || [];
		const ignoreTags =
			this.settingsSection.ignoreTagsInput?.value
				.split(",")
				.map((t) => t.trim())
				.filter((t) => t) || [];

		const allFilesToCopy = new Map<string, TFile>();
		const visited = new Set<string>();
		this.childrenMap.clear();

		const processFile = async (
			f: TFile,
			level = 0,
			parentPath?: string,
		) => {
			if (
				visited.has(f.path) ||
				level > this.settingsSection.currentLinkDepth
			)
				return;
			visited.add(f.path);

			if (parentPath) {
				if (!this.childrenMap.has(parentPath))
					this.childrenMap.set(parentPath, new Set());
				this.childrenMap.get(parentPath)!.add(f.path);
			}

			const shouldExclude = FilterUtils.shouldExcludeFile(
				f,
				this.plugin.app,
				ignoreFolders,
				ignoreTags,
			);

			if (shouldExclude) {
				this.filteredFiles.set(f.path, {
					file: f,
					reason: shouldExclude,
				});
				return;
			}

			allFilesToCopy.set(f.path, f);

			if (f.extension !== "md" && f.extension !== "canvas") return;

			const content = await this.plugin.app.vault.read(f);
			let linkedPaths: string[] = [];

			if (f.extension === "md") {
				linkedPaths = LinkExtractor.getLinkedPaths(content);
			} else if (f.extension === "canvas") {
				linkedPaths = LinkExtractor.extractCanvasLinks(content);
			}

			for (const path of linkedPaths) {
				const linkedFile =
					this.plugin.app.metadataCache.getFirstLinkpathDest(
						path,
						f.path,
					);
				if (linkedFile instanceof TFile) {
					await processFile(linkedFile, level + 1, f.path);
				}
			}
		};

		await processFile(this.sourceFile);

		// Process backlinks if enabled (1 level only)
		this.backlinksSet.clear();
		if (this.settingsSection.includeBacklinksToggle?.checked) {
			const backlinks = LinkExtractor.getBacklinks(
				this.sourceFile,
				this.plugin.app,
			);
			for (const backlink of backlinks) {
				if (!visited.has(backlink.path)) {
					visited.add(backlink.path);

					const shouldExclude = FilterUtils.shouldExcludeFile(
						backlink,
						this.plugin.app,
						ignoreFolders,
						ignoreTags,
					);
					if (shouldExclude) {
						this.filteredFiles.set(backlink.path, {
							file: backlink,
							reason: shouldExclude,
						});
					} else {
						allFilesToCopy.set(backlink.path, backlink);
						this.backlinksSet.add(backlink.path);
						// Add backlinks as children of the source file so they appear in the tree
						if (!this.childrenMap.has(this.sourceFile.path)) {
							this.childrenMap.set(
								this.sourceFile.path,
								new Set(),
							);
						}
						this.childrenMap
							.get(this.sourceFile.path)!
							.add(backlink.path);
					}
				}
			}
		}

		// Populate existing maps instead of reassigning them to maintain references
		this.filesToExport.clear();
		allFilesToCopy.forEach((value, key) =>
			this.filesToExport.set(key, value),
		);

		if (this.settingsSection.useHeaderHierarchyToggle?.checked) {
			this.settingsSection.headerMap =
				await HeaderHierarchy.buildHeaderHierarchyAsync(
					this.sourceFile,
					this.plugin.app,
					Array.from(this.filesToExport.values()),
					this.parentMap,
					this.depthMap,
				);
		} else {
			this.settingsSection.headerMap = new Map();
		}
	}
}
