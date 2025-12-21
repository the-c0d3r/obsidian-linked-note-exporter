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

        it('should handle PDF links with fragments correctly', () => {
            const content = '[[Document.pdf#page=1]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Document.pdf']);
        });

        it('should return unique paths', () => {
            const content = '[[Note 1]] and [[Note 1]]';
            const result = FileUtils.getLinkedPaths(content);
            expect(result).toEqual(['Note 1']);
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
});
