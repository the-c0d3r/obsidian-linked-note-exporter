# Linked Note Exporter

Export a note along with all its attachments and linked notes—cleanly, conveniently, and outside your vault.

## ✨ Features

-   Export a note to a directory outside your vault
-   Include all embedded/linked files (images, PDFs, etc.)
-   Include notes linked from the source note, up to configurable link depth
-   Optionally zip the export
-   Exclude notes by folder or tag
-   Trigger from the **right-click context menu** or **command palette**

## 🛠️ Use Case

You’ve crafted a beautiful note with images and cross-links—but sharing it with a colleague becomes a tangled mess of missing files and broken links. This plugin solves that elegantly by exporting a self-contained bundle of everything related to that note.

## 🖼️ Screenshots

![Configuration options](assets/config.png)

![Command Palette](assets/command-palette.png)

![File Menu](assets/file-menu.png)

![Export Modal](assets/export-modal.png)

## ⚙️ Settings

### `Link Depth`

-   Determines how many levels of linked notes are exported.
-   `1` includes directly linked notes.
-   `2` includes notes linked by those notes, and so on.

### `Zip Export`

-   If enabled, the exported files will be zipped into `export.zip` inside the target directory.

### `Maintain Folder Structure`

- If enabled, the export files or zip will maintain the same directory structure as the original file path

### `Ignore Folders`

-   Notes located in these folders will be skipped during export.
-   Useful for ignoring private, work-related, or archival material.

### `Ignore Tags`

-   Notes with these tags will be skipped.
-   Supports wildcards:
    -   `#personal/*` excludes tags like `#personal/notes`, `#personal/thoughts`, etc. This also excludes `#personal`.
    -   `#private` by itself excludes that tag only.

## 🧭 How to Use

-   **Right-Click Export**: Right-click any markdown file in the file explorer → `Export with Linked Content`
-   **Command Palette**: Trigger `Export Note with Linked Files`

## 🧪 Install via BRAT (Beta Reviewers Auto-update Tool)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. In BRAT settings, click `Add a GitHub Repo`
3. Enter the GitHub repo in the format: `the-c0d3r/obsidian-linked-note-exporter`
4. Click `Install Plugin`
5. Enable the plugin from the Community Plugins list

## 📁 Export Output

-   All selected notes and attachments will be copied to your chosen directory
-   Internal links are updated to ensure integrity
-   Optionally zipped if the setting is enabled

## 📌 Roadmap / TODO

-   More link handling options (e.g., block links)
-   CLI integration (?)

## 🧑‍💻 Author

Crafted by someone who just wanted exporting notes to _work_.
Use it, fork it, improve it.

## 📄 License

This plugin is released under the MIT License.

## ☕ Support This Plugin

If this plugin saved you some time—or your sanity—you can buy me a coffee:

<https://buymeacoffee.com/the.c0d3r>

Your support helps keep the keyboard clicking and the plugins flowing.
