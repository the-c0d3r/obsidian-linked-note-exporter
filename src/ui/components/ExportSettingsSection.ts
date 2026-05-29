import { TFile } from "obsidian";
import { HeaderHierarchy } from "../../utils/header-hierarchy";
import ExportPlugin from "../../ExportPlugin";

export interface ExportSettingsContext {
	plugin: ExportPlugin;
	contentEl: HTMLElement;
	currentLinkDepth: number;
	defaultZipSetting: boolean;
	defaultkeepFolderStructureSetting: boolean;
	defaultUseHeaderHierarchy: boolean;
	defaultIncludeBacklinks: boolean;
	filesToExport: Map<string, TFile>;
	parentMap: Map<string, Set<string>>;
	depthMap: Map<string, number>;
	sourceFile: TFile;
	recalculateFiles: () => Promise<void>;
	renderFileList: (container: HTMLElement) => void;
}

export class ExportSettingsSection {
	public zipToggle: HTMLInputElement;
	public keepFolderStructureToggle: HTMLInputElement;
	public useHeaderHierarchyToggle: HTMLInputElement;
	public includeBacklinksToggle: HTMLInputElement;
	public ignoreFoldersInput: HTMLInputElement;
	public ignoreTagsInput: HTMLInputElement;
	public linkDepthSlider: HTMLInputElement;
	public headerMap: Map<string, string[][]> = new Map();

	private context: ExportSettingsContext;

	constructor(context: ExportSettingsContext) {
		this.context = context;
	}

	render(container: HTMLElement) {
		const section = container.createDiv({ cls: "collapsible-section" });

		// --- Header ---
		const header = section.createDiv({ cls: "collapsible-header" });
		const icon = header.createSpan({ cls: "collapsible-icon", text: "▶" });
		header.createSpan({ text: "Configure Export" });

		// --- Content ---
		const content = section.createDiv({
			cls: "collapsible-content",
			attr: { id: "settings-content" },
		});
		const settingsGroup = content.createEl("div", {
			cls: "settings-group settings-group-layout",
		});

		this.createLinkDepthControl(settingsGroup);
		this.createIgnoreSettings(settingsGroup);
		this.createToggleButtons(settingsGroup);

		// --- Toggle behavior ---
		header.addEventListener("click", () => {
			content.toggleClass("open", !content.hasClass("open"));
			if (content.hasClass("open")) {
				icon.textContent = "▼";
				icon.addClass("collapsible-icon-open");
			} else {
				icon.textContent = "▶";
				icon.removeClass("collapsible-icon-open");
			}
		});
	}

	private createLinkDepthControl(container: HTMLElement) {
		const item = container.createDiv({ cls: "setting-item" });

		const info = item.createDiv({ cls: "setting-info" });
		info.createSpan({ cls: "setting-label", text: "Linked Notes Depth" });
		info.createSpan({ cls: "setting-desc", text: "Includes notes linked by this note" });

		const rangeContainer = item.createDiv({ cls: "range-container" });

		this.linkDepthSlider = rangeContainer.createEl("input", {
			type: "range",
		});
		this.linkDepthSlider.min = "0";
		this.linkDepthSlider.max = "5";
		this.linkDepthSlider.step = "1";
		this.linkDepthSlider.value = this.context.currentLinkDepth.toString();

		const linkDepthValue = rangeContainer.createEl("span");
		linkDepthValue.textContent = this.context.currentLinkDepth.toString();

		this.linkDepthSlider.oninput = (e) => {
			const newDepth = parseInt((e.target as HTMLInputElement).value);
			linkDepthValue.textContent = newDepth.toString();

			if (newDepth !== this.context.currentLinkDepth) {
				this.context.currentLinkDepth = newDepth;
				void this.context.recalculateFiles().then(() => {
					const fileListContainer = this.context.contentEl.querySelector(
						".export-file-list",
					) as HTMLElement;
					if (fileListContainer) {
						fileListContainer.empty();
						this.context.renderFileList(fileListContainer);
					}
				});
			}
		};
	}

