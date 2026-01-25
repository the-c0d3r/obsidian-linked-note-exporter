import { TFile, App } from "obsidian";
import { LinkExtractor } from "./link-extractor";

export class HeaderHierarchy {
    /**
     * Sanitize header text for use as a directory name
     * Removes markdown syntax and invalid filesystem characters
     */
    static sanitizeHeaderPath(headerPath: string[]): string {
        return headerPath
            .map((header) => {
                // Remove markdown heading syntax (# symbols)
                let clean = header.replace(/^#+\s*/, "").trim();

                // Replace invalid filesystem characters with underscore
                clean = clean.replace(/[/\\:*?"<>|]/g, "_");

                // Collapse multiple spaces/underscores
                clean = clean.replace(/[\s_]+/g, " ").trim();

                // Limit length to avoid filesystem issues
                if (clean.length > 100) {
                    clean = clean.substring(0, 100).trim();
                }

                return clean || "Untitled";
            })
            .filter((segment) => segment.length > 0)
            .join("/");
    }

    /**
     * Build a mapping of files to their header hierarchy paths
     * Returns Map<filePath, headerPaths[]> where a file can appear under multiple headers
     */
    static buildHeaderHierarchy(
        sourceFile: TFile,
        app: App,
    ): Map<string, string[][]> {
        const fileToHeaderPaths = new Map<string, string[][]>();

        // Get file content and metadata
        const cache = app.metadataCache.getFileCache(sourceFile);
        if (!cache || !cache.headings) {
            return fileToHeaderPaths;
        }

        // Read file content synchronously (we need it for link positions)
        // let content: string;
        try {
            // Use vault.read which returns a Promise, but we'll handle it async-friendly
            return fileToHeaderPaths; // Return empty for now, will implement in async version
        } catch (error) {
            console.error("Error reading file:", error);
            return fileToHeaderPaths;
        }
    }

    /**
     * Build header hierarchy synchronously using cached content
     */
    static async buildHeaderHierarchyAsync(
        sourceFile: TFile,
        app: App,
        files: TFile[],
        parentMap: Map<string, Set<string>>,
        depthMap: Map<string, number>,
    ): Promise<Map<string, string[][]>> {
        const fileToHeaderPaths = new Map<string, string[][]>();

        // Get file metadata
        const cache = app.metadataCache.getFileCache(sourceFile);
        if (!cache || !cache.headings) {
            return fileToHeaderPaths;
        }

        // Read file content
        const content = await app.vault.read(sourceFile);

        // Extract all links
        const linkMatches = LinkExtractor.extractLinksFromContent(content);

        if (linkMatches.length === 0) {
            return fileToHeaderPaths;
        }

        // Build hierarchical header context for each link
        const headings = cache.headings;
        const sourceFileName = sourceFile.basename; // Filename without extension

        for (const linkMatch of linkMatches) {
            // Find the header path for this link position
            const headerPath = this.getHeaderPathAtPosition(
                linkMatch.position,
                headings,
                sourceFileName,
            );

            // Resolve the link to a file
            const linkedFile = app.metadataCache.getFirstLinkpathDest(
                linkMatch.linkText,
                sourceFile.path,
            );

            if (linkedFile) {
                const filePath = linkedFile.path;

                if (!fileToHeaderPaths.has(filePath)) {
                    fileToHeaderPaths.set(filePath, []);
                }

                // Add this header path if it's not already present
                const existingPaths = fileToHeaderPaths.get(filePath)!;
                const headerPathStr = JSON.stringify(headerPath);

                if (
                    !existingPaths.some(
                        (p) => JSON.stringify(p) === headerPathStr,
                    )
                ) {
                    existingPaths.push(headerPath);
                }
            }
        }

        // Phase 2: Propagate header context to files at depth > 1
        // Sort files by depth to ensure parents are processed before children
        const filesByDepth = files
            .slice()
            .sort((a, b) => (depthMap.get(a.path) || 0) - (depthMap.get(b.path) || 0));

        // Process files in depth order to inherit header context from parents
        for (const file of filesByDepth) {
            // Skip if already processed (depth 1 files or source file)
            if (fileToHeaderPaths.has(file.path)) continue;

            // Get this file's parents
            const parents = parentMap.get(file.path);
            if (!parents || parents.size === 0) continue;

            // Inherit header paths from all parents
            const childHeaderPaths: string[][] = [];

            for (const parentPath of parents) {
                const parentHeaderPaths = fileToHeaderPaths.get(parentPath);

                if (parentHeaderPaths && parentHeaderPaths.length > 0) {
                    // Parent has header context → inherit it
                    childHeaderPaths.push(...parentHeaderPaths);
                } else {
                    // Parent has no header context → child goes to root
                    childHeaderPaths.push([]);
                }
            }

            if (childHeaderPaths.length > 0) {
                fileToHeaderPaths.set(file.path, childHeaderPaths);
            }
        }

        return fileToHeaderPaths;
    }

    /**
     * Get the hierarchical header path at a specific position in the file
     */
    static getHeaderPathAtPosition(
        position: number,
        headings: any[],
        sourceFileName: string,
    ): string[] {
        const path: string[] = [];

        // Find all headings before this position
        const headingsBefore = headings.filter(
            (h) => h.position.start.offset < position,
        );

        if (headingsBefore.length === 0) {
            return []; // No headers before this link
        }

        // Build hierarchical path respecting nesting
        // We track the "current" heading at each level (1-6)
        const currentHeadings: { [level: number]: string } = {};

        for (const heading of headingsBefore) {
            const level = heading.level;
            currentHeadings[level] = heading.heading;

            // Clear any deeper levels when we encounter a new heading
            for (let i = level + 1; i <= 6; i++) {
                delete currentHeadings[i];
            }
        }

        // Check if H1 matches the filename (case-insensitive, trimmed)
        // If so, skip it to avoid redundancy
        const h1Heading = currentHeadings[1];
        const skipH1 = h1Heading &&
            this.normalizeForComparison(h1Heading) ===
            this.normalizeForComparison(sourceFileName);

        // Build the path from the current headings (in order)
        const startLevel = skipH1 ? 2 : 1;
        for (let level = startLevel; level <= 6; level++) {
            if (currentHeadings[level]) {
                path.push(currentHeadings[level]);
            }
        }

        return path;
    }

    /**
     * Normalize text for comparison (lowercase, trim, remove special chars)
     */
    private static normalizeForComparison(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, "") // Remove special characters
            .replace(/\s+/g, " "); // Collapse multiple spaces
    }

    /**
     * Get export paths for a file based on header hierarchy
     * Returns array of paths (one per header the file appears under)
     */
    static getExportPathsForFile(
        file: TFile,
        headerMap: Map<string, string[][]>,
        includeSourceName: boolean,
        sourceName: string,
    ): string[] {
        const headerPaths = headerMap.get(file.path);

        if (!headerPaths || headerPaths.length === 0) {
            // No header context - place at root
            const basePath = includeSourceName ? `${sourceName}/` : "";
            return [`${basePath}${file.name}`];
        }

        // Generate a path for each header occurrence
        return headerPaths.map((headerPath) => {
            const sanitizedPath = this.sanitizeHeaderPath(headerPath);
            const basePath = includeSourceName
                ? `${sourceName}/${sanitizedPath}`
                : sanitizedPath;
            return `${basePath}/${file.name}`;
        });
    }
}
