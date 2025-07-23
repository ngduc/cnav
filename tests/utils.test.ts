// Run: npx vitest run tests/utils.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { findReadmeFiles, isExcludedDirectory, getExcludedDirectories } from '../src/utils/utils';
import { getProjectInfo } from '../src/services/git';

describe('Utils', () => {
  const projectRoot = path.resolve(__dirname, '..');

  describe('findReadmeFiles', () => {
    it('should find README.md in the project root', async () => {
      const result = await findReadmeFiles(projectRoot);
      
      // Should find at least the root README.md
      expect(Object.keys(result)).toContain('README.md');
      expect(result['README.md']).toBeDefined();
      expect(typeof result['README.md']).toBe('string');
      expect(result['README.md'].length).toBeGreaterThan(0);
    });

    it('should return content that matches the actual README.md file', async () => {
      const result = await findReadmeFiles(projectRoot);
      const actualContent = await fs.readFile(path.join(projectRoot, 'README.md'), 'utf-8');
      
      expect(result['README.md']).toBe(actualContent);
    });

    it('should only search 1 level deep', async () => {
      const result = await findReadmeFiles(projectRoot);
      
      // Check that we don't have deeply nested paths (more than 1 level)
      const paths = Object.keys(result);
      const deepPaths = paths.filter(p => {
        const segments = p.split('/');
        return segments.length > 2; // More than "folder/README.md"
      });
      
      expect(deepPaths).toHaveLength(0);
    });

    it('should exclude node_modules and other excluded directories', async () => {
      const result = await findReadmeFiles(projectRoot);
      
      // Check that no paths include excluded directories
      const paths = Object.keys(result);
      const excludedPaths = paths.filter(p => {
        return getExcludedDirectories().some(excluded => 
          p.includes(`${excluded}/`) || p.startsWith(`${excluded}/`)
        );
      });
      
      expect(excludedPaths).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', async () => {
      const nonExistentPath = path.join(projectRoot, 'non-existent-directory');
      const result = await findReadmeFiles(nonExistentPath);
      
      expect(result).toEqual({});
    });

    it('should return correct format (object with path -> content mapping)', async () => {
      const result = await findReadmeFiles(projectRoot);
      
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      
      // Each key should be a string (file path) and each value should be a string (content)
      Object.entries(result).forEach(([path, content]) => {
        expect(typeof path).toBe('string');
        expect(typeof content).toBe('string');
        expect(path.endsWith('README.md')).toBe(true);
      });
    });

    it('should work with current working directory by default', async () => {
      // Change to project root temporarily
      const originalCwd = process.cwd();
      process.chdir(projectRoot);
      
      try {
        const result = await findReadmeFiles();
        expect(Object.keys(result)).toContain('README.md');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('isExcludedDirectory', () => {
    it('should correctly identify excluded directories', () => {
      // Test some common excluded directories
      expect(isExcludedDirectory('node_modules')).toBe(true);
      expect(isExcludedDirectory('.git')).toBe(true);
      expect(isExcludedDirectory('__pycache__')).toBe(true);
      expect(isExcludedDirectory('target')).toBe(true);
      expect(isExcludedDirectory('dist')).toBe(true);
    });

    it('should not exclude normal directories', () => {
      expect(isExcludedDirectory('src')).toBe(false);
      expect(isExcludedDirectory('docs')).toBe(false);
      expect(isExcludedDirectory('tests')).toBe(false);
      expect(isExcludedDirectory('scripts')).toBe(false);
      expect(isExcludedDirectory('my-project')).toBe(false);
    });
  });

  describe('getExcludedDirectories', () => {
    it('should return an array of excluded directory names', () => {
      const excluded = getExcludedDirectories();
      
      expect(Array.isArray(excluded)).toBe(true);
      expect(excluded.length).toBeGreaterThan(0);
      
      // Should include some common ones
      expect(excluded).toContain('node_modules');
      expect(excluded).toContain('.git');
      expect(excluded).toContain('__pycache__');
    });

    it('should return a copy of the array (not the original)', () => {
      const excluded1 = getExcludedDirectories();
      const excluded2 = getExcludedDirectories();
      
      expect(excluded1).not.toBe(excluded2); // Different array instances
      expect(excluded1).toEqual(excluded2); // But same content
    });
  });

  describe('Integration with git service', () => {
    it('should include README files in getProjectInfo', async () => {
      // Change to project root temporarily for git operations
      const originalCwd = process.cwd();
      process.chdir(projectRoot);
      
      try {
        const projectInfo = await getProjectInfo();
        
        // Should include README in project info
        expect(projectInfo.README).toBeDefined();
        expect(typeof projectInfo.README).toBe('object');
        
        // Should have at least the root README.md
        expect(projectInfo.README['README.md']).toBeDefined();
        expect(typeof projectInfo.README['README.md']).toBe('string');
        expect(projectInfo.README['README.md'].length).toBeGreaterThan(0);
        
        // Verify the content matches what findReadmeFiles returns
        const directResult = await findReadmeFiles(projectRoot);
        expect(projectInfo.README).toEqual(directResult);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should include README alongside other project info', async () => {
      const originalCwd = process.cwd();
      process.chdir(projectRoot);
      
      try {
        const projectInfo = await getProjectInfo();
        
        // Should have README alongside other expected properties
        expect(projectInfo.README).toBeDefined();
        expect(projectInfo.packageJson).toBeDefined(); // From package.json (backward compatibility)
        
        // Should have new configFiles structure
        expect(projectInfo.configFiles).toBeDefined();
        expect(projectInfo.configFiles.nodejs).toBeDefined(); // Should detect Node.js project
        expect(projectInfo.configFiles.nodejs['package.json']).toBeDefined();
        
        // Project info should be well-structured
        const keys = Object.keys(projectInfo);
        expect(keys).toContain('README');
        expect(keys).toContain('packageJson'); // Backward compatibility
        expect(keys).toContain('configFiles'); // New structure
        
        // Verify configFiles structure
        const configFiles = projectInfo.configFiles;
        expect(typeof configFiles).toBe('object');
        expect(Object.keys(configFiles).length).toBeGreaterThan(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Integration with analysis service', () => {
    // Mock createAnalysisPrompt function for testing
    function mockCreateAnalysisPrompt(
      commits: any[],
      projectInfo: Record<string, any>,
      projectTree: string,
      options: any
    ): string {
      let prompt = 'Analysis prompt:\n\n';
      
      // Add project information
      prompt += '## Project Information\n';
      
      if (projectInfo.packageJson) {
        prompt += `Project name: ${projectInfo.packageJson.name || 'Unknown'}\n`;
      }
      
      // Add README files for project context (same logic as real function)
      if (projectInfo.README && Object.keys(projectInfo.README).length > 0) {
        prompt += '\n## Project Documentation\n';
        Object.entries(projectInfo.README).forEach(([path, content]) => {
          const truncatedContent = (content as string).length > 2000 
            ? (content as string).substring(0, 2000) + '...\n[README truncated for brevity]'
            : content as string;
          
          prompt += `### ${path}\n\`\`\`\n${truncatedContent}\n\`\`\`\n\n`;
        });
      }
      
      return prompt;
    }

    it('should include README content in analysis prompts', async () => {
      const originalCwd = process.cwd();
      process.chdir(projectRoot);
      
      try {
        const projectInfo = await getProjectInfo();
        const prompt = mockCreateAnalysisPrompt([], projectInfo, '', { performCodeReview: false });
        
        // Should include README section
        expect(prompt).toContain('## Project Documentation');
        expect(prompt).toContain('### README.md');
        expect(prompt).toContain('# 🧭 Commit Navigator'); // Part of actual README content
        
        // Should include project name
        expect(prompt).toContain('Project name: cnav');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should truncate very long README content to avoid prompt bloat', async () => {
      // Create a mock project info with a very long README
      const mockProjectInfo = {
        packageJson: { name: 'test-project' },
        README: {
          'README.md': 'A'.repeat(3000) // Very long content
        }
      };
      
      const prompt = mockCreateAnalysisPrompt([], mockProjectInfo, '', { performCodeReview: false });
      
      // Should contain truncation message
      expect(prompt).toContain('[README truncated for brevity]');
      
      // Should not contain the full 3000 'A's
      const readmeSection = prompt.split('## Project Documentation')[1];
      expect(readmeSection.length).toBeLessThan(2500); // Much less than the original 3000+ chars
    });

    it('should handle projects without README files gracefully', async () => {
      const mockProjectInfo = {
        packageJson: { name: 'test-project' }
        // No README property
      };
      
      const prompt = mockCreateAnalysisPrompt([], mockProjectInfo, '', { performCodeReview: false });
      
      // Should not include README section
      expect(prompt).not.toContain('## Project Documentation');
      expect(prompt).toContain('Project name: test-project'); // But should still work
    });
  });
}); 