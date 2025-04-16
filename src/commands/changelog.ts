import { getCommitsSinceLastChangelog } from '../services/git';
import { generateChangelog } from '../services/changelog';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';

export interface ChangelogCommandOptions {
  format?: 'daily' | 'weekly';
}

/**
 * Command handler for 'cnav changelog'
 * Updates the CHANGELOG file with latest changes
 */
export async function changelogCommand(options: ChangelogCommandOptions = {}): Promise<void> {
  const spinner = ora('Updating changelog...').start();
  
  try {
    // Set default format
    const format = options.format || 'weekly';
    spinner.text = `Fetching commits since last changelog update...`;
    
    // Get commits since last changelog entry
    const commits = await getCommitsSinceLastChangelog();
    
    if (commits.length === 0) {
      spinner.info('No new commits found since last changelog update.');
      return;
    }
    
    spinner.succeed(`Found ${commits.length} new commit(s) to add to changelog`);
    
    // Generate changelog content
    spinner.text = 'Generating changelog content...';
    spinner.start();
    
    const changelogContent = await generateChangelog(commits, { format });
    
    // Get path to CHANGELOG.md
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    
    // Check if CHANGELOG.md exists
    let existingContent = '';
    if (await fs.pathExists(changelogPath)) {
      existingContent = await fs.readFile(changelogPath, 'utf8');
    }
    
    // Update changelog file
    const updatedContent = changelogContent + (existingContent ? '\n\n' + existingContent : '');
    await fs.writeFile(changelogPath, updatedContent);
    
    spinner.succeed('Changelog updated successfully');
    console.log(chalk.green(`Changelog updated at: ${changelogPath}`));
    
  } catch (error) {
    spinner.fail('Failed to update changelog');
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
