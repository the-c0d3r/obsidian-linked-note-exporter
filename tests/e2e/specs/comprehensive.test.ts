import { browser, expect } from "@wdio/globals";

describe("Linked Note Exporter - Comprehensive Tests", () => {
	let currentScenario = 0;

	before(async () => {
		// Wait until Obsidian is fully loaded and plugin is enabled
		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const app = (window as any).app;
					return (
						app &&
						app.plugins &&
						app.plugins.enabledPlugins.has("linked-note-exporter")
					);
				});
			},
			{
				timeout: 30000,
				timeoutMsg: "Plugin linked-note-exporter not loaded",
			},
		);

		// Build Test Vault in the browser
		await browser.execute(async () => {
			const app = (window as any).app;
			async function createFile(path: string, content: string) {
				if (await app.vault.adapter.exists(path)) {
					await app.vault.adapter.remove(path);
				}

				const parts = path.split("/");
				if (parts.length > 1) {
					const dirPath = parts.slice(0, -1).join("/");
					if (!app.vault.getAbstractFileByPath(dirPath)) {
						await app.vault.createFolder(dirPath);
					}
				}
				await app.vault.create(path, content);
			}

			// Clean vault
			const files = app.vault.getFiles();
			for (const f of files) {
				if (!f.path.includes(".obsidian")) {
					await app.vault.adapter.remove(f.path);
				}
			}

			await createFile(
				"Source.md",
				"# Section A\n[[Link1]]\n# Section B\n[[Sub/Link2]]\n![[Images/img.png]]",
			);
			await createFile(
				"Link1.md",
				"# Head 1\n[[Link3]]\nThis is Link 1.",
			);
			await createFile("Sub/Link2.md", "[[Link1]]\n#ignore-me");
			await createFile("Link3.md", "This is Link 3");
			await createFile("Images/img.png", "fake image data");
			await createFile("Backlinker.md", "This links back to [[Source]]");
			await createFile("Templates/Template1.md", "Template content");
			await createFile(
				"Canvas.canvas",
				JSON.stringify({
					nodes: [
						{
							id: "node1",
							type: "file",
							file: "Link1.md",
							x: 0,
							y: 0,
							width: 400,
							height: 400,
						},
					],
					edges: [],
				}),
			);
		});

		// Mock showDirectoryPicker
		await browser.execute(() => {
			const app = (window as any).app;

			async function createMockDirHandle(dirPath: string): Promise<any> {
				return {
					kind: "directory",
					name: dirPath.split("/").pop(),
					getDirectoryHandle: async (name: string, opts: any) => {
						const newPath = `${dirPath}/${name}`;
						if (opts?.create) {
							if (!(await app.vault.adapter.exists(newPath))) {
								await app.vault.adapter.mkdir(newPath);
							}
						}
						return createMockDirHandle(newPath);
					},
					getFileHandle: async (name: string, opts: any) => {
						const filePath = `${dirPath}/${name}`;
						return {
							kind: "file",
							name: name,
							createWritable: async () => {
								let data: any[] = [];
								return {
									write: async (chunk: any) => {
										data.push(chunk);
									},
									close: async () => {
										const blob = new Blob(data);
										const arrayBuffer =
											await blob.arrayBuffer();
										await app.vault.adapter.writeBinary(
											filePath,
											arrayBuffer,
										);
									},
								};
							},
						};
					},
				};
			}

			(window as any).setScenario = (id: number) => {
				(window as any).currentScenarioDir = `test-output-${id}`;
			};

			window.showDirectoryPicker = async () => {
				const dirName =
					(window as any).currentScenarioDir || "test-output-default";
				if (!(await app.vault.adapter.exists(dirName))) {
					await app.vault.adapter.mkdir(dirName);
				}
				return createMockDirHandle(dirName);
			};
		});
	});

	beforeEach(async () => {
		currentScenario++;

		// Cleanup modals
		await browser.execute(() => {
			const modals = document.querySelectorAll(".modal-close-button");
			modals.forEach((b: any) => b.click());
		});
		await browser.pause(800);

		await browser.execute((id) => {
			(window as any).setScenario(id);
		}, currentScenario);

		// Open Source.md
		await browser.execute(async () => {
			const app = (window as any).app;
			const file = app.vault.getAbstractFileByPath("Source.md");
			if (file) await app.workspace.getLeaf(true).openFile(file);
		});

		await browser.waitUntil(
			async () => {
				return await browser.execute(() => {
					const app = (window as any).app;
					const activeFile = app.workspace.getActiveFile();
					return activeFile && activeFile.name === "Source.md";
				});
			},
			{ timeout: 10000 },
		);
		await browser.pause(500);
	});

	async function waitForMetadata(
		filePath: string,
		type: "links" | "headings",
	) {
		await browser.waitUntil(
			async () => {
				return await browser.execute(
					(p: string, t: string) => {
						const app = (window as any).app;
						const file = app.vault.getAbstractFileByPath(p);
						if (!file) return false;
						const cache = app.metadataCache.getFileCache(file);
						if (!cache) return false;
						if (t === "links")
							return cache.links && cache.links.length > 0;
						if (t === "headings")
							return cache.headings && cache.headings.length > 0;
						return true;
					},
					filePath,
					type,
				);
			},
			{
				timeout: 20000,
				timeoutMsg: `Metadata for ${filePath} (${type}) not ready`,
			},
		);
	}

	async function openModalAndExpand() {
		await browser.executeObsidianCommand(
			"linked-note-exporter:export-current-file-with-links",
		);
		await $(".modal-container").waitForExist({ timeout: 10000 });
		await browser.execute(() => {
			const header = document.querySelector(".collapsible-header");
			const content = document.querySelector(".collapsible-content");
			if (header && content && !content.classList.contains("open")) {
				(header as HTMLElement).click();
			}
		});
		await browser.pause(1000);
	}

	async function setSetting(
		type: "toggle" | "slider" | "input",
		labelText: string,
		value: any,
	) {
		await browser.execute(
			((t: string, label: string, val: any) => {
				if (t === "toggle") {
					const spans = Array.from(
						document.querySelectorAll(".setting-item span"),
					);
					const span = spans.find((s) => s.textContent === label);
					const toggle =
						span?.parentElement?.querySelector(".toggle-switch");
					if (toggle) {
						const isActive = toggle.classList.contains("active");
						if (isActive !== val) (toggle as HTMLElement).click();
					}
				} else if (t === "slider") {
					const slider = document.querySelector(
						'input[type="range"]',
					) as HTMLInputElement;
					if (slider) {
						slider.value = val.toString();
						slider.dispatchEvent(
							new Event("input", { bubbles: true }),
						);
						slider.dispatchEvent(
							new Event("change", { bubbles: true }),
						);
					}
				} else if (t === "input") {
					const inputs = Array.from(
						document.querySelectorAll('input[type="text"]'),
					) as HTMLInputElement[];
					const input = inputs.find((i) =>
						i.placeholder.includes(label),
					);
					if (input) {
						input.value = val;
						input.dispatchEvent(
							new Event("input", { bubbles: true }),
						);
						input.dispatchEvent(
							new Event("change", { bubbles: true }),
						);
					}
				}
			}) as any,
			type,
			labelText,
			value,
		);
		await browser.pause(1000);
	}

	async function resetAll() {
		await setSetting("toggle", "Create ZIP", false);
		await setSetting("toggle", "Maintain Folders", false);
		await setSetting("toggle", "Header Groups", false);
		await setSetting("toggle", "Backlinks ↩️", false);
		await setSetting("slider", "", 0);
		await setSetting("input", "Tags", "");
		await setSetting("input", "Folders", "");
		await browser.pause(1500);
	}

	async function getUIFileList(): Promise<string[]> {
		return await browser.execute(() => {
			const items = Array.from(document.querySelectorAll(".file-name"));
			return items.map((i) => i.textContent || "");
		});
	}

	async function waitForUIUpdate(
		predicate: (files: string[]) => boolean,
		msg: string,
	) {
		let lastFiles: string[] = [];
		try {
			await browser.waitUntil(
				async () => {
					lastFiles = await getUIFileList();
					return predicate(lastFiles);
				},
				{ timeout: 15000, timeoutMsg: msg },
			);
		} catch (e) {
			throw new Error(`${msg}. Last UI Files: ${lastFiles.join(", ")}`);
		}
	}

	async function getExportedFiles(scenarioId: number): Promise<string[]> {
		return await browser.execute(async (id: number) => {
			const app = (window as any).app;
			const dir = `test-output-${id}`;
			async function listRecursive(d: string): Promise<string[]> {
				let results: string[] = [];
				const list = await app.vault.adapter.list(d);
				for (const file of list.files)
					results.push(file.replace(`${dir}/`, ""));
				for (const folder of list.folders)
					results = results.concat(await listRecursive(folder));
				return results;
			}
			if (!(await app.vault.adapter.exists(dir))) return [];
			return await listRecursive(dir);
		}, scenarioId);
	}

	async function clickExport() {
		await browser.execute(() => {
			const btn = document.querySelector("button.mod-cta") as HTMLElement;
			if (btn) btn.click();
		});
		await $(".modal-container").waitForExist({
			reverse: true,
			timeout: 40000,
		});
	}

	async function openFile(filePath: string) {
		await browser.execute(async (p: string) => {
			const app = (window as any).app;
			const file = app.vault.getAbstractFileByPath(p);
			if (file) await app.workspace.getLeaf(true).openFile(file);
		}, filePath);
		const fileName = filePath.split("/").pop()!;
		await browser.waitUntil(
			async () => {
				return await browser.execute((name: string) => {
					const app = (window as any).app;
					const activeFile = app.workspace.getActiveFile();
					return activeFile && activeFile.name === name;
				}, fileName);
			},
			{ timeout: 10000 },
		);
		await browser.pause(500);
	}

	it("Scenario 1: Default Export (Depth 0) - Only Source.md", async () => {
		await openModalAndExpand();
		await resetAll();
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		expect(files.length).toBe(1);
	});

	it("Scenario 2: Depth 1 + Subfolders - Linked files included", async () => {
		await waitForMetadata("Source.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"UI never updated to Depth 1",
		);
		await setSetting("toggle", "Maintain Folders", true);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		expect(files).toContain("Link1.md");
	});

	it("Scenario 3: Depth 2 - Includes deep links", async () => {
		await waitForMetadata("Source.md", "links");
		await waitForMetadata("Link1.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 2);
		await waitForUIUpdate(
			(f) => f.includes("Link3.md"),
			"UI never updated to Depth 2",
		);
		// Wait for async recalculateFiles to fully complete and re-render
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Link3.md");
	});

	it("Scenario 4: Ignore Tag - Excludes matching files", async () => {
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"UI never updated to Depth 1",
		);
		await setSetting("input", "Tags", "#ignore-me");
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files.some((f) => f.includes("Link2.md"))).toBe(false);
	});

	it("Scenario 5: Header Hierarchy - Files grouped by headers", async () => {
		await waitForMetadata("Source.md", "headings");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await setSetting("toggle", "Header Groups", true);
		await browser.pause(5000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files.some((f) => f.includes("Section A"))).toBe(true);
	});

	it("Scenario 6: ZIP Export - Creates export.zip", async () => {
		await openModalAndExpand();
		await resetAll();
		await setSetting("toggle", "Create ZIP", true);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("export.zip");
	});

	it("Scenario 7: Backlinks Toggle - Includes files that link TO source", async () => {
		await openModalAndExpand();
		await resetAll();
		await setSetting("toggle", "Backlinks ↩️", true);
		await waitForUIUpdate(
			(f) => f.includes("Backlinker.md"),
			"UI never showed Backlinker.md",
		);
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		expect(files).toContain("Backlinker.md");
	});

	it("Scenario 8: Ignore Folders - Excludes files in ignored folders", async () => {
		await waitForMetadata("Source.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"UI never updated to Depth 1",
		);
		await setSetting("input", "Folders", "Sub");
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		expect(files).toContain("Link1.md");
		expect(files.some((f) => f.includes("Link2.md"))).toBe(false);
	});

	it("Scenario 9: File Deselection - Unchecked files excluded", async () => {
		await waitForMetadata("Source.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"UI never updated to Depth 1",
		);
		await browser.pause(2000);
		// Uncheck Link1.md
		await browser.execute(() => {
			const fileNames = Array.from(
				document.querySelectorAll(".file-name"),
			);
			const link1Name = fileNames.find(
				(el) => el.textContent === "Link1.md",
			);
			if (link1Name) {
				const wrapper =
					link1Name.closest(".file-content-wrapper") ||
					link1Name.closest(".file-tree-item");
				const checkbox = wrapper?.querySelector(
					'input[type="checkbox"]',
				) as HTMLInputElement;
				if (checkbox && checkbox.checked) {
					checkbox.checked = false;
					checkbox.dispatchEvent(
						new Event("change", { bubbles: true }),
					);
				}
			}
		});
		await browser.pause(500);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		expect(files.some((f) => f.includes("Link1.md"))).toBe(false);
	});

	it("Scenario 10: Canvas File Export - Canvas links followed", async () => {
		await openFile("Canvas.canvas");
		await browser.executeObsidianCommand(
			"linked-note-exporter:export-current-file-with-links",
		);
		await $(".modal-container").waitForExist({ timeout: 10000 });
		await browser.execute(() => {
			const header = document.querySelector(".collapsible-header");
			const content = document.querySelector(".collapsible-content");
			if (header && content && !content.classList.contains("open")) {
				(header as HTMLElement).click();
			}
		});
		await browser.pause(1000);
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"Canvas export UI never showed Link1.md",
		);
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Canvas.canvas");
		expect(files).toContain("Link1.md");
	});

	it("Scenario 11: Maintain Folders - Subdirectory paths preserved", async () => {
		await waitForMetadata("Source.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("Link1.md"),
			"UI never updated to Depth 1",
		);
		await setSetting("toggle", "Maintain Folders", true);
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("Source.md");
		// Verify subfolder structure is preserved
		expect(
			files.some((f) => f.includes("Sub/") && f.includes("Link2.md")),
		).toBe(true);
	});

	it("Scenario 12: Embedded Images - Binary attachments exported", async () => {
		await waitForMetadata("Source.md", "links");
		await openModalAndExpand();
		await resetAll();
		await setSetting("slider", "", 1);
		await waitForUIUpdate(
			(f) => f.includes("img.png"),
			"UI never showed img.png",
		);
		await browser.pause(2000);
		await clickExport();
		const files = await getExportedFiles(currentScenario);
		expect(files).toContain("img.png");
	});

	it("Scenario 13: Export Cancellation - No files exported", async () => {
		await openModalAndExpand();
		// Click Cancel button (non mod-cta button)
		await browser.execute(() => {
			const buttons = Array.from(
				document.querySelectorAll(
					".modal-button-container button:not(.mod-cta)",
				),
			);
			const cancelBtn = buttons.find(
				(b) => b.textContent === "Cancel",
			) as HTMLElement;
			if (cancelBtn) cancelBtn.click();
		});
		await $(".modal-container").waitForExist({
			reverse: true,
			timeout: 10000,
		});
		const files = await getExportedFiles(currentScenario);
		expect(files.length).toBe(0);
	});

	it("Scenario 14: No File Open - Notice shown, no modal", async () => {
		// Close all workspace leaves (beforeEach already opened Source.md)
		await browser.execute(async () => {
			const app = (window as any).app;
			const leaves = app.workspace.getLeavesOfType("markdown");
			for (const leaf of leaves) {
				leaf.detach();
			}
			// Also close canvas leaves
			const canvasLeaves = app.workspace.getLeavesOfType("canvas");
			for (const leaf of canvasLeaves) {
				leaf.detach();
			}
		});
		await browser.pause(1000);
		// Verify no active file
		const hasActiveFile = await browser.execute(() => {
			const app = (window as any).app;
			const file = app.workspace.getActiveFile();
			return !!file;
		});
		expect(hasActiveFile).toBe(false);
		// Run export command — should show Notice, not modal
		await browser.executeObsidianCommand(
			"linked-note-exporter:export-current-file-with-links",
		);
		await browser.pause(2000);
		// Verify no modal appeared
		const modalExists = await browser.execute(() => {
			return !!document.querySelector(".modal-container");
		});
		expect(modalExists).toBe(false);
	});
});
