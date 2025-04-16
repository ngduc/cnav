import { getLastCommits, getCommitsFromLastDays } from '../services/git';
import { analyzeCommits } from '../services/analysis';
import chalk from 'chalk';
import ora from 'ora';

export interface LastCommandOptions {
  review?: boolean;
  days?: string;
}

/**
 * Command handler for 'cnav last [count]'
 * Reviews the last n commits or commits from the last n days
 */
export async function lastCommand(count: string = '1', options: LastCommandOptions): Promise<void> {
  const spinner = ora('Analyzing commits...').start();
  
  try {
    let commits;
    
    // Check if user specified days instead of commit count
    if (options.days) {
      const days = parseInt(options.days, 10);
      spinner.text = `Fetching commits from the last ${days} day(s)...`;
      commits = await getCommitsFromLastDays(days);
      spinner.succeed(`Found ${commits.length} commits from the last ${days} day(s)`);
    } else {
      // Parse count as a number, default to 1
      const numCommits = parseInt(count, 10) || 1;
      spinner.text = `Fetching the last ${numCommits} commit(s)...`;
      commits = await getLastCommits(numCommits);
      spinner.succeed(`Found ${commits.length} commit(s)`);
    }
    
    if (commits.length === 0) {
      console.log(chalk.yellow('No commits found in the specified range.'));
      return;
    }
    
    // Start analyzing
    spinner.text = 'Analyzing commit changes...';
    spinner.start();
    
    const analysis = await analyzeCommits(commits, {
      performCodeReview: options.review || false
    });
    
    spinner.succeed('Analysis complete');
    
    // Display the results
    console.log('\n' + chalk.bold.green('📊 Commit Analysis'));
    console.log(analysis);
    
  } catch (error) {
    spinner.fail('Failed to analyze commits');
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}
