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
	private maintainFolderStructureToggle: HTMLInputElement;
	private defaultZipSetting: boolean;
	private defaultmaintainFolderStructureSetting: boolean;
	private fileCheckboxes: Map<string, HTMLInputElement>;
	private linkDepthSlider: HTMLInputElement;
	private currentLinkDepth: number;
	private ignoreFoldersInput: HTMLInputElement;
	private ignoreTagsInput: HTMLInputElement;
	private plugin: any;

	constructor(
		app: App,
		sourceFile: TFile,
		defaultZipSetting: boolean,
		defaultmaintainFolderStructureSetting: boolean,
		resolve: (value: ExportModalResult) => void,
		plugin: any,
	) {
		super(app);
		this.sourceFile = sourceFile;
		this.filesToExport = new Map();
		this.filteredFiles = new Map();
		this.defaultZipSetting = defaultZipSetting;
		this.defaultmaintainFolderStructureSetting =
			defaultmaintainFolderStructureSetting;
		this.resolve = resolve;
		this.plugin = plugin;
		this.currentLinkDepth = plugin.settings.linkDepth;
		this.fileCheckboxes = new Map();
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Calculate files to export based on current link depth
		await this.recalculateFiles();

		this.createHeader();
		this.createSourceInfo();
		this.createConfigurationSection();
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
			text: "Export Confirmation",
		});
		header.style.textAlign = "center";
		header.style.marginBottom = UI_CONSTANTS.SPACING.DEFAULT_MARGIN;
		header.style.fontSize = UI_CONSTANTS.FONT_SIZES.HEADER;
	}

	private createSourceInfo() {
		const sourceInfo = this.contentEl.createEl("div", {
			cls: "export-source-info",
		});
		sourceInfo.empty();

		const sourceLabel = sourceInfo.createEl("strong", { text: "Source: " });
		sourceInfo.createEl("span", { text: this.sourceFile.path });
		sourceInfo.createEl("br");

		const totalLabel = sourceInfo.createEl("strong", {
			text: "Total files to export: ",
		});
		sourceInfo.createEl("span", { text: "Loading..." });
		sourceInfo.style.marginBottom = UI_CONSTANTS.SPACING.DEFAULT_MARGIN;
		sourceInfo.style.padding = UI_CONSTANTS.SPACING.DEFAULT_PADDING;
		sourceInfo.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_SECONDARY;
		sourceInfo.style.borderRadius = "4px";
		sourceInfo.style.fontSize = UI_CONSTANTS.FONT_SIZES.SOURCE_INFO;
	}

	private createConfigurationSection() {
		// Create the trigger checkbox (always visible)
		const triggerContainer = this.contentEl.createEl("div", {
			cls: "export-config-trigger-container",
		});
		triggerContainer.style.marginBottom =
			UI_CONSTANTS.SPACING.DEFAULT_MARGIN;
		triggerContainer.style.display = "flex";
		triggerContainer.style.alignItems = "center";
		triggerContainer.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;

		const configTrigger = triggerContainer.createEl("input", {
			type: "checkbox",
		});
		configTrigger.id = "export-config-trigger";
		configTrigger.style.margin = "0";

		const configTriggerLabel = triggerContainer.createEl("label", {
			text: "Show export configuration",
		});
		configTriggerLabel.htmlFor = "export-config-trigger";
		configTriggerLabel.style.cursor = "pointer";

		// The actual configuration section (hidden by default)
		const configContainer = this.contentEl.createEl("div", {
			cls: "export-config-section",
		});
		configContainer.style.display = "none";
		configContainer.style.marginBottom =
			UI_CONSTANTS.SPACING.DEFAULT_MARGIN;
		configContainer.style.padding = "12px";
		configContainer.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_SECONDARY;
		configContainer.style.borderRadius = "4px";
		configContainer.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;

		const configTitle = configContainer.createEl("h3", {
			text: "Export Configuration",
		});
		configTitle.style.margin = "0 0 15px 0";
		configTitle.style.fontSize = UI_CONSTANTS.FONT_SIZES.CONFIG_TITLE;
		configTitle.style.textAlign = "center";

		this.createLinkDepthControl(configContainer);
		this.createIgnoreSettings(configContainer);

		// Advanced options section (always visible within config)
		const advancedOptionsSection = configContainer.createEl("div", {
			cls: "export-advanced-options-section",
		});
		advancedOptionsSection.style.marginTop = "10px";
		this.createZipToggleAndDirectoryStructureToggleRow(
			advancedOptionsSection,
		);

		// Show/hide config section
		configTrigger.addEventListener("change", () => {
			configContainer.style.display = configTrigger.checked
				? "block"
				: "none";
		});
	}

	private createLinkDepthControl(container: HTMLElement) {
		const linkDepthContainer = container.createEl("div", {
			cls: "export-link-depth",
		});
		linkDepthContainer.style.marginBottom = "15px";
		linkDepthContainer.style.padding = UI_CONSTANTS.SPACING.DEFAULT_PADDING;
		linkDepthContainer.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_PRIMARY;
		linkDepthContainer.style.borderRadius = "4px";
		linkDepthContainer.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;

		const linkDepthLabel = linkDepthContainer.createEl("label", {
			cls: "export-link-depth-label",
		});
		linkDepthLabel.style.display = "flex";
		linkDepthLabel.style.alignItems = "center";
		linkDepthLabel.style.justifyContent = "space-between";
		linkDepthLabel.style.marginBottom = UI_CONSTANTS.SPACING.SMALL_MARGIN;

		const linkDepthText = linkDepthLabel.createEl("span");
		linkDepthText.empty();
		linkDepthText.createEl("strong", { text: "Link depth: " });
		const depthValue = linkDepthText.createEl("span", {
			text: this.currentLinkDepth.toString(),
			attr: { id: "link-depth-value" },
		});

		const linkDepthSliderContainer = linkDepthContainer.createEl("div", {
			cls: "export-link-depth-slider",
		});
		linkDepthSliderContainer.style.display = "flex";
		linkDepthSliderContainer.style.alignItems = "center";
		linkDepthSliderContainer.style.gap = UI_CONSTANTS.SPACING.DEFAULT_GAP;

		this.linkDepthSlider = linkDepthSliderContainer.createEl("input", {
			type: "range",
		});
		this.linkDepthSlider.min = "0";
		this.linkDepthSlider.max = "10";
		this.linkDepthSlider.step = "1";
		this.linkDepthSlider.value = this.currentLinkDepth.toString();
		this.linkDepthSlider.style.flex = "1";

		const linkDepthValue = linkDepthSliderContainer.createEl("span", {
			cls: "export-link-depth-value",
		});
		linkDepthValue.textContent = this.currentLinkDepth.toString();
		linkDepthValue.style.minWidth = "20px";
		linkDepthValue.style.textAlign = "center";

		// Update link depth value display and recalculate files
		this.linkDepthSlider.oninput = async (e) => {
			const newDepth = parseInt((e.target as HTMLInputElement).value);
			linkDepthValue.textContent = newDepth.toString();
			const depthValueElement =
				document.getElementById("link-depth-value");
			if (depthValueElement)
				depthValueElement.textContent = newDepth.toString();

			if (newDepth !== this.currentLinkDepth) {
				this.currentLinkDepth = newDepth;
				await this.recalculateFiles();
			}
		};
	}

	private createIgnoreSettings(container: HTMLElement) {
		const ignoreContainer = container.createEl("div", {
			cls: "export-ignore-settings",
		});
		ignoreContainer.style.marginBottom = "0";
		ignoreContainer.style.padding = UI_CONSTANTS.SPACING.DEFAULT_PADDING;
		ignoreContainer.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_PRIMARY;
		ignoreContainer.style.borderRadius = "4px";
		ignoreContainer.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;

		const ignoreTitle = ignoreContainer.createEl("h4", {
			text: "One-time Ignore Settings",
		});
		ignoreTitle.style.margin = "0 0 12px 0";
		ignoreTitle.style.fontSize = UI_CONSTANTS.FONT_SIZES.IGNORE_TITLE;

		this.createIgnoreFoldersSetting(ignoreContainer);
		this.createIgnoreTagsSetting(ignoreContainer);
	}

	private createIgnoreFoldersSetting(container: HTMLElement) {
		const row = container.createEl("div", {
			cls: "export-ignore-folders-row",
		});
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = UI_CONSTANTS.SPACING.DEFAULT_GAP;
		row.style.marginBottom = "6px";

		const labelCol = row.createEl("div", {
			cls: "export-ignore-folders-label-col",
		});
		labelCol.style.flex = "0 0 120px";
		labelCol.style.display = "flex";
		labelCol.style.alignItems = "center";
		const ignoreFoldersLabel = labelCol.createEl("label", {
			text: "Ignore folder paths:",
		});
		ignoreFoldersLabel.style.fontSize = UI_CONSTANTS.FONT_SIZES.LABELS;
		ignoreFoldersLabel.style.marginBottom = "0";

		const inputCol = row.createEl("div", {
			cls: "export-ignore-folders-input-col",
		});
		inputCol.style.flex = "1";
		this.ignoreFoldersInput = inputCol.createEl("input", {
			type: "text",
		});
		this.ignoreFoldersInput.placeholder = "e.g. Templates, Archive";
		this.ignoreFoldersInput.value =
			this.plugin.settings.ignoreFolders.join(", ");
		this.ignoreFoldersInput.style.width = "100%";
		this.ignoreFoldersInput.style.padding =
			UI_CONSTANTS.SPACING.SMALL_PADDING;
		this.ignoreFoldersInput.style.borderRadius = "3px";
		this.ignoreFoldersInput.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
		this.ignoreFoldersInput.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_PRIMARY;

		this.ignoreFoldersInput.addEventListener("input", async () => {
			await this.recalculateFiles();
		});
	}

	private createIgnoreTagsSetting(container: HTMLElement) {
		const row = container.createEl("div", {
			cls: "export-ignore-tags-row",
		});
		row.style.display = "flex";
		row.style.alignItems = "center";
		row.style.gap = UI_CONSTANTS.SPACING.DEFAULT_GAP;

		const labelCol = row.createEl("div", {
			cls: "export-ignore-tags-label-col",
		});
		labelCol.style.flex = "0 0 120px";
		labelCol.style.display = "flex";
		labelCol.style.alignItems = "center";
		const ignoreTagsLabel = labelCol.createEl("label", {
			text: "Ignore tags:",
		});
		ignoreTagsLabel.style.fontSize = UI_CONSTANTS.FONT_SIZES.LABELS;
		ignoreTagsLabel.style.marginBottom = "0";

		const inputCol = row.createEl("div", {
			cls: "export-ignore-tags-input-col",
		});
		inputCol.style.flex = "1";
		this.ignoreTagsInput = inputCol.createEl("input", {
			type: "text",
		});
		this.ignoreTagsInput.placeholder = "e.g. #draft, #personal/*";
		this.ignoreTagsInput.value = this.plugin.settings.ignoreTags.join(", ");
		this.ignoreTagsInput.style.width = "100%";
		this.ignoreTagsInput.style.padding = UI_CONSTANTS.SPACING.SMALL_PADDING;
		this.ignoreTagsInput.style.borderRadius = "3px";
		this.ignoreTagsInput.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
		this.ignoreTagsInput.style.backgroundColor =
			UI_CONSTANTS.COLORS.BACKGROUND_PRIMARY;

		this.ignoreTagsInput.addEventListener("input", async () => {
			await this.recalculateFiles();
		});
	}

	private createFileList() {
		const fileListContainer = this.contentEl.createEl("div", {
			cls: "export-file-list",
		});
		fileListContainer.style.maxHeight =
			UI_CONSTANTS.MODAL.MAX_FILE_LIST_HEIGHT;
		fileListContainer.style.overflowY = "auto";
		fileListContainer.style.border = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
		fileListContainer.style.borderRadius = "4px";
		fileListContainer.style.padding = UI_CONSTANTS.SPACING.DEFAULT_PADDING;
		fileListContainer.style.marginBottom =
			UI_CONSTANTS.SPACING.DEFAULT_MARGIN;

		const fileListHeader = fileListContainer.createEl("div", {
			cls: "export-file-list-header",
		});
		fileListHeader.empty();
		fileListHeader.createEl("strong", { text: "Files to be exported:" });
		fileListHeader.style.marginBottom = UI_CONSTANTS.SPACING.SMALL_MARGIN;
		fileListHeader.style.borderBottom = `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER}`;
		fileListHeader.style.paddingBottom = UI_CONSTANTS.SPACING.SMALL_PADDING;

		const fileList = fileListContainer.createEl("div", {
			cls: "export-file-list-items",
		});
		this.renderFileList(fileList);
	}

	private createZipToggleAndDirectoryStructureToggleRow(
		container: HTMLElement,
	) {
		const row = container.createEl("div", {
			cls: "export-advanced-options-row",
		});
		row.style.display = "flex";
		row.style.gap = UI_CONSTANTS.SPACING.DEFAULT_GAP;
		row.style.justifyContent = "space-between";
		row.style.alignItems = "center";

		// ZIP toggle (left column)
		const zipCol = row.createEl("div", { cls: "export-zip-toggle-col" });
		zipCol.style.flex = "1";
		zipCol.style.display = "flex";
		zipCol.style.alignItems = "center";
		const zipLabel = zipCol.createEl("label", {
			cls: "export-zip-toggle-label",
		});
		zipLabel.style.display = "flex";
		zipLabel.style.alignItems = "center";
		zipLabel.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		zipLabel.style.cursor = "pointer";
		zipLabel.title = "Compress all exported files into export.zip";
		this.zipToggle = zipLabel.createEl("input", { type: "checkbox" });
		this.zipToggle.checked = this.defaultZipSetting;
		this.zipToggle.style.margin = "0";
		const zipToggleText = zipLabel.createEl("span");
		zipToggleText.createEl("strong", { text: "Create ZIP archive" });

		// Directory structure toggle (right column)
		const dirCol = row.createEl("div", {
			cls: "export-directory-toggle-col",
		});
		dirCol.style.flex = "1";
		dirCol.style.display = "flex";
		dirCol.style.alignItems = "center";
		const dirLabel = dirCol.createEl("label", {
			cls: "export-directory-toggle-label",
		});
		dirLabel.style.display = "flex";
		dirLabel.style.alignItems = "center";
		dirLabel.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		dirLabel.style.cursor = "pointer";
		dirLabel.title = "Preserve the original folder hierarchy in the export";
		this.maintainFolderStructureToggle = dirLabel.createEl("input", {
			type: "checkbox",
		});
		this.maintainFolderStructureToggle.checked =
			this.defaultmaintainFolderStructureSetting;
		this.maintainFolderStructureToggle.style.margin = "0";
		const dirToggleText = dirLabel.createEl("span");
		dirToggleText.createEl("strong", { text: "Maintain folder structure" });
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
				maintainFolderStructure:
					this.maintainFolderStructureToggle.checked,
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
				maintainFolderStructure:
					this.maintainFolderStructureToggle.checked,
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
		// Sort files: markdown files first, then by name
		const sortedFiles = FileUtils.sortFiles(
			Array.from(this.filesToExport.values()),
		);

		sortedFiles.forEach((file, index) => {
			this.createFileItem(
				fileList,
				file,
				index,
				sortedFiles.length,
				false,
			);
		});

		// Add filtered files (if any)
		if (this.filteredFiles.size > 0) {
			this.addFilteredFilesSeparator(fileList, sortedFiles.length > 0);
			this.renderFilteredFiles(fileList);
		}

		this.updateSourceInfo();
	}

	private createFileItem(
		container: HTMLElement,
		file: TFile,
		index: number,
		totalFiles: number,
		isFiltered: boolean,
	) {
		const fileItem = container.createEl("div", {
			cls: `export-file-item${isFiltered ? " filtered" : ""}`,
		});
		fileItem.style.padding = UI_CONSTANTS.SPACING.SMALL_PADDING + " 0";
		fileItem.style.borderBottom =
			index < totalFiles - 1
				? `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER_HOVER}`
				: "none";
		fileItem.style.display = "flex";
		fileItem.style.alignItems = "flex-start";
		fileItem.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		fileItem.style.minHeight = UI_CONSTANTS.MODAL.FILE_ITEM_MIN_HEIGHT;
		if (isFiltered) fileItem.style.opacity = "0.6";

		// Create checkbox
		const checkbox = fileItem.createEl("input", { type: "checkbox" });
		checkbox.checked = !isFiltered; // Default to selected for non-filtered files
		checkbox.disabled = isFiltered;
		checkbox.style.margin = "0";
		checkbox.style.marginTop = "2px";
		if (!isFiltered) this.fileCheckboxes.set(file.path, checkbox);

		const fileContent = fileItem.createEl("div", {
			cls: "export-file-content",
		});
		fileContent.style.flex = "1";
		fileContent.style.display = "flex";
		fileContent.style.flexDirection = "column";
		fileContent.style.justifyContent = "space-between";
		fileContent.style.minHeight =
			UI_CONSTANTS.MODAL.FILE_CONTENT_MIN_HEIGHT;

		const fileHeader = fileContent.createEl("div", {
			cls: "export-file-header",
		});
		fileHeader.style.display = "flex";
		fileHeader.style.alignItems = "center";
		fileHeader.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		fileHeader.style.justifyContent = "space-between";

		const leftHeader = fileHeader.createEl("div");
		leftHeader.style.display = "flex";
		leftHeader.style.alignItems = "center";
		leftHeader.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		const icon = leftHeader.createEl("span", { cls: "export-file-icon" });
		icon.textContent = file.extension === "md" ? "📄" : "📄";
		const fileName = leftHeader.createEl("span", {
			cls: "export-file-name",
		});
		fileName.textContent = file.name;
		fileName.style.fontFamily = "monospace";

		// Tags container (right side)
		const tagsContainer = fileHeader.createEl("div", {
			cls: "export-file-tags",
		});
		tagsContainer.style.display = "flex";
		tagsContainer.style.flexWrap = "wrap";
		tagsContainer.style.alignItems = "center";
		tagsContainer.style.justifyContent = "flex-end";
		tagsContainer.style.gap = "4px";
		tagsContainer.style.marginLeft = "auto";

		const tags = FileUtils.getFileTags(file, this.plugin.app);
		if (tags.length > 0) {
			tags.forEach((tag) => {
				const tagElement = tagsContainer.createEl("span", {
					cls: "export-file-tag",
				});
				tagElement.textContent = tag;
				tagElement.style.display = "inline-block";
				tagElement.style.backgroundColor =
					UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER;
				tagElement.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
				tagElement.style.padding = "1px 4px";
				tagElement.style.margin = "0 2px 2px 0";
				tagElement.style.borderRadius = "8px";
				tagElement.style.fontSize = UI_CONSTANTS.FONT_SIZES.TAGS;
				tagElement.style.fontFamily = "monospace";
			});
		}

		// Add leftHeader and tagsContainer to fileHeader
		fileHeader.appendChild(leftHeader);
		fileHeader.appendChild(tagsContainer);

		const filePath = fileContent.createEl("div", {
			cls: "export-file-path",
		});
		filePath.textContent = file.path;
		filePath.style.fontSize = UI_CONSTANTS.FONT_SIZES.FILE_PATH;
		filePath.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
		filePath.style.marginLeft = "20px";
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
			em.textContent = "Filtered out files (not exportable):";
			separator.appendChild(em);
			separator.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
			separator.style.fontSize = UI_CONSTANTS.FONT_SIZES.IGNORE_TITLE;
		}
	}

	private renderFilteredFiles(container: HTMLElement) {
		const sortedFilteredFiles = FileUtils.sortFiles(
			Array.from(this.filteredFiles.values()).map((f) => f.file),
		);

		sortedFilteredFiles.forEach((file, index) => {
			const filteredItem = this.filteredFiles.get(file.path);
			if (filteredItem) {
				this.createFilteredFileItem(
					container,
					filteredItem,
					index,
					sortedFilteredFiles.length,
				);
			}
		});
	}

	private createFilteredFileItem(
		container: HTMLElement,
		filteredItem: FilteredFile,
		index: number,
		totalFiles: number,
	) {
		const fileItem = container.createEl("div", {
			cls: "export-file-item filtered",
		});
		fileItem.style.padding = UI_CONSTANTS.SPACING.SMALL_PADDING + " 0";
		fileItem.style.borderBottom =
			index < totalFiles - 1
				? `1px solid ${UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER_HOVER}`
				: "none";
		fileItem.style.display = "flex";
		fileItem.style.alignItems = "flex-start";
		fileItem.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;
		fileItem.style.minHeight = UI_CONSTANTS.MODAL.FILE_ITEM_MIN_HEIGHT;
		fileItem.style.opacity = "0.6";

		// Create disabled checkbox
		const checkbox = fileItem.createEl("input", { type: "checkbox" });
		checkbox.checked = false;
		checkbox.disabled = true;
		checkbox.style.margin = "0";
		checkbox.style.marginTop = "2px";

		const fileContent = fileItem.createEl("div", {
			cls: "export-file-content",
		});
		fileContent.style.flex = "1";
		fileContent.style.display = "flex";
		fileContent.style.flexDirection = "column";
		fileContent.style.justifyContent = "space-between";
		fileContent.style.minHeight =
			UI_CONSTANTS.MODAL.FILE_CONTENT_MIN_HEIGHT;

		const fileHeader = fileContent.createEl("div", {
			cls: "export-file-header",
		});
		fileHeader.style.display = "flex";
		fileHeader.style.alignItems = "center";
		fileHeader.style.gap = UI_CONSTANTS.SPACING.SMALL_GAP;

		const icon = fileHeader.createEl("span", { cls: "export-file-icon" });
		icon.textContent = filteredItem.file.extension === "md" ? "📄" : "📄";

		const fileName = fileHeader.createEl("span", {
			cls: "export-file-name",
		});
		fileName.textContent = filteredItem.file.name;
		fileName.style.fontFamily = "monospace";

		const filePath = fileContent.createEl("div", {
			cls: "export-file-path",
		});
		filePath.textContent = filteredItem.file.path;
		filePath.style.fontSize = UI_CONSTANTS.FONT_SIZES.FILE_PATH;
		filePath.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
		filePath.style.marginLeft = "20px";

		// Add filter reason
		const filterReason = fileContent.createEl("div", {
			cls: "export-file-filter-reason",
		});
		filterReason.textContent = `🚫 ${filteredItem.reason}`;
		filterReason.style.fontSize = UI_CONSTANTS.FONT_SIZES.FILTER_REASON;
		filterReason.style.color = UI_CONSTANTS.COLORS.TEXT_ERROR;
		filterReason.style.marginLeft = "20px";
		filterReason.style.marginTop = "2px";
		filterReason.style.fontStyle = "italic";

		// Add tags display - always create container for consistent spacing
		const tagsContainer = fileContent.createEl("div", {
			cls: "export-file-tags",
		});
		tagsContainer.style.marginLeft = "20px";
		tagsContainer.style.minHeight =
			UI_CONSTANTS.MODAL.TAGS_CONTAINER_MIN_HEIGHT;
		tagsContainer.style.display = "flex";
		tagsContainer.style.flexWrap = "wrap";
		tagsContainer.style.alignItems = "center";

		const tags = FileUtils.getFileTags(filteredItem.file, this.plugin.app);
		if (tags.length > 0) {
			tags.forEach((tag) => {
				const tagElement = tagsContainer.createEl("span", {
					cls: "export-file-tag",
				});
				tagElement.textContent = tag;
				tagElement.style.display = "inline-block";
				tagElement.style.backgroundColor =
					UI_CONSTANTS.COLORS.BACKGROUND_MODIFIER_BORDER;
				tagElement.style.color = UI_CONSTANTS.COLORS.TEXT_MUTED;
				tagElement.style.padding = "1px 4px";
				tagElement.style.margin = "0 2px 2px 0";
				tagElement.style.borderRadius = "8px";
				tagElement.style.fontSize = UI_CONSTANTS.FONT_SIZES.TAGS;
				tagElement.style.fontFamily = "monospace";
			});
		}
	}

	private updateSourceInfo() {
		const sourceInfo = this.contentEl.querySelector(".export-source-info");
		if (sourceInfo) {
			const totalFiles =
				this.filesToExport.size + this.filteredFiles.size;
			sourceInfo.empty();
			// Source
			const strongSource = document.createElement("strong");
			strongSource.textContent = "Source:";
			sourceInfo.appendChild(strongSource);
			sourceInfo.appendChild(
				document.createTextNode(` ${this.sourceFile.path}`),
			);
			sourceInfo.appendChild(document.createElement("br"));

			// Stats in one line
			const statsLine = document.createElement("div");
			statsLine.style.display = "flex";
			statsLine.style.gap = "24px";
			statsLine.style.alignItems = "center";
			statsLine.style.marginTop = "4px";

			const filesExport = document.createElement("span");
			filesExport.innerHTML = `<strong>Files to export:</strong> ${this.filesToExport.size}`;
			statsLine.appendChild(filesExport);

			const filtered = document.createElement("span");
			filtered.innerHTML = `<strong>Filtered out:</strong> ${this.filteredFiles.size}`;
			statsLine.appendChild(filtered);

			const total = document.createElement("span");
			total.innerHTML = `<strong>Total:</strong> ${totalFiles}`;
			statsLine.appendChild(total);

			sourceInfo.appendChild(statsLine);
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

		const processFile = async (f: TFile, level = 0) => {
			if (visited.has(f.path) || level > this.currentLinkDepth) return;

			visited.add(f.path);

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

			if (f.extension !== "md") return;

			const content = await this.plugin.app.vault.read(f);
			const linkedPaths = FileUtils.getLinkedPaths(content);

			for (const p of linkedPaths) {
				const linked =
					this.plugin.app.metadataCache.getFirstLinkpathDest(
						p,
						f.path,
					);
				if (linked) await processFile(linked, level + 1);
			}
		};

		await processFile(this.sourceFile, 0);

		// Update the filesToExport map
		this.filesToExport = allFilesToCopy;

		// Refresh the file list display
		this.refreshFileList();
	}

	private refreshFileList() {
		const fileListContainer = this.contentEl.querySelector(
			".export-file-list",
		) as HTMLElement;
		if (!fileListContainer) return;

		const fileListItems = fileListContainer.querySelector(
			".export-file-list-items",
		) as HTMLElement;
		if (!fileListItems) return;

		fileListItems.empty();
		this.renderFileList(fileListItems);
	}
}