	private createIgnoreSettings(container: HTMLElement) {
		const item = container.createDiv({ cls: "setting-item ignore-setting-item" });

		const info = item.createDiv({ cls: "setting-info" });
		info.createSpan({ cls: "setting-label", text: "Skip Content" });

		const inputsRow = item.createDiv({ cls: "ignore-inputs-row" });

		this.ignoreFoldersInput = inputsRow.createEl("input", {
			type: "text",
			cls: "ignore-input-flex",
		});
		this.ignoreFoldersInput.placeholder = "Folders (e.g. Templates)";
		this.ignoreFoldersInput.value =
			this.context.plugin.settings.ignoreFolders.join(", ");

		this.ignoreTagsInput = inputsRow.createEl("input", {
			type: "text",
			cls: "ignore-input-flex",
		});
		this.ignoreTagsInput.placeholder = "Tags (e.g. #private)";
		this.ignoreTagsInput.value =
			this.context.plugin.settings.ignoreTags.join(", ");

		const handleInput = () => {
			void this.context.recalculateFiles().then(() => {
				const fileListContainer = this.context.contentEl.querySelector(
					".export-file-list",
				) as HTMLElement;
				if (fileListContainer) {
					fileListContainer.empty();
					this.context.renderFileList(fileListContainer);
				}
			});
		};

		this.ignoreFoldersInput.addEventListener("input", handleInput);
		this.ignoreTagsInput.addEventListener("input", handleInput);
	}

	private createToggleButtons(container: HTMLElement) {
		const grid = container.createEl("div", { cls: "toggle-grid" });

		const createToggleItem = (
			label: string,
			title: string,
			defaultChecked: boolean,
		) => {
			const item = grid.createDiv({ cls: "setting-item" });
			item.createSpan({ cls: "setting-label", text: label }).title = title;

			const toggleWrapper = item.createDiv({ cls: "toggle-switch" });
			if (defaultChecked) toggleWrapper.addClass("active");
			toggleWrapper.createEl("div", { cls: "toggle-knob" });

			const input = toggleWrapper.createEl("input", {
				type: "checkbox",
				cls: "toggle-switch-input",
			});
			input.checked = defaultChecked;

			toggleWrapper.addEventListener("click", () => {
				input.checked = !input.checked;
				toggleWrapper.toggleClass("active", input.checked);
				input.dispatchEvent(new Event("change"));
			});

			return input;
		};

		this.zipToggle = createToggleItem(
			"Create ZIP",
			"Compress all exported files into export.zip",
			this.context.defaultZipSetting,
		);
		this.keepFolderStructureToggle = createToggleItem(
			"Maintain Folders",
			"Preserve the original folder hierarchy in the export",
			this.context.defaultkeepFolderStructureSetting,
		);
		this.useHeaderHierarchyToggle = createToggleItem(
			"Header Groups",
			"Organize exported files by the header structure in the source note",
			this.context.defaultUseHeaderHierarchy,
		);
		this.includeBacklinksToggle = createToggleItem(
			"Backlinks ↩️",
			"Include notes that link TO this note (1 level)",
			this.context.defaultIncludeBacklinks,
		);

		this.keepFolderStructureToggle.addEventListener("change", () => {
			if (
				this.keepFolderStructureToggle.checked &&
				this.useHeaderHierarchyToggle.checked
			) {
				const wrapper = this.useHeaderHierarchyToggle.parentElement;
				if (wrapper) wrapper.click();
				this.headerMap = new Map();
			}
		});

		this.useHeaderHierarchyToggle.addEventListener("change", () => {
			if (this.useHeaderHierarchyToggle.checked) {
				if (this.keepFolderStructureToggle.checked) {
					const wrapper =
						this.keepFolderStructureToggle.parentElement;
					if (wrapper) wrapper.click();
				}

				void HeaderHierarchy.buildHeaderHierarchyAsync(
					this.context.sourceFile,
					this.context.plugin.app,
					Array.from(this.context.filesToExport.values()),
					this.context.parentMap,
					this.context.depthMap,
				).then((headerMap) => {
					this.headerMap = headerMap;
				});
			} else {
				this.headerMap = new Map();
			}
		});

		// Recalculate files when backlinks toggle changes
		this.includeBacklinksToggle.addEventListener("change", () => {
			void this.context.recalculateFiles().then(() => {
				const fileListContainer = this.context.contentEl.querySelector(
					".export-file-list",
				) as HTMLElement;
				if (fileListContainer) {
					fileListContainer.empty();
					this.context.renderFileList(fileListContainer);
				}
			});
		});
	}

	public get currentLinkDepth(): number {
		return this.context.currentLinkDepth;
	}

	public set currentLinkDepth(value: number) {
		this.context.currentLinkDepth = value;
	}
}
