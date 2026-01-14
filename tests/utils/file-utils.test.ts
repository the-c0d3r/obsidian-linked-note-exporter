import { FileUtils } from '../../src/utils/file-utils';
import { TFile } from 'obsidian';

describe('FileUtils', () => {
    describe('getLinkedPaths', () => {
        it('should extract standard markdown links', () => {
            const content = '[[Note 1]] and [[Note 2]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Note 1', 'Note 2']);
        });

        it('should extract embedded links', () => {
            const content = '![[Image.png]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Image.png']);
        });

        it('should handle links with display text', () => {
            const content = '[[Note 1|My Note]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Note 1']);
        });

        it('should handle WikiLink anchors correctly', () => {
            const content = '[[Note#Section]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Note']);
        });

        it('should handle WikiLink anchors with formatting and aliases', () => {
            const content = '[[Procedural type of info#**Definition**|Procedural]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Procedural type of info']);
        });

        it('should handle PDF links with fragments correctly', () => {
            const content = '[[Document.pdf#page=1]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Document.pdf']);
        });

        it('should handle angle bracket syntax for paths with spaces', () => {
            const content = '![My Image](<../Imgs/image with spaces.png>)';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['../Imgs/image with spaces.png']);
        });

        it('should handle angle bracket syntax for markdown links', () => {
            const content = '[Link](<path/to/file with spaces.md>)';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['path/to/file with spaces.md']);
        });

        it('should return unique paths', () => {
            const content = '[[Note 1]] and [[Note 1]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Note 1']);
        });
    });

    describe('extractCanvasLinks', () => {
        it('should extract file nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'file', file: 'image.png' },
                    { type: 'file', file: 'note.md' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toContain('image.png');
            expect(result).toContain('note.md');
        });

        it('should extract links from text nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'text', text: 'Check [[wiki-link]] and [md-link](file.md)' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toContain('wiki-link');
            expect(result).toContain('file.md');
        });

        it('should handle mixed nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'file', file: 'image.png' },
                    { type: 'text', text: '[[note]]' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toHaveLength(2);
            expect(result).toContain('image.png');
            expect(result).toContain('note');
        });

        it('should return empty array for invalid json', () => {
            const result = FileUtils.extractCanvasLinks('invalid json');
            expect(result).toEqual([]);
        });

        it('should return empty array if no nodes', () => {
            const result = FileUtils.extractCanvasLinks('{}');
            expect(result).toEqual([]);
        });
    });


    describe('extractCanvasLinks', () => {
        it('should extract file nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'file', file: 'image.png' },
                    { type: 'file', file: 'note.md' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toContain('image.png');
            expect(result).toContain('note.md');
        });

        it('should extract links from text nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'text', text: 'Check [[wiki-link]] and [md-link](file.md)' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toContain('wiki-link');
            expect(result).toContain('file.md');
        });

        it('should handle mixed nodes', () => {
            const content = JSON.stringify({
                nodes: [
                    { type: 'file', file: 'image.png' },
                    { type: 'text', text: '[[note]]' }
                ]
            });
            const result = FileUtils.extractCanvasLinks(content);
            expect(result).toHaveLength(2);
            expect(result).toContain('image.png');
            expect(result).toContain('note');
        });

        it('should return empty array for invalid json', () => {
            const result = FileUtils.extractCanvasLinks('invalid json');
            expect(result).toEqual([]);
        });

        it('should return empty array if no nodes', () => {
            const result = FileUtils.extractCanvasLinks('{}');
            expect(result).toEqual([]);
        });
    });

    describe('matchesIgnore', () => {
        it('should match exact tags', () => {
            expect(FileUtils.matchesIgnore('#private', ['#private'])).toBe(true);
            expect(FileUtils.matchesIgnore('#public', ['#private'])).toBe(false);
        });

        it('should match wildcard patterns', () => {
            expect(FileUtils.matchesIgnore('#personal/journal', ['#personal/*'])).toBe(true);
            expect(FileUtils.matchesIgnore('#personal', ['#personal/*'])).toBe(true);
            expect(FileUtils.matchesIgnore('#work/project', ['#personal/*'])).toBe(false);
        });
    });

});

describe('matchesIgnore', () => {
    it('should match exact tags', () => {
        expect(FileUtils.matchesIgnore('#private', ['#private'])).toBe(true);
        expect(FileUtils.matchesIgnore('#public', ['#private'])).toBe(false);
    });

    it('should match wildcard patterns', () => {
        expect(FileUtils.matchesIgnore('#personal/journal', ['#personal/*'])).toBe(true);
        expect(FileUtils.matchesIgnore('#personal', ['#personal/*'])).toBe(true);
        expect(FileUtils.matchesIgnore('#work/project', ['#personal/*'])).toBe(false);
    });
});

