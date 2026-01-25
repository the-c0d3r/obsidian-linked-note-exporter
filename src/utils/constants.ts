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

export const UI_CONSTANTS = {
	MODAL: {
		MAX_FILE_LIST_HEIGHT: "500px",
		FILE_ITEM_MIN_HEIGHT: "32px", // was 60px
		FILE_CONTENT_MIN_HEIGHT: "24px", // was 56px
		TAGS_CONTAINER_MIN_HEIGHT: "14px", // was 20px
	},
	SPACING: {
		DEFAULT_PADDING: "8px",
		DEFAULT_MARGIN: "15px",
		SMALL_PADDING: "4px",
		SMALL_MARGIN: "8px",
		SMALL_GAP: "6px",
		DEFAULT_GAP: "8px",
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
		HEADER: "1.2em",
		CONFIG_TITLE: "1em",
		IGNORE_TITLE: "0.9em",
		SOURCE_INFO: "0.9em",
		LABELS: "0.85em",
		FILE_PATH: "0.75em",
		FILTER_REASON: "0.75em",
		TAGS: "0.65em",
	},
};
