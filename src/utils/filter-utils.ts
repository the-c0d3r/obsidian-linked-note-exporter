import { TFile, App } from "obsidian";

export class FilterUtils {
    /**
     * Check if a tag matches an ignore pattern
     */
    static matchesIgnore(tag: string, ignoreList: string[]): boolean {
        for (const pattern of ignoreList) {
            // if the pattern ends with "/*", e.g. "#personal/*", also ignore "#personal"
            if (pattern.endsWith("/*")) {
                const prefix = pattern.slice(0, -2); // remove /*
                if (tag === prefix || tag.startsWith(prefix + "/")) return true;
            } else {
                if (tag === pattern) return true;
            }
        }
        return false;
    }

    /**
     * Check if any tags match ignore patterns
     */
    static matchesIgnoreTags(tags: string[], ignoreList: string[]): boolean {
        return tags.some((tag) => this.matchesIgnore(tag, ignoreList));
    }

    /**
     * Normalize tags from various input formats to #tag array
     */
    static normalizeTags(tags: string | string[] | undefined): string[] {
        if (!tags) return [];

        let tagArray: string[] = [];

        if (Array.isArray(tags)) {
            tagArray = tags.map(String);
        } else if (typeof tags === "string") {
            tagArray = [tags];
        }

        return tagArray.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));
    }

    /**
     * Get all tags from a file (frontmatter + inline)
     */
    static getFileTags(file: TFile, app: App): string[] {
        const cache = app.metadataCache.getFileCache(file);
        if (!cache) return [];

        const frontmatterTags = this.normalizeTags(cache.frontmatter?.tags);

        // Get inline tags
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const inlineTags = (cache.tags ?? []).map((t: any) => t.tag);

        // Combine and return unique tags
        const allTags = [...frontmatterTags, ...inlineTags];
        return [...new Set(allTags)];
    }

    /**
     * Check if path matches any ignored folder patterns
     */
    static isPathIgnored(path: string, ignoreFolders: string[]): string | false {
        for (const folder of ignoreFolders) {
            if (path.startsWith(folder + "/")) {
                return `Folder path matches: ${folder}`;
            }
        }
        return false;
    }

    /**
     * Check if a file should be excluded based on ignore settings
     */
    static shouldExcludeFile(
        file: TFile,
        app: App,
        ignoreFolders: string[],
        ignoreTags: string[],
    ): string | false {
        // Check folder exclusion
        const folderIgnoreReason = this.isPathIgnored(file.path, ignoreFolders);
        if (folderIgnoreReason) return folderIgnoreReason;

        // Check tag exclusion
        const tags = this.getFileTags(file, app);

        // Check exclusion
        for (const tag of tags) {
            if (this.matchesIgnore(tag, ignoreTags)) {
                // Find which pattern matched for the return message
                const pattern = ignoreTags.find((p) => this.matchesIgnore(tag, [p]));
                return `Tag matches: ${pattern || tag}`;
            }
        }

        return false;
    }
}
