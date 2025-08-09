# Source Code Structure

This directory contains the refactored source code for the Obsidian Linked Note Exporter plugin.

## Folder Structure

```
src/
├── types/           # TypeScript type definitions and interfaces
├── ui/             # User interface components
├── utils/          # Utility functions and services
├── ExportPlugin.ts # Main plugin class
└── main.ts         # Entry point that exports the main plugin
```

## Components

### Types (`types/`)

-   **`index.ts`** - Contains all TypeScript interfaces and type definitions used throughout the plugin

### UI Components (`ui/`)

-   **`ExportConfirmationModal.ts`** - The export confirmation modal with file selection and configuration
-   **`ExportSettingsTab.ts`** - Plugin settings tab for configuration

### Utilities (`utils/`)

-   **`constants.ts`** - UI constants, default settings, and configuration values
-   **`file-utils.ts`** - File processing utilities for link extraction and tag handling
-   **`export-service.ts`** - Core export logic including ZIP creation and file handling

### Main Plugin (`ExportPlugin.ts`)

-   Orchestrates all plugin functionality
-   Handles command registration and event handling
-   Manages the export workflow

## Benefits of This Structure

1. **Separation of Concerns** - Each file has a single responsibility
2. **Maintainability** - Easier to find and modify specific functionality
3. **Reusability** - Utility functions can be easily reused across components
4. **Testing** - Individual components can be tested in isolation
5. **Readability** - Smaller, focused files are easier to understand

## Import Patterns

-   Types are imported from `../types`
-   Constants are imported from `../utils/constants`
-   Utility functions are imported from `../utils/file-utils`
-   UI components are imported from `../ui/`
-   Services are imported from `../utils/export-service`
