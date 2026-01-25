import { TFile, App } from "obsidian";
import { FileUtils } from "../../utils/file-utils";
import { FilteredFile } from "../../types";
import ExportPlugin from "../../ExportPlugin";

export interface FileTreeContext {
    app: App;
    plugin: ExportPlugin;
    getFilesToExport: () => Map<string, TFile>;
    getFilteredFiles: () => Map<string, FilteredFile>;
    getFileCheckboxes: () => Map<string, HTMLInputElement>;
    getChildrenMap: () => Map<string, Set<string>>;
    getBacklinksSet: () => Set<string>;
    getIgnoreFoldersInput: () => HTMLInputElement;
    getIgnoreTagsInput: () => HTMLInputElement;
    updateSelectedCount: () => void;
    updateSourceInfo: () => void;
}

export class FileTreeComponent {
    private visitedPaths = new Set<string>();

    constructor(private context: FileTreeContext) { }

    render(container: HTMLElement, sourceFile: TFile) {
        this.visitedPaths.clear();
        this.renderTreeRecursive(container, sourceFile.path, 0, [], true);
        this.context.updateSourceInfo();
    }

    private renderTreeRecursive(
        container: HTMLElement,
        filePath: string,
        depth: number,
        indentGuides: string[],
        isLastChild: boolean
    ) {
        if (this.visitedPaths.has(filePath)) return;
        this.visitedPaths.add(filePath);

        let file = this.context.getFilesToExport().get(filePath);
        let isFiltered = false;
        let filteredItem: FilteredFile | undefined;

        // If not in export list, check filtered list
        if (!file) {
            filteredItem = this.context.getFilteredFiles().get(filePath);
            if (filteredItem) {
                file = filteredItem.file;
                isFiltered = true;
            }
        }
        if (!file) return;

        this.createTreeNode(container, file, depth, indentGuides, isFiltered, isLastChild, filteredItem?.reason);

        const children = this.context.getChildrenMap().get(filePath);
        if (children && children.size > 0) {
            const sortedChildren = FileUtils.sortFiles(
                Array.from(children).map(childPath => {
                    return this.context.getFilesToExport().get(childPath) || this.context.getFilteredFiles().get(childPath)?.file;
                }).filter(Boolean) as TFile[]
            );

            // Prepare guides for children
            const childGuides = [...indentGuides];

            if (depth > 0) {
                childGuides.push(isLastChild ? "  " : "│ ");
            }

            sortedChildren.forEach((child, index) => {
                const childIsLast = index === sortedChildren.length - 1;
                this.renderTreeRecursive(container, child.path, depth + 1, childGuides, childIsLast);
            });
        }
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
            this.context.getFileCheckboxes().set(file.path, checkbox);
            // Update selected count when checkbox changes
            checkbox.addEventListener("change", () => {
                this.context.updateSelectedCount();
            });
        }

        // Icon - choose based on file extension or backlink status
        const icon = wrapper.createEl("span", { cls: "file-icon" });
        const ext = file.extension.toLowerCase();
        const isBacklink = this.context.getBacklinksSet().has(file.path);

        if (isBacklink) {
            icon.textContent = "↩️"; // Backlink indicator
        } else if (ext === "md") {
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

        // File path - highlight matching folder in red if filtered
        const pathEl = details.createEl("div", { cls: "file-path" });
        const ignoreFolders = this.context.getIgnoreFoldersInput()?.value.split(",").map(f => f.trim()).filter(f => f) || [];
        const matchingFolder = ignoreFolders.find(folder => file.path === folder || file.path.startsWith(folder + "/"));

        if (isFiltered && matchingFolder) {
            const escapedFolder = matchingFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            pathEl.innerHTML = file.path.replace(
                new RegExp(`(${escapedFolder})`, 'i'),
                '<span style="color: var(--text-error) !important; font-weight: 600;">$1</span>'
            );
        } else {
            pathEl.textContent = file.path;
        }

        // Tags - highlight matching tag in red if filtered by tag
        const tags = FileUtils.getFileTags(file, this.context.app);
        if (tags.length > 0) {
            const tagContainer = wrapper.createEl("div", { cls: "file-tags" });
            const ignoreTags = this.context.getIgnoreTagsInput()?.value.split(",").map(t => t.trim()).filter(t => t) || [];

            tags.forEach((tag) => {
                const tagEl = tagContainer.createEl("span", { cls: "tag", text: tag });
                // Use FileUtils for reliable matching (handles wildcards like /*)
                if (isFiltered && FileUtils.matchesIgnore(tag, ignoreTags)) {
                    tagEl.style.setProperty("color", "var(--text-error)", "important");
                    tagEl.style.fontWeight = "600";
                }
            });
        }
    }
}
