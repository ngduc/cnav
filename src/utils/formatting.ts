import chalk from 'chalk';
import { CommitData } from '../services/git';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to render markdown to the terminal
// marked.setOptions({
//   renderer: new TerminalRenderer({
//     code: chalk.green,
//     blockquote: chalk.gray.italic,
//     table: chalk.blue,
//     tableOptions: {},
//   })
// });

/**
 * Format a single commit for display
 */
export function formatCommit(commit: CommitData): string {
  let output = '';

  // Format commit header
  output += chalk.bold.yellow(`Commit: ${commit.hash}\n`);
  output += chalk.blue(`Author: ${commit.author_name} <${commit.author_email}>\n`);
  output += chalk.blue(`Date:   ${new Date(commit.date).toLocaleString()}\n\n`);
  
  // Format commit message
  output += chalk.green(`    ${commit.message.replace(/\n/g, '\n    ')}\n\n`);

  // Format files changed
  if (commit.files && commit.files.length > 0) {
    output += chalk.bold('Files changed:\n');
    commit.files.forEach(file => {
      output += `  ${chalk.cyan(file)}\n`;
    });
    output += '\n';
  }

  return output;
}

/**
 * Format a list of commits for display
 */
export function formatCommitList(commits: CommitData[]): string {
  if (commits.length === 0) {
    return chalk.yellow('No commits found.');
  }

  return commits.map(formatCommit).join('\n---\n\n');
}

/**
 * Render markdown to terminal-friendly format
 */
export function renderMarkdown(markdown: string): string {
  try {
    const result = marked(markdown);
    // Handle the case where marked returns a Promise
    if (result instanceof Promise) {
      // For async results, just return the original markdown
      // This is a fallback for synchronous contexts
      return markdown;
    }
    return result;
  } catch (error) {
    return markdown;
  }
}

/**
 * Format error messages
 */
export function formatError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  return chalk.red(`Error: ${message}`);
}

/**
 * Create a summary of project stats
 */
export function formatProjectStats(projectInfo: Record<string, any>): string {
  let output = chalk.bold.blue('Project Summary:\n');

  if (projectInfo.packageJson) {
    output += chalk.bold('Name: ') + `${projectInfo.packageJson.name || 'Unknown'}\n`;
    output += chalk.bold('Version: ') + `${projectInfo.packageJson.version || 'Unknown'}\n`;
    output += chalk.bold('Description: ') + `${projectInfo.packageJson.description || 'None'}\n`;
    
    if (projectInfo.packageJson.dependencies) {
      const depCount = Object.keys(projectInfo.packageJson.dependencies).length;
      output += chalk.bold('Dependencies: ') + `${depCount} packages\n`;
    }
  }

  if (projectInfo.pyproject) {
    output += chalk.bold('Type: ') + 'Python Project\n';
  }

  return output;
}
