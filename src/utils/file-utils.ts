import { TFile, App } from "obsidian";
import { LinkExtractor } from "./link-extractor";
import { FilterUtils } from "./filter-utils";
import { HeaderHierarchy } from "./header-hierarchy";

// Re-export for backward compatibility and convenience
export * from "./link-extractor";
export * from "./filter-utils";
export * from "./header-hierarchy";

export class FileUtils {
	/**
	 * Get all files that link TO the given file (backlinks)
	 * Uses Obsidian's metadataCache for efficient lookup
	 */
	static getBacklinks(file: TFile, app: App): TFile[] {
		const backlinks: TFile[] = [];

		// Get the backlinks for the file using Obsidian's resolvedLinks
		// resolvedLinks is a Map<sourcePath, Map<targetPath, count>>
		const resolvedLinks = app.metadataCache.resolvedLinks;

		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			// Check if this source file links to our target file
			if (links && links[file.path]) {
				const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFile) {
					backlinks.push(sourceFile);
				}
			}
		}

		return backlinks;
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

	// ------------------------------------------------------------------
	// Proxy methods to new modules for backward compatibility
	// ------------------------------------------------------------------

	static getLinkedPaths(content: string): string[] {
		return LinkExtractor.getLinkedPaths(content);
	}

	static extractCanvasLinks(content: string): string[] {
		return LinkExtractor.extractCanvasLinks(content);
	}

	static extractLinksFromContent(content: string): Array<{ linkText: string; position: number }> {
		return LinkExtractor.extractLinksFromContent(content);
	}

	static matchesIgnore(tag: string, ignoreList: string[]): boolean {
		return FilterUtils.matchesIgnore(tag, ignoreList);
	}

	static matchesIgnoreTags(tags: string[], ignoreList: string[]): boolean {
		return FilterUtils.matchesIgnoreTags(tags, ignoreList);
	}

	static normalizeTags(tags: string | string[] | undefined): string[] {
		return FilterUtils.normalizeTags(tags);
	}

	static getFileTags(file: TFile, app: App): string[] {
		return FilterUtils.getFileTags(file, app);
	}

	static isPathIgnored(path: string, ignoreFolders: string[]): string | false {
		return FilterUtils.isPathIgnored(path, ignoreFolders);
	}

	static shouldExcludeFile(
		file: TFile,
		app: App,
		ignoreFolders: string[],
		ignoreTags: string[],
	): string | false {
		return FilterUtils.shouldExcludeFile(file, app, ignoreFolders, ignoreTags);
	}

	static sanitizeHeaderPath(headerPath: string[]): string {
		return HeaderHierarchy.sanitizeHeaderPath(headerPath);
	}

	static buildHeaderHierarchy(
		sourceFile: TFile,
		app: App,
	): Map<string, string[][]> {
		return HeaderHierarchy.buildHeaderHierarchy(sourceFile, app);
	}

	static async buildHeaderHierarchyAsync(
		sourceFile: TFile,
		app: App,
		files: TFile[],
		parentMap: Map<string, Set<string>>,
		depthMap: Map<string, number>,
	): Promise<Map<string, string[][]>> {
		return HeaderHierarchy.buildHeaderHierarchyAsync(sourceFile, app, files, parentMap, depthMap);
	}

	static getHeaderPathAtPosition(
		position: number,
		headings: any[],
		sourceFileName: string,
	): string[] {
		return HeaderHierarchy.getHeaderPathAtPosition(position, headings, sourceFileName);
	}

	static getExportPathsForFile(
		file: TFile,
		headerMap: Map<string, string[][]>,
		includeSourceName: boolean,
		sourceName: string,
	): string[] {
		return HeaderHierarchy.getExportPathsForFile(file, headerMap, includeSourceName, sourceName);
	}
}
