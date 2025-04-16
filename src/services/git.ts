import simpleGit, { SimpleGit, DefaultLogFields, ListLogLine } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

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
    
    // Get package.json info if exists
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      projectInfo.packageJson = packageJson;
    }
    
    // Get pyproject.toml if exists
    const pyprojectPath = path.join(process.cwd(), 'pyproject.toml');
    if (await fs.pathExists(pyprojectPath)) {
      const pyproject = await fs.readFile(pyprojectPath, 'utf8');
      projectInfo.pyproject = pyproject;
    }
    
    // Get requirements.txt if exists
    const requirementsPath = path.join(process.cwd(), 'requirements.txt');
    if (await fs.pathExists(requirementsPath)) {
      const requirements = await fs.readFile(requirementsPath, 'utf8');
      projectInfo.requirements = requirements;
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
    
    // Get ls-tree from git to list files that are tracked
    const files = await git.raw(['ls-files']);
    const fileList = files.split('\n').filter(f => f.trim() !== '');
    
    // Organize files into a tree structure
    const tree: Record<string, any> = {};
    
    for (const file of fileList) {
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
