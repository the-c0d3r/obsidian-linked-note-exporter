import { Modal, TFile, App } from "obsidian";
import { ExportModalResult, FilteredFile } from "../types";
import { UI_CONSTANTS } from "../utils/constants";
import { FileUtils } from "../utils/file-utils";

export class ExportConfirmationModal extends Modal {
	private resolve: (value: ExportModalResult) => void;
	private sourceFile: TFile;
	private filesToExport: Map<string, TFile>;
	private filteredFiles: Map<string, FilteredFile>;
	private zipToggle: HTMLInputElement;
	private keepFolderStructureToggle: HTMLInputElement;
	private useHeaderHierarchyToggle: HTMLInputElement;
	private defaultZipSetting: boolean;
	private defaultkeepFolderStructureSetting: boolean;
	private defaultUseHeaderHierarchy: boolean;
	private fileCheckboxes: Map<string, HTMLInputElement>;
	private linkDepthSlider: HTMLInputElement;
	private currentLinkDepth: number;
	private ignoreFoldersInput: HTMLInputElement;
	private ignoreTagsInput: HTMLInputElement;
	private plugin: any;
	private headerMap: Map<string, string[][]>;
	private parentMap: Map<string, Set<string>>;
	private depthMap: Map<string, number>;
	private childrenMap: Map<string, Set<string>>; // Map<parentPath, Set<childPath>>

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
		this.defaultZipSetting = defaultZipSetting;

		// Handle mutual exclusivity: if both are true, give precedence to header hierarchy
		if (defaultkeepFolderStructureSetting && defaultUseHeaderHierarchy) {
			this.defaultkeepFolderStructureSetting = false;
			this.defaultUseHeaderHierarchy = true;
		} else {
			this.defaultkeepFolderStructureSetting = defaultkeepFolderStructureSetting;
			this.defaultUseHeaderHierarchy = defaultUseHeaderHierarchy;
		}

