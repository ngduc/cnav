import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { findReadmeFiles, getExcludedDirectories } from '../utils/utils';

// Interface for commit data
export interface CommitData extends DefaultLogFields {
  diff?: string;
  files?: string[];
}

/**
 * Initialize git in the current directory
 */
function getGit(): SimpleGit {
  // Initialize git with the current directory
  return simpleGit(process.cwd());
}

/**
 * Get the last n commits from the current repository
 */
export async function getLastCommits(count: number = 1): Promise<CommitData[]> {
  try {
    const git = getGit();
    
    // Check if current directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Current directory is not a git repository');
    }
    
    // Get the last n commits
    const log = await git.log({ maxCount: count });
    const commits = log.all;
    
    // For each commit, get the diff
    const commitsWithDiffs = await Promise.all(
      commits.map(async (commit) => {
        // Get the diff for the commit
        const diff = await git.show([commit.hash]);
        
        // Get modified files
        const filesResult = await git.show(['--name-only', '--pretty=format:', commit.hash]);
        const files = filesResult
          .trim()
          .split('\n')
          .filter(file => file.trim() !== '');
        
        const filteredFiles = files.filter(file => !file.match(/.*lock.*\..*/));
        const filteredDiff = diff
          .split('\n')
          .filter(line => !line.includes('lock'))
          .join('\n');

        const isBinaryFile = diff.includes('Binary files');
        if (isBinaryFile) {
          return {
            ...commit,
            diff: '', // Exclude binary file diffs
            files: filteredFiles
          };
        }

        return {
          ...commit,
          diff: filteredDiff,
          files: filteredFiles
        };
      })
    );
    
    return commitsWithDiffs;
  } catch (error) {
    throw new Error(`Failed to get commits: ${(error as Error).message}`);
  }
}

/**
 * Get commits from the last n days
 */
export async function getCommitsFromLastDays(days: number = 7): Promise<CommitData[]> {
  try {
    const git = getGit();
    
    // Check if current directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Current directory is not a git repository');
    }
    
    // Calculate the date n days ago
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateString = date.toISOString().slice(0, 10);
    
    // Get all commits since that date
    const log = await git.log({
      from: 'HEAD',
      since: dateString
    });
    const commits = log.all;
    
    // For each commit, get the diff
    const commitsWithDiffs = await Promise.all(
      commits.map(async (commit) => {
        // Get the diff for the commit
        const diff = await git.show([commit.hash]);
        
        // Get modified files
        const filesResult = await git.show(['--name-only', '--pretty=format:', commit.hash]);
        const files = filesResult
          .trim()
          .split('\n')
          .filter(file => file.trim() !== '');
        
        const filteredFiles = files.filter(file => !file.match(/.*lock.*\..*/));
        const filteredDiff = diff
          .split('\n')
          .filter(line => !line.includes('lock'))
          .join('\n');

        const isBinaryFile = diff.includes('Binary files');
        if (isBinaryFile) {
          return {
            ...commit,
            diff: '', // Exclude binary file diffs
            files: filteredFiles
          };
        }

        return {
          ...commit,
          diff: filteredDiff,
          files: filteredFiles
        };
      })
    );
    
    return commitsWithDiffs;
  } catch (error) {
    throw new Error(`Failed to get commits: ${(error as Error).message}`);
  }
}

/**
 * Get commits since the last changelog update
 */
