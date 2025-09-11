import { TFile, Notice, App } from "obsidian";
import { FileUtils } from "./file-utils";

export class ExportService {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Export files to a selected directory
	 */
	async exportFiles(
		files: TFile[],
		targetDir: FileSystemDirectoryHandle,
		createZip: boolean = false,
		keepFolderStructure: boolean = false,
	): Promise<void> {
		try {
			if (createZip) {
				await this.exportAsZip(
					files,
					targetDir,
					keepFolderStructure,
				);
			} else {
				await this.exportAsFiles(
					files,
					targetDir,
					keepFolderStructure,
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
		targetDir: FileSystemDirectoryHandle,
		keepFolderStructure: boolean,
	): Promise<void> {
		for (const file of files) {
			await this.exportSingleFile(
				file,
				targetDir,
				keepFolderStructure,
			);
		}
	}

	/**
	 * Export files as a ZIP archive
	 */
	private async exportAsZip(
		files: TFile[],
		targetDir: FileSystemDirectoryHandle,
		keepFolderStructure: boolean,
	): Promise<void> {
		// Dynamically import JSZip to avoid bundling issues
		const JSZip = (await import("jszip")).default;
		const zip = new JSZip();

		// Add all files to the ZIP
		for (const file of files) {
			let processedContent;
			if (file.extension === "md") {
				const content = await this.app.vault.read(file);
				processedContent = this.processFileContent(content, file);
			} else {
				processedContent = await this.app.vault.readBinary(file);
			}

			// Create the file path within the ZIP
			const zipPath = this.getZipFilePath(file, keepFolderStructure);
			zip.file(zipPath, processedContent);
		}

		// Generate ZIP content
		const zipBlob = await zip.generateAsync({ type: "blob" });

		// Save ZIP file to target directory
		const zipFileHandle = await targetDir.getFileHandle("export.zip", {
			create: true,
		});
		const writable = await zipFileHandle.createWritable();
		await writable.write(zipBlob);
		await writable.close();
	}

	/**
	 * Export a single file to the target directory
	 */
	private async exportSingleFile(
		file: TFile,
		targetDir: FileSystemDirectoryHandle,
		keepFolderStructure: boolean,
	): Promise<void> {

		let processedContent;
		if (file.extension === "md") {
			const content = await this.app.vault.read(file);
			processedContent = this.processFileContent(content, file);
		} else {
			processedContent = await this.app.vault.readBinary(file);
		}

		// Create the file path within the target directory
		const targetPath = this.getTargetFilePath(
			file,
			keepFolderStructure,
		);
		const targetFileHandle = await this.createNestedFile(
			targetDir,
			targetPath,
		);

		const writable = await targetFileHandle.createWritable();
		await writable.write(processedContent);
		await writable.close();
	}

	/**
	 * Process file content (e.g., rewrite links for markdown files)
	 */
	private processFileContent(content: string, file: TFile): string {
		return content;
	}

	/**
	 * Get the target file path for export
	 */
	private getTargetFilePath(
		file: TFile,
		keepFolderStructure: boolean,
	): string {
		if (keepFolderStructure) {
			// Use the full path structure
			return file.path;
		} else {
			// Just use the file name to avoid path conflicts
			return file.name;
		}
	}

	/**
	 * Get the ZIP file path for export
	 */
	private getZipFilePath(
		file: TFile,
		keepFolderStructure: boolean,
	): string {
		if (keepFolderStructure) {
			// Use the full path structure within the ZIP
			return file.path;
		} else {
			// Just use the file name within the ZIP
			return file.name;
		}
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

	/**
	 * Show directory picker and return selected directory
	 */
	async showDirectoryPicker(): Promise<FileSystemDirectoryHandle | null> {
		try {
			// Check if the File System Access API is supported
			if (!("showDirectoryPicker" in window)) {
				new Notice(
					"File System Access API not supported in this browser. Please use a modern browser like Chrome or Edge.",
					5000,
				);
				return null;
			}

			return await window.showDirectoryPicker({
				mode: "readwrite",
			});
		} catch (error) {
			if (error.name === "AbortError") {
				// User cancelled the directory picker
				return null;
			}
			throw error;
		}
	}
}