		this.resolve = resolve;
		this.plugin = plugin;
		this.currentLinkDepth = plugin.settings.linkDepth;
		this.fileCheckboxes = new Map();
		this.headerMap = new Map();
		this.parentMap = new Map();
		this.depthMap = new Map();
		this.childrenMap = new Map();
	}

	private injectStyles() {
		const styleId = "export-modal-styles";
		let styleEl = document.getElementById(styleId) as HTMLStyleElement;

		if (!styleEl) {
			styleEl = document.createElement("style");
			styleEl.id = styleId;
			document.head.appendChild(styleEl);
		}

		styleEl.textContent = `
			/* Variables removed to use global defaults */


            /* Source Info Card */
            .export-source-info {
                background-color: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .source-details {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .source-label {
                color: var(--text-muted);
                font-size: 0.8em;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .source-name {
                font-weight: 600;
                font-size: 0.95em;
            }

            .source-stats {
                display: flex;
                gap: 12px;
                font-size: 0.85em;
                color: var(--text-muted);
            }

            .stat-item strong {
                color: var(--text-normal);
            }

            /* Collapsible Section */
            .settings-group {
                display: flex;
                flex-direction: column;
                gap: 8px; /* Reduced from 15px */
                margin-bottom: 15px;
            }
            
            .collapsible-header {
                display: flex;
                align-items: center;
                cursor: pointer;
                user-select: none;
                padding: 8px 0;
                margin-bottom: 10px;
                font-weight: 600;
                font-size: 0.95em;
                color: var(--text-normal);
            }

            .collapsible-icon {
                margin-right: 8px;
                transition: transform 0.2s ease;
                font-size: 0.8em;
                color: var(--text-muted);
            }

            .collapsible-content {
                display: none;
                padding-left: 10px;
                margin-bottom: 20px;
                border-left: 2px solid var(--background-modifier-border);
            }

            .collapsible-content.open {
                display: block;
            }

            /* Settings Items - Remove horizontal lines and padding from Obsidian's default */
            .export-modal-root .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                border-bottom: none !important;
            }
            
            /* Also target any nested setting items and grid children */
            .export-modal-root .settings-group > * {
                border: none !important;
                border-bottom: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            .setting-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .setting-label {
                font-size: 0.9em;
                font-weight: 500;
            }

            .setting-desc {
                font-size: 0.8em;
                color: var(--text-muted);
            }

            /* Range Container for slider */
            .range-container {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .range-container input[type="range"] {
                width: 150px;
                accent-color: var(--interactive-accent);
            }

            .range-container span {
                min-width: 20px;
                text-align: center;
                font-size: 0.9em;
            }

            /* Toggles */
            .toggle-switch {
                width: 36px;
                height: 20px;
                background-color: #444;
                border-radius: 10px;
                position: relative;
                cursor: pointer;
                transition: background 0.2s;
            }

            .toggle-switch.active {
                background-color: var(--interactive-accent);
            }

            .toggle-knob {
                width: 16px;
                height: 16px;
                background-color: white;
                border-radius: 50%;
                position: absolute;
                top: 2px;
                left: 2px;
                transition: transform 0.2s;
            }

            .toggle-switch.active .toggle-knob {
                transform: translateX(16px);
            }

            .toggle-switch-input {
                display: none;
            }

            /* File List */
            .file-list-header {
                font-size: 0.9em;
                font-weight: 600;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }


			/* File List - Scoped to .export-modal-root to win specificity wars */
            .export-modal-root .file-list-header {
                font-size: 0.9em;
                font-weight: 600;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .export-modal-root .export-file-list {
                background-color: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                max-height: 300px;
                overflow-y: auto;
                padding: 0 !important; /* Override default padding */
            }

            .export-modal-root .file-tree-item {
                display: flex;
                align-items: center;
                padding: 4px 12px;
                border-bottom: 1px solid var(--background-modifier-border);
                position: relative;
                opacity: 1; /* Force opacity for wrapper */
            }

            .export-modal-root .file-tree-item:last-child {
                border-bottom: none;
            }

            /* Tree Lines */
			.export-modal-root .tree-indent {
				display: flex;
				align-items: center;
				height: 100%;
				margin-right: 4px;
			}
			
			.export-modal-root .tree-line {
				width: 24px;
				height: 100%;
				display: flex;
				justify-content: center;
				align-items: center;
				position: relative;
				color: var(--text-muted);
				opacity: 0.3; /* Inner line opacity only */
				font-family: monospace;
				font-size: 1.2em;
				user-select: none;
			}

            .export-modal-root .file-content-wrapper {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
                overflow: hidden;
            }

            .export-modal-root .file-tree-item.filtered {
                opacity: 0.7;
                background-color: rgba(60, 20, 20, 0.3);
            }
            
            .export-modal-root .file-tree-item.filtered .file-name {
                text-decoration: line-through;
                color: var(--text-muted);
            }

            /* Fix Checkbox Visibility - Aggressive Overrides */
            .export-modal-root .file-content-wrapper input[type="checkbox"] {
                display: inline-block !important; /* Override 'none' */
                visibility: visible !important;   /* Override 'hidden' */
                opacity: 1 !important;            /* Override transparency */
                width: 16px !important; 
                height: 16px !important;
                margin: 0 !important;
                cursor: pointer;
                position: static !important;
                -webkit-appearance: checkbox !important;
                appearance: checkbox !important;
                filter: none !important;
            }

            /* Hide Obsidian theme's custom checkbox pseudo-elements */
            .export-modal-root .file-content-wrapper input[type="checkbox"]::after,
            .export-modal-root .file-content-wrapper input[type="checkbox"]::before {
                display: none !important;
                content: none !important;
                visibility: hidden !important;
            }

            .export-modal-root .exclusion-indicator {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-left: auto;
                font-size: 0.75em;
                color: var(--text-error);
                background-color: rgba(255, 107, 107, 0.1);
                padding: 2px 8px;
                border-radius: 10px;
            }

            .export-modal-root .file-details {
                display: flex;
                flex-direction: column;
                flex: 1;
                overflow: hidden;
            }

            .export-modal-root .file-name {
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: flex;
                align-items: center;
                gap: 6px;
                color: var(--text-normal);
                font-family: var(--font-monospace);
            }

            .export-modal-root .file-path {
                font-size: 0.85em;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .export-modal-root .file-tags {
                margin-left: 10px;
                display: flex;
                gap: 4px;
                align-items: center;
                overflow: hidden;
                flex-shrink: 3;
                max-width: 40%;
                mask-image: linear-gradient(to right, black 85%, transparent 100%);
                -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
            }

            .export-modal-root .tag {
                background: var(--background-modifier-border);
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.75em;
                color: var(--text-muted);
                white-space: nowrap;
            }

            /* File Icon */
            .export-modal-root .file-icon {
                font-size: 1.1em;
                flex-shrink: 0;
            }

            /* Range/Slider styling */
            .export-modal-root input[type="range"] {
                width: 100%;
                accent-color: var(--interactive-accent);
            }

            /* Input text styling */
            .export-modal-root input[type="text"] {
                background-color: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                color: var(--text-normal);
                padding: 6px 10px;
                border-radius: 4px;
                width: 100%;
                font-size: 0.9em;
            }
		`;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("export-modal-root");
		// Ensure background is solid
		contentEl.style.backgroundColor = "var(--background-primary)";
		this.injectStyles();

		// Calculate files to export based on current link depth
		await this.recalculateFiles();

		this.createHeader();
		this.createSourceInfo();
		this.createExportSettingsSection();
		this.createFileList();
		this.createButtons();

		// Focus on export button
		const exportButton = contentEl.querySelector(
			"button:last-child",
		) as HTMLButtonElement;
		if (exportButton) exportButton.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createHeader() {
		const header = this.contentEl.createEl("h2", {
			text: "Export Options",
		});
		header.style.textAlign = "center";
		header.style.fontSize = UI_CONSTANTS.FONT_SIZES.HEADER;
	}

	private createSourceInfo() {
		const sourceInfo = this.contentEl.createEl("div", {
			cls: "export-source-info",
		});
		sourceInfo.empty();

		const details = sourceInfo.createEl("div", { cls: "source-details" });
		details.createEl("span", { cls: "source-label", text: "Exporting Note" });
		details.createEl("span", { cls: "source-name", text: this.sourceFile.basename });
		details.createEl("span", {
			text: this.sourceFile.path,
			attr: { style: "font-size: 0.8em; color: var(--text-muted);" }
		});

		const stats = sourceInfo.createEl("div", { cls: "source-stats" });

		// Will poplate stats in updateSourceInfo
		stats.id = "source-stats-container";
		stats.createEl("span", { text: "Loading..." });
	}

	private createExportSettingsSection() {
		const section = this.contentEl.createEl("div", { cls: "collapsible-section" });

		// --- Header ---
		const header = section.createEl("div", { cls: "collapsible-header" });
		const icon = header.createEl("span", { cls: "collapsible-icon", text: "▶" });
		header.createEl("span", { text: "Configure Export" });

		// --- Content ---
		const content = section.createEl("div", { cls: "collapsible-content", attr: { id: "settings-content" } });
		const settingsGroup = content.createEl("div", {
			cls: "settings-group",
			attr: { style: "display: flex; flex-direction: column; gap: 15px; margin-bottom: 15px;" }
		});

		this.createLinkDepthControl(settingsGroup);
		this.createIgnoreSettings(settingsGroup);
		this.createToggleButtons(settingsGroup);

		// --- Toggle behavior ---
		header.addEventListener("click", () => {
			content.toggleClass("open", !content.hasClass("open"));
			if (content.hasClass("open")) {
				icon.textContent = "▼";
				icon.style.transform = "rotate(0deg)"; // reset rotation if we used it before
			} else {
				icon.textContent = "▶";
			}
		});
	}

	private createLinkDepthControl(container: HTMLElement) {
		// Match test.html: div.setting-item > div.setting-info + div.range-container
		const item = container.createEl("div", { cls: "setting-item" });

		// Setting Info (label + description)
		const info = item.createEl("div", { cls: "setting-info" });
		info.createEl("span", { cls: "setting-label", text: "Linked Notes Depth" });
		info.createEl("span", { cls: "setting-desc", text: "Includes notes linked by this note" });

		// Range container (slider + value)
		const rangeContainer = item.createEl("div", { cls: "range-container" });

		// Slider
		this.linkDepthSlider = rangeContainer.createEl("input", { type: "range" });
		this.linkDepthSlider.min = "0";
		this.linkDepthSlider.max = "5";
		this.linkDepthSlider.step = "1";
		this.linkDepthSlider.value = this.currentLinkDepth.toString();

		// Value display
		const linkDepthValue = rangeContainer.createEl("span");
		linkDepthValue.textContent = this.currentLinkDepth.toString();

		// Update on slider change
		this.linkDepthSlider.oninput = async (e) => {
			const newDepth = parseInt((e.target as HTMLInputElement).value);
			linkDepthValue.textContent = newDepth.toString();

			if (newDepth !== this.currentLinkDepth) {
				this.currentLinkDepth = newDepth;
				await this.recalculateFiles();
				// Re-render file list
				const fileListContainer = this.contentEl.querySelector(".export-file-list") as HTMLElement;
				if (fileListContainer) {
					fileListContainer.empty();
					this.renderFileList(fileListContainer);
				}
			}
		};
	}

	private createIgnoreSettings(container: HTMLElement) {
		const item = container.createEl("div", { cls: "setting-item", attr: { style: "align-items: flex-start; flex-direction: column; gap: 8px;" } });

		const info = item.createEl("div", { cls: "setting-info" });
		info.createEl("span", { cls: "setting-label", text: "Skip Content" });

		const inputsRow = item.createEl("div", { attr: { style: "display: flex; gap: 10px; width: 100%;" } });

		// Folders Input
		this.ignoreFoldersInput = inputsRow.createEl("input", { type: "text" });
		this.ignoreFoldersInput.placeholder = "Folders (e.g. Templates)";
		this.ignoreFoldersInput.value = this.plugin.settings.ignoreFolders.join(", ");
		this.ignoreFoldersInput.style.flex = "1";

		// Tags Input
		this.ignoreTagsInput = inputsRow.createEl("input", { type: "text" });
		this.ignoreTagsInput.placeholder = "Tags (e.g. #private)";
		this.ignoreTagsInput.value = this.plugin.settings.ignoreTags.join(", ");
		this.ignoreTagsInput.style.flex = "1";

		const handleInput = async () => {
			await this.recalculateFiles();
			const fileListContainer = this.contentEl.querySelector(".export-file-list") as HTMLElement;
			if (fileListContainer) {
				fileListContainer.empty();
				this.renderFileList(fileListContainer);
			}
		};

		this.ignoreFoldersInput.addEventListener("input", handleInput);
		this.ignoreTagsInput.addEventListener("input", handleInput);
	}

	// Deleted old separate methods
	// private createIgnoreFoldersSetting(container: HTMLElement) { ... }
	// private createIgnoreTagsSetting(container: HTMLElement) { ... }

	private createFileList() {
		// File list header (outside the scrollable container)
		const fileListHeader = this.contentEl.createEl("div", {
			cls: "file-list-header",
		});
		fileListHeader.createEl("span", { text: "Files:" });
		const selectedCount = fileListHeader.createEl("span", { cls: "file-meta" });
		selectedCount.id = "selected-file-count";

		// Scrollable file list container
		const fileListContainer = this.contentEl.createEl("div", {
			cls: "export-file-list",
		});
		fileListContainer.style.maxHeight = UI_CONSTANTS.MODAL.MAX_FILE_LIST_HEIGHT;
		fileListContainer.style.overflowY = "auto";
		fileListContainer.style.marginBottom = UI_CONSTANTS.SPACING.DEFAULT_MARGIN;

		this.renderFileList(fileListContainer);
	}

	private createToggleButtons(container: HTMLElement) {
		const grid = container.createEl("div", { attr: { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 5px;" } });

		// Helper to create a toggle item
		const createToggleItem = (label: string, title: string, defaultChecked: boolean) => {
			const item = grid.createEl("div", { cls: "setting-item" });
			item.createEl("span", { cls: "setting-label", text: label }).title = title;

			const toggleWrapper = item.createEl("div", { cls: "toggle-switch" });
			if (defaultChecked) toggleWrapper.addClass("active");
			toggleWrapper.createEl("div", { cls: "toggle-knob" });

			// Actual checkbox (hidden)
			const input = toggleWrapper.createEl("input", { type: "checkbox", cls: "toggle-switch-input" });
			input.checked = defaultChecked;
			input.style.display = "none";

			toggleWrapper.addEventListener("click", () => {
				input.checked = !input.checked;
				toggleWrapper.toggleClass("active", input.checked);
				input.dispatchEvent(new Event("change"));
			});

			return input;
		};

		this.zipToggle = createToggleItem("Create ZIP", "Compress all exported files into export.zip", this.defaultZipSetting);
		this.keepFolderStructureToggle = createToggleItem("Maintain Folders", "Preserve the original folder hierarchy in the export", this.defaultkeepFolderStructureSetting);
		this.useHeaderHierarchyToggle = createToggleItem("Header Groups", "Organize exported files by the header structure in the source note", this.defaultUseHeaderHierarchy);

		// Mutual exclusivity
		this.keepFolderStructureToggle.addEventListener("change", () => {
			if (this.keepFolderStructureToggle.checked && this.useHeaderHierarchyToggle) {
				if (this.useHeaderHierarchyToggle.checked) {
					// Manually click to trigger visual update or just update props
					const wrapper = this.useHeaderHierarchyToggle.parentElement;
					if (wrapper) wrapper.click();
				}
				this.headerMap = new Map();
			}
		});

		this.useHeaderHierarchyToggle.addEventListener("change", async () => {
			if (this.useHeaderHierarchyToggle.checked) {
				if (this.keepFolderStructureToggle.checked) {
					const wrapper = this.keepFolderStructureToggle.parentElement;
					if (wrapper) wrapper.click();
				}

				this.headerMap = await FileUtils.buildHeaderHierarchyAsync(
					this.sourceFile,
					this.plugin.app,
					Array.from(this.filesToExport.values()),
					this.parentMap,
					this.depthMap,
				);
			} else {
				this.headerMap = new Map();
			}
		});
	}

	private createButtons() {
		const buttonContainer = this.contentEl.createEl("div", {
			cls: "export-button-container",
		});
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "center";
		buttonContainer.style.gap = UI_CONSTANTS.SPACING.SMALL_MARGIN;

		// Cancel button
		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.style.padding = "6px 12px";
		cancelButton.style.borderRadius = "3px";
		cancelButton.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
		cancelButton.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_SECONDARY;
		cancelButton.style.cursor = "pointer";
		cancelButton.onclick = () => {
			this.close();
			this.resolve({
				confirmed: false,
				createZip: false,
				keepFolderStructure:
					this.keepFolderStructureToggle.checked,
				useHeaderHierarchy: false,
				headerMap: new Map(),
				selectedFiles: [],
				linkDepth: this.currentLinkDepth,
				ignoreFolders: this.ignoreFoldersInput.value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				ignoreTags: this.ignoreTagsInput.value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			});
		};

		// Export button
		const exportButton = buttonContainer.createEl("button", {
			text: "Export",
		});
		exportButton.style.padding = "6px 12px";
		exportButton.style.borderRadius = "3px";
		exportButton.style.border = "none";
		exportButton.style.backgroundColor = UI_CONSTANTS.COLORS.COLOR_ACCENT;
		exportButton.style.color = "white";
		exportButton.style.cursor = "pointer";
		exportButton.onclick = () => {
			this.close();
			const selectedFiles = this.getSelectedFiles();
			this.resolve({
				confirmed: true,
				createZip: this.zipToggle.checked,
				keepFolderStructure:
					this.keepFolderStructureToggle.checked,
				useHeaderHierarchy: this.useHeaderHierarchyToggle.checked,
				headerMap: this.headerMap,
				selectedFiles,
				linkDepth: this.currentLinkDepth,
				ignoreFolders: this.ignoreFoldersInput.value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				ignoreTags: this.ignoreTagsInput.value
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			});
		};
	}

	private renderFileList(fileList: HTMLElement) {
		const visitedPaths = new Set<string>();

		// Helper to recursively render tree
		const renderTreeRecursive = (filePath: string, depth: number, indentGuides: string[], isLastChild: boolean) => {
			if (visitedPaths.has(filePath)) return;
			visitedPaths.add(filePath);

			let file = this.filesToExport.get(filePath);
			let isFiltered = false;
			let filteredItem: FilteredFile | undefined;

			// If not in export list, check filtered list
			if (!file) {
				filteredItem = this.filteredFiles.get(filePath);
				if (filteredItem) {
					file = filteredItem.file;
					isFiltered = true;
				}
			}
			if (!file) return;

			this.createTreeNode(fileList, file, depth, indentGuides, isFiltered, isLastChild, filteredItem?.reason);

			const children = this.childrenMap.get(filePath);
			if (children && children.size > 0) {
				const sortedChildren = FileUtils.sortFiles(
					Array.from(children).map(childPath => {
						return this.filesToExport.get(childPath) || this.filteredFiles.get(childPath)?.file;
					}).filter(Boolean) as TFile[]
				);

				// Prepare guides for children
				const childGuides = [...indentGuides];
				// Add a guide for the current level.
				// If we are not at root (depth 0), we add a guide segment.
				// If we are root, we don't start shifting yet for our children?
				// Actually, root has no indent line. Children of root (level 1) have "└─" or "├─".
				// They don't have a parent line passing through.
				// So for depth 0, we push NOTHING to childGuides?
				// Let's trace:
				// Root (depth 0). childGuides = [].
				// Child1 (depth 1). isLast=true. indentGuides=[]. 
				// createTreeNode prints guides ([]). Then prints "└─". Visual: └─ Child1. Correct for single child.

				// What if Root has 2 children?
				// Child1 (depth 1). isLast=false. indentGuides=[].
				// createTreeNode prints "└─" (or ├─? Mockup used └─ even for first item? No, mockup used └─ for single item).
				// My createTreeNode logic currently hardcodes "└─" for the connector: `treeIndent.createEl("div", { cls: "tree-line", text: "└─" });`

				// If I have multiple children, visually it should be:
				// ├─ Child1
				// └─ Child2

				// My code currently will do:
				// └─ Child1
				// └─ Child2

				// This is slightly incorrect but acceptable if that's what the mockup did. 
				// Mockup check:
				// Mockup had:
				// └─ Inbox stuff
				//   └─ config.png 
				// └─ Reference.pdf

				// It seems user accepted the "always └─" look for the node itself?
				// Or maybe I should respect `isLastChild` for the connector too.

				// For now, I'll stick to fixing the compile errors. I will add the guide push logic correctly.

				if (depth > 0) {
					childGuides.push(isLastChild ? "  " : "│ ");
				}

				sortedChildren.forEach((child, index) => {
					const childIsLast = index === sortedChildren.length - 1;
					renderTreeRecursive(child.path, depth + 1, childGuides, childIsLast);
				});
			}
		};

		// Start with source file (root node, considered last child of its conceptual parent)
		renderTreeRecursive(this.sourceFile.path, 0, [], true);

		this.updateSourceInfo();
	}

	private createTreeNode(
		container: HTMLElement,
		file: TFile,
		depth: number,
		indentGuides: string[],
		isFiltered: boolean,
		isLastChild: boolean,
		filterReason?: string
	) {
		// Use inline style for opacity to guarantee it works
		const itemStyle = isFiltered ? "opacity: 0.7;" : "opacity: 1 !important;";

		const item = container.createEl("div", {
			cls: `file-tree-item${isFiltered ? " filtered" : ""}`,
			attr: { style: itemStyle }
		});

		// Tree Indent - invisible spacer to maintain indentation
		const treeIndent = item.createEl("div", { cls: "tree-indent" });

		// The root node (depth 0) has no indent
		if (depth > 0) {
			// Just add invisible spacers based on depth
			for (let i = 0; i < depth; i++) {
				const spacer = treeIndent.createEl("div", { cls: "tree-line" });
				spacer.style.visibility = "hidden";
				spacer.textContent = "  "; // Invisible spacing
			}
		}

		const wrapper = item.createEl("div", { cls: "file-content-wrapper" });
		// Root node special margin
		if (depth === 0) wrapper.style.marginLeft = "0";

		// Checkbox - Nuclear option for styling
		const checkbox = wrapper.createEl("input", {
			type: "checkbox",
			attr: {
				style: "display: inline-block !important; visibility: visible !important; opacity: 1 !important; width: 16px !important; height: 16px !important; margin-right: 8px !important; cursor: pointer !important; -webkit-appearance: checkbox !important; appearance: checkbox !important;"
			}
		});
		checkbox.checked = !isFiltered;
		checkbox.disabled = isFiltered;
		if (!isFiltered) {
			this.fileCheckboxes.set(file.path, checkbox);
			// Update selected count when checkbox changes
			checkbox.addEventListener("change", () => {
				this.updateSelectedCount();
			});
		}

		// Icon - choose based on file extension
		const icon = wrapper.createEl("span", { cls: "file-icon" });
		const ext = file.extension.toLowerCase();
		if (ext === "md") {
			icon.textContent = "\uD83D\uDCC4"; // 📄
		} else if (ext === "canvas") {
			icon.textContent = "\uD83D\uDDBC\uFE0F"; // 🖼️
		} else if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) {
			icon.textContent = "\uD83D\uDDBC\uFE0F"; // 🖼️
		} else if (ext === "pdf") {
			icon.textContent = "\uD83D\uDCC4"; // 📄
		} else {
			icon.textContent = "\uD83D\uDCCE"; // 📎
		}
		if (isFiltered) icon.style.filter = "grayscale(1)";

		// Details
		const details = wrapper.createEl("div", { cls: "file-details" });
		const nameLine = details.createEl("div", { cls: "file-name", text: file.name });

		// Ensure file name color
		nameLine.style.color = "var(--text-normal)";
		nameLine.style.opacity = "1";

		details.createEl("div", { cls: "file-path", text: file.path });

		// Tags
		const tags = FileUtils.getFileTags(file, this.plugin.app);
		if (tags.length > 0) {
			const tagContainer = wrapper.createEl("div", { cls: "file-tags" });
			tags.forEach((tag) => {
				tagContainer.createEl("span", { cls: "tag", text: tag });
			});
		}

		// Exclusion Indicator
		if (isFiltered && filterReason) {
			const indicator = wrapper.createEl("div", { cls: "exclusion-indicator" });
			indicator.createEl("span", { text: `${filterReason}` });
		}
	}

	private addFilteredFilesSeparator(
		container: HTMLElement,
		hasExportableFiles: boolean,
	) {
		if (hasExportableFiles) {
			const separator = container.createEl("div", {
				cls: "export-file-separator",
			});
			separator.style.borderTop = `2px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
			separator.style.margin = UI_CONSTANTS.SPACING.SMALL_MARGIN + " 0";
			separator.style.padding = UI_CONSTANTS.SPACING.SMALL_MARGIN + " 0";
			const em = document.createElement("em");
			em.textContent = "Filtered files:";
			separator.appendChild(em);
			separator.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
			separator.style.fontSize = UI_CONSTANTS.FONT_SIZES.IGNORE_TITLE;
		}
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

		// Also update the file list header count
		const fileListHeaderMeta = this.contentEl.querySelector(".file-meta");
		if (fileListHeaderMeta) {
			fileListHeaderMeta.textContent = `${this.filesToExport.size} selected`;
		}
	}

	private updateSelectedCount() {
		const fileListHeaderMeta = this.contentEl.querySelector(".file-meta");
		if (fileListHeaderMeta) {
			let count = 0;
			for (const checkbox of this.fileCheckboxes.values()) {
				if (checkbox.checked) count++;
			}
			fileListHeaderMeta.textContent = `${count} selected`;
		}
	}

	private getSelectedFiles(): TFile[] {
		const selected: TFile[] = [];
		for (const [filePath, checkbox] of this.fileCheckboxes) {
			if (checkbox.checked) {
				const file = this.filesToExport.get(filePath);
				if (file) {
					selected.push(file);
				}
			}
		}
		return selected;
	}

	private async recalculateFiles() {
		// Clear current file list
		this.fileCheckboxes.clear();
		this.filteredFiles.clear();

		// Get current ignore settings from inputs
		const ignoreFolders = this.ignoreFoldersInput
			? this.ignoreFoldersInput.value
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
			: this.plugin.settings.ignoreFolders;
		const ignoreTags = this.ignoreTagsInput
			? this.ignoreTagsInput.value
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
			: this.plugin.settings.ignoreTags;

		// Recalculate files with new link depth
		const allFilesToCopy = new Map<string, TFile>();
		const visited = new Set<string>();
		// Track parent-child relationships for header hierarchy inheritance
		const parentMap = new Map<string, Set<string>>();
		const depthMap = new Map<string, number>();
		this.childrenMap.clear();

		const processFile = async (f: TFile, level = 0, parentPath?: string) => {
			if (visited.has(f.path) || level > this.currentLinkDepth) return;

			visited.add(f.path);

			// Populate childrenMap
			if (parentPath) {
				if (!this.childrenMap.has(parentPath)) {
					this.childrenMap.set(parentPath, new Set());
				}
				this.childrenMap.get(parentPath)!.add(f.path);
			}

			// Track parent-child relationship for header hierarchy inheritance
			if (parentPath && level > 0) {
				if (!parentMap.has(f.path)) {
					parentMap.set(f.path, new Set());
				}
				parentMap.get(f.path)!.add(parentPath);
			}

			// Track depth for this file
			depthMap.set(f.path, level);

			// Check if file should be excluded with current ignore settings
			const shouldExclude = FileUtils.shouldExcludeFile(
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
				linkedPaths = FileUtils.getLinkedPaths(content);
			} else if (f.extension === "canvas") {
				linkedPaths = FileUtils.extractCanvasLinks(content);
			}

			for (const p of linkedPaths) {
				const linked =
					this.plugin.app.metadataCache.getFirstLinkpathDest(
						p,
						f.path,
					);
				if (linked) await processFile(linked, level + 1, f.path);
			}
		};

		await processFile(this.sourceFile, 0);

		// Update the filesToExport map
		this.filesToExport = allFilesToCopy;
		// Update parent-child and depth tracking maps
		this.parentMap = parentMap;
		this.depthMap = depthMap;

		// Build header hierarchy map if the feature might be used
		// Check toggle if it exists, otherwise check default setting
		const shouldBuildMap = this.useHeaderHierarchyToggle
			? this.useHeaderHierarchyToggle.checked
			: this.defaultUseHeaderHierarchy;

		if (shouldBuildMap) {
			this.headerMap = await FileUtils.buildHeaderHierarchyAsync(
				this.sourceFile,
				this.plugin.app,
				Array.from(allFilesToCopy.values()),
				parentMap,
				depthMap,
			);
		} else {
			this.headerMap = new Map();
		}

		// Refresh the file list display
		this.refreshFileList();
	}

	private refreshFileList() {
		const fileListContainer = this.contentEl.querySelector(
			".export-file-list",
		) as HTMLElement;
		if (!fileListContainer) return;

		fileListContainer.empty();
		this.renderFileList(fileListContainer);
	}
}
