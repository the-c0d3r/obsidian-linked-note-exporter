# Obsidian Linked Note Exporter


This plugin is created to help with the exporting of your notes with all the linked notes and attachments.

I have personally found cases where I want to share my notes to someone else and found that it is very hard to export the note that has image attachments and also links to other notes which I also wanted to share. So I created this plugin to serve that purpose. 


## Configurations
- zip export: if turned on will create a zip file called `export.zip` in your export directory.
- link depth: how many levels of links you want to export, level 1 would mean any notes that are linked from your note to be exported, level 2 would be those notes plus any other notes in those linked notes, and so on.
- ignore folders: notes from these folders will be ignored when you trigger export. This is useful to ignore folders that are private, or maybe work related.
- ignore tags: notes with this tag (inline tag or properties) will be ignored. If you set `#personal/*` then anything that has the prefix `#personal/` such as `#personal/notes` will be ignored, including `#personal` tag itself. This is useful to prevent exporting any notes that are private to you.


You can right click on a markdown file from file explorer to export, or trigger command prompt to do "Export Note with Linked Files".
