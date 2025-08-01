#!/usr/bin/env node

import { program } from 'commander';
import { lastCommand } from './commands/last';
import { changelogCommand } from './commands/changelog';
import { analyzeCommand } from './commands/analyze';
import chalk from 'chalk';

// CLI version and description
const VERSION = '0.1.0';

console.log(chalk.bold.blue('🧭 Commit Navigator (cnav)'));

program
  .name('cnav')
  .description('Commit Navigator - A CLI tool to understand git commit changes using LLM')
  .version(VERSION)
  .option('--oc, --output-context', 'Write repository context to README_context.md');

// Command: cnav analyze [path]
program
  .command('analyze [path]')
  .description('Analyze a project directory (defaults to current directory)')
  .option('-r, --review', 'Perform a detailed code review of the project')
  .option('-m, --md', 'Output analysis in Markdown format')
  .option('--oc, --output-context', 'Write repository context to README_context.md')
  .action(analyzeCommand);
  
// Command: cnav last [n]
program
  .command('last [count]')
  .description('Review the last n commits (default: 1)')
  .option('-r, --review', 'Perform a code review on the commits')
  .option('-d, --days <days>', 'Review commits from the last n days')
  .option('-m, --md', 'Output analysis in Markdown format')
  .action(lastCommand);

// Command: cnav changelog
program
  .command('changelog')
  .description('Update CHANGELOG file with latest changes')
  .option('-f, --format <format>', 'Output format: daily/weekly', 'weekly')
  .action(changelogCommand);

// Add examples to help
program.addHelpText('after', `
Examples:
  cnav                    - analyze current project directory
  cnav 2                  - analyze the last 2 commits
  cnav 3d                 - analyze commits in the last 3 days
`);

// Handle custom logic before parsing
const args = process.argv.slice(2);

// Check if --oc flag is present
const hasOcFlag = args.includes('--oc') || args.includes('--output-context');

// If no arguments provided, or only --oc flag, run analyze command on current directory
if (!args.length || (hasOcFlag && args.length <= 1)) {
  analyzeCommand('.', { oc: hasOcFlag });
} 
// If single argument that's not a flag or known command, treat as path to analyze
else if (args.length === 1 && !args[0].startsWith('-') && !['last', 'changelog', 'analyze', 'help', '--help', '-h', '--version', '-V'].includes(args[0])) {
  analyzeCommand(args[0], {});
} 
// Otherwise, let Commander.js handle it normally
else {
  program.parse(process.argv);
}