describe('sanitizeHeaderPath', () => {
    it('should remove markdown headers', () => {
        const result = FileUtils.sanitizeHeaderPath(['# Header 1', '## Header 2']);
        expect(result).toBe('Header 1/Header 2');
    });

    it('should replace invalid characters', () => {
        const result = FileUtils.sanitizeHeaderPath(['Header/With/Slashes', 'Header:With:Colons']);
        expect(result).toBe('Header With Slashes/Header With Colons');
    });

    it('should trim and collapse spaces', () => {
        const result = FileUtils.sanitizeHeaderPath(['  Header   1  ']);
        expect(result).toBe('Header 1');
    });
});

describe('sortFiles', () => {
    it('should sort markdown files before others', () => {
        const mdFile = new TFile();
        mdFile.extension = 'md';
        mdFile.name = 'b.md';

        const pngFile = new TFile();
        pngFile.extension = 'png';
        pngFile.name = 'a.png';

        const files = [pngFile, mdFile];
        const result = FileUtils.sortFiles(files);

        expect(result[0]).toBe(mdFile);
        expect(result[1]).toBe(pngFile);
    });

    it('should sort alphabetically within same type', () => {
        const file1 = new TFile();
        file1.extension = 'md';
        file1.name = 'b.md';

        const file2 = new TFile();
        file2.extension = 'md';
        file2.name = 'a.md';

        const files = [file1, file2];
        const result = FileUtils.sortFiles(files);

        expect(result[0]).toBe(file2);
        expect(result[1]).toBe(file1);
    });
});

describe('normalizeTags', () => {
    it('should handle undefined', () => {
        expect(FileUtils.normalizeTags(undefined)).toEqual([]);
    });

    it('should handle single string', () => {
        expect(FileUtils.normalizeTags('tag1')).toEqual(['#tag1']);
        expect(FileUtils.normalizeTags('#tag1')).toEqual(['#tag1']);
    });

    it('should handle array of strings', () => {
        expect(FileUtils.normalizeTags(['tag1', '#tag2'])).toEqual(['#tag1', '#tag2']);
    });
});

describe('isPathIgnored', () => {
    it('should match ignored folders', () => {
        expect(FileUtils.isPathIgnored('ignored/folder/file.md', ['ignored/folder'])).toBeTruthy();
    });

    it('should not match partial folder names', () => {
        expect(FileUtils.isPathIgnored('ignored_folder_like/file.md', ['ignored_folder'])).toBeFalsy();
    });

    it('should return false for non-matching paths', () => {
        expect(FileUtils.isPathIgnored('valid/folder/file.md', ['ignored'])).toBeFalsy();
    });
});

describe('extractLinksFromContent', () => {
    it('should extract correct link text and position', () => {
        const content = 'Start [[Link]] End';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(1);
        expect(result[0].linkText).toBe('Link');
        expect(result[0].position).toBe(6);
    });

    it('should handle WikiLink anchors in extractLinksFromContent', () => {
        const content = '[[Note#Section]]';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result[0].linkText).toBe('Note');
    });

    it('should handle multiple links', () => {
        const content = '[[Link1]] [[Link2]]';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(2);
        expect(result[0].linkText).toBe('Link1');
        expect(result[1].linkText).toBe('Link2');
    });

    it('should clean link text', () => {
        const content = '[[Link|Alias]] [[Page#Header]]';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result[0].linkText).toBe('Link');
        expect(result[1].linkText).toBe('Page');
    });
    it('should extract standard markdown links', () => {
        const content = 'Text [Link](File.md) more text';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(1);
        expect(result[0].linkText).toBe('File.md');
    });

    it('should handle standard markdown link anchors in extractLinksFromContent', () => {
        const content = '[Note](Note.md#Section)';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result[0].linkText).toBe('Note.md');
    });

    it('should extract mixed links sorted by position', () => {
        const content = '[[Wiki]] then [MD](File.md)';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(2);
        expect(result[0].linkText).toBe('Wiki');
        expect(result[1].linkText).toBe('File.md');
    });

    it('should ignore external markdown links', () => {
        const content = '[Google](https://google.com) and [Custom](ethis://test)';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(0);
    });

    it('should handle angle bracket syntax in extractLinksFromContent', () => {
        const content = '![Image](<path/to/image with spaces.png>)';
        const result = FileUtils.extractLinksFromContent(content);
        expect(result).toHaveLength(1);
        expect(result[0].linkText).toBe('path/to/image with spaces.png');
    });

    it('should extract standard markdown links', () => {
        const content = 'Check [Note 1](Note%201.md) and [Note 2](path/to/Note%202.md)';
        const result = FileUtils.getLinkedPaths(content);
        expect(result).toContain('Note 1.md');
        expect(result).toContain('path/to/Note 2.md');
    });

    it('should extract standard image embeds', () => {
        const content = '![Image](img.png)';
        const result = FileUtils.getLinkedPaths(content);
        expect(result).toContain('img.png');
    });

    it('should ignore external links', () => {
        const content = '[External](https://example.com) and [FTP](ftp://server) and [Custom](ethis://test)';
        const result = FileUtils.getLinkedPaths(content);
        expect(result.length).toBe(0);
    });

    it('should handle standard markdown link anchors in getLinkedPaths', () => {
        const content = '[Note](Note.md#Section)';
        const result = FileUtils.getLinkedPaths(content);
        expect(result).toContain('Note.md');
    });

    it('should ignore local anchors in markdown links', () => {
        const content = '[Link](Note.md#header)';
        const result = FileUtils.getLinkedPaths(content);
        expect(result).toContain('Note.md');
    });
});


