# Linked Note Exporter

Export a note along with all its attachments and linked notes—cleanly, conveniently, and ready to share.

## 🚀 Why use this?

You’ve crafted a beautiful note with images and cross-links—but sharing it deals a blow to its utility: links break, and images vanish. 

**Linked Note Exporter** solves this by gathering everything your note needs (images, PDFs, and even other notes it links to) and packaging them into a folder or ZIP file. It's the easiest way to share a complete piece of your "second brain" with someone else.

## ✨ What it does

-   **Exports complete packages**: Copies your note and every image or file embedded in it.
-   **Follows your thoughts**: Can optionally grab the notes you linked to (and the notes *they* link to!).
-   **Canvas Friendly**: Fully supports Obsidian Canvas files.
-   **Smart Organization**: Keeps your files tidy, either matching your vault or organizing by your document's headers.
-   **Ready to Share**: Can zip everything up automatically.
-   **Flexible**: Works with both `[[WikiLinks]]` and standard `[Markdown Links](path.md)`.

## 🖼️ See it in action

![demo](assets/demo.gif)

## 🧭 How to Use

1.  **Right-click** any note in your file explorer.
2.  Select **Export note & related files**.
3.  Choose your settings (or stick to the defaults!) and click **Export**.

_You can also use the Command Palette: search for "Export note & related files"._

## ⚙️ Settings Explained

### `Linked Notes Depth`
*How deep should we look for connections?*
-   `0`: Just the note and its images/attachments.
-   `1`: The note + immediate linked notes.
-   `2`: The note + linked notes + notes linked by *those* notes.

### `Create ZIP Archive`
If turned on, we'll compress your export into a single `.zip` file. Perfect for emailing!

### `Maintain Vault Folders`
Keeps the file structure exactly as it is in your Obsidian vault. If `Notes/Project A/Note.md` is exported, it will be in the same folder path in the export.

### `Organize by Headers`
A powerful alternative to "Maintain Vault Folders". This moves linked notes into folders based on where they appear in your document.
*   If you have a header `## Research`, any notes linked under that header will be moved into a `Research` folder in your export.
*   Great for turning a note into a structured bundle of documents.

### `Ignore Folders & Tags`
Tell the exporter what to skip.
-   **Ignore Folders**: e.g. `Templates, Archive` — notes in these folders won't be exported.
-   **Ignore Tags**: e.g. `#private` or `#personal/*` — notes with these tags will be left behind.

## 🧪 Installation

1.  Open **Settings** > **Community Plugins**.
2.  Turn on Community Plugins.
3.  Browse and search for **"Linked Note Exporter"**.
4.  Install and Enable.

## 📄 License & Support

MIT License.

If this plugin saved you time (or sanity), consider [buying me a coffee](https://buymeacoffee.com/the.c0d3r). 
Your support keeps the updates coming!
