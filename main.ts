import {
  Plugin,
  TFile,
  Notice,
  Menu,
  PluginSettingTab,
  App,
  Setting
} from "obsidian";

import JSZip from "jszip";

// -------------------------
// Plugin Settings
// -------------------------
interface ExportPluginSettings {
  linkDepth: number;
  zipOutput: boolean;
  ignoreFolders: string[]; // e.g. ["Templates", "Archive"]
  ignoreTags: string[];    // e.g. ["#draft", "#private"]
}

const DEFAULT_SETTINGS: ExportPluginSettings = {
  linkDepth: 1,
  zipOutput: false,
  ignoreFolders: [],
  ignoreTags: []
};

// -------------------------
// Main Plugin Class
// -------------------------
export default class ExportPlugin extends Plugin {
  settings: ExportPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ExportSettingTab(this.app, this));

    this.addCommand({
      id: "linked-note-exporter",
      name: "Export Note with Linked Files",
      callback: () => this.exportCurrentNote()
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile && file.extension === "md") {
          menu.addItem(item =>
            item
              .setTitle("Export Note with Linked Files")
              .setIcon("package-plus")
              .onClick(() => this.exportNote(file))
          );
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async exportCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice("No active note.");
      return;
    }
    await this.exportNote(file);
  }

  async exportNote(file: TFile) {
    const dirHandle = await window.showDirectoryPicker();
    if (!dirHandle) {
      new Notice("Export cancelled.");
      return;
    }

    const allFilesToCopy = new Map<string, TFile>();
    const visited = new Set<string>();

    const processFile = async (f: TFile, level = 0) => {
      if (visited.has(f.path) || level > this.settings.linkDepth) return;
      if (this.shouldExcludeFile(f)) return; // Skip excluded

      visited.add(f.path);
      allFilesToCopy.set(f.path, f);

      if (f.extension !== "md") return;

      const content = await this.app.vault.read(f);
      const linkedPaths = this.getLinkedPaths(content);

      for (const p of linkedPaths) {
        const linked = this.app.metadataCache.getFirstLinkpathDest(p, f.path);
        if (linked) await processFile(linked, level + 1);
      }
    };

    await processFile(file, 0);

    // Write files
    for (const [, fileObj] of allFilesToCopy) {
      const targetFile = await dirHandle.getFileHandle(fileObj.name, { create: true });
      const writable = await targetFile.createWritable();

      if (fileObj.extension === "md") {
        let content = await this.app.vault.read(fileObj);
        content = this.rewriteLinks(content);
        const encoded = new TextEncoder().encode(content);
        await writable.write(encoded);
      } else {
        const bin = await this.app.vault.readBinary(fileObj);
        await writable.write(bin);
      }

      await writable.close();
    }

    if (this.settings.zipOutput) {
      await this.zipDirectory(dirHandle);
    }

    new Notice(`Exported ${allFilesToCopy.size} files${this.settings.zipOutput ? " (zipped)" : ""}.`);
  }

  getLinkedPaths(content: string): string[] {
    const links = new Set<string>();

    const mdLinks = content.match(/\[\[([^\]]+?)\]\]/g) || [];
    const embeds = content.match(/!\[\[([^\]]+?)\]\]/g) || [];

    [...mdLinks, ...embeds].forEach(link => {
      const clean = link.replace(/!\[\[|\[\[|\]\]/g, "").split("|")[0];
      links.add(clean);
    });

    return Array.from(links);
  }

  rewriteLinks(content: string): string {
    return content.replace(/\[\[([^\]]+?)(\|.*?)?\]\]/g, (match, path, alias) => {
      let name = path;
      if (!name.endsWith(".md")) name += ".md";
      return `[[${name}${alias || ""}]]`;
    });
  }

  matchesIgnore(tag: string, ignoreList: string[]): boolean {
    for (const pattern of ignoreList) {
      // if the pattern ends with "/*", e.g. "#personal/*", also ignore "#personal"
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2); // remove /*
        if (tag.startsWith(prefix + "/")) return true;
      } else {
        if (tag === pattern) return true;
      }
    }
    return false;
  }

  matchesIgnoreTags(tags: string[], ignoreList: string[]): boolean {
    return tags.some(tag => this.matchesIgnore(tag, ignoreList));
  }

  shouldExcludeFile(file: TFile): boolean {
    // Ignore by folder
    if (this.settings.ignoreFolders.some(folder =>
      file.path.startsWith(folder + "/")
    )) return true;

    // Ignore by tag
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return false;

    let frontmatterTags: string[] = [];
    const rawTags = cache.frontmatter?.tags;

    // Normalize to array of strings
    if (Array.isArray(rawTags)) {
      frontmatterTags = rawTags.map(String);
    } else if (typeof rawTags === "string") {
      frontmatterTags = [rawTags];
    }

    // Normalize tags to #tag format
    frontmatterTags = frontmatterTags.map(tag =>
      tag.startsWith("#") ? tag : `#${tag}`
    );

    // Check inline tags
    const inlineTags = (cache.tags ?? []).map(t => t.tag);
    const allTags = [...frontmatterTags, ...inlineTags];

    // Check exclusion
    if (allTags.some(tag => this.matchesIgnore(tag, this.settings.ignoreTags))) {
      return true;
    }

    return false;
  }

  async zipDirectory(dirHandle: FileSystemDirectoryHandle) {
    const zip = new JSZip();

    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        const content = await file.arrayBuffer();
        zip.file(file.name, content);
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });

    const zipHandle = await dirHandle.getFileHandle("export.zip", { create: true });
    const writable = await zipHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}

// -------------------------
// Settings UI
// -------------------------
class ExportSettingTab extends PluginSettingTab {
  plugin: ExportPlugin;

  constructor(app: App, plugin: ExportPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Linked Note Exporter Settings" });

    new Setting(containerEl)
      .setName("Link Depth")
      .setDesc("How many levels of linked notes to include")
      .addSlider(slider =>
        slider
          .setLimits(0, 10, 1)
          .setValue(this.plugin.settings.linkDepth)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.linkDepth = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Zip Export")
      .setDesc("Whether to zip the exported files into export.zip")
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.zipOutput)
          .onChange(async (val) => {
            this.plugin.settings.zipOutput = val;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Ignore Folder Paths")
      .setDesc("Comma-separated folder names to exclude from export")
      .addText(text => text
        .setPlaceholder("e.g. Templates, Archive")
        .setValue(this.plugin.settings.ignoreFolders.join(","))
        .onChange(async (value) => {
          this.plugin.settings.ignoreFolders = value.split(",").map(s => s.trim()).filter(Boolean);
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Ignore Tags")
      .setDesc("Comma-separated tags to exclude linked files")
      .addText(text => text
        .setPlaceholder("e.g. #people/*, #personal")
        .setValue(this.plugin.settings.ignoreTags.join(","))
        .onChange(async (value) => {
          this.plugin.settings.ignoreTags = value.split(",").map(s => s.trim()).filter(Boolean);
          await this.plugin.saveSettings();
        }));
  }
}

