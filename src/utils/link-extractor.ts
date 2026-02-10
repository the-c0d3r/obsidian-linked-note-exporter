import { TFile, App } from "obsidian";

export class LinkExtractor {
	/**
	 * Extract linked file paths from markdown content
	 */
	static getLinkedPaths(content: string): string[] {
		const links = new Set<string>();

		const mdLinks = content.match(/\[\[([^\]]+?)\]\]/g) || [];
		const embeds = content.match(/!\[\[([^\]]+?)\]\]/g) || [];

		// Match standard markdown links: [text](path) or ![text](path)
		// Also support angle bracket syntax: [text](<path>) or ![text](<path>)
		// Capture group 2 is the path (with optional angle brackets)
		const standardLinks = Array.from(
			content.matchAll(/\[([^\]]*)\]\(<?([^>)]+)>?\)/g),
		);
		const standardEmbeds = Array.from(
			content.matchAll(/!\[([^\]]*)\]\(<?([^>)]+)>?\)/g),
		);

		// Process WikiLinks
		[...mdLinks, ...embeds].forEach((link) => {
			const clean = link.replace(/!\[\[|\[\[|\]\]/g, "");
			// Extract filename: split by | for alias, then by # for anchor
			const fileName = clean.split("|")[0].split("#")[0];
			links.add(fileName);
		});

		// Process Markdown Links
		[...standardLinks, ...standardEmbeds].forEach((match) => {
			const path = match[2];
			// Ignore external links (protocol:// or mailto:)
			if (path.match(/^([a-z][a-z0-9+.-]*:\/\/|mailto:)/i)) return;

			// Decode URI (e.g. %20 -> space)
			let cleanPath = decodeURI(path);

			// Remove anchors
			cleanPath = cleanPath.split("#")[0];

			if (cleanPath) {
				links.add(cleanPath);
			}
		});

		return Array.from(links);
	}

	/**
	 * Extract linked file paths from a Canvas file content
	 */
	static extractCanvasLinks(content: string): string[] {
		const links = new Set<string>();
		try {
			const canvasData = JSON.parse(content);
			if (!canvasData.nodes || !Array.isArray(canvasData.nodes)) {
				return [];
			}

			// Define interface for minimal node structure
			interface CanvasNode {
				type: string;
				file?: string;
				text?: string;
			}

			for (const node of canvasData.nodes as CanvasNode[]) {
				if (node.type === "file" && node.file) {
					links.add(node.file);
				} else if (node.type === "text" && node.text) {
					const textLinks = this.getLinkedPaths(node.text);
					textLinks.forEach((link) => links.add(link));
				}
			}
		} catch (e) {
			console.warn("Failed to parse canvas file content", e);
		}
		return Array.from(links);
	}

	/**
	 * Extract all links with their positions (including embeds)
	 */
	static extractLinksFromContent(
		content: string,
	): Array<{ linkText: string; position: number }> {
		const linkMatches: Array<{ linkText: string; position: number }> = [];

		// WikiLinks: [[link]] or ![[link]]
		const wikiRegex = /!?\[\[([^\]]+?)\]\]/g;
		let match;
		while ((match = wikiRegex.exec(content)) !== null) {
			const linkText = match[1].split("|")[0].split("#")[0].trim();
			linkMatches.push({
				linkText,
				position: match.index,
			});
		}

		// Markdown Links: [text](path) or ![text](path)
		// Also support angle bracket syntax: [text](<path>) or ![text](<path>)
		const mdRegex = /!?\[([^\]]*)\]\(<?([^>)]+)>?\)/g;
		while ((match = mdRegex.exec(content)) !== null) {
			const path = match[2];
			// Ignore external links (protocol:// or mailto:)
			if (path.match(/^([a-z][a-z0-9+.-]*:\/\/|mailto:)/i)) continue;

			const linkText = decodeURI(path).split("#")[0];
			linkMatches.push({
				linkText,
				position: match.index,
			});
		}

		return linkMatches.sort((a, b) => a.position - b.position);
	}

	/**
	 * Get all files that link TO the given file (backlinks)
	 * Uses Obsidian's metadataCache for efficient lookup
	 */
	static getBacklinks(file: TFile, app: App): TFile[] {
		const backlinks: TFile[] = [];
		const resolvedLinks = app.metadataCache.resolvedLinks;

		for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
			if (links && links[file.path]) {
				const sourceFile = app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFile) {
					backlinks.push(sourceFile);
				}
			}
		}

		return backlinks;
	}
}