export async function getCommitsSinceLastChangelog(): Promise<CommitData[]> {
  try {
    const git = getGit();
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    // Check if changelog exists
    let sinceDate: string | undefined;
    
    if (await fs.pathExists(changelogPath)) {
      const content = await fs.readFile(changelogPath, 'utf8');
      
      // Try to extract the date from the first line of the changelog
      // Assuming format is "## [version] - YYYY-MM-DD" or similar
      const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        sinceDate = dateMatch[0];
      }
    }
    
    // If no date was found, use last 30 days as default
    if (!sinceDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      sinceDate = date.toISOString().slice(0, 10);
    }
    
    // Get all commits since that date
    const log = await git.log([`--since=${sinceDate}`]); // Use explicit '--since=' format
    const commits = log.all;
    
    // For each commit, get the diff
    const commitsWithDiffs = await Promise.all(
      commits.map(async (commit) => {
        // Get the diff for the commit
        const diff = await git.show([commit.hash]);
        
        // Get modified files
        const filesResult = await git.show(['--name-only', '--pretty=format:', commit.hash]);
        const files = filesResult
          .trim()
          .split('\n')
          .filter(file => file.trim() !== '');
        
        const filteredFiles = files.filter(file => !file.match(/.*lock.*\..*/));
        const filteredDiff = diff
          .split('\n')
          .filter(line => !line.includes('lock'))
          .join('\n');

        const isBinaryFile = diff.includes('Binary files');
        if (isBinaryFile) {
          return {
            ...commit,
            diff: '', // Exclude binary file diffs
            files: filteredFiles
          };
        }

        return {
          ...commit,
          diff: filteredDiff,
          files: filteredFiles
        };
      })
    );
    
    return commitsWithDiffs;
  } catch (error) {
    throw new Error(`Failed to get commits: ${(error as Error).message}`);
  }
}

/**
 * Get information about the current project
 */
