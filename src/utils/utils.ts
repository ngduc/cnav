import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

// Excluded directory names to skip when searching for README.md files
const EXCLUDED_DIR_NAMES = [
  // JavaScript/Node.js
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'out',
  'public',
  'static',
  'assets',
  
  // Python
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.venv',
  '.env',
  'site-packages',
  '.python-version',
  '.pyenv',
  'wheels',
  '*.egg-info',
  
  // Go
  'vendor',
  'pkg',
  'mod',
  
  // Rust
  'target',
  
  // Java/Kotlin/Scala
  '.gradle',
  '.mvn',
  'maven-archiver',
  'maven-status',
  'surefire-reports',
  
  // C/C++
  'cmake-build-*',
  'Debug',
  'Release',
  'x64',
  'x86',
  'Win32',
  '.vs',
  'CMakeFiles',
  'CMakeCache.txt',
  
  // .NET/C#
  'bin',
  'obj',
  'packages',
  'TestResults',
  '.vs',
  
  // Ruby
  '.bundle',
  'vendor/bundle',
  
  // PHP
  '.composer',
  
  // Database
  'migrations',
  
  // Version Control
  '.git',
  '.svn',
  '.hg',
  '.bzr',
  
  // IDEs and Editors
  '.vscode',
  '.idea',
  '.eclipse',
  '.settings',
  '.project',
  '.classpath',
  
  // OS and System
  '.DS_Store',
  'Thumbs.db',
  
  // Build and Deploy Tools
  '.terraform',
  '.vagrant',
  'terraform.tfstate*',
  '.serverless',
  
  // Cache and Temporary
  '.cache',
  '.tmp',
  'tmp',
  'temp',
  '.temp',
  
  // Environment and Config
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.staging',
  '.env.test',
  
  // Logs
  'logs',
  '.logs',
  '*.log',
  
  // Package Managers
  '.npm',
  '.yarn',
  '.pnpm-store',
  
  // Documentation Build
  '_site',
  '.jekyll-cache',
  '.docusaurus',
  
  // Testing
  'test-results',
  'e2e-results',
  'playwright-report',
  
  // Mobile Development
  '.expo',
  'ios/build',
  'android/build',
  'android/.gradle',
];

/**
 * Find README.md files from current directory or child directories (1 level down only)
 * Excludes directories specified in EXCLUDED_DIR_NAMES
 * @param baseDir - Base directory to start searching from (defaults to process.cwd())
 * @returns Object mapping file paths to their content
 */
export async function findReadmeFiles(baseDir: string = process.cwd()): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  try {
    // Create exclude patterns for glob
    const excludePatterns = EXCLUDED_DIR_NAMES.map(dir => `**/${dir}/**`);
    
    // Search for README.md files in current directory and 1 level down
    const readmeFiles = await glob('**/README.md', {
      cwd: baseDir,
      maxDepth: 1, // Only current directory and 1 level down
      ignore: excludePatterns,
      absolute: false,
    });

    // Read content of each found README.md file
    for (const filePath of readmeFiles) {
      try {
        const fullPath = path.join(baseDir, filePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        result[filePath] = content;
      } catch (error) {
        console.warn(`Warning: Could not read file ${filePath}: ${(error as Error).message}`);
        // Continue with other files instead of failing completely
      }
    }

    return result;
  } catch (error) {
    console.error(`Error searching for README.md files: ${(error as Error).message}`);
    return result;
  }
}

/**
 * Check if a directory should be excluded based on EXCLUDED_DIR_NAMES
 * @param dirName - Directory name to check
 * @returns True if directory should be excluded
 */
export function isExcludedDirectory(dirName: string): boolean {
  return EXCLUDED_DIR_NAMES.includes(dirName);
}

/**
 * Get the list of excluded directory names
 * @returns Array of excluded directory names
 */
export function getExcludedDirectories(): string[] {
  return [...EXCLUDED_DIR_NAMES];
}
