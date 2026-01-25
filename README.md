# Linked Note Exporter

This Obsidian plugin helps you share your notes with others.

When you share a simple markdown file, any attachments like images, PDFs, or links to other notes usually break because the files are missing. This plugin solves that by collecting your note and everything connected to it — any attachments or linked notes — into a single folder or ZIP file.

It's great for sharing a complete topic, project, or idea without losing the context.

## How to Use

1.  **Right-click** any note in your file list.
2.  Choose **Export note & related files**.
3.  Click **Export**.

_You can also use the Command Palette: search for "Export note & related files"._

![demo](assets/demo.png)

![demo](assets/demo.gif)

## Features

*   **Complete Package**: Automatically finds and includes every attachment or linked note you've added to your note.
*   **Follows Connections**: If your note links to other notes, it can include those too, so the reader gets the full picture.
*   **Easy Sharing**: Can save everything as a single `.zip` file that you can easily email or send.
*   **Organized**: Keeps your files tidy. You can choose to keep your original folder structure or organize files based on the headers in your document.
*   **Flexible**: Works with both `[[WikiLinks]]` and standard `[Markdown Links](path.md)` links.

## Settings Explained

Here is what the different options do:

*   **Linked Notes Depth**: How far should we look for connections?
    *   `0`: Just export this specific note, nothing else, no attachments.
    *   `1`: Export this note plus any note it links to directly, and any attachments.
    *   `2`: Also include notes linked by *those* notes (and so on).
*   **Create ZIP Archive**: Wraps everything into a single file (a ZIP). Best for emailing.
*   **Maintain Vault Folders**: Keeps the files in the same folders they are in your Vault.
*   **Organize by Headers**: Moves linked notes into folders named after the section they appear in. For example, if you have a section called "## Research", notes linked there will go into a "Research" folder.
*   **Include Backlinks**: Also export notes that link *to* this note (the "What links here" notes).
*   **Ignore Folders/Tags**: Tell the exporter to skip certain files, like your daily journal or private templates.

## Installation

1.  Open Obsidian **Settings**.
2.  Go to **Community Plugins** and turn off "Restricted mode".
3.  Click **Browse** and search for `Linked Note Exporter`.
4.  Click **Install** and then **Enable**.

Or you can click [here](https://obsidian.md/plugins?id=linked-note-exporter) to install.

## License & Support

MIT License

If this plugin saved you time (or sanity), consider [buying me a coffee](https://buymeacoffee.com/the.c0d3r). 
Your support keeps the updates coming!