export async function getProjectInfo(): Promise<Record<string, any>> {
  try {
    const projectInfo: Record<string, any> = {};
    
    // Define project configuration files for various languages, frameworks, and tools
    const configFiles = [
      // Node.js/JavaScript
      { path: 'package.json', category: 'nodejs', type: 'json', description: 'Node.js package configuration' },
      { path: 'package-lock.json', category: 'nodejs', type: 'json', description: 'NPM lock file' },
      { path: 'yarn.lock', category: 'nodejs', type: 'text', description: 'Yarn lock file' },
      { path: 'pnpm-lock.yaml', category: 'nodejs', type: 'text', description: 'PNPM lock file' },
      { path: '.nvmrc', category: 'nodejs', type: 'text', description: 'Node version manager config' },
      { path: 'tsconfig.json', category: 'nodejs', type: 'json', description: 'TypeScript configuration' },
      { path: 'vite.config.js', category: 'nodejs', type: 'text', description: 'Vite configuration' },
      { path: 'vite.config.ts', category: 'nodejs', type: 'text', description: 'Vite configuration (TypeScript)' },
      { path: 'webpack.config.js', category: 'nodejs', type: 'text', description: 'Webpack configuration' },
      { path: 'next.config.js', category: 'nodejs', type: 'text', description: 'Next.js configuration' },
      { path: 'nuxt.config.js', category: 'nodejs', type: 'text', description: 'Nuxt.js configuration' },
      { path: 'tailwind.config.js', category: 'nodejs', type: 'text', description: 'Tailwind CSS configuration' },
      
      // Python
      { path: 'pyproject.toml', category: 'python', type: 'text', description: 'Python project configuration' },
      { path: 'requirements.txt', category: 'python', type: 'text', description: 'Python dependencies' },
      { path: 'setup.py', category: 'python', type: 'text', description: 'Python package setup' },
      { path: 'setup.cfg', category: 'python', type: 'text', description: 'Python setup configuration' },
      { path: 'Pipfile', category: 'python', type: 'text', description: 'Pipenv configuration' },
      { path: 'poetry.lock', category: 'python', type: 'text', description: 'Poetry lock file' },
      { path: 'environment.yml', category: 'python', type: 'text', description: 'Conda environment' },
      { path: 'tox.ini', category: 'python', type: 'text', description: 'Tox testing configuration' },
      { path: 'pytest.ini', category: 'python', type: 'text', description: 'Pytest configuration' },
      
      // Java
      { path: 'pom.xml', category: 'java', type: 'text', description: 'Maven project configuration' },
      { path: 'build.gradle', category: 'java', type: 'text', description: 'Gradle build script' },
      { path: 'gradle.properties', category: 'java', type: 'text', description: 'Gradle properties' },
      { path: 'settings.gradle', category: 'java', type: 'text', description: 'Gradle settings' },
      
      // C#/.NET
      { path: 'global.json', category: 'dotnet', type: 'json', description: '.NET global configuration' },
      { path: 'Directory.Build.props', category: 'dotnet', type: 'text', description: 'MSBuild properties' },
      
      // Go
      { path: 'go.mod', category: 'go', type: 'text', description: 'Go module definition' },
      { path: 'go.sum', category: 'go', type: 'text', description: 'Go module checksums' },
      
      // Rust
      { path: 'Cargo.toml', category: 'rust', type: 'text', description: 'Rust package configuration' },
      { path: 'Cargo.lock', category: 'rust', type: 'text', description: 'Rust lock file' },
      
      // Ruby
      { path: 'Gemfile', category: 'ruby', type: 'text', description: 'Ruby gem dependencies' },
      { path: 'Gemfile.lock', category: 'ruby', type: 'text', description: 'Ruby gem lock file' },
      
      // PHP
      { path: 'composer.json', category: 'php', type: 'json', description: 'PHP Composer configuration' },
      { path: 'composer.lock', category: 'php', type: 'json', description: 'PHP Composer lock file' },
      
      // Docker
      { path: 'Dockerfile', category: 'docker', type: 'text', description: 'Docker container definition' },
      { path: 'docker-compose.yml', category: 'docker', type: 'text', description: 'Docker Compose configuration' },
      { path: 'docker-compose.yaml', category: 'docker', type: 'text', description: 'Docker Compose configuration' },
      
      // Build tools
      { path: 'Makefile', category: 'build', type: 'text', description: 'Make build configuration' },
      { path: 'CMakeLists.txt', category: 'build', type: 'text', description: 'CMake build configuration' },
      
      // Linting/Formatting
      { path: '.eslintrc.json', category: 'linting', type: 'json', description: 'ESLint configuration' },
      { path: '.eslintrc.js', category: 'linting', type: 'text', description: 'ESLint configuration' },
      { path: '.prettierrc', category: 'linting', type: 'json', description: 'Prettier configuration' },
      { path: '.prettierrc.json', category: 'linting', type: 'json', description: 'Prettier configuration' },
      { path: '.editorconfig', category: 'linting', type: 'text', description: 'Editor configuration' },
      
      // Environment
      { path: '.env', category: 'env', type: 'text', description: 'Environment variables' },
      { path: '.env.example', category: 'env', type: 'text', description: 'Environment variables example' },
      
      // CI/CD
      { path: '.github/workflows', category: 'cicd', type: 'directory', description: 'GitHub Actions workflows' },
      { path: '.gitlab-ci.yml', category: 'cicd', type: 'text', description: 'GitLab CI configuration' },
      { path: '.travis.yml', category: 'cicd', type: 'text', description: 'Travis CI configuration' },
      { path: 'Jenkinsfile', category: 'cicd', type: 'text', description: 'Jenkins pipeline configuration' },
    ];
    
    // Organize found configs by category
    const foundConfigs: Record<string, Record<string, any>> = {};
    
    // Check each configuration file
    for (const config of configFiles) {
      const filePath = path.join(process.cwd(), config.path);
      
      if (config.type === 'directory') {
        // Check if directory exists and list files
        if (await fs.pathExists(filePath)) {
          try {
            const files = await fs.readdir(filePath);
            if (files.length > 0) {
              if (!foundConfigs[config.category]) {
                foundConfigs[config.category] = {};
              }
              foundConfigs[config.category][config.path] = {
                description: config.description,
                type: 'directory',
                files: files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
              };
            }
          } catch (e) {
            // Skip if can't read directory
          }
        }
      } else if (await fs.pathExists(filePath)) {
        try {
          let content;
          if (config.type === 'json') {
            content = await fs.readJson(filePath);
          } else {
            content = await fs.readFile(filePath, 'utf8');
          }
          
          if (!foundConfigs[config.category]) {
            foundConfigs[config.category] = {};
          }
          
          foundConfigs[config.category][config.path] = {
            description: config.description,
            type: config.type,
            content: content
          };
        } catch (e) {
          // If we can't read the file, just note its existence
          if (!foundConfigs[config.category]) {
            foundConfigs[config.category] = {};
          }
          foundConfigs[config.category][config.path] = {
            description: config.description,
            type: config.type,
            exists: true,
            error: 'Unable to read file content'
          };
        }
      }
    }
    
    // Add found configs to project info
    if (Object.keys(foundConfigs).length > 0) {
      projectInfo.configFiles = foundConfigs;
    }
    
    // Keep backward compatibility for package.json (commonly used)
    if (foundConfigs.nodejs?.['package.json']?.content) {
      projectInfo.packageJson = foundConfigs.nodejs['package.json'].content;
    }
    
    // Get README files from current directory and 1 level down
    const readmeFiles = await findReadmeFiles();
    if (Object.keys(readmeFiles).length > 0) {
      projectInfo.README = readmeFiles;
    }
    
    // Get git remote info
    const git = getGit();
    try {
      const remotes = await git.getRemotes(true);
      projectInfo.remotes = remotes;
      
      // Try to get the project name from remote URL
      if (remotes.length > 0) {
        const originUrl = remotes.find(remote => remote.name === 'origin')?.refs?.fetch || '';
        const repoNameMatch = originUrl.match(/\/([^\/]+?)(\.git)?$/);
        if (repoNameMatch) {
          projectInfo.repositoryName = repoNameMatch[1];
        }
      }
    } catch (e) {
      // Remote info is not critical
    }
    
    return projectInfo;
  } catch (error) {
    throw new Error(`Failed to get project info: ${(error as Error).message}`);
  }
}

