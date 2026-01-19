// Import Obsidian types first
import type {
	TFile,
	App,
	Plugin,
	Notice,
	Menu,
	PluginSettingTab,
	Setting,
	Modal,
} from "obsidian";

// Re-export Obsidian types for convenience
export type {
	TFile,
	App,
	Plugin,
	Notice,
	Menu,
	PluginSettingTab,
	Setting,
	Modal,
};

// Plugin Settings Interface
export interface ExportPluginSettings {
	linkDepth: number;
	zipOutput: boolean;
	keepFolderStructure: boolean; // Whether to maintain directory structure in exports (both ZIP and regular)
	useHeaderHierarchy: boolean; // Whether to organize files by header structure in source note
	ignoreFolders: string[]; // e.g. ["Templates", "Archive"]
	ignoreTags: string[]; // e.g. ["#draft", "#private"]
}

// Export Modal Result Interface
export interface ExportModalResult {
	confirmed: boolean; // Whether the user confirmed the export action
	createZip: boolean; // Whether to export files as a ZIP archive
	keepFolderStructure: boolean; // Whether to keep directory structure in exports (both ZIP and regular)
	useHeaderHierarchy: boolean; // Whether to organize files by header structure in source note
	headerMap: Map<string, string[][]>; // Map of file paths to their header hierarchy paths
	selectedFiles: TFile[]; // The list of files selected for export
	linkDepth: number; // The link depth chosen by the user for linked file traversal
	ignoreFolders: string[]; // Folder names to exclude from export (user input)
	ignoreTags: string[]; // Tag patterns to exclude files from export (user input)
	targetDir?: FileSystemDirectoryHandle; // Directory selected for export (must be picked in user gesture context)
}

// Filtered File Interface
export interface FilteredFile {
	file: TFile;
	reason: string;
}

// Add missing type declarations for File System Access API
declare global {
	interface Window {
		showDirectoryPicker(
			options?: DirectoryPickerOptions,
		): Promise<FileSystemDirectoryHandle>;
	}
}

interface DirectoryPickerOptions {
	mode?: "read" | "readwrite";
}
