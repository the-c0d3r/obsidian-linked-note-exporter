import { TFile, Notice, App, Platform } from "obsidian";
import { HeaderHierarchy } from "./header-hierarchy";
import type { ExportTarget } from "../types";

type ElectronDialog = {
	showOpenDialog(options: {
		properties: string[];
	}): Promise<{ canceled: boolean; filePaths: string[] }>;
};

export class ExportService {
	private app: App;
	private directoryPickerPromise: Promise<ExportTarget | null> | null =
		null;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Export files to a selected directory
	 */
	async exportFiles(
		files: TFile[],
		target: ExportTarget,
		createZip: boolean = false,
		keepFolderStructure: boolean = false,
		useHeaderHierarchy: boolean = false,
		headerMap: Map<string, string[][]> = new Map(),
		sourceFileName: string = "",
	): Promise<void> {
		try {
			if (createZip) {
				await this.exportAsZip(
					files,
					target,
					keepFolderStructure,
					useHeaderHierarchy,
					headerMap,
					sourceFileName,
				);
			} else {
				await this.exportAsFiles(
					files,
					target,
					keepFolderStructure,
					useHeaderHierarchy,
					headerMap,
					sourceFileName,
				);
			}

			new Notice(`Successfully exported ${files.length} files!`);
		} catch (error) {
			console.error("Export failed:", error);
			new Notice(`Export failed: ${error.message}`, 5000);
		}
	}

	/**
	 * Export files individually to the target directory
	 */
	private async exportAsFiles(
		files: TFile[],
		target: ExportTarget,
		keepFolderStructure: boolean,
		useHeaderHierarchy: boolean,
		headerMap: Map<string, string[][]>,
		sourceFileName: string,
	): Promise<void> {
		// If using header hierarchy, files may be exported to multiple locations
		if (useHeaderHierarchy) {
			const exportedPaths = new Set<string>(); // Track to avoid duplicate writes

			for (const file of files) {
				const exportPaths = HeaderHierarchy.getExportPathsForFile(
					file,
					headerMap,
					true, // includeSourceName
					sourceFileName,
				);

				for (const exportPath of exportPaths) {
					// Avoid writing same file to same path twice
					if (!exportedPaths.has(exportPath)) {
						exportedPaths.add(exportPath);
						await this.exportSingleFile(
							file,
							target,
							keepFolderStructure,
							useHeaderHierarchy,
							exportPath,
						);
					}
				}
			}
		} else {
			// Original behavior
			for (const file of files) {
				await this.exportSingleFile(
					file,
					target,
					keepFolderStructure,
					useHeaderHierarchy,
					"",
				);
			}
		}
	}

	/**
	 * Export files as a ZIP archive
	 */
	private async exportAsZip(
		files: TFile[],
		target: ExportTarget,
		keepFolderStructure: boolean,
		useHeaderHierarchy: boolean,
		headerMap: Map<string, string[][]>,
		sourceFileName: string,
	): Promise<void> {
		// Dynamically import JSZip to avoid bundling issues
		const JSZip = (await import("jszip")).default;
		const zip = new JSZip();

		// Track exported paths to avoid duplicates
		const exportedPaths = new Set<string>();

		// Add all files to the ZIP
		for (const file of files) {
			let processedContent;
			if (file.extension === "md") {
				const content = await this.app.vault.read(file);
				processedContent = content;
			} else {
				processedContent = await this.app.vault.readBinary(file);
			}

			// Get the file path(s) within the ZIP
			if (useHeaderHierarchy) {
				const exportPaths = HeaderHierarchy.getExportPathsForFile(
					file,
					headerMap,
					true,
					sourceFileName,
				);

				for (const zipPath of exportPaths) {
					if (!exportedPaths.has(zipPath)) {
						exportedPaths.add(zipPath);
						zip.file(zipPath, processedContent);
					}
				}
			} else {
				const zipPath = this.getExportFilePath(
					file,
					keepFolderStructure,
				);
				zip.file(zipPath, processedContent);
			}
		}

		// Generate ZIP content
		const zipBlob = await zip.generateAsync({ type: "blob" });
		await this.writeExportFile(target, "export.zip", zipBlob);
	}

