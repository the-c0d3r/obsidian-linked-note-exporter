import { ExportPluginSettings } from "../types";

export const DEFAULT_SETTINGS: ExportPluginSettings = {
	linkDepth: 1,
	zipOutput: false,
	keepFolderStructure: false,
	ignoreFolders: [],
	ignoreTags: [],
};

export const UI_CONSTANTS = {
	MODAL: {
		MAX_FILE_LIST_HEIGHT: "300px",
		FILE_ITEM_MIN_HEIGHT: "32px", // was 60px
		FILE_CONTENT_MIN_HEIGHT: "24px", // was 56px
		TAGS_CONTAINER_MIN_HEIGHT: "14px", // was 20px
	},
	SPACING: {
		DEFAULT_PADDING: "4px", // was 8px
		DEFAULT_MARGIN: "8px", // was 15px
		SMALL_PADDING: "2px", // was 4px
		SMALL_MARGIN: "4px", // was 8px
		SMALL_GAP: "3px", // was 6px
		DEFAULT_GAP: "4px", // was 8px
	},
	COLORS: {
		BACKGROUND_SECONDARY: "var(--background-secondary)",
		BACKGROUND_PRIMARY: "var(--background-primary)",
		BACKGROUND_MODIFIER_BORDER: "var(--background-modifier-border)",
		BACKGROUND_MODIFIER_BORDER_HOVER:
			"var(--background-modifier-border-hover)",
		TEXT_MUTED: "var(--text-muted)",
		TEXT_ERROR: "var(--text-error)",
		COLOR_ACCENT: "var(--color-accent)",
	},
	FONT_SIZES: {
		HEADER: "1.1em", // was 1.2em
		CONFIG_TITLE: "0.95em", // was 1em
		IGNORE_TITLE: "0.85em", // was 0.9em
		SOURCE_INFO: "0.85em", // was 0.9em
		LABELS: "0.8em", // was 0.85em
		FILE_PATH: "0.7em", // was 0.75em
		FILTER_REASON: "0.7em", // was 0.75em
		TAGS: "0.6em", // was 0.65em
	},
};