/**
 * Get a tree representation of project directories and files
 */
export async function getProjectTree(maxDepth: number = 3): Promise<string> {
  try {
    // This is a simple implementation. Could be expanded for better tree visualization.
    const git = getGit();
    
    // Get consolidated list of directories to exclude from the tree (reduces noise)
    const excludedDirectories = new Set(getExcludedDirectories());
    
    // Get ls-tree from git to list files that are tracked
    const files = await git.raw(['ls-files']);
    const fileList = files.split('\n').filter(f => f.trim() !== '');
    
    // Filter out files in excluded directories
    const filteredFiles = fileList.filter(file => {
      const parts = file.split('/');
      return !parts.some(part => excludedDirectories.has(part));
    });
    
    // Organize files into a tree structure
    const tree: Record<string, any> = {};
    
    for (const file of filteredFiles) {
      const parts = file.split('/');
      let current = tree;
      
      // Only process up to maxDepth
      const depthToProcess = Math.min(parts.length, maxDepth);
      
      for (let i = 0; i < depthToProcess; i++) {
        const part = parts[i];
        
        if (i === parts.length - 1) {
          // It's a file
          current[part] = null;
        } else {
          // It's a directory
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
    
    // Convert tree to string representation
    function formatTree(node: Record<string, any>, prefix: string = ''): string {
      let result = '';
      const keys = Object.keys(node).sort();
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;
        
        // Print current node
        result += `${prefix}${isLast ? '└── ' : '├── '}${key}\n`;
        
        // Print children if it's a directory
        if (node[key] !== null) {
          result += formatTree(
            node[key],
            `${prefix}${isLast ? '    ' : '│   '}`
          );
        }
      }
      
      return result;
    }
    
    return formatTree(tree);
  } catch (error) {
    return `Failed to generate tree: ${(error as Error).message}`;
  }
}
