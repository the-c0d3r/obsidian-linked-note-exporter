export const EXPORT_MODAL_STYLE_ID = "export-modal-styles";

export const injectExportModalStyles = () => {
    let styleEl = document.getElementById(EXPORT_MODAL_STYLE_ID) as HTMLStyleElement;

    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = EXPORT_MODAL_STYLE_ID;
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
        /* Source Info Card */
        .export-source-info {
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .source-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .source-label {
            color: var(--text-muted);
            font-size: 0.8em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .source-name {
            font-weight: 600;
            font-size: 0.95em;
        }

        .source-stats {
            display: flex;
            gap: 12px;
            font-size: 0.85em;
            color: var(--text-muted);
        }

        .stat-item strong {
            color: var(--text-normal);
        }

        /* Collapsible Section */
        .settings-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
        }
        
        .collapsible-header {
            display: flex;
            align-items: center;
            cursor: pointer;
            user-select: none;
            padding: 8px 0;
            margin-bottom: 10px;
            font-weight: 600;
            font-size: 0.95em;
            color: var(--text-normal);
        }

        .collapsible-icon {
            margin-right: 8px;
            transition: transform 0.2s ease;
            font-size: 0.8em;
            color: var(--text-muted);
        }

        .collapsible-content {
            display: none;
            padding-left: 10px;
            margin-bottom: 20px;
            border-left: 2px solid var(--background-modifier-border);
        }

        .collapsible-content.open {
            display: block;
        }

        /* Settings Items */
        .export-modal-root .setting-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-bottom: none !important;
        }
        
        .export-modal-root .settings-group > * {
            border: none !important;
            border-bottom: none !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .setting-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .setting-label {
            font-size: 0.9em;
            font-weight: 500;
        }

        .setting-desc {
            font-size: 0.8em;
            color: var(--text-muted);
        }

        /* Range Container */
        .range-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .range-container input[type="range"] {
            width: 150px;
            accent-color: var(--interactive-accent);
        }

        .range-container span {
            min-width: 20px;
            text-align: center;
            font-size: 0.9em;
        }

        /* Toggles */
        .toggle-switch {
            width: 36px;
            height: 20px;
            background-color: #444;
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: background 0.2s;
        }

        .toggle-switch.active {
            background-color: var(--interactive-accent);
        }

        .toggle-knob {
            width: 16px;
            height: 16px;
            background-color: white;
            border-radius: 50%;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: transform 0.2s;
        }

        .toggle-switch.active .toggle-knob {
            transform: translateX(16px);
        }

        .toggle-switch-input {
            display: none;
        }

        /* File List */
        .export-modal-root .file-list-header {
            font-size: 0.9em;
            font-weight: 600;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .export-modal-root .export-file-list {
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            max-height: 300px;
            overflow-y: auto;
            padding: 0 !important;
        }

        .export-modal-root .file-tree-item {
            display: flex;
            align-items: center;
            padding: 4px 12px;
            border-bottom: 1px solid var(--background-modifier-border);
            position: relative;
        }

        .export-modal-root .file-tree-item:last-child {
            border-bottom: none;
        }

        /* Tree Lines */
        .export-modal-root .tree-indent {
            display: flex;
            align-items: center;
            height: 100%;
            margin-right: 4px;
        }
        
        .export-modal-root .tree-line {
            width: 24px;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            color: var(--text-muted);
            opacity: 0.3;
            font-family: monospace;
            font-size: 1.2em;
            user-select: none;
        }

        .export-modal-root .file-content-wrapper {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 0;
            overflow: hidden;
        }

        .export-modal-root .file-tree-item.filtered {
            opacity: 0.7;
            background-color: rgba(60, 20, 20, 0.3);
        }
        
        .export-modal-root .file-tree-item.filtered .file-name {
            text-decoration: line-through;
            color: var(--text-muted);
        }

        /* Checkbox */
        .export-modal-root .file-content-wrapper input[type="checkbox"] {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 16px !important; 
            height: 16px !important;
            margin: 0 !important;
            cursor: pointer;
            position: static !important;
            -webkit-appearance: checkbox !important;
            appearance: checkbox !important;
            filter: none !important;
        }

        .export-modal-root .file-content-wrapper input[type="checkbox"]::after,
        .export-modal-root .file-content-wrapper input[type="checkbox"]::before {
            display: none !important;
            content: none !important;
            visibility: hidden !important;
        }

        .export-modal-root .file-details {
            display: flex;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
        }

        .export-modal-root .file-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--text-normal);
            font-family: var(--font-monospace);
        }

        .export-modal-root .file-path {
            font-size: 0.85em;
            color: var(--text-muted);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .export-modal-root .file-tags {
            margin-left: 10px;
            display: flex;
            gap: 4px;
            align-items: center;
            overflow: hidden;
            flex-shrink: 3;
            max-width: 40%;
            mask-image: linear-gradient(to right, black 85%, transparent 100%);
            -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }

        .export-modal-root .tag {
            background: var(--background-modifier-border);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75em;
            color: var(--text-muted);
            white-space: nowrap;
        }

        .export-modal-root .file-icon {
            font-size: 1.1em;
            flex-shrink: 0;
        }

        .export-modal-root input[type="range"] {
            width: 100%;
            accent-color: var(--interactive-accent);
        }

        .export-modal-root input[type="text"] {
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            color: var(--text-normal);
            padding: 6px 10px;
            border-radius: 4px;
            width: 100%;
            font-size: 0.9em;
        }
    `;
};