describe('getHeaderPathAtPosition', () => {
    it('should return correct path', () => {
        const headings = [
            { level: 1, heading: 'Title', position: { start: { offset: 0 } } },
            { level: 2, heading: 'Section', position: { start: { offset: 50 } } }
        ];
        expect(FileUtils.getHeaderPathAtPosition(100, headings, 'File')).toEqual(['Title', 'Section']);
    });

    it('should respect hierarchy nesting', () => {
        const headings = [
            { level: 1, heading: 'H1', position: { start: { offset: 0 } } },
            { level: 2, heading: 'H2-A', position: { start: { offset: 20 } } },
            { level: 2, heading: 'H2-B', position: { start: { offset: 40 } } },
            { level: 3, heading: 'H3', position: { start: { offset: 60 } } }
        ];
        expect(FileUtils.getHeaderPathAtPosition(70, headings, 'File')).toEqual(['H1', 'H2-B', 'H3']);
    });

    it('should skip H1 if it matches filename', () => {
        const headings = [
            { level: 1, heading: 'My Note', position: { start: { offset: 0 } } },
            { level: 2, heading: 'Section', position: { start: { offset: 50 } } }
        ];
        expect(FileUtils.getHeaderPathAtPosition(100, headings, 'My Note')).toEqual(['Section']);
    });
});

describe('getFileTags', () => {
    const mockApp = {
        metadataCache: {
            getFileCache: jest.fn()
        }
    };

    it('should return empty array if no cache', () => {
        mockApp.metadataCache.getFileCache.mockReturnValue(null);
        expect(FileUtils.getFileTags(new TFile(), mockApp)).toEqual([]);
    });

    it('should extract frontmatter and inline tags', () => {
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { tags: ['#front'] },
            tags: [{ tag: '#inline' }]
        });
        const result = FileUtils.getFileTags(new TFile(), mockApp);
        expect(result).toContain('#front');
        expect(result).toContain('#inline');
    });
});

describe('shouldExcludeFile', () => {
    const mockApp = {
        metadataCache: {
            getFileCache: jest.fn()
        }
    };

    it('should exclude by folder', () => {
        const file = new TFile();
        file.path = 'ignored/folder/file.md';
        const result = FileUtils.shouldExcludeFile(file, mockApp, ['ignored/folder'], []);
        expect(result).toBeTruthy();
        expect(result).toContain('Folder path matches');
    });

    it('should exclude by tag', () => {
        const file = new TFile();
        file.path = 'notes/file.md';
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { tags: ['#ignore'] }
        });

        const result = FileUtils.shouldExcludeFile(file, mockApp, [], ['#ignore']);
        expect(result).toBeTruthy();
        expect(result).toContain('Tag matches');
    });

    it('should not exclude valid files', () => {
        const file = new TFile();
        file.path = 'notes/file.md';
        mockApp.metadataCache.getFileCache.mockReturnValue({
            frontmatter: { tags: ['#keep'] }
        });

        const result = FileUtils.shouldExcludeFile(file, mockApp, [], ['#ignore']);
        expect(result).toBeFalsy();
    });
});

