import { TFile } from "obsidian";

export class FileUtils {
	/**
	 * Extract linked file paths from markdown content
	 */
	static getLinkedPaths(content: string): string[] {
		const links = new Set<string>();

		const mdLinks = content.match(/\[\[([^\]]+?)\]\]/g) || [];
		const embeds = content.match(/!\[\[([^\]]+?)\]\]/g) || [];

		[...mdLinks, ...embeds].forEach((link) => {
			const clean = link.replace(/!\[\[|\[\[|\]\]/g, "");
			// For PDF files with fragment identifiers, extract only the filename before #
			if (clean.toLowerCase().includes(".pdf") && clean.includes("#")) {
				// Extract filename before the # symbol
				const fileName = clean.split("#")[0];
				links.add(fileName);
			} else {
				// Regular case - no fragment or not PDF
				const fileName = clean.split("|")[0];
				links.add(fileName);
			}
		});

		return Array.from(links);
	}

	/**
	 * Rewrite markdown links to ensure they have .md extension
	 */
	static rewriteLinks(content: string): string {
		return content.replace(
			/\[\[([^\]]+?)(\|.*?)?\]\]/g,
			(match, path, alias) => {
				let name = path;
				if (!name.endsWith(".md")) name += ".md";
				return `[[${name}${alias || ""}]]`;
			},
		);
	}

	/**
	 * Check if a tag matches an ignore pattern
	 */
	static matchesIgnore(tag: string, ignoreList: string[]): boolean {
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

	/**
	 * Check if any tags match ignore patterns
	 */
	static matchesIgnoreTags(tags: string[], ignoreList: string[]): boolean {
		return tags.some((tag) => this.matchesIgnore(tag, ignoreList));
	}

	/**
	 * Get all tags from a file (frontmatter + inline)
	 */
	static getFileTags(file: TFile, app: any): string[] {
		const cache = app.metadataCache.getFileCache(file);
		if (!cache) return [];

		let frontmatterTags: string[] = [];
		const rawTags = cache.frontmatter?.tags;

		// Normalize to array of strings
		if (Array.isArray(rawTags)) {
			frontmatterTags = rawTags.map(String);
		} else if (typeof rawTags === "string") {
			frontmatterTags = [rawTags];
		}

		// Normalize tags to #tag format
		frontmatterTags = frontmatterTags.map((tag) =>
			tag.startsWith("#") ? tag : `#${tag}`,
		);

		// Get inline tags
		const inlineTags = (cache.tags ?? []).map((t: any) => t.tag);

		// Combine and return unique tags
		const allTags = [...frontmatterTags, ...inlineTags];
		return [...new Set(allTags)];
	}

	/**
	 * Check if a file should be excluded based on ignore settings
	 */
	static shouldExcludeFile(
		file: TFile,
		app: any,
		ignoreFolders: string[],
		ignoreTags: string[],
	): string | false {
		// Check folder exclusion
		for (const folder of ignoreFolders) {
			if (file.path.startsWith(folder + "/")) {
				return `Folder path matches: ${folder}`;
			}
		}

		// Check tag exclusion
		const cache = app.metadataCache.getFileCache(file);
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
		frontmatterTags = frontmatterTags.map((tag) =>
			tag.startsWith("#") ? tag : `#${tag}`,
		);

		// Check inline tags
		const inlineTags = (cache.tags ?? []).map((t: any) => t.tag);
		const allTags = [...frontmatterTags, ...inlineTags];

		// Check exclusion
		for (const tag of allTags) {
			for (const pattern of ignoreTags) {
				if (pattern.endsWith("/*")) {
					const prefix = pattern.slice(0, -2); // remove /*
					if (tag.startsWith(prefix + "/")) {
						return `Tag matches pattern: ${pattern}`;
					}
				} else {
					if (tag === pattern) {
						return `Tag matches: ${pattern}`;
					}
				}
			}
		}

		return false;
	}

	/**
	 * Sort files: markdown files first, then by name
	 */
	static sortFiles(files: TFile[]): TFile[] {
		return files.sort((a, b) => {
			if (a.extension === "md" && b.extension !== "md") return -1;
			if (a.extension !== "md" && b.extension === "md") return 1;
			return a.name.localeCompare(b.name);
		});
	}
}
