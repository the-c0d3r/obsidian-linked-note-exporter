import { TFile } from "obsidian";
import { FileUtils } from "../../utils/file-utils";

export interface ExportSettingsContext {
    plugin: any;
    contentEl: HTMLElement;
    currentLinkDepth: number;
    defaultZipSetting: boolean;
    defaultkeepFolderStructureSetting: boolean;
    defaultUseHeaderHierarchy: boolean;
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
    public ignoreFoldersInput: HTMLInputElement;
    public ignoreTagsInput: HTMLInputElement;
    public linkDepthSlider: HTMLInputElement;
    public headerMap: Map<string, string[][]> = new Map();

    private context: ExportSettingsContext;

    constructor(context: ExportSettingsContext) {
        this.context = context;
    }

    render(container: HTMLElement) {
        const section = container.createEl("div", { cls: "collapsible-section" });

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
                icon.style.transform = "rotate(0deg)";
            } else {
                icon.textContent = "▶";
            }
        });
    }

    private createLinkDepthControl(container: HTMLElement) {
        const item = container.createEl("div", { cls: "setting-item" });

        const info = item.createEl("div", { cls: "setting-info" });
        info.createEl("span", { cls: "setting-label", text: "Linked Notes Depth" });
        info.createEl("span", { cls: "setting-desc", text: "Includes notes linked by this note" });

        const rangeContainer = item.createEl("div", { cls: "range-container" });

        this.linkDepthSlider = rangeContainer.createEl("input", { type: "range" });
        this.linkDepthSlider.min = "0";
        this.linkDepthSlider.max = "5";
        this.linkDepthSlider.step = "1";
        this.linkDepthSlider.value = this.context.currentLinkDepth.toString();

        const linkDepthValue = rangeContainer.createEl("span");
        linkDepthValue.textContent = this.context.currentLinkDepth.toString();

        this.linkDepthSlider.oninput = async (e) => {
            const newDepth = parseInt((e.target as HTMLInputElement).value);
            linkDepthValue.textContent = newDepth.toString();

            if (newDepth !== this.context.currentLinkDepth) {
                this.context.currentLinkDepth = newDepth;
                await this.context.recalculateFiles();
                const fileListContainer = this.context.contentEl.querySelector(".export-file-list") as HTMLElement;
                if (fileListContainer) {
                    fileListContainer.empty();
                    this.context.renderFileList(fileListContainer);
                }
            }
        };
    }

    private createIgnoreSettings(container: HTMLElement) {
        const item = container.createEl("div", { cls: "setting-item", attr: { style: "align-items: flex-start; flex-direction: column; gap: 8px;" } });

        const info = item.createEl("div", { cls: "setting-info" });
        info.createEl("span", { cls: "setting-label", text: "Skip Content" });

        const inputsRow = item.createEl("div", { attr: { style: "display: flex; gap: 10px; width: 100%;" } });

        this.ignoreFoldersInput = inputsRow.createEl("input", { type: "text" });
        this.ignoreFoldersInput.placeholder = "Folders (e.g. Templates)";
        this.ignoreFoldersInput.value = this.context.plugin.settings.ignoreFolders.join(", ");
        this.ignoreFoldersInput.style.flex = "1";

        this.ignoreTagsInput = inputsRow.createEl("input", { type: "text" });
        this.ignoreTagsInput.placeholder = "Tags (e.g. #private)";
        this.ignoreTagsInput.value = this.context.plugin.settings.ignoreTags.join(", ");
        this.ignoreTagsInput.style.flex = "1";

        const handleInput = async () => {
            await this.context.recalculateFiles();
            const fileListContainer = this.context.contentEl.querySelector(".export-file-list") as HTMLElement;
            if (fileListContainer) {
                fileListContainer.empty();
                this.context.renderFileList(fileListContainer);
            }
        };

        this.ignoreFoldersInput.addEventListener("input", handleInput);
        this.ignoreTagsInput.addEventListener("input", handleInput);
    }

    private createToggleButtons(container: HTMLElement) {
        const grid = container.createEl("div", { attr: { style: "display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 5px;" } });

        const createToggleItem = (label: string, title: string, defaultChecked: boolean) => {
            const item = grid.createEl("div", { cls: "setting-item" });
            item.createEl("span", { cls: "setting-label", text: label }).title = title;

            const toggleWrapper = item.createEl("div", { cls: "toggle-switch" });
            if (defaultChecked) toggleWrapper.addClass("active");
            toggleWrapper.createEl("div", { cls: "toggle-knob" });

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

        this.zipToggle = createToggleItem("Create ZIP", "Compress all exported files into export.zip", this.context.defaultZipSetting);
        this.keepFolderStructureToggle = createToggleItem("Maintain Folders", "Preserve the original folder hierarchy in the export", this.context.defaultkeepFolderStructureSetting);
        this.useHeaderHierarchyToggle = createToggleItem("Header Groups", "Organize exported files by the header structure in the source note", this.context.defaultUseHeaderHierarchy);

        this.keepFolderStructureToggle.addEventListener("change", () => {
            if (this.keepFolderStructureToggle.checked && this.useHeaderHierarchyToggle.checked) {
                const wrapper = this.useHeaderHierarchyToggle.parentElement;
                if (wrapper) wrapper.click();
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
                    this.context.sourceFile,
                    this.context.plugin.app,
                    Array.from(this.context.filesToExport.values()),
                    this.context.parentMap,
                    this.context.depthMap,
                );
            } else {
                this.headerMap = new Map();
            }
        });
    }

    public get currentLinkDepth(): number {
        return this.context.currentLinkDepth;
    }

    public set currentLinkDepth(value: number) {
        this.context.currentLinkDepth = value;
    }
}