describe('getExportPathsForFile', () => {
    it('should return root path if no headers', () => {
        const file = new TFile();
        file.name = 'note.md';
        file.path = 'note.md';
        const headerMap = new Map();

        const result = FileUtils.getExportPathsForFile(file, headerMap, false, 'Source');
        expect(result).toEqual(['note.md']);
    });

    it('should return root path with source name', () => {
        const file = new TFile();
        file.name = 'note.md';
        file.path = 'note.md';
        const headerMap = new Map();

        const result = FileUtils.getExportPathsForFile(file, headerMap, true, 'Source');
        expect(result).toEqual(['Source/note.md']);
    });

    it('should return paths under headers', () => {
        const file = new TFile();
        file.name = 'note.md';
        file.path = 'note.md';
        const headerMap = new Map();
        headerMap.set('note.md', [['H1', 'H2']]);

        const result = FileUtils.getExportPathsForFile(file, headerMap, false, 'Source');
        expect(result).toEqual(['H1/H2/note.md']);
    });

    it('should return paths under headers with source name', () => {
        const file = new TFile();
        file.name = 'note.md';
        file.path = 'note.md';
        const headerMap = new Map();
        headerMap.set('note.md', [['H1']]);

        const result = FileUtils.getExportPathsForFile(file, headerMap, true, 'Source');
        expect(result).toEqual(['Source/H1/note.md']);
    });
});

describe('buildHeaderHierarchyAsync', () => {
    const mockApp = {
        metadataCache: {
            getFileCache: jest.fn(),
            getFirstLinkpathDest: jest.fn()
        },
        vault: {
            read: jest.fn()
        }
    };

    const sourceFile = new TFile();
    sourceFile.path = 'source.md';
    sourceFile.basename = 'source';
    sourceFile.name = 'source.md';

    const linkedFile = new TFile();
    linkedFile.path = 'linked.md';
    linkedFile.basename = 'linked';
    linkedFile.name = 'linked.md';

    const childFile = new TFile();
    childFile.path = 'child.md';
    childFile.basename = 'child';
    childFile.name = 'child.md';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return empty map if no cache or headings', async () => {
        mockApp.metadataCache.getFileCache.mockReturnValue(null);
        const result = await FileUtils.buildHeaderHierarchyAsync(sourceFile, mockApp, [], new Map(), new Map());
        expect(result.size).toBe(0);
    });

    it('should return empty map if no links in content', async () => {
        mockApp.metadataCache.getFileCache.mockReturnValue({ headings: [] });
        mockApp.vault.read.mockResolvedValue('No links here');

        const result = await FileUtils.buildHeaderHierarchyAsync(sourceFile, mockApp, [], new Map(), new Map());
        expect(result.size).toBe(0);
    });

    it('should map linked file to header path', async () => {
        mockApp.metadataCache.getFileCache.mockReturnValue({
            headings: [{ level: 1, heading: 'Section 1', position: { start: { offset: 0 } } }]
        });
        mockApp.vault.read.mockResolvedValue('Some text \n\n [[linked]]');
        mockApp.metadataCache.getFirstLinkpathDest.mockReturnValue(linkedFile);

        const result = await FileUtils.buildHeaderHierarchyAsync(sourceFile, mockApp, [], new Map(), new Map());

        expect(result.has('linked.md')).toBeTruthy();
        expect(result.get('linked.md')).toEqual([['Section 1']]);
    });

    it('should propagate header context to child files', async () => {
        // Setup source file with link to 'linked.md' under 'Section 1'
        mockApp.metadataCache.getFileCache.mockReturnValue({
            headings: [{ level: 1, heading: 'Section 1', position: { start: { offset: 0 } } }]
        });
        mockApp.vault.read.mockResolvedValue('\n\n[[linked]]');
        mockApp.metadataCache.getFirstLinkpathDest.mockReturnValue(linkedFile);

        // Setup parent map: linked.md is parent of child.md
        const parentMap = new Map();
        parentMap.set('child.md', new Set(['linked.md']));

        // Setup depth map
        const depthMap = new Map();
        depthMap.set('linked.md', 1);
        depthMap.set('child.md', 2);

        const files = [linkedFile, childFile];

        const result = await FileUtils.buildHeaderHierarchyAsync(sourceFile, mockApp, files, parentMap, depthMap);

        // Check direct link
        expect(result.get('linked.md')).toEqual([['Section 1']]);

        // Check propagated link (child should inherit from parent)
        expect(result.get('child.md')).toEqual([['Section 1']]);
    });
});

