#!/usr/bin/env node

import { program } from 'commander';
import { lastCommand } from './commands/last';
import { changelogCommand } from './commands/changelog';
import chalk from 'chalk';

// CLI version and description
const VERSION = '0.1.0';

console.log(chalk.bold.blue('🧭 Commit Navigator (cnav)'));

program
  .name('cnav')
  .description('Commit Navigator - A CLI tool to understand git commit changes using LLM')
  .version(VERSION);

// Command: cnav last [n]
program
  .command('last [count]')
  .description('Review the last n commits (default: 1)')
  .option('-r, --review', 'Perform a code review on the commits')
  .option('-d, --days <days>', 'Review commits from the last n days')
  .action(lastCommand);

// Command: cnav changelog
program
  .command('changelog')
  .description('Update CHANGELOG file with latest changes')
  .option('-f, --format <format>', 'Output format: daily/weekly', 'weekly')
  .action(changelogCommand);

program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
