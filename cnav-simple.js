#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const simpleGit = require('simple-git');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');

// Initialize Commander
const program = new Command();

console.log(chalk.bold.blue('🧭 Commit Navigator (cnav)'));

program
  .name('cnav-simple')
  .description('Commit Navigator - A CLI tool to understand git commit changes')
  .version('0.1.0');

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

// Command handler for 'last'
async function lastCommand(count = '1', options = {}) {
  const spinner = ora('Analyzing commits...').start();
  
  try {
    // Initialize git with the current directory
    const git = simpleGit(process.cwd());
    
    // Check if current directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Current directory is not a git repository');
    }
    
    let commits;
    
    // Check if user specified days instead of commit count
    if (options.days) {
      const days = parseInt(options.days, 10);
      spinner.text = `Fetching commits from the last ${days} day(s)...`;
      
      // Calculate the date n days ago
      const date = new Date();
      date.setDate(date.getDate() - days);
      const dateString = date.toISOString().slice(0, 10);
      
      // Get all commits since that date
      const log = await git.log({
        from: 'HEAD',
        since: dateString
      });
      commits = log.all;
      
      spinner.succeed(`Found ${commits.length} commits from the last ${days} day(s)`);
    } else {
      // Parse count as a number, default to 1
      const numCommits = parseInt(count, 10) || 1;
      spinner.text = `Fetching the last ${numCommits} commit(s)...`;
      
      // Get the last n commits
      const log = await git.log({ maxCount: numCommits });
      commits = log.all;
      
      spinner.succeed(`Found ${commits.length} commit(s)`);
    }
    
    if (commits.length === 0) {
      console.log(chalk.yellow('No commits found in the specified range.'));
      return;
    }
    
    // Display commit information
    console.log('\n' + chalk.bold.green('📊 Commit Analysis'));
    
    for (const commit of commits) {
      console.log(`\n${chalk.bold.yellow(`Commit: ${commit.hash}`)}`);
      console.log(chalk.blue(`Author: ${commit.author_name} <${commit.author_email}>`));
      console.log(chalk.blue(`Date:   ${new Date(commit.date).toLocaleString()}\n`));
      console.log(chalk.green(`    ${commit.message.replace(/\n/g, '\n    ')}\n`));
      
      // For a real analysis, here we would call the OpenAI API to analyze the commit
      if (options.review) {
        console.log(chalk.magenta('  Code Review:'));
        console.log(chalk.italic('  This would normally use LLM to perform a code review of the changes.'));
        console.log(chalk.italic('  You would see suggestions, potential issues, and improvement ideas here.'));
      } else {
        console.log(chalk.cyan('  Summary:'));
        console.log(chalk.italic('  This would normally use LLM to summarize the changes and provide context.'));
        console.log(chalk.italic('  You would see a human-readable description of what changed and why.'));
      }
    }
    
  } catch (error) {
    spinner.fail('Failed to analyze commits');
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Command handler for 'changelog'
async function changelogCommand(options = {}) {
  const spinner = ora('Updating changelog...').start();
  
  try {
    // Set default format
    const format = options.format || 'weekly';
    
    // Get the repository
    const git = simpleGit(process.cwd());
    
    // Check if current directory is a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      throw new Error('Current directory is not a git repository');
    }
    
    // Get CHANGELOG.md path
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    // Check if CHANGELOG.md exists
    let lastChangelogDate;
    if (await fs.pathExists(changelogPath)) {
      const content = await fs.readFile(changelogPath, 'utf8');
      
      // Try to extract the date from the first line of the changelog
      const dateMatch = content.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        lastChangelogDate = dateMatch[0];
      }
    }
    
    // If no date was found, use last 30 days as default
    if (!lastChangelogDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      lastChangelogDate = date.toISOString().slice(0, 10);
    }
    
    spinner.text = `Fetching commits since ${lastChangelogDate}...`;
    
    // Get all commits since that date
    const log = await git.log({
      from: 'HEAD',
      since: lastChangelogDate
    });
    const commits = log.all;
    
    if (commits.length === 0) {
      spinner.info('No new commits found since last changelog update.');
      return;
    }
    
    spinner.succeed(`Found ${commits.length} new commit(s) to add to changelog`);
    
    // In a real implementation, here we would use OpenAI to generate a nicely formatted changelog
    console.log('\n' + chalk.bold.green('📝 Changelog Update'));
    console.log(chalk.italic('In the full version, this would use LLM to generate a human-readable changelog.'));
    console.log(chalk.italic('Here\'s a simple representation of what would be added:\n'));
    
    // Generate a simple changelog for demonstration
    const today = new Date().toISOString().slice(0, 10);
    let changelogContent = `## [0.1.0] - ${today}\n\n`;
    
    // Group commits by type based on simple heuristics
    const additions = [];
    const changes = [];
    const fixes = [];
    
    for (const commit of commits) {
      const message = commit.message.split('\n')[0].trim();
      
      if (message.toLowerCase().includes('add') || message.toLowerCase().includes('new')) {
        additions.push(`- ${message}`);
      } else if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
        fixes.push(`- ${message}`);
      } else {
        changes.push(`- ${message}`);
      }
    }
    
    // Add sections to changelog
    if (additions.length > 0) {
      changelogContent += '### Added\n' + additions.join('\n') + '\n\n';
    }
    
    if (changes.length > 0) {
      changelogContent += '### Changed\n' + changes.join('\n') + '\n\n';
    }
    
    if (fixes.length > 0) {
      changelogContent += '### Fixed\n' + fixes.join('\n') + '\n\n';
    }
    
    console.log(chalk.cyan(changelogContent));
    
    // In a real implementation, we would write this to the CHANGELOG.md file
    spinner.succeed('Changelog content generated');
    console.log(chalk.yellow(`\nTo update the actual file, I would normally write to: ${changelogPath}`));
    
  } catch (error) {
    spinner.fail('Failed to update changelog');
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

// Parse the command line arguments
program.parse();

// Display help if no arguments
if (process.argv.length === 2) {
  program.help();
}