	/**
	 * Export a single file to the target directory
	 */
	private async exportSingleFile(
		file: TFile,
		target: ExportTarget,
		keepFolderStructure: boolean,
		useHeaderHierarchy: boolean,
		headerHierarchyPath: string = "",
	): Promise<void> {
		let processedContent;
		if (file.extension === "md") {
			const content = await this.app.vault.read(file);
			processedContent = content;
		} else {
			processedContent = await this.app.vault.readBinary(file);
		}

		// Create the file path within the target directory
		const targetPath =
			useHeaderHierarchy && headerHierarchyPath
				? headerHierarchyPath
				: this.getExportFilePath(file, keepFolderStructure);

		await this.writeExportFile(target, targetPath, processedContent);
	}

	/**
	 * Get the file path for export (used for both regular and ZIP exports)
	 */
	private getExportFilePath(
		file: TFile,
		keepFolderStructure: boolean,
	): string {
		return keepFolderStructure ? file.path : file.name;
	}

	/**
	 * Create a nested file structure in the target directory
	 */
	private async createNestedFile(
		targetDir: FileSystemDirectoryHandle,
		filePath: string,
	): Promise<FileSystemFileHandle> {
		const pathParts = filePath.split("/");
		const fileName = pathParts.pop()!;

		let currentDir = targetDir;

		// Create nested directories if needed
		for (const part of pathParts) {
			if (part) {
				currentDir = await currentDir.getDirectoryHandle(part, {
					create: true,
				});
			}
		}

		// Create the file
		return await currentDir.getFileHandle(fileName, { create: true });
	}

	private async writeExportFile(
		target: ExportTarget,
		filePath: string,
		content: string | ArrayBuffer | Blob,
	): Promise<void> {
		if (target.type === "local") {
			await this.writeLocalFile(target.path, filePath, content);
			return;
		}

		const targetFileHandle = await this.createNestedFile(
			target.handle,
			filePath,
		);
		const writable = await targetFileHandle.createWritable();
		await writable.write(content);
		await writable.close();
	}

	private async writeLocalFile(
		targetDirPath: string,
		filePath: string,
		content: string | ArrayBuffer | Blob,
	): Promise<void> {
		// Inline require to avoid bundling Node-only modules in the browser build
		const fs = require("fs/promises");
		const path = require("path");
		const outputPath = path.join(
			targetDirPath,
			...filePath.split("/").filter(Boolean),
		);
		await fs.mkdir(path.dirname(outputPath), { recursive: true });

		if (typeof content === "string") {
			await fs.writeFile(outputPath, content, "utf8");
			return;
		}

		if (content instanceof Blob) {
			const arrayBuffer = await content.arrayBuffer();
			await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
			return;
		}

		await fs.writeFile(outputPath, Buffer.from(content));
	}

	/**
	 * Show directory picker and return selected directory
	 */
	async showDirectoryPicker(): Promise<ExportTarget | null> {
		if (this.directoryPickerPromise) {
			return this.directoryPickerPromise;
		}

		this.directoryPickerPromise = this.openDirectoryPicker();
		try {
			return await this.directoryPickerPromise;
		} finally {
			this.directoryPickerPromise = null;
		}
	}

	private async openDirectoryPicker(): Promise<ExportTarget | null> {
		try {
			if (Platform.isDesktopApp) {
				const electronDialog = this.getElectronDialog();
				if (electronDialog) {
					const result = await electronDialog.showOpenDialog({
						properties: ["openDirectory", "createDirectory"],
					});
					if (result.canceled || result.filePaths.length === 0) {
						return null;
					}

					return {
						type: "local",
						path: result.filePaths[0],
					};
				}

				new Notice(
					"Could not open native directory picker. Electron dialog unavailable.",
					5000,
				);
				return null;
			}

			// Check if the File System Access API is supported
			if (!("showDirectoryPicker" in window)) {
				new Notice(
					"File System Access API not supported in this browser. Please use a modern browser like Chrome or Edge.",
					5000,
				);
				return null;
			}

			const handle = await window.showDirectoryPicker({
				mode: "readwrite",
			});
			return {
				type: "file-system-access",
				handle,
			};
		} catch (error) {
			if (error.name === "AbortError") {
				// User cancelled the directory picker
				return null;
			}
			throw error;
		}
	}

	private getElectronDialog(): ElectronDialog | null {
		try {
			const electron = require("electron");
			return electron.remote?.dialog ?? null;
		} catch (_error) {
			return null;
		}
	}
}
