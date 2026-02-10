import { ExportPluginSettings } from "../types";

export const DEFAULT_SETTINGS: ExportPluginSettings = {
	linkDepth: 1,
	zipOutput: false,
	keepFolderStructure: false,
	useHeaderHierarchy: false,
	includeBacklinks: false,
	ignoreFolders: [],
	ignoreTags: [],
};